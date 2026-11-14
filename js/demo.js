(function () {
  'use strict';
  var NAMES = ['João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Gabriel', 'Fernanda', 'Rafael', 'Camila', 'Bruno', 'Larissa', 'Matheus', 'Beatriz', 'Thiago', 'Patrícia', 'Vinícius', 'Amanda', 'Diego', 'Natália'];
  var ON = { enabled: false };

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function rng(seed) {
    var x = seed || 1;
    return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  }
  function isAdminPage() {
    return /admin|redefinir-senha/i.test(location.pathname || '');
  }
  function loadConfig() {
    var supa = window.NLSupa;
    if (!supa) { ON.enabled = false; return Promise.resolve(ON); }
    return supa.rpc('get_site_setting', { p_key: 'demo_mode' }).then(function (r) {
      var v = r && r.data;
      if (v && typeof v === 'object' && 'enabled' in v) ON.enabled = !!v.enabled;
      else if (v && typeof v === 'string') { try { v = JSON.parse(v); ON.enabled = !!v.enabled; } catch (e) { ON.enabled = false; } }
      else ON.enabled = false;
      return ON;
    }, function () { ON.enabled = false; return ON; });
  }
  function enabled() {
    if (/[?&]demo=0(&|$)/.test(location.search || '')) return false;
    if (isAdminPage()) return false;
    return !!ON.enabled;
  }
  function forLot(l) {
    if (!l) return null;
    var r = rng(hash('nl-demo-' + l.id));
    var count = 2 + Math.floor(r() * 7);
    var base = Number(l.realPrice != null ? l.realPrice : (l.price || 0));
    var step = Number(l.increment || 100);
    var cap = base + base * 0.7;
    cap = base + Math.floor((cap - base) / step) * step;
    if (cap <= base) cap = base + step;
    var vals = [];
    var cur = base;
    for (var i = 0; i < count; i++) {
      cur += step * (1 + Math.floor(r() * 3));
      if (cur > cap) cur = cap;
      vals.push(cur);
    }
    // remove duplicatas extremas: garantir ao menos base+step
    if (vals[0] < base + step) vals[0] = base + step;
    vals.sort(function (a, b) { return a - b; });
    // nomes determinísticos
    var nameIdx = [];
    for (var i = 0; i < count; i++) nameIdx.push(Math.floor(r() * NAMES.length));
    var now = Date.now();
    var lastAgo = (30 + Math.floor(r() * 300)) * 60000; // 30 min .. 5h30
    var rows = [];
    var t = now - lastAgo;
    // do mais antigo para o mais recente (depois invertemos)
    var chronology = [];
    for (var i = 0; i < count; i++) {
      chronology.push({ amount: vals[i], time: t });
      t += (8 + Math.floor(r() * 31)) * 60000;
    }
    // ordenado do mais recente ao mais antigo
    chronology.sort(function (a, b) { return b.time - a.time; });
    for (var i = 0; i < chronology.length; i++) {
      var ni = nameIdx[i % nameIdx.length];
      rows.push({ userLabel: NAMES[ni], amount: chronology[i].amount, time: chronology[i].time });
    }
    return { top: vals[vals.length - 1], count: count, rows: rows };
  }
  function views(lotId) {
    var r = rng(hash('nl-demo-views-' + Number(lotId)));
    return { views: 35 + Math.floor(r() * 900), online: 1 + Math.floor(r() * 6) };
  }
  window.NLDemo = {
    _enabled: false,
    loadConfig: loadConfig,
    enabled: function () { return !isAdminPage() && !!ON.enabled; },
    forLot: forLot,
    views: views
  };
  // carrega ao iniciar
  loadConfig().then(function (v) { window.NLDemo._enabled = v.enabled; }).catch(function () {});
})();
window.NLDemo._enabled = window.NLDemo ? window.NLDemo._enabled : false;