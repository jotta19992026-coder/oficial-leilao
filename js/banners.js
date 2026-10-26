// Leilão Oficial — slider de banners + carrossel de lotes em destaque (página inicial).
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Slider de banners ----
  (function () {
    var track = document.getElementById('banners-track');
    if (!track) return;
    var viewport = track.parentElement;
    var slides = track.children;
    var total = slides.length;
    var dotsWrap = document.getElementById('banners-dots');
    var i = 0, timer = null;

    for (var d = 0; d < total; d++) {
      var dot = document.createElement('button');
      dot.className = 'banners__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Banner ' + (d + 1));
      (function (idx) { dot.addEventListener('click', function () { go(idx); restart(); }); })(d);
      dotsWrap.appendChild(dot);
    }
    var dots = dotsWrap.children;

    function sizeViewport() {
      var slide = slides[i];
      if (!viewport || !slide) return;
      var h = slide.getBoundingClientRect().height;
      if (h > 0) viewport.style.height = Math.round(h) + 'px';
    }
    function go(n) {
      i = (n + total) % total;
      track.style.transform = 'translateX(' + (-i * 100) + '%)';
      for (var k = 0; k < dots.length; k++) dots[k].classList.toggle('is-active', k === i);
      sizeViewport();
    }
    function next() { go(i + 1); }
    function prev() { go(i - 1); }
    function restart() {
      if (timer) clearInterval(timer);
      // Avanço automático contínuo (todos os slides têm a mesma altura); só pula com a aba oculta.
      timer = setInterval(function () {
        if (document.hidden) return;
        next();
      }, 4000); // troca a cada 4 s
    }

    var resizeTick = 0;
    window.addEventListener('resize', function () {
      if (resizeTick) cancelAnimationFrame(resizeTick);
      resizeTick = requestAnimationFrame(sizeViewport);
    });
    window.addEventListener('load', sizeViewport);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeViewport);

    document.getElementById('banner-next').addEventListener('click', function () { next(); restart(); });
    document.getElementById('banner-prev').addEventListener('click', function () { prev(); restart(); });
    go(0); restart();
  })();

  // ---- Carrosséis de lotes: setas + avanço automático ----
  (function () {
    var tracks = [].slice.call(document.querySelectorAll('.lot-slider__track,.auction-row'));
    if (!tracks.length) return;

    function step(track) {
      var card = track.querySelector('.lot');
      return card ? card.getBoundingClientRect().width + 20 : 300;
    }

    tracks.forEach(function (track, idx) {
      var prev = track.id === 'featured-grid' ? document.getElementById('lots-prev') : null;
      var next = track.id === 'featured-grid' ? document.getElementById('lots-next') : null;
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(track) * 2, behavior: 'smooth' }); });
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(track) * 2, behavior: 'smooth' }); });

      if (reduce) return;
      var paused = false;
      ['mouseenter', 'focusin', 'touchstart', 'pointerdown'].forEach(function (ev) {
        track.addEventListener(ev, function () { paused = true; }, { passive: true });
      });
      ['mouseleave', 'focusout', 'touchend'].forEach(function (ev) {
        track.addEventListener(ev, function () { paused = false; }, { passive: true });
      });

      // Avança um card por vez e volta ao início ao chegar no fim.
      window.setInterval(function () {
        if (paused || document.hidden) return;
        var max = track.scrollWidth - track.clientWidth;
        if (max <= 4) return;
        if (track.scrollLeft >= max - 2) track.scrollTo({ left: 0, behavior: 'smooth' });
        else track.scrollBy({ left: step(track), behavior: 'smooth' });
      }, 4200 + idx * 350);
    });
  })();
})();
