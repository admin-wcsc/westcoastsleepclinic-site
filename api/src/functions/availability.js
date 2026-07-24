// ---------------- PATIENT-FACING AVAILABILITY READ ----------------
// GET /api/availability?treatment_type=sleep_study
// Deliberately has NO DrChrono fetch anywhere in this file -- it only ever
// reads two mirror blobs: doctor-availability.json (the office manager's
// curated list of days Dr. Scuteri is actually in, maintained via
// manager-availability.html/manager-availability.js) and busy-calendar.json
// (kept fresh by drchrono-resync.js and drchrono-webhook.js). This is what
// guarantees the scheduling step never depends on DrChrono's uptime at the
// moment a patient reaches it.
//
// Earlier version of this file derived slots from DrChrono's own
// "Appointment Templates" -- confirmed empty for this doctor/office because
// his schedule isn't a recurring weekly pattern (he splits time with another
// job), so a template can't represent it. The office manager's curated date
// list replaced that entirely.
const { app } = require('@azure/functions');
const { getContainerClient } = require('../shared/drchrono');

const AVAILABILITY_BLOB = '_schedule/doctor-availability.json';
const BUSY_BLOB = '_drchrono/busy-calendar.json';
const MIN_LEAD_DAYS = 3; // doctors need at least 3 days' notice -- no same-day/next-day/2-day-out bookings

// Fixed daily hours, same for every treatment type: 9:00-5:30, one slot per
// hour. `treatment_type` is still a required query param (kept for API
// contract stability with existing callers) but no longer changes which
// slots come back -- both profiles use this same daily pattern for now.
const DAY_START_MINUTES = 9 * 60; // 9:00am
const DAY_END_MINUTES = 17 * 60 + 30; // 5:30pm -- a slot must fit entirely before this
const SLOT_DURATION_MINUTES = 60;

function pad2(n) {
  return String(n).length < 2 ? '0' + n : String(n);
}

function dailySlotTimes() {
  const times = [];
  for (let start = DAY_START_MINUTES; start + SLOT_DURATION_MINUTES <= DAY_END_MINUTES; start += SLOT_DURATION_MINUTES) {
    times.push(pad2(Math.floor(start / 60)) + ':' + pad2(start % 60));
  }
  return times;
}
const DAILY_SLOT_TIMES = dailySlotTimes();

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
function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}
function timesOverlap(startA, durA, startB, durB) {
  const aStart = timeToMinutes(startA), aEnd = aStart + durA;
  const bStart = timeToMinutes(startB), bEnd = bStart + durB;
  return aStart < bEnd && bStart < aEnd;
}
// Clinic is closed Saturdays (open Sundays). Enforced here rather than only
// in the manager calendar's UI, so it holds regardless of what ends up in
// doctor-availability.json.
function isSaturday(iso) {
  return new Date(iso + 'T00:00:00Z').getUTCDay() === 6;
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
    const [availability, busy] = await Promise.all([
      readJsonBlob(containerClient, AVAILABILITY_BLOB),
      readJsonBlob(containerClient, BUSY_BLOB)
    ]);

    // No curated availability at all (manager hasn't saved anything yet) or
    // no busy-calendar data (never synced) is a hard block -- same
    // fail-closed posture as before: there's nothing to compute overlaps
    // against, so don't guess.
    if (!availability || !Array.isArray(availability.availableDates) || !busy) {
      return {
        status: 200,
        jsonBody: { available: false, stale: true, asOf: null, slots: [] }
      };
    }

    const busyAppointments = Object.values(busy.appointments || {});
    const earliestIso = addDaysIso(todayIso(), MIN_LEAD_DAYS);

    const slots = [];
    for (const iso of availability.availableDates) {
      if (iso < earliestIso) continue;
      if (isSaturday(iso)) continue;
      for (const time of DAILY_SLOT_TIMES) {
        const overlapsBusy = busyAppointments.some(
          (b) => b.date === iso && timesOverlap(time, SLOT_DURATION_MINUTES, b.startTime, b.durationMinutes)
        );
        if (overlapsBusy) continue;
        slots.push({ date: iso, time, durationMinutes: SLOT_DURATION_MINUTES });
      }
    }
    slots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    return { status: 200, jsonBody: { available: true, stale: false, asOf: busy.generatedAt || null, slots } };
  }
});
