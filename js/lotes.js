// Norte Leilões — listagem de lotes com filtros laterais (categoria, preço, data) + busca.
(function () {
  'use strict';
  var grid = document.getElementById('lots-grid');
  if (!grid) return;
  grid.innerHTML = '<p class="empty">Carregando lotes…</p>';

  // Renderiza depois que os lotes chegam do Supabase (ou do catálogo local, se offline).
  (window.NLStore ? window.NLStore.ready : Promise.resolve()).then(function () {

    function allLots() { return window.NLStore ? window.NLStore.lots() : (window.NL_LOTS || []); }
    // Mesma data usada na agenda/cards (auction_date do banco), não o texto antigo do rótulo.
    function dateOf(lot) { return window.NL_DATEINFO(lot).dm || ''; }
    var state = { cats: [], price: '', date: '', q: '', sort: 'default' };

    var card = window.NLCard;

    function inPrice(p) {
      if (!state.price) return true;
      var parts = state.price.split('-');
      var min = parseInt(parts[0], 10) || 0;
      var max = parts[1] === '' ? Infinity : (parseInt(parts[1], 10) || Infinity);
      return p >= min && p <= max;
    }

    function render() {
      var list = allLots().filter(function (l) {
        var okCat = !state.cats.length || state.cats.indexOf(l.cat) > -1;
        var okQ = !state.q || (l.title + ' ' + l.catLabel).toLowerCase().indexOf(state.q) > -1;
        var okPrice = inPrice(l.price);
        var okDate = !state.date || dateOf(l) === state.date;
        return okCat && okQ && okPrice && okDate;
      });
      if (state.sort === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
      else if (state.sort === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
      else if (state.sort === 'name') list.sort(function (a, b) { return a.title.localeCompare(b.title, 'pt-BR'); });
      var count = document.getElementById('lots-count');
      if (count) count.textContent = list.length + (list.length === 1 ? ' lote encontrado' : ' lotes encontrados');
      grid.innerHTML = list.length ? list.map(card).join('') :
        '<p class="empty">Nenhum lote encontrado para os filtros selecionados.</p>';
      if (window.NLTimers) window.NLTimers.scan();
    }

    // Popular datas disponíveis (ordem cronológica, com a mesma data da agenda/cards)
    var dateSel = document.getElementById('f-date');
    if (dateSel) {
      var seenDates = {};
      var dateList = [];
      allLots().forEach(function (l) {
        var di = window.NL_DATEINFO(l);
        if (di.dm && !seenDates[di.dm]) { seenDates[di.dm] = true; dateList.push(di); }
      });
      dateList.sort(function (a, b) { return a.sortKey - b.sortKey; });
      dateList.forEach(function (di) { var o = document.createElement('option'); o.value = di.dm; o.textContent = di.dm; dateSel.appendChild(o); });
      dateSel.addEventListener('change', function () { state.date = dateSel.value; render(); });
    }

    // Categorias (checkboxes)
    var catBoxes = document.querySelectorAll('[data-f="cat"]');
    catBoxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        state.cats = Array.prototype.filter.call(catBoxes, function (c) { return c.checked; }).map(function (c) { return c.value; });
        render();
      });
    });

    // Preço
    var priceSel = document.getElementById('f-price');
    if (priceSel) priceSel.addEventListener('change', function () { state.price = priceSel.value; render(); });

    // Ordenação
    var sortSel = document.getElementById('f-sort');
    if (sortSel) sortSel.addEventListener('change', function () { state.sort = sortSel.value; render(); });

    // Busca textual
    var search = document.getElementById('lots-search');
    if (search) {
      search.addEventListener('submit', function (e) { e.preventDefault(); });
      var input = search.querySelector('input');
      input.addEventListener('input', function () { state.q = input.value.trim().toLowerCase(); render(); });
    }

    // Limpar
    var clear = document.getElementById('filters-clear');
    if (clear) clear.addEventListener('click', function () {
      state = { cats: [], price: '', date: '', q: '' };
      catBoxes.forEach(function (c) { c.checked = false; });
      if (priceSel) priceSel.value = '';
      if (dateSel) dateSel.value = '';
      if (search) search.querySelector('input').value = '';
      render();
    });

    // Pré-filtros vindos da URL (?cat= / ?q= / ?date=)
    var params = new URLSearchParams(location.search);
    var pc = params.get('cat');
    if (pc) {
      var cb = document.querySelector('[data-f="cat"][value="' + pc + '"]');
      if (cb) { cb.checked = true; state.cats = [pc]; }
    }
    var pq = params.get('q');
    if (pq && search) { state.q = pq.toLowerCase(); search.querySelector('input').value = pq; }
    var pd = params.get('date');
    if (pd && dateSel) { dateSel.value = pd; state.date = pd; }

    render();
  });
})();
