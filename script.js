/* ══════════════════════════════════════════════════════════
   E-PLUS CENTER — script.js
   Version 2.2 — Main site active, maintenance removed
══════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────
   DOM HELPERS
────────────────────────────────────────────────────────── */
const $  = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function byId(id) {
  return document.getElementById(id);
}

/* ──────────────────────────────────────────────────────────
   BACKGROUND CANVAS — Lightweight particles (GPU-only)
────────────────────────────────────────────────────────── */
(function initParticles() {
  const canvas = byId('particles-canvas') || byId('squares-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let W = 0, H = 0, dots = [], raf = null;
  const COUNT = window.innerWidth < 768 ? 30 : 55;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function spawn() {
    dots = [];
    for (let i = 0; i < COUNT; i++) {
      dots.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        a: Math.random() * 0.35 + 0.05
      });
    }
  }

  let last = 0;
  function draw(ts) {
    raf = requestAnimationFrame(draw);
    // throttle to ~30 fps for smoothness without CPU burn
    if (ts - last < 33) return;
    last = ts;

    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,168,75,${d.a})`;
      ctx.fill();
    });
  }

  resize();
  spawn();
  raf = requestAnimationFrame(draw);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); spawn(); }, 200);
  }, { passive: true });

  // Pause when tab hidden to save CPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else { raf = requestAnimationFrame(draw); }
  });
})();

/* ──────────────────────────────────────────────────────────
   APPS SCRIPT URLS
────────────────────────────────────────────────────────── */
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwidCYkiWYlCSkMNUwbo1ZLM8XCGh8y5lWD7M_lS-J5cX35-Xd8kHhrwO4ktZiN5_vhIg/exec';

const JOIN_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzo7_3ElBeyt88Cv6PsTDEp_DMu5i_PO-t54t8WAdRitoUf7HLzx9VF_GyEHPs9QcQx/exec';

/* ──────────────────────────────────────────────────────────
   LABELS
────────────────────────────────────────────────────────── */
const typeLabelsAr = {
  support: 'تسجيلات الدعم',
  lang: 'دورات اللغات',
  vip: 'دروس VIP',
  ielts: 'اختبار IELTS',
  online: 'دورات أونلاين',
  takwini: 'دورات تكوينية'
};

const typeLabelsEn = {
  support: 'Academic Support',
  lang: 'Language Courses',
  vip: 'VIP Lessons',
  ielts: 'IELTS Test',
  online: 'Online Courses',
  takwini: 'Training Courses'
};

const typeLabelsFr = {
  support: 'Soutien Scolaire',
  lang: 'Cours de Langues',
  vip: 'Leçons VIP',
  ielts: 'Test IELTS',
  online: 'Cours en Ligne',
  takwini: 'Formations'
};

/* ──────────────────────────────────────────────────────────
   THEME (DARK / LIGHT MODE)
────────────────────────────────────────────────────────── */
const LOGO_DARK  = 'images/education-plus-center-logo.png';
const LOGO_LIGHT = 'images/education-plus-center-logo---b.png';

function applyTheme(mode) {
  const isLight = mode === 'light';
  document.documentElement.classList.toggle('light-mode', isLight);

  const icon = isLight ? '☀️' : '🌙';
  const toggleBtn    = byId('ep-theme-toggle');
  const toggleBtnMob = byId('ep-theme-toggle-mob');
  if (toggleBtn)    toggleBtn.textContent    = icon;
  if (toggleBtnMob) toggleBtnMob.textContent = icon;

  const logoSrc = isLight ? LOGO_LIGHT : LOGO_DARK;
  const navLogo    = byId('nav-logo-img');
  const footerLogo = byId('footer-logo-img');
  if (navLogo)    navLogo.src    = logoSrc;
  if (footerLogo) footerLogo.src = logoSrc;

  localStorage.setItem('ep-theme', mode);
}

function toggleTheme() {
  const current = document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
  applyTheme(current === 'light' ? 'dark' : 'light');
}

window.toggleTheme = toggleTheme;

/* ── Restore saved theme on load ── */
(function() {
  const saved = localStorage.getItem('ep-theme') || 'dark';
  applyTheme(saved);
})();


let currentLang = localStorage.getItem('ep-lang') || 'ar';

function __(key, fallback) {
  const val = i18n[currentLang]?.[key];
  return val !== undefined ? val : (fallback ?? key);
}

const i18n = {
  ar: {
    // Nav
    nav_home: 'الرئيسية',
    nav_programs: 'البرامج',
    nav_teachers: 'الأساتذة',
    nav_paths: 'المسارات',
    nav_steps: 'كيف تنضم',
    nav_announcements: 'الإعلانات',
    nav_gallery: 'المعرض',
    nav_faq: 'الأسئلة الشائعة',
    nav_join: 'انضم لفريقنا',
    nav_register: 'سجّل الآن ✦',
    // Mobile menu
    mob_home: '🏠 الرئيسية',
    mob_programs: '📚 البرامج',
    mob_teachers: '👨‍🏫 الأساتذة',
    mob_paths: '🛤️ المسارات',
    mob_steps: '📝 كيف تنضم',
    mob_announcements: '📢 الإعلانات',
    mob_gallery: '🖼️ المعرض',
    mob_faq: '❓ الأسئلة الشائعة',
    mob_join: '🤝 انضم لفريقنا',
    // Topbar
    topbar_new: 'جديد',
    topbar_camp: '🏕️ المخيم الصيفي 2026 — التسجيل مفتوح الآن',
    topbar_location: 'قمار، ولاية الوادي — الجزائر',
    // Hero
    topbar_camp: 'خطوتك الأولى نحو التفوق الدراسي',
    // Hero
    hero_tag: 'تسجيلات الدعم المدرسي مفتوحة الآن 🟡',
    hero_title: 'سجّل اليوم... وابدأ عامك الدراسي بثقة',
    hero_subtitle: 'برنامج تعليمي متكامل بإشراف نخبة من الأساتذة، ضمن أفواج محدودة، ومتابعة أكاديمية مستمرة لتحقيق أفضل النتائج.',
    hero_btn_register: 'سجّل في برنامج الدعم المدرسي ✦',
    hero_btn_camp: 'سجّل في برنامج المخيم الصيفي ☀',
    hero_btn_lang: 'ابدأ اللغات',
    hero_btn_support: 'ابدأ الدعم',
    hero_btn_vip: 'احجز VIP',
    hero_card_kicker: 'E-PLUS EXPERIENCE',
    hero_card_title: 'تجربة تعليمية تجمع بين الجودة، الوضوح، والنتائج',
    hero_card_desc: 'برامج متنوعة للغات، الدعم الدراسي، التحضير للاختبارات، والتعليم الفردي ضمن بيئة حديثة ومنظمة.',
    hero_list_1: 'متابعة مستمرة للطلاب',
    hero_list_2: 'أساتذة أكفاء وخطط واضحة',
    hero_list_3: 'مستويات مناسبة لكل الأعمار',
    hero_list_4: 'دروس حضورية وأونلاين',
    hero_btn_ielts: 'IELTS',
    hero_btn_online: 'أونلاين',
    // Stats
    stat_1: 'برنامجاً تعليمياً',
    stat_2: 'طالباً ومستفيداً',
    stat_3: 'أستاذاً ومؤطراً',
    stat_4: 'مسارات رئيسية',
    // Trust strip
    trust_1_title: 'أهداف واضحة',
    trust_1_desc: 'كل برنامج مبني على مخرجات تعليمية محددة وسهلة المتابعة.',
    trust_2_title: 'إشراف أكاديمي',
    trust_2_desc: 'أساتذة مختصون وخبرة في التعامل مع مختلف المستويات.',
    trust_3_title: 'أسلوب حديث',
    trust_3_desc: 'تجربة تعليمية مرنة وتفاعلية داخل الصف وخارجه.',
    trust_4_title: 'نتائج ملموسة',
    trust_4_desc: 'تركيز على التطور الحقيقي للطالب في المهارة والثقة.',
    // Achievement badges
    achieve_1: 'مركز معتمد',
    achieve_2: 'تقييم ممتاز',
    achieve_3: 'IELTS Partner',
    achieve_4: '+3 سنوات خبرة',
    achieve_5: 'دروس أونلاين',
    // Programs section
    prog_pretitle: 'Programs',
    prog_title: 'برامجنا التعليمية',
    prog_desc: 'اختر البرنامج الذي يناسب مستواك وهدفك، وابدأ رحلة تعليمية منظمة وواضحة.',
    prog_lang_title: 'دورات اللغات',
    prog_lang_desc: 'تعلم الإنجليزية والفرنسية وغيرهما عبر مستويات متدرجة وتطبيق عملي مستمر.',
    prog_lang_chip1: 'A0 - C2',
    prog_lang_chip2: 'صغار وكبار',
    prog_lang_chip3: 'حضوري',
    prog_lang_btn: 'سجل الآن',
    prog_support_title: 'الدعم الدراسي',
    prog_support_desc: 'حصص مرافقة ومراجعة للطلاب مع تنظيم، متابعة، وتقوية في المواد الأساسية.',
    prog_support_chip1: 'ابتدائي',
    prog_support_chip2: 'متوسط',
    prog_support_chip3: 'ثانوي',
    prog_support_btn: 'سجل الآن',
    prog_vip_title: 'دروس VIP',
    prog_vip_desc: 'تعليم فردي أو بمجموعات صغيرة جداً مع تركيز كامل على احتياج الطالب.',
    prog_vip_chip1: 'مرونة عالية',
    prog_vip_chip2: 'خطة خاصة',
    prog_vip_chip3: 'نتائج أسرع',
    prog_vip_btn: 'سجل الآن',
    prog_ielts_title: 'التحضير لاختبار IELTS',
    prog_ielts_desc: 'برنامج متخصص لتقوية المهارات الأربع وفهم بنية الاختبار والتدريب عليه.',
    prog_ielts_chip1: 'Listening',
    prog_ielts_chip2: 'Reading',
    prog_ielts_chip3: 'Writing & Speaking',
    prog_ielts_btn: 'سجل الآن',
    prog_online_title: 'الدورات الأونلاين',
    prog_online_desc: 'تعلم من أي مكان عبر حصص مباشرة ومحتوى منظم ومتابعة رقمية.',
    prog_online_chip1: 'عن بعد',
    prog_online_chip2: 'مرن',
    prog_online_chip3: 'تفاعلي',
    prog_online_btn: 'سجل الآن',
    prog_training_title: 'الدورات التكوينية',
    prog_training_desc: 'برامج مهارية وتكوينية تساعدك على تطوير نفسك أكاديمياً ومهنياً.',
    prog_training_chip1: 'مهارات',
    prog_training_chip2: 'تطوير ذات',
    prog_training_chip3: 'تأهيل',
    prog_training_btn: 'سجل الآن',
    prog_camp_title: 'المخيم الصيفي 2026',
    prog_camp_desc: 'أنشطة تعليمية وترفيهية وتطويرية ضمن تجربة صيفية مميزة.',
    prog_camp_badge: 'سجل الآن',
    prog_photo_title: 'التصوير والمونتاج',
    prog_photo_desc: 'تعلم أساسيات التصوير الفوتوغرافي والمونتاج الاحترافي.',
    prog_photo_chip1: 'تصوير',
    prog_photo_chip2: 'مونتاج',
    prog_photo_chip3: 'مشاريع تطبيقية',
    prog_photo_btn: 'سجل الآن',
    // Paths section
    path_pretitle: 'Paths',
    path_title: 'المسارات التعليمية',
    path_desc: 'اختر المسار الذي يناسب عمرك، مستواك، وهدفك الدراسي أو اللغوي.',
    path_kids_kicker: 'Kids',
    path_kids_title: 'مسار الأطفال',
    path_kids_desc: 'بناء أساس قوي في اللغة والتعلّم بأسلوب ممتع وتفاعلي.',
    path_kids_1: 'أنشطة مناسبة للعمر',
    path_kids_2: 'تعلم تدريجي وواضح',
    path_kids_3: 'تحفيز وثقة بالنفس',
    path_students_kicker: 'Students',
    path_students_title: 'مسار التلاميذ',
    path_students_desc: 'مرافقة دراسية حقيقية وتحسين النتائج مع متابعة دورية.',
    path_students_1: 'شرح مبسط ومنظم',
    path_students_2: 'مراجعة وتمارين',
    path_students_3: 'استعداد أفضل للاختبارات',
    path_adults_kicker: 'Adults',
    path_adults_title: 'مسار الشباب والكبار',
    path_adults_desc: 'تطوير لغوي ومهاري يناسب الدراسة، العمل، والسفر.',
    path_adults_1: 'برامج مرنة',
    path_adults_2: 'تركيز على التطبيق',
    path_adults_3: 'محتوى عملي',
    // Steps section
    step_pretitle: 'How it works',
    step_title: 'كيف تنضم إلينا',
    step_desc: 'خطوات بسيطة وواضحة للبدء في البرنامج المناسب لك.',
    step_1_title: 'تواصل معنا',
    step_1_desc: 'راسلنا أو زر المركز لمعرفة البرامج المتاحة.',
    step_2_title: 'تحديد المستوى',
    step_2_desc: 'نساعدك على اختيار المسار أو البرنامج الأنسب.',
    step_3_title: 'التسجيل',
    step_3_desc: 'أكمل معلوماتك وثبّت مقعدك في البرنامج.',
    step_4_title: 'ابدأ رحلتك',
    step_4_desc: 'انطلق ضمن تجربة تعليمية حديثة ومتكاملة.',
    // Why us section
    why_pretitle: 'Why E-PLUS',
    why_title: 'لماذا E-PLUS؟',
    why_main_title: 'بيئة تعليمية حديثة وواضحة',
    why_main_desc: 'نعمل على تقديم تجربة منظمة، أنيقة، وعملية تساعد الطالب على التقدم بثقة.',
    why_point_1: 'محتوى مناسب لكل فئة',
    why_point_2: 'تنظيم ومتابعة مستمرة',
    why_point_3: 'توازن بين الفهم والتطبيق',
    why_point_4: 'اهتمام بالتفاصيل والجودة',
    why_mini_1_title: 'تنوع البرامج',
    why_mini_1_desc: 'لغات، دعم، VIP، IELTS، أونلاين، ودورات تكوينية.',
    why_mini_2_title: 'مرونة',
    why_mini_2_desc: 'خيارات تناسب الوقت والهدف ومستوى الطالب.',
    why_mini_3_title: 'جودة',
    why_mini_3_desc: 'تركيز على تجربة راقية ونتائج ملموسة.',
    // Teachers section
    teacher_pretitle: 'Teachers',
    teacher_title: 'فريق الأساتذة',
    teacher_desc: 'طاقم متميز يعمل على تقديم تعليم منظم وفعال بمستوى احترافي.',
    // Announcements section
    ann_live: 'آخر الإعلانات والتحديثات',
    ann_title: 'الإعلانات',
    ann_subtitle: 'تابع آخر أخبار وعروض المركز',
    ann_filter_all: 'الكل',
    ann_filter_general: '📢 عام',
    ann_filter_event: '🎉 فعالية',
    ann_filter_urgent: '🚨 عاجل',
    ann_filter_offer: '🎁 عرض',
    ann_filter_news: '📰 خبر',
    ann_loading: 'جاري تحميل الإعلانات...',
    ann_empty: 'لا توجد إعلانات في هذه الفئة',
    ann_read_more: 'اقرأ المزيد',
    // Testimonials section
    test_pretitle: 'Testimonials',
    test_title: 'آراء المستفيدين',
    // Gallery section
    gal_pretitle: 'Gallery',
    gal_title: 'معرض صور المركز',
    gal_desc: 'لحظات حقيقية من داخل مركز E-PLUS — بيئة تعليمية متكاملة وحديثة.',
    gal_lightbox_label: 'عرض الصورة',
    gal_lightbox_close: 'إغلاق',
    gal_lightbox_prev: 'السابق',
    gal_lightbox_next: 'التالي',
    // FAQ section
    faq_pretitle: 'FAQ',
    faq_title: 'الأسئلة الشائعة',
    faq_q1: 'ما هي الفئات التي يمكنها التسجيل؟',
    faq_a1: 'تتوفر برامج تناسب الأطفال، التلاميذ، الشباب، والكبار حسب نوع البرنامج والمستوى.',
    faq_q2: 'هل توجد برامج أونلاين؟',
    faq_a2: 'نعم، نوفر برامج أونلاين في بعض المسارات مع متابعة مناسبة.',
    faq_q3: 'هل يمكن التسجيل في دروس VIP؟',
    faq_a3: 'نعم، يمكن طلب دروس فردية أو شبه فردية حسب التوفر والاحتياج.',
    faq_q4: 'كيف أعرف البرنامج المناسب لي؟',
    faq_a4: 'تواصل معنا وسنساعدك في اختيار البرنامج الأنسب بناءً على المستوى والهدف.',
    // Contact section
    contact_pretitle: 'Contact',
    contact_title: 'تواصل معنا',
    contact_desc: 'يسعدنا استقبال استفساراتكم ومساعدتكم في اختيار البرنامج الأنسب.',
    contact_btn_call: 'اتصال مباشر',
    contact_btn_whatsapp: 'واتساب',
    contact_address_label: 'العنوان',
    contact_address: 'حي الشهداء، مقابل الطريق الوطني رقم 48 — قمار، الوادي، الجزائر',
    contact_phone_label: 'الهاتف',
    contact_email_label: 'البريد',
    contact_hours_title: 'أوقات العمل',
    contact_hours_morning: 'الفترة الصباحية',
    contact_hours_evening: 'الفترة المسائية',
    contact_hours_days: 'السبت — الجمعة',
    contact_hours_note: 'يُرجى الحضور خلال أوقات العمل الرسمية للاستفسار والتسجيل.',
    // Join CTA
    join_title: 'هل ترغب في الانضمام لفريقنا؟',
    join_desc: 'نرحب بالأساتذة، المؤطرين، والمبدعين الراغبين في المساهمة في تجربة تعليمية مميزة.',
    join_btn: 'انضم لفريقنا',
    join_btn_terms: 'الشروط',
    // Footer
    footer_copy: '© 2026 E-PLUS Center — جميع الحقوق محفوظة.',
    footer_programs: 'البرامج',
    footer_faq: 'الأسئلة الشائعة',
    footer_contact: 'التواصل',
    // Form — general
    form_title: 'استمارة التسجيل',
    form_lang_warning_ar: 'يرجى إدخال جميع المعلومات باللغة العربية فقط',
    form_lang_warning_en: 'Please enter all information in English only',
    form_lang_warning_fr: 'Veuillez saisir toutes les informations en français uniquement',
    firstName: 'الاسم',
    lastName: 'اللقب',
    birthDate: 'تاريخ الميلاد',
    birthPlace: 'مكان الميلاد / العنوان',
    phone: 'رقم الهاتف',
    motivation: 'ما الذي دفعك إلى اختيار التسجيل في مركز E-PLUS؟',
    motivationVip: 'ما الذي جعلك تختار الدراسة عبر نظام الدروس الخاصة VIP؟',
    optional: '(اختياري)',
    eduLevel: 'المستوى الدراسي',
    specialty: 'التخصص',
    subject: 'المادة',
    teacher: 'الأستاذ/ة',
    candidateType: 'نوع المترشح',
    enrolled: 'متمدرس',
    freeCandidate: 'حر',
    parentInfo: 'معلومات ولي الأمر',
    parentName: 'اسم ولي الأمر',
    parentPhone: 'هاتف ولي الأمر',
    langType: 'اختر اللغة',
    langLevel: 'مستوى اللغة (CEFR)',
    levelTest: 'هل تريد إجراء اختبار تحديد المستوى؟',
    yes: 'نعم',
    no: 'لا',
    vipType: 'نوع دروس VIP',
    vipSupport: '📚 دعم دراسي',
    vipLang: '🌍 لغات',
    vipDaysCount: 'كم يوم تريد الحضور في الأسبوع؟',
    chooseDays: 'اختر الأيام',
    daysSelected: 'يوم محدد',
    submitBtn: 'إتمام التسجيل ✦',
    // Form — support type
    form_support_type: 'نوع التسجيل في الدعم',
    form_support_school: 'دعم دراسي',
    form_support_course: 'دروس حرة',
    form_support_select: '-- اختر --',
    form_support_select_subject: '-- اختر المادة --',
    form_support_select_teacher: '-- اختر الأستاذ/ة --',
    form_support_select_specialty: '-- اختر التخصص --',
    // Form — training
    form_training_title: 'الدورة التكوينية',
    form_training_graphic: 'التصميم الجرافيكي',
    form_training_prog: 'البرمجة',
    form_training_comm: 'مهارات التواصل',
    form_training_accounting: 'المحاسبة والإدارة',
    form_training_marketing: 'التسويق الرقمي',
    form_training_other: 'أخرى',
    form_training_level: 'مستواك في الدورة',
    form_training_beginner: '🔰 مبتدئ',
    form_training_intermediate: '📈 لدي بعض الأساس',
    form_training_advanced: '🚀 متقدم — أريد التعمق أكثر',
    form_training_mode: 'طريقة التعلم المفضلة',
    form_training_presential: '🏫 حضوري في المركز',
    form_training_online: '💻 أونلاين عن بعد',
    form_training_mixed: '🔄 مختلط (حضوري + أونلاين)',
    // Form — VIP
    form_vip_support: 'VIP دعم دراسي',
    form_vip_lang: 'VIP لغات',
    form_vip_days: 'كم يوم تريد الحضور في الأسبوع؟',
    form_vip_choose_days_prefix: 'اختر',
    form_vip_choose_days_suffix: 'للحضور في الأسبوع',
    // Form — lang levels
    form_lang_select: '-- اختر اللغة --',
    form_level_select: '-- اختر مستواك --',
    form_cefr_hint: 'اختر المستوى المناسب — يمكننا مساعدتك باختبار تحديد المستوى إن لم تكن متأكداً',
    form_level_test_note: '🧪 الاختبار يستغرق ~15 دقيقة ويساعدنا على وضعك في المجموعة المناسبة تماماً',
    form_level_test_yes: '✅ نعم، أريد إجراء الاختبار',
    form_level_test_no: '❌ لا، أنا متأكد من مستواي',
    form_coming_soon: 'الدورات لهذا المستوى ستُضاف قريباً',
    form_course_select: 'اختر الدورة',
    form_course_placeholder: '-- اختر الدورة --',
    // Terms
    termsTitle: 'قوانين وشروط المركز التعليمي',
    termsAgree: 'لقد قرأت جميع القوانين والشروط وأوافق عليها',
    termsProceed: 'تأكيد التسجيل ✦',
    terms_scroll_hint: 'اقرأ القوانين كاملاً للمتابعة',
    t1: 'يعتبر المتعلم مسجلاً بصفة رسمية بالمركز عند قيامه بتسديد رسوم التسجيل في التاريخ المحدد.',
    t2: 'يجب أن يتسم المتعلم بحسن الأخلاق والنظافة والهندام الملائم.',
    t3: 'يجب احترام جميع الأفراد في المركز التعليمي، الزملاء، المدرسين والطاقم الإداري.',
    t4: 'احترام أوقات الدراسة، وعدم الانصراف دون إذن مسبق.',
    t5: 'عدم التغيب عن الحصص إلا لأسباب ضرورية مع إعلام الإدارة مسبقاً.',
    t6: 'في حالة الغياب بدون سبب يتم إعلام الولي.',
    t7: 'لا يتم تعويض قيمة الحصص عند الغياب المتكرر أو الانقطاع عن الدراسة.',
    t8: 'في حالة التوقف عن الدراسة يتم تعويض 80% فقط من القيمة المتبقية.',
    t9: 'في حالة الغياب طويل المدى يرجى الاتصال بالإدارة لأجل تسوية الوضعية.',
    t10: 'لا يتحمل المركز ضياع أي أغراض ثمينة (نقود، هاتف، مجوهرات...).',
    t11: 'يمنع لمس أو تشغيل أدوات وأجهزة التعليم المختلفة دون إذن.',
    t12: 'أي عملية إتلاف لتجهيزات المركز تعرض صاحبها للعقوبة وتعويض الخسائر.',
    t13: 'في حالة السلوكات غير المقبولة، ينذر الولي كتابياً عند تكرر المخالفة.',
    t14: 'الموافقة على نشر صور المتعلم في شبكات التواصل الاجتماعي، ومقاطع الفيديو التربوية الخاصة بالمركز.',
    // Join modal
    join_modal_title: 'انضم لفريق E-PLUS',
    join_firstName: 'الاسم',
    join_lastName: 'اللقب',
    join_phone: 'رقم الهاتف',
    join_email: 'البريد الإلكتروني',
    join_role: 'الدور المطلوب',
    join_role_teacher: '👨‍🏫 أستاذ',
    join_role_supervisor: '🧑‍💼 مؤطر',
    join_role_admin: '📋 إداري',
    join_specialty: 'التخصص / المادة',
    join_experience: 'الخبرة والمؤهلات',
    join_cv: 'السيرة الذاتية (PDF أو Word)',
    join_cv_choose: 'اختر الملف',
    join_submit: 'إرسال الطلب ✦',
    join_success: 'تم إرسال الطلب بنجاح',
    // Loading popup
    loading_title: 'جاري المعالجة...',
    loading_msg: 'يرجى الانتظار',
    requested_service: 'الخدمة المطلوبة',
    loading_submitting: 'جاري إرسال التسجيل...',
    loading_wait_moment: 'يرجى الانتظار قليلاً',
    loading_join_submitting: 'جاري إرسال طلب الانضمام...',
    loading_join_wait: 'يرجى الانتظار قليلاً',
    // Success popup
    success_title: 'تم بنجاح',
    success_ok: 'حسناً ✦',
    success_reg_number: 'رقم التسجيل:',
    success_msg: 'تم تنفيذ العملية بنجاح.',
    success_reg_done: 'تم التسجيل بنجاح',
    // Theme toggle
    theme_aria: 'تغيير المظهر',
    theme_title: 'تغيير المظهر',
    // Hamburger
    hamburger_aria: 'القائمة',
    // Language toggle
    lang_ar: 'AR',
    lang_en: 'EN',
    lang_fr: 'FR',
  },
  en: {
    nav_home: 'Home',
    nav_programs: 'Programs',
    nav_teachers: 'Teachers',
    nav_paths: 'Paths',
    nav_steps: 'How to Join',
    nav_announcements: 'Announcements',
    nav_gallery: 'Gallery',
    nav_faq: 'FAQ',
    nav_join: 'Join Our Team',
    nav_register: 'Register Now ✦',
    mob_home: '🏠 Home',
    mob_programs: '📚 Programs',
    mob_teachers: '👨‍🏫 Teachers',
    mob_paths: '🛤️ Paths',
    mob_steps: '📝 How to Join',
    mob_announcements: '📢 Announcements',
    mob_gallery: '🖼️ Gallery',
    mob_faq: '❓ FAQ',
    mob_join: '🤝 Join Our Team',
    topbar_new: 'New',
    topbar_camp: '🏕️ Summer Camp 2026 — Registration Open Now',
    topbar_location: 'Ghamar, El Oued — Algeria',
    topbar_camp: 'Your first step toward academic excellence',
    hero_tag: 'Academic support registration is now open 🟡',
    hero_title: 'Register today... and start your school year with confidence',
    hero_subtitle: 'A comprehensive educational program led by elite teachers, in limited groups, with continuous academic follow-up to achieve the best results.',
    hero_btn_register: 'Register for Support Program ✦',
    hero_btn_camp: 'Register for Summer Camp ☀',
    hero_btn_lang: 'Start Languages',
    hero_btn_support: 'Start Support',
    hero_btn_vip: 'Book VIP',
    hero_card_kicker: 'E-PLUS EXPERIENCE',
    hero_card_title: 'An educational experience combining quality, clarity, and results',
    hero_card_desc: 'Diverse programs for languages, academic support, test preparation, and individual tutoring in a modern, organized environment.',
    hero_list_1: 'Continuous student follow-up',
    hero_list_2: 'Competent teachers with clear plans',
    hero_list_3: 'Levels suitable for all ages',
    hero_list_4: 'In-person and online lessons',
    hero_btn_ielts: 'IELTS',
    hero_btn_online: 'Online',
    stat_1: 'Educational Programs',
    stat_2: 'Students & Beneficiaries',
    stat_3: 'Teachers & Supervisors',
    stat_4: 'Main Paths',
    trust_1_title: 'Clear Goals',
    trust_1_desc: 'Each program is built on specific, trackable educational outcomes.',
    trust_2_title: 'Academic Supervision',
    trust_2_desc: 'Specialized teachers experienced with all levels.',
    trust_3_title: 'Modern Approach',
    trust_3_desc: 'Flexible, interactive learning inside and outside the classroom.',
    trust_4_title: 'Tangible Results',
    trust_4_desc: 'Focus on real student progress in skill and confidence.',
    achieve_1: 'Accredited Center',
    achieve_2: 'Excellent Rating',
    achieve_3: 'IELTS Partner',
    achieve_4: '+3 Years Experience',
    achieve_5: 'Online Lessons',
    prog_pretitle: 'Programs',
    prog_title: 'Our Educational Programs',
    prog_desc: 'Choose the program that fits your level and goal, and start an organized learning journey.',
    prog_lang_title: 'Language Courses',
    prog_lang_desc: 'Learn English, French, and more through progressive levels and continuous practice.',
    prog_lang_chip1: 'A0 - C2',
    prog_lang_chip2: 'Kids & Adults',
    prog_lang_chip3: 'In-Person',
    prog_lang_btn: 'Register Now',
    prog_support_title: 'Academic Support',
    prog_support_desc: 'Guided review sessions for students with organization, follow-up, and core subject reinforcement.',
    prog_support_chip1: 'Primary',
    prog_support_chip2: 'Middle',
    prog_support_chip3: 'Secondary',
    prog_support_btn: 'Register Now',
    prog_vip_title: 'VIP Lessons',
    prog_vip_desc: 'One-on-one or small group instruction with complete focus on student needs.',
    prog_vip_chip1: 'High Flexibility',
    prog_vip_chip2: 'Custom Plan',
    prog_vip_chip3: 'Faster Results',
    prog_vip_btn: 'Register Now',
    prog_ielts_title: 'IELTS Test Preparation',
    prog_ielts_desc: 'Specialized program to strengthen all four skills and understand the test structure.',
    prog_ielts_chip1: 'Listening',
    prog_ielts_chip2: 'Reading',
    prog_ielts_chip3: 'Writing & Speaking',
    prog_ielts_btn: 'Register Now',
    prog_online_title: 'Online Courses',
    prog_online_desc: 'Learn from anywhere with live sessions, organized content, and digital follow-up.',
    prog_online_chip1: 'Remote',
    prog_online_chip2: 'Flexible',
    prog_online_chip3: 'Interactive',
    prog_online_btn: 'Register Now',
    prog_training_title: 'Training Courses',
    prog_training_desc: 'Skill-building programs to help you grow academically and professionally.',
    prog_training_chip1: 'Skills',
    prog_training_chip2: 'Self-Development',
    prog_training_chip3: 'Qualification',
    prog_training_btn: 'Register Now',
    prog_camp_title: 'Summer Camp 2026',
    prog_camp_desc: 'Educational, recreational, and developmental activities in a unique summer experience.',
    prog_camp_badge: 'Register Now',
    prog_photo_title: 'Photography & Montage',
    prog_photo_desc: 'Learn the basics of photography and professional video editing.',
    prog_photo_chip1: 'Photography',
    prog_photo_chip2: 'Montage',
    prog_photo_chip3: 'Practical Projects',
    prog_photo_btn: 'Register Now',
    path_pretitle: 'Paths',
    path_title: 'Learning Paths',
    path_desc: 'Choose the path that suits your age, level, and academic or language goals.',
    path_kids_kicker: 'Kids',
    path_kids_title: 'Kids Path',
    path_kids_desc: 'Build a strong foundation in language and learning through fun, interactive methods.',
    path_kids_1: 'Age-appropriate activities',
    path_kids_2: 'Gradual, clear learning',
    path_kids_3: 'Encouragement and confidence',
    path_students_kicker: 'Students',
    path_students_title: 'Students Path',
    path_students_desc: 'Real academic support and result improvement with regular follow-up.',
    path_students_1: 'Simplified, organized explanations',
    path_students_2: 'Review and exercises',
    path_students_3: 'Better exam readiness',
    path_adults_kicker: 'Adults',
    path_adults_title: 'Youth & Adults Path',
    path_adults_desc: 'Language and skill development for study, work, and travel.',
    path_adults_1: 'Flexible programs',
    path_adults_2: 'Focus on application',
    path_adults_3: 'Practical content',
    step_pretitle: 'How it works',
    step_title: 'How to Join Us',
    step_desc: 'Simple, clear steps to start the right program for you.',
    step_1_title: 'Contact Us',
    step_1_desc: 'Message us or visit the center to learn about available programs.',
    step_2_title: 'Level Assessment',
    step_2_desc: 'We help you choose the most suitable path or program.',
    step_3_title: 'Registration',
    step_3_desc: 'Complete your information and secure your spot.',
    step_4_title: 'Start Your Journey',
    step_4_desc: 'Begin a modern, integrated learning experience.',
    why_pretitle: 'Why E-PLUS',
    why_title: 'Why E-PLUS?',
    why_main_title: 'A modern, clear learning environment',
    why_main_desc: 'We provide an organized, elegant, and practical experience that helps students progress with confidence.',
    why_point_1: 'Content suitable for all ages',
    why_point_2: 'Organization and continuous follow-up',
    why_point_3: 'Balance between understanding and application',
    why_point_4: 'Attention to detail and quality',
    why_mini_1_title: 'Program Variety',
    why_mini_1_desc: 'Languages, support, VIP, IELTS, online, and training courses.',
    why_mini_2_title: 'Flexibility',
    why_mini_2_desc: 'Options to fit your time, goals, and level.',
    why_mini_3_title: 'Quality',
    why_mini_3_desc: 'Focus on a premium experience with tangible results.',
    teacher_pretitle: 'Teachers',
    teacher_title: 'Our Teaching Team',
    teacher_desc: 'An exceptional team dedicated to providing organized, effective education at a professional level.',
    ann_live: 'Latest Announcements & Updates',
    ann_title: 'Announcements',
    ann_subtitle: 'Follow the latest news and offers from the center',
    ann_filter_all: 'All',
    ann_filter_general: '📢 General',
    ann_filter_event: '🎉 Event',
    ann_filter_urgent: '🚨 Urgent',
    ann_filter_offer: '🎁 Offer',
    ann_filter_news: '📰 News',
    ann_loading: 'Loading announcements...',
    ann_empty: 'No announcements in this category',
    ann_read_more: 'Read more',
    test_pretitle: 'Testimonials',
    test_title: 'What Our Students Say',
    gal_pretitle: 'Gallery',
    gal_title: 'Center Photo Gallery',
    gal_desc: 'Real moments from inside E-PLUS Center — a modern, integrated learning environment.',
    gal_lightbox_label: 'View image',
    gal_lightbox_close: 'Close',
    gal_lightbox_prev: 'Previous',
    gal_lightbox_next: 'Next',
    faq_pretitle: 'FAQ',
    faq_title: 'Frequently Asked Questions',
    faq_q1: 'Who can register?',
    faq_a1: 'Programs are available for children, students, youth, and adults depending on the program type and level.',
    faq_q2: 'Are there online programs?',
    faq_a2: 'Yes, we offer online programs in some paths with appropriate follow-up.',
    faq_q3: 'Can I register for VIP lessons?',
    faq_a3: 'Yes, you can request individual or semi-private lessons based on availability and need.',
    faq_q4: 'How do I know which program suits me?',
    faq_a4: 'Contact us and we will help you choose the most suitable program based on your level and goal.',
    contact_pretitle: 'Contact',
    contact_title: 'Get in Touch',
    contact_desc: 'We are happy to answer your inquiries and help you choose the right program.',
    contact_btn_call: 'Call Us',
    contact_btn_whatsapp: 'WhatsApp',
    contact_address_label: 'Address',
    contact_address: 'Hay Echouhada, opposite National Road 48 — Ghamar, El Oued, Algeria',
    contact_phone_label: 'Phone',
    contact_email_label: 'Email',
    contact_hours_title: 'Working Hours',
    contact_hours_morning: 'Morning Hours',
    contact_hours_evening: 'Evening Hours',
    contact_hours_days: 'Saturday — Friday',
    contact_hours_note: 'Please visit during official working hours for inquiries and registration.',
    join_title: 'Would you like to join our team?',
    join_desc: 'We welcome teachers, supervisors, and creatives who want to contribute to an exceptional educational experience.',
    join_btn: 'Join Our Team',
    join_btn_terms: 'Terms',
    footer_copy: '© 2026 E-PLUS Center — All rights reserved.',
    footer_programs: 'Programs',
    footer_faq: 'FAQ',
    footer_contact: 'Contact',
    form_title: 'Registration Form',
    form_lang_warning_en: 'Please enter all information in English only',
    form_lang_warning_ar: 'يرجى إدخال جميع المعلومات باللغة العربية فقط',
    form_lang_warning_fr: 'Veuillez saisir toutes les informations en français uniquement',
    firstName: 'First Name',
    lastName: 'Last Name',
    birthDate: 'Date of Birth',
    birthPlace: 'Place of Birth / Address',
    phone: 'Phone Number',
    motivation: 'What motivated you to choose E-PLUS Center?',
    motivationVip: 'What led you to choose studying through the VIP private lessons system?',
    optional: '(optional)',
    eduLevel: 'Education Level',
    specialty: 'Specialty',
    subject: 'Subject',
    teacher: 'Teacher',
    candidateType: 'Candidate Type',
    enrolled: 'Enrolled',
    freeCandidate: 'Independent',
    parentInfo: 'Parent / Guardian Info',
    parentName: 'Parent Name',
    parentPhone: 'Parent Phone',
    langType: 'Choose Language',
    langLevel: 'Language Level (CEFR)',
    levelTest: 'Would you like a level placement test?',
    yes: 'Yes',
    no: 'No',
    vipType: 'VIP Lesson Type',
    vipSupport: '📚 Academic Support',
    vipLang: '🌍 Languages',
    vipDaysCount: 'How many days per week?',
    chooseDays: 'Choose Days',
    daysSelected: 'day(s) selected',
    submitBtn: 'Complete Registration ✦',
    form_support_type: 'Support Registration Type',
    form_support_school: 'Academic Support',
    form_support_course: 'Free Lessons',
    form_support_select: '-- Select --',
    form_support_select_subject: '-- Choose subject --',
    form_support_select_teacher: '-- Choose teacher --',
    form_support_select_specialty: '-- Choose specialty --',
    form_training_title: 'Training Course',
    form_training_graphic: 'Graphic Design',
    form_training_prog: 'Programming',
    form_training_comm: 'Communication Skills',
    form_training_accounting: 'Accounting & Management',
    form_training_marketing: 'Digital Marketing',
    form_training_other: 'Other',
    form_training_level: 'Your Level',
    form_training_beginner: '🔰 Beginner',
    form_training_intermediate: '📈 Some Basics',
    form_training_advanced: '🚀 Advanced — I want to go deeper',
    form_training_mode: 'Preferred Learning Method',
    form_training_presential: '🏫 In-Center',
    form_training_online: '💻 Online',
    form_training_mixed: '🔄 Blended (In-person + Online)',
    form_vip_support: 'VIP Academic Support',
    form_vip_lang: 'VIP Languages',
    form_vip_days: 'How many days per week?',
    form_vip_choose_days_prefix: 'Choose',
    form_vip_choose_days_suffix: 'day(s) per week',
    form_lang_select: '-- Choose language --',
    form_level_select: '-- Choose your level --',
    form_cefr_hint: 'Choose the appropriate level — we can help with a placement test if you are unsure.',
    form_level_test_note: '🧪 The test takes ~15 minutes and helps us place you in the right group.',
    form_level_test_yes: '✅ Yes, I want the test',
    form_level_test_no: '❌ No, I am sure of my level',
    form_coming_soon: 'Courses for this level will be added soon',
    form_course_select: 'Choose course',
    form_course_placeholder: '-- Choose course --',
    termsTitle: 'Center Terms & Conditions',
    termsAgree: 'I have read all terms and conditions and I agree',
    termsProceed: 'Confirm Registration ✦',
    terms_scroll_hint: 'Scroll down to read all terms',
    t1: 'The learner is officially registered upon payment of registration fees on the specified date.',
    t2: 'The learner must demonstrate good conduct, cleanliness, and appropriate dress.',
    t3: 'All individuals at the center must be respected: peers, teachers, and administrative staff.',
    t4: 'Study schedules must be respected and leaving without prior permission is not allowed.',
    t5: 'Absence from sessions is only permitted for urgent reasons with prior notification to administration.',
    t6: 'In case of absence without reason, the guardian will be notified.',
    t7: 'Session fees are not compensated for repeated absences or discontinuation of study.',
    t8: 'In case of study discontinuation, only 80% of the remaining value will be refunded.',
    t9: 'In case of long-term absence, please contact administration to resolve the situation.',
    t10: 'The center is not responsible for loss of any valuables (money, phone, jewelry...).',
    t11: 'Touching or operating educational equipment without permission is prohibited.',
    t12: 'Any damage to center equipment will result in punishment and compensation for losses.',
    t13: 'In case of unacceptable behavior, the guardian will be formally warned upon repeated violations.',
    t14: 'Agreement to publish learner photos on social networks and educational videos related to the center.',
    join_modal_title: 'Join E-PLUS Team',
    join_firstName: 'First Name',
    join_lastName: 'Last Name',
    join_phone: 'Phone Number',
    join_email: 'Email Address',
    join_role: 'Desired Role',
    join_role_teacher: '👨‍🏫 Teacher',
    join_role_supervisor: '🧑‍💼 Supervisor',
    join_role_admin: '📋 Admin',
    join_specialty: 'Specialty / Subject',
    join_experience: 'Experience & Qualifications',
    join_cv: 'Resume (PDF or Word)',
    join_cv_choose: 'Choose file',
    join_submit: 'Submit Application ✦',
    join_success: 'Request sent successfully',
    loading_title: 'Processing...',
    loading_msg: 'Please wait',
    requested_service: 'Requested service',
    loading_submitting: 'Submitting registration...',
    loading_wait_moment: 'Please wait a moment',
    loading_join_submitting: 'Submitting join request...',
    loading_join_wait: 'Please wait a moment',
    success_title: 'Completed Successfully',
    success_ok: 'OK ✦',
    success_reg_number: 'Registration No.:',
    success_msg: 'Operation completed successfully.',
    success_reg_done: 'Registration completed successfully',
    theme_aria: 'Toggle theme',
    theme_title: 'Toggle theme',
    hamburger_aria: 'Menu',
    lang_ar: 'AR',
    lang_en: 'EN',
    lang_fr: 'FR',
  },
  fr: {
    nav_home: 'Accueil',
    nav_programs: 'Programmes',
    nav_teachers: 'Enseignants',
    nav_paths: 'Parcours',
    nav_steps: 'Comment Rejoindre',
    nav_announcements: 'Annonces',
    nav_gallery: 'Galerie',
    nav_faq: 'FAQ',
    nav_join: 'Rejoignez Notre Équipe',
    nav_register: 'Inscrivez-vous ✦',
    mob_home: '🏠 Accueil',
    mob_programs: '📚 Programmes',
    mob_teachers: '👨‍🏫 Enseignants',
    mob_paths: '🛤️ Parcours',
    mob_steps: '📝 Comment Rejoindre',
    mob_announcements: '📢 Annonces',
    mob_gallery: '🖼️ Galerie',
    mob_faq: '❓ FAQ',
    mob_join: '🤝 Rejoignez Notre Équipe',
    topbar_new: 'Nouveau',
    topbar_camp: '🏕️ Camp d\'Été 2026 — Inscriptions Ouvertes',
    topbar_location: 'Ghamar, El Oued — Algérie',
    topbar_camp: 'Votre premier pas vers l\'excellence scolaire',
    hero_tag: 'Inscriptions au soutien scolaire ouvertes maintenant 🟡',
    hero_title: 'Inscrivez-vous aujourd\'hui... et commencez l\'année avec confiance',
    hero_subtitle: 'Un programme éducatif complet encadré par une élite d\'enseignants, dans des groupes limités, avec un suivi académique continu pour les meilleurs résultats.',
    hero_btn_register: 'Inscrivez-vous au Soutien ✦',
    hero_btn_camp: 'Inscrivez-vous au Camp d\'Été ☀',
    hero_btn_lang: 'Commencer les Langues',
    hero_btn_support: 'Commencer le Soutien',
    hero_btn_vip: 'Réserver VIP',
    hero_card_kicker: 'EXPÉRIENCE E-PLUS',
    hero_card_title: 'Une expérience éducative alliant qualité, clarté et résultats',
    hero_card_desc: 'Programmes variés de langues, soutien scolaire, préparation aux tests et tutorat individuel dans un environnement moderne et organisé.',
    hero_list_1: 'Suivi continu des étudiants',
    hero_list_2: 'Enseignants compétents avec des plans clairs',
    hero_list_3: 'Niveaux adaptés à tous les âges',
    hero_list_4: 'Cours en présentiel et en ligne',
    hero_btn_ielts: 'IELTS',
    hero_btn_online: 'En Ligne',
    stat_1: 'Programmes Éducatifs',
    stat_2: 'Étudiants & Bénéficiaires',
    stat_3: 'Enseignants & Superviseurs',
    stat_4: 'Parcours Principaux',
    trust_1_title: 'Objectifs Clairs',
    trust_1_desc: 'Chaque programme est construit sur des résultats éducatifs spécifiques et mesurables.',
    trust_2_title: 'Supervision Académique',
    trust_2_desc: 'Enseignants spécialisés expérimentés avec tous les niveaux.',
    trust_3_title: 'Approche Moderne',
    trust_3_desc: 'Apprentissage flexible et interactif en classe et en dehors.',
    trust_4_title: 'Résultats Tangibles',
    trust_4_desc: 'Accent sur le progrès réel de l\'élève en compétence et confiance.',
    achieve_1: 'Centre Agréé',
    achieve_2: 'Excellent Rating',
    achieve_3: 'Partenaire IELTS',
    achieve_4: '+3 Ans d\'Expérience',
    achieve_5: 'Cours en Ligne',
    prog_pretitle: 'Programmes',
    prog_title: 'Nos Programmes Éducatifs',
    prog_desc: 'Choisissez le programme qui correspond à votre niveau et à votre objectif, et commencez un parcours d\'apprentissage organisé.',
    prog_lang_title: 'Cours de Langues',
    prog_lang_desc: 'Apprenez l\'anglais, le français et plus encore à travers des niveaux progressifs et une pratique continue.',
    prog_lang_chip1: 'A0 - C2',
    prog_lang_chip2: 'Enfants & Adultes',
    prog_lang_chip3: 'En Présentiel',
    prog_lang_btn: 'Inscrivez-vous',
    prog_support_title: 'Soutien Scolaire',
    prog_support_desc: 'Séances de révision guidées avec organisation, suivi et renforcement des matières essentielles.',
    prog_support_chip1: 'Primaire',
    prog_support_chip2: 'Moyen',
    prog_support_chip3: 'Secondaire',
    prog_support_btn: 'Inscrivez-vous',
    prog_vip_title: 'Leçons VIP',
    prog_vip_desc: 'Enseignement individuel ou en très petits groupes avec une concentration totale sur les besoins de l\'élève.',
    prog_vip_chip1: 'Haute Flexibilité',
    prog_vip_chip2: 'Plan Personnalisé',
    prog_vip_chip3: 'Résultats Rapides',
    prog_vip_btn: 'Inscrivez-vous',
    prog_ielts_title: 'Préparation au Test IELTS',
    prog_ielts_desc: 'Programme spécialisé pour renforcer les quatre compétences et comprendre la structure du test.',
    prog_ielts_chip1: 'Listening',
    prog_ielts_chip2: 'Reading',
    prog_ielts_chip3: 'Writing & Speaking',
    prog_ielts_btn: 'Inscrivez-vous',
    prog_online_title: 'Cours en Ligne',
    prog_online_desc: 'Apprenez de n\'importe où avec des sessions en direct, du contenu organisé et un suivi numérique.',
    prog_online_chip1: 'À Distance',
    prog_online_chip2: 'Flexible',
    prog_online_chip3: 'Interactif',
    prog_online_btn: 'Inscrivez-vous',
    prog_training_title: 'Formations',
    prog_training_desc: 'Programmes de développement des compétences pour vous aider à grandir académiquement et professionnellement.',
    prog_training_chip1: 'Compétences',
    prog_training_chip2: 'Développement',
    prog_training_chip3: 'Qualification',
    prog_training_btn: 'Inscrivez-vous',
    prog_camp_title: 'Camp d\'Été 2026',
    prog_camp_desc: 'Activités éducatives, récréatives et de développement dans une expérience estivale unique.',
    prog_camp_badge: 'Inscrivez-vous',
    prog_photo_title: 'Photographie & Montage',
    prog_photo_desc: 'Apprenez les bases de la photographie et du montage vidéo professionnel.',
    prog_photo_chip1: 'Photographie',
    prog_photo_chip2: 'Montage',
    prog_photo_chip3: 'Projets Pratiques',
    prog_photo_btn: 'Inscrivez-vous',
    path_pretitle: 'Parcours',
    path_title: 'Parcours d\'Apprentissage',
    path_desc: 'Choisissez le parcours qui correspond à votre âge, votre niveau et vos objectifs académiques ou linguistiques.',
    path_kids_kicker: 'Enfants',
    path_kids_title: 'Parcours Enfants',
    path_kids_desc: 'Construisez une base solide en langue et en apprentissage avec des méthodes amusantes et interactives.',
    path_kids_1: 'Activités adaptées à l\'âge',
    path_kids_2: 'Apprentissage progressif et clair',
    path_kids_3: 'Encouragement et confiance',
    path_students_kicker: 'Élèves',
    path_students_title: 'Parcours Élèves',
    path_students_desc: 'Un véritable soutien scolaire et une amélioration des résultats avec un suivi régulier.',
    path_students_1: 'Explications simplifiées et organisées',
    path_students_2: 'Révision et exercices',
    path_students_3: 'Meilleure préparation aux examens',
    path_adults_kicker: 'Adultes',
    path_adults_title: 'Parcours Jeunes & Adultes',
    path_adults_desc: 'Développement linguistique et de compétences pour les études, le travail et les voyages.',
    path_adults_1: 'Programmes flexibles',
    path_adults_2: 'Accent sur l\'application',
    path_adults_3: 'Contenu pratique',
    step_pretitle: 'Comment ça marche',
    step_title: 'Comment Nous Rejoindre',
    step_desc: 'Des étapes simples et claires pour commencer le programme qui vous convient.',
    step_1_title: 'Contactez-Nous',
    step_1_desc: 'Envoyez-nous un message ou visitez le centre pour découvrir les programmes disponibles.',
    step_2_title: 'Évaluation du Niveau',
    step_2_desc: 'Nous vous aidons à choisir le parcours ou le programme le plus adapté.',
    step_3_title: 'Inscription',
    step_3_desc: 'Complétez vos informations et réservez votre place.',
    step_4_title: 'Commencez Votre Voyage',
    step_4_desc: 'Débutez une expérience d\'apprentissage moderne et intégrée.',
    why_pretitle: 'Pourquoi E-PLUS',
    why_title: 'Pourquoi E-PLUS ?',
    why_main_title: 'Un environnement d\'apprentissage moderne et clair',
    why_main_desc: 'Nous offrons une expérience organisée, élégante et pratique qui aide les étudiants à progresser avec confiance.',
    why_point_1: 'Contenu adapté à tous les âges',
    why_point_2: 'Organisation et suivi continu',
    why_point_3: 'Équilibre entre compréhension et application',
    why_point_4: 'Attention aux détails et à la qualité',
    why_mini_1_title: 'Variété de Programmes',
    why_mini_1_desc: 'Langues, soutien, VIP, IELTS, en ligne et formations.',
    why_mini_2_title: 'Flexibilité',
    why_mini_2_desc: 'Des options adaptées à votre temps, vos objectifs et votre niveau.',
    why_mini_3_title: 'Qualité',
    why_mini_3_desc: 'Accent sur une expérience premium avec des résultats tangibles.',
    teacher_pretitle: 'Enseignants',
    teacher_title: 'Notre Équipe Pédagogique',
    teacher_desc: 'Une équipe exceptionnelle dédiée à fournir une éducation organisée et efficace à un niveau professionnel.',
    ann_live: 'Dernières Annonces & Mises à Jour',
    ann_title: 'Annonces',
    ann_subtitle: 'Suivez les dernières nouvelles et offres du centre',
    ann_filter_all: 'Tout',
    ann_filter_general: '📢 Général',
    ann_filter_event: '🎉 Événement',
    ann_filter_urgent: '🚨 Urgent',
    ann_filter_offer: '🎁 Offre',
    ann_filter_news: '📰 Actualité',
    ann_loading: 'Chargement des annonces...',
    ann_empty: 'Aucune annonce dans cette catégorie',
    ann_read_more: 'Lire la suite',
    test_pretitle: 'Témoignages',
    test_title: 'Ce Que Disent Nos Étudiants',
    gal_pretitle: 'Galerie',
    gal_title: 'Galerie Photos du Centre',
    gal_desc: 'Des moments réels de l\'intérieur du Centre E-PLUS — un environnement d\'apprentissage moderne et intégré.',
    gal_lightbox_label: 'Voir l\'image',
    gal_lightbox_close: 'Fermer',
    gal_lightbox_prev: 'Précédent',
    gal_lightbox_next: 'Suivant',
    faq_pretitle: 'FAQ',
    faq_title: 'Questions Fréquentes',
    faq_q1: 'Qui peut s\'inscrire ?',
    faq_a1: 'Des programmes sont disponibles pour les enfants, les élèves, les jeunes et les adultes selon le type de programme et le niveau.',
    faq_q2: 'Y a-t-il des programmes en ligne ?',
    faq_a2: 'Oui, nous proposons des programmes en ligne dans certains parcours avec un suivi approprié.',
    faq_q3: 'Puis-je m\'inscrire aux leçons VIP ?',
    faq_a3: 'Oui, vous pouvez demander des leçons individuelles ou semi-individuelles selon la disponibilité et les besoins.',
    faq_q4: 'Comment savoir quel programme me convient ?',
    faq_a4: 'Contactez-nous et nous vous aiderons à choisir le programme le plus adapté à votre niveau et à votre objectif.',
    contact_pretitle: 'Contact',
    contact_title: 'Prenez Contact',
    contact_desc: 'Nous sommes heureux de répondre à vos questions et de vous aider à choisir le bon programme.',
    contact_btn_call: 'Appelez-Nous',
    contact_btn_whatsapp: 'WhatsApp',
    contact_address_label: 'Adresse',
    contact_address: 'Hay Echouhada, en face de la Route Nationale 48 — Ghamar, El Oued, Algérie',
    contact_phone_label: 'Téléphone',
    contact_email_label: 'Email',
    contact_hours_title: 'Heures d\'Ouverture',
    contact_hours_morning: 'Heures du Matin',
    contact_hours_evening: 'Heures du Soir',
    contact_hours_days: 'Samedi — Vendredi',
    contact_hours_note: 'Veuillez visiter pendant les heures d\'ouverture officielles pour les demandes de renseignements et les inscriptions.',
    join_title: 'Souhaitez-vous rejoindre notre équipe ?',
    join_desc: 'Nous accueillons les enseignants, les superviseurs et les créatifs qui souhaitent contribuer à une expérience éducative exceptionnelle.',
    join_btn: 'Rejoignez Notre Équipe',
    join_btn_terms: 'Conditions',
    footer_copy: '© 2026 E-PLUS Center — Tous droits réservés.',
    footer_programs: 'Programmes',
    footer_faq: 'FAQ',
    footer_contact: 'Contact',
    form_title: 'Formulaire d\'Inscription',
    form_lang_warning_fr: 'Veuillez saisir toutes les informations en français uniquement',
    form_lang_warning_ar: 'يرجى إدخال جميع المعلومات باللغة العربية فقط',
    form_lang_warning_en: 'Please enter all information in English only',
    firstName: 'Prénom',
    lastName: 'Nom de Famille',
    birthDate: 'Date de Naissance',
    birthPlace: 'Lieu de Naissance / Adresse',
    phone: 'Numéro de Téléphone',
    motivation: 'Qu\'est-ce qui vous a motivé à choisir le Centre E-PLUS ?',
    motivationVip: 'Qu\'est-ce qui vous a amené à choisir d\'étudier via le système de leçons privées VIP ?',
    optional: '(optionnel)',
    eduLevel: 'Niveau d\'Études',
    specialty: 'Spécialité',
    subject: 'Matière',
    teacher: 'Enseignant(e)',
    candidateType: 'Type de Candidat',
    enrolled: 'Inscrit',
    freeCandidate: 'Libre',
    parentInfo: 'Infos Parent / Tuteur',
    parentName: 'Nom du Parent',
    parentPhone: 'Téléphone du Parent',
    langType: 'Choisir la Langue',
    langLevel: 'Niveau de Langue (CEFR)',
    levelTest: 'Souhaitez-vous un test de niveau ?',
    yes: 'Oui',
    no: 'Non',
    vipType: 'Type de Leçon VIP',
    vipSupport: '📚 Soutien Scolaire',
    vipLang: '🌍 Langues',
    vipDaysCount: 'Combien de jours par semaine ?',
    chooseDays: 'Choisir les Jours',
    daysSelected: 'jour(s) sélectionné(s)',
    submitBtn: 'Finaliser l\'Inscription ✦',
    form_support_type: "Type d'inscription au Soutien",
    form_support_school: 'Soutien Scolaire',
    form_support_course: 'Cours Libres',
    form_support_select: '-- Sélectionnez --',
    form_support_select_subject: '-- Choisir la matière --',
    form_support_select_teacher: '-- Choisir l\'enseignant(e) --',
    form_support_select_specialty: '-- Choisir la spécialité --',
    form_training_title: 'Formation',
    form_training_graphic: 'Design Graphique',
    form_training_prog: 'Programmation',
    form_training_comm: 'Compétences en Communication',
    form_training_accounting: 'Comptabilité & Gestion',
    form_training_marketing: 'Marketing Digital',
    form_training_other: 'Autre',
    form_training_level: 'Votre Niveau',
    form_training_beginner: '🔰 Débutant',
    form_training_intermediate: '📈 Quelques Bases',
    form_training_advanced: '🚀 Avancé — Je veux approfondir',
    form_training_mode: 'Méthode d\'Apprentissage Préférée',
    form_training_presential: '🏫 Au Centre',
    form_training_online: '💻 En Ligne',
    form_training_mixed: '🔄 Mixte (Présentiel + En Ligne)',
    form_vip_support: 'VIP Soutien Scolaire',
    form_vip_lang: 'VIP Langues',
    form_vip_days: 'Combien de jours par semaine ?',
    form_vip_choose_days_prefix: 'Choisir',
    form_vip_choose_days_suffix: 'jour(s) par semaine',
    form_lang_select: '-- Choisir la langue --',
    form_level_select: '-- Choisissez votre niveau --',
    form_cefr_hint: 'Choisissez le niveau approprié — nous pouvons vous aider avec un test de placement si vous n\'êtes pas sûr.',
    form_level_test_note: '🧪 Le test prend ~15 minutes et nous aide à vous placer dans le bon groupe.',
    form_level_test_yes: '✅ Oui, je veux le test',
    form_level_test_no: '❌ Non, je suis sûr de mon niveau',
    form_coming_soon: 'Les cours pour ce niveau seront bientôt disponibles',
    form_course_select: 'Choisir le cours',
    form_course_placeholder: '-- Choisir le cours --',
    termsTitle: 'Conditions Générales du Centre',
    termsAgree: 'J\'ai lu toutes les conditions générales et je les accepte',
    termsProceed: 'Confirmer l\'Inscription ✦',
    terms_scroll_hint: 'Faites défiler pour lire toutes les conditions',
    t1: 'L\'apprenant est officiellement inscrit après paiement des frais d\'inscription à la date spécifiée.',
    t2: 'L\'apprenant doit faire preuve de bonne conduite, de propreté et d\'une tenue appropriée.',
    t3: 'Toutes les personnes au centre doivent être respectées : camarades, enseignants et personnel administratif.',
    t4: 'Les horaires d\'étude doivent être respectés et le départ sans autorisation préalable n\'est pas autorisé.',
    t5: 'L\'absence aux séances n\'est autorisée que pour des raisons urgentes avec notification préalable à l\'administration.',
    t6: 'En cas d\'absence sans raison, le tuteur sera informé.',
    t7: 'Les frais de séance ne sont pas compensés en cas d\'absences répétées ou d\'arrêt des études.',
    t8: 'En cas d\'arrêt des études, seulement 80% de la valeur restante sera remboursée.',
    t9: 'En cas d\'absence prolongée, veuillez contacter l\'administration pour régulariser la situation.',
    t10: 'Le centre n\'est pas responsable de la perte d\'objets de valeur (argent, téléphone, bijoux...).',
    t11: 'Il est interdit de toucher ou d\'utiliser l\'équipement éducatif sans autorisation.',
    t12: 'Tout dommage à l\'équipement du centre entraînera une sanction et une compensation des pertes.',
    t13: 'En cas de comportement inacceptable, le tuteur sera averti par écrit en cas de récidive.',
    t14: 'Accord pour publier des photos de l\'apprenant sur les réseaux sociaux et les vidéos éducatives liées au centre.',
    join_modal_title: 'Rejoindre l\'Équipe E-PLUS',
    join_firstName: 'Prénom',
    join_lastName: 'Nom de Famille',
    join_phone: 'Numéro de Téléphone',
    join_email: 'Adresse Email',
    join_role: 'Rôle Souhaité',
    join_role_teacher: '👨‍🏫 Enseignant',
    join_role_supervisor: '🧑‍💼 Superviseur',
    join_role_admin: '📋 Administrateur',
    join_specialty: 'Spécialité / Matière',
    join_experience: 'Expérience & Qualifications',
    join_cv: 'CV (PDF ou Word)',
    join_cv_choose: 'Choisir le fichier',
    join_submit: 'Soumettre la Candidature ✦',
    join_success: 'Candidature envoyée avec succès',
    loading_title: 'Traitement en cours...',
    loading_msg: 'Veuillez patienter',
    requested_service: 'Service demandé',
    loading_submitting: 'Envoi de l\'inscription...',
    loading_wait_moment: 'Veuillez patienter un instant',
    loading_join_submitting: 'Envoi de la candidature...',
    loading_join_wait: 'Veuillez patienter un instant',
    success_title: 'Réussi',
    success_ok: 'OK ✦',
    success_reg_number: 'N° d\'inscription :',
    success_msg: 'Opération effectuée avec succès.',
    success_reg_done: 'Inscription effectuée avec succès',
    theme_aria: 'Changer le thème',
    theme_title: 'Changer le thème',
    hamburger_aria: 'Menu',
    lang_ar: 'AR',
    lang_en: 'EN',
    lang_fr: 'FR',
  }
};

function hideLogo() {
  const el = $('.top-logo');
  if (el) el.style.display = 'none';
}

function showLogo() {
  const el = $('.top-logo');
  if (el) el.style.display = 'flex';
}

function setLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  // Update desktop lang buttons
  $$('.ep-lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  localStorage.setItem('ep-lang', lang);
  const t = i18n[lang];
  // Translate all data-i18n elements
  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) {
      el.innerHTML = t[key];
    }
  });
  // Translate data-i18n-html elements (for HTML content)
  $$('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (t[key] !== undefined) {
      el.innerHTML = t[key];
    }
  });
  // Language warning in registration form
  const warnIcon = byId('lang-warning-icon');
  const warnText = byId('lang-warning-text');
  if (warnIcon) {
    warnIcon.textContent = lang === 'ar' ? '🇩🇿' : lang === 'fr' ? '🇫🇷' : '🇬🇧';
  }
  if (warnText) {
    const key = 'form_lang_warning_' + lang;
    warnText.textContent = t[key] || (lang === 'ar' ? 'يرجى إدخال جميع المعلومات باللغة العربية فقط' : lang === 'fr' ? 'Veuillez saisir toutes les informations en français uniquement' : 'Please enter all information in English only');
  }
  // Re-render announcements if cached
  if (window._annCache && window._annCache.length > 0) {
    renderAnnouncementSlider(window._annCache);
  }
  // Update theme toggle aria label
  $$('#ep-theme-toggle, #ep-theme-toggle-mob').forEach(el => {
    if (t.theme_aria) el.setAttribute('aria-label', t.theme_aria);
    if (t.theme_title) el.setAttribute('title', t.theme_title);
  });
  // Update hamburger aria-label
  const hamburger = byId('ep-hamburger');
  if (hamburger && t.hamburger_aria) {
    hamburger.setAttribute('aria-label', t.hamburger_aria);
  }
}

/* ──────────────────────────────────────────────────────────
   LANGUAGE VALIDATION
────────────────────────────────────────────────────────── */
function isArabic(text) {
  return /[؀-ۿ]/.test(text);
}

function isEnglish(text) {
  return /[a-zA-Z]/.test(text);
}

function isFrench(text) {
  return /[a-zA-Zàâäéèêëïîôöùûüÿçœæ]/i.test(text) && /[àâäéèêëïîôöùûüÿçœæ]/i.test(text);
}

function validateLang(text) {
  if (!text.trim()) return true;
  if (currentLang === 'ar') return isArabic(text) && !isEnglish(text);
  if (currentLang === 'en') return isEnglish(text) && !isArabic(text);
  if (currentLang === 'fr') return isFrench(text) || (isEnglish(text) && !isArabic(text));
  return true;
}

/* ──────────────────────────────────────────────────────────
   DATA SOURCES
────────────────────────────────────────────────────────── */
const specialties = {
  'أولى ثانوي': ['علوم تجريبية', 'آداب ولغات'],
  'ثانية ثانوي': ['علوم تجريبية', 'تقني رياضي', 'رياضيات', 'تسيير واقتصاد', 'آداب وفلسفة', 'لغات أجنبية'],
  'ثالثة ثانوي (بكالوريا)': ['علوم تجريبية', 'تقني رياضي', 'رياضيات', 'تسيير واقتصاد', 'آداب وفلسفة', 'لغات أجنبية']
};

const curriculum = {
  'تحضيري': [],
  'أولى ابتدائي': [],
  'ثانية ابتدائي': [],
  'ثالثة ابتدائي': [],
  'رابعة ابتدائي': [],
  'خامسة ابتدائي': [],
  'أولى متوسط': [],
  'ثانية متوسط': [],
  'ثالثة متوسط': [],
  'رابعة متوسط': [
    { subject: 'رياضيات', teachers: ['الأستاذ شامي سهيل'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذة نصبة فاطمة'] },
    { subject: 'اللغة الفرنسية', teachers: ['الأستاذة مرغني ريهام'] },
    { subject: 'اللغة العربية', teachers: ['الأستاذة سويد هدى'] },
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teachers: ['الأستاذ خنوفة علي'] },
    { subject: 'علوم الطبيعة والحياة', teachers: ['الأستاذ خنوفة علي'] }
  ],
  'أولى ثانوي|علوم تجريبية': [],
  'أولى ثانوي|آداب ولغات': [],
  'ثانية ثانوي|علوم تجريبية': [],
  'ثانية ثانوي|تقني رياضي': [],
  'ثانية ثانوي|رياضيات': [],
  'ثانية ثانوي|تسيير واقتصاد': [],
  'ثانية ثانوي|آداب وفلسفة': [],
  'ثانية ثانوي|لغات أجنبية': [],
  'ثالثة ثانوي (بكالوريا)|علوم تجريبية': [
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teachers: ['الأستاذ نمسي عبدالرحمان', 'الأستاذ لكموتة لمين'] },
    { subject: 'الرياضيات (العلميين)', teachers: ['الأستاذة ترعة فاطمة', 'الأستاذ عبدالباسط نعورة'] },
    { subject: 'العلوم الطبيعية والحياة', teachers: ['الأستاذ صحراوي شكري'] },
    { subject: 'اللغة العربية', teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الفرنسية', teachers: ['الأستاذة كروش شمس الهدى'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذ كرام الصادق'] },
    { subject: 'تاريخ وجغرافيا', teachers: ['الأستاذ ايمن دخان'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ],
  'ثالثة ثانوي (بكالوريا)|تقني رياضي': [
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teachers: ['الأستاذ نمسي عبدالرحمان', 'الأستاذ لكموتة لمين'] },
    { subject: 'الرياضيات (العلميين)', teachers: ['الأستاذة ترعة فاطمة', 'الأستاذ عبدالباسط نعورة'] },
    { subject: 'اللغة العربية', teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذ كرام الصادق'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ],
  'ثالثة ثانوي (بكالوريا)|رياضيات': [
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teachers: ['الأستاذ نمسي عبدالرحمان', 'الأستاذ لكموتة لمين'] },
    { subject: 'الرياضيات (العلميين)', teachers: ['الأستاذة ترعة فاطمة', 'الأستاذ عبدالباسط نعورة'] },
    { subject: 'اللغة العربية', teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذ كرام الصادق'] },
    { subject: 'الفلسفة', teachers: ['الأستاذة دادة نجاح سلام'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ],
  'ثالثة ثانوي (بكالوريا)|تسيير واقتصاد': [
    { subject: 'المحاسبة', teachers: ['الأستاذ سرهود عبدالرحمان'] },
    { subject: 'اقتصاد وقانون', teachers: ['الأستاذ سرهود عبدالرحمان'] },
    { subject: 'اللغة العربية', teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذ كرام الصادق'] },
    { subject: 'الفلسفة', teachers: ['الأستاذة دادة نجاح سلام'] },
    { subject: 'تاريخ وجغرافيا', teachers: ['الأستاذ ايمن دخان'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ],
  'ثالثة ثانوي (بكالوريا)|آداب وفلسفة': [
    { subject: 'اللغة العربية', teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الفرنسية', teachers: ['الأستاذة كروش شمس الهدى'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذ كرام الصادق'] },
    { subject: 'الفلسفة', teachers: ['الأستاذة دادة نجاح سلام'] },
    { subject: 'تاريخ وجغرافيا', teachers: ['الأستاذ ايمن دخان'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ],
  'ثالثة ثانوي (بكالوريا)|لغات أجنبية': [
    { subject: 'اللغة الإسبانية', teachers: ['الأستاذ طوالبية ابراهيم'] },
    { subject: 'اللغة الألمانية', teachers: ['الأستاذ علال حمزة'] },
    { subject: 'اللغة العربية', teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الفرنسية', teachers: ['الأستاذة كروش شمس الهدى'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذ كرام الصادق'] },
    { subject: 'الرياضيات (أدبيين)', teachers: ['الأستاذ هبيتة ربيع'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ]
};

const coursesCurriculum = {
  'ثالثة ثانوي (بكالوريا)': [
    { course: 'دورة اللغة الإنجليزية', teacher: 'الأستاذ كرام الصادق' },
    { course: 'دورة اللغة الفرنسية', teacher: 'الأستاذة كروش شمس الهدى' },
    { course: 'دورة اللغة العربية', teacher: 'الأستاذة موساوي زبيدة' },
    { course: 'دورة العلوم الإسلامية', teacher: 'الأستاذ هبيتة ربيع' },
    { course: 'دورة الفلسفة', teacher: 'الأستاذة دادة نجاح سلام' },
    { course: 'دورة التاريخ (الحرب الباردة)', teacher: 'الأستاذ دخان أيمن' },
    { course: 'دورة التاريخ (الثورة الجزائرية)', teacher: 'الأستاذ دخان أيمن' },
    { course: 'دورة الجغرافيا (الفصل الأول والفصل الثاني)', teacher: 'الأستاذ دخان أيمن' }
  ]
};

const takwiniOptions = [
  '📸 تصوير بالهاتف',
  '🎨 جرافيكس ديزاين',
  '💻 تطوير الويب'
];

const needsParent = [
  'تحضيري',
  'أولى ابتدائي',
  'ثانية ابتدائي',
  'ثالثة ابتدائي',
  'رابعة ابتدائي',
  'خامسة ابتدائي',
  'أولى متوسط',
  'ثانية متوسط',
  'ثالثة متوسط',
  'رابعة متوسط'
];

const needsSpecialty = [
  'أولى ثانوي',
  'ثانية ثانوي',
  'ثالثة ثانوي (بكالوريا)'
];

const needsCandidateType = [
  'ثالثة ثانوي (بكالوريا)'
];

/* ──────────────────────────────────────────────────────────
   STATE
────────────────────────────────────────────────────────── */
let currentModalType = '';
let pendingFormData  = null;
let maxDaysAllowed   = 2;

window._annCache = [];
let annCurrentIndex = 0;
let annAutoTimer    = null;

/* ──────────────────────────────────────────────────────────
   GENERAL HELPERS
────────────────────────────────────────────────────────── */
function animateShow(el) {
  if (!el) return;
  el.style.display = 'block';
  el.classList.remove('field-appear');
  void el.offsetWidth;
  el.classList.add('field-appear');
}

function hideField(el, ...ids) {
  if (!el) return;
  el.style.display = 'none';
  ids.forEach(id => {
    const field = byId(id);
    if (!field) return;
    field.removeAttribute('required');
    if ('value' in field) field.value = '';
  });
}

function lockPageScroll() {
  document.body.style.overflow = 'hidden';
}

function unlockPageScroll() {
  document.body.style.overflow = '';
}

/* ──────────────────────────────────────────────────────────
   MODAL OPEN / CLOSE
────────────────────────────────────────────────────────── */
function openModal(type) {
  currentModalType = type;
  resetForm();
  const modalTitles = {
    ar: { support: 'تسجيل — دعم دراسي', lang: 'تسجيل — دورات اللغات', vip: 'تسجيل — دروس VIP', ielts: 'تسجيل — اختبار IELTS', online: 'تسجيل — دورات أونلاين', takwini: 'تسجيل — دورات تكوينية' },
    en: { support: 'Registration — Academic Support', lang: 'Registration — Language Courses', vip: 'Registration — VIP Lessons', ielts: 'Registration — IELTS Test', online: 'Registration — Online Courses', takwini: 'Registration — Training Courses' },
    fr: { support: 'Inscription — Soutien Scolaire', lang: 'Inscription — Cours de Langues', vip: 'Inscription — Leçons VIP', ielts: 'Inscription — Test IELTS', online: 'Inscription — Cours en Ligne', takwini: 'Inscription — Formations' }
  };
  const titles = modalTitles[currentLang] || modalTitles.ar;
  const modalTitle = byId('program-modal-title');
  if (modalTitle) modalTitle.textContent = titles[type] || 'نموذج التسجيل';
  const motivationLabel = $('label[for="motivation"] span[data-i18n="motivation"]');
  if (motivationLabel) {
    motivationLabel.textContent = type === 'vip' ? i18n[currentLang].motivationVip : i18n[currentLang].motivation;
  }
  // Show lang warning
  const langWarn = byId('lang-warning');
  if (langWarn) langWarn.style.display = 'flex';
  setLang(currentLang);

  const langGrp    = byId('langTypeGroup');
  const vipTypeGrp = byId('vipTypeGroup');
  hideField(langGrp, 'langType');
  hideField(vipTypeGrp);
  if (type === 'support') {
    animateShow(byId('supportTypeGroup'));
  } else if (type === 'lang' || type === 'online') {
    animateShow(langGrp);
    langGrp?.querySelector('select')?.setAttribute('required', 'required');
  } else if (type === 'vip') {
    animateShow(vipTypeGrp);
  } else if (type === 'ielts') {
    const daysCountGrp = byId('vipDaysCountGroup');
    animateShow(daysCountGrp);
    daysCountGrp?.querySelector('select')?.setAttribute('required', 'required');
  } else if (type === 'takwini') {
    showTakwiniOptions();
  }
  const modal = byId('program-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
  lockPageScroll();
}

function closeModal() {
  const modal = byId('program-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  const langWarn = byId('lang-warning');
  if (langWarn) langWarn.style.display = 'none';
  unlockPageScroll();
  resetForm();
}

function closeModalOutside(e) {
  if (e.target === byId('program-modal')) closeModal();
}

/* ──────────────────────────────────────────────────────────
   RESET FORM
────────────────────────────────────────────────────────── */
function resetForm() {
  byId('reg-form')?.reset();
  const groups = [
    'supportTypeGroup', 'eduLevelGroup', 'candidateTypeGroup',
    'specialtyGroup', 'subjectGroup', 'teacherGroup', 'parentGroup',
    'langTypeGroup', 'langLevelGroup', 'levelTestGroup',
    'vipTypeGroup', 'vipEduLevelGroup', 'professionGroup',
    'vipDaysCountGroup', 'daysGroup'
  ];
  groups.forEach(id => {
    const el = byId(id);
    if (el) el.style.display = 'none';
  });
  byId('comingSoonNote')?.remove();
  byId('coursesListGroup')?.remove();
  byId('takwiniOptionsGroup')?.remove();
  $$('input[name="vipType"]').forEach(r => (r.checked = false));
  $$('input[name="candidateType"]').forEach(r => (r.checked = false));
  $$('input[name="levelTest"]').forEach(r => (r.checked = false));
  $$('input[name="takwiniOption"]').forEach(r => (r.checked = false));
  $$('input[name="supportType"]').forEach(r => (r.checked = false));
  ['langType', 'langLevel', 'eduLevel', 'specialty', 'subject', 'teacher',
   'vipDaysCount', 'vipEduLevel', 'profession'].forEach(id => {
    const el = byId(id);
    if (!el) return;
    el.removeAttribute('required');
    el.value = '';
  });
  resetDays();
  maxDaysAllowed = 2;
  const motivationLabel = $('label[for="motivation"] span[data-i18n="motivation"]');
  if (motivationLabel) motivationLabel.textContent = i18n[currentLang].motivation;
}

/* ──────────────────────────────────────────────────────────
   DAYS SELECTION
────────────────────────────────────────────────────────── */
function onDayChange(checkbox) {
  const checked = $$('input[name="days"]:checked');
  const count = checked.length;
  if (count > maxDaysAllowed) {
    checkbox.checked = false;
    return;
  }
  $$('.day-card').forEach(card => {
    const input = $('input', card);
    const isChecked = !!input?.checked;
    card.classList.toggle('selected', isChecked);
    if (!isChecked && count >= maxDaysAllowed) {
      card.classList.add('disabled');
    } else {
      card.classList.remove('disabled');
    }
  });
  const countEl = byId('days-count');
  if (countEl) countEl.textContent = String(Math.min(count, maxDaysAllowed));
  const counter = byId('days-counter');
  if (counter) counter.classList.toggle('complete', count === maxDaysAllowed);
}

function resetDays() {
  $$('input[name="days"]').forEach(c => (c.checked = false));
  $$('.day-card').forEach(card => card.classList.remove('selected', 'disabled'));
  const countEl = byId('days-count');
  if (countEl) countEl.textContent = '0';
  byId('days-counter')?.classList.remove('complete');
}

function onVipDaysCountChange() {
  const val = parseInt(byId('vipDaysCount')?.value || '0', 10);
  const daysGrp = byId('daysGroup');
  resetDays();
  if (!val) {
    if (daysGrp) daysGrp.style.display = 'none';
    return;
  }
  maxDaysAllowed = val;
  const daysOfLabel = byId('days-of-label');
  if (daysOfLabel) daysOfLabel.textContent = `/${val}`;
  const chooseLabel = $('[data-i18n="chooseDays"]');
  if (chooseLabel) {
    if (currentLang === 'ar') chooseLabel.textContent = `اختر ${val} ${val === 1 ? 'يوم' : 'أيام'} للحضور في الأسبوع`;
    else if (currentLang === 'fr') chooseLabel.textContent = `Choisir ${val} jour${val > 1 ? 's' : ''} par semaine`;
    else chooseLabel.textContent = `Choose ${val} day${val > 1 ? 's' : ''} per week`;
  }
  const countEl = byId('days-count');
  if (countEl) countEl.textContent = '0';
  animateShow(daysGrp);
}

/* ──────────────────────────────────────────────────────────
   FORM UI HELPERS
────────────────────────────────────────────────────────── */
function showComingSoon(afterEl) {
  if (!afterEl) return;
  byId('comingSoonNote')?.remove();
  const note = document.createElement('div');
  note.id = 'comingSoonNote';
  note.className = 'coming-soon-note field-appear';
  note.innerHTML = `
    <span>🚧</span>
    <span>${__('form_coming_soon', 'Courses for this level will be added soon')}</span>
  `;
  afterEl.insertAdjacentElement('afterend', note);
}

function showCoursesList(level, courses) {
  byId('coursesListGroup')?.remove();
  byId('comingSoonNote')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'coursesListGroup';
  wrap.className = 'form-group field-appear';
  const label = document.createElement('label');
  label.className = 'form-label';
  label.innerHTML = `<span>${__('form_course_select', 'Choose course')}</span><span>*</span>`;
  wrap.appendChild(label);
  const select = document.createElement('select');
  select.className = 'form-input';
  select.id = 'courseSelect';
  select.setAttribute('required', 'required');
  select.innerHTML = `<option value="">${__('form_course_placeholder', '-- Choose course --')}</option>`;
  courses.forEach(item => {
    const opt = document.createElement('option');
    opt.value = `${item.course} — ${item.teacher}`;
    opt.textContent = `${item.course} — ${item.teacher}`;
    select.appendChild(opt);
  });
  wrap.appendChild(select);
  byId('eduLevelGroup')?.insertAdjacentElement('afterend', wrap);
}

function populateSubjects(key) {
  const subGrp   = byId('subjectGroup');
  const subSel   = byId('subject');
  const teachGrp = byId('teacherGroup');
  byId('comingSoonNote')?.remove();
  hideField(subGrp, 'subject');
  hideField(teachGrp, 'teacher');
  const subjects = curriculum[key] ?? [];
  if (subjects.length === 0) {
    const specGrp = byId('specialtyGroup');
    const eduGrp  = byId('eduLevelGroup');
    const afterEl = specGrp?.style.display !== 'none' ? specGrp : eduGrp;
    showComingSoon(afterEl);
    return;
  }
  if (!subSel) return;
  subSel.innerHTML = `<option value="">${__('form_support_select_subject', '-- Choose subject --')}</option>`;
  subjects.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.subject;
    opt.textContent = item.subject;
    subSel.appendChild(opt);
  });
  animateShow(subGrp);
  subSel.setAttribute('required', 'required');
}

/* ──────────────────────────────────────────────────────────
   LANGUAGE COURSE FLOW
────────────────────────────────────────────────────────── */
function onLangTypeChange() {
  const value        = byId('langType')?.value;
  const langLvlGrp   = byId('langLevelGroup');
  const levelTestGrp = byId('levelTestGroup');
  hideField(langLvlGrp, 'langLevel');
  hideField(levelTestGrp);
  $$('input[name="levelTest"]').forEach(r => (r.checked = false));
  if (value) {
    animateShow(langLvlGrp);
    langLvlGrp?.querySelector('select')?.setAttribute('required', 'required');
  }
}

function onLangLevelChange() {
  const value = byId('langLevel')?.value;
  const levelTestGrp = byId('levelTestGroup');
  if (value) {
    animateShow(levelTestGrp);
  } else if (levelTestGrp) {
    levelTestGrp.style.display = 'none';
    $$('input[name="levelTest"]').forEach(r => (r.checked = false));
  }
}

/* ──────────────────────────────────────────────────────────
   SUPPORT FLOW
────────────────────────────────────────────────────────── */
function onBirthDateChange() {}

function onSupportTypeChange() {
  const selected = $('input[name="supportType"]:checked')?.value;
  const eduGrp = byId('eduLevelGroup');
  hideField(eduGrp, 'eduLevel');
  hideField(byId('specialtyGroup'), 'specialty');
  hideField(byId('subjectGroup'), 'subject');
  hideField(byId('teacherGroup'), 'teacher');
  hideField(byId('candidateTypeGroup'));
  hideField(byId('parentGroup'), 'parentName', 'parentPhone');
  byId('comingSoonNote')?.remove();
  byId('coursesListGroup')?.remove();
  if (selected) {
    animateShow(eduGrp);
    eduGrp?.querySelector('select')?.setAttribute('required', 'required');
  }
}

function onEduLevelChange() {
  const level            = byId('eduLevel')?.value;
  const parentGrp        = byId('parentGroup');
  const specialtyGrp     = byId('specialtyGroup');
  const subGrp           = byId('subjectGroup');
  const teachGrp         = byId('teacherGroup');
  const candidateTypeGrp = byId('candidateTypeGroup');
  const parentName       = byId('parentName');
  const parentPhone      = byId('parentPhone');
  const supportType      = $('input[name="supportType"]:checked')?.value || '';
  byId('comingSoonNote')?.remove();
  byId('coursesListGroup')?.remove();
  hideField(parentGrp, 'parentName', 'parentPhone');
  hideField(specialtyGrp, 'specialty');
  hideField(subGrp, 'subject');
  hideField(teachGrp, 'teacher');
  hideField(candidateTypeGrp);
  parentName?.removeAttribute('required');
  parentPhone?.removeAttribute('required');
  $$('input[name="candidateType"]').forEach(r => (r.checked = false));
  if (!level) return;
  if (supportType === 'دورات مدرسية') {
    const courses = coursesCurriculum[level];
    if (!courses || courses.length === 0) {
      showComingSoon(byId('eduLevelGroup'));
    } else {
      showCoursesList(level, courses);
    }
    return;
  }
  if (needsCandidateType.includes(level)) {
    animateShow(candidateTypeGrp);
    return;
  }
  if (needsSpecialty.includes(level)) {
    showSpecialtyField(level);
    return;
  }
  populateSubjects(level);
}

function onCandidateTypeChange() {
  const level = byId('eduLevel')?.value;
  byId('comingSoonNote')?.remove();
  hideField(byId('specialtyGroup'), 'specialty');
  hideField(byId('subjectGroup'), 'subject');
  hideField(byId('teacherGroup'), 'teacher');
  hideField(byId('parentGroup'), 'parentName', 'parentPhone');
  if (!$('input[name="candidateType"]:checked')) return;
  showSpecialtyField(level);
}

function showSpecialtyField(level) {
  const specialtyGrp = byId('specialtyGroup');
  const specialtySel = byId('specialty');
  const specs = specialties[level] || [];
  if (!specialtySel) return;
  specialtySel.innerHTML = `<option value="">${__('form_support_select_specialty', '-- Choose specialty --')}</option>`;
  specs.forEach(sp => {
    const opt = document.createElement('option');
    opt.value = sp;
    opt.textContent = sp;
    specialtySel.appendChild(opt);
  });
  animateShow(specialtyGrp);
  specialtySel.setAttribute('required', 'required');
}

function onSpecialtyChange() {
  const level = byId('eduLevel')?.value;
  const spec  = byId('specialty')?.value;
  byId('comingSoonNote')?.remove();
  hideField(byId('subjectGroup'), 'subject');
  hideField(byId('teacherGroup'), 'teacher');
  hideField(byId('parentGroup'), 'parentName', 'parentPhone');
  if (!spec) return;
  populateSubjects(`${level}|${spec}`);
}

function onSubjectChange() {
  const level      = byId('eduLevel')?.value;
  const spec       = byId('specialty')?.value;
  const subjectVal = byId('subject')?.value;
  const teachGrp   = byId('teacherGroup');
  const teachSel   = byId('teacher');
  hideField(teachGrp, 'teacher');
  hideField(byId('parentGroup'), 'parentName', 'parentPhone');
  if (!subjectVal || !teachSel) return;
  const key      = spec ? `${level}|${spec}` : level;
  const subjects = curriculum[key] || [];
  const found    = subjects.find(s => s.subject === subjectVal);
  if (!found || !found.teachers.length) return;
  teachSel.innerHTML = `<option value="">${__('form_support_select_teacher', '-- Choose teacher --')}</option>`;
  found.teachers.forEach(teacher => {
    const opt = document.createElement('option');
    opt.value = teacher;
    opt.textContent = teacher;
    teachSel.appendChild(opt);
  });
  if (found.teachers.length === 1) {
    teachSel.value = found.teachers[0];
    if (currentModalType === 'support') showParentIfNeeded(level);
  }
  animateShow(teachGrp);
  teachSel.setAttribute('required', 'required');
}

function onTeacherChange() {
  const level = byId('eduLevel')?.value;
  const teacherVal = byId('teacher')?.value;
  hideField(byId('parentGroup'), 'parentName', 'parentPhone');
  if (teacherVal && currentModalType === 'support') {
    showParentIfNeeded(level);
  }
}

function showParentIfNeeded(level) {
  if (!needsParent.includes(level)) return;
  const parentGrp   = byId('parentGroup');
  const parentName  = byId('parentName');
  const parentPhone = byId('parentPhone');
  animateShow(parentGrp);
  parentName?.setAttribute('required', 'required');
  parentPhone?.setAttribute('required', 'required');
}

/* ──────────────────────────────────────────────────────────
   VIP FLOW
────────────────────────────────────────────────────────── */
function onVipTypeChange() {
  const selected = $('input[name="vipType"]:checked')?.value;
  const allGroups = [
    'vipEduLevelGroup', 'vipDaysCountGroup', 'professionGroup',
    'daysGroup', 'langTypeGroup', 'langLevelGroup', 'levelTestGroup'
  ];
  allGroups.forEach(id => {
    const el = byId(id);
    if (el) el.style.display = 'none';
  });
  resetDays();
  if (byId('vipDaysCount')) byId('vipDaysCount').value = '';
  if (byId('profession')) byId('profession').value = '';
  if (byId('langType')) byId('langType').value = '';
  if (byId('langLevel')) byId('langLevel').value = '';
  $$('input[name="levelTest"]').forEach(r => (r.checked = false));
  if (selected === 'support') {
    animateShow(byId('vipEduLevelGroup'));
    byId('vipEduLevel')?.setAttribute('required', 'required');
  } else if (selected === 'lang') {
    animateShow(byId('professionGroup'));
    byId('profession')?.setAttribute('required', 'required');
    animateShow(byId('langTypeGroup'));
    byId('langType')?.setAttribute('required', 'required');
  }
}

function onVipEduLevelChange() {
  const level = byId('vipEduLevel')?.value;
  const daysCountGrp = byId('vipDaysCountGroup');
  const daysGrp = byId('daysGroup');
  hideField(daysCountGrp);
  hideField(daysGrp);
  resetDays();
  if (byId('vipDaysCount')) byId('vipDaysCount').value = '';
  if (!level) return;
  animateShow(daysCountGrp);
  byId('vipDaysCount')?.setAttribute('required', 'required');
}

/* ──────────────────────────────────────────────────────────
   TAKWINI OPTIONS
────────────────────────────────────────────────────────── */
function showTakwiniOptions() {
  byId('takwiniOptionsGroup')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'takwiniOptionsGroup';
  wrap.className = 'form-group field-appear';
  const label = document.createElement('label');
  label.className = 'form-label';
  label.innerHTML = `<span>${__('form_training_title', 'Training Course')}</span><span>*</span>`;
  wrap.appendChild(label);
  const radioWrap = document.createElement('div');
  radioWrap.className = 'check-options';
  takwiniOptions.forEach(opt => {
    const lbl = document.createElement('label');
    lbl.className = 'check-option';
    lbl.innerHTML = `
      <input type="radio" name="takwiniOption" value="${opt}">
      <span class="check-box"></span>
      <span class="check-label">${opt}</span>
    `;
    radioWrap.appendChild(lbl);
  });
  wrap.appendChild(radioWrap);
  const birthInput = byId('birthDate');
  const birthGroup = birthInput?.closest('.form-group');
  birthGroup?.insertAdjacentElement('afterend', wrap);
}

/* ──────────────────────────────────────────────────────────
   FORM SUBMISSION
────────────────────────────────────────────────────────── */
async function submitForm(e) {
  e.preventDefault();
  const firstName  = byId('firstName')?.value.trim() || '';
  const lastName   = byId('lastName')?.value.trim() || '';
  const birthDate  = byId('birthDate')?.value || '';
  const birthPlace = byId('birthPlace')?.value?.trim() || '';
  const phone      = byId('phone')?.value.trim() || '';
  let hasError = false;
  [firstName, lastName].forEach((val, i) => {
    const ids = ['firstName', 'lastName'];
    if (!validateLang(val)) {
      byId(ids[i])?.classList.add('error');
      setTimeout(() => byId(ids[i])?.classList.remove('error'), 1500);
      hasError = true;
    }
  });
  if (hasError) return;
  const selectedDays = $$('input[name="days"]:checked').map(c => c.value).join('، ');
  const vipTypeVal    = $('input[name="vipType"]:checked')?.value || '';
  const vipEduLevel   = byId('vipEduLevel')?.value || '';
  const professionVal = byId('profession')?.value || '';
  const supportType   = $('input[name="supportType"]:checked')?.value || '';
  const courseSelect  = byId('courseSelect')?.value || '';
  const takwiniOption = $('input[name="takwiniOption"]:checked')?.value || '';
  const data = {
    type: currentModalType,
    firstName, lastName, birthDate, birthPlace, phone,
    motivation: byId('motivation')?.value.trim() || '',
    timestamp: new Date().toISOString(),
    supportType, courseSelect, takwiniOption,
    eduLevel: byId('eduLevel')?.value || '',
    specialty: byId('specialty')?.value || '',
    subject: byId('subject')?.value || '',
    teacher: byId('teacher')?.value || '',
    candidateType: $('input[name="candidateType"]:checked')?.value || '',
    parentName: byId('parentName')?.value || '',
    parentPhone: byId('parentPhone')?.value || '',
    langType: byId('langType')?.value || '',
    langLevel: byId('langLevel')?.value || '',
    levelTest: $('input[name="levelTest"]:checked')?.value || '',
    vipType: vipTypeVal,
    vipEduLevel,
    profession: professionVal,
    days: selectedDays,
    daysCount: byId('vipDaysCount')?.value || ''
  };
  openTermsForSubmit(data);
}

/* ──────────────────────────────────────────────────────────
   TERMS MODAL
────────────────────────────────────────────────────────── */
function openTermsForSubmit(data) {
  pendingFormData = data;
  const checkbox = byId('terms-checkbox');
  if (checkbox) {
    checkbox.checked = false;
    checkbox.disabled = true;
  }
  const label = byId('terms-agree-label');
  if (label) {
    label.classList.add('locked');
    label.classList.remove('unlocked');
  }
  const proceedBtn = byId('terms-proceed-btn');
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.classList.remove('enabled');
  }
  const tbody = $('.terms-body');
  if (tbody) {
    tbody.scrollTop = 0;
    tbody.onscroll = function () {
      const reached = tbody.scrollTop + tbody.clientHeight >= tbody.scrollHeight - 20;
      if (!reached) return;
      tbody.onscroll = null;
      if (checkbox) checkbox.disabled = false;
      if (label) {
        label.classList.remove('locked');
        label.classList.add('unlocked');
      }
      byId('scroll-hint')?.remove();
    };
  }
  byId('scroll-hint')?.remove();
  const hint = document.createElement('div');
  hint.id = 'scroll-hint';
  hint.className = 'scroll-hint';
  hint.innerHTML = `
    <span>⬇</span>
    <span>${__('terms_scroll_hint', 'Scroll down to read all terms')}</span>
  `;
  const footer = $('.terms-footer');
  if (footer) footer.insertBefore(hint, footer.firstChild);
  const regModal = byId('program-modal');
  if (regModal) { regModal.style.display = 'none'; regModal.classList.remove('active'); }
  const termsModal = byId('terms-modal');
  if (termsModal) { termsModal.style.display = 'flex'; termsModal.classList.add('active'); }
}

function closeTerms() {
  const tbody = $('.terms-body');
  if (tbody) tbody.onscroll = null;
  byId('scroll-hint')?.remove();
  const termsModal = byId('terms-modal');
  if (termsModal) { termsModal.style.display = 'none'; termsModal.classList.remove('active'); }
  unlockPageScroll();
  pendingFormData = null;
}

function closeTermsOutside(e) {
  if (e.target === byId('terms-modal')) closeTerms();
}

function onTermsCheck() {
  const checkbox = byId('terms-checkbox');
  if (checkbox?.disabled) return;
  const btn = byId('terms-proceed-btn');
  if (!btn) return;
  btn.disabled = !checkbox.checked;
  btn.classList.toggle('enabled', checkbox.checked);
}

/* ──────────────────────────────────────────────────────────
   PROCEED TO REGISTER
────────────────────────────────────────────────────────── */
async function proceedToRegister() {
  if (!pendingFormData) return;
  const tbody = $('.terms-body');
  if (tbody) tbody.onscroll = null;
  byId('scroll-hint')?.remove();
  const termsModal = byId('terms-modal');
  if (termsModal) { termsModal.style.display = 'none'; termsModal.classList.remove('active'); }
  const btn = byId('terms-proceed-btn');
  btn?.classList.add('loading');
  showLoadingPopup(
    __('loading_submitting'),
    __('loading_wait_moment')
  );
  try {
    const formData = new FormData();
    Object.entries(pendingFormData).forEach(([key, value]) => {
      formData.append(key, value ?? '');
    });
    await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: formData });
    const typeLabelsAll = { ar: typeLabelsAr, en: typeLabelsEn, fr: typeLabelsFr };
    const regTypeLabel = (typeLabelsAll[currentLang]?.[pendingFormData.type]) || __('requested_service', 'Requested service');
    btn?.classList.remove('loading');
    hideLoadingPopup();
    pendingFormData = null;
    unlockPageScroll();
    resetForm();
    showSuccessModal(
      __('success_reg_done', 'Registration completed successfully'),
      currentLang === 'ar'
        ? `تم استلام طلبك في ${regTypeLabel} بنجاح، وسيتم التواصل معك قريباً.`
        : currentLang === 'fr'
          ? `Votre demande de ${regTypeLabel} a été reçue avec succès. Nous vous contacterons bientôt.`
          : `Your ${regTypeLabel} request has been received successfully. We will contact you soon.`,
      null
    );
  } catch (error) {
    console.error('❌ Registration error:', error);
    btn?.classList.remove('loading');
    hideLoadingPopup();
    EPUI.alert(__('submit_error', 'An error occurred, please try again.'));
    unlockPageScroll();
  }
}

/* ──────────────────────────────────────────────────────────
   LOADING POPUP
────────────────────────────────────────────────────────── */
function showLoadingPopup(title, message) {
  const overlay = byId('loading-popup');
  if (!overlay) return;
  const titleEl = byId('loading-popup-title');
  const msgEl   = byId('loading-popup-msg');
  if (titleEl) {
    titleEl.textContent =
      title || __('loading_title', 'Processing...');
  }
  if (msgEl) {
    msgEl.textContent =
      message || __('loading_msg', 'Please wait');
  }
  overlay.classList.add('active');
  lockPageScroll();
}

function hideLoadingPopup() {
  byId('loading-popup')?.classList.remove('active');
  unlockPageScroll();
}

/* ──────────────────────────────────────────────────────────
   SUCCESS POPUP
────────────────────────────────────────────────────────── */
function createConfetti(container, count = 18) {
  if (!container) return;
  container.querySelectorAll('.confetti').forEach(el => el.remove());
  const colors = ['#0a8acb', '#53a9df', '#f4b41a', '#ffffff'];
  for (let i = 0; i < count; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.top = `${Math.random() * 25}px`;
    c.style.width = `${6 + Math.random() * 6}px`;
    c.style.height = `${10 + Math.random() * 10}px`;
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.borderRadius = `${1 + Math.random() * 4}px`;
    c.style.setProperty('--dur', `${1.5 + Math.random() * 1.2}s`);
    c.style.setProperty('--delay', `${Math.random() * 0.35}s`);
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(c);
  }
}

function showSuccessModal(title, message, regNumber = null) {
  const modal = byId('success-popup');
  if (!modal) return;
  const titleEl  = byId('success-popup-title');
  const msgEl    = byId('success-popup-msg');
  const regWrap  = byId('success-popup-reg');
  const regNumEl = byId('success-popup-reg-number');
  if (titleEl) titleEl.textContent = title   || __('success_title', 'Success');
  if (msgEl)   msgEl.textContent   = message || __('success_msg', 'Operation completed successfully.');
  if (regWrap && regNumEl) {
    regWrap.style.display = regNumber ? 'block' : 'none';
    regNumEl.textContent  = regNumber || '';
  }
  modal.style.display = 'flex';
  modal.classList.add('active');
  lockPageScroll();
  const box = modal.querySelector('.success-popup-box');
  createConfetti(box);
}

function closeSuccessModal() {
  const modal = byId('success-popup');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  unlockPageScroll();
}

function closeSuccessOutside(e) {
  if (e.target === byId('success-popup')) closeSuccessModal();
}

/* ──────────────────────────────────────────────────────────
   JOIN TEAM MODAL
────────────────────────────────────────────────────────── */
function openJoinModal() {
  const modal = byId('join-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
  lockPageScroll();
}

function closeJoinModal() {
  const modal = byId('join-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  unlockPageScroll();
  byId('join-form')?.reset();
  const fileName = byId('cv-file-name');
  if (fileName) fileName.textContent = '';
}

function closeJoinModalOutside(e) {
  if (e.target === byId('join-modal')) closeJoinModal();
}

/* ──────────────────────────────────────────────────────────
   FILE TO BASE64
────────────────────────────────────────────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function () {
      const result = String(reader.result || '');
      const parts  = result.split(',');
      let mimeType = '';
      if (parts[0]) {
        const mimeMatch = parts[0].match(/data:(.*);base64/);
        if (mimeMatch) mimeType = mimeMatch[1];
      }
      if (!parts[1]) {
        reject(new Error('Invalid file format or failed to extract base64.'));
        return;
      }
      resolve({ mimeType, base64: parts[1] });
    };
    reader.onerror = error => {
      console.error('❌ FileReader Error:', error);
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}

/* ──────────────────────────────────────────────────────────
   JOIN TEAM SUBMIT
────────────────────────────────────────────────────────── */
async function submitJoinForm(e) {
  e.preventDefault();
  const submitBtn = byId('join-submit-btn');
  if (submitBtn) {
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
  }
  showLoadingPopup(
    __('loading_join_submitting'),
    __('loading_join_wait')
  );
  try {
    const firstName  = byId('joinFirstName')?.value.trim() || '';
    const lastName   = byId('joinLastName')?.value.trim() || '';
    const phone      = byId('joinPhone')?.value.trim() || '';
    const email      = byId('joinEmail')?.value.trim() || '';
    const role       = $('input[name="joinRole"]:checked')?.value || '';
    const specialty  = byId('joinSpecialty')?.value.trim() || '';
    const experience = byId('joinExperience')?.value.trim() || '';
    const file       = byId('joinCV')?.files?.[0] || null;
    let base64 = '';
    let mimeType = '';
    let originalFileName = '';
    if (file) {
      const converted = await fileToBase64(file);
      base64 = converted.base64;
      mimeType = converted.mimeType;
      originalFileName = file.name;
    }
    const formData = new FormData();
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('fullName', `${firstName} ${lastName}`.trim());
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('role', role);
    formData.append('specialty', specialty);
    formData.append('experience', experience);
    formData.append('base64', base64);
    formData.append('mimeType', mimeType);
    formData.append('originalFileName', originalFileName);
    formData.append('timestamp', new Date().toISOString());
    await fetch(JOIN_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    });
    submitBtn?.classList.remove('loading');
    if (submitBtn) submitBtn.disabled = false;
    hideLoadingPopup();
    closeJoinModal();
    showSuccessModal(
      __('join_success', 'Request sent successfully'),
      currentLang === 'ar'
        ? 'تم استلام طلب الانضمام إلى الفريق، وسيتم مراجعة ملفك والتواصل معك قريباً.'
        : 'Your team join request has been received successfully. We will review your application and contact you soon.'
    );
  } catch (err) {
    console.error('❌ Join request error:', err);
    submitBtn?.classList.remove('loading');
    if (submitBtn) submitBtn.disabled = false;
    hideLoadingPopup();
    EPUI.alert(
      currentLang === 'ar'
        ? 'تعذر الاتصال. تحقق من الإنترنت ثم حاول مجدداً.'
        : 'Connection failed. Check your internet and try again.'
    );
  }
}

/* ──────────────────────────────────────────────────────────
   ANNOUNCEMENTS
────────────────────────────────────────────────────────── */
function buildAnnouncementCard(item) {
  const card = document.createElement('div');
  card.className = 'ann-card';
  const title =
    currentLang === 'ar'
      ? (item.titleAr || item.title || '')
      : (item.titleEn || item.titleAr || item.title || '');
  const text =
    currentLang === 'ar'
      ? (item.bodyAr || item.textAr || item.body || item.text || '')
      : (item.bodyEn || item.textEn || item.bodyAr || item.textAr || item.body || item.text || '');
  const date  = item.date || item.createdAt || '';
  const image = item.imageUrl || item.image || '';
  if (!image) card.classList.add('text-only');
  card.innerHTML = `
    ${image ? `
      <div class="ann-img-wrap">
        <img class="ann-card-img" src="${image}" alt="${title}">
      </div>
    ` : ''}
    <div class="ann-card-body">
      <span class="ann-card-badge">${__('ann_badge', 'Announcement')}</span>
      <div class="ann-card-title">${title}</div>
      <div class="ann-card-text">${text}</div>
      ${date ? `<div class="ann-card-date">${date}</div>` : ''}
    </div>
  `;
  const img = $('.ann-card-img', card);
  if (img) {
    img.addEventListener('load', () => img.classList.add('loaded'));
    img.addEventListener('error', () => card.classList.add('text-only'));
  }
  return card;
}

function renderAnnouncementSlider(items) {
  // id="announcements" في الـ HTML (وليس "announcements-section")
  const section = byId('announcements') || document.querySelector('.ep-ann-section');
  const track   = byId('ann-track');
  const dots    = byId('ann-dots');
  const placeholder = byId('ann-placeholder');
  if (!track || !dots) return;
  track.innerHTML = '';
  dots.innerHTML  = '';
  if (!items || items.length === 0) {
    if (placeholder) { placeholder.style.display = 'block'; }
    return;
  }
  if (placeholder) placeholder.style.display = 'none';
  items.forEach((item, index) => {
    const card = buildAnnouncementCard(item);
    track.appendChild(card);
    const dot = document.createElement('button');
    dot.className = 'ann-dot' + (index === 0 ? ' active' : '');
    dot.type = 'button';
    dot.addEventListener('click', () => goToAnnouncement(index));
    dots.appendChild(dot);
  });
  annCurrentIndex = 0;
  updateAnnouncementSlider();
  startAnnouncementAutoPlay();
}

function updateAnnouncementSlider() {
  const track = byId('ann-track');
  const dots  = $$('.ann-dot');
  if (!track) return;
  const cards = [...track.querySelectorAll('.ann-card')];
  if (cards.length > 0) {
    const card = cards[annCurrentIndex];
    const offset = card.offsetLeft - track.offsetLeft;
    track.scrollTo({ left: offset, behavior: 'smooth' });
  }
  dots.forEach((dot, i) => dot.classList.toggle('active', i === annCurrentIndex));
}

function goToAnnouncement(index) {
  if (!window._annCache.length) return;
  annCurrentIndex = (index + window._annCache.length) % window._annCache.length;
  updateAnnouncementSlider();
}

function nextAnnouncement() {
  goToAnnouncement(annCurrentIndex + 1);
}

function prevAnnouncement() {
  goToAnnouncement(annCurrentIndex - 1);
}

function startAnnouncementAutoPlay() {
  stopAnnouncementAutoPlay();
  if (window._annCache.length <= 1) return;
  annAutoTimer = setInterval(() => nextAnnouncement(), 5000);
}

function stopAnnouncementAutoPlay() {
  if (annAutoTimer) {
    clearInterval(annAutoTimer);
    annAutoTimer = null;
  }
}

async function loadAnnouncements() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getAnnouncements`);
    const data = await res.json();
    window._annCache = Array.isArray(data.items) ? data.items : [];
    renderAnnouncementSlider(window._annCache);
  } catch (err) {
    console.warn('Failed to load announcements:', err);
    const placeholder = byId('ann-placeholder');
    if (placeholder) placeholder.style.display = 'block';
  }
}

