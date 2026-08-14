function switchTab(btn, tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

// Split out so it can run both once (on open) and repeatedly (while open) --
// .site-header is position:sticky, so its viewport position shifts as the
// page scrolls, and .mob-nav's own top has to keep tracking it or the menu
// drifts away from the header instead of staying docked right below it.
function positionMobNav() {
  var nav = document.getElementById('mobNav');
  var header = document.querySelector('.site-header');
  nav.style.top = header.getBoundingClientRect().bottom + 'px';
}

// Registered on document only while the menu is open, and ignores clicks on
// the menu itself or the hamburger button (which already toggles it) -- so a
// tap anywhere else on the page closes it.
function closeMobNavOnOutsideClick(e) {
  var nav = document.getElementById('mobNav');
  var hamburger = document.querySelector('.hamburger');
  if (nav.contains(e.target) || hamburger.contains(e.target)) return;
  toggleMobNav();
}

function toggleMobNav() {
  var nav = document.getElementById('mobNav');
  var isOpen = nav.classList.toggle('open');
  if (isOpen) {
    positionMobNav();
    window.addEventListener('scroll', positionMobNav);
    document.addEventListener('click', closeMobNavOnOutsideClick);
  } else {
    window.removeEventListener('scroll', positionMobNav);
    document.removeEventListener('click', closeMobNavOnOutsideClick);
  }
}

function toggleCallFab() {
  document.getElementById('callFabPop').classList.toggle('open');
}
