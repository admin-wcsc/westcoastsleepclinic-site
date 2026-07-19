// ---------------- PATIENT-FACING AVAILABILITY READ ----------------
// GET /api/availability?treatment_type=sleep_study
// Deliberately has NO DrChrono fetch anywhere in this file -- it only ever
// reads the three mirror blobs (schedule-template.json, busy-calendar.json,
// baycare-blockout.json) kept fresh by drchrono-resync-timer.js and
// drchrono-webhook.js. This is what guarantees the scheduling step never
// depends on DrChrono's uptime at the moment a patient reaches it.
const { app } = require('@azure/functions');
const { getContainerClient } = require('../shared/drchrono');

const TEMPLATE_BLOB = '_drchrono/schedule-template.json';
const BUSY_BLOB = '_drchrono/busy-calendar.json';
const BLOCKOUT_BLOB = '_schedule/baycare-blockout.json';
const WINDOW_DAYS = 30;
const MIN_LEAD_DAYS = 3; // doctors need at least 3 days' notice -- no same-day/next-day/2-day-out bookings

async function readJsonBlob(containerClient, name) {
  try {
    const buffer = await containerClient.getBlockBlobClient(name).downloadToBuffer();
    return JSON.parse(buffer.toString('utf8'));
  } catch (e) {
    return null;
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(iso, days) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
// JS Date.getUTCDay(): 0=Sun..6=Sat. DrChrono's week_days: 0=Mon..6=Sun.
function jsWeekdayToDrChrono(jsDay) {
  return (jsDay + 6) % 7;
}
function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}
function timesOverlap(startA, durA, startB, durB) {
  const aStart = timeToMinutes(startA), aEnd = aStart + durA;
  const bStart = timeToMinutes(startB), bEnd = bStart + durB;
  return aStart < bEnd && bStart < aEnd;
}

app.http('availability', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'availability',
  handler: async (request, context) => {
    const treatmentType = request.query.get('treatment_type');
    if (!treatmentType) {
      return { status: 400, jsonBody: { error: 'Missing treatment_type query parameter' } };
    }

    const containerClient = getContainerClient();
    const [template, busy, blockout] = await Promise.all([
      readJsonBlob(containerClient, TEMPLATE_BLOB),
      readJsonBlob(containerClient, BUSY_BLOB),
      readJsonBlob(containerClient, BLOCKOUT_BLOB)
    ]);

    const templateReady = template && template.profiles && template.profiles[treatmentType];
    // No busy-calendar data at all (never synced even once) is a hard block,
    // same as a missing template -- there's nothing to compute overlaps
    // against. Once it HAS synced at least once, it's trusted regardless of
    // how long ago that was: the webhook (real-time) and resync (15-min
    // backstop) automations are what keep it current, and the scheduler
    // never writes directly into DrChrono anyway (staff finalizes the real
    // appointment manually) -- so there's no need to block patients over a
    // timestamp. `asOf` is still returned so a future admin alert can watch it.
    if (!templateReady || !busy) {
      return {
        status: 200,
        jsonBody: { available: false, stale: true, asOf: null, slots: [] }
      };
    }

    const profileTemplates = templateReady.templates || [];
    const busyAppointments = Object.values(busy.appointments || {});
    const blockedDates = new Set((blockout && blockout.blockedDates) || []);
    // No confirmed BayCare window at all -> nothing is confirmed available,
    // don't guess. Fails closed, same as everywhere else in this feature.
    const blockoutWindowEnd = blockout && blockout.windowEnd;

    const earliestIso = addDaysIso(todayIso(), MIN_LEAD_DAYS);
    const horizonIso = addDaysIso(todayIso(), WINDOW_DAYS);

    // openDates and slots are deliberately separate: openDates is every date
    // the office is actually open for this treatment type (a real practice
    // weekday, not a BayCare day) -- the calendar stays clickable on those
    // regardless of how booked they are. slots is what's actually left after
    // subtracting busy-calendar overlaps -- that's only used to populate the
    // time list once a specific open day is clicked. A fully-booked day is
    // still in openDates (clickable) even though it contributes zero slots.
    const openDates = [];
    const slots = [];
    if (blockoutWindowEnd) {
      for (let iso = earliestIso; iso <= horizonIso; iso = addDaysIso(iso, 1)) {
        if (iso > blockoutWindowEnd) break; // beyond the manager's known BayCare window
        if (blockedDates.has(iso)) continue;

        const drDay = jsWeekdayToDrChrono(new Date(iso + 'T00:00:00Z').getUTCDay());
        const dayTemplates = profileTemplates.filter((tmpl) => Array.isArray(tmpl.weekDays) && tmpl.weekDays.includes(drDay));
        if (dayTemplates.length === 0) continue; // not a practice day for this treatment type (e.g. a weekend)

        openDates.push(iso);
        for (const tmpl of dayTemplates) {
          const overlapsBusy = busyAppointments.some(
            (b) => b.date === iso && timesOverlap(tmpl.scheduledTime, tmpl.durationMinutes, b.startTime, b.durationMinutes)
          );
          if (overlapsBusy) continue;
          slots.push({ date: iso, time: tmpl.scheduledTime, durationMinutes: tmpl.durationMinutes });
        }
      }
    }
    slots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    return { status: 200, jsonBody: { available: true, stale: false, asOf: busy.generatedAt || null, openDates, slots } };
  }
});
