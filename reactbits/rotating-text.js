(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initRotatingText(root) {
    var raw = root.getAttribute('data-texts') || root.textContent || '';
    var texts = raw.split('|').map(function (item) { return item.trim(); }).filter(Boolean);
    if (!texts.length) return;

    var interval = parseInt(root.getAttribute('data-rotation-interval') || '2000', 10);
    var stagger = parseFloat(root.getAttribute('data-stagger-duration') || '0.025') * 1000;
    var staggerFrom = root.getAttribute('data-stagger-from') || 'last';
    var direction = root.getAttribute('data-direction') === 'down' ? 'down' : 'up';
    var highlight = root.getAttribute('data-highlight') !== 'false';
    var auto = root.getAttribute('data-auto') !== 'false';
    var loop = root.getAttribute('data-loop') !== 'false';
    var pauseOnHover = root.getAttribute('data-pause-on-hover') === 'true';
    var splitBy = root.getAttribute('data-split-by') || 'characters';
    if (splitBy === 'characters' && /[\u0600-\u06FF]/.test(raw)) splitBy = 'words';

    var current = 0;
    var timer = 0;
    var animTimer = 0;
    var hovered = false;
    var observer = null;

    if (highlight) {
      root.classList.add('is-highlight');
      if (root.getAttribute('data-highlight-color')) {
        root.style.setProperty('--rb-highlight', root.getAttribute('data-highlight-color'));
      }
    }

    var sr = document.createElement('span');
    sr.className = 'rb-rotating-text__sr';
    var content = document.createElement('span');
    content.className = 'rb-rotating-text__content';
    content.setAttribute('aria-hidden', 'true');
    root.textContent = '';
    root.appendChild(sr);
    root.appendChild(content);

    function pieces(text) {
      var fragment = document.createDocumentFragment();
      var words = text.split(' ');
      var totalChars = 0;

      words.forEach(function (word, wordIndex) {
        var wordEl = document.createElement('span');
        wordEl.className = 'rb-rotating-text__word';

        if (splitBy === 'words') {
          var wordChar = document.createElement('span');
          wordChar.className = 'rb-rotating-text__char';
          wordChar.textContent = word;
          wordChar.setAttribute('data-index', String(totalChars));
          wordEl.appendChild(wordChar);
          totalChars += 1;
        } else {
          Array.from(word).forEach(function (char) {
            var charEl = document.createElement('span');
            charEl.className = 'rb-rotating-text__char';
            charEl.textContent = char;
            charEl.setAttribute('data-index', String(totalChars));
            wordEl.appendChild(charEl);
            totalChars += 1;
          });
        }

        fragment.appendChild(wordEl);

        if (wordIndex < words.length - 1) {
          var space = document.createElement('span');
          space.className = 'rb-rotating-text__space';
          space.textContent = ' ';
          fragment.appendChild(space);
        }
      });

      return { fragment: fragment, total: totalChars };
    }

    function delayFor(index, total) {
      if (staggerFrom === 'first') return index * stagger;
      if (staggerFrom === 'center') return Math.abs((total - 1) / 2 - index) * stagger;
      return (total - 1 - index) * stagger;
    }

    function updateWidth() {
      if (!highlight) return;
      requestAnimationFrame(function () {
        root.style.width = content.scrollWidth + 1 + 'px';
      });
    }

    function render(index) {
      var built = pieces(texts[index]);
      content.replaceChildren(built.fragment);
      sr.textContent = texts[index];
      updateWidth();
      return Array.prototype.slice.call(content.querySelectorAll('.rb-rotating-text__char'));
    }

    function animateIn(chars) {
      if (reduceMotion) return;
      var total = chars.length;
      chars.forEach(function (char, index) {
        var from = direction === 'down' ? '-105%' : '105%';
        char.animate(
          [
            { transform: 'translateY(' + from + ')', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 }
          ],
          {
            duration: 480,
            delay: delayFor(index, total),
            easing: 'cubic-bezier(.22,1,.36,1)',
            fill: 'both'
          }
        );
      });
    }

    function animateOut(chars, done) {
      var total = chars.length;
      var maxDelay = 0;

      if (reduceMotion) {
        done();
        return;
      }

      chars.forEach(function (char, index) {
        var delay = delayFor(index, total);
        maxDelay = Math.max(maxDelay, delay);
        char.animate(
          [
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(-120%)', opacity: 0 }
          ],
          {
            duration: 280,
            delay: delay,
            easing: 'cubic-bezier(.55,0,1,.45)',
            fill: 'both'
          }
        );
      });

      window.clearTimeout(animTimer);
      animTimer = window.setTimeout(done, 280 + maxDelay + 35);
    }

    function isPaused() {
      return document.hidden || (pauseOnHover && hovered);
    }

    function schedule() {
      window.clearTimeout(timer);
      if (!auto || reduceMotion || isPaused()) return;
      timer = window.setTimeout(function () {
        if (isPaused()) {
          schedule();
          return;
        }
        var next = current + 1;
        if (next >= texts.length) {
          if (!loop) return;
          next = 0;
        }
        goTo(next);
        schedule();
      }, interval);
    }

    function goTo(index) {
      if (index === current) return;
      var oldChars = Array.prototype.slice.call(content.querySelectorAll('.rb-rotating-text__char'));
      current = index;

      animateOut(oldChars, function () {
        var chars = render(current);
        animateIn(chars);
      });
    }

    if (highlight && 'ResizeObserver' in window) {
      observer = new ResizeObserver(updateWidth);
      observer.observe(content);
    }

    if (pauseOnHover) {
      root.addEventListener('mouseenter', function () {
        hovered = true;
        window.clearTimeout(timer);
      });
      root.addEventListener('mouseleave', function () {
        hovered = false;
        schedule();
      });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) window.clearTimeout(timer);
      else schedule();
    });

    window.addEventListener('resize', updateWidth, { passive: true });

    render(0);
    animateIn(Array.prototype.slice.call(content.querySelectorAll('.rb-rotating-text__char')));
    schedule();
  }

  function boot() {
    Array.prototype.slice.call(document.querySelectorAll('[data-rotating-text]')).forEach(initRotatingText);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
