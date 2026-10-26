// Leilão Oficial — gerador de contrato de arrematação.
(function () {
  'use strict';
  var form = document.getElementById('contract-form');
  if (!form) return;

  // Exige login; pré-preenche com os dados da conta.
  if (!window.NLAuth.requireAuth('login.html?next=contrato.html')) return;
  var u = window.NLAuth.current();

  // Renderiza depois que os lotes chegam do Supabase (ou do catálogo local, se offline).
  (window.NLStore ? window.NLStore.ready : Promise.resolve()).then(function () {
    var lots = window.NLStore ? window.NLStore.lots() : (window.NL_LOTS || []);
    var sel = document.getElementById('c-lote');
    lots.forEach(function (l) {
      var o = document.createElement('option');
      o.value = l.id;
      o.textContent = 'Lote ' + l.n + ' — ' + l.title;
      sel.appendChild(o);
    });

    if (u) {
      document.getElementById('c-nome').value = u.name || '';
      document.getElementById('c-email').value = u.email || '';
    }
    // Completa com o que o cliente informou no cadastro (sem apagar o que já foi digitado).
    if (window.NLAuth.profile) {
      window.NLAuth.profile().then(function (p) {
        if (!p) return;
        [['c-nome', p.name], ['c-cpf', p.cpf], ['c-tel', p.phone], ['c-endereco', p.address]].forEach(function (f) {
          var el = document.getElementById(f[0]);
          if (el && !el.value && f[1]) {
            el.value = f[1];
            if (window.NLMasks && el.hasAttribute('data-mask')) window.NLMasks.apply(el);
          }
        });
      });
    }

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
