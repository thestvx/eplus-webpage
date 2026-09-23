/* E-PLUS homepage — Lenis smooth scroll + GSAP hero/scroll (Apple-like, progressive) */
/* إذا فشل تحميل GSAP/Lenis أو أراد المستخدم تقليل الحركة، يبقى المحتوى ظاهراً ومقرأً بشكل طبيعي. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var hasLenis = !!window.Lenis;

  var lenis = null;

  /* ═══ LENIS — super-smooth inerrtial scrolling (Apple feel) ═══ */
  if (!reduceMotion && hasLenis) {
    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1
    });
    window.__lenis = lenis;

    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(time) { lenis.raf(time); requestAnimationFrame(raf); });
    }

    /* Smooth anchor navigation through Lenis */
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -84, duration: 1.1 });
    });
  }

  if (!hasGsap || reduceMotion) return;

  gsap.registerPlugin(ScrollTrigger);

  /* Mark hero as GSAP-driven → CSS entrance animations off (GSAP owns them) */
  document.documentElement.classList.add('gsap-hero');

  /* ═══ HERI ENTRANCE + parallax ═══ */
  function initHero() {
    var hero = document.getElementById('home');
    if (!hero) return;

    var bg = hero.querySelector('.ep-hero-bg');
    var copy = hero.querySelector('.ep-hero-copy');
    var card = hero.querySelector('.ep-hero-card');
    var stats = document.querySelector('.ep-hero-stats-wrap');
    var tag = hero.querySelector('.ep-hero-tag');
    var title = hero.querySelector('.ep-hero-title');
    var divider = hero.querySelector('.ep-hero-divider');
    var sub = hero.querySelector('.ep-hero-sub');
    var btnRow = hero.querySelector('.ep-hero-btns');
    var mini = hero.querySelector('.ep-hero-mini-actions');
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (tag)     tl.fromTo(tag,     { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.05);
    if (title)   tl.fromTo(title,   { y: 42, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.16);
    if (divider) tl.fromTo(divider, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0.3);
    if (sub)     tl.fromTo(sub,     { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.36);
    if (btnRow)  tl.fromTo(btnRow,  { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.48);
    if (mini)    tl.fromTo(mini,    { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.6);
    if (card)    tl.fromTo(card,    { y: 52, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 1.0, ease: 'power2.out' }, 0.42);
    if (stats)   tl.fromTo(stats,   { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.72);

    if (bg) {
      gsap.to(bg, {
        yPercent: 12, scale: 1.04, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
    }
    if (copy) {
      gsap.to(copy, {
        yPercent: -16, opacity: 0.25, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: '55% top', scrub: true }
      });
    }
  }

  function sectionHead(head) {
    if (!head) return;
    var tt = head.querySelector('.ep-section-pretitle');
    var title = head.querySelector('.ep-section-title');
    var desc = head.querySelector('.ep-section-desc');
    if (tt) {
      gsap.from(tt, {
        y: 18, opacity: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: head, start: 'top 88%', toggleActions: 'play none none reverse' }
      });
    }
    if (title) {
      gsap.from(title, {
        y: 34, opacity: 0, duration: 0.75, ease: 'power4.out', delay: 0.08,
        scrollTrigger: { trigger: head, start: 'top 88%', toggleActions: 'play none none reverse' }
      });
    }
    if (desc) {
      gsap.from(desc, {
        y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.16,
        scrollTrigger: { trigger: head, start: 'top 88%', toggleActions: 'play none none reverse' }
      });
    }
  }

  /* All section heads → GSAP scroll reveal (steps/why included via generic loop) */
  var documentDone = function (fn) {
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', fn);
    else fn();
  };

  documentDone(function () {
    initHero();

    document.querySelectorAll('.ep-section-head').forEach(sectionHead);
    initSteps();
    initWhy();
    ScrollTrigger.refresh();
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* ═══ كيف تنضم إلينا (#steps) ═══ */
  function initSteps() {
    var grid = document.querySelector('#steps .ep-steps-grid');
    if (!grid) return;
    var line = grid.querySelector('.ep-steps-line');
    var cards = gsap.utils.toArray(grid.querySelectorAll('.ep-step-card'));

    // الخط الرابط يرسم تدريجياً من اليمين لليسار
    if (line) {
      gsap.from(line, {
        scaleX: 0, transformOrigin: 'right center', duration: 1.1, ease: 'power2.inOut',
        scrollTrigger: { trigger: grid, start: 'top 78%', toggleActions: 'play none none reverse' }
      });
    }

    // الأرقام تتداخل واحدة بعد الأخرى
    gsap.from(grid.querySelectorAll('.ep-step-num'), {
      scale: 0, y: -10, duration: 0.55, ease: 'back.out(1.7)', stagger: 0.14,
      scrollTrigger: { trigger: grid, start: 'top 78%', toggleActions: 'play none none reverse' }
    });

    // البطاقات تتصاعد مع النصوص
    gsap.from(cards, {
      y: 64, opacity: 0, duration: 0.85, ease: 'power3.out', stagger: 0.13,
      scrollTrigger: { trigger: grid, start: 'top 78%', toggleActions: 'play none none reverse' }
    });

    // الأيقونات تظهر بتكبير خفيف ثم تطفو باستمرار
    grid.querySelectorAll('.ep-step-icon').forEach(function (icon, i) {
      var sh = grid.querySelectorAll('.ep-step-card')[i];
      gsap.from(icon, {
        scale: 0.4, opacity: 0, duration: 0.7, ease: 'back.out(1.9)', delay: i * 0.1,
        scrollTrigger: { trigger: sh, start: 'top 85%', toggleActions: 'play none none reverse' }
      });
      gsap.to(icon, {
        y: -7, duration: 1.9, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.35
      });
    });
  }

  /* ═══ لماذا E-PLUS؟ (#why-us) ═══ */
  function initWhy() {
    var section = document.getElementById('why-us');
    if (!section) return;
    var grid = section.querySelector('.ep-why-grid');
    if (!grid) return;

    // اللوحة الرئيسية
    var main = grid.querySelector('.ep-why-main');
    if (main) {
      gsap.from(main, {
        y: 46, opacity: 0, scale: 0.985, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: grid.querySelector('.ep-why-main'), start: 'top 82%', toggleActions: 'play none none reverse' }
      });
      // الشعار يطفو باستمرار
      var logo = main.querySelector('.ep-why-main-icon img');
      if (logo) {
        gsap.to(logo, { y: -6, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      }
      // النقاط تظهر بتتابع مع علامة الصح
      var lis = main.querySelectorAll('.ep-why-points li');
      gsap.from(lis, {
        x: -30, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: main, start: 'top 78%', toggleActions: 'play none none reverse' }
      });
      gsap.from(main.querySelectorAll('.ep-why-points li span:first-child'), {
        scale: 0, duration: 0.4, ease: 'back.out(2.4)', stagger: 0.12, delay: 0.35,
        scrollTrigger: { trigger: main, start: 'top 78%', toggleActions: 'play none none reverse' }
      });
    }

    // البطاقات المصغرة
    var minis = gsap.utils.toArray(grid.querySelectorAll('.ep-mini-card'));
    gsap.from(minis, {
      y: 44, opacity: 0, duration: 0.75, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: grid.querySelector('.ep-why-side'), start: 'top 85%', toggleActions: 'play none none reverse' }
    });
    minis.forEach(function (card, i) {
      var orb = card.querySelector('.ep-mini-card-icon');
      if (orb) {
        gsap.from(orb, {
          scale: 0.5, rotate: -10, duration: 0.6, ease: 'back.out(2)', delay: i * 0.12,
          scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none reverse' }
        });
        var move = gsap.utils.random(-6, 6);
        gsap.to(orb, { y: move, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.4 });
      }
    });
  }
})();