// Leilão Oficial — cabeçalho/rodapé compartilhados + utilidades. Injetado em todas as páginas.
(function () {
  'use strict';

  var LOGO = '<img class="brand__logo" src="images/logo.png" alt="Copart" width="153" height="60">';
  var LOGO_LIGHT = LOGO;

  function seal(path, path2, title, sub) {
    var p2 = path2 ? '<path d="' + path2 + '"/>' : '';
    return '<div class="seal">' +
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#1e4f8f" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + path + '"/>' + p2 + '</svg>' +
      '<div class="seal__txt"><strong>' + title + '</strong><span>' + sub + '</span></div></div>';
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

  function trustHTML() {
    return '<img src="images/selos/leilao-seguro.png" alt="Leilão Seguro" width="260" height="44" loading="lazy" decoding="async">' +
      '<img src="images/selos/ssl-site-seguro.png" alt="SSL — Certificado Site Seguro" width="198" height="88" loading="lazy" decoding="async">';
  }

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

  function footerHTML() {
    return '<section class="trustbar" aria-label="Selos de segurança"><div class="container trustbar__inner">' +
      '<span class="trustbar__label">Ambiente seguro e verificado</span>' + trustHTML() + '</div></section>' +
      '<footer class="footer"><div class="container footer__grid">' +
      '<div class="footer__col"><a class="brand brand--light" href="index.html">' + LOGO_LIGHT + '</a>' +
      '<p class="footer__muted">Leilões online com transparência e procedência.</p>' +
      '<div class="footer__trust">' + trustHTML() + '</div></div>' +
      '<div class="footer__col"><h4>Localização</h4>' +
      '<p class="footer__muted">Av. Exemplo, 1000 — Centro<br>Sua Cidade — UF, 00000-000</p>' +
      '<h4>Horário</h4><p class="footer__muted">Seg. a sex., das 8h às 18h</p></div>' +
      '<div class="footer__col"><h4>Contato</h4><p class="footer__muted">' +
      '<a href="mailto:contato@leilaooficial.exemplo">contato@leilaooficial.exemplo</a><br>' +
      '<a href="tel:+550000000000">(41) 0000-0000</a><br>' +
      '<a href="contato.html">WhatsApp (41) 00000-0000</a></p></div>' +
      '<div class="footer__col"><h4>Informações</h4><ul class="footer__links">' +
      '<li><a href="sobre.html">Quem somos</a></li>' +
      '<li><a href="como-funciona.html">Como funciona</a></li>' +
      '<li><a href="edital.html">Edital</a></li>' +
      '<li><a href="#">Política de privacidade</a></li>' +
      '<li><a href="#">Termos de uso</a></li></ul></div></div>' +
      '<div class="container"><div class="seals">' +
        seal('M12 2l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V5l7-3z', 'M9 12l2 2 4-4', 'SSL Seguro', 'Conexão criptografada') +
        seal('M6 10V8a6 6 0 0 1 12 0v2 M5 10h14v10H5z', '', 'Dados protegidos', 'Criptografia de ponta a ponta') +
        seal('M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8z', '', 'Leilão verificado', 'Lotes com laudo e procedência') +
        seal('M20 6L9 17l-5-5', '', 'Compra protegida', 'Acompanhamento do início ao fim') +
      '</div></div>' +
      '<div class="footer__bottom"><div class="container">' +
      '<p>© <span id="year"></span> Leilão Oficial. Todos os direitos reservados. · <a href="admin-login.html">Área administrativa</a></p>' +
      '</div></div></footer>' +
      '<a class="whatsapp" href="contato.html" aria-label="Falar no WhatsApp">' +
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

    setTimeout(function () {
      var els = [].slice.call(document.querySelectorAll('.event,.step,.trust,.auction-block,.finder__card,.seal'));
      els.forEach(function (el) { el.classList.add('reveal'); });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      els.forEach(function (el) { io.observe(el); });

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

  function init() {
    mount('site-header', headerHTML());
    mount('site-footer', footerHTML());
    fillSponsors();
    wire();
    effects();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
