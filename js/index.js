// Leilão Oficial — página inicial: lotes em destaque + seções por leilão (ordem cronológica).
(function () {
  'use strict';
  // Renderiza depois que os lotes chegam do Supabase (ou do catálogo local, se offline).
  (window.NLStore ? window.NLStore.ready : Promise.resolve()).then(function () {
    var lots = window.NLStore ? window.NLStore.lots() : (window.NL_LOTS || []);
    var card = window.NLCard;

    // Ordem cronológica por data do leilão
    var byDate = lots.slice().sort(function (a, b) {
      return window.NL_DATEINFO(a).sortKey - window.NL_DATEINFO(b).sortKey;
    });

    // Lotes em destaque (carrossel)
    var grid = document.getElementById('featured-grid');
    if (grid) grid.innerHTML = byDate.slice(0, 8).map(card).join('');

    // Seções por leilão, blocos em ordem cronológica
    var wrap = document.getElementById('auction-sections');
    if (wrap) {
      var groups = {};
      byDate.forEach(function (l) { (groups[l.auction] = groups[l.auction] || []).push(l); });
      var names = Object.keys(groups).sort(function (a, b) {
        return window.NL_DATEINFO(groups[a][0]).sortKey - window.NL_DATEINFO(groups[b][0]).sortKey;
      });
      wrap.innerHTML = names.map(function (name) {
        var di = window.NL_DATEINFO(groups[name][0]);
        var type = name.replace(/\s*—.*$/, '');
        return '<div class="auction-block"><div class="auction-block__head">' +
          '<div class="auction-block__when"><h3>' + di.weekday + ' · ' + di.date + '</h3>' +
          '<span class="auction-block__type">' + type + '</span></div>' +
          '<a class="link" href="lotes.html">Ver todos os itens →</a></div>' +
          '<div class="auction-row">' + groups[name].map(card).join('') + '</div></div>';
      }).join('');
    }

    if (window.NLTimers) window.NLTimers.scan();
  });
})();

// Painel de login/cadastro na página inicial
(function () {
  'use strict';
  var panel = document.getElementById('authpanel');
  if (!panel || !window.NLAuth) return;

  var u = window.NLAuth.current();
  if (u) {
    document.getElementById('authpanel-forms').innerHTML =
      '<div class="authpanel__card authpanel__welcome"><h3>Olá, ' + u.name + '!</h3>' +
      '<p class="muted">Você já está conectado.</p>' +
      '<a class="btn btn--primary btn--block" href="minha-conta.html">Ir para Minha conta</a>' +
      '<a class="btn btn--ghost btn--block" href="#" id="home-logout" style="margin-top:.6rem">Sair</a></div>';
    document.getElementById('home-logout').addEventListener('click', function (e) {
      e.preventDefault(); window.NLAuth.logout().then(function () { location.reload(); });
    });
    return;
  }

  document.getElementById('home-login').addEventListener('submit', function (e) {
    e.preventDefault();
    var m = document.getElementById('hl-msg');
    window.NLAuth.login(document.getElementById('hl-email').value, document.getElementById('hl-pass').value).then(function (r) {
      if (r.ok) location.href = 'minha-conta.html';
      else { m.textContent = r.error; m.className = 'form__msg form__msg--err'; }
    });
  });

  document.getElementById('home-signup').addEventListener('submit', function (e) {
    e.preventDefault();
    var m = document.getElementById('hs-msg');
    window.NLAuth.signup(document.getElementById('hs-name').value, document.getElementById('hs-email').value, document.getElementById('hs-pass').value).then(function (r) {
      if (r.ok && r.needsConfirm) { m.textContent = 'Conta criada! Confirme pelo link enviado ao seu e-mail para entrar.'; m.className = 'form__msg form__msg--ok'; }
      else if (r.ok) location.href = 'minha-conta.html';
      else { m.textContent = r.error; m.className = 'form__msg form__msg--err'; }
    });
  });
})();
