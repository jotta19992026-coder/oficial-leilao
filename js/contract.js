// Leilão Oficial — modelo do contrato de arrematação (usado em contrato.html e no painel admin).
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; });
  }
  function brl(v) { return 'R$ ' + (Math.round(Number(v) || 0)).toLocaleString('pt-BR'); }

  // d: { nome, cpf, email, tel, endereco, lote, valor (número), data, numero? }
  window.NLContractHTML = function (d) {
    var valor = Number(d.valor) || 0;
    var hoje = new Date().toLocaleDateString('pt-BR');
    return '<div class="contract doc" id="contract-doc">' +
      '<h2 style="text-align:center">Contrato particular de arrematação em leilão</h2>' +
      (d.numero ? '<p style="text-align:center" class="muted">Nº ' + esc(d.numero) + '</p>' : '') +
      '<p><strong>Comitente/Leiloeiro:</strong> Leilão Oficial.</p>' +
      '<p><strong>Arrematante:</strong> ' + esc(d.nome || '—') + ' — CPF/CNPJ ' + esc(d.cpf || '—') + ', e-mail ' + esc(d.email || '—') +
      ', telefone ' + esc(d.tel || '—') + ', endereço ' + esc(d.endereco || '—') + '.</p>' +
      '<h3>1. Do objeto</h3><p>O arrematante declara ter adquirido, no leilão, o lote a seguir, no estado em que se encontra: <strong>' +
      esc(d.lote || '—') + '</strong>, com encerramento em ' + esc(d.data || '—') + '.</p>' +
      '<h3>2. Do valor e da comissão</h3><p>Valor de arremate: <strong>' + brl(valor) + '</strong>. Sobre esse valor incide a comissão do leiloeiro de 5% (' +
      brl(valor * 0.05) + '), devida pelo arrematante.</p>' +
      '<h3>3. Do pagamento</h3><p>O pagamento deverá ser realizado no prazo e pelos meios indicados pela plataforma. O não pagamento caracteriza inadimplência e pode acarretar o cancelamento da arrematação.</p>' +
      '<h3>4. Da entrega/retirada</h3><p>A retirada do bem ocorrerá mediante comprovação do pagamento integral, no local e prazo informados, por conta do arrematante.</p>' +
      '<h3>5. Das declarações</h3><p>O arrematante declara ter ciência das condições do edital e do estado do bem, adquirido sem garantia.</p>' +
      '<h3>6. Do foro</h3><p>Fica eleito o foro da comarca indicada pelo comitente para dirimir eventuais controvérsias.</p>' +
      '<p style="margin-top:1.5rem">Local e data: ____________________, ' + hoje + '.</p>' +
      '<div style="display:flex;gap:2rem;margin-top:2.5rem;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:220px;border-top:1px solid #333;padding-top:.4rem;text-align:center">' + esc(d.nome || '') + '<br><span class="muted">Arrematante</span></div>' +
      '<div style="flex:1;min-width:220px;border-top:1px solid #333;padding-top:.4rem;text-align:center">Leilão Oficial<br><span class="muted">Leiloeiro</span></div>' +
      '</div>' +
      '<p class="muted" style="margin-top:1.5rem">Confira todas as informações antes de assinar.</p>' +
      '</div>';
  };

  // Abre o contrato numa janela própria, já com o estilo do site, e chama a impressão (salvar PDF).
  window.NLContractPrint = function (d) {
    var w = window.open('', '_blank');
    if (!w) { alert('Permita pop-ups para gerar o contrato.'); return; }
    var base = location.href.replace(/[^/]*$/, '');
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato — ' + esc(d.nome || '') + '</title>' +
      '<base href="' + esc(base) + '"><link rel="stylesheet" href="css/styles.css">' +
      '<style>body{background:#fff;padding:24px}.contract{max-width:800px;margin:0 auto}</style></head><body>' +
      window.NLContractHTML(d) + '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>');
    w.document.close();
  };
})();
