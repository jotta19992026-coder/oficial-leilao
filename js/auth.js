// Leilão Oficial — autenticação via Supabase Auth (e-mail e senha).
// current() continua síncrono: lê a sessão que o supabase-js guarda no localStorage e é
// atualizado por onAuthStateChange. login/signup/logout devolvem Promise<{ ok, error }>.
(function () {
  'use strict';

  var supa = window.NLSupa;
  var cfg = window.NL_SUPABASE || {};

  function toUser(u) {
    if (!u || !u.email) return null;
    var meta = u.user_metadata || {};
    return { id: u.id, email: u.email, name: (meta.name || '').trim() || u.email.split('@')[0] };
  }

  // Sessão salva (sincronamente) para o primeiro desenho da página.
  var cached = null;
  try {
    var raw = JSON.parse(localStorage.getItem(cfg.storageKey) || 'null');
    var sess = raw && (raw.currentSession || raw);
    if (sess && sess.user && (!sess.expires_at || sess.expires_at * 1000 > Date.now() || sess.refresh_token)) {
      cached = toUser(sess.user);
    }
  } catch (e) {}

  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(cached); } catch (e) {} }); }

  var ready = supa
    ? supa.auth.getSession().then(function (r) {
        cached = toUser(r.data && r.data.session && r.data.session.user);
        return cached;
      }, function () { return cached; })
    : Promise.resolve(null);

  if (supa) {
    supa.auth.onAuthStateChange(function (_event, session) {
      var next = toUser(session && session.user);
      var changed = (next && next.email) !== (cached && cached.email);
      cached = next;
      if (changed) emit();
    });
  }

  // Mensagens do Supabase Auth em português.
  function msg(err) {
    var m = (err && (err.message || err.error_description)) || '';
    if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    if (/already registered|already exists/i.test(m)) return 'Já existe uma conta com esse e-mail.';
    if (/password should be at least/i.test(m)) return 'A senha deve ter ao menos 6 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    if (/failed to fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique sua internet.';
    return m || 'Não foi possível concluir. Tente novamente.';
  }
  // CPF com dígitos verificadores (aceita com ou sem pontuação).
  function validCPF(v) {
    var c = String(v || '').replace(/\D/g, '');
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    for (var t = 9; t < 11; t++) {
      var sum = 0;
      for (var i = 0; i < t; i++) sum += Number(c[i]) * (t + 1 - i);
      if (((sum * 10) % 11) % 10 !== Number(c[t])) return false;
    }
    return true;
  }
  function fmtCPF(c) { return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); }

  function offline() { return Promise.resolve({ ok: false, error: 'Serviço de contas indisponível no momento.' }); }

  var NLAuth = {
    ready: ready,
    current: function () { return cached; },
    // Perfil completo do usuário logado (nome, CPF, telefone, endereço), lido do banco.
    profile: function () {
      if (!supa || !cached) return Promise.resolve(null);
      return supa.from('profiles').select('name,email,cpf,phone,address').eq('id', cached.id).maybeSingle()
        .then(function (r) { return r.error ? null : r.data; }, function () { return null; });
    },
    onChange: function (fn) { listeners.push(fn); },

    // extra (opcional): { cpf, phone, address } — vão para user_metadata e o gatilho do banco copia para profiles.
    signup: function (name, email, password, extra) {
      name = (name || '').trim();
      email = (email || '').trim().toLowerCase();
      var data = { name: name };
      if (!name) return Promise.resolve({ ok: false, error: 'Informe seu nome.' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Promise.resolve({ ok: false, error: 'E-mail inválido.' });
      if (extra) {
        var cpf = String(extra.cpf || '').replace(/\D/g, '');
        var phone = String(extra.phone || '').replace(/\D/g, '');
        if (!validCPF(cpf)) return Promise.resolve({ ok: false, error: 'CPF inválido.' });
        if (phone.length < 10 || phone.length > 11) return Promise.resolve({ ok: false, error: 'Informe um telefone com DDD.' });
        data.cpf = fmtCPF(cpf);
        data.phone = phone.length === 11
          ? phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
          : phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        data.address = String(extra.address || '').trim();
      }
      if ((password || '').length < 6) return Promise.resolve({ ok: false, error: 'A senha deve ter ao menos 6 caracteres.' });
      if (!supa) return offline();
      return supa.auth.signUp({ email: email, password: password, options: { data: data } })
        .then(function (r) {
          if (r.error) return { ok: false, error: msg(r.error) };
          // Com confirmação de e-mail ligada, o Supabase não devolve sessão (e não revela se o
          // e-mail já existia): a conta só entra depois do clique no link.
          if (!r.data.session) return { ok: true, needsConfirm: true };
          cached = toUser(r.data.user);
          return { ok: true };
        }, function (e) { return { ok: false, error: msg(e) }; });
    },

    login: function (email, password) {
      email = (email || '').trim().toLowerCase();
      if (!email || !password) return Promise.resolve({ ok: false, error: 'Informe e-mail e senha.' });
      if (!supa) return offline();
      return supa.auth.signInWithPassword({ email: email, password: password })
        .then(function (r) {
          if (r.error) return { ok: false, error: msg(r.error) };
          cached = toUser(r.data.user);
          return { ok: true };
        }, function (e) { return { ok: false, error: msg(e) }; });
    },

    // Envia o e-mail com o link de redefinição. A resposta é sempre a mesma, exista ou não a conta
    // (não revelar quais e-mails estão cadastrados). redirectTo precisa estar em
    // Authentication > URL Configuration > Redirect URLs, senão o Supabase usa o Site URL.
    requestPasswordReset: function (email) {
      email = (email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Promise.resolve({ ok: false, error: 'Informe um e-mail válido.' });
      if (!supa) return offline();
      // Mantém o formato das URLs da página atual (/login no deploy com cleanUrls, login.html local).
      var page = /\.html$/.test(location.pathname) ? 'redefinir-senha.html' : 'redefinir-senha';
      var redirectTo = location.origin + location.pathname.replace(/[^/]*$/, '') + page;
      return supa.auth.resetPasswordForEmail(email, { redirectTo: redirectTo })
        .then(function (r) {
          if (r.error && /rate limit|too many|seconds/i.test(r.error.message || '')) return { ok: false, error: msg(r.error) };
          if (r.error && /failed to fetch|network/i.test(r.error.message || '')) return { ok: false, error: msg(r.error) };
          return { ok: true };
        }, function (e) { return { ok: false, error: msg(e) }; });
    },

    // Troca a senha da sessão aberta pelo link do e-mail (evento PASSWORD_RECOVERY).
    updatePassword: function (password) {
      if ((password || '').length < 6) return Promise.resolve({ ok: false, error: 'A senha deve ter ao menos 6 caracteres.' });
      if (!supa) return offline();
      return supa.auth.updateUser({ password: password }).then(function (r) {
        if (r.error) {
          if (/different from the old|same password/i.test(r.error.message || '')) return { ok: false, error: 'A nova senha precisa ser diferente da anterior.' };
          if (/session|jwt|not authenticated/i.test(r.error.message || '')) return { ok: false, error: 'O link expirou ou já foi usado. Peça um novo e-mail de recuperação.' };
          return { ok: false, error: msg(r.error) };
        }
        return { ok: true };
      }, function (e) { return { ok: false, error: msg(e) }; });
    },

    logout: function () {
      cached = null;
      return supa ? supa.auth.signOut().catch(function () {}) : Promise.resolve();
    },

    // Protege páginas que exigem login (decide pela sessão salva; ready confirma depois).
    requireAuth: function (redirect) {
      var to = redirect || 'login.html';
      if (!cached) { location.href = to; return false; }
      ready.then(function (u) { if (!u) location.href = to; });
      return true;
    }
  };

  window.NLAuth = NLAuth;

  // ---- Admin: conta comum do Supabase com profiles.role = 'admin' ----
  function checkAdmin() {
    if (!supa) return Promise.resolve(false);
    return supa.rpc('is_admin').then(function (r) { return !r.error && r.data === true; }, function () { return false; });
  }

  window.NLAdmin = {
    login: function (email, password) {
      return NLAuth.login(email, password).then(function (r) {
        if (!r.ok) return r;
        return checkAdmin().then(function (isAdmin) {
          if (isAdmin) return { ok: true };
          return NLAuth.logout().then(function () {
            return { ok: false, error: 'Esta conta não tem permissão de administrador.' };
          });
        });
      });
    },
    isAdmin: checkAdmin,
    logout: function () { return NLAuth.logout(); },
    // Promise<boolean>: confirma a permissão no banco; sem ela, volta para o login do admin.
    require: function () {
      return ready.then(function (u) { return u ? checkAdmin() : false; }).then(function (ok) {
        if (!ok) location.replace('admin-login.html');
        return ok;
      });
    }
  };
})();
