// ---------------- PATIENT-FACING AVAILABILITY READ ----------------
// GET /api/availability?treatment_type=sleep_study
// Deliberately has NO DrChrono fetch anywhere in this file -- it only ever
// reads two mirror blobs, neither of which this app writes itself:
//   - doctor-availability.json: the office manager's curated list of days
//     Dr. Scuteri is actually in. Maintained entirely in the sibling
//     wcsc-app-sleephub Static Web App (its index.html + api/src/functions/
//     manager-availability.js) -- a separate deployment that happens to
//     share this same storage account, which is the whole integration
//     between the two apps (no direct API-to-API call).
//   - busy-calendar.json: kept fresh by the DrChrono Power Automate flow
//     ("DrChrono Webook - Appointments", in the separate
//     DrChronoWorkflowAutomation solution) via drchrono-webhook-relay.js's
//     marker-blob handoff.
// This is what guarantees the scheduling step never depends on DrChrono's
// uptime at the moment a patient reaches it.
//
// Earlier version of this file derived slots from DrChrono's own
// "Appointment Templates" -- confirmed empty for this doctor/office because
// his schedule isn't a recurring weekly pattern (he splits time with another
// job), so a template can't represent it. The office manager's curated date
// list replaced that entirely.
//
// The slot math itself (daily hours, 15-minute spacing, the 60-minute
// new-patient hold, lead time, weekends) lives in ../shared/availability-slots
// so it can be unit-tested without the Functions host -- see
// api/test/availability-slots.test.js.
const { app } = require('@azure/functions');
const { getContainerClient } = require('../shared/drchrono');
const { computeSlots } = require('../shared/availability-slots');

const AVAILABILITY_BLOB = '_schedule/doctor-availability.json';
const BUSY_BLOB = '_drchrono/busy-calendar.json';

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

app.http('availability', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'availability',
  handler: async (request, context) => {
    // `treatment_type` is still required for API-contract stability with
    // existing callers, but no longer changes which slots come back -- every
    // online booking is a 60-minute new-patient visit (see availability-slots).
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
    const slots = computeSlots(availability.availableDates, busyAppointments, todayIso());

    return { status: 200, jsonBody: { available: true, stale: false, asOf: busy.generatedAt || null, slots } };
  }
});