/* ──────────────────────────────────────────────────────────
   GLOBAL EVENTS / DOM READY
────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* ── RESTORE LANGUAGE ── */
  const savedLang = localStorage.getItem('ep-lang') || 'ar';
  setLang(savedLang);

  /* ── WIRE LANG BUTTONS ── */
  document.querySelectorAll('.ep-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  /* ── WIRE THEME TOGGLE ── */
  byId('ep-theme-toggle')?.addEventListener('click', toggleTheme);

  loadAnnouncements();
  byId('joinCV')?.addEventListener('change', function () {
    const file = this.files?.[0];
    const nameEl = byId('cv-file-name');
    if (nameEl) nameEl.textContent = file ? file.name : '';
  });
  byId('join-form')?.addEventListener('submit', submitJoinForm);
  byId('reg-form')?.addEventListener('submit', submitForm);
  byId('ann-prev')?.addEventListener('click', () => {
    prevAnnouncement();
    startAnnouncementAutoPlay();
  });
  byId('ann-next')?.addEventListener('click', () => {
    nextAnnouncement();
    startAnnouncementAutoPlay();
  });
  const annWrapper = $('.ann-track-wrapper');
  if (annWrapper) {
    annWrapper.addEventListener('mouseenter', stopAnnouncementAutoPlay);
    annWrapper.addEventListener('mouseleave', startAnnouncementAutoPlay);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeTerms();
      closeJoinModal();
      closeSuccessModal();
      // summerModalOverlay اختياري — موجود في صفحة المخيم الصيفي فقط
      const summerModal = byId('summerModalOverlay');
      if (summerModal?.classList.contains('active')) {
        summerModal.classList.remove('active');
        unlockPageScroll();
      }
    }
  });

  /* ── LOADER HIDE ── */
  const epLoader = byId('ep-loader');
  if (epLoader) {
    setTimeout(() => { epLoader.classList.add('hidden'); }, 2000);
  }

  /* ── REVEAL ON SCROLL — smooth with rootMargin ── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ── STAGGER children inside reveal sections ── */
  document.querySelectorAll(
    '.ep-programs-grid, .ep-teachers-grid, .ep-paths-grid, .ep-steps-grid, .ep-trust-strip, .ep-gallery-grid'
  ).forEach(grid => {
    [...grid.children].forEach((child, i) => {
      child.classList.add('stagger-item');
    });
  });

  /* ── NAVBAR SCROLL ── */
  const navbar = byId('ep-navbar');
  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    const topBtn = document.querySelector('.ep-back-to-top');
    if (topBtn) topBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  /* ── BACK TO TOP — أنشئه ديناميكياً إذا ما موجود في HTML ── */
  let backBtn = document.querySelector('.ep-back-to-top');
  if (!backBtn) {
    backBtn = document.createElement('button');
    backBtn.className = 'ep-back-to-top';
    backBtn.setAttribute('aria-label', 'العودة للأعلى');
    backBtn.innerHTML = '↑';
    document.body.appendChild(backBtn);
  }
  if (backBtn) backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ── HAMBURGER ── */
  const hamburger = byId('ep-hamburger');
  const mobileMenu = byId('ep-mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open');
    });
  }

  /* ── FAQ ACCORDION ── */
  document.querySelectorAll('.ep-faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.ep-faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.ep-faq-item.open').forEach(el => el.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ── JOIN TEAM BTN ── */
  const joinTeamBtn = byId('join-team-btn') || document.querySelector('[onclick*="openJoinModal"]');
  const navJoinBtn  = byId('nav-join-btn');
  if (joinTeamBtn && !joinTeamBtn.hasAttribute('onclick')) {
    joinTeamBtn.addEventListener('click', () => typeof openJoinModal === 'function' && openJoinModal());
  }
  if (navJoinBtn) navJoinBtn.addEventListener('click', () => typeof openJoinModal === 'function' && openJoinModal());

  /* ── TESTIMONIALS SLIDER ── */
  const testTrack = byId('testimonials-track');
  const testNav   = byId('testimonial-nav');
  if (testTrack && testNav) {
    let testCurrent = 0;
    let testTimer   = null;
    const getDots  = () => [...testNav.querySelectorAll('.ep-testimonial-dot')];
    const getCards = () => [...testTrack.querySelectorAll('.ep-testimonial-card')];

    function testGoTo(index) {
      const cards = getCards();
      if (!cards.length) return;
      testCurrent = ((index % cards.length) + cards.length) % cards.length;
      const card  = cards[testCurrent];
      testTrack.scrollTo({ left: card.offsetLeft - testTrack.offsetLeft, behavior: 'smooth' });
      getDots().forEach((d, i) => d.classList.toggle('active', i === testCurrent));
    }

    function startTestTimer() {
      stopTestTimer();
      testTimer = setInterval(() => testGoTo(testCurrent + 1), 5000);
    }
    function stopTestTimer() {
      if (testTimer) { clearInterval(testTimer); testTimer = null; }
    }

    getDots().forEach((dot, i) => dot.addEventListener('click', () => { testGoTo(i); startTestTimer(); }));
    startTestTimer();
    testTrack.addEventListener('mouseenter', stopTestTimer);
    testTrack.addEventListener('mouseleave', startTestTimer);

    /* swipe */
    let swipeStartX = 0;
    testTrack.addEventListener('touchstart', e => { swipeStartX = e.touches[0].clientX; stopTestTimer(); }, { passive: true });
    testTrack.addEventListener('touchend', e => {
      const diff = swipeStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) testGoTo(testCurrent + (diff > 0 ? 1 : -1));
      startTestTimer();
    });
    /* initialize first dot */
    testGoTo(0);
  }

  /* ── CUSTOM CURSOR — RAF-based, no layout thrash ── */
  const cursorDot     = byId('cursor-dot');
  const cursorOutline = byId('cursor-outline');
  if (cursorDot && cursorOutline && window.matchMedia('(pointer: fine)').matches) {
    let mx = 0, my = 0, ox = 0, oy = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function cursorLoop() {
      cursorDot.style.transform    = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      ox += (mx - ox) * 0.15;
      oy += (my - oy) * 0.15;
      cursorOutline.style.transform = `translate(${ox}px,${oy}px) translate(-50%,-50%)`;
      requestAnimationFrame(cursorLoop);
    })();
    // remove absolute positioning in favour of transform
    cursorDot.style.left = cursorDot.style.top = '0';
    cursorOutline.style.left = cursorOutline.style.top = '0';
  }

  /* ── STAGGER REVEAL — smooth entry animations ── */
  const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const siblings = el.parentElement
        ? [...el.parentElement.querySelectorAll('.stagger-item')]
        : [el];
      const idx = siblings.indexOf(el);
      el.style.transitionDelay = `${Math.min(idx * 80, 400)}ms`;
      el.classList.add('stagger-visible');
      staggerObserver.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.stagger-item').forEach(el => staggerObserver.observe(el));
  /* ── COUNTER ANIMATION — count up when visible ── */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-target'), 10);
      if (!target || el.dataset.counted) return;
      el.dataset.counted = '1';
      const duration = 1800;
      const start = performance.now();
      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target).toLocaleString('ar');
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString('ar') + (target >= 100 ? '+' : '');
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.ep-stat-num[data-target]').forEach(el => counterObserver.observe(el));



  /* ── SMOOTH MAGNETIC BUTTONS ── */
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) * 0.25;
      const dy = (e.clientY - r.top  - r.height / 2) * 0.25;
      btn.style.transform = `translate(${dx}px,${dy}px)`;
    }, { passive: true });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; }, { passive: true });
  });

  /* ── CLOSE MOBILE MENU ON LINK CLICK ── */
  window.closeMobileMenu = function() {
    byId('ep-mobile-menu')?.classList.remove('open');
    byId('ep-hamburger')?.classList.remove('open');
  };
});

