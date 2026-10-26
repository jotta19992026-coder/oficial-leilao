// Leilão Oficial — gerador de contrato de arrematação.
(function () {
  'use strict';
  var form = document.getElementById('contract-form');
  if (!form) return;

  // Exclusivo do administrador (profiles.role = 'admin'); os demais vão para o login do painel.
  form.style.visibility = 'hidden';
  window.NLAdmin.require().then(function (ok) {
    if (!ok) return;
    form.style.visibility = '';
    return window.NLStore ? window.NLStore.ready : null;
  }).then(function () {
    if (form.style.visibility === 'hidden') return;
    var lots = window.NLStore ? window.NLStore.lots() : (window.NL_LOTS || []);
    var sel = document.getElementById('c-lote');
    lots.forEach(function (l) {
      var o = document.createElement('option');
      o.value = l.id;
      o.textContent = 'Lote ' + l.n + ' — ' + l.title;
      sel.appendChild(o);
    });

    function lotById(id) {
      return lots.filter(function (l) { return l.id === parseInt(id, 10); })[0] || null;
    }
    function syncValor() {
      var lot = lotById(sel.value);
      if (lot) document.getElementById('c-valor').value = lot.price;
    }
    sel.addEventListener('change', syncValor);
    syncValor();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var lot = lotById(sel.value);
      document.getElementById('contract-output').innerHTML = window.NLContractHTML({
        nome: document.getElementById('c-nome').value.trim(),
        cpf: document.getElementById('c-cpf').value.trim(),
        email: document.getElementById('c-email').value.trim(),
        tel: document.getElementById('c-tel').value.trim(),
        endereco: document.getElementById('c-endereco').value.trim(),
        lote: lot ? ('Lote ' + lot.n + ' — ' + lot.title) : '—',
        valor: parseInt(document.getElementById('c-valor').value, 10) || 0,
        data: lot ? window.NL_DATEINFO(lot).label : '—'
      }) + '<div class="doc__actions no-print"><button class="btn btn--primary" id="print-contract">Imprimir / salvar PDF</button></div>';

      document.getElementById('print-contract').addEventListener('click', function () { window.print(); });
      document.getElementById('contract-output').scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
