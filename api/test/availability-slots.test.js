const { test } = require('node:test');
const assert = require('node:assert/strict');

const { computeSlots, APPOINTMENT_DURATION_MINUTES } = require('../src/shared/availability-slots');

// Sept 1 2026 is a Tuesday. Injected as "today" so lead-time math is deterministic.
const TODAY = '2026-09-01';
const MON = '2026-09-14'; // Monday, outside the 3-day lead window
const SAT = '2026-09-19'; // Saturday
const TOO_SOON = '2026-09-02'; // inside the 3-day lead window

function timesFor(slots, iso) {
  return slots.filter((s) => s.date === iso).map((s) => s.time);
}

test('a 60-minute slot is not offered when it would overlap the next appointment', () => {
  // 10:00 appointment on the books. A 60-minute new-patient visit starting at
  // 9:15/9:30/9:45 would run into it, so none of those may be offered -- this
  // is the real-world failure this change fixes. 9:00 (ends exactly at 10:00)
  // and 11:00 (starts exactly when the 10:00 ends) are still fine.
  const slots = computeSlots(
    [MON],
    [{ date: MON, startTime: '10:00', durationMinutes: 60 }],
    TODAY
  );
  const times = timesFor(slots, MON);

  assert.ok(times.includes('09:00'), '9:00 should be offered');
  assert.ok(times.includes('11:00'), '11:00 should be offered');
  for (const blocked of ['09:15', '09:30', '09:45', '10:00', '10:30', '10:45']) {
    assert.ok(!times.includes(blocked), `${blocked} should NOT be offered`);
  }
});

test('every offered slot carries the real 60-minute duration', () => {
  const slots = computeSlots([MON], [], TODAY);

  assert.ok(slots.length > 0, 'expected some slots');
  assert.equal(APPOINTMENT_DURATION_MINUTES, 60);
  for (const s of slots) {
    assert.equal(s.durationMinutes, 60, `slot ${s.time} should be 60 minutes`);
  }
});

test('start times run every 15 minutes from 9:00 AM through 4:30 PM', () => {
  const times = timesFor(computeSlots([MON], [], TODAY), MON);

  assert.equal(times[0], '09:00');
  assert.equal(times[times.length - 1], '16:30');
  assert.equal(times.length, 31); // 9:00..16:30 inclusive, every 15 min
});

test('dates inside the 3-day lead window are excluded', () => {
  const slots = computeSlots([TOO_SOON, MON], [], TODAY);

  assert.equal(timesFor(slots, TOO_SOON).length, 0, 'too-soon date should have no slots');
  assert.ok(timesFor(slots, MON).length > 0, 'the later date should have slots');
});

test('weekend dates are excluded', () => {
  const slots = computeSlots([MON, SAT], [], TODAY);

  assert.ok(timesFor(slots, MON).length > 0, 'Monday should have slots');
  assert.equal(timesFor(slots, SAT).length, 0, 'Saturday should have no slots');
});
