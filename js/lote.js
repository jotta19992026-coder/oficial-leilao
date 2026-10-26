// Norte Leilões — página de detalhe do lote (?id=N).
(function () {
  'use strict';
  var root = document.getElementById('lot-detail');
  if (!root) return;

  var id = parseInt(new URLSearchParams(location.search).get('id'), 10);
  (window.NLStore ? window.NLStore.ready : Promise.resolve()).then(function () { render(); });

  function render() {
  var lot = window.NLStore ? window.NLStore.lot(id)
    : (window.NL_LOTS || []).filter(function (l) { return l.id === id; })[0];

  if (!lot) {
    root.innerHTML = '<div class="container"><p class="empty">Lote não encontrado. <a class="link" href="lotes.html">Ver todos os itens →</a></p></div>';
    return;
  }

  document.title = 'Lote ' + lot.n + ' — ' + lot.title + ' | Norte Leilões';

  var current = lot.price;
  var step = lot.increment || Math.max(100, Math.round(lot.price * 0.01 / 100) * 100);
  var di = window.NL_DATEINFO(lot);
  var ex = window.NL_EXTRA(lot);
  var liveBadge = di.status.k === 'open' ? '<span class="live">Ao vivo</span>' : '';

  var photos = (lot.photos && lot.photos.length) ? lot.photos : [window.NL_IMG_FOR(lot)];
  var thumbs = photos.map(function (src, i) {
    return '<span data-src="' + src + '" class="' + (i === 0 ? 'is-active' : '') + '" role="button" tabindex="0" aria-label="Ver foto ' + (i + 1) + ' de ' + photos.length + '"><img src="' + src + '" alt="' + lot.title + ' — foto ' + (i + 1) + '" loading="lazy" decoding="async"></span>';
  }).join('');

  function areaOf(title) {
    var m = (title || '').match(/([\d.]+,\d+|\d+)\s*m²/);
    return m ? m[1] + ' m²' : 'Consultar edital';
  }

  var specs = [];
  if (lot.cat === 'imovel') {
    specs.push(['Área', areaOf(lot.title)]);
    specs.push(['Localização', lot.city]);
  } else if (lot.cat === 'equipamento') {
    specs.push(['Itens', lot.title]);
    specs.push(['Localização', lot.city]);
  } else if (lot.cat === 'nautico') {
    specs.push(['Ano/Modelo', lot.year]);
    specs.push(['Uso', lot.km]);
    specs.push(['Combustível', 'Gasolina']);
    specs.push(['Localização', lot.city]);
  } else {
    specs.push(['Ano/Modelo', lot.year]);
    specs.push(['Hodômetro', lot.km]);
    specs.push(['Combustível', ex.combustivel]);
    specs.push(['Câmbio', ex.cambio]);
    specs.push(['Cor', ex.cor]);
    specs.push(['Portas', ex.portas]);
    specs.push(['Final de placa', ex.placa]);
    specs.push(['Localização', lot.city]);
  }
  var specsHTML = specs.map(function (s) {
    return '<li><span>' + s[0] + '</span><strong>' + s[1] + '</strong></li>';
  }).join('') + '<li><span>Lances</span><strong id="d-bids">' + lot.bids + '</strong></li>';

  var obsTitle = (lot.cat === 'imovel' || lot.cat === 'equipamento') ? 'Observações' : 'Observações do laudo';
  var obsText = lot.obs || ex.laudo;
  var descText = lot.desc ||
    (lot.title + ' (' + lot.year + '), ' + lot.km + ', localizado em ' + lot.city + '. ' +
      'Lote da Norte Leilões, com laudo e fotos ilustrativos. ' +
      'Confira as condições completas no edital antes de ofertar.');

  root.innerHTML =
    '<div class="container">' +
    '<nav class="crumbs"><a href="index.html">Início</a> / <a href="lotes.html">Lotes</a> / <span>Lote ' + lot.n + '</span></nav>' +
    '<div class="detail">' +
      '<div class="detail__media">' +
        '<div class="gallery gallery--' + lot.media + '"><img class="gallery__img" id="d-main" fetchpriority="high" src="' + photos[0] + '" alt="' + lot.title + '"><span class="lot__tag">Lote ' + lot.n + '</span></div>' +
        '<div class="thumbs" id="d-thumbs">' + thumbs + '</div>' +
      '</div>' +
      '<div class="detail__info">' +
        '<span class="chip is-active">' + lot.catLabel + '</span>' + liveBadge +
        '<h1>' + lot.title + '</h1>' +
        '<p class="detail__sub">' + lot.auction + '</p>' +
        (window.NLSponsorBadge ? '<div class="sponsorline">' + window.NLSponsorBadge(lot.n, 'sponsor--lg') +
          '<span class="sponsorline__txt"><small>Comitentes</small><strong>Bancos e Financeiras</strong></span></div>' : '') +
        '<ul class="specs">' + specsHTML + '</ul>' +
        '<div class="bidbox">' +
          '<div class="bidbox__row"><span>Lance atual</span><strong class="bidbox__price" id="d-price">' + window.NL_BRL(current) + '</strong></div>' +
          '<div class="bidbox__row bidbox__last"><span>Último lance</span><span id="d-last">—</span></div>' +
          '<div class="bidbox__row"><span>Encerra em</span><strong class="countdown" id="d-countdown">—</strong></div>' +
          '<div class="bidbox__row"><span>Visualizações</span><span class="views" id="d-views">—</span></div>' +
          '<p class="bidbox__hint">Incremento mínimo: ' + window.NL_BRL(step) + '</p>' +
          '<button class="btn btn--primary btn--block btn--bid" id="d-bid">Dar lance de ' + window.NL_BRL(current + step) + '</button>' +
          '<div class="bidamount">' +
            '<label for="d-amount">Valor do lance</label>' +
            '<div class="bidamount__box">' +
              '<span class="bidamount__prefix">R$</span>' +
              '<input id="d-amount" class="bidamount__input" type="text" inputmode="numeric" autocomplete="off" value="' + (current + step).toLocaleString('pt-BR') + '" aria-describedby="d-amount-hint">' +
              '<button type="button" class="bidamount__step" data-dir="-1" aria-label="Diminuir valor">−</button>' +
              '<button type="button" class="bidamount__step" data-dir="1" aria-label="Aumentar valor">+</button>' +
            '</div>' +
            '<p class="bidbox__hint" id="d-amount-hint">Lance mínimo: ' + window.NL_BRL(current + step) + '</p>' +
          '</div>' +
          '<p class="bidbox__note" id="d-note"></p>' +
        '</div>' +
        (window.NL_EDITAL ? (function () {
          var ed = window.NL_EDITAL(lot);
          var rows = [
            ['Leilão', ed.numero],
            ['Data', ed.abertura],
            ['Encerramento', ed.encerramento],
            ['Leiloeiro', ed.leiloeiro],
            ['Matrícula', ed.matricula],
            ['Comitente', ed.comitente],
            ['Comissão', ed.comissao],
            ['Pagamento', ed.pagamento],
            ['Retirada', ed.retirada]
          ];
          return '<div class="editalbox">' +
            '<h3>Informações do edital</h3>' +
            '<ul class="editalbox__list">' +
            rows.map(function (r) { return '<li><span>' + r[0] + '</span><strong>' + r[1] + '</strong></li>'; }).join('') +
            '</ul>' +
            '</div>';
        })() : '') +
        '<a class="link" href="edital.html">Ver edital deste leilão →</a>' +
      '</div>' +
    '</div>' +
    '<div class="detail__desc"><h2>Descrição</h2>' +
      '<p>' + descText + '</p>' +
      '<h3 style="color:var(--navy);font-size:1.05rem;margin:1.2rem 0 .3rem">' + obsTitle + '</h3>' +
      '<p>' + obsText + '</p>' +
    '</div>' +
    '<div class="detail__history"><h2>Histórico de lances</h2>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Participante</th><th>Valor</th><th>Quando</th></tr></thead>' +
      '<tbody id="bid-history"></tbody></table></div>' +
    '</div>' +
    '</div>';

  var thumbsWrap = document.getElementById('d-thumbs');
  var mainImg = document.getElementById('d-main');
  if (thumbsWrap && mainImg) {
    function selectPhoto(el) {
      var src = el.getAttribute('data-src');
      if (!src) return;
      mainImg.src = src;
      mainImg.alt = el.getAttribute('aria-label') || lot.title;
      thumbsWrap.querySelectorAll('[data-src]').forEach(function (s) { s.classList.remove('is-active'); });
      el.classList.add('is-active');
    }
    thumbsWrap.addEventListener('click', function (e) {
      var el = e.target.closest('[data-src]');
      if (el && thumbsWrap.contains(el)) selectPhoto(el);
    });
    thumbsWrap.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var el = e.target.closest('[data-src]');
      if (el) { e.preventDefault(); selectPhoto(el); }
    });
  }

  if (window.NLTimers) window.NLTimers.scan();

  // ---- Contagem regressiva do término do leilão ----
  function parseEnds(str) {
    if (!str) return 0;
    var ms = 0, d = str.match(/(\d+)\s*d/), h = str.match(/(\d+)\s*h/), m = str.match(/(\d+)\s*m/);
    if (d) ms += parseInt(d[1], 10) * 86400000;
    if (h) ms += parseInt(h[1], 10) * 3600000;
    if (m) ms += parseInt(m[1], 10) * 60000;
    return ms;
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtCountdown(ms) {
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return (d > 0 ? d + 'd ' : '') + pad2(h) + ':' + pad2(m) + ':' + pad2(s);
  }
  var endTime = lot.endsAt || (Date.now() + parseEnds(lot.ends));
  var cdEl = document.getElementById('d-countdown');
  function tickCountdown() {
    var ms = endTime - Date.now();
    if (ms <= 0) { cdEl.textContent = 'Encerrado'; cdEl.classList.add('countdown--ended'); return; }
    cdEl.textContent = fmtCountdown(ms);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  // ---- Visualizações (estimadas, sobem aos poucos) ----
  var views = 90 + ((lot.id * 37) % 760) + Math.floor(Math.random() * 40);
  var vEl = document.getElementById('d-views');
  function renderViews() { vEl.textContent = views.toLocaleString('pt-BR') + ' pessoas vendo agora'; }
  renderViews();
  setInterval(function () { views += Math.floor(Math.random() * 3); renderViews(); }, 5000);

  // ---- Histórico (lot_bid_history: só o primeiro nome) e lance atual ----
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function renderHistory(list) {
    var last = document.getElementById('d-last');
    var tb = document.getElementById('bid-history');
    if (last) {
      last.innerHTML = list.length
        ? '<strong>' + window.NL_BRL(list[0].amount) + '</strong> · ' + esc(list[0].userLabel)
        : 'Seja o primeiro a dar um lance';
    }
    if (!tb) return;
    tb.innerHTML = list.length
      ? list.map(function (b) {
          return '<tr><td>' + esc(b.userLabel) + '</td><td>' + window.NL_BRL(b.amount) + '</td><td>' +
            new Date(b.time).toLocaleString('pt-BR') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="3" class="muted">Ainda não há lances para este lote. Seja o primeiro.</td></tr>';
  }
  function loadHistory() {
    if (!window.NLStore) return;
    window.NLStore.history(lot.id).then(renderHistory);
  }
  // Aplica preço/quantidade de lances vindos do banco.
  function applyLot(fresh) {
    if (!fresh) return;
    document.getElementById('d-bids').textContent = fresh.bids;
    if (fresh.price !== current) {
      current = fresh.price;
      document.getElementById('d-price').textContent = window.NL_BRL(current);
      syncAmountControls(false);
    }
  }

  var btn = document.getElementById('d-bid');
  var note = document.getElementById('d-note');
  var amountEl = document.getElementById('d-amount');
  var amountHint = document.getElementById('d-amount-hint');

  function minBid() { return current + step; }
  function amountValue() {
    var digits = String(amountEl ? amountEl.value : '').replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }
  function updateBidLabel() {
    if (!btn) return;
    var value = amountEl ? amountValue() : 0;
    if (!amountEl || value < minBid()) value = minBid();
    btn.textContent = 'Dar lance de ' + window.NL_BRL(value);
  }
  function syncAmountControls(reset) {
    if (!amountEl) return;
    var min = minBid();
    if (reset || !amountEl.value || amountValue() < min) amountEl.value = min.toLocaleString('pt-BR');
    if (amountHint) amountHint.textContent = 'Lance mínimo: ' + window.NL_BRL(min);
    updateBidLabel();
  }
  if (amountEl) {
    amountEl.addEventListener('input', function () {
      amountEl.value = amountEl.value.replace(/[^\d]/g, '');
      updateBidLabel();
    });
    amountEl.addEventListener('blur', function () {
      var value = amountValue();
      if (value) amountEl.value = value.toLocaleString('pt-BR');
    });
    document.querySelectorAll('.bidamount__step').forEach(function (stepBtn) {
      stepBtn.addEventListener('click', function () {
        var value = amountValue() || minBid();
        value += parseInt(stepBtn.getAttribute('data-dir'), 10) * step;
        if (value < minBid()) value = minBid();
        amountEl.value = value.toLocaleString('pt-BR');
        updateBidLabel();
      });
    });
    syncAmountControls(false);
  }

  // Tempo real: qualquer lance novo neste lote atualiza preço e histórico.
  if (window.NLStore) {
    window.NLStore.watchLot(lot.id, function (fresh) { applyLot(fresh); loadHistory(); });
    // Rede de segurança caso o realtime caia: relê o lote a cada 20 s.
    setInterval(function () {
      if (document.hidden) return;
      window.NLStore.refreshLot(lot.id).then(applyLot);
    }, 20000);
  }
  loadHistory();

  var sending = false;
  btn.addEventListener('click', function () {
    if (sending) return;
    if (window.NLAuth && !window.NLAuth.current()) {
      note.textContent = 'Você precisa entrar na sua conta para dar lances.';
      setTimeout(function () { location.href = 'login.html?next=' + encodeURIComponent('lote.html?id=' + lot.id); }, 1200);
      return;
    }
    var amount = amountValue();
    if (amount < minBid()) {
      note.textContent = 'O lance mínimo é ' + window.NL_BRL(minBid()) + '.';
      if (amountEl) { amountEl.focus(); }
      return;
    }
    // O banco (place_bid) valida o mínimo de novo, com o lote travado: vale o que ele decidir.
    sending = true;
    btn.disabled = true;
    note.textContent = 'Enviando lance…';
    window.NLStore.placeBid(lot.id, amount).then(function (r) {
      sending = false;
      btn.disabled = false;
      if (!r.ok) {
        note.textContent = r.error;
        window.NLStore.refreshLot(lot.id).then(applyLot);
        return;
      }
      applyLot(r.lot);
      syncAmountControls(true);
      note.textContent = 'Lance registrado: ' + window.NL_BRL(r.amount) + '.';
      loadHistory();
    });
  });
  }
})();
