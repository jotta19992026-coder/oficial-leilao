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

  // ---- Clientes (admin_clients) ----
  var clients = [];
  var MIGRATION_HINT = 'Execute supabase/002_clientes_admin.sql no SQL Editor do Supabase para liberar esta lista.';
  function fmtDate(v) { return v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'; }
  function money(v) { return v == null ? '—' : window.NL_BRL(Math.round(Number(v))); }
  function clientMatches(c, q) {
    if (!q) return true;
    if ([c.name, c.email, c.cpf, c.phone, c.address].join(' ').toLowerCase().indexOf(q) > -1) return true;
    var digits = q.replace(/\D/g, '');
    return !!digits && (String(c.cpf || '') + String(c.phone || '')).replace(/\D/g, '').indexOf(digits) > -1;
  }
  function drawClients() {
    var q = (document.getElementById('clients-search').value || '').trim().toLowerCase();
    var list = clients.filter(function (c) { return clientMatches(c, q); });
    document.getElementById('clients-body').innerHTML = list.length
      ? list.map(function (c) {
          return '<tr><td>' + esc(c.name) + (c.role === 'admin' ? ' <span class="chip">admin</span>' : '') + '</td>' +
            '<td>' + esc(c.email) + '</td><td class="nowrap">' + esc(c.cpf || '—') + '</td><td class="nowrap">' + esc(c.phone || '—') + '</td>' +
            '<td>' + esc(c.address || '—') + '</td><td class="nowrap">' + fmtDate(c.created_at) + '</td><td class="nowrap">' + fmtDate(c.last_sign_in_at) + '</td>' +
            '<td>' + c.bid_count + '</td><td class="nowrap">' + money(c.max_bid) + '</td><td>' + c.leading_lots + '</td>' +
            '<td><button class="btn btn--ghost btn--sm" data-contract="' + c.id + '" type="button">Contrato</button></td></tr>';
        }).join('')
      : '<tr><td colspan="11" class="muted">' + (clients.length ? 'Nenhum cliente encontrado para a busca.' : 'Nenhum cliente cadastrado ainda.') + '</td></tr>';
  }
  function renderClients() {
    return A.clients().then(function (list) {
      clients = list;
      drawClients();
      fillClientSelect();
    }, function (err) {
      var missing = /admin_clients|schema cache|PGRST202/i.test(errText(err) + ' ' + (err && err.code));
      document.getElementById('clients-body').innerHTML = '<tr><td colspan="11" class="muted">' +
        esc(missing ? MIGRATION_HINT : 'Não foi possível carregar os clientes: ' + errText(err)) + '</td></tr>';
      document.getElementById('k-client').innerHTML = '<option value="">' + esc(missing ? 'Rode a migração 002 primeiro' : 'Erro ao carregar') + '</option>';
    });
  }
  document.getElementById('clients-search').addEventListener('input', drawClients);
  document.getElementById('clients-body').addEventListener('click', function (e) {
    var b = e.target.closest('[data-contract]');
    if (!b) return;
    var sel = document.getElementById('k-client');
    sel.value = b.getAttribute('data-contract');
    sel.dispatchEvent(new Event('change'));
    document.getElementById('form-contract').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Exportação CSV (abre no Excel com acentos: BOM + ponto e vírgula).
  document.getElementById('clients-csv').addEventListener('click', function () {
    var head = ['Nome', 'E-mail', 'CPF', 'Telefone', 'Endereço', 'Cadastro', 'Último acesso', 'Lances', 'Maior lance', 'Lotes liderando'];
    var rows = clients.map(function (c) {
      return [c.name, c.email, c.cpf, c.phone, c.address, fmtDate(c.created_at), fmtDate(c.last_sign_in_at), c.bid_count,
        c.max_bid == null ? '' : Number(c.max_bid).toFixed(2).replace('.', ','), c.leading_lots];
    });
    var csv = [head].concat(rows).map(function (r) {
      return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'clientes-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });

  // ---- Contrato pelo painel ----
  var kClient = document.getElementById('k-client');
  var kLot = document.getElementById('k-lot');
  var kValue = document.getElementById('k-value');
  var kInfo = document.getElementById('k-info');
  var clientLots = [];
  function fillClientSelect() {
    var keep = kClient.value;
    kClient.innerHTML = '<option value="">Selecione…</option>' + clients.filter(function (c) { return c.role !== 'admin'; }).map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name + ' — ' + c.email) + '</option>';
    }).join('');
    if (keep) kClient.value = keep;
  }
  kClient.addEventListener('change', function () {
    clientLots = [];
    kInfo.textContent = '';
    kValue.value = '';
    if (!kClient.value) { kLot.innerHTML = '<option value="">Selecione um cliente</option>'; return; }
    kLot.innerHTML = '<option value="">Carregando…</option>';
    A.clientLots(kClient.value).then(function (list) {
      clientLots = list;
      kLot.innerHTML = list.length
        ? list.map(function (l) {
            return '<option value="' + l.lot_id + '">' + esc('Lote ' + String(l.n || l.lot_id).padStart(2, '0') + ' — ' + l.title +
              (l.is_leading ? ' (vencendo)' : '')) + '</option>';
          }).join('')
        : '<option value="">Este cliente ainda não deu lances</option>';
      kLot.dispatchEvent(new Event('change'));
    }, function (err) { kLot.innerHTML = '<option value="">Erro: ' + esc(errText(err)) + '</option>'; });
  });
  kLot.addEventListener('change', function () {
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
    var c = clients.filter(function (x) { return x.id === kClient.value; })[0];
    var l = clientLots.filter(function (x) { return String(x.lot_id) === kLot.value; })[0];
    if (!c || !l) { msg.textContent = 'Selecione o cliente e o lote.'; msg.className = 'form__msg form__msg--err'; return; }
    if (!l.is_leading && !confirm('Este cliente não tem o maior lance do lote. Gerar o contrato mesmo assim?')) return;
    window.NLContractPrint({
      numero: document.getElementById('k-number').value.trim(),
      nome: c.name, cpf: c.cpf, email: c.email, tel: c.phone, endereco: c.address,
      lote: 'Lote ' + String(l.n || l.lot_id).padStart(2, '0') + ' — ' + l.title + (l.auction_label ? ' (' + l.auction_label + ')' : ''),
      valor: Number(kValue.value) || 0,
      data: l.ends_at ? new Date(l.ends_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
    });
    msg.textContent = 'Contrato aberto em nova janela para imprimir ou salvar em PDF.';
    msg.className = 'form__msg form__msg--ok';
  });

  function renderBids() {
    return A.bids().then(function (bids) {
      document.getElementById('bids-body').innerHTML = bids.length
        ? bids.map(function (b) {
            var lot = b.lots ? 'Lote ' + String(b.lots.n || b.lot_id).padStart(2, '0') + ' — ' + b.lots.title : '#' + b.lot_id;
            var who = b.profiles ? (b.profiles.name + ' <' + b.profiles.email + '>') : '—';
            return '<tr><td>' + esc(lot) + '</td><td>' + esc(who) + '</td><td>' + window.NL_BRL(Number(b.amount)) + '</td><td>' +
              new Date(b.created_at).toLocaleString('pt-BR') + '</td></tr>';
          }).join('')
        : '<tr><td colspan="4" class="muted">Nenhum lance registrado ainda.</td></tr>';
    });
  }

  function renderLots() {
    return A.lots().then(function (lots) {
      lotsById = {};
      lots.forEach(function (l) { lotsById[l.id] = l; });
      var body = document.getElementById('lots-body');
      body.innerHTML = lots.map(function (l) {
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
    });
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
    return Promise.all([renderStats(), renderClients(), renderBids(), renderLots()]).catch(function (err) {
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
    status.textContent = cbView.checked ? 'Ativo: tela atualizando a cada ' + (ms / 1000) + 's.' : 'Atualização automática parada.';
  }
  cbView.addEventListener('change', restartTimers);
  selInt.addEventListener('change', restartTimers);

  document.getElementById('admin-logout').addEventListener('click', function (e) {
    e.preventDefault();
    if (viewTimer) clearInterval(viewTimer);
    window.NLAdmin.logout().then(function () { location.href = 'admin-login.html'; });
  });
})();
