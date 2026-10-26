// Leilão Oficial — formulários de login, cadastro, contato e área da conta.
(function () {
  'use strict';

  function qs(id) { return document.getElementById(id); }
  function nextParam() { return new URLSearchParams(location.search).get('next') || 'minha-conta.html'; }

  // ----- Login -----
  var loginForm = qs('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = qs('login-msg');
      var submit = loginForm.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      window.NLAuth.login(qs('login-email').value, qs('login-pass').value).then(function (r) {
        if (r.ok) { location.href = nextParam(); return; }
        if (submit) submit.disabled = false;
        msg.textContent = r.error; msg.className = 'form__msg form__msg--err';
      });
    });
  }

  // ----- Cadastro -----
  var signForm = qs('form-signup');
  if (signForm) {
    signForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = qs('signup-msg');
      if (qs('signup-pass').value !== qs('signup-pass2').value) {
        msg.textContent = 'As senhas não coincidem.'; msg.className = 'form__msg form__msg--err'; return;
      }
      var submit = signForm.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      var extra = {
        cpf: qs('signup-cpf') ? qs('signup-cpf').value : '',
        phone: qs('signup-phone') ? qs('signup-phone').value : '',
        address: qs('signup-address') ? qs('signup-address').value : ''
      };
      window.NLAuth.signup(qs('signup-name').value, qs('signup-email').value, qs('signup-pass').value, extra).then(function (r) {
        // Cadastro concluído: o cliente já entra logado e vai direto para a página inicial.
        if (r.ok && !r.needsConfirm) { location.href = 'index.html'; return; }
        if (submit) submit.disabled = false;
        if (r.ok) {
          signForm.reset();
          msg.textContent = 'Conta criada! Enviamos um link de confirmação para o seu e-mail; confirme para entrar.';
          msg.className = 'form__msg form__msg--ok';
        } else { msg.textContent = r.error; msg.className = 'form__msg form__msg--err'; }
      });
    });
  }

  // ----- Contato -----
  var contactForm = qs('form-contact');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = qs('contact-msg');
      msg.textContent = 'Mensagem enviada. Nossa equipe entrará em contato em breve.';
      msg.className = 'form__msg form__msg--ok';
      contactForm.reset();
    });
  }

  // ----- Área da conta (protegida) -----
  var account = qs('account');
  if (account) {
    if (!window.NLAuth.requireAuth('login.html?next=minha-conta.html')) return;
    var u = window.NLAuth.current();
    var nameEl = qs('account-name');
    var emailEl = qs('account-email');
    if (nameEl) nameEl.textContent = u.name;
    if (emailEl) emailEl.textContent = u.email;
  }
})();
