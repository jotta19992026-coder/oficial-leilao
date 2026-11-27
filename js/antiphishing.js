// Leilão Oficial — proteção anti-phishing.
// Roda o mais cedo possível (head), antes de qualquer JS de autenticação.
(function () {
  'use strict';

  // Domínios confiáveis do site (regex; adicione mais ao implantar em domínio próprio).
  var TRUSTED = [
    /^localhost$/,
    /^127\.0\.0\.1$/,
    /^[a-z0-9-]+\.vercel\.app$/,
    /^leilaooficial\.com\.br$/,
    /^www\.leilaooficial\.com\.br$/
  ];

  // URL esperada do backend Supabase (imutável após o deploy).
  var EXPECTED_SUPA_HOST = 'srxtmyhcfncscjvyibhg.supabase.co';

  var host = (location.hostname || '').toLowerCase().replace(/\.$/, '');
  var proto = location.protocol;
  var isLocal = /^(localhost|127\.0\.0\.1|::1)$/.test(host);

  // 1. Verificação de domínio --------------------------------------------------
  var trusted = TRUSTED.some(function (re) { return re.test(host); });
  if (!trusted) {
    document.addEventListener('DOMContentLoaded', showPhishingWarning);
  }

  // 2. Verificação HTTPS -------------------------------------------------------
  if (!isLocal && proto !== 'https:') {
    location.replace('https:' + location.href.slice(proto.length));
  }

  // 3. Detecção de iframe (clickjacking) ----------------------------------------
  if (window.self !== window.top) {
    try { window.top.location.replace(location.href); } catch (e) {}
    document.addEventListener('DOMContentLoaded', function () {
      document.body.style.visibility = 'hidden';
    });
  }

  // 4. Verificação de integridade do backend (após scripts carregarem) ----------
  window.addEventListener('load', function () {
    // Confirma que NLSupa aponta para o host correto.
    var supa = window.NLSupa;
    if (supa && supa.supabaseUrl) {
      try {
        var supaHost = new URL(supa.supabaseUrl).hostname;
        if (supaHost !== EXPECTED_SUPA_HOST) {
          console.error('[NL-APF] Backend URL inesperado:', supaHost);
          showPhishingWarning();
        }
      } catch (e) {}
    }

    // Injeta selo de confiança em páginas sensíveis (login e dar lance).
    var isLoginPage = /\/(login|cadastro)(\.html)?(\?|$)/.test(location.pathname + location.search);
    var isBidPage = /\/(lote)(\.html)?(\?|$)/.test(location.pathname);
    if (isLoginPage || isBidPage) {
      injectTrustBadge(isLoginPage ? 'login' : 'bid');
    }
  });

  // 5. Exibe aviso bloqueante em caso de domínio suspeito ----------------------
  function showPhishingWarning() {
    var overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:999999',
      'background:#fff', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'padding:2rem', 'font-family:Inter,system-ui,sans-serif',
      'text-align:center'
    ].join(';');

    overlay.innerHTML = [
      '<svg style="width:64px;height:64px;margin-bottom:1rem" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" stroke-width="2" aria-hidden="true">',
        '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        '<line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      '</svg>',
      '<h1 style="color:#d32f2f;font-size:1.4rem;margin:0 0 .6rem">Atenção: site suspeito</h1>',
      '<p style="max-width:420px;color:#333;margin:0 0 1rem;font-size:.95rem">',
        'Este endereço (<strong>' + escHtml(host) + '</strong>) não é o site oficial da ',
        '<strong>Leilão Oficial</strong>. Nunca informe seu e-mail ou senha nesta página.',
      '</p>',
      '<p style="max-width:420px;color:#555;font-size:.88rem;margin:0 0 1.4rem">',
        'Acesse sempre o site pela URL oficial e verifique o cadeado HTTPS na barra do navegador.',
      '</p>',
      '<p style="font-size:.8rem;color:#999;margin:0">',
        'Se chegou aqui por um link suspeito, feche esta aba imediatamente.',
      '</p>'
    ].join('');

    document.body ? document.body.appendChild(overlay)
      : document.addEventListener('DOMContentLoaded', function () {
          document.body.appendChild(overlay);
        });
  }

  // 6. Injeta selo de autenticidade em formulários sensíveis -------------------
  function injectTrustBadge(ctx) {
    var container;
    if (ctx === 'login') {
      container = document.querySelector('.authpanel__card, .login__card, [id^="form-login"]');
      if (!container) container = document.querySelector('main, .container');
    } else {
      container = document.querySelector('.bidbox');
    }
    if (!container) return;

    var badge = document.createElement('div');
    badge.className = 'nl-trust-badge';
    badge.setAttribute('aria-label', 'Site verificado — conexão segura');
    badge.innerHTML = [
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">',
        '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      '</svg>',
      '<span>Site oficial verificado · <strong>' + escHtml(location.hostname) + '</strong></span>'
    ].join('');

    // Insere ANTES do formulário para ser visto antes de qualquer entrada.
    container.parentNode ? container.parentNode.insertBefore(badge, container)
      : container.prepend(badge);
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
