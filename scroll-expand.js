(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(value) {
    var x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function init(root) {
    var track = root.querySelector('.scroll-expand__track');
    var stage = root.querySelector('.scroll-expand__stage');
    var frame = root.querySelector('.scroll-expand__frame');
    var media = root.querySelector('.scroll-expand__media');
    var scrim = root.querySelector('.scroll-expand__scrim');
    var overlay = root.querySelector('.scroll-expand__overlay');
    var title = root.querySelector('.scroll-expand__title');
    var hint = root.querySelector('.scroll-expand__hint');

    if (!track || !stage || !frame) {
      return;
    }

    function readNumber(name, fallback) {
      var value = parseFloat(root.getAttribute(name));
      return isFinite(value) ? value : fallback;
    }

    var startWidth = clamp(readNumber('data-start-width', 42), 10, 100);
    var startHeight = clamp(readNumber('data-start-height', 58), 10, 100);
    var startRadius = Math.max(0, readNumber('data-start-radius', 24));
    var endRadius = Math.max(0, readNumber('data-end-radius', 0));
    var mediaZoom = Math.max(1, readNumber('data-media-zoom', 1.35));
    var scrollDistance = Math.max(0.1, readNumber('data-scroll-distance', 1.2));
    var holdDistance = Math.max(0, readNumber('data-hold-distance', 0.35));
    var smoothing = clamp(readNumber('data-smoothing', 0.1), 0.02, 1);
    var overlayScrim = clamp(readNumber('data-overlay-scrim', 0.45), 0, 1);
    var enabled = root.getAttribute('data-enabled') !== 'false';
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var current = 0;
    var target = 0;
    var stageHeight = 0;
    var animationFrame = 0;
    var resizeTimer = 0;
    var overlayActive = null;

    function setOverlayState(visible) {
      if (!overlay || visible === overlayActive) {
        return;
      }

      overlayActive = visible;

      if (visible) {
        overlay.removeAttribute('inert');
        overlay.removeAttribute('aria-hidden');
      } else {
        overlay.setAttribute('inert', '');
        overlay.setAttribute('aria-hidden', 'true');
      }
    }

    function applyProgress(progress) {
      var x = clamp(progress, 0, 1);
      var s = smoothstep(x);
      var insetY = ((100 - startHeight) / 2) * (1 - s);
      var insetX = ((100 - startWidth) / 2) * (1 - s);
      var radius = startRadius + (endRadius - startRadius) * s;
      var overlayIn = clamp((x - 0.68) / 0.32, 0, 1);
      var overlayEase = smoothstep(overlayIn);
      var titleOut = smoothstep(clamp(x / 0.82, 0, 1));
      var hintOut = clamp(x / 0.18, 0, 1);

      frame.style.clipPath =
        'inset(' + insetY + '% ' + insetX + '% ' + insetY + '% ' + insetX + '% round ' + radius + 'px)';

      if (media) {
        media.style.transform = 'scale(' + (1 + (mediaZoom - 1) * s) + ')';
      }

      if (scrim) {
        scrim.style.opacity = String(s * overlayScrim);
      }

      if (overlay) {
        overlay.style.opacity = String(overlayEase);
        overlay.style.transform = 'translateY(' + (28 * (1 - overlayEase)) + 'px)';
        overlay.style.pointerEvents = x > 0.82 ? 'auto' : 'none';
        setOverlayState(x > 0.55);
      }

      if (title) {
        title.style.opacity = String(1 - titleOut);
        title.style.transform =
          'translateY(' + (-18 * titleOut) + 'px) scale(' + (1 + 0.04 * titleOut) + ')';
      }

      if (hint) {
        hint.style.opacity = String(1 - hintOut);
        hint.style.transform = 'translateY(' + (10 * hintOut) + 'px)';
      }
    }

    function readProgress() {
      var span = stageHeight * scrollDistance;

      if (span <= 0) {
        return 0;
      }

      return clamp(-track.getBoundingClientRect().top / span, 0, 1);
    }

    function stopAnimation() {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    }

    function animate() {
      animationFrame = 0;

      var difference = target - current;

      if (Math.abs(difference) < 0.0005) {
        current = target;
        applyProgress(current);
        return;
      }

      current += difference * smoothing;
      applyProgress(current);
      animationFrame = requestAnimationFrame(animate);
    }

    function requestFrame() {
      if (!animationFrame) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    function measure() {
      stageHeight = window.innerHeight;
      stage.style.height = stageHeight + 'px';
      stage.style.setProperty(
        '--se-title-size',
        clamp(root.clientWidth * 0.075, 34, 88) + 'px'
      );

      if (!enabled) {
        track.style.height = stageHeight + 'px';
        target = 0;
        current = 0;
        applyProgress(0);
        return;
      }

      if (reduceMotion) {
        track.style.height = stageHeight + 'px';
        target = 1;
        current = 1;
        applyProgress(1);
        return;
      }

      track.style.height =
        stageHeight * (1 + scrollDistance + holdDistance) + 'px';
      target = readProgress();
      current = target;
      applyProgress(current);
    }

    function onScroll() {
      if (!enabled || reduceMotion) {
        return;
      }

      target = readProgress();
      requestFrame();
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 80);
    }

    measure();
    applyProgress(current);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!animationFrame) {
          measure();
        }
      });
    }

    root.__scrollExpandDestroy = function () {
      stopAnimation();
      clearTimeout(resizeTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }

  var roots = document.querySelectorAll('[data-scroll-expand]');

  Array.prototype.forEach.call(roots, init);
})();
