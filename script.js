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


let currentLang = 'ar';

const i18n = {
  ar: {
    title: 'وجهتك الأولى نحو التعليم والتطوير',
    badge: '✦ رحلتك نحو النجاح تبدأ من هنا ✦',
    subtitle: 'التسجيل في الدورات والبرامج التعليمية',
    btn1: 'تسجيلات الدعم',
    btn2: 'دورات اللغات',
    btn3: 'دروس VIP',
    btn4: 'اختبار IELTS',
    btn5: 'دورات أونلاين',
    btn6: 'دورات تكوينية',
    annTitle: 'إعلانات المركز التعليمي',
    firstName: 'الاسم',
    lastName: 'اللقب',
    birthDate: 'تاريخ الميلاد',
    birthPlace: 'العنوان',
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
    termsTitle: 'قوانين وشروط المركز التعليمي',
    termsAgree: 'لقد قرأت جميع القوانين والشروط وأوافق عليها',
    termsProceed: 'تأكيد التسجيل ✦',
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
    t14: 'الموافقة على نشر صور المتعلم في شبكات التواصل الاجتماعي، ومقاطع الفيديو التربوية الخاصة بالمركز.'
  },
  en: {
    title: 'Your first destination for education and growth',
    badge: '✦ Your journey to success starts here ✦',
    subtitle: 'Register for courses and educational programs',
    btn1: 'Support Registration',
    btn2: 'Language Courses',
    btn3: 'VIP Lessons',
    btn4: 'IELTS Test',
    btn5: 'Online Courses',
    btn6: 'Training Courses',
    annTitle: 'Center Announcements',
    firstName: 'First Name',
    lastName: 'Last Name',
    birthDate: 'Date of Birth',
    birthPlace: 'Address',
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
    termsTitle: 'Center Terms & Conditions',
    termsAgree: 'I have read all terms and conditions and I agree',
    termsProceed: 'Confirm Registration ✦',
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
    t14: 'Agreement to publish learner photos on social networks and educational videos related to the center.'
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
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  byId('btn-ar')?.classList.toggle('active', lang === 'ar');
  byId('btn-en')?.classList.toggle('active', lang === 'en');
  byId('btn-ar-old')?.classList.toggle('active', lang === 'ar');
  byId('btn-en-old')?.classList.toggle('active', lang === 'en');
  byId('btn-ar-mob')?.classList.toggle('active', lang === 'ar');
  byId('btn-en-mob')?.classList.toggle('active', lang === 'en');
  localStorage.setItem('ep-lang', lang);
  const t = i18n[lang];
  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });
  const warnIcon = byId('lang-warning-icon');
  const warnText = byId('lang-warning-text');
  if (warnIcon && warnText) {
    if (lang === 'ar') {
      warnIcon.textContent = '🇩🇿';
      warnText.textContent = 'يرجى إدخال جميع المعلومات باللغة العربية فقط';
    } else {
      warnIcon.textContent = '🇬🇧';
      warnText.textContent = 'Please enter all information in English only';
    }
  }
  if (window._annCache && window._annCache.length > 0) {
    renderAnnouncementSlider(window._annCache);
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

function validateLang(text) {
  if (!text.trim()) return true;
  if (currentLang === 'ar') return isArabic(text) && !isEnglish(text);
  if (currentLang === 'en') return isEnglish(text) && !isArabic(text);
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
    { subject: 'اللغة الفرنسية', teachers: ['الأستاذة مرغني ريهام'] }
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
    { subject: 'الفلسفة', teachers: ['الأستاذة دادة نجاح سلام'] },
    { subject: 'تاريخ وجغرافيا', teachers: ['الأستاذ ايمن دخان'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ],
  'ثالثة ثانوي (بكالوريا)|تقني رياضي': [
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teachers: ['الأستاذ نمسي عبدالرحمان', 'الأستاذ لكموتة لمين'] },
    { subject: 'الرياضيات (العلميين)', teachers: ['الأستاذة ترعة فاطمة', 'الأستاذ عبدالباسط نعورة'] },
    { subject: 'اللغة العربية', teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الفرنسية', teachers: ['الأستاذة كروش شمس الهدى'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذ كرام الصادق'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ],
  'ثالثة ثانوي (بكالوريا)|رياضيات': [
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teachers: ['الأستاذ نمسي عبدالرحمان', 'الأستاذ لكموتة لمين'] },
    { subject: 'الرياضيات (العلميين)', teachers: ['الأستاذة ترعة فاطمة', 'الأستاذ عبدالباسط نعورة'] },
    { subject: 'اللغة العربية', teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الفرنسية', teachers: ['الأستاذة كروش شمس الهدى'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذ كرام الصادق'] },
    { subject: 'الفلسفة', teachers: ['الأستاذة دادة نجاح سلام'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ],
  'ثالثة ثانوي (بكالوريا)|تسيير واقتصاد': [
    { subject: 'المحاسبة', teachers: ['الأستاذ سرهود عبدالرحمان'] },
    { subject: 'اللغة العربية', teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الفرنسية', teachers: ['الأستاذة كروش شمس الهدى'] },
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
    { subject: 'الرياضيات (أدبيين)', teachers: ['الأستاذ هبيتة ربيع'] },
    { subject: 'العلوم الإسلامية', teachers: ['الأستاذ هبيتة ربيع'] }
  ],
  'ثالثة ثانوي (بكالوريا)|لغات أجنبية': [
    { subject: 'اللغة الإسبانية', teachers: ['الأستاذ طوالبية ابراهيم'] },
    { subject: 'اللغة الألمانية', teachers: ['الأستاذ حمزة علالي'] },
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
  const titles = {
    support: currentLang === 'ar' ? 'تسجيل — دعم دراسي'     : 'Registration — Academic Support',
    lang:    currentLang === 'ar' ? 'تسجيل — دورات اللغات'  : 'Registration — Language Courses',
    vip:     currentLang === 'ar' ? 'تسجيل — دروس VIP'      : 'Registration — VIP Lessons',
    ielts:   currentLang === 'ar' ? 'تسجيل — اختبار IELTS'  : 'Registration — IELTS Test',
    online:  currentLang === 'ar' ? 'تسجيل — دورات أونلاين' : 'Registration — Online Courses',
    takwini: currentLang === 'ar' ? 'تسجيل — دورات تكوينية' : 'Registration — Training Courses'
  };
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
    chooseLabel.textContent = currentLang === 'ar'
      ? `اختر ${val} ${val === 1 ? 'يوم' : 'أيام'} للحضور في الأسبوع`
      : `Choose ${val} day${val > 1 ? 's' : ''} per week`;
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
    <span>${currentLang === 'ar' ? 'الدورات لهذا المستوى ستُضاف قريباً' : 'Courses for this level will be added soon'}</span>
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
  label.innerHTML = `<span>${currentLang === 'ar' ? 'اختر الدورة' : 'Choose course'}</span><span>*</span>`;
  wrap.appendChild(label);
  const select = document.createElement('select');
  select.className = 'form-input';
  select.id = 'courseSelect';
  select.setAttribute('required', 'required');
  select.innerHTML = `<option value="">${currentLang === 'ar' ? '-- اختر الدورة --' : '-- Choose course --'}</option>`;
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
  subSel.innerHTML = `<option value="">${currentLang === 'ar' ? '-- اختر المادة --' : '-- Choose subject --'}</option>`;
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
  specialtySel.innerHTML = `<option value="">${currentLang === 'ar' ? '-- اختر التخصص --' : '-- Choose specialty --'}</option>`;
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
  teachSel.innerHTML = `<option value="">${currentLang === 'ar' ? '-- اختر الأستاذ/ة --' : '-- Choose teacher --'}</option>`;
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
  label.innerHTML = `<span>${currentLang === 'ar' ? 'اختر الدورة التكوينية' : 'Choose training course'}</span><span>*</span>`;
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
    <span>${currentLang === 'ar' ? 'اقرأ القوانين كاملاً للمتابعة' : 'Scroll down to read all terms'}</span>
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
    currentLang === 'ar' ? 'جاري إرسال التسجيل...' : 'Submitting registration...',
    currentLang === 'ar' ? 'يرجى الانتظار قليلاً' : 'Please wait a moment'
  );
  try {
    const formData = new FormData();
    Object.entries(pendingFormData).forEach(([key, value]) => {
      formData.append(key, value ?? '');
    });
    await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: formData });
    const regTypeLabel = currentLang === 'ar'
      ? (typeLabelsAr[pendingFormData.type] || 'الخدمة المطلوبة')
      : (typeLabelsEn[pendingFormData.type] || 'Requested service');
    btn?.classList.remove('loading');
    hideLoadingPopup();
    pendingFormData = null;
    unlockPageScroll();
    resetForm();
    showSuccessModal(
      currentLang === 'ar' ? 'تم التسجيل بنجاح' : 'Registration completed successfully',
      currentLang === 'ar'
        ? `تم استلام طلبك في ${regTypeLabel} بنجاح، وسيتم التواصل معك قريباً.`
        : `Your ${regTypeLabel} request has been received successfully. We will contact you soon.`,
      null
    );
  } catch (error) {
    console.error('❌ Registration error:', error);
    btn?.classList.remove('loading');
    hideLoadingPopup();
    alert(currentLang === 'ar' ? 'حدث خطأ أثناء الإرسال، حاول مرة أخرى.' : 'An error occurred, please try again.');
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
      title || (currentLang === 'ar' ? 'جاري المعالجة...' : 'Processing...');
  }
  if (msgEl) {
    msgEl.textContent =
      message || (currentLang === 'ar' ? 'يرجى الانتظار' : 'Please wait');
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
  if (titleEl) titleEl.textContent = title   || (currentLang === 'ar' ? 'تم بنجاح' : 'Success');
  if (msgEl)   msgEl.textContent   = message || (currentLang === 'ar' ? 'تم تنفيذ العملية بنجاح.' : 'Operation completed successfully.');
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
    currentLang === 'ar' ? 'جاري إرسال طلب الانضمام...' : 'Submitting join request...',
    currentLang === 'ar' ? 'يرجى الانتظار قليلاً' : 'Please wait a moment'
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
      currentLang === 'ar' ? 'تم إرسال الطلب بنجاح' : 'Request sent successfully',
      currentLang === 'ar'
        ? 'تم استلام طلب الانضمام إلى الفريق، وسيتم مراجعة ملفك والتواصل معك قريباً.'
        : 'Your team join request has been received successfully. We will review your application and contact you soon.'
    );
  } catch (err) {
    console.error('❌ Join request error:', err);
    submitBtn?.classList.remove('loading');
    if (submitBtn) submitBtn.disabled = false;
    hideLoadingPopup();
    alert(
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
      <span class="ann-card-badge">${currentLang === 'ar' ? 'إعلان' : 'Announcement'}</span>
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
  byId('btn-ar')?.addEventListener('click', () => setLang('ar'));
  byId('btn-en')?.addEventListener('click', () => setLang('en'));

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
