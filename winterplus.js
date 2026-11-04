(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var header = document.getElementById('siteHeader');
  var navLinks = document.getElementById('navLinks');
  var menuToggle = document.getElementById('menuToggle');
  var navAnchors = navLinks ? Array.prototype.slice.call(navLinks.querySelectorAll('a[href^="#"]')) : [];

  function setScrolled() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 24);
  }
  setScrolled();
  window.addEventListener('scroll', setScrolled, { passive: true });

  function closeMenu() {
    if (!navLinks || !menuToggle) return;
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'فتح القائمة');
    var icon = menuToggle.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-bars';
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', isOpen ? 'إغلاق القائمة' : 'فتح القائمة');
      var icon = menuToggle.querySelector('i');
      if (icon) icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', function (event) {
      if (!navLinks.classList.contains('open')) return;
      if (navLinks.contains(event.target) || menuToggle.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
  }

  if ('IntersectionObserver' in window && navAnchors.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        var hasLink = navAnchors.some(function (link) {
          return link.getAttribute('href') === id;
        });
        if (!hasLink) return;
        navAnchors.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-42% 0px -52% 0px', threshold: 0 });
    document.querySelectorAll('main section[id]').forEach(function (section) {
      spy.observe(section);
    });
  }

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.day-tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.day-panel'));
  var program = document.querySelector('.program');
  var programToggle = document.querySelector('.program-toggle');
  var programStatus = document.getElementById('programStatus');
  var autoInterval = 6000;
  var activeIndex = 0;
  var progressElapsed = 0;
  var progressLast = 0;
  var progressFrame = 0;
  var programInView = false;
  var autoPausedByUser = false;
  var autoPausedByHover = false;
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  tabs.forEach(function (tab, index) {
    if (tab.classList.contains('active')) activeIndex = index;
  });

  function updateProgress(value) {
    tabs.forEach(function (tab, index) {
      tab.style.setProperty('--day-progress', index === activeIndex ? String(value) : '0');
    });
  }

  function updateProgramStatus() {
    if (!programStatus || !tabs[activeIndex]) return;
    var name = tabs[activeIndex].querySelector('.day-name');
    programStatus.textContent = 'البرنامج الحالي: ' + (name ? name.textContent : '');
  }

  function resetProgramClock() {
    progressElapsed = 0;
    progressLast = performance.now();
    updateProgress(0);
  }

  function stopProgramClock() {
    if (progressFrame) {
      cancelAnimationFrame(progressFrame);
      progressFrame = 0;
    }
  }

  function programTick(now) {
    progressFrame = 0;
    var paused = autoPausedByUser || autoPausedByHover || !programInView || document.hidden;

    if (!paused) {
      var delta = now - progressLast;
      if (delta < 0 || delta > 160) delta = 0;
      progressElapsed += delta;

      if (progressElapsed >= autoInterval) {
        progressElapsed = 0;
        var next = (activeIndex + 1) % tabs.length;
        activateDay(tabs[next].getAttribute('data-day'), false);
      }

      updateProgress(Math.min(progressElapsed / autoInterval, 1));
    }

    progressLast = now;
    progressFrame = requestAnimationFrame(programTick);
  }

  function startProgramClock() {
    if (reduceMotion || progressFrame || !tabs.length) return;
    progressLast = performance.now();
    progressFrame = requestAnimationFrame(programTick);
  }

  function activateDay(day, moveFocus) {
    var nextIndex = -1;

    tabs.forEach(function (tab, index) {
      var active = tab.getAttribute('data-day') === String(day);
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
      if (active) nextIndex = index;
      if (active && moveFocus) tab.focus();
    });

    if (nextIndex > -1) activeIndex = nextIndex;

    panels.forEach(function (panel) {
      var active = panel.getAttribute('data-day') === String(day);
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });

    updateProgramStatus();
    resetProgramClock();

    if (hasGSAP && !reduceMotion) {
      var current = document.querySelector('.day-panel[data-day="' + day + '"]');
      if (current) {
        gsap.fromTo(current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
      }
    }
  }

  if (tabs.length) {
    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        activateDay(tab.getAttribute('data-day'), false);
      });
      tab.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        activateDay(tabs[next].getAttribute('data-day'), true);
      });
    });

    updateProgramStatus();

    if (!reduceMotion && tabs.length) {
      var autoTimer = null;
      function startAuto() {
        if (autoTimer || reduceMotion) return;
        autoTimer = window.setInterval(function () {
          var next = (activeIndex + 1) % tabs.length;
          activateDay(tabs[next].getAttribute('data-day'), false);
        }, 2000);
      }
      function stopAuto() {
        if (autoTimer) { window.clearInterval(autoTimer); autoTimer = null; }
      }
      if ('IntersectionObserver' in window && program) {
        var autoObserver = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) startAuto();
          else stopAuto();
        }, { threshold: 0.18 });
        autoObserver.observe(program);
      } else {
        startAuto();
      }
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopAuto();
        else startAuto();
      });
      if (program) {
        program.addEventListener('mouseenter', stopAuto);
        program.addEventListener('mouseleave', startAuto);
      }
    }
  }

