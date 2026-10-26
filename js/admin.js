// Leilão Oficial — painel administrativo (Supabase). O acesso é decidido no banco:
// só contas com profiles.role = 'admin' passam por is_admin() e pelas políticas RLS.
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function errText(e) { return (e && e.message) || 'Erro inesperado.'; }

  // ----- Tela de login do admin -----
  var loginForm = document.getElementById('form-admin-login');
  if (loginForm) {
    var hint = document.getElementById('admin-hint');
    if (hint) hint.textContent = 'Acesso restrito a administradores. Entre com a conta promovida a admin no Supabase.';
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('admin-login-msg');
      var submit = loginForm.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      window.NLAdmin.login(document.getElementById('admin-email').value, document.getElementById('admin-pass').value).then(function (r) {
        if (r.ok) { location.href = 'admin.html'; return; }
        if (submit) submit.disabled = false;
        msg.textContent = r.error; msg.className = 'form__msg form__msg--err';
      });
    });
    return;
  }

  // ----- Painel -----
  var panel = document.getElementById('admin-panel');
  if (!panel) return;
  panel.style.visibility = 'hidden';
  var A = window.NLStore.admin;
  var lotsById = {};
  var allLots = [];
  var leaders = {};   // lotId -> maior lance ativo (com profiles)
  var wins = [];      // lotes com maior lance = quem deve arrematar

  window.NLAdmin.require().then(function (ok) {
    if (!ok) return;
    panel.style.visibility = '';
    renderAll();
    restartTimers();
  });

  function renderStats() {
    return A.counts().then(function (c) {
      document.getElementById('kpi-users').textContent = c.users == null ? '—' : c.users;
      document.getElementById('kpi-lots').textContent = c.lots == null ? '—' : c.lots;
      document.getElementById('kpi-bids').textContent = c.bids == null ? '—' : c.bids;
    });
  }

  // ---- Utilitários de data/valor ----
  function fmtDate(v) { return v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'; }
  // Chave AAAA-MM-DD no fuso do navegador (compara com <input type="date">).
  function dayKey(v) {
    if (v == null || v === '') return '';
    var d = new Date(v);
    if (isNaN(d)) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function inRange(key, from, to) { return (!from || (key && key >= from)) && (!to || (key && key <= to)); }
  // CPF/telefone no padrão oficial (o banco guarda o CPF só com dígitos).
  function fmt(type, v) { return v ? (window.NLMasks ? window.NLMasks.format(type, v) : v) : ''; }
  function money(v) { return v == null ? '—' : window.NL_BRL(Math.round(Number(v))); }
  function lotLabel(n, title) { return 'Lote ' + String(n || '').padStart(2, '0') + ' — ' + title; }
  function val(id) { return (document.getElementById(id).value || '').trim(); }
  function textMatches(haystack, q) {
    if (!q) return true;
    if (haystack.join(' ').toLowerCase().indexOf(q) > -1) return true;
    var digits = q.replace(/\D/g, '');
    return digits.length >= 3 && haystack.join(' ').replace(/\D/g, '').indexOf(digits) > -1;
  }
  function downloadCSV(name, head, rows) {
    var csv = [head].concat(rows).map(function (r) {
      return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function csvMoney(v) { return v == null ? '' : Number(v).toFixed(2).replace('.', ','); }

  // ---- Arremates: lote + maior lance (quem deve arrematar) ----
  function buildWins() {
    var now = Date.now();
    wins = allLots.filter(function (l) { return leaders[l.id]; }).map(function (l) {
      var b = leaders[l.id];
      var when = l.endsAt || (l.auctionDate ? Date.parse(l.auctionDate.split('/').reverse().join('-') + 'T12:00:00') : null);
      return { lot: l, bid: b, user: b.profiles || {}, userId: b.user_id, when: when, key: dayKey(when), ended: !!(l.endsAt && l.endsAt <= now) };
    }).sort(function (a, b) { return (a.when || Infinity) - (b.when || Infinity); });
    document.getElementById('kpi-wins').textContent = wins.length;
  }
  function filteredWins() {
    var from = val('wins-from'), to = val('wins-to'), st = val('wins-status');
    var q = val('wins-search').toLowerCase();
    return wins.filter(function (w) {
      if (!inRange(w.key, from, to)) return false;
      if (st === 'ended' && !w.ended) return false;
      if (st === 'open' && w.ended) return false;
      return textMatches([w.lot.title, 'lote ' + w.lot.n, w.lot.auction, w.user.name, w.user.email, w.user.cpf, w.user.phone], q);
    });
  }
  function drawWins() {
    var list = filteredWins();
    document.getElementById('wins-count').textContent = wins.length
      ? list.length + ' de ' + wins.length + ' lote(s) com lance · total ' + money(list.reduce(function (s, w) { return s + Number(w.bid.amount); }, 0))
      : '';
    document.getElementById('wins-body').innerHTML = list.length
      ? list.map(function (w) {
          return '<tr><td class="nowrap">' + fmtDate(w.when) + '</td><td class="nowrap">Lote ' + esc(w.lot.n) + '</td>' +
            '<td><a href="lote.html?id=' + w.lot.id + '" target="_blank" rel="noopener">' + esc(w.lot.title) + '</a>' +
            (w.lot.auction ? '<br><small class="muted">' + esc(w.lot.auction) + '</small>' : '') + '</td>' +
            '<td>' + esc(w.user.name || '—') + '<br><small class="muted">' + esc(w.user.email || '') + '</small></td>' +
            '<td class="nowrap">' + esc(fmt('cpf', w.user.cpf) || '—') + '</td><td class="nowrap">' + esc(fmt('phone', w.user.phone) || '—') + '</td>' +
            '<td class="nowrap"><strong>' + money(w.bid.amount) + '</strong></td><td>' + (w.lot.bids || 0) + '</td>' +
            '<td>' + (w.ended ? '<span class="tag tag--done">✓ Encerrado</span>' : '<span class="tag tag--open">⏱ Em andamento</span>') + '</td>' +
            '<td>' + (w.userId ? '<button class="btn btn--ghost btn--sm" type="button" data-win-user="' + w.userId + '" data-win-lot="' + w.lot.id + '">Contrato</button>' : '') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="10" class="muted">' + (wins.length ? 'Nenhum arremate encontrado para os filtros.' : 'Nenhum lote recebeu lances ainda.') + '</td></tr>';
  }
  ['wins-from', 'wins-to', 'wins-status', 'wins-search'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', drawWins);
  });
  document.getElementById('wins-today').addEventListener('click', function () {
    document.getElementById('wins-from').value = document.getElementById('wins-to').value = dayKey(Date.now());
    drawWins();
  });
  document.getElementById('wins-clear').addEventListener('click', function () {
    ['wins-from', 'wins-to', 'wins-status', 'wins-search'].forEach(function (id) { document.getElementById(id).value = ''; });
    drawWins();
  });
  document.getElementById('wins-body').addEventListener('click', function (e) {
    var b = e.target.closest('[data-win-user]');
    if (b) openContract(b.getAttribute('data-win-user'), b.getAttribute('data-win-lot'));
  });
  document.getElementById('wins-csv').addEventListener('click', function () {
    downloadCSV('arremates', ['Encerramento', 'Lote', 'Veículo', 'Leilão', 'Cliente', 'E-mail', 'CPF', 'Telefone', 'Endereço', 'Valor', 'Lances', 'Situação'],
      filteredWins().map(function (w) {
        return [fmtDate(w.when), w.lot.n, w.lot.title, w.lot.auction, w.user.name, w.user.email, fmt('cpf', w.user.cpf), fmt('phone', w.user.phone),
          w.user.address, csvMoney(w.bid.amount), w.lot.bids || 0, w.ended ? 'Encerrado' : 'Em andamento'];
      }));
  });

  // ---- Clientes (admin_clients) ----
  var clients = [];
  var MIGRATION_HINT = 'Execute supabase/002_clientes_admin.sql no SQL Editor do Supabase para liberar esta lista.';
  function winsOf(userId) { return wins.filter(function (w) { return w.userId === userId; }); }
  function filteredClients() {
    var from = val('clients-from'), to = val('clients-to'), sort = val('clients-sort');
    var q = val('clients-search').toLowerCase();
    var list = clients.filter(function (c) {
      if (!inRange(dayKey(c.created_at), from, to)) return false;
      var vehicles = winsOf(c.id).map(function (w) { return w.lot.title; });
      return textMatches([c.name, c.email, c.cpf, c.phone, c.address].concat(vehicles), q);
    });
    var by = {
      recent: function (a, b) { return Date.parse(b.created_at) - Date.parse(a.created_at); },
      name: function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'); },
      bids: function (a, b) { return Number(b.bid_count) - Number(a.bid_count); },
      max: function (a, b) { return Number(b.max_bid || 0) - Number(a.max_bid || 0); },
      leading: function (a, b) { return winsOf(b.id).length - winsOf(a.id).length; }
    };
    return list.sort(by[sort] || by.recent);
  }
  function drawClients() {
    var list = filteredClients();
    document.getElementById('clients-count').textContent = clients.length ? list.length + ' de ' + clients.length + ' cliente(s)' : '';
    document.getElementById('clients-body').innerHTML = list.length
      ? list.map(function (c) {
          var mine = winsOf(c.id);
          var vehicles = mine.length
            ? '<ul class="vehicles">' + mine.map(function (w) {
                return '<li>' + esc(lotLabel(w.lot.n, w.lot.title)) + ' · <strong>' + money(w.bid.amount) + '</strong> · ' +
                  (w.ended ? 'encerrado ' : 'encerra ') + fmtDate(w.when) + '</li>';
              }).join('') + '</ul>'
            : '<span class="muted">—</span>';
          return '<tr><td>' + esc(c.name) + (c.role === 'admin' ? ' <span class="chip">admin</span>' : '') + '</td>' +
            '<td>' + esc(c.email) + '</td><td class="nowrap">' + esc(fmt('cpf', c.cpf) || '—') + '</td><td class="nowrap">' + esc(fmt('phone', c.phone) || '—') + '</td>' +
            '<td>' + esc(c.address || '—') + '</td><td class="nowrap">' + fmtDate(c.created_at) + '</td><td class="nowrap">' + fmtDate(c.last_sign_in_at) + '</td>' +
            '<td>' + c.bid_count + '</td><td class="nowrap">' + money(c.max_bid) + '</td><td>' + vehicles + '</td>' +
            '<td><button class="btn btn--ghost btn--sm" data-contract="' + c.id + '" type="button">Contrato</button></td></tr>';
        }).join('')
      : '<tr><td colspan="11" class="muted">' + (clients.length ? 'Nenhum cliente encontrado para a busca.' : 'Nenhum cliente cadastrado ainda.') + '</td></tr>';
  }
  function loadClients() {
    return A.clients().then(function (list) {
      clients = list;
      fillClientSelect();
      return true;
    }, function (err) {
      var missing = /admin_clients|schema cache|PGRST202/i.test(errText(err) + ' ' + (err && err.code));
      document.getElementById('clients-body').innerHTML = '<tr><td colspan="11" class="muted">' +
        esc(missing ? MIGRATION_HINT : 'Não foi possível carregar os clientes: ' + errText(err)) + '</td></tr>';
      kClient.innerHTML = '<option value="">' + esc(missing ? 'Rode a migração 002 primeiro' : 'Erro ao carregar') + '</option>';
      return false;
    });
  }
  ['clients-from', 'clients-to', 'clients-sort', 'clients-search'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', drawClients);
  });
  document.getElementById('clients-clear').addEventListener('click', function () {
    ['clients-from', 'clients-to', 'clients-search'].forEach(function (id) { document.getElementById(id).value = ''; });
    document.getElementById('clients-sort').value = 'recent';
    drawClients();
  });
  document.getElementById('clients-body').addEventListener('click', function (e) {
    var b = e.target.closest('[data-contract]');
    if (b) openContract(b.getAttribute('data-contract'));
  });

  // Exportação CSV (abre no Excel com acentos: BOM + ponto e vírgula).
  document.getElementById('clients-csv').addEventListener('click', function () {
    downloadCSV('clientes', ['Nome', 'E-mail', 'CPF', 'Telefone', 'Endereço', 'Cadastro', 'Último acesso', 'Lances', 'Maior lance', 'Deve arrematar'],
      filteredClients().map(function (c) {
        return [c.name, c.email, fmt('cpf', c.cpf), fmt('phone', c.phone), c.address, fmtDate(c.created_at), fmtDate(c.last_sign_in_at), c.bid_count,
          csvMoney(c.max_bid), winsOf(c.id).map(function (w) { return lotLabel(w.lot.n, w.lot.title) + ' (' + money(w.bid.amount) + ')'; }).join(' | ')];
      }));
  });

  // ---- Contrato pelo painel ----
  var MANUAL = '__manual';
  var MANUAL_OPTION = '<option value="' + MANUAL + '">✎ Digitar o veículo manualmente</option>';
  var kClient = document.getElementById('k-client');
  var kLot = document.getElementById('k-lot');
  var kValue = document.getElementById('k-value');
  var kInfo = document.getElementById('k-info');
  var kVehicle = document.getElementById('k-vehicle');
  var kDate = document.getElementById('k-date');
  var clientLots = [];
  function fillClientSelect() {
    var keep = kClient.value;
    kClient.innerHTML = '<option value="">Selecione…</option>' + clients.filter(function (c) { return c.role !== 'admin'; }).map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name + ' — ' + c.email) + '</option>';
    }).join('');
    if (keep) kClient.value = keep;
  }
  function loadClientLots(userId, lotId) {
    clientLots = [];
    kInfo.textContent = '';
    kValue.value = '';
    if (!userId) { kLot.innerHTML = '<option value="">Selecione um cliente</option>' + MANUAL_OPTION; kLot.dispatchEvent(new Event('change')); return; }
    kLot.innerHTML = '<option value="">Carregando…</option>';
    A.clientLots(userId).then(function (list) {
      clientLots = list;
      kLot.innerHTML = list.map(function (l) {
        return '<option value="' + l.lot_id + '">' + esc(lotLabel(l.n || l.lot_id, l.title) + (l.is_leading ? ' (vencendo)' : '')) + '</option>';
      }).join('') + MANUAL_OPTION;
      // Sem lances: já abre o campo para digitar o veículo.
      kLot.value = lotId && list.some(function (l) { return String(l.lot_id) === String(lotId); }) ? String(lotId) : (list.length ? String(list[0].lot_id) : MANUAL);
      kLot.dispatchEvent(new Event('change'));
    }, function (err) {
      kLot.innerHTML = '<option value="">Erro: ' + esc(errText(err)) + '</option>' + MANUAL_OPTION;
    });
  }
  function openContract(userId, lotId) {
    kClient.value = userId;
    loadClientLots(kClient.value, lotId);
    document.getElementById('form-contract').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  kClient.addEventListener('change', function () { loadClientLots(kClient.value); });
  kLot.addEventListener('change', function () {
    var manual = kLot.value === MANUAL;
    document.getElementById('k-manual').hidden = !manual;
    document.getElementById('k-date-field').hidden = !manual;
    if (manual) {
      kInfo.textContent = 'Digite o veículo/lote e o valor de arremate; eles vão direto para o contrato.';
      if (!kDate.value) kDate.value = dayKey(Date.now());
      kVehicle.focus();
      return;
    }
    var l = clientLots.filter(function (x) { return String(x.lot_id) === kLot.value; })[0];
    if (!l) { kInfo.textContent = ''; return; }
    kValue.value = Math.round(Number(l.my_max));
    var ended = l.ends_at && Date.parse(l.ends_at) <= Date.now();
    kInfo.textContent = 'Maior lance do cliente: ' + money(l.my_max) + ' · lance atual do lote: ' + money(l.current_price) + ' · ' +
      (l.is_leading ? 'cliente está vencendo' : 'cliente NÃO é o maior lance') + ' · ' + (ended ? 'leilão encerrado' : 'leilão ainda aberto');
  });
  document.getElementById('form-contract').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = document.getElementById('k-msg');
    function fail(t) { msg.textContent = t; msg.className = 'form__msg form__msg--err'; }
    var c = clients.filter(function (x) { return x.id === kClient.value; })[0];
    if (!c) return fail('Selecione o cliente.');
    var lote, data;
    if (kLot.value === MANUAL) {
      lote = kVehicle.value.trim();
      if (!lote) { kVehicle.focus(); return fail('Digite o veículo / lote do contrato.'); }
      if (!(Number(kValue.value) > 0)) { kValue.focus(); return fail('Informe o valor de arremate.'); }
      data = kDate.value ? kDate.value.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
    } else {
      var l = clientLots.filter(function (x) { return String(x.lot_id) === kLot.value; })[0];
      if (!l) return fail('Selecione o lote ou escolha "Digitar o veículo manualmente".');
      if (!l.is_leading && !confirm('Este cliente não tem o maior lance do lote. Gerar o contrato mesmo assim?')) return;
      lote = lotLabel(l.n || l.lot_id, l.title) + (l.auction_label ? ' (' + l.auction_label + ')' : '');
      data = l.ends_at ? fmtDate(l.ends_at) : '—';
    }
    window.NLContractPrint({
      numero: document.getElementById('k-number').value.trim(),
      nome: c.name, cpf: fmt('cpf', c.cpf), email: c.email, tel: fmt('phone', c.phone), endereco: c.address,
      lote: lote,
      valor: Number(kValue.value) || 0,
      data: data
    });
    msg.textContent = 'Contrato aberto em nova janela para imprimir ou salvar em PDF.';
    msg.className = 'form__msg form__msg--ok';
  });

  // ---- Visualizações do site (admin_views, migração 003) ----
  var VIEWS_HINT = 'Execute supabase/003_visualizacoes.sql no SQL Editor do Supabase para começar a contar as visualizações.';
  var viewsTip = document.getElementById('views-tip');
  var viewsDaily = [];
  function shortDay(iso) { var p = iso.split('-'); return p[2] + '/' + p[1]; }
  function weekday(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''); }
  function drawChart(daily) {
    viewsDaily = daily;
    var max = Math.max.apply(null, daily.map(function (d) { return d.views; }).concat([1]));
    var peak = daily.reduce(function (best, d, i) { return d.views > daily[best].views ? i : best; }, 0);
    var step = daily.length > 14 ? 5 : daily.length > 7 ? 2 : 1;
    var plot = document.getElementById('views-chart');
    plot.setAttribute('aria-label', 'Visualizações por dia: ' + daily.map(function (d) { return shortDay(d.day) + ' ' + d.views; }).join(', '));
    plot.innerHTML = daily.map(function (d, i) {
      // Rótulo de valor só no pico e no dia de hoje (o resto fica no tooltip).
      var label = (i === peak || i === daily.length - 1) && d.views ? '<span class="vchart__val">' + d.views + '</span>' : '';
      return '<div class="vchart__col" tabindex="0" data-i="' + i + '">' + label +
        '<div class="vchart__bar" style="height:' + (d.views / max * 88).toFixed(1) + '%"></div></div>';
    }).join('');
    var axis = plot.nextElementSibling && plot.nextElementSibling.classList.contains('vchart__axis') ? plot.nextElementSibling : null;
    if (!axis) { axis = document.createElement('div'); axis.className = 'vchart__axis'; plot.parentNode.insertBefore(axis, plot.nextSibling); }
    axis.innerHTML = daily.map(function (d, i) {
      return '<span>' + ((daily.length - 1 - i) % step === 0 ? shortDay(d.day) : '') + '</span>';
    }).join('');
  }
  function showTip(col) {
    var d = viewsDaily[Number(col.getAttribute('data-i'))];
    if (!d) return;
    var fig = col.closest('.vchart').getBoundingClientRect();
    var r = col.getBoundingClientRect();
    viewsTip.innerHTML = '<strong>' + weekday(d.day) + ', ' + shortDay(d.day) + '</strong><br>' + d.views + ' visualizações · ' + d.visitors + ' visitantes';
    viewsTip.hidden = false;
    var x = r.left - fig.left + r.width / 2;
    viewsTip.style.left = Math.min(Math.max(x, 80), fig.width - 80) + 'px';
    viewsTip.style.top = (col.querySelector('.vchart__bar').getBoundingClientRect().top - fig.top - 6) + 'px';
  }
  var chartEl = document.getElementById('views-chart');
  chartEl.addEventListener('mouseover', function (e) { var c = e.target.closest('.vchart__col'); if (c) showTip(c); });
  chartEl.addEventListener('focusin', function (e) { var c = e.target.closest('.vchart__col'); if (c) showTip(c); });
  chartEl.addEventListener('mouseleave', function () { viewsTip.hidden = true; });
  chartEl.addEventListener('focusout', function () { viewsTip.hidden = true; });
  document.getElementById('views-days').addEventListener('change', renderViews);

  function renderViews() {
    var hint = document.getElementById('views-hint');
    var box = document.getElementById('views-box');
    return A.views(parseInt(val('views-days'), 10) || 14).then(function (v) {
      hint.hidden = true; box.hidden = false;
      document.getElementById('kpi-views').textContent = v.today;
      document.getElementById('kpi-visitors').textContent = v.today_visitors;
      document.getElementById('kpi-online').textContent = v.online;
      document.getElementById('views-7').textContent = v.last7;
      document.getElementById('views-30').textContent = v.last30;
      document.getElementById('views-total').textContent = v.total;
      drawChart(v.daily || []);
      document.getElementById('views-lots').innerHTML = (v.top_lots || []).length
        ? v.top_lots.map(function (t) {
            return '<tr><td class="nowrap">Lote ' + esc(String(t.n || t.lot_id).padStart(2, '0')) + '</td><td><a href="lote.html?id=' + t.lot_id +
              '" target="_blank" rel="noopener">' + esc(t.title) + '</a></td><td>' + t.views + '</td><td class="nowrap">' + fmtDate(t.last_view) + '</td></tr>';
          }).join('')
        : '<tr><td colspan="4" class="muted">Nenhum lote visualizado no período.</td></tr>';
      document.getElementById('views-pages').innerHTML = (v.top_pages || []).length
        ? v.top_pages.map(function (t) { return '<tr><td>' + esc(t.path) + '</td><td>' + t.views + '</td></tr>'; }).join('')
        : '<tr><td colspan="2" class="muted">Nenhuma visualização no período.</td></tr>';
    }, function (err) {
      var missing = /admin_views|schema cache|PGRST202/i.test(errText(err) + ' ' + (err && err.code));
      hint.textContent = missing ? VIEWS_HINT : 'Não foi possível carregar as visualizações: ' + errText(err);
      hint.hidden = false; box.hidden = true;
    });
  }

  function renderBids() {
    return A.bids().then(function (bids) {
      document.getElementById('bids-body').innerHTML = bids.length
        ? bids.map(function (b) {
            var lot = b.lots ? lotLabel(b.lots.n || b.lot_id, b.lots.title) : '#' + b.lot_id;
            var who = b.profiles ? (b.profiles.name + ' <' + b.profiles.email + '>') : '—';
            return '<tr><td>' + esc(lot) + '</td><td>' + esc(who) + '</td><td>' + window.NL_BRL(Number(b.amount)) + '</td><td>' +
              new Date(b.created_at).toLocaleString('pt-BR') + '</td></tr>';
          }).join('')
        : '<tr><td colspan="4" class="muted">Nenhum lance registrado ainda.</td></tr>';
    });
  }

  function loadLots() {
    return Promise.all([A.lots(), A.leaders()]).then(function (r) {
      allLots = r[0];
      leaders = r[1];
      lotsById = {};
      allLots.forEach(function (l) { lotsById[l.id] = l; });
    });
  }
  function drawLots() {
    document.getElementById('lots-body').innerHTML = allLots.map(function (l) {
      var thumb = l.photo
        ? '<img src="' + esc(l.photo) + '" alt="" loading="lazy" style="width:46px;height:34px;object-fit:cover;border-radius:5px;vertical-align:middle">'
        : '<span class="muted">—</span>';
      return '<tr><td>' + l.n + '</td><td>' + thumb + '</td><td>' + esc(l.title) +
        (l.status !== 'published' ? ' <span class="chip">' + esc(l.status) + '</span>' : '') + '</td><td>' + esc(l.catLabel) +
        '</td><td>' + window.NL_BRL(l.basePrice) + '</td><td>' +
        '<button class="btn btn--ghost btn--sm" data-photo="' + l.id + '">' + (l.photo ? 'Trocar capa' : 'Adicionar foto') + '</button>' +
        (l.photo ? ' <button class="btn btn--ghost btn--sm" data-rmphoto="' + l.id + '">Remover capa</button>' : '') +
        ' <button class="btn btn--ghost btn--sm" data-del="' + l.id + '">Excluir lote</button></td></tr>';
    }).join('');
  }

  document.getElementById('lots-body').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var del = btn.getAttribute('data-del'), rm = btn.getAttribute('data-rmphoto'), ph = btn.getAttribute('data-photo');
    if (del) {
      var lot = lotsById[del];
      if (!confirm('Excluir definitivamente o lote ' + (lot ? lot.n + ' — ' + lot.title : del) + '? Os lances dele também serão apagados.')) return;
      A.removeLot(Number(del)).then(renderAll, function (err) { alert('Não foi possível excluir: ' + errText(err)); });
    } else if (rm) {
      A.removeCover(lotsById[rm]).then(renderAll, function (err) { alert('Não foi possível remover: ' + errText(err)); });
    } else if (ph) {
      pickPhotoFor(lotsById[ph]);
    }
  });

  // ---- Fotos: redimensiona no navegador e envia ao bucket lot-photos ----
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
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  var hiddenFile = document.createElement('input');
  hiddenFile.type = 'file';
  hiddenFile.accept = 'image/*';
  hiddenFile.style.display = 'none';
  document.body.appendChild(hiddenFile);
  function pickPhotoFor(lot) {
    if (!lot) return;
    hiddenFile.value = '';
    hiddenFile.onchange = function () {
      var f = hiddenFile.files[0];
      if (!f) return;
      readImageScaled(f, 1600, function (blob) {
        if (!blob) { alert('Não foi possível ler a imagem.'); return; }
        A.uploadCover(lot, blob).then(renderAll, function (err) { alert('Falha no envio da foto: ' + errText(err)); });
      });
    };
    hiddenFile.click();
  }

  function renderAll() {
    var lots = loadLots().then(function () { buildWins(); drawLots(); drawWins(); });
    var cl = loadClients();
    var done = Promise.all([lots, cl]).then(function (r) { if (r[1]) drawClients(); });
    return Promise.all([renderStats(), renderBids(), renderViews(), done]).catch(function (err) {
      console.error(err);
    });
  }

  // Adicionar lote (publicado imediatamente; encerra em 48 h)
  var addForm = document.getElementById('form-add-lot');
  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = document.getElementById('add-msg');
    var cat = document.getElementById('a-cat').value;
    var title = document.getElementById('a-title').value.trim();
    var price = parseInt(document.getElementById('a-price').value, 10) || 0;
    if (!title || price <= 0) {
      msg.textContent = 'Informe o título e um lance inicial maior que zero.'; msg.className = 'form__msg form__msg--err'; return;
    }
    var mediaByCat = { carro: 'c2', moto: 'm1', pesado: 'p1', nautico: 'c1' };
    var ends = new Date(Date.now() + 48 * 3600000);
    var dd = String(ends.getDate()).padStart(2, '0') + '/' + String(ends.getMonth() + 1).padStart(2, '0');
    var row = {
      title: title,
      category: cat,
      year: document.getElementById('a-year').value.trim() || null,
      km: document.getElementById('a-km').value.trim() || null,
      city: document.getElementById('a-city').value.trim() || null,
      price: price,
      media: mediaByCat[cat] || 'c1',
      auction_label: 'Leilão cadastrado no painel — ' + dd,
      auction_date: ends.toISOString().slice(0, 10),
      ends_at: ends.toISOString(),
      ends_label: '+48h',
      status: 'published'
    };
    var photoFile = document.getElementById('a-photo').files[0];
    var submit = addForm.querySelector('[type="submit"]');
    submit.disabled = true;
    A.addLot(row).then(function (created) {
      if (!photoFile) return created;
      return new Promise(function (resolve) { readImageScaled(photoFile, 1600, resolve); }).then(function (blob) {
        return blob ? A.uploadCover({ id: created.id, photos: [] }, blob).then(function () { return created; }) : created;
      });
    }).then(function () {
      addForm.reset();
      msg.textContent = 'Lote adicionado e publicado! Ele já aparece na listagem pública.';
      msg.className = 'form__msg form__msg--ok';
      renderAll();
    }, function (err) {
      msg.textContent = 'Não foi possível adicionar: ' + errText(err);
      msg.className = 'form__msg form__msg--err';
    }).then(function () { submit.disabled = false; });
  });

  // ---- Atualização automática da tela ----
  var viewTimer = null;
  var cbView = document.getElementById('auto-view');
  var selInt = document.getElementById('auto-interval');
  var status = document.getElementById('auto-status');
  function restartTimers() {
    if (viewTimer) { clearInterval(viewTimer); viewTimer = null; }
    var ms = Math.max(5000, parseInt(selInt.value, 10) || 10000);
    if (cbView.checked) viewTimer = setInterval(function () { if (!document.hidden) renderAll(); }, ms);
    status.textContent = cbView.checked ? 'Ativo: tela atualizando a cada ' + (ms / 1000) + 's (KPIs, visualizações, arremates, clientes e lances).' : 'Atualização automática parada.';
  }
  cbView.addEventListener('change', restartTimers);
  selInt.addEventListener('change', restartTimers);

  document.getElementById('admin-logout').addEventListener('click', function (e) {
    e.preventDefault();
    if (viewTimer) clearInterval(viewTimer);
    window.NLAdmin.logout().then(function () { location.href = 'admin-login.html'; });
  });
})();
