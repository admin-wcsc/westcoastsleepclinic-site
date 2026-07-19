// ---------------- APPOINTMENT SLOT PICKER ----------------
// Single-instance widget -- there's only ever one Schedule Appointment step
// in the wizard, unlike signatures/date-pickers which repeat per
// consent/field -- so this targets fixed element IDs directly rather than
// the multi-instance auto-wire-by-CSS-class convention date-picker.js/
// signature-pad.js/upload-widget.js use. One deliberate difference from
// every other widget in this file family: treatment_type isn't known until
// Step 1 is complete, so this can't fetch on page load like they do -- the
// page calls AppointmentSlotPicker.refresh(treatmentType) explicitly when
// the patient reaches the Schedule Appointment step.
//
// Hidden inputs (appointment_date/appointment_time/appointment_duration_minutes)
// hold the canonical value, same convention as every other widget here --
// existing required-field/payload code just reads them via
// document.querySelector('[name="..."]') like any other field.

var AppointmentSlotPicker = (function () {
  var loadingEl, fallbackEl, daysEl, dateInput, timeInput, durationInput;
  var selectedBtn = null;

  function els() {
    if (!loadingEl) {
      loadingEl = document.getElementById('apptSlotLoading');
      fallbackEl = document.getElementById('apptSlotFallback');
      daysEl = document.getElementById('apptSlotDays');
      dateInput = document.querySelector('[name="appointment_date"]');
      timeInput = document.querySelector('[name="appointment_time"]');
      durationInput = document.querySelector('[name="appointment_duration_minutes"]');
    }
  }

  function showState(state) {
    loadingEl.style.display = state === 'loading' ? '' : 'none';
    fallbackEl.style.display = state === 'fallback' ? '' : 'none';
    daysEl.style.display = state === 'slots' ? '' : 'none';
    // Only meaningful to require a slot when there are real slots to pick
    // from -- matches how Step 4 (Authorization to Release) already leaves
    // its own plain, non-modal step ungated beyond the `required` attribute
    // itself, no separate JS blocking logic.
    var isSlots = state === 'slots';
    [dateInput, timeInput, durationInput].forEach(function (el) { if (el) el.required = isSlots; });
  }

  function selectSlot(btn, slot) {
    if (selectedBtn) selectedBtn.classList.remove('slot-btn-selected');
    selectedBtn = btn;
    btn.classList.add('slot-btn-selected');
    dateInput.value = slot.date;
    timeInput.value = slot.time;
    durationInput.value = slot.durationMinutes;
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function formatDateHeading(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }
  function formatTime(hhmm) {
    var parts = hhmm.split(':');
    var h = parseInt(parts[0], 10);
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + parts[1] + ' ' + ampm;
  }

  function renderSlots(slots) {
    daysEl.innerHTML = '';
    var byDate = {};
    slots.forEach(function (s) { (byDate[s.date] = byDate[s.date] || []).push(s); });
    Object.keys(byDate).sort().forEach(function (date) {
      var group = document.createElement('div');
      group.className = 'slot-day-group';
      var heading = document.createElement('div');
      heading.className = 'slot-day-heading';
      heading.textContent = formatDateHeading(date);
      group.appendChild(heading);
      var row = document.createElement('div');
      row.className = 'slot-day-times';
      byDate[date].forEach(function (slot) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn';
        btn.textContent = formatTime(slot.time);
        btn.addEventListener('click', function () { selectSlot(btn, slot); });
        row.appendChild(btn);
      });
      group.appendChild(row);
      daysEl.appendChild(group);
    });
  }

  function refresh(treatmentType) {
    els();
    selectedBtn = null;
    dateInput.value = '';
    timeInput.value = '';
    durationInput.value = '';
    showState('loading');
    StorageClient.getAvailability(treatmentType).then(function (result) {
      if (!result || !result.available || !Array.isArray(result.slots) || result.slots.length === 0) {
        showState('fallback');
        return;
      }
      renderSlots(result.slots);
      showState('slots');
    }).catch(function () {
      showState('fallback');
    });
  }

  return { refresh: refresh };
})();
