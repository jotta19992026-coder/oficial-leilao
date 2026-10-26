// Leilão Oficial — componente de card de lote (usado na home e na listagem).
(function () {
  'use strict';

  // "Você" quando o maior lance do lote é do usuário logado (a RLS só expõe os próprios lances).
  function winnerOf(lot) {
    if (!window.NLStore || !lot.bids) return '';
    var mine = window.NLStore.bids().filter(function (x) { return x.lotId === lot.id; });
    var top = mine.reduce(function (m, b) { return Math.max(m, b.amount); }, 0);
    return top && top >= lot.price ? 'Você' : '';
  }

  var CTA = {
    carro: 'Ver veículo',
    moto: 'Ver moto',
    pesado: 'Ver veículo',
    nautico: 'Ver embarcação',
    imovel: 'Ver imóvel',
    equipamento: 'Ver equipamento'
  };

  // Selo de patrocinadores (definido em site.js); cada card começa num logo diferente.
  function sponsorBadge(lot) {
    return window.NLSponsorBadge ? window.NLSponsorBadge(lot.n) : '';
  }

  // Monta o card no padrão: status, Lote, Data/Hora, quem vence e maior lance.
  window.NLCard = function (lot) {
    var di = window.NL_DATEINFO(lot);
    var w = winnerOf(lot);
    return '<article class="lot lot--' + di.status.k + '" data-cat="' + lot.cat + '">' +
      '<a class="lot__media lot__media--' + lot.media + '" href="lote.html?id=' + lot.id + '" data-lot-id="' + lot.id + '">' +
      '<img class="lot__img" src="' + window.NL_IMG_FOR(lot) + '" alt="' + lot.title + '" loading="lazy">' +
      '<span class="lot__badge lot__badge--' + di.status.k + '">' + di.status.l + '</span>' +
      (di.status.k === 'open' ? '<span class="lot__live"><span class="lot__live-dot"></span>Ao vivo</span>' : '') +
      '<span class="lot__tag">Lote ' + lot.n + '</span>' +
      '</a>' +
      '<div class="lot__body">' +
      '<div class="lot__head">' +
      '<h3><a href="lote.html?id=' + lot.id + '">' + lot.title + '</a></h3>' +
      sponsorBadge(lot) +
      '</div>' +
      '<ul class="lot__facts">' +
      '<li><span>Lote</span><strong>' + lot.n + '</strong></li>' +
      '<li><span>Data / Hora</span><strong>' + di.label + '</strong></li>' +
      '<li><span>' + (w ? 'Vencendo' : 'Categoria') + '</span><strong>' + (w || lot.catLabel) + '</strong></li>' +
      '</ul>' +
      '<div class="lot__row">' +
      '<span class="lot__pricewrap"><span class="lot__price">' + window.NL_BRL(lot.price) + '</span><span class="lot__pricelabel">Maior lance</span></span>' +
      '<span class="lot__timer"' + (lot.endsAt ? ' data-ends-at="' + lot.endsAt + '"' : ' data-ends="' + lot.ends + '"') + '>—</span>' +
      '</div>' +
      '<a class="btn btn--block" href="lote.html?id=' + lot.id + '">' + (CTA[lot.cat] || 'Ver detalhes') + '</a>' +
      '</div></article>';
  };

  // Troca automática das fotos dos cards visíveis, com fade e pausa no hover.
  // A rotação continua mesmo com "prefers-reduced-motion"; nesse caso o CSS
  // remove apenas o zoom, mantendo a troca suave por opacidade.
  function photosFor(id) {
    var l = window.NLStore ? window.NLStore.lot(id) : null;
    if (!l) return [];
    return (l.photos && l.photos.length) ? l.photos : (l.photo ? [l.photo] : []);
  }

  function swap(img, src) {
    var pre = new Image();
    pre.onload = function () {
      img.classList.add('is-swapping');
      window.setTimeout(function () {
        img.src = src;
        img.classList.remove('is-swapping');
      }, 190);
    };
    pre.src = src;
  }

  var state = new WeakMap();
  var seq = 0;
  var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var st = state.get(entry.target);
      if (!st) return;
      if (entry.isIntersecting && !st.visible) {
        st.next = Math.max(st.next, Date.now() + 700 + (seq++ % 4) * 600);
      }
      st.visible = entry.isIntersecting;
    });
  }, { rootMargin: '80px' }) : null;

  function init(media, now) {
    var st = {
      pos: 0,
      visible: !io,
      hover: false,
      next: now + 1400 + (seq++ % 6) * 700
    };
    state.set(media, st);
    media.addEventListener('mouseenter', function () { st.hover = true; });
    media.addEventListener('mouseleave', function () {
      st.hover = false;
      st.next = Date.now() + 900;
    });
    if (io) io.observe(media);
    return st;
  }

  window.setInterval(function () {
    if (document.hidden) return;
    var medias = document.querySelectorAll('.lot__media[data-lot-id]');
    var now = Date.now();
    Array.prototype.forEach.call(medias, function (media) {
      var st = state.get(media) || init(media, now);
      if (!st.visible || st.hover || now < st.next) return;
      var photos = photosFor(media.getAttribute('data-lot-id'));
      if (photos.length < 2) return;
      var img = media.querySelector('.lot__img');
      if (!img) return;
      st.pos = (st.pos + 1) % photos.length;
      st.next = now + 4200;
      if (photos[st.pos] !== img.getAttribute('src')) swap(img, photos[st.pos]);
    });
  }, 700);
})();
