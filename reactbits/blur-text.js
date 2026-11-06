(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initBlurText(element) {
    var text = (element.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;

    var animateBy = element.getAttribute('data-animate-by') || 'words';
    var direction = element.getAttribute('data-direction') || 'top';
    var delay = parseFloat(element.getAttribute('data-delay') || '45');
    var stepDuration = parseFloat(element.getAttribute('data-step-duration') || '0.55');
    var blur = parseFloat(element.getAttribute('data-blur') || '10');
    var distance = parseFloat(element.getAttribute('data-distance') || '50');
    var staggerFrom = element.getAttribute('data-stagger-from') || 'start';
    var trigger = element.getAttribute('data-trigger') || 'view';
    var threshold = parseFloat(element.getAttribute('data-threshold') || '0.12');
    var rootMargin = element.getAttribute('data-root-margin') || '0px 0px -8% 0px';

    var axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
    var sign = direction === 'top' || direction === 'left' ? -1 : 1;

    var sr = document.createElement('span');
    sr.className = 'rb-blur-text__sr';
    sr.textContent = text;

    var wrapper = document.createElement('span');
    wrapper.className = 'rb-blur-text';
    wrapper.style.setProperty('--rb-blur', blur + 'px');
    wrapper.style.setProperty('--rb-duration', stepDuration + 's');
    wrapper.setAttribute('aria-hidden', 'true');

    var pieces = [];
    var words = text.split(' ');
    var index = 0;

    words.forEach(function (word, wordIndex) {
      if (animateBy === 'characters') {
        Array.from(word).forEach(function (char) {
          pieces.push({ text: char, rank: index++, space: false });
        });
      } else {
        pieces.push({ text: word, rank: index++, space: false });
      }
      if (wordIndex < words.length - 1) {
        pieces.push({ text: '\u00A0', rank: index, space: true });
        if (animateBy === 'characters') index += 1;
      }
    });

    var total = pieces.length;

    function rankFor(rank) {
      if (staggerFrom === 'end') return total - 1 - rank;
      if (staggerFrom === 'center') return Math.abs((total - 1) / 2 - rank);
      return rank;
    }

    pieces.forEach(function (piece) {
      if (piece.space) {
        wrapper.appendChild(document.createTextNode(' '));
        return;
      }
      var word = document.createElement('span');
      word.className = 'rb-blur-text__word';
      word.textContent = piece.text;
      word.style.setProperty('--rb-delay', Math.round(rankFor(piece.rank) * delay) + 'ms');
      if (axis === 'x') {
        word.style.setProperty('--rb-x', sign * distance + 'px');
        word.style.setProperty('--rb-y', '0px');
      } else {
        word.style.setProperty('--rb-x', '0px');
        word.style.setProperty('--rb-y', sign * distance + 'px');
      }
      wrapper.appendChild(word);
    });

    element.textContent = '';
    element.appendChild(sr);
    element.appendChild(wrapper);

    function reveal() {
      wrapper.classList.add('is-in');
    }

    if (reduceMotion || trigger === 'load') {
      reveal();
      return;
    }

    if (!('IntersectionObserver' in window)) {
      reveal();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal();
        observer.unobserve(entry.target);
      });
    }, { threshold: threshold, rootMargin: rootMargin });

    observer.observe(element);
  }

  function boot() {
    Array.prototype.slice.call(document.querySelectorAll('[data-blur-text]')).forEach(initBlurText);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
