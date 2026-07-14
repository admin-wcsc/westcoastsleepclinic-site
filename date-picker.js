// ---------------- DATE PICKER ----------------
// Shared by registration.html and provider-referral.html — any element with
// class="dpk" (see the .dpk-input / .dpk-pop / hidden-input markup in either
// page) gets wired up automatically once this file loads.

function pad2(n) {
  n = String(n);
  return n.length < 2 ? '0' + n : n;
}

// Re-parses the full raw digit buffer on every keystroke (robust against
// backspace/paste) rather than a stateful per-key machine. A single digit
// resolves immediately whenever no valid two-digit continuation exists
// (month 2-9, day 4-9) — this is what makes "7" jump straight to July and
// "6" straight to the 6th, per the spec.
function parseDateDigits(digits) {
  digits = digits.slice(0, 8);
  var i = 0, month = '', day = '', year = '';

  if (i < digits.length) {
    var d1 = digits[i];
    if (d1 >= '2' && d1 <= '9') { month = '0' + d1; i++; }
    else if (d1 === '1') {
      if (i + 1 < digits.length && '012'.indexOf(digits[i + 1]) !== -1) { month = digits[i] + digits[i + 1]; i += 2; }
      else if (i + 1 < digits.length) { month = '01'; i += 1; }
      else { month = '1'; i += 1; }
    } else if (d1 === '0') {
      if (i + 1 < digits.length && digits[i + 1] !== '0') { month = '0' + digits[i + 1]; i += 2; }
      else { month = '0'; i += 1; }
    }
  }

  if (i < digits.length) {
    var e1 = digits[i];
    if (e1 >= '4' && e1 <= '9') { day = '0' + e1; i++; }
    else if (e1 === '3') {
      if (i + 1 < digits.length && '01'.indexOf(digits[i + 1]) !== -1) { day = digits[i] + digits[i + 1]; i += 2; }
      else if (i + 1 < digits.length) { day = '03'; i += 1; }
      else { day = '3'; i += 1; }
    } else if (e1 === '1' || e1 === '2') {
      if (i + 1 < digits.length) { day = digits[i] + digits[i + 1]; i += 2; }
      else { day = e1; i += 1; }
    } else if (e1 === '0') {
      if (i + 1 < digits.length && digits[i + 1] !== '0') { day = '0' + digits[i + 1]; i += 2; }
      else { day = '0'; i += 1; }
    }
  }

  year = digits.slice(i).slice(0, 4);

  return {
    month: month, day: day, year: year,
    monthDone: month.length === 2,
    dayDone: day.length === 2,
    yearDone: year.length === 4
  };
}

function dpkFormatDisplay(parsed) {
  var out = parsed.month;
  if (parsed.monthDone) out += '/';
  out += parsed.day;
  if (parsed.dayDone) out += '/';
  out += parsed.year;
  return out;
}

var DPK_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function DatePicker(wrapperEl) {
  var visible = wrapperEl.querySelector('.dpk-input');
  var hidden  = wrapperEl.querySelector('input[type="hidden"]');
  var pop     = wrapperEl.querySelector('.dpk-pop');
  var mtitle  = wrapperEl.querySelector('.dpk-mtitle');
  var grid    = wrapperEl.querySelector('.dpk-grid');
  var prevBtn = wrapperEl.querySelector('[data-dpk-prev]');
  var nextBtn = wrapperEl.querySelector('[data-dpk-next]');
  var viewYear, viewMonth, selDay = null;

  function commit(parsed) {
    hidden.value = (parsed.monthDone && parsed.dayDone && parsed.yearDone)
      ? parsed.year + '-' + parsed.month + '-' + parsed.day
      : '';
  }

  function buildGrid() {
    mtitle.textContent = DPK_MONTH_NAMES[viewMonth] + ' ' + viewYear;
    grid.innerHTML = '';
    var firstDow = new Date(viewYear, viewMonth, 1).getDay();
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    var daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    var today = new Date();
    var cells = [];
    for (var k = 0; k < firstDow; k++) {
      cells.push({ day: daysInPrevMonth - firstDow + 1 + k, other: true });
    }
    for (var d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, other: false });
    }
    var trailing = 42 - cells.length;
    for (var t = 1; t <= trailing; t++) {
      cells.push({ day: t, other: true });
    }
    cells.forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = c.day;
      var classes = [];
      if (c.other) classes.push('dpk-other');
      if (!c.other && selDay === c.day) classes.push('dpk-sel');
      if (!c.other && today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === c.day) classes.push('dpk-today');
      btn.className = classes.join(' ');
      if (!c.other) {
        btn.addEventListener('click', function () {
          selDay = c.day;
          var mm = pad2(viewMonth + 1);
          var dd = pad2(c.day);
          visible.value = mm + '/' + dd + '/' + viewYear;
          hidden.value = viewYear + '-' + mm + '-' + dd;
          hidden.dispatchEvent(new Event('input', { bubbles: true }));
          closePopup();
        });
      }
      grid.appendChild(btn);
    });
  }

  function render(parsed) {
    viewYear  = parsed.yearDone ? parseInt(parsed.year, 10) : new Date().getFullYear();
    viewMonth = parsed.monthDone ? parseInt(parsed.month, 10) - 1 : new Date().getMonth();
    selDay    = parsed.dayDone ? parseInt(parsed.day, 10) : null;
    buildGrid();
    openPopup();
  }

  function openPopup() {
    document.querySelectorAll('.dpk-pop.open').forEach(function (p) { if (p !== pop) p.classList.remove('open'); });
    var r = visible.getBoundingClientRect();
    pop.style.top  = (r.bottom + 4) + 'px';
    pop.style.left = r.left + 'px';
    pop.classList.add('open');
  }
  function closePopup() { pop.classList.remove('open'); }

  prevBtn.addEventListener('click', function () {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    buildGrid();
  });
  nextBtn.addEventListener('click', function () {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    buildGrid();
  });

  visible.addEventListener('focus', function () {
    render(parseDateDigits(visible.value.replace(/\D/g, '')));
  });

  visible.addEventListener('input', function () {
    var digits = visible.value.replace(/\D/g, '').slice(0, 8);
    var parsed = parseDateDigits(digits);
    var formatted = dpkFormatDisplay(parsed);
    visible.value = formatted;
    // Cursor always goes to the end rather than trying to preserve position:
    // a single typed digit can resolve into a zero-padded two-character
    // segment (e.g. "7" -> "07"), so "digits typed so far" no longer maps
    // 1:1 to "characters in the formatted string" the way it does for the
    // phone mask below — trying to preserve mid-string position here
    // re-inserts the next keystroke in the wrong place and corrupts the value.
    visible.setSelectionRange(formatted.length, formatted.length);
    commit(parsed);
    render(parsed);
  });
}

document.querySelectorAll('.dpk').forEach(function (el) { new DatePicker(el); });

// Close any open calendar popup on outside click, and on scroll of any
// ancestor (capture:true catches scroll on non-bubbling nested scroll
// containers too, e.g. a Step 1 modal's .modal-card).
document.addEventListener('mousedown', function (e) {
  document.querySelectorAll('.dpk-pop.open').forEach(function (pop) {
    var wrapper = pop.closest('.dpk');
    if (wrapper && !wrapper.contains(e.target)) pop.classList.remove('open');
  });
});
window.addEventListener('scroll', function () {
  document.querySelectorAll('.dpk-pop.open').forEach(function (p) { p.classList.remove('open'); });
}, true);
