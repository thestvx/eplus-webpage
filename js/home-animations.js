/* E-PLUS homepage scroll animations (steps + why-us) — progressive enhancement */
/* حركة إضافية احترافية بخفة: إذا فشل تحميل GSAP أو أراد المستخدم تقليل الحركة،
   يبقى المحتوى ظاهراً ومقرأً بشكل طبيعي (الأنيميشن تكميلي فقط). */
(function () {
  'use strict';

  var reduceMotion = false;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reduceMotion = true;
  }
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) return;

  gsap.registerPlugin(ScrollTrigger);

  function sectionHead(triggerEl, staggerExtra) {
    var head = typeof triggerEl === 'string' ? document.querySelector(triggerEl) : triggerEl;
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

  /* ═══ كيف تنضم إلينا (#steps) ═══ */
  function initSteps() {
    var grid = document.querySelector('#steps .ep-steps-grid');
    if (!grid) return;
    var line = grid.querySelector('.ep-steps-line');
    var cards = gsap.utils.toArray(grid.querySelectorAll('.ep-step-card'));

    sectionHead('#steps .ep-section-head', 0.16);

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

    // لمعة خفيفة تتحرك عبر البطاقة عند العرض
  }

  /* ═══ لماذا E-PLUS؟ (#why-us) ═══ */
  function initWhy() {
    var section = document.getElementById('why-us');
    if (!section) return;
    var grid = section.querySelector('.ep-why-grid');
    if (!grid) return;

    sectionHead(section.querySelector('.ep-section-head'), 0.08);

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

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', function () {
      initSteps();
      initWhy();
      ScrollTrigger.refresh();
    });
  } else {
    initSteps();
    initWhy();
    ScrollTrigger.refresh();
  }
})();