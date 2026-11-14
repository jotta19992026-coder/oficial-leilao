// Leilão Oficial — simulador de lances do painel administrativo.
// Cria arrematantes fictícios que dão lances automáticos nos lotes do catálogo, para TESTAR
// o painel: KPIs, "Arremates por data", Clientes, CSV e geração de contrato. Dois escopos:
// "Automático" (até 10 lotes abertos por vez) e "Todos os lotes" (catálogo inteiro, incluindo
// encerrados, coberto em rajadas de ~12 lotes por ciclo).
// Os dados vivem só neste navegador (localStorage); NADA é gravado no Supabase. As páginas
// públicas leem esse registro e mostram os lances fictícios neste MESMO navegador — visitantes
// reais em outros dispositivos não veem nada inventado (lance inventado exibido a arrematante
// real é fraude — lance de reserva), e o lance real sempre vence quando for maior.
(function () {
  'use strict';

  var KEY = 'nl_sim_v1';
  var MAX_BIDS = 600;
  var FIRST = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gisele', 'Heitor', 'Ivone', 'João',
    'Karina', 'Lucas', 'Marina', 'Nelson', 'Olívia', 'Paulo', 'Renata', 'Sérgio', 'Tainá', 'Vitor'];
  var LAST = ['Souza', 'Lima', 'Rocha', 'Alves', 'Prado', 'Nunes', 'Melo', 'Barros', 'Cardoso', 'Freitas',
    'Gomes', 'Martins', 'Pereira', 'Ribeiro', 'Santos', 'Vieira'];
  var STREETS = [
    ['Rua das Acácias', 'Mogi das Cruzes/SP'], ['Av. Brasil', 'Suzano/SP'], ['Rua Ipiranga', 'Poá/SP'],
    ['Rua Catingueiro', 'Itaquaquecetuba/SP'], ['Av. Salma Torres', 'Guarulhos/SP'], ['Rua Zulmira', 'Arujá/SP'],
    ['Rua Lacerda Franco', 'Salesópolis/SP'], ['Av. Miguel Ignácio Curi', 'São Paulo/SP'],
    ['Rua Tuiuti', 'São Paulo/SP'], ['Av. Vereador Moisés Fernandes', 'Ferraz de Vasconcelos/SP']
  ];

  var wired = false;      // painel do simulador presente no HTML
  var ready = false;      // admin confirmado; pode chamar o render do painel
  var poke = null;        // callback de re-render (throttled)
  var timer = null;       // agendador de lances (encadeado)
  var statusTimer = null;
  var lastPoke = 0;
  var state = load();

  // ------------------------------------------------------------------
  // Estado persistido (localStorage): nada disso vai ao banco.
  // ------------------------------------------------------------------
  function freshState() {
    return { on: false, cfg: { n: 6, iv: 10, scope: 'all' }, bidders: [], lots: {}, leaders: {}, bids: [], seq: 0 };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.cfg && typeof s.cfg.iv === 'number' && Array.isArray(s.bids) && Array.isArray(s.bidders)) {
        s.on = !!s.on;
        s.lots = s.lots || {};
        s.leaders = s.leaders || {};
        s.seq = s.seq || 0;
        return s;
      }
    } catch (e) {}
    return freshState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function prune() {
    // No modo "todos os lotes" a cobertura do catálogo é mantida — lotes encerrados
    // continuam com seu histórico fictício até o dono limpar a simulação. No
    // "automático", lotes fechados há mais de 3 dias saem para não inflar o storage.
    if (state.cfg.scope === 'all') { capBids(); return; }
    var cutoff = Date.now() - 3 * 86400000; // lotes fechados há mais de 3 dias saem da simulação
    Object.keys(state.lots).forEach(function (id) {
      if ((state.lots[id].endsAt || 0) < cutoff) { delete state.lots[id]; delete state.leaders[id]; }
    });
    capBids();
  }
  function capBids() {
    if (state.bids.length > MAX_BIDS) state.bids = state.bids.slice(-MAX_BIDS);
  }

  // ------------------------------------------------------------------
  // Arrematantes fictícios (identidades inventadas, nunca vão ao banco).
  // ------------------------------------------------------------------
  function checkDigit(d) {
    var w = d.length + 1, s = 0;
    for (var i = 0; i < d.length; i++) s += d[i] * (w - i);
    var r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  }
  // CPF com dígitos verificadores válidos (formato correto para testar máscaras/contrato).
  function genCpf() {
    var d = [];
    for (var i = 0; i < 9; i++) d.push(Math.floor(Math.random() * 10));
    var d1 = checkDigit(d);
    var d2 = checkDigit(d.concat([d1]));
    return d.join('') + d1 + d2;
  }
  function genPhone() {
    function four() { return String(Math.floor(Math.random() * 9000) + 1000); }
    return '(11) 9' + four() + '-' + four();
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function makeBidder(i, name) {
    var now = Date.now();
    var slug = String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
    var st = pick(STREETS);
    return {
      id: 'sim-' + (i + 1),
      name: name,
      email: slug + (i + 1) + '@arrematante-teste.local',
      cpf: genCpf(),
      phone: genPhone(),
      address: st[0] + ', ' + (10 + Math.floor(Math.random() * 3800)) + ' — ' + st[1],
      role: 'user',
      sim: true,
      created_at: new Date(now - (i * 3 + 2) * 86400000 - Math.floor(Math.random() * 86400000)).toISOString(),
      last_sign_in_at: new Date(now - Math.floor(Math.random() * 5 * 3600000)).toISOString(),
      bid_count: 0, max_bid: null, leading_lots: 0
    };
  }
  function topUpBidders() {
    var used = {};
    state.bidders.forEach(function (b) { used[b.name] = 1; });
    while (state.bidders.length < state.cfg.n) {
      var name, k = 0;
      do {
        name = pick(FIRST) + ' ' + pick(LAST);
        if (++k > 40) name += ' ' + pick(LAST);
      } while (used[name]);
      used[name] = 1;
      state.bidders.push(makeBidder(state.bidders.length, name));
    }
  }
  function simClients() {
    var leadCount = {};
    Object.keys(state.leaders).forEach(function (id) {
      var uid = state.leaders[id].user_id;
      leadCount[uid] = (leadCount[uid] || 0) + 1;
    });
    return state.bidders.map(function (b) {
      var c = {};
      for (var k in b) c[k] = b[k];
      c.leading_lots = leadCount[b.id] || 0;
      return c;
    });
  }
  function isSimUser(userId) { return /^sim-\d+$/.test(String(userId || '')); }

  // ------------------------------------------------------------------
  // Lotes publicados (lidos do Supabase, só leitura) para o motor escolher.
  // withClosed: inclui também os já encerrados (modo "todos os lotes").
  // ------------------------------------------------------------------
  function openLots(withClosed) {
    var supa = window.NLSupa;
    if (!supa) return Promise.resolve([]);
    return supa.from('lots')
      .select('id,n,title,price,current_price,increment,ends_at,status,auction_label')
      .eq('status', 'published').not('ends_at', 'is', null)
      .then(function (r) {
        if (r.error || !r.data) return [];
        var now = Date.now();
        return r.data.filter(function (l) { return withClosed || Date.parse(l.ends_at) > now; }).map(function (l) {
          var base = Number(l.price) || 0;
          return {
            id: Number(l.id), n: l.n, title: l.title, auction: l.auction_label || '', status: l.status,
            basePrice: base,
            price: l.current_price != null ? Number(l.current_price) : base,
            increment: Number(l.increment) || Math.max(100, Math.round(base * 0.01 / 100) * 100),
            endsAt: Date.parse(l.ends_at)
          };
        });
      }, function () { return []; });
  }

  // ------------------------------------------------------------------
  // Motor de lances: 1 lance fictício a cada ~intervalo (com variação natural).
  // ------------------------------------------------------------------
  function schedule() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!state.on) return;
    timer = setTimeout(tick, state.cfg.iv * 1000 * (0.7 + Math.random() * 0.8));
  }
  function tick() {
    timer = null;
    if (!state.on) return;
    if (document.hidden) { schedule(); return; }
    var allScope = state.cfg.scope === 'all';
    openLots(allScope).then(function (open) {
      if (state.on && open.length) {
        try {
          if (allScope) {
            // Modo "todos os lotes": semeia em rajada os lotes que ainda não têm lance
            // fictício — o catálogo inteiro fica coberto em poucos ciclos.
            var untouched = open.filter(function (l) { return !state.lots[l.id]; });
            var burst = untouched.slice(0, 12);
            burst.forEach(function (l) { try { simBid(l); } catch (e) { /* segue */ } });
            // Catálogo inteiro coberto: volta às disputas normais (65% continuam uma guerra).
            if (!burst.length) { try { simBid(pickLot(open)); } catch (e) { /* segue */ } }
          } else {
            try { simBid(pickLot(open)); } catch (e) { /* segue */ }
          }
        } catch (e) { /* um lance que falhar não pode parar o motor */ }
        // Persistência e re-render UMA vez por ciclo (não por lance).
        prune(); save(); status(); pokeRender();
      }
      schedule();
    }, function () { schedule(); });
  }

  // Escolhe o próximo lote a receber um lance fictício.
  function pickLot(open) {
    // Só entram lotes que ainda têm espaço até o teto de 70% acima do valor do
    // produto (o preço inicial). Lote no teto sai da disputa até ser limpo.
    var room = open.filter(function (l) {
      var m = state.lots[l.id];
      var s = state.leaders[l.id];
      var cur = s ? (Number(s.amount) || 0) : (Number(l.price) || 0);
      var cap = capFor(m ? m.basePrice : l.basePrice, m ? m.increment : l.increment);
      return !cap || cur < cap;
    });
    if (!room.length) return null;

    var openIds = {};
    room.forEach(function (l) { openIds[l.id] = l; });

    // Lotes em disputa: no automático, no máximo 10 abertos por vez.
    var warring = Object.keys(state.lots).map(Number).filter(function (id) { return openIds[id]; });
    var pool = room;
    if (state.cfg.scope === 'auto') {
      var limit = Math.min(10, room.length);
      var chosen = warring.slice(0, limit);
      var fresh = room.filter(function (l) { return !state.lots[l.id]; });
      while (chosen.length < limit && fresh.length) {
        chosen.push(fresh.splice(Math.floor(Math.random() * fresh.length), 1)[0]);
      }
      pool = chosen;
    }
    if (!pool.length) return null;
    // 65% das vezes continua uma disputa já aberta (cria batalhas de lances).
    var lot = (warring.length && Math.random() < 0.65)
      ? openIds[warring[Math.floor(Math.random() * warring.length)]]
      : pool[Math.floor(Math.random() * pool.length)];
    return lot;
  }

  // Teto dos lances fictícios: no máximo 70% acima do valor do produto, que aqui
  // é o preço inicial do lote (é o único "valor do produto" que existe no banco;
  // os preços do catálogo são estimativas). O teto é alinhado ao incremento para
  // os valores continuarem redondos (ex.: 16.000 com passo 600 → teto 26.800).
  var MAX_OVER = 0.7;
  function capFor(base, step) {
    base = Number(base) || 0;
    step = Number(step) || 100;
    if (!base) return 0;
    return base + Math.floor(((base * 7) / 10) / step) * step;
  }

  // Registra 1 lance fictício em um lote (persistência/render ficam com quem chama).
  function simBid(lot) {
    if (!lot) return;

    var meta = state.lots[lot.id];
    if (!meta) {
      meta = state.lots[lot.id] = {
        id: lot.id, n: lot.n, title: lot.title, auction: lot.auction, endsAt: lot.endsAt,
        basePrice: lot.basePrice, increment: lot.increment, price: 0, simBids: 0
      };
    }
    meta.endsAt = lot.endsAt; // prazo real, por si o lote sai da simulação ao encerrar

    // Arrematante: prefere alguém que não seja o líder atual (disputa mais realista).
    var leader = state.leaders[lot.id];
    var idx = Math.floor(Math.random() * state.bidders.length);
    if (leader && state.bidders.length > 1) {
      for (var t = 0; t < 4 && state.bidders[idx].id === leader.user_id; t++) {
        idx = Math.floor(Math.random() * state.bidders.length);
      }
    }
    var who = state.bidders[idx];
    if (!who) return;

    // Valor: primeiro lance supera o lance atual real do lote; depois sobe 1–2 incrementos.
    // Nunca passa do teto de 70% acima do preço inicial.
    var step = meta.increment || 100;
    var cap = capFor(meta.basePrice, step);
    var current = leader ? (Number(leader.amount) || 0)
      : Math.max(Number(meta.basePrice) || 0, Number(lot.price) || 0);
    meta.cap = cap;
    if (cap && current >= cap) { meta.capped = true; return; }
    var amount = leader
      ? current + step * (Math.random() < 0.25 ? 2 : 1)
      : current;
    if (cap && amount > cap) amount = cap;
    if (leader && amount <= current) { meta.capped = true; return; }

    state.seq++;
    var now = new Date().toISOString();
    state.bids.push({
      id: 'simb-' + state.seq, sim: true, lot_id: lot.id, user_id: who.id, amount: amount,
      status: 'active', created_at: now,
      lots: { title: meta.title, n: meta.n },
      profiles: { name: who.name, email: who.email, sim: true }
    });
    meta.price = amount;
    meta.simBids++;
    meta.capped = cap ? amount >= cap : false;
    state.leaders[lot.id] = {
      lot_id: lot.id, amount: amount, created_at: now, user_id: who.id, sim: true,
      profiles: { id: who.id, name: who.name, email: who.email, cpf: who.cpf, phone: who.phone, address: who.address, sim: true }
    };
    who.bid_count++;
    who.max_bid = Math.max(Number(who.max_bid) || 0, amount);
  }

  // Re-render do painel: no máx. 1 a cada 5 s, MAS o lance mais recente é sempre
  // renderizado — se cair dentro da janela, agenda o "poke final" para quando abrir.
  var pendingPoke = null;
  function pokeRender() {
    if (!ready || typeof poke !== 'function') return;
    var now = Date.now();
    var wait = 5000 - (now - lastPoke);
    if (wait > 0) {
      if (!pendingPoke) pendingPoke = setTimeout(function () { pendingPoke = null; pokeRender(); }, wait);
      return;
    }
    lastPoke = now;
    poke();
  }

  function pokeNow() {
    if (pendingPoke) { clearTimeout(pendingPoke); pendingPoke = null; }
    lastPoke = 0;
    pokeRender();
  }

  // ------------------------------------------------------------------
  // Envelope dos dados do painel: mistura dados reais + simulação em memória.
  // ------------------------------------------------------------------
  function decorate(real) {
    var w = Object.create(real);

    w.lots = function () {
      return real.lots().then(function (rows) {
        return rows.map(function (l) {
          var s = state.leaders[l.id];
          // Dados reais vencem quando o lance real é maior que o fictício.
          if (!s || (Number(l.price) || 0) > (Number(s.amount) || 0)) return l;
          var c = {};
          for (var k in l) c[k] = l[k];
          c.price = Number(s.amount);
          c.bids = (l.bids || 0) + ((state.lots[l.id] && state.lots[l.id].simBids) || 0);
          return c;
        });
      });
    };

    w.leaders = function () {
      return real.leaders().then(function (map) {
        Object.keys(state.leaders).forEach(function (id) {
          var s = state.leaders[id], r = map[id];
          if (!r || (Number(r.amount) || 0) < (Number(s.amount) || 0)) map[id] = s;
        });
        return map;
      }, function () {
        // Consulta real indisponível: segue só com os lances fictícios.
        var map = {};
        Object.keys(state.leaders).forEach(function (id) { map[id] = state.leaders[id]; });
        return map;
      });
    };

    w.clients = function () {
      return real.clients().then(function (list) {
        return list.concat(simClients());
      }, function (err) {
        // Só entra no modo "só simulação" quando a função admin_clients não existe
        // (migração 002 não rodada). Outros erros (sessão expirada, permissão…)
        // são repassados para o painel mostrar a mensagem correta.
        if (!/admin_clients|schema cache|PGRST202/i.test(String((err && err.message) || err))) throw err;
        return simClients();
      });
    };

    w.bids = function () {
      return real.bids().then(function (list) {
        return list.concat(state.bids).sort(function (a, b) {
          return Date.parse(b.created_at) - Date.parse(a.created_at);
        }).slice(0, 250);
      }, function (err) {
        // Consulta real indisponível por falta de tabela/migração: mostra ao menos os fictícios.
        if (!/schema cache|PGRST2|Could not find/i.test(String((err && err.message) || err))) throw err;
        return state.bids.slice(-250);
      });
    };

    // KPIs mostram SÓ dados reais do banco: fictícios não contam como clientes
    // cadastrados nem como lances registrados (aparecem nas tabelas com o chip sim).

    w.clientLots = function (userId) {
      if (isSimUser(userId)) return Promise.resolve(simClientLots(userId));
      return real.clientLots(userId);
    };

    return w;
  }

  function simClientLots(userId) {
    var out = [];
    Object.keys(state.lots).forEach(function (id) {
      var meta = state.lots[id];
      var my = state.bids.filter(function (b) { return b.user_id === userId && b.lot_id === Number(id); });
      if (!my.length) return;
      var leader = state.leaders[id];
      var myMax = Math.max.apply(null, my.map(function (b) { return Number(b.amount); }));
      out.push({
        lot_id: Number(id), n: meta.n, title: meta.title, auction_label: meta.auction,
        my_max: myMax, current_price: meta.price,
        ends_at: meta.endsAt ? new Date(meta.endsAt).toISOString() : null,
        is_leading: !!(leader && leader.user_id === userId)
      });
    });
    return out.sort(function (a, b) { return String(a.n).localeCompare(String(b.n)); });
  }

  // ------------------------------------------------------------------
  // Painel do simulador (seção #sim-panel no admin.html).
  // ------------------------------------------------------------------
  function $(id) { return document.getElementById(id); }

  function status() {
    if (!wired) return;
    var el = $('sim-status');
    var nb = state.bids.length;
    var nl = Object.keys(state.lots).length;
    // Lotes que já bateram no teto (70% acima do preço inicial).
    var capped = Object.keys(state.lots).filter(function (id) {
      var m = state.lots[id], s = state.leaders[id];
      var cap = capFor(m.basePrice, m.increment);
      var cur = s ? (Number(s.amount) || 0) : (Number(m.price) || 0);
      return cap && cur >= cap;
    }).length;
    var start = $('sim-start'), pause = $('sim-pause'), clear = $('sim-clear');
    if (state.on) {
      var last = nb ? state.bids[nb - 1].created_at : null;
      var ago = last ? Math.max(0, Math.round((Date.now() - Date.parse(last)) / 1000)) : null;
      el.innerHTML = '<span class="sim-live"></span>Simulação <strong>ativa</strong>: ' + nb + ' lance(s) fictício(s) em ' + nl +
        ' lote(s)' + (ago != null ? ' · último lance há ' + ago + ' s' : '') + ' · 1 lance a cada ~' + state.cfg.iv + ' s' +
        (capped ? ' · <strong>' + capped + '</strong> no teto de 70%' : '') +
        '. Teto: 70% acima do preço inicial. Aparecem no site só neste navegador — nada vai ao banco.';
    } else if (nb) {
      el.innerHTML = '<strong>Pausada:</strong> ' + nb + ' lance(s) fictício(s) em ' + nl + ' lote(s) guardados neste navegador' +
        (capped ? ' (' + capped + ' no teto de 70%)' : '') + '. Inicie para continuar a simulação.';
    } else {
      el.textContent = 'Simulação parada — nenhum lance fictício no painel.';
    }
    if (start) start.hidden = state.on;
    if (pause) pause.hidden = !state.on;
    if (clear) clear.hidden = !nb && !state.on;
  }

  function wireUI() {
    $('sim-start').addEventListener('click', function () {
      if (!state.bidders.length) topUpBidders();
      else topUpBidders(); // completa até o nº configurado, mantendo histórico
      state.on = true;
      save();
      status();
      if (ready) { schedule(); if (!statusTimer) statusTimer = setInterval(status, 1000); }
      pokeNow();
    });
    $('sim-pause').addEventListener('click', function () {
      state.on = false;
      save();
      schedule(); // encerra o agendador
      status();
      pokeNow();
    });
    $('sim-clear').addEventListener('click', function () {
      state = freshState();
      save();
      schedule();
      status();
      pokeNow();
    });
    $('sim-bidders').value = String(state.cfg.n);
    $('sim-interval').value = String(state.cfg.iv);
    $('sim-scope').value = state.cfg.scope;
    $('sim-bidders').addEventListener('change', function () {
      state.cfg.n = parseInt($('sim-bidders').value, 10) || 6;
      save();
      if (state.on) topUpBidders();
      status();
    });
    $('sim-interval').addEventListener('change', function () {
      state.cfg.iv = parseInt($('sim-interval').value, 10) || 10;
      save();
      status();
      if (state.on) schedule();
    });
    $('sim-scope').addEventListener('change', function () {
      state.cfg.scope = $('sim-scope').value;
      save();
    });
  }

  // ------------------------------------------------------------------
  // API usada pelo admin.js
  // ------------------------------------------------------------------
  window.NLSimulate = {
    // Chamado no carregamento do painel: liga a seção e devolve o leitor de dados envolvido.
    attach: function (real) {
      wired = !!$('sim-start') && !!$('sim-status');
      if (wired) wireUI();
      return decorate(real);
    },
    // Chamado pelo admin.js após confirmar o login de admin: libera re-renders e retoma o motor.
    markReady: function (renderFn) {
      poke = renderFn;
      ready = true;
      if (wired && state.on) {
        schedule();
        if (!statusTimer) statusTimer = setInterval(status, 1000);
      }
      status();
    },
    // Para testes: limpa tudo (mesmo efeito do botão "Limpar dados").
    reset: function () { state = freshState(); save(); schedule(); status(); pokeNow(); }
  };
})();
