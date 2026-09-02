// ---------------- AVAILABILITY SLOT COMPUTATION ----------------
// Pure slot math, split out from availability.js so it can be tested without
// the Azure Functions host or Blob Storage. availability.js still owns
// fetching the two mirror blobs and shaping the HTTP response; this module
// only turns (curated open dates + busy calendar + today) into the list of
// open start times.

const MIN_LEAD_DAYS = 3; // doctors need at least 3 days' notice -- no same-day/next-day/2-day-out bookings
const DAY_START_MINUTES = 9 * 60; // 9:00am -- first start offered
const LAST_START_MINUTES = 16 * 60 + 30; // 4:30pm -- latest start offered (a booked slot then runs to 5:30pm)
const SLOT_INTERVAL_MINUTES = 15; // spacing between offered start times

// Every online booking is a new-patient visit, which DrChrono schedules as
// 60 minutes (appointment profile 895948). A start is only offered if the
// whole 60 minutes is clear -- otherwise the website would show a time
// DrChrono then rejects for overlapping the next appointment, which fails
// the scheduling flow.
const APPOINTMENT_DURATION_MINUTES = 60;

function pad2(n) {
  return String(n).length < 2 ? '0' + n : String(n);
}

function dailyStartTimes() {
  const times = [];
  for (let start = DAY_START_MINUTES; start <= LAST_START_MINUTES; start += SLOT_INTERVAL_MINUTES) {
    times.push(pad2(Math.floor(start / 60)) + ':' + pad2(start % 60));
  }
  return times;
}
const DAILY_START_TIMES = dailyStartTimes();

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
// Office is closed Saturday and Sunday (confirmed by the office manager).
// Enforced here rather than only in the manager calendar's UI, so it holds
// regardless of what ends up in doctor-availability.json.
function isWeekend(iso) {
  const day = new Date(iso + 'T00:00:00Z').getUTCDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

// availableDates: string[] of 'YYYY-MM-DD' the office manager marked open.
// busyAppointments: [{ date, startTime, durationMinutes }] from busy-calendar.json.
// todayIso: 'YYYY-MM-DD' (injected so this function stays pure and testable).
function computeSlots(availableDates, busyAppointments, todayIso) {
  const earliestIso = addDaysIso(todayIso, MIN_LEAD_DAYS);

  const slots = [];
  for (const iso of availableDates) {
    if (iso < earliestIso) continue;
    if (isWeekend(iso)) continue;
    for (const time of DAILY_START_TIMES) {
      const overlapsBusy = busyAppointments.some(
        (b) => b.date === iso && timesOverlap(time, APPOINTMENT_DURATION_MINUTES, b.startTime, b.durationMinutes)
      );
      if (overlapsBusy) continue;
      slots.push({ date: iso, time, durationMinutes: APPOINTMENT_DURATION_MINUTES });
    }
  }
  slots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return slots;
}

module.exports = { computeSlots, APPOINTMENT_DURATION_MINUTES, MIN_LEAD_DAYS };
