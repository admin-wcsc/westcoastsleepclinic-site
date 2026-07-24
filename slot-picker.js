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
// Calendar-style: a month grid where only dates with real open slots are
// clickable. Picking one reveals that day's open times grouped into
// Morning/Afternoon/Evening sections, each a compact wrapped grid -- avoids
// both an overwhelming flat list when the availability window spans
// multiple months, and the carousel/horizontal-scroll pattern this
// originally shipped with (dropped after 44+ slots/day made it feel like
// too much scrolling for something this simple).
//
// Hidden inputs (appointment_date/appointment_time/appointment_duration_minutes)
// hold the canonical value, same convention as every other widget here --
// existing required-field/payload code just reads them via
// document.querySelector('[name="..."]') like any other field.

var AppointmentSlotPicker = (function () {
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var TIME_GROUPS = [
    { label: 'Morning', test: function (mins) { return mins < 12 * 60; } },
    { label: 'Afternoon', test: function (mins) { return mins >= 12 * 60 && mins < 17 * 60; } },
    { label: 'Evening', test: function (mins) { return mins >= 17 * 60; } }
  ];

  var loadingEl, fallbackEl, calEl, dateInput, timeInput, durationInput;
  var calTitle, calGrid, prevBtn, nextBtn, timesWrap, timesHeadingEl, timesGroupsEl;
  var slotsByDate = {};
  var minMonth, maxMonth; // {year, month} bounds derived from the actual slots
  var viewYear, viewMonth;
  var selectedDate = null;
  var selectedTimeBtn = null;

  function els() {
    if (!loadingEl) {
      loadingEl = document.getElementById('apptSlotLoading');
      fallbackEl = document.getElementById('apptSlotFallback');
      calEl = document.getElementById('apptSlotDays');
      dateInput = document.querySelector('[name="appointment_date"]');
      timeInput = document.querySelector('[name="appointment_time"]');
      durationInput = document.querySelector('[name="appointment_duration_minutes"]');
    }
  }

  function showState(state) {
    loadingEl.style.display = state === 'loading' ? '' : 'none';
    fallbackEl.style.display = state === 'fallback' ? '' : 'none';
    calEl.style.display = state === 'calendar' ? '' : 'none';
    // Only meaningful to require a slot when there's a real calendar to pick
    // from -- matches how Step 4 (Authorization to Release) already leaves
    // its own plain, non-modal step ungated beyond the `required` attribute
    // itself, no separate JS blocking logic.
    var isReady = state === 'calendar';
    [dateInput, timeInput, durationInput].forEach(function (el) { if (el) el.required = isReady; });
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function isoOf(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }
  function monthKey(y, m) { return y * 12 + m; }

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
  function timeToMinutes(hhmm) {
    var parts = hhmm.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function buildSkeleton() {
    calEl.innerHTML =
      '<div class="slotpicker-cal-head">' +
        '<button type="button" class="slotpicker-cal-nav" data-nav="prev" aria-label="Previous month">&larr;</button>' +
        '<div class="slotpicker-cal-title"></div>' +
        '<button type="button" class="slotpicker-cal-nav" data-nav="next" aria-label="Next month">&rarr;</button>' +
      '</div>' +
      '<div class="slotpicker-cal-grid"></div>' +
      '<div class="slotpicker-times-wrap" style="display:none">' +
        '<div class="slotpicker-times-heading"></div>' +
        '<div class="slotpicker-times-groups"></div>' +
      '</div>';

    calTitle = calEl.querySelector('.slotpicker-cal-title');
    calGrid = calEl.querySelector('.slotpicker-cal-grid');
    prevBtn = calEl.querySelector('[data-nav="prev"]');
    nextBtn = calEl.querySelector('[data-nav="next"]');
    timesWrap = calEl.querySelector('.slotpicker-times-wrap');
    timesHeadingEl = calEl.querySelector('.slotpicker-times-heading');
    timesGroupsEl = calEl.querySelector('.slotpicker-times-groups');

    prevBtn.addEventListener('click', function () {
      if (prevBtn.disabled) return;
      viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderMonth();
    });
    nextBtn.addEventListener('click', function () {
      if (nextBtn.disabled) return;
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderMonth();
    });
  }

  function renderMonth() {
    calTitle.textContent = MONTH_NAMES[viewMonth] + ' ' + viewYear;
    prevBtn.disabled = monthKey(viewYear, viewMonth) <= monthKey(minMonth.year, minMonth.month);
    nextBtn.disabled = monthKey(viewYear, viewMonth) >= monthKey(maxMonth.year, maxMonth.month);

    calGrid.innerHTML = '';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (l) {
      var el = document.createElement('div');
      el.className = 'slotpicker-cal-dow';
      el.textContent = l;
      calGrid.appendChild(el);
    });

    var firstDow = new Date(viewYear, viewMonth, 1).getDay();
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (var k = 0; k < firstDow; k++) {
      var blank = document.createElement('div');
      blank.className = 'slotpicker-cal-day other';
      calGrid.appendChild(blank);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var iso = isoOf(viewYear, viewMonth, d);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slotpicker-cal-day';
      btn.textContent = d;
      if (slotsByDate[iso]) {
        btn.classList.add('has-slots');
        if (iso === selectedDate) btn.classList.add('selected');
        btn.addEventListener('click', function (isoForClick) {
          return function () { selectDate(isoForClick); };
        }(iso));
      } else {
        btn.disabled = true;
      }
      calGrid.appendChild(btn);
    }
  }

  function selectDate(iso) {
    selectedDate = iso;
    selectedTimeBtn = null;
    dateInput.value = '';
    timeInput.value = '';
    durationInput.value = '';
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    renderMonth();
    renderTimeGroups(iso);
  }

  function renderTimeGroups(iso) {
    timesHeadingEl.textContent = formatDateHeading(iso);
    timesGroupsEl.innerHTML = '';

    TIME_GROUPS.forEach(function (group) {
      var slotsInGroup = slotsByDate[iso].filter(function (s) { return group.test(timeToMinutes(s.time)); });
      if (slotsInGroup.length === 0) return;

      var groupEl = document.createElement('div');
      groupEl.className = 'slotpicker-time-group';
      var labelEl = document.createElement('div');
      labelEl.className = 'slotpicker-time-group-label';
      labelEl.textContent = group.label;
      groupEl.appendChild(labelEl);

      var gridEl = document.createElement('div');
      gridEl.className = 'slotpicker-time-grid';
      slotsInGroup.forEach(function (slot) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn';
        btn.textContent = formatTime(slot.time);
        btn.addEventListener('click', function () { selectSlot(btn, slot); });
        gridEl.appendChild(btn);
      });
      groupEl.appendChild(gridEl);
      timesGroupsEl.appendChild(groupEl);
    });

    timesWrap.style.display = '';
  }

  function selectSlot(btn, slot) {
    if (selectedTimeBtn) selectedTimeBtn.classList.remove('slot-btn-selected');
    selectedTimeBtn = btn;
    btn.classList.add('slot-btn-selected');
    dateInput.value = slot.date;
    timeInput.value = slot.time;
    durationInput.value = slot.durationMinutes;
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function refresh(treatmentType) {
    els();
    selectedDate = null;
    selectedTimeBtn = null;
    dateInput.value = '';
    timeInput.value = '';
    durationInput.value = '';
    showState('loading');
    StorageClient.getAvailability(treatmentType).then(function (result) {
      if (!result || !result.available || !Array.isArray(result.slots) || result.slots.length === 0) {
        showState('fallback');
        return;
      }

      slotsByDate = {};
      result.slots.forEach(function (s) { (slotsByDate[s.date] = slotsByDate[s.date] || []).push(s); });

      var dates = Object.keys(slotsByDate).sort();
      var first = new Date(dates[0] + 'T00:00:00');
      var last = new Date(dates[dates.length - 1] + 'T00:00:00');
      minMonth = { year: first.getFullYear(), month: first.getMonth() };
      maxMonth = { year: last.getFullYear(), month: last.getMonth() };
      viewYear = minMonth.year;
      viewMonth = minMonth.month;

      buildSkeleton();
      renderMonth();
      showState('calendar');
    }).catch(function () {
      showState('fallback');
    });
  }

  return { refresh: refresh };
})();