document.querySelectorAll('.faq-q').forEach(function (button) {
    button.addEventListener('click', function () {
      var item = button.closest('.faq-item');
      var isOpen = item.classList.toggle('open');
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  var canvas = document.getElementById('snowCanvas');
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var flakes = [];
    var width = 0;
    var height = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var frameId = null;

    function resetFlakes() {
      flakes = [];
      var count = Math.max(18, Math.min(54, Math.round(width / 24)));
      for (var i = 0; i < count; i++) {
        flakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 2.1 + 0.7,
          speed: Math.random() * 0.7 + 0.25,
          drift: Math.random() * 0.5 + 0.2,
          phase: Math.random() * Math.PI * 2,
          opacity: Math.random() * 0.5 + 0.25
        });
      }
    }

    function resizeSnow() {
      var host = canvas.parentElement;
      if (!host) return;
      var rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resetFlakes();
    }

    function drawSnow() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + f.opacity + ')';
        ctx.fill();
        f.y += f.speed;
        f.x += Math.sin((f.y + f.phase) / 55) * f.drift * 0.35;
        if (f.y > height + 6) {
          f.y = -6;
          f.x = Math.random() * width;
        }
      }
      frameId = window.requestAnimationFrame(drawSnow);
    }

    function startSnow() {
      if (frameId === null) frameId = window.requestAnimationFrame(drawSnow);
    }

    function stopSnow() {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    }

    resizeSnow();
    startSnow();
    window.addEventListener('resize', function () {
      stopSnow();
      resizeSnow();
      startSnow();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopSnow();
      else startSnow();
    });
  }

  var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (reduceMotion) {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
    return;
  }

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);

    var heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    heroTimeline
      .from('.nav-shell', { y: -24, opacity: 0, duration: 0.75 }, 0)
      .from('.hero-kicker', { y: 18, opacity: 0, duration: 0.55 }, 0.2)
      .from('.title-line', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.12 }, 0.28)
      .from('.hero-ar', { y: 22, opacity: 0, duration: 0.65 }, 0.62)
      .from('.hero-desc', { y: 22, opacity: 0, duration: 0.65 }, 0.72)
      .from('.hero-fact', { y: 16, opacity: 0, duration: 0.5, stagger: 0.07 }, 0.82)
      .from('.hero-actions .btn', { y: 16, opacity: 0, duration: 0.55, stagger: 0.08 }, 0.98)
      .from('.hero-photo', { opacity: 0, scale: 1.035, duration: 1.05 }, 0.45)
      .from('.hero-badge', { opacity: 0, y: 12, duration: 0.5 }, 0.95)
      .from('.hero-float', { opacity: 0, y: 18, duration: 0.6, stagger: 0.12 }, 1.05);

    gsap.to('.hero-float--top', { y: -8, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to('.hero-float--bottom', { y: 7, duration: 3.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });

    if (window.innerWidth > 960) {
      gsap.to('.hero-bg-img', {
        yPercent: 12,
        filter: 'blur(4px)',
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
      gsap.to('.hero-photo img', {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }

    revealItems.forEach(function (item) {
      gsap.fromTo(item, { y: 30, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: { trigger: item, start: 'top 88%', once: true }
      });
    });

    gsap.utils.toArray('[data-stagger]').forEach(function (group) {
      var items = Array.prototype.slice.call(group.children);
      if (!items.length) return;
      gsap.from(items, {
        y: 34,
        opacity: 0,
        duration: 0.78,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: group, start: 'top 85%', once: true }
      });
    });

    gsap.from('.program-panels', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.program-layout', start: 'top 82%', once: true }
    });

    window.addEventListener('load', function () {
      ScrollTrigger.refresh();
    });
    window.setTimeout(function () {
      ScrollTrigger.refresh();
    }, 600);

    return;
  }

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealItems.forEach(function (item) {
      revealObserver.observe(item);
    });
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child) {
        child.classList.add('is-visible');
      });
    });
  } else {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
  }
})();
