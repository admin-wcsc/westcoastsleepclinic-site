// ---------------- SIGNATURE PAD ----------------
// Shared by registration.html — any element with class="sigpad" and
// data-sigpad="sigN" gets wired up automatically once this file loads,
// same auto-wire convention as date-picker.js's .dpk. Drawing itself is
// delegated to the signature_pad library (loaded via CDN before this
// file) for proper Bezier-smoothed strokes; this file is just the glue
// between that library and this app's own field conventions.
//
// The paired hidden <input type="hidden" name="sigN"> is never replaced —
// it stays put inside the wrapper, so every existing required-field /
// payload / review-card / wireSigDate code path (all of which just do
// document.querySelector('[name="sigN"]')) keeps working unchanged.

var SIGPAD_MARKER = 'signed'; // Short, non-empty, non-secret marker written
// into the hidden input's .value once the pad has ink. Deliberately NOT the
// image data itself — the image stays in the canvas/PDF, kept out of the
// JSON payload to keep it lean. Its only job is to make
// `el.value && el.value.trim()` (areRequiredFieldsFilled / markEmptyRequired)
// and wireSigDate's `if (sig.value.trim())` true.

var SignaturePads = {}; // name -> { isSigned, toDataURL, clear } — looked up
// later by submitForms() to pull each signature's image when building that
// consent's PDF.

function WcscSigPad(wrapperEl) {
  var name = wrapperEl.getAttribute('data-sigpad');
  var canvas = wrapperEl.querySelector('.sigpad-canvas');
  var hidden = wrapperEl.querySelector('input[type="hidden"][name="' + name + '"]');
  var clearBtn = wrapperEl.querySelector('.sigpad-clear');
  var pad = new SignaturePad(canvas, { minWidth: 0.75, maxWidth: 2.25 });
  var sized = false;

  // The canvas backing-store pixel size must match its rendered CSS box
  // (accounting for devicePixelRatio) or strokes look blurry/offset. This
  // can't safely happen at construction time — every .sigpad lives inside
  // an .fstep or .modal-bg that is display:none until the patient actually
  // navigates there, so getBoundingClientRect() would return 0x0 at parse
  // time. A ResizeObserver instead fires the first time this element's
  // content box becomes non-zero (i.e. the moment its modal/step opens),
  // and sizes the canvas exactly once. Deliberately NOT re-sizing after
  // that (even on a later window resize) — resizing a canvas always clears
  // its bitmap, and doing so after the patient has already signed would
  // silently wipe their signature.
  var ro = new ResizeObserver(function (entries) {
    if (sized) return;
    var rect = entries[0].contentRect;
    if (rect.width === 0 || rect.height === 0) return;
    var ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    sized = true;
  });
  ro.observe(canvas);

  function markSigned() {
    if (!hidden.value) {
      hidden.value = SIGPAD_MARKER;
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function markCleared() {
    hidden.value = '';
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
  }

  pad.addEventListener('endStroke', markSigned);

  clearBtn.addEventListener('click', function () {
    pad.clear();
    markCleared();
  });

  SignaturePads[name] = {
    isSigned: function () { return !pad.isEmpty(); },
    toDataURL: function () { return pad.toDataURL('image/png'); },
    clear: function () { pad.clear(); markCleared(); }
  };
}

document.querySelectorAll('.sigpad').forEach(function (el) {
  // Unlike jsPDF (a nice-to-have byproduct), signature_pad is load-bearing —
  // without it, signing doesn't work at all. Wrapping each instantiation in
  // try/catch means one broken widget (e.g. the CDN failed) can't throw an
  // uncaught exception that aborts the whole forEach and leaves the other
  // signature pads silently unwired too.
  try {
    new WcscSigPad(el);
  } catch (e) {
    console.error('Signature pad failed to initialize:', el.getAttribute('data-sigpad'), e);
  }
});
