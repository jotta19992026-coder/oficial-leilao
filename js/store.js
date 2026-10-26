// Leilão Oficial — dados do site vindos do Supabase (lotes, fotos e lances).
// NLStore.ready carrega os lotes publicados uma vez; depois lots()/lot()/bids() são síncronos,
// lendo do cache. Se o Supabase estiver fora do ar, cai para o catálogo local (js/lots-data.js).
// Lances passam pela função place_bid (validação e gravação no banco, nunca no navegador).
(function () {
  'use strict';

  var supa = window.NLSupa;
  var CAT_LABEL = { carro: 'Veículo', moto: 'Moto', pesado: 'Pesado', nautico: 'Náutico', imovel: 'Imóvel', equipamento: 'Equipamento' };
  var LOT_COLUMNS = 'id,n,title,description,obs,category,year,km,city,price,increment,media,auction_num,auction_date,' +
    'auction_time,auction_label,ends_at,ends_label,status,featured,bid_count,current_price,lot_photos(url,position)';

  var cache = { lots: [], byId: {}, myBids: [], source: 'loading' };

  // O catálogo local (270 KB) só é baixado quando o Supabase falha; as páginas não o carregam mais.
  function loadLocalCatalog() {
    if (window.NL_REAL_LOTS) return Promise.resolve();
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'js/lots-data.js?v=53';
      s.onload = function () {
        if (window.NL_REAL_LOTS && window.NL_REAL_LOTS.length) window.NL_LOTS = window.NL_REAL_LOTS;
        resolve();
      };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
  }

  function incrementFor(price) { return Math.max(100, Math.round(price * 0.01 / 100) * 100); }

  // Linha do banco -> formato usado pelos cards/detalhe (mesmos nomes de lots-data.js).
  function fromRow(r) {
    var photos = (r.lot_photos || []).slice()
      .sort(function (a, b) { return a.position - b.position; })
      .map(function (p) { return p.url; });
    var base = Number(r.price) || 0;
    var current = r.current_price != null ? Number(r.current_price) : base;
    var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(r.auction_date || '');
    return {
      id: Number(r.id),
      n: String(r.n || r.id).padStart(2, '0'),
      title: r.title,
      cat: r.category,
      catLabel: CAT_LABEL[r.category] || r.category,
      year: r.year || '—',
      km: r.km || '—',
      city: r.city || 'Consultar edital',
      price: current,            // lance atual (o card e o detalhe mostram este valor)
      basePrice: base,           // lance inicial
      increment: Number(r.increment) || incrementFor(base),
      bids: r.bid_count || 0,
      media: r.media || 'c1',
      ends: r.ends_label || '',
      endsAt: r.ends_at ? Date.parse(r.ends_at) : null,
      auction: r.auction_label || '',
      auctionNum: r.auction_num,
      auctionDate: dm ? dm[3] + '/' + dm[2] + '/' + dm[1] : '',
      featured: !!r.featured,
      status: r.status,
      photos: photos,
      photo: photos[0] || null,
      desc: r.description || '',
      obs: r.obs || ''
    };
  }

  function fromLocal(l) {
    var c = {};
    for (var k in l) { if (Object.prototype.hasOwnProperty.call(l, k)) c[k] = l[k]; }
    c.basePrice = l.price;
    c.increment = incrementFor(l.price);
    return c;
  }

  function setLots(list, source) {
    cache.lots = list;
    cache.byId = {};
    list.forEach(function (l) { cache.byId[l.id] = l; });
    cache.source = source;
  }

  function fetchLots() {
    return supa.from('lots').select(LOT_COLUMNS).eq('status', 'published').order('id')
      .then(function (r) {
        if (r.error) throw r.error;
        return r.data.map(fromRow);
      });
  }

  // Lances do próprio usuário (a RLS só devolve os dele); servem para "Vencendo: Você".
  function fetchMyBids() {
    var u = window.NLAuth && window.NLAuth.current();
    if (!supa || !u) return Promise.resolve([]);
    return supa.from('bids').select('lot_id,amount,created_at').eq('status', 'active')
      .order('created_at', { ascending: false }).limit(500)
      .then(function (r) {
        if (r.error) return [];
        return r.data.map(function (b) {
          return { lotId: Number(b.lot_id), amount: Number(b.amount), time: Date.parse(b.created_at), userLabel: 'Você' };
        });
      }, function () { return []; });
  }

  var ready = (supa
    ? fetchLots().then(function (list) {
        if (!list.length) throw new Error('Nenhum lote publicado no Supabase.');
        setLots(list, 'supabase');
      })
    : Promise.reject(new Error('supabase-js indisponível'))
  ).catch(function (err) {
    // Sem ruído no console: em silêncio usa o catálogo local (js/lots-data.js).
    return loadLocalCatalog().then(function () {
      setLots((window.NL_LOTS || []).map(fromLocal), 'local');
    });
  }).then(function () {
    return (window.NLAuth ? window.NLAuth.ready : Promise.resolve()).then(fetchMyBids);
  }).then(function (mine) {
    cache.myBids = mine;
    return cache.lots;
  });

  function pgMessage(err) {
    var m = (err && err.message) || '';
    var min = /lance mínimo é (\d+(?:\.\d+)?)/i.exec(m);
    if (min) return 'O lance mínimo é ' + window.NL_BRL(Math.round(Number(min[1]))) + '.';
    if (/JWT|not authenticated|Faça login/i.test(m)) return 'Sua sessão expirou. Entre novamente para dar lances.';
    if (/failed to fetch|network/i.test(m)) return 'Sem conexão com o servidor. Tente de novo.';
    return m || 'Não foi possível registrar o lance.';
  }

  var NLStore = {
    ready: ready,
    source: function () { return cache.source; },
    lots: function () { return cache.lots; },
    lot: function (id) { return cache.byId[parseInt(id, 10)] || null; },

    // Lances do usuário logado (mais recente primeiro).
    bids: function () { return cache.myBids; },

    // Lance via função place_bid: Promise<{ ok, lot?, error? }>.
    placeBid: function (lotId, amount) {
      if (!supa || cache.source !== 'supabase') return Promise.resolve({ ok: false, error: 'Lances indisponíveis no momento.' });
      return supa.rpc('place_bid', { p_lot_id: lotId, p_amount: amount }).then(function (r) {
        if (r.error) return { ok: false, error: pgMessage(r.error) };
        var lot = cache.byId[lotId];
        var value = Number(r.data.amount);
        if (lot) { lot.price = Math.max(lot.price, value); lot.bids += 1; }
        cache.myBids.unshift({ lotId: lotId, amount: value, time: Date.parse(r.data.created_at) || Date.now(), userLabel: 'Você' });
        return { ok: true, lot: lot, amount: value };
      }, function (e) { return { ok: false, error: pgMessage(e) }; });
    },

    // Histórico público (primeiro nome + valor + data), via lot_bid_history.
    history: function (lotId) {
      if (!supa || cache.source !== 'supabase') return Promise.resolve([]);
      return supa.rpc('lot_bid_history', { p_lot_id: lotId }).then(function (r) {
        if (r.error) return [];
        return r.data.map(function (h) {
          return { userLabel: h.display_name, amount: Number(h.amount), time: Date.parse(h.created_at) };
        });
      }, function () { return []; });
    },

    // Relê um lote (preço/lances atuais).
    refreshLot: function (id) {
      if (!supa || cache.source !== 'supabase') return Promise.resolve(cache.byId[id] || null);
      return supa.from('lots').select(LOT_COLUMNS).eq('id', id).maybeSingle().then(function (r) {
        if (r.error || !r.data) return cache.byId[id] || null;
        var fresh = fromRow(r.data);
        var lot = cache.byId[id];
        if (lot) { for (var k in fresh) lot[k] = fresh[k]; return lot; }
        cache.byId[id] = fresh; cache.lots.push(fresh);
        return fresh;
      });
    },

    // Avisa quando o lote muda no banco (novo lance de qualquer pessoa). Devolve função para cancelar.
    watchLot: function (id, onChange) {
      if (!supa || cache.source !== 'supabase') return function () {};
      var channel = supa.channel('lot-' + id)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lots', filter: 'id=eq.' + id }, function (payload) {
          var lot = cache.byId[id];
          var row = payload.new || {};
          if (lot && row.current_price != null) lot.price = Number(row.current_price);
          if (lot && row.bid_count != null) lot.bids = row.bid_count;
          onChange(lot);
        })
        .subscribe();
      return function () { supa.removeChannel(channel); };
    },

    // ---- Funções do painel administrativo (a RLS exige profiles.role = 'admin') ----
    admin: {
      lots: function () {
        return supa.from('lots').select(LOT_COLUMNS).order('id').then(function (r) {
          if (r.error) throw r.error;
          return r.data.map(fromRow);
        });
      },
      // Todos os clientes com resumo de lances (função admin_clients, migração 002).
      clients: function () {
        return supa.rpc('admin_clients').then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      // Lotes em que um cliente deu lance (para o contrato).
      clientLots: function (userId) {
        return supa.rpc('admin_client_lots', { p_user_id: userId }).then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      // Resumo das visualizações do site (função admin_views, migração 003).
      views: function (days) {
        return supa.rpc('admin_views', { p_days: days || 14 }).then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      // Maior lance ativo de cada lote = quem deve arrematar. { lotId: lance + profiles }, paginado de 1000 em 1000.
      leaders: function () {
        var out = {};
        function page(from) {
          return supa.from('bids').select('lot_id,amount,created_at,user_id,profiles(id,name,email,cpf,phone,address)')
            .eq('status', 'active').order('amount', { ascending: false }).order('created_at', { ascending: true })
            .range(from, from + 999)
            .then(function (r) {
              if (r.error) throw r.error;
              r.data.forEach(function (b) { if (!out[b.lot_id]) out[b.lot_id] = b; });
              return r.data.length === 1000 ? page(from + 1000) : out;
            });
        }
        return page(0);
      },
      users: function () {
        return supa.from('profiles').select('id,name,email,role,created_at').order('created_at', { ascending: false })
          .then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      bids: function () {
        return supa.from('bids').select('id,lot_id,user_id,amount,status,created_at,lots(title,n),profiles(name,email)')
          .order('created_at', { ascending: false }).limit(200)
          .then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      counts: function () {
        function count(table) {
          return supa.from(table).select('id', { count: 'exact', head: true }).then(function (r) { return r.error ? null : r.count; });
        }
        return Promise.all([count('profiles'), count('lots'), count('bids')]).then(function (c) {
          return { users: c[0], lots: c[1], bids: c[2] };
        });
      },
      addLot: function (row) {
        row.increment = row.increment || incrementFor(row.price);
        return supa.from('lots').insert(row).select('id,n').single().then(function (r) { if (r.error) throw r.error; return r.data; });
      },
      removeLot: function (id) {
        return supa.from('lots').delete().eq('id', id).then(function (r) { if (r.error) throw r.error; });
      },
      // Envia a foto ao bucket lot-photos e a coloca como capa (mantendo as demais).
      uploadCover: function (lot, blob) {
        var path = 'lotes/' + lot.id + '/admin-' + Date.now() + '.jpg';
        return supa.storage.from('lot-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
          .then(function (r) {
            if (r.error) throw r.error;
            var url = supa.storage.from('lot-photos').getPublicUrl(path).data.publicUrl;
            return supa.rpc('replace_lot_photos', { p_lot_id: lot.id, p_urls: [url].concat(lot.photos || []) });
          })
          .then(function (r) { if (r.error) throw r.error; });
      },
      removeCover: function (lot) {
        return supa.rpc('replace_lot_photos', { p_lot_id: lot.id, p_urls: (lot.photos || []).slice(1) })
          .then(function (r) { if (r.error) throw r.error; });
      }
    }
  };

  window.NLStore = NLStore;
})();