/* ──────────────────────────────────────────────────────────
   EXPOSE FUNCTIONS TO WINDOW
────────────────────────────────────────────────────────── */
window.setLang = setLang;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalOutside = closeModalOutside;
window.onBirthDateChange = onBirthDateChange;
window.onSupportTypeChange = onSupportTypeChange;
window.onEduLevelChange = onEduLevelChange;
window.onCandidateTypeChange = onCandidateTypeChange;
window.onSpecialtyChange = onSpecialtyChange;
window.onSubjectChange = onSubjectChange;
window.onTeacherChange = onTeacherChange;
window.onLangTypeChange = onLangTypeChange;
window.onLangLevelChange = onLangLevelChange;
window.onVipTypeChange = onVipTypeChange;
window.onVipEduLevelChange = onVipEduLevelChange;
window.onVipDaysCountChange = onVipDaysCountChange;
window.onDayChange = onDayChange;
window.submitForm = submitForm;
window.openTermsForSubmit = openTermsForSubmit;
window.closeTerms = closeTerms;
window.closeTermsOutside = closeTermsOutside;
window.onTermsCheck = onTermsCheck;
window.proceedToRegister = proceedToRegister;
window.showLoadingPopup = showLoadingPopup;
window.hideLoadingPopup = hideLoadingPopup;
window.showSuccessModal = showSuccessModal;
window.closeSuccessModal = closeSuccessModal;
window.closeSuccessOutside = closeSuccessOutside;
window.openJoinModal = openJoinModal;
window.closeJoinModal = closeJoinModal;
window.closeJoinModalOutside = closeJoinModalOutside;
window.submitJoinForm = submitJoinForm;
window.loadAnnouncements = loadAnnouncements;
window.nextAnnouncement = nextAnnouncement;
window.prevAnnouncement = prevAnnouncement;
window.goToAnnouncement = goToAnnouncement;

