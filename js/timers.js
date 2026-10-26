// Norte Leilões — cronômetros dos lotes. data-ends-at="<epoch ms>" (prazo real do banco) ou
// data-ends="+25h33m"/"+8d" (a partir de agora, catálogo local).
(function () {
  'use strict';
  var items = [];

  function parseOffset(str) {
    if (!str) return 0;
    var ms = 0, d = str.match(/(\d+)\s*d/), h = str.match(/(\d+)\s*h/), m = str.match(/(\d+)\s*m/);
    if (d) ms += parseInt(d[1], 10) * 86400000;
    if (h) ms += parseInt(h[1], 10) * 3600000;
    if (m) ms += parseInt(m[1], 10) * 60000;
    return ms;
  }
  function fmt(ms) {
    if (ms <= 0) return 'Encerrado';
    var totalMin = Math.floor(ms / 60000);
    var d = Math.floor(totalMin / 1440), hh = Math.floor((totalMin % 1440) / 60), mm = totalMin % 60;
    if (d > 0) return d + 'd ' + hh + 'h';
    var ss = Math.floor((ms % 60000) / 1000);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }
  function scan() {
    items = [];
    document.querySelectorAll('.lot__timer,[data-countdown]').forEach(function (el) {
      var at = parseInt(el.getAttribute('data-ends-at'), 10);
      if (at) items.push({ el: el, end: at });
      else if (el.getAttribute('data-ends')) items.push({ el: el, end: Date.now() + parseOffset(el.getAttribute('data-ends')) });
    });
    tick();
  }
  function tick() { items.forEach(function (t) { t.el.textContent = fmt(t.end - Date.now()); }); }

  window.NLTimers = { scan: scan };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  setInterval(tick, 1000);
})();
