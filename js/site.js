// Leilão Oficial — cabeçalho/rodapé compartilhados + utilidades. Injetado em todas as páginas.
(function () {
  'use strict';

  var LOGO = '<img class="brand__logo" src="images/logo.webp" alt="Copart" width="153" height="60">';
  var LOGO_LIGHT = LOGO;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; });
  }

  // Selo de patrocinadores ("Bancos e Financeiras"): logos deslizando em loop (animação em CSS).
  // Usado nos cards de lote, na página do lote e nas datas dos leilões da home.
  var SPONSORS = [
    ['bradesco', 'Bradesco'],
    ['tokio-marine', 'Tokio Marine Seguradora'],
    ['safra', 'Safra'],
    ['porto', 'Porto'],
    ['santander', 'Santander'],
    ['itau', 'Itaú']
  ];
  var SPONSOR_STEP = 2.5; // segundos por logo (deve casar com o CSS: 6 × 2,5 s = 15 s)
  function sponsorImg(sp, hidden) {
    return '<img class="sponsor__img" src="images/patrocinadores/' + sp[0] + '.webp" alt="' + (hidden ? '' : sp[1]) + '"' +
      (hidden ? ' aria-hidden="true"' : '') + ' width="48" height="48" loading="lazy" decoding="async">';
  }
  var sponsorImgs = SPONSORS.map(function (sp) { return sponsorImg(sp); }).join('') + sponsorImg(SPONSORS[0], true);
  // start: índice do logo inicial (dessincroniza selos vizinhos); cls: modificador de tamanho.
  window.NLSponsorBadge = function (start, cls) {
    var k = (parseInt(start, 10) || 0) % SPONSORS.length;
    return '<span class="sponsor' + (cls ? ' ' + cls : '') + '" title="Bancos e Financeiras">' +
      '<span class="sponsor__track" style="animation-delay:-' + (k * SPONSOR_STEP) + 's">' + sponsorImgs + '</span></span>';
  };
  function fillSponsors() {
    var els = document.querySelectorAll('[data-sponsors]');
    Array.prototype.forEach.call(els, function (el, idx) {
      el.innerHTML = window.NLSponsorBadge(el.getAttribute('data-sponsors') || idx, el.getAttribute('data-sponsors-size'));
    });
  }
  window.NLFillSponsors = fillSponsors;

  // Agenda compartilhada (home e leiloes.html): agrupa os lotes por leilão e monta os cards
  // sempre a partir das datas atuais do banco — o painel admin altera e o site acompanha.
  var EVENT_STATUS = { open: 'Aberto para lances', closed: 'Encerrado' };
  window.NL_EVENT_LIST = function (lots, limit, onlyUpcoming) {
    var groups = {};
    (lots || []).forEach(function (l) {
      var key = l.auctionNum != null ? 'n:' + l.auctionNum : 'l:' + (l.auction || l.id);
      var g = groups[key];
      if (!g) g = groups[key] = { num: l.auctionNum, lots: [], cats: {} };
      g.lots.push(l);
      g.cats[l.cat] = (g.cats[l.cat] || 0) + 1;
    });
    var list = Object.keys(groups).map(function (k) {
      var g = groups[k];
      g.lot = g.lots[0];
      g.di = window.NL_DATEINFO(g.lot);
      g.cat = Object.keys(g.cats).sort(function (a, b) { return g.cats[b] - g.cats[a]; })[0];
      g.mixed = Object.keys(g.cats).length > 1;
      return g;
    }).sort(function (a, b) {
      return a.di.sortKey - b.di.sortKey || (Number(a.num) || 0) - (Number(b.num) || 0);
    });
    if (onlyUpcoming) list = list.filter(function (g) { return g.di.status.k !== 'closed'; });
    if (limit) list = list.slice(0, limit);
    if (!list.length) return '';

    return list.map(function (g, i) {
      var status = g.di.status;
      var label = (!g.mixed && window.NL_CATS && window.NL_CATS[g.cat]) ? window.NL_CATS[g.cat].label : 'Itens';
      var meta = (g.num != null ? 'Leilão ' + g.num + ' · ' : '') + g.lots.length + ' ' + label;
      var href = 'lotes.html?date=' + encodeURIComponent(g.di.dm) + (g.mixed ? '' : '&cat=' + encodeURIComponent(g.cat));
      return '<a class="event' + (status.k === 'closed' ? ' event--closed' : '') + '" href="' + href + '">' +
        '<span class="event__status event__status--' + status.k + '">' + (EVENT_STATUS[status.k] || 'Aberto para lances') + '</span>' +
        '<span class="event__day">' + g.di.weekday + '</span>' +
        '<span class="event__date">' + g.di.dm + '</span>' +
        '<span class="event__meta">' + esc(meta) + '</span>' +
        '<span class="event__sponsor">' + window.NLSponsorBadge(i) + '</span></a>';
    }).join('');
  };

  function navLinks() {
    return [
      ['index.html', 'Início'],
      ['leiloes.html', 'Leilões'],
      ['lotes.html', 'Lotes'],
      ['edital.html', 'Edital'],
      ['como-funciona.html', 'Como funciona'],
      ['faq.html', 'FAQ'],
      ['sobre.html', 'Sobre'],
      ['contato.html', 'Contato']
    ].map(function (l) { return '<a href="' + l[0] + '">' + l[1] + '</a>'; }).join('');
  }

  function authArea() {
    var u = window.NLAuth && window.NLAuth.current();
    if (u) {
      return '<a class="btn btn--ghost" href="minha-conta.html">Minha conta</a>' +
             '<a class="btn btn--primary" href="#" data-logout>Sair</a>';
    }
    return '<a class="btn btn--ghost" href="login.html">Entrar</a>' +
           '<a class="btn btn--primary" href="cadastro.html">Cadastrar</a>';
  }

  function accountIcon() {
    var u = window.NLAuth && window.NLAuth.current();
    var href = u ? 'minha-conta.html' : 'login.html';
    var label = u ? ('Minha conta - ' + u.name) : 'Entre ou cadastre-se';
    var text = u ? 'Minha conta' : 'Entre ou cadastre-se';
    var classes = 'brand__account' + (u ? ' brand__account--user' : '');
    return '<a class="' + classes + '" href="' + href + '" aria-label="' + label + '" title="' + label + '">' +
      '<span class="brand__account-ico">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>' +
      (u ? '<span class="brand__account-dot"></span>' : '') + '</span>' +
      '<span class="brand__account-text">' + text + '</span></a>';
  }

  function headerHTML() {
    return '<div class="topbar"><div class="container topbar__inner">' +
      '<span>Atendimento seg. a sex. das 8h às 18h</span>' +
      '<div class="topbar__links"><a href="contato.html">Central (41) 0000-0000</a>' +
      '<a href="como-funciona.html">Como funciona</a></div></div></div>' +
      '<header class="header" id="inicio"><div class="container header__inner">' +
      '<a class="brand" href="index.html" aria-label="Leilão Oficial — início">' + LOGO + '</a>' +
      '<nav class="nav" aria-label="Principal">' + navLinks() + '</nav>' +
      accountIcon() +
      '<button class="nav-toggle" aria-label="Abrir menu" aria-expanded="false">' +
      '<span></span><span></span><span></span></button></div></header>';
  }

  // Faixa de selos logo acima do rodapé.
  function trustHTML() {
    return '<img src="images/selos/leilao-seguro.webp" alt="Leilão Seguro" width="260" height="44" loading="lazy" decoding="async">' +
      '<img src="images/selos/ssl-site-seguro.webp" alt="SSL — Certificado Site Seguro" width="198" height="88" loading="lazy" decoding="async">';
  }

  // Endereço da sede (usado no mapa, no rodapé e no contrato).
  var ENDERECO = {
    rua: 'Estr. Muranaka, 199',
    bairro: 'Jardim Novo Horizonte',
    cidade: 'Itaquaquecetuba — SP',
    cep: '08597-230',
    lat: -23.4565424,
    lng: -46.307716
  };
  // Panorama do Google Street View da sede (mesmo ângulo da foto compartilhada:
  // rumo 271,18° e inclinação −13,61°), incorporado pelo player oficial do Google.
  var STREETVIEW_SRC = 'https://maps.google.com/maps?q=&layer=c&cbll=' + ENDERECO.lat + ',' + ENDERECO.lng +
    '&cbpanoid=WkRS93H8f8kh9MIefItJxg&cbp=11,271.18,,0,13.61&output=svembed&hl=pt-BR';
  var MAPS_LINK = 'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(ENDERECO.rua + ', ' + ENDERECO.bairro + ', ' + ENDERECO.cidade + ', ' + ENDERECO.cep);

  // Seção do mapa: endereço + Street View, acima do rodapé (sem título, a pedido do dono).
  function mapsHTML() {
    return '<section class="mapsec" id="onde-estamos" aria-label="Onde estamos"><div class="container">' +
      '<div class="mapsec__card">' +
      '<div class="mapsec__info">' +
      '<p class="mapsec__addr"><strong>Leilão Oficial</strong><br>' +
      esc(ENDERECO.rua) + ' — ' + esc(ENDERECO.bairro) + '<br>' +
      esc(ENDERECO.cidade) + ', ' + esc(ENDERECO.cep) + '</p>' +
      '<p class="mapsec__actions"><a class="link" href="' + MAPS_LINK + '" target="_blank" rel="noopener">Abrir no Google Maps →</a></p>' +
      '</div>' +
      '<div class="mapsec__map"><iframe src="' + STREETVIEW_SRC + '" title="Google Street View — Estr. Muranaka, 199, Itaquaquecetuba - SP" ' +
      'loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>' +
      '</div></div></section>';
  }

  function footerHTML() {
    return mapsHTML() +
      '<section class="trustbar" aria-label="Selos de segurança"><div class="container trustbar__inner">' +
      '<span class="trustbar__label">Ambiente seguro e verificado</span>' + trustHTML() + '</div></section>' +
      '<footer class="footer"><div class="container footer__grid">' +
      '<div class="footer__col"><a class="brand brand--light" href="index.html">' + LOGO_LIGHT + '</a>' +
      '<p class="footer__muted">Leilões online com transparência e procedência.</p></div>' +
      '<div class="footer__col"><h4>Localização</h4>' +
      '<p class="footer__muted"><a href="index.html#onde-estamos">' + esc(ENDERECO.rua) + ' — ' + esc(ENDERECO.bairro) + '</a><br>' +
      '<a href="index.html#onde-estamos">' + esc(ENDERECO.cidade) + ', ' + esc(ENDERECO.cep) + '</a></p>' +
      '<h4>Horário</h4><p class="footer__muted">Seg. a sex., das 8h às 18h</p></div>' +
      '<div class="footer__col"><h4>Contato</h4><p class="footer__muted">' +
      '<a href="mailto:atendimento@leiloes-copart.com">atendimento@leiloes-copart.com</a><br>' +
      '<a href="tel:+550000000000">(41) 0000-0000</a><br>' +
      '<a href="https://wa.me/551148635629?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20gostaria%20de%20atendimento%20sobre%20os%20leil%C3%B5es." target="_blank" rel="noopener">WhatsApp (11) 4863-5629</a></p></div>' +
      '<div class="footer__col"><h4>Informações</h4><ul class="footer__links">' +
      '<li><a href="sobre.html">Quem somos</a></li>' +
      '<li><a href="como-funciona.html">Como funciona</a></li>' +
      '<li><a href="edital.html">Edital</a></li>' +
      '<li><a href="#">Política de privacidade</a></li>' +
      '<li><a href="#">Termos de uso</a></li></ul></div></div>' +
      '<div class="footer__bottom"><div class="container">' +
      '<p>© <span id="year"></span> Leilão Oficial. Todos os direitos reservados. · <a href="admin-login.html">Área administrativa</a></p>' +
      '</div></div></footer>' +
      '<a class="whatsapp" href="https://wa.me/551148635629?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20gostaria%20de%20atendimento%20sobre%20os%20leil%C3%B5es." target="_blank" rel="noopener" aria-label="Falar no WhatsApp">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.78 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01ZM12.04 20.15c-1.52 0-3-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.35c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z"/></svg></a>' +
      '<div class="cookies" id="cookies" hidden><p>Usamos cookies para melhorar sua experiência. Ao continuar, você concorda com nossa política.</p>' +
      '<button class="btn btn--primary" id="cookies-ok">Concordar</button></div>';
  }

  function mount(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function wire() {
    // ano
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    // menu mobile
    var header = document.querySelector('.header');
    var toggle = document.querySelector('.nav-toggle');
    if (toggle && header) {
      toggle.addEventListener('click', function () {
        var open = header.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }

    // logout
    document.querySelectorAll('[data-logout]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var done = function () { location.href = 'index.html'; };
        if (window.NLAuth) window.NLAuth.logout().then(done, done); else done();
      });
    });

    // destaca a página atual no menu
    // Na Vercel (cleanUrls) a URL vem sem ".html" (ex.: /lotes); normaliza para comparar com os links.
    var path = location.pathname.split('/').pop() || 'index.html';
    if (path.indexOf('.') < 0) path += '.html';
    document.querySelectorAll('.nav a').forEach(function (a) {
      if (a.getAttribute('href') === path) a.classList.add('is-current');
    });

    // cookies
    var cookies = document.getElementById('cookies');
    var ok = document.getElementById('cookies-ok');
    var KEY = 'nl_cookies_ok';
    try { if (cookies && localStorage.getItem(KEY) !== '1') cookies.hidden = false; }
    catch (e) { if (cookies) cookies.hidden = false; }
    if (ok) ok.addEventListener('click', function () {
      if (cookies) cookies.hidden = true;
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
    });
  }

  function effects() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || !('IntersectionObserver' in window)) return;

    // Números das estatísticas contam uma única vez, ao entrar na tela.
    setTimeout(function () {
      var nums = [].slice.call(document.querySelectorAll('.stats .stat strong'));
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      nums.forEach(function (n) { cio.observe(n); });
    }, 0);

    function countUp(el) {
      var target = parseInt((el.textContent || '').replace(/\D/g, ''), 10) || 0;
      var dur = 900, start = null;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = Math.round(target * p);
        if (p < 1) requestAnimationFrame(tick); else el.textContent = target;
      }
      requestAnimationFrame(tick);
    }
  }

  // Visualizações para o painel admin (função track_view, migração 003). Falha em silêncio.
  function trackView() {
    var supa = window.NLSupa;
    if (!supa) return;
    var vid = null;
    try {
      vid = localStorage.getItem('nl_vid');
      if (!vid) { vid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('nl_vid', vid); }
    } catch (e) {}
    var lotId = /lote(\.html)?$/.test(location.pathname) ? parseInt(new URLSearchParams(location.search).get('id'), 10) : NaN;
    var path = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
    supa.rpc('track_view', { p_path: path, p_lot_id: isNaN(lotId) ? null : lotId, p_visitor: vid })
      .then(function () {}, function () {});
  }

  function init() {
    mount('site-header', headerHTML());
    mount('site-footer', footerHTML());
    fillSponsors();
    wire();
    effects();
    trackView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