/* ══════════════════════════════════════════════════════════
   GALLERY LIGHTBOX
══════════════════════════════════════════════════════════ */
(function initGallery() {
  const items    = document.querySelectorAll('.ep-gallery-mosaic .ep-gi');
  const lightbox = document.getElementById('ep-lightbox');
  const lbImg    = document.getElementById('ep-lb-img');
  const lbClose  = document.getElementById('ep-lb-close');
  const lbPrev   = document.getElementById('ep-lb-prev');
  const lbNext   = document.getElementById('ep-lb-next');
  const lbCounter= document.getElementById('ep-lb-counter');

  if (!lightbox || !items.length) return;

  const photos = Array.from(items).map(el => ({
    src: el.querySelector('img').src,
    alt: el.querySelector('img').alt
  }));

  let current = 0;

  function openLightbox(index) {
    current = ((index % photos.length) + photos.length) % photos.length;
    lbImg.src = photos[current].src;
    lbImg.alt = photos[current].alt;
    lbCounter.textContent = (current + 1) + ' / ' + photos.length;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  function showPrev() { openLightbox(current - 1); }
  function showNext() { openLightbox(current + 1); }

  items.forEach((item, i) => {
    item.addEventListener('click', () => openLightbox(i));
  });

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', showPrev);
  lbNext.addEventListener('click', showNext);

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  showNext();
    if (e.key === 'ArrowRight') showPrev();
  });
})();
