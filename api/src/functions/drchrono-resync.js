// ---------------- DRCHRONO RESYNC (backstop, HTTP-triggered) ----------------
// Backstop sync for the busy-calendar mirror blob (_drchrono/busy-calendar.json)
// -- rebuilds it from live DrChrono data regardless of webhook activity, so
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
// Auth: authLevel:'function' looks like it should require a Function-key
// (?code=), but Azure Static Web Apps' managed Functions don't actually
// enforce that -- a known platform limitation, confirmed live (an
// unauthenticated call got 200 OK). So this checks its own shared secret
// instead (DrChronoResyncSecret, sent as the x-resync-secret header),
// same pattern already used for DrChronoWebhookSecret/DrChronoOAuthState.
//
// Confirmed against a real authenticated call on 2026-07-24: a manually
// triggered resync correctly pulled appointment 404930605 into
// busy-calendar.json with the right date/time/duration, cross-checked
// against that same appointment's real webhook delivery payload (see
// drchrono-webhook.js). date_range, scheduled_time, duration, id, and the
// results/next pagination shape are all confirmed correct for this account
// -- no longer just taken from DrChrono's published docs.
//
// This used to also rebuild a DrChrono "Appointment Templates" mirror
// (schedule-template.json), but that DrChrono feature is confirmed empty
// for this doctor/office -- his schedule isn't a recurring weekly pattern,
// so a template can't represent it. Availability now comes from the office
// manager's curated date list instead (see manager-availability.js /
// availability.js), so that rebuild path was removed.
const { app } = require('@azure/functions');
const crypto = require('crypto');
const { getContainerClient, fetchWithTimeout, getDrChronoAccessToken, appendAudit, DRCHRONO_BASE_URL, DRCHRONO_TIMEOUT_MS } = require('../shared/drchrono');

const BUSY_BLOB = '_drchrono/busy-calendar.json';
const WINDOW_DAYS = 30;

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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

async function rebuildBusyCalendar(containerClient, accessToken, doctorId, officeId) {
  const windowStart = todayIso();
  const windowEnd = addDaysIso(windowStart, WINDOW_DAYS);
  // DrChrono's "date range" type is slash-separated (e.g. "2014-02-24/2014-02-28"),
  // not comma-separated -- confirmed against their published API docs.
  const url = `${DRCHRONO_BASE_URL}/api/appointments?date_range=${windowStart}/${windowEnd}&doctor=${encodeURIComponent(doctorId)}&office=${encodeURIComponent(officeId)}`;
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

  await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'drchrono_resync_completed', details: {} });
  return { skipped: false };
}

app.http('drchronoResync', {
  methods: ['POST'],
  authLevel: 'anonymous', // real auth is the x-resync-secret check below -- see file header comment
  route: 'drchrono/resync',
  handler: async (request, context) => {
    const expectedSecret = process.env.DrChronoResyncSecret;
    const givenSecret = request.headers.get('x-resync-secret');
    if (!expectedSecret || !safeEqual(givenSecret, expectedSecret)) {
      context.warn('drchrono-resync: missing/invalid x-resync-secret, rejecting');
      return { status: 401, jsonBody: { error: 'Invalid or missing secret' } };
    }

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
