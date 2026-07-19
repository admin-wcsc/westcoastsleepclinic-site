// ---------------- APPOINTMENT SLOT PICKER (calendar) ----------------
// Single-instance widget -- there's only ever one Schedule Appointment step
// in the wizard, so this targets fixed element IDs directly rather than the
// multi-instance auto-wire-by-CSS-class convention date-picker.js/
// signature-pad.js/upload-widget.js use. treatment_type isn't known until
// Step 1 is complete, so this can't fetch on page load like they do -- the
// page calls AppointmentSlotPicker.refresh(treatmentType) explicitly when
// the patient reaches the Schedule Appointment step.
//
// UI: shows the current month and next month together (no navigation --
// that covers the ~30-day availability window in the normal case). A day is
// greyed out and unclickable only when it's not a real practice day at all
// (weekends) or the office confirmed the doctor's at BayCare that day --
// that's what `openDates` from the API means. A day that IS open but has
// appointments already on it stays fully clickable; clicking it just shows
// whatever times are left (or a "nothing left today" note if it's fully
// booked) -- that distinction is why the API returns openDates and slots
// separately instead of one combined list.
//
// Hidden inputs (appointment_date/appointment_time/appointment_duration_minutes)
// hold the canonical value -- existing required-field/payload code just
// reads them via document.querySelector('[name="..."]') like any other field.

var AppointmentSlotPicker = (function () {
  var loadingEl, fallbackEl, calendarEl;
  var monthLabelEls, gridEls;
  var timesEl, timesHeadingEl, timesRowEl, timesEmptyEl;
  var dateInput, timeInput, durationInput;
  var openDateSet = {};
  var slotsByDate = {};
  var selectedDate = null;

  function els() {
    if (!loadingEl) {
      loadingEl = document.getElementById('apptSlotLoading');
      fallbackEl = document.getElementById('apptSlotFallback');
      calendarEl = document.getElementById('apptSlotCalendar');
      monthLabelEls = [document.getElementById('apptCalMonthLabel1'), document.getElementById('apptCalMonthLabel2')];
      gridEls = [document.getElementById('apptCalGrid1'), document.getElementById('apptCalGrid2')];
      timesEl = document.getElementById('apptCalTimes');
      timesHeadingEl = document.getElementById('apptCalTimesHeading');
      timesRowEl = document.getElementById('apptCalTimesRow');
      timesEmptyEl = document.getElementById('apptCalTimesEmpty');
      dateInput = document.querySelector('[name="appointment_date"]');
      timeInput = document.querySelector('[name="appointment_time"]');
      durationInput = document.querySelector('[name="appointment_duration_minutes"]');
    }
  }

  function showState(state) {
    loadingEl.style.display = state === 'loading' ? '' : 'none';
    fallbackEl.style.display = state === 'fallback' ? '' : 'none';
    calendarEl.style.display = state === 'calendar' ? '' : 'none';
    var isCalendar = state === 'calendar';
    [dateInput, timeInput, durationInput].forEach(function (el) { if (el) el.required = isCalendar; });
  }

  function isoOf(y, m, d) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function formatMonthLabel(y, m) {
    return new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  function formatTime(hhmm) {
    var parts = hhmm.split(':');
    var h = parseInt(parts[0], 10);
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + parts[1] + ' ' + ampm;
  }
  function formatDateHeading(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function selectSlot(btn, slot) {
    var prev = timesRowEl.querySelector('.slot-btn-selected');
    if (prev) prev.classList.remove('slot-btn-selected');
    btn.classList.add('slot-btn-selected');
    dateInput.value = slot.date;
    timeInput.value = slot.time;
    durationInput.value = slot.durationMinutes;
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function renderTimesForDate(iso) {
    timesHeadingEl.textContent = 'Available times — ' + formatDateHeading(iso);
    timesRowEl.innerHTML = '';
    var daySlots = slotsByDate[iso] || [];
    timesEmptyEl.style.display = daySlots.length === 0 ? '' : 'none';
    daySlots.forEach(function (slot) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = formatTime(slot.time);
      btn.addEventListener('click', function () { selectSlot(btn, slot); });
      timesRowEl.appendChild(btn);
    });
    timesEl.style.display = '';
  }

  function selectDay(iso) {
    selectedDate = iso;
    dateInput.value = '';
    timeInput.value = '';
    durationInput.value = '';
    renderBothMonths();
    renderTimesForDate(iso);
  }

  function renderMonthGrid(gridEl, year, month) {
    gridEl.innerHTML = '';
    var startWeekday = new Date(year, month, 1).getDay(); // 0=Sun
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    for (var i = 0; i < startWeekday; i++) {
      var pad = document.createElement('div');
      pad.className = 'cal-day cal-day-pad';
      gridEl.appendChild(pad);
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var iso = isoOf(year, month, day);
      var isOpen = !!openDateSet[iso];
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = String(day);
      if (isOpen) {
        cell.className = 'cal-day cal-day-available' + (iso === selectedDate ? ' cal-day-selected' : '');
        cell.addEventListener('click', (function (isoForCell) {
          return function () { selectDay(isoForCell); };
        })(iso));
      } else {
        cell.className = 'cal-day cal-day-unavailable';
        cell.disabled = true;
      }
      gridEl.appendChild(cell);
    }
  }

  function renderBothMonths() {
    var now = new Date();
    var months = [
      { y: now.getFullYear(), m: now.getMonth() },
      { y: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), m: (now.getMonth() + 1) % 12 }
    ];
    months.forEach(function (mo, i) {
      monthLabelEls[i].textContent = formatMonthLabel(mo.y, mo.m);
      renderMonthGrid(gridEls[i], mo.y, mo.m);
    });
  }

  function refresh(treatmentType) {
    els();
    selectedDate = null;
    openDateSet = {};
    slotsByDate = {};
    dateInput.value = '';
    timeInput.value = '';
    durationInput.value = '';
    timesEl.style.display = 'none';
    showState('loading');
    StorageClient.getAvailability(treatmentType).then(function (result) {
      if (!result || !result.available) {
        showState('fallback');
        return;
      }
      (result.openDates || []).forEach(function (iso) { openDateSet[iso] = true; });
      (result.slots || []).forEach(function (slot) {
        (slotsByDate[slot.date] = slotsByDate[slot.date] || []).push(slot);
      });
      renderBothMonths();
      showState('calendar');
    }).catch(function () {
      showState('fallback');
    });
  }

  return { refresh: refresh };
})();
