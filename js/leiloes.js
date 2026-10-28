// Leilão Oficial — agenda de leilões montada a partir dos lotes do banco.
// As datas vêm de auction_date/auction_time/ends_at, editáveis no painel admin.
(function () {
  'use strict';
  var box = document.getElementById('agenda-events');
  if (!box) return;

  (window.NLStore ? window.NLStore.ready : Promise.resolve()).then(function () {
    var lots = window.NLStore ? window.NLStore.lots() : (window.NL_LOTS || []);
    var html = window.NL_EVENT_LIST ? window.NL_EVENT_LIST(lots, 0, false) : '';
    box.innerHTML = html || '<p class="empty">Nenhum leilão cadastrado no momento.</p>';
  });
})();
