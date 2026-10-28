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
  // Foto do documento (opcional): redimensiona no navegador e envia ao bucket PRIVADO
  // user-docs (RG/CNH só podem ser vistos pelo dono da conta e pelo admin, migração 005).
  function readImageScaled(file, maxW, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxW / img.width);
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) { cb(blob); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { cb(null); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function sendDoc(file) {
    var supa = window.NLSupa;
    var u = window.NLAuth.current();
    if (!supa || !u) return Promise.reject(new Error('Sessão não encontrada.'));
    return new Promise(function (resolve) { readImageScaled(file, 1400, resolve); }).then(function (blob) {
      if (!blob) throw new Error('Não foi possível ler a imagem.');
      var path = u.id + '/doc-' + Date.now() + '.jpg';
      return supa.storage.from('user-docs').upload(path, blob, { contentType: 'image/jpeg' })
        .then(function (r) { if (r.error) throw r.error; return path; });
    }).then(function (path) {
      return supa.rpc('user_set_doc_url', { p_doc_url: path })
        .then(function (r) { if (r.error) throw r.error; return path; });
    });
  }
  var signForm = qs('form-signup');
  if (signForm) {
    signForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = qs('signup-msg');
      // Declaração de veracidade: vem marcada por padrão; se o usuário desmarcar, não deixa criar.
      var decl = qs('signup-decl');
      if (decl && !decl.checked) {
        msg.textContent = 'Marque a declaração de que as informações são verdadeiras para criar a conta.';
        msg.className = 'form__msg form__msg--err'; return;
      }
      if (qs('signup-pass').value !== qs('signup-pass2').value) {
        msg.textContent = 'As senhas não coincidem.'; msg.className = 'form__msg form__msg--err'; return;
      }
      var submit = signForm.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      var docInput = qs('signup-doc');
      var docFile = docInput && docInput.files && docInput.files[0];
      var extra = {
        cpf: qs('signup-cpf') ? qs('signup-cpf').value : '',
        phone: qs('signup-phone') ? qs('signup-phone').value : '',
        address: qs('signup-address') ? qs('signup-address').value : ''
      };
      window.NLAuth.signup(qs('signup-name').value, qs('signup-email').value, qs('signup-pass').value, extra).then(function (r) {
        // Cadastro concluído (sessão ativa): envia o documento se houver — é opcional,
        // então qualquer falha no envio NÃO desfaz o cadastro.
        if (r.ok && !r.needsConfirm) {
          if (!docFile) { location.href = 'index.html'; return; }
          msg.textContent = 'Conta criada! Enviando a foto do documento…';
          msg.className = 'form__msg';
          sendDoc(docFile).then(function () {
            location.href = 'index.html';
          }, function () {
            msg.textContent = 'Conta criada! Só não conseguimos enviar a foto do documento agora — pode enviar depois pela conta ou pelo contato.';
            msg.className = 'form__msg form__msg--ok';
            setTimeout(function () { location.href = 'index.html'; }, 2600);
          });
          return;
        }
        if (submit) submit.disabled = false;
        if (r.ok) {
          signForm.reset();
          msg.textContent = 'Conta criada! Enviamos um link de confirmação para o seu e-mail; confirme para entrar.' +
            (docFile ? ' A foto do documento (opcional) poderá ser enviada depois de confirmar.' : '');
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
