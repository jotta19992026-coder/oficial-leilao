// Leilão Oficial — página inicial: lotes em destaque + seções por categoria.
(function () {
  'use strict';

  var CAT_LABEL = {
    carro:       { label: 'Veículos',    href: 'lotes.html?cat=carro',       promo: 'Recuperados de bancos e financeiras, com documentação em dia e lances 100% online.' },
    moto:        { label: 'Motos',       href: 'lotes.html?cat=moto',         promo: 'Modelos populares e esportivas, com lance inicial acessível.' },
    imovel:      { label: 'Imóveis',     href: 'lotes.html?cat=imovel',       promo: 'Apartamentos, casas e imóveis comerciais disponíveis para arrematação em dezembro.' },
    pesado:      { label: 'Pesados',     href: 'lotes.html?cat=pesado',       promo: 'Caminhões, vans e implementos prontos para arrematar.' },
    nautico:     { label: 'Náuticos',    href: 'lotes.html?cat=nautico',      promo: 'Barcos e embarcações em leilão com documentação regularizada.' },
    equipamento: { label: 'Equipamentos', href: 'lotes.html?cat=equipamento', promo: 'Máquinas e equipamentos industriais e agrícolas.' }
  };

  (window.NLStore ? window.NLStore.ready : Promise.resolve()).then(function () {
    var lots = window.NLStore ? window.NLStore.lots() : (window.NL_LOTS || []);
    var card = window.NLCard;

    var byDate = lots.slice().sort(function (a, b) {
      return window.NL_DATEINFO(a).sortKey - window.NL_DATEINFO(b).sortKey;
    });

    // Próximos leilões
    var events = document.getElementById('upcoming-events');
    if (events && window.NL_EVENT_LIST) {
      events.innerHTML = window.NL_EVENT_LIST(lots, 4, true) ||
        '<p class="empty">Nenhum leilão programado no momento.</p>';
    }

    // Datas do filtro da home
    var dateSel = document.getElementById('finder-date');
    if (dateSel) {
      var seen = {};
      var dates = [];
      lots.forEach(function (l) {
        var di = window.NL_DATEINFO(l);
        if (!seen[di.dm]) { seen[di.dm] = true; dates.push(di); }
      });
      dates.sort(function (a, b) { return a.sortKey - b.sortKey; });
      dates.forEach(function (di) {
        var o = document.createElement('option');
        o.value = di.dm;
        o.textContent = di.dm;
        dateSel.appendChild(o);
      });
    }

    // Lotes em destaque (carrossel)
    var grid = document.getElementById('featured-grid');
    if (grid) grid.innerHTML = byDate.slice(0, 8).map(card).join('');

    // Seções por categoria (apenas categorias com 2+ lotes)
    var catWrap = document.getElementById('cat-sections');
    if (!catWrap) return;

    // Agrupar por categoria
    var groups = {};
    byDate.forEach(function (l) {
      (groups[l.cat] = groups[l.cat] || []).push(l);
    });

    // Ordem de exibição: categorias com mais lotes primeiro
    var catOrder = Object.keys(groups).sort(function (a, b) {
      return groups[b].length - groups[a].length;
    });

    var html = '';
    var alt = false;
    catOrder.forEach(function (cat) {
      var items = groups[cat];
      if (items.length < 2) return; // só exibe categorias com 2+ lotes
      var meta = CAT_LABEL[cat] || { label: cat, icon: '', href: 'lotes.html?cat=' + cat, promo: '' };
      var show = items.slice(0, 4); // mostra até 4 lotes por categoria
      var total = items.length;

      html += '<section class="section' + (alt ? ' section--alt' : '') + '" id="cat-' + cat + '">' +
        '<div class="container">' +
        '<div class="section__head">' +
        '<h2>' + meta.label + '</h2>' +
        '<a class="link" href="' + meta.href + '">Ver todos (' + total + ') →</a>' +
        '</div>';

      if (meta.promo) {
        html += '<p class="cat-section__sub">' + meta.promo + '</p>';
      }

      html += '<div class="lot-grid lot-grid--4">' + show.map(card).join('') + '</div>';

      if (total > 4) {
        html += '<div style="text-align:center;margin-top:1.5rem">' +
          '<a class="btn btn--ghost" href="' + meta.href + '">Ver mais ' + meta.label.toLowerCase() + ' (' + (total - 4) + ' restantes) →</a>' +
          '</div>';
      }

      html += '</div></section>';
      alt = !alt;
    });

    catWrap.innerHTML = html;
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
