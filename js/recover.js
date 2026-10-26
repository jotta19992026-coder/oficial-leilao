// Leilão Oficial — recuperação de senha (Supabase Auth).
// 1) login.html / admin-login.html: "Esqueci minha senha" abre o formulário que envia o e-mail.
// 2) redefinir-senha.html: o link do e-mail abre esta página com a sessão de recuperação; o
//    supabase-js lê o token da URL (detectSessionInUrl) e a pessoa grava a nova senha.
(function () {
  'use strict';

  function qs(id) { return document.getElementById(id); }
  function show(el, text, ok) { el.textContent = text; el.className = 'form__msg ' + (ok ? 'form__msg--ok' : 'form__msg--err'); }

  // ----- Pedido do link (telas de login) -----
  var toggle = qs('forgot-toggle');
  var forgot = qs('form-forgot');
  if (toggle && forgot) {
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      forgot.hidden = !forgot.hidden;
      if (!forgot.hidden) {
        var typed = qs('login-email') || qs('admin-email');
        if (typed && typed.value && !qs('forgot-email').value) qs('forgot-email').value = typed.value;
        qs('forgot-email').focus();
      }
    });
    forgot.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = qs('forgot-msg');
      var submit = forgot.querySelector('[type="submit"]');
      submit.disabled = true;
      window.NLAuth.requestPasswordReset(qs('forgot-email').value).then(function (r) {
        submit.disabled = false;
        if (!r.ok) { show(msg, r.error, false); return; }
        show(msg, 'Se esse e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.', true);
      });
    });
  }

  // ----- Nova senha (página aberta pelo link do e-mail) -----
  var resetForm = qs('form-reset');
  if (!resetForm) return;
  var supa = window.NLSupa;
  var msg = qs('reset-msg');
  var hasSession = false;

  // Erros que o Supabase devolve na URL (link expirado, já usado etc.).
  var params = new URLSearchParams((location.hash || '').replace(/^#/, '') + '&' + location.search.replace(/^\?/, ''));
  var urlError = params.get('error_description') || params.get('error');
  function expired() {
    resetForm.hidden = true;
    qs('reset-expired').hidden = false;
  }
  if (urlError) {
    expired();
    return;
  }

  if (supa) {
    supa.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY' || session) hasSession = true;
    });
  }
  // Dá tempo do supabase-js processar o token da URL; sem sessão, o link é inválido.
  (window.NLAuth ? window.NLAuth.ready : Promise.resolve(null)).then(function () {
    return supa ? supa.auth.getSession() : null;
  }).then(function (r) {
    if (r && r.data && r.data.session) hasSession = true;
    if (!hasSession) expired();
  });

  resetForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var p1 = qs('reset-pass').value, p2 = qs('reset-pass2').value;
    if (p1 !== p2) { show(msg, 'As senhas não coincidem.', false); return; }
    var submit = resetForm.querySelector('[type="submit"]');
    submit.disabled = true;
    window.NLAuth.updatePassword(p1).then(function (r) {
      if (!r.ok) { submit.disabled = false; show(msg, r.error, false); return; }
      show(msg, 'Senha alterada! Redirecionando…', true);
      // Admin volta ao painel; cliente, à página inicial (a sessão já está aberta).
      (window.NLAdmin ? window.NLAdmin.isAdmin() : Promise.resolve(false)).then(function (isAdmin) {
        setTimeout(function () { location.replace(isAdmin ? 'admin.html' : 'index.html'); }, 1200);
      });
    });
  });
})();
