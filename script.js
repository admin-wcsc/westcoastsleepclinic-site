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

function toggleMobNav() {
  var nav = document.getElementById('mobNav');
  var isOpen = nav.classList.toggle('open');
  if (isOpen) {
    positionMobNav();
    window.addEventListener('scroll', positionMobNav);
  } else {
    window.removeEventListener('scroll', positionMobNav);
  }
}

function toggleCallFab() {
  document.getElementById('callFabPop').classList.toggle('open');
}
