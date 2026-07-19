// ---------------- DRCHRONO RESYNC (backstop, HTTP-triggered) ----------------
// Backstop sync for the two DrChrono-derived availability blobs
// (_drchrono/schedule-template.json, _drchrono/busy-calendar.json) --
// rebuilds them from live DrChrono data regardless of webhook activity, so
// even a 100%-missed-webhook scenario self-heals within one cycle.
//
// This is HTTP-triggered, not timer-triggered: Azure Static Web Apps'
// managed Functions (the tier this project uses -- no separate Function
// App resource to provision/pay for) only support HTTP triggers, not
// timers. A scheduled GitHub Actions workflow calls this endpoint every
// 15 minutes instead (see .github/workflows/drchrono-resync-schedule.yml),
// reusing the deploy pipeline's existing tooling rather than provisioning
// a separate Azure resource just to run a cron job.
//
// NOTE: field names/shapes below (week_days, scheduled_time, results/next
// pagination) are taken from DrChrono's published API docs, not a live
// account -- flagged in the project plan as needing a one-time check
// against a real authenticated call before this is considered done.
const { app } = require('@azure/functions');
const { getContainerClient, fetchWithTimeout, getDrChronoAccessToken, appendAudit, DRCHRONO_BASE_URL, DRCHRONO_TIMEOUT_MS } = require('../shared/drchrono');

const TEMPLATE_BLOB = '_drchrono/schedule-template.json';
const BUSY_BLOB = '_drchrono/busy-calendar.json';
const WINDOW_DAYS = 30;
const TEMPLATE_STALE_MS = 24 * 60 * 60 * 1000; // 24h -- the weekly pattern changes rarely, no need to re-pull every cycle

// treatment_type (as used throughout registration.html) -> which app setting holds that DrChrono profile ID.
const TREATMENT_PROFILE_SETTINGS = {
  sleep_study: 'DrChronoProfileIdSleepStudy',
  weight_loss: 'DrChronoProfileIdWeightLoss'
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function readJsonBlob(containerClient, name) {
  try {
    const buffer = await containerClient.getBlockBlobClient(name).downloadToBuffer();
    return JSON.parse(buffer.toString('utf8'));
  } catch (e) {
    return null;
  }
}

async function writeJsonBlob(containerClient, name, value) {
  const content = JSON.stringify(value, null, 2);
  await containerClient.getBlockBlobClient(name).upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
    overwrite: true
  });
}

// Follows DrChrono's { results: [...], next: <url|null> } list pagination.
async function fetchAllPages(url, accessToken) {
  const all = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetchWithTimeout(nextUrl, { headers: { Authorization: `Bearer ${accessToken}` } }, DRCHRONO_TIMEOUT_MS);
    if (!res.ok) throw new Error('DrChrono list request failed: ' + res.status + ' ' + nextUrl);
    const body = await res.json();
    all.push(...(Array.isArray(body.results) ? body.results : []));
    nextUrl = body.next || null;
  }
  return all;
}

// Splits scheduled_time (assumed "YYYY-MM-DDTHH:MM:SS..." in clinic-local
// time, per DrChrono's documented timestamp field) into date/time parts
// without going through JS Date's own timezone handling, which would
// silently shift the hour if the string carries no explicit offset.
function splitScheduledTime(scheduledTime) {
  const m = String(scheduledTime || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? { date: m[1], time: m[2] } : null;
}

async function rebuildScheduleTemplate(containerClient, accessToken, doctorId, officeId) {
  const profiles = {};
  for (const treatmentType of Object.keys(TREATMENT_PROFILE_SETTINGS)) {
    const profileId = process.env[TREATMENT_PROFILE_SETTINGS[treatmentType]];
    if (!profileId) continue; // not configured yet -- skip rather than fail the whole resync
    const url = `${DRCHRONO_BASE_URL}/api/appointment_templates?doctor=${encodeURIComponent(doctorId)}&office=${encodeURIComponent(officeId)}&profile=${encodeURIComponent(profileId)}`;
    const rows = await fetchAllPages(url, accessToken);
    profiles[treatmentType] = {
      profileId,
      templates: rows.map((r) => ({
        weekDays: Array.isArray(r.week_days) ? r.week_days : [],
        scheduledTime: r.scheduled_time,
        durationMinutes: r.duration
      }))
    };
  }
  await writeJsonBlob(containerClient, TEMPLATE_BLOB, { generatedAt: new Date().toISOString(), profiles });
}

async function rebuildBusyCalendar(containerClient, accessToken, doctorId, officeId) {
  const windowStart = todayIso();
  const windowEnd = addDaysIso(windowStart, WINDOW_DAYS);
  const url = `${DRCHRONO_BASE_URL}/api/appointments?date_range=${windowStart},${windowEnd}&doctor=${encodeURIComponent(doctorId)}&office=${encodeURIComponent(officeId)}`;
  const rows = await fetchAllPages(url, accessToken);

  const appointments = {};
  for (const r of rows) {
    if (r.status === 'Cancelled') continue; // that time is free again
    const split = splitScheduledTime(r.scheduled_time);
    if (!split) continue; // malformed row -- skip rather than corrupt the mirror
    appointments[String(r.id)] = {
      date: split.date,
      startTime: split.time,
      durationMinutes: r.duration
    };
  }
  await writeJsonBlob(containerClient, BUSY_BLOB, {
    generatedAt: new Date().toISOString(),
    windowStart, windowEnd,
    appointments
  });
}

async function runResync(context) {
  const containerClient = getContainerClient();
  const doctorId = process.env.DrChronoDoctorId;
  const officeId = process.env.DrChronoOfficeId;
  if (!doctorId || !officeId) {
    context.warn('drchrono-resync: DrChronoDoctorId/DrChronoOfficeId not configured, skipping this cycle');
    return { skipped: true };
  }

  const accessToken = await getDrChronoAccessToken(containerClient);

  await rebuildBusyCalendar(containerClient, accessToken, doctorId, officeId);

  const existingTemplate = await readJsonBlob(containerClient, TEMPLATE_BLOB);
  const templateAge = existingTemplate ? Date.now() - new Date(existingTemplate.generatedAt).getTime() : Infinity;
  let templateRebuilt = false;
  if (!existingTemplate || templateAge > TEMPLATE_STALE_MS) {
    await rebuildScheduleTemplate(containerClient, accessToken, doctorId, officeId);
    templateRebuilt = true;
  }

  await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'drchrono_resync_completed', details: { templateRebuilt } });
  return { skipped: false, templateRebuilt };
}

app.http('drchronoResync', {
  methods: ['POST'],
  authLevel: 'function', // called only by the scheduled GitHub Actions workflow, via its ?code= function key
  route: 'drchrono/resync',
  handler: async (request, context) => {
    try {
      const result = await runResync(context);
      return { status: 200, jsonBody: { ok: true, ...result } };
    } catch (err) {
      context.error('drchrono-resync failed:', err.message);
      try {
        await appendAudit(getContainerClient(), { kind: 'event', ts: Date.now(), type: 'drchrono_resync_failed', details: { error: err.message } });
      } catch (e) {
        // best-effort only
      }
      // Non-200 so the GitHub Actions run shows red and the office can
      // notice a persistent failure rather than it failing silently forever.
      return { status: 500, jsonBody: { ok: false, error: err.message } };
    }
  }
});
