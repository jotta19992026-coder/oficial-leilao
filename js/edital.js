// Leilão Oficial — edital com as datas atuais do banco (editáveis no painel admin).
// Aceita ?id=<lote> (link da página do lote) ou ?leilao=<número>.
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var wantedId = parseInt(params.get('id'), 10);
  var wantedNum = parseInt(params.get('leilao'), 10);

  function set(name, value) {
    var el = document.querySelector('[data-edital="' + name + '"]');
    if (el && value) el.textContent = value;
  }
  function isoFromBR(v) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v || ''));
    return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
  }
  function fmtBR(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }
  function hhmm(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
    return m ? String(m[1]).padStart(2, '0') + 'h' + m[2] : '';
  }
  function dateTimeBR(iso, time) {
    var d = fmtBR(iso);
    return d ? d + ', às ' + hhmm(time) : '';
  }

  (window.NLStore ? window.NLStore.ready : Promise.resolve()).then(function () {
    var lots = window.NLStore ? window.NLStore.lots() : (window.NL_LOTS || []);
    if (!lots.length) return;

    var lot = null;
    if (wantedId) lot = lots.filter(function (l) { return l.id === wantedId; })[0] || null;
    if (!lot && wantedNum) lot = lots.filter(function (l) { return l.auctionNum === wantedNum; })[0] || null;
    if (!lot) {
      var ordered = lots.slice().sort(function (a, b) { return window.NL_DATEINFO(a).sortKey - window.NL_DATEINFO(b).sortKey; });
      lot = ordered.filter(function (l) { return window.NL_DATEINFO(l).status.k !== 'closed'; })[0] || ordered[0];
    }

    var di = window.NL_DATEINFO(lot);
    var ed = window.NL_EDITAL(lot);
    var iso = lot.auctionDateISO || isoFromBR(lot.auctionDate) || isoFromBR(di.date);
    var time = /^\d{1,2}:\d{2}/.test(String(lot.auctionTime || '')) ? lot.auctionTime.slice(0, 5) : di.time;

    set('numero', ed.numero);
    set('abertura', dateTimeBR(iso, time));
    if (lot.endsAt) {
      var end = new Date(lot.endsAt);
      set('encerramento', isNaN(end) ? ed.encerramento : end.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }));
    } else {
      set('encerramento', iso ? fmtBR(iso) + ', a partir das 14h00' : ed.encerramento);
    }
    // Visitação: frase fixa (agendamento prévio) — fica no HTML do edital.html.
    document.title = 'Edital — Leilão ' + String(lot.auctionNum || '').padStart(2, '0') + ' | Leilão Oficial';
  });
})();
