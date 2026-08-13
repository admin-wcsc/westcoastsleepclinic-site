function switchTab(btn, tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

function toggleMobNav() {
  var nav = document.getElementById('mobNav');
  var header = document.querySelector('.site-header');
  nav.style.top = header.getBoundingClientRect().bottom + 'px';
  nav.classList.toggle('open');
}

function toggleCallFab() {
  document.getElementById('callFabPop').classList.toggle('open');
}
