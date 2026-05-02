// ─── SQUARES BACKGROUND ───────────────────────────────────
const canvas = document.getElementById('squares-canvas');
const ctx    = canvas ? canvas.getContext('2d') : null;
let squares  = [];
const squareSize = 40, squareGap = 4;
let cols, rows;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  cols = Math.ceil(window.innerWidth  / (squareSize + squareGap));
  rows = Math.ceil(window.innerHeight / (squareSize + squareGap));
  initSquares();
}
function initSquares() {
  squares = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      squares.push({
        x: i * (squareSize + squareGap),
        y: j * (squareSize + squareGap),
        opacity: Math.random() * 0.3,
        targetOpacity: Math.random() * 0.3,
        speed: 0.005 + Math.random() * 0.01
      });
    }
  }
}
function animateSquares() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  squares.forEach(sq => {
    if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01) {
      sq.targetOpacity = Math.random() * 0.4;
    }
    sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
    ctx.fillStyle = `rgba(4,130,195,${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, squareSize, squareSize);
  });
  requestAnimationFrame(animateSquares);
}
window.addEventListener('resize', resizeCanvas);
if (canvas && ctx) {
  resizeCanvas();
  animateSquares();
}

// ─── APPS SCRIPT URL ──────────────────────────────────────
const APPS_SCRIPT_URL      = 'https://script.google.com/macros/s/AKfycbwidCYkiWYlCSkMNUwbo1ZLM8XCGh8y5lWD7M_lS-J5cX35-Xd8kHhrwO4ktZiN5_vhIg/exec';
const JOIN_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyU1bKFQ4VjiFcQjFmuT9T2Xv27pbmZKQ_iy5ZO9vOhZcuZvAIAZi1NRc6FnuhRAXx2/exec';

const typeLabelsAr = {
  support: 'تسجيلات الدعم',
  lang:    'دورات اللغات',
  vip:     'دروس VIP',
  ielts:   'اختبار IELTS',
  online:  'دورات أونلاين',
  takwini: 'دورات تكوينية',
};

// ─── LANGUAGE ─────────────────────────────────────────────
let currentLang = 'ar';

const i18n = {
  ar: {
    title:'EDUCATION PLUS CENTER', badge:'✦ رحلتك نحو النجاح تبدأ من هنا ✦',
    subtitle:'التسجيل في الدورات والبرامج التعليمية',
    btn1:'تسجيلات الدعم', btn2:'دورات اللغات', btn3:'دروس VIP',
    btn4:'اختبار IELTS',  btn5:'دورات أونلاين', btn6:'دورات تكوينية',
    annTitle:'إعلانات المركز التعليمي',
    firstName:'الاسم', lastName:'اللقب', birthDate:'تاريخ الميلاد',
    birthPlace:'العنوان', phone:'رقم الهاتف',
    motivation:    'ما الذي دفعك إلى اختيار التسجيل في مركز E-PLUS؟',
    motivationVip: 'ما الذي جعلك تختار الدراسة عبر نظام الدروس الخاصة VIP؟',
    optional:'(اختياري)',
    eduLevel:'المستوى الدراسي', specialty:'التخصص',
    subject:'المادة', teacher:'الأستاذ/ة',
    candidateType:'نوع المترشح', enrolled:'متمدرس', freeCandidate:'حر',
    parentInfo:'معلومات ولي الأمر',
    parentName:'اسم ولي الأمر', parentPhone:'هاتف ولي الأمر',
    langType:'اختر اللغة', langLevel:'مستوى اللغة (CEFR)',
    levelTest:'هل تريد إجراء اختبار تحديد المستوى؟',
    yes:'نعم', no:'لا',
    vipType:'نوع دروس VIP', vipSupport:'📚 دعم دراسي', vipLang:'🌍 لغات',
    vipDaysCount:'كم يوم تريد الحضور في الأسبوع؟',
    chooseDays:'اختر الأيام', daysSelected:'يوم محدد',
    submitBtn:'إتمام التسجيل ✦',
    termsTitle:'قوانين وشروط المركز التعليمي',
    termsAgree:'لقد قرأت جميع القوانين والشروط وأوافق عليها',
    termsProceed:'تأكيد التسجيل ✦',
    t1:'يعتبر المتعلم مسجلاً بصفة رسمية بالمركز عند قيامه بتسديد رسوم التسجيل في التاريخ المحدد.',
    t2:'يجب أن يتسم المتعلم بحسن الأخلاق والنظافة والهندام الملائم.',
    t3:'يجب احترام جميع الأفراد في المركز التعليمي، الزملاء، المدرسين والطاقم الإداري.',
    t4:'احترام أوقات الدراسة، وعدم الانصراف دون إذن مسبق.',
    t5:'عدم التغيب عن الحصص إلا لأسباب ضرورية مع إعلام الإدارة مسبقاً.',
    t6:'في حالة الغياب بدون سبب يتم إعلام الولي.',
    t7:'لا يتم تعويض قيمة الحصص عند الغياب المتكرر أو الانقطاع عن الدراسة.',
    t8:'في حالة التوقف عن الدراسة يتم تعويض 80% فقط من القيمة المتبقية.',
    t9:'في حالة الغياب طويل المدى يرجى الاتصال بالإدارة لأجل تسوية الوضعية.',
    t10:'لا يتحمل المركز ضياع أي أغراض ثمينة (نقود، هاتف، مجوهرات...).',
    t11:'يمنع لمس أو تشغيل أدوات وأجهزة التعليم المختلفة دون إذن.',
    t12:'أي عملية إتلاف لتجهيزات المركز تعرض صاحبها للعقوبة وتعويض الخسائر.',
    t13:'في حالة السلوكات غير المقبولة، ينذر الولي كتابياً عند تكرر المخالفة.',
    t14:'الموافقة على نشر صور المتعلم في شبكات التواصل الاجتماعي، ومقاطع الفيديو التربوية الخاصة بالمركز.',
  },
  en: {
    title:'EDUCATION PLUS CENTER', badge:'✦ Your journey to success starts here ✦',
    subtitle:'Register for courses and educational programs',
    btn1:'Support Registration', btn2:'Language Courses', btn3:'VIP Lessons',
    btn4:'IELTS Test', btn5:'Online Courses', btn6:'Training Courses',
    annTitle:'Center Announcements',
    firstName:'First Name', lastName:'Last Name', birthDate:'Date of Birth',
    birthPlace:'Address', phone:'Phone Number',
    motivation:    'What motivated you to choose E-PLUS Center?',
    motivationVip: 'What led you to choose studying through the VIP private lessons system?',
    optional:'(optional)',
    eduLevel:'Education Level', specialty:'Specialty',
    subject:'Subject', teacher:'Teacher',
    candidateType:'Candidate Type', enrolled:'Enrolled', freeCandidate:'Independent',
    parentInfo:'Parent / Guardian Info',
    parentName:'Parent Name', parentPhone:'Parent Phone',
    langType:'Choose Language', langLevel:'Language Level (CEFR)',
    levelTest:'Would you like a level placement test?',
    yes:'Yes', no:'No',
    vipType:'VIP Lesson Type', vipSupport:'📚 Academic Support', vipLang:'🌍 Languages',
    vipDaysCount:'How many days per week?',
    chooseDays:'Choose Days', daysSelected:'day(s) selected',
    submitBtn:'Complete Registration ✦',
    termsTitle:'Center Terms & Conditions',
    termsAgree:'I have read all terms and conditions and I agree',
    termsProceed:'Confirm Registration ✦',
    t1:'The learner is officially registered upon payment of registration fees on the specified date.',
    t2:'The learner must demonstrate good conduct, cleanliness, and appropriate dress.',
    t3:'All individuals at the center must be respected: peers, teachers, and administrative staff.',
    t4:'Study schedules must be respected and leaving without prior permission is not allowed.',
    t5:'Absence from sessions is only permitted for urgent reasons with prior notification to administration.',
    t6:'In case of absence without reason, the guardian will be notified.',
    t7:'Session fees are not compensated for repeated absences or discontinuation of study.',
    t8:'In case of study discontinuation, only 80% of the remaining value will be refunded.',
    t9:'In case of long-term absence, please contact administration to resolve the situation.',
    t10:'The center is not responsible for loss of any valuables (money, phone, jewelry...).',
    t11:'Touching or operating educational equipment without permission is prohibited.',
    t12:'Any damage to center equipment will result in punishment and compensation for losses.',
    t13:'In case of unacceptable behavior, the guardian will be formally warned upon repeated violations.',
    t14:'Agreement to publish learner photos on social networks and educational videos related to the center.',
  }
};

// ─── HELPERS عامة ─────────────────────────────────────────
function $(selector, root = document) { return root.querySelector(selector); }
function $all(selector, root = document) { return [...root.querySelectorAll(selector)]; }

function hideLogo() {
  const el = document.querySelector('.top-logo');
  if (el) el.style.display = 'none';
}
function showLogo() {
  const el = document.querySelector('.top-logo');
  if (el) el.style.display = 'flex';
}

function setLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';

  document.getElementById('btn-ar')?.classList.toggle('active', lang === 'ar');
  document.getElementById('btn-en')?.classList.toggle('active', lang === 'en');

  const t = i18n[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  const warnIcon = document.getElementById('lang-warning-icon');
  const warnText = document.getElementById('lang-warning-text');
  if (warnIcon && warnText) {
    if (lang === 'ar') {
      warnIcon.textContent = '🇸🇦';
      warnText.textContent = 'يرجى إدخال جميع المعلومات باللغة العربية فقط';
    } else {
      warnIcon.textContent = '🇬🇧';
      warnText.textContent = 'Please enter all information in English only';
    }
  }

  if (window._annCache && window._annCache.length > 0) {
    _renderFromData(window._annCache);
  }
}

// ─── LANGUAGE VALIDATION ──────────────────────────────────
function isArabic(text)  { return /[\u0600-\u06FF]/.test(text); }
function isEnglish(text) { return /[a-zA-Z]/.test(text); }
function validateLang(text) {
  if (!text.trim()) return true;
  if (currentLang === 'ar') return isArabic(text) && !isEnglish(text);
  if (currentLang === 'en') return isEnglish(text) && !isArabic(text);
  return true;
}

// ─── SPECIALTIES ──────────────────────────────────────────
const specialties = {
  'أولى ثانوي':             ['علوم تجريبية','آداب ولغات'],
  'ثانية ثانوي':            ['علوم تجريبية','تقني رياضي','رياضيات','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية'],
  'ثالثة ثانوي (بكالوريا)': ['علوم تجريبية','تقني رياضي','رياضيات','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية'],
};

// ─── CURRICULUM ───────────────────────────────────────────
const curriculum = {
  'تحضيري':[],'أولى ابتدائي':[],'ثانية ابتدائي':[],
  'ثالثة ابتدائي':[],'رابعة ابتدائي':[],'خامسة ابتدائي':[],
  'أولى متوسط':[],'ثانية متوسط':[],'ثالثة متوسط':[],
  'رابعة متوسط': [
    { subject:'رياضيات',          teachers:['الأستاذ شامي سهيل'] },
    { subject:'اللغة الإنجليزية', teachers:['الأستاذة نصبة فاطمة'] },
    { subject:'اللغة الفرنسية',   teachers:['الأستاذة مرغني ريهام'] },
  ],
  'أولى ثانوي|علوم تجريبية':[],'أولى ثانوي|آداب ولغات':[],
  'ثانية ثانوي|علوم تجريبية':[],'ثانية ثانوي|تقني رياضي':[],
  'ثانية ثانوي|رياضيات':[],'ثانية ثانوي|تسيير واقتصاد':[],
  'ثانية ثانوي|آداب وفلسفة':[],'ثانية ثانوي|لغات أجنبية':[],
  'ثالثة ثانوي (بكالوريا)|علوم تجريبية': [
    { subject:'العلوم الفيزيائية والتكنولوجيا', teachers:['الأستاذ نمسي عبدالرحمان','الأستاذ لكموتة لمين'] },
    { subject:'الرياضيات (العلميين)',            teachers:['الأستاذة ترعة فاطمة','الأستاذ عبدالباسط نعورة'] },
    { subject:'العلوم الطبيعية والحياة',         teachers:['الأستاذ صحراوي شكري'] },
    { subject:'اللغة العربية',                  teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',                 teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',               teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',                        teachers:['الأستاذة دادة نجاح سلام'] },
    { subject:'تاريخ وجغرافيا',                 teachers:['الأستاذ ايمن دخان'] },
    { subject:'العلوم الإسلامية',               teachers:['الأستاذ هبيتة ربيع'] },
  ],
  'ثالثة ثانوي (بكالوريا)|تقني رياضي': [
    { subject:'العلوم الفيزيائية والتكنولوجيا', teachers:['الأستاذ نمسي عبدالرحمان','الأستاذ لكموتة لمين'] },
    { subject:'الرياضيات (العلميين)',            teachers:['الأستاذة ترعة فاطمة','الأستاذ عبدالباسط نعورة'] },
    { subject:'اللغة العربية',                  teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',                 teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',               teachers:['الأستاذ كرام الصادق'] },
    { subject:'العلوم الإسلامية',               teachers:['الأستاذ هبيتة ربيع'] },
  ],
  'ثالثة ثانوي (بكالوريا)|رياضيات': [
    { subject:'العلوم الفيزيائية والتكنولوجيا', teachers:['الأستاذ نمسي عبدالرحمان','الأستاذ لكموتة لمين'] },
    { subject:'الرياضيات (العلميين)',            teachers:['الأستاذة ترعة فاطمة','الأستاذ عبدالباسط نعورة'] },
    { subject:'اللغة العربية',                  teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',                 teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',               teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',                        teachers:['الأستاذة دادة نجاح سلام'] },
    { subject:'العلوم الإسلامية',               teachers:['الأستاذ هبيتة ربيع'] },
  ],
  'ثالثة ثانوي (بكالوريا)|تسيير واقتصاد': [
    { subject:'المحاسبة',           teachers:['الأستاذ سرهود عبدالرحمان'] },
    { subject:'اللغة العربية',      teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',     teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',   teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',            teachers:['الأستاذة دادة نجاح سلام'] },
    { subject:'تاريخ وجغرافيا',     teachers:['الأستاذ ايمن دخان'] },
    { subject:'العلوم الإسلامية',   teachers:['الأستاذ هبيتة ربيع'] },
  ],
  'ثالثة ثانوي (بكالوريا)|آداب وفلسفة': [
    { subject:'اللغة العربية',      teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',     teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',   teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',            teachers:['الأستاذة دادة نجاح سلام'] },
    { subject:'تاريخ وجغرافيا',     teachers:['الأستاذ ايمن دخان'] },
    { subject:'الرياضيات (أدبيين)', teachers:['الأستاذ هبيتة ربيع'] },
    { subject:'العلوم الإسلامية',   teachers:['الأستاذ هبيتة ربيع'] },
  ],
  'ثالثة ثانوي (بكالوريا)|لغات أجنبية': [
    { subject:'اللغة الإسبانية',    teachers:['الأستاذ طوالبية ابراهيم'] },
    { subject:'اللغة الألمانية',    teachers:['الأستاذ حمزة علالي'] },
    { subject:'اللغة العربية',      teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',     teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',   teachers:['الأستاذ كرام الصادق'] },
    { subject:'الرياضيات (أدبيين)', teachers:['الأستاذ هبيتة ربيع'] },
    { subject:'العلوم الإسلامية',   teachers:['الأستاذ هبيتة ربيع'] },
  ],
};

// ─── CURRICULUM — دورات مدرسية ────────────────────────────
const coursesCurriculum = {
  'ثالثة ثانوي (بكالوريا)': [
    { course: 'دورة اللغة الإنجليزية',                       teacher: 'الأستاذ كرام الصادق' },
    { course: 'دورة اللغة الفرنسية',                         teacher: 'الأستاذة كروش شمس الهدى' },
    { course: 'دورة اللغة العربية',                          teacher: 'الأستاذة موساوي زبيدة' },
    { course: 'دورة العلوم الإسلامية',                       teacher: 'الأستاذ هبيتة ربيع' },
    { course: 'دورة الفلسفة',                                teacher: 'الأستاذة دادة نجاح سلام' },
    { course: 'دورة التاريخ (الحرب الباردة)',                teacher: 'الأستاذ دخان أيمن' },
    { course: 'دورة التاريخ (الثورة الجزائرية)',             teacher: 'الأستاذ دخان أيمن' },
    { course: 'دورة الجغرافيا (الفصل الأول والفصل الثاني)',  teacher: 'الأستاذ دخان أيمن' },
  ],
};

// ─── TAKWINI OPTIONS ──────────────────────────────────────
const takwiniOptions = [
  '📸 تصوير بالهاتف',
  '🎨 جرافيكس ديزاين',
  '💻 تطوير الويب',
];

const needsParent        = ['تحضيري','أولى ابتدائي','ثانية ابتدائي','ثالثة ابتدائي','رابعة ابتدائي','خامسة ابتدائي','أولى متوسط','ثانية متوسط','ثالثة متوسط','رابعة متوسط'];
const needsSpecialty     = ['أولى ثانوي','ثانية ثانوي','ثالثة ثانوي (بكالوريا)'];
const needsCandidateType = ['ثالثة ثانوي (بكالوريا)'];

// ─── MODAL STATE ──────────────────────────────────────────
let currentModalType = '';

// ─── OPEN MODAL ───────────────────────────────────────────
function openModal(type) {
  currentModalType = type;
  resetForm();

  const titles = {
    support: currentLang==='ar' ? 'تسجيل — دعم دراسي'      : 'Registration — Academic Support',
    lang:    currentLang==='ar' ? 'تسجيل — دورات اللغات'   : 'Registration — Language Courses',
    vip:     currentLang==='ar' ? 'تسجيل — دروس VIP'       : 'Registration — VIP Lessons',
    ielts:   currentLang==='ar' ? 'تسجيل — اختبار IELTS'   : 'Registration — IELTS Test',
    online:  currentLang==='ar' ? 'تسجيل — دورات أونلاين'  : 'Registration — Online Courses',
    takwini: currentLang==='ar' ? 'تسجيل — دورات تكوينية'  : 'Registration — Training Courses',
  };
  const modalTitle = document.getElementById('modal-title');
  if (modalTitle) modalTitle.textContent = titles[type] || 'نموذج التسجيل';

  const motivationLabel = document.querySelector('label[for="motivation"] span[data-i18n="motivation"]');
  if (motivationLabel) {
    const t = i18n[currentLang];
    motivationLabel.textContent = (type === 'vip') ? t.motivationVip : t.motivation;
  }

  const langGrp    = document.getElementById('langTypeGroup');
  const vipTypeGrp = document.getElementById('vipTypeGroup');

  hideField(langGrp, 'langType');
  hideField(vipTypeGrp);

  if (type === 'support') {
    animateShow(document.getElementById('supportTypeGroup'));
  } else if (type === 'lang' || type === 'online') {
    animateShow(langGrp);
    langGrp?.querySelector('select')?.setAttribute('required','required');
  } else if (type === 'vip') {
    animateShow(vipTypeGrp);
  } else if (type === 'ielts') {
    const daysCountGrp = document.getElementById('vipDaysCountGroup');
    animateShow(daysCountGrp);
    daysCountGrp?.querySelector('select')?.setAttribute('required','required');
  } else if (type === 'takwini') {
    showTakwiniOptions();
  }

  document.getElementById('lang-toggle')?.classList.add('hidden');
  hideLogo();
  document.getElementById('modal')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal')?.classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('lang-toggle')?.classList.remove('hidden');
  showLogo();
  resetForm();
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

function resetForm() {
  const regForm = document.getElementById('reg-form');
  if (regForm) regForm.reset();

  const groups = [
    'supportTypeGroup',
    'eduLevelGroup','candidateTypeGroup','specialtyGroup','subjectGroup',
    'teacherGroup','parentGroup','langTypeGroup','langLevelGroup',
    'levelTestGroup','vipTypeGroup','vipEduLevelGroup','professionGroup',
    'vipDaysCountGroup','daysGroup',
  ];
  groups.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  document.getElementById('comingSoonNote')?.remove();
  document.getElementById('coursesListGroup')?.remove();
  document.getElementById('takwiniOptionsGroup')?.remove();

  document.querySelectorAll('input[name="vipType"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="candidateType"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="takwiniOption"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="supportType"]').forEach(r => r.checked = false);

  ['langType','langLevel','eduLevel','specialty','subject','teacher','vipDaysCount','vipEduLevel','profession'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.removeAttribute('required');
      el.value = '';
    }
  });

  resetDays();
  maxDaysAllowed = 2;

  const motivationLabel = document.querySelector('label[for="motivation"] span[data-i18n="motivation"]');
  if (motivationLabel) motivationLabel.textContent = i18n[currentLang].motivation;
}

// ─── DAYS ─────────────────────────────────────────────────
let maxDaysAllowed = 2;

function onDayChange(checkbox) {
  const checked = document.querySelectorAll('input[name="days"]:checked');
  const count   = checked.length;

  if (count > maxDaysAllowed) {
    checkbox.checked = false;
    return;
  }

  document.querySelectorAll('.day-card').forEach(card => {
    const inp = card.querySelector('input');
    card.classList.toggle('selected', !!inp?.checked);
    if (!inp?.checked && count >= maxDaysAllowed) card.classList.add('disabled');
    else card.classList.remove('disabled');
  });

  const countEl = document.getElementById('days-count');
  if (countEl) countEl.textContent = String(Math.min(count, maxDaysAllowed));

  const counter = document.getElementById('days-counter');
  if (counter) counter.classList.toggle('complete', count === maxDaysAllowed);
}

function resetDays() {
  document.querySelectorAll('input[name="days"]').forEach(c => c.checked = false);
  document.querySelectorAll('.day-card').forEach(c => c.classList.remove('selected','disabled'));

  const countEl = document.getElementById('days-count');
  if (countEl) countEl.textContent = '0';

  const counter = document.getElementById('days-counter');
  if (counter) counter.classList.remove('complete');
}

// ─── VIP DAYS COUNT ───────────────────────────────────────
function onVipDaysCountChange() {
  const val     = parseInt(document.getElementById('vipDaysCount')?.value || '0', 10);
  const daysGrp = document.getElementById('daysGroup');

  resetDays();
  if (!val) {
    if (daysGrp) daysGrp.style.display = 'none';
    return;
  }

  maxDaysAllowed = val;
  const daysOfLbl = document.getElementById('days-of-label');
  if (daysOfLbl) daysOfLbl.textContent = `/${val}`;

  const chooseLbl = document.querySelector('[data-i18n="chooseDays"]');
  if (chooseLbl) {
    chooseLbl.textContent = currentLang === 'ar'
      ? `اختر ${val} ${val === 1 ? 'يوم' : 'أيام'} للحضور في الأسبوع`
      : `Choose ${val} day${val > 1 ? 's' : ''} per week`;
  }

  const countEl = document.getElementById('days-count');
  if (countEl) countEl.textContent = '0';

  animateShow(daysGrp);
}

// ─── HELPERS ──────────────────────────────────────────────
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
    const s = document.getElementById(id);
    if (s) {
      s.removeAttribute('required');
      if ('value' in s) s.value = '';
    }
  });
}
function showComingSoon(afterEl) {
  if (!afterEl) return;
  document.getElementById('comingSoonNote')?.remove();
  const note = document.createElement('div');
  note.id = 'comingSoonNote';
  note.className = 'coming-soon-note field-appear';
  note.innerHTML = `<span>🚧</span><span>${currentLang === 'ar' ? 'الدورات لهذا المستوى ستُضاف قريباً' : 'Courses for this level will be added soon'}</span>`;
  afterEl.insertAdjacentElement('afterend', note);
}

function showCoursesList(level, courses) {
  document.getElementById('coursesListGroup')?.remove();
  document.getElementById('comingSoonNote')?.remove();

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
    opt.value       = item.course + ' — ' + item.teacher;
    opt.textContent = item.course + ' — ' + item.teacher;
    select.appendChild(opt);
  });

  wrap.appendChild(select);
  document.getElementById('eduLevelGroup')?.insertAdjacentElement('afterend', wrap);
}

function populateSubjects(key) {
  const subGrp    = document.getElementById('subjectGroup');
  const subSelect = document.getElementById('subject');
  const teachGrp  = document.getElementById('teacherGroup');

  document.getElementById('comingSoonNote')?.remove();
  hideField(subGrp, 'subject');
  hideField(teachGrp, 'teacher');

  const subjects = curriculum[key] ?? [];
  if (subjects.length === 0) {
    const specGrp = document.getElementById('specialtyGroup');
    const eduGrp  = document.getElementById('eduLevelGroup');
    const afterEl = (specGrp?.style.display !== 'none') ? specGrp : eduGrp;
    showComingSoon(afterEl);
    return;
  }

  if (!subSelect) return;
  subSelect.innerHTML = `<option value="">${currentLang === 'ar' ? '-- اختر المادة --' : '-- Choose subject --'}</option>`;
  subjects.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.subject;
    opt.textContent = item.subject;
    subSelect.appendChild(opt);
  });

  animateShow(subGrp);
  subSelect.setAttribute('required','required');
}

// ─── LANG TYPE ────────────────────────────────────────────
function onLangTypeChange() {
  const val        = document.getElementById('langType')?.value;
  const langLvlGrp = document.getElementById('langLevelGroup');
  const levelTestG = document.getElementById('levelTestGroup');

  hideField(langLvlGrp, 'langLevel');
  hideField(levelTestG);
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);

  if (val) {
    animateShow(langLvlGrp);
    langLvlGrp?.querySelector('select')?.setAttribute('required','required');
  }
}

function onLangLevelChange() {
  const val          = document.getElementById('langLevel')?.value;
  const levelTestGrp = document.getElementById('levelTestGroup');
  if (val) {
    animateShow(levelTestGrp);
  } else if (levelTestGrp) {
    levelTestGrp.style.display = 'none';
    document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  }
}

// ─── SUPPORT TYPE ─────────────────────────────────────────
function onBirthDateChange() {}

function onSupportTypeChange() {
  const selected = document.querySelector('input[name="supportType"]:checked')?.value;
  const eduGrp   = document.getElementById('eduLevelGroup');

  hideField(eduGrp, 'eduLevel');
  hideField(document.getElementById('specialtyGroup'), 'specialty');
  hideField(document.getElementById('subjectGroup'), 'subject');
  hideField(document.getElementById('teacherGroup'), 'teacher');
  hideField(document.getElementById('candidateTypeGroup'));
  hideField(document.getElementById('parentGroup'), 'parentName', 'parentPhone');
  document.getElementById('comingSoonNote')?.remove();
  document.getElementById('coursesListGroup')?.remove();

  if (selected) {
    animateShow(eduGrp);
    eduGrp?.querySelector('select')?.setAttribute('required', 'required');
  }
}

// ─── EDU LEVEL ────────────────────────────────────────────
function onEduLevelChange() {
  const level            = document.getElementById('eduLevel')?.value;
  const parentGrp        = document.getElementById('parentGroup');
  const specialtyGrp     = document.getElementById('specialtyGroup');
  const subGrp           = document.getElementById('subjectGroup');
  const teachGrp         = document.getElementById('teacherGroup');
  const candidateTypeGrp = document.getElementById('candidateTypeGroup');
  const parentName       = document.getElementById('parentName');
  const parentPhone      = document.getElementById('parentPhone');
  const supportType      = document.querySelector('input[name="supportType"]:checked')?.value || '';

  document.getElementById('comingSoonNote')?.remove();
  document.getElementById('coursesListGroup')?.remove();

  hideField(parentGrp, 'parentName','parentPhone');
  hideField(specialtyGrp, 'specialty');
  hideField(subGrp, 'subject');
  hideField(teachGrp, 'teacher');
  hideField(candidateTypeGrp);

  parentName?.removeAttribute('required');
  parentPhone?.removeAttribute('required');
  document.querySelectorAll('input[name="candidateType"]').forEach(r => r.checked = false);

  if (!level) return;

  if (supportType === 'دورات مدرسية') {
    const courses = coursesCurriculum[level];
    if (!courses || courses.length === 0) showComingSoon(document.getElementById('eduLevelGroup'));
    else showCoursesList(level, courses);
    return;
  }

  if (needsCandidateType.includes(level)) { animateShow(candidateTypeGrp); return; }
  if (needsSpecialty.includes(level))     { showSpecialtyField(level); return; }
  populateSubjects(level);
}

function onCandidateTypeChange() {
  const level = document.getElementById('eduLevel')?.value;
  document.getElementById('comingSoonNote')?.remove();
  hideField(document.getElementById('specialtyGroup'), 'specialty');
  hideField(document.getElementById('subjectGroup'),   'subject');
  hideField(document.getElementById('teacherGroup'),   'teacher');
  hideField(document.getElementById('parentGroup'),    'parentName','parentPhone');
  if (!document.querySelector('input[name="candidateType"]:checked')) return;
  showSpecialtyField(level);
}

function showSpecialtyField(level) {
  const specialtyGrp = document.getElementById('specialtyGroup');
  const specialtySel = document.getElementById('specialty');
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
  specialtySel.setAttribute('required','required');
}

function onSpecialtyChange() {
  const level = document.getElementById('eduLevel')?.value;
  const spec  = document.getElementById('specialty')?.value;
  document.getElementById('comingSoonNote')?.remove();
  hideField(document.getElementById('subjectGroup'), 'subject');
  hideField(document.getElementById('teacherGroup'), 'teacher');
  hideField(document.getElementById('parentGroup'),  'parentName','parentPhone');
  if (!spec) return;
  populateSubjects(`${level}|${spec}`);
}

function onSubjectChange() {
  const level      = document.getElementById('eduLevel')?.value;
  const spec       = document.getElementById('specialty')?.value;
  const subjectVal = document.getElementById('subject')?.value;
  const teachGrp   = document.getElementById('teacherGroup');
  const teachSel   = document.getElementById('teacher');

  hideField(teachGrp, 'teacher');
  hideField(document.getElementById('parentGroup'), 'parentName','parentPhone');
  if (!subjectVal || !teachSel) return;

  const key      = spec ? `${level}|${spec}` : level;
  const subjects = curriculum[key] || [];
  const found    = subjects.find(s => s.subject === subjectVal);
  if (!found || !found.teachers.length) return;

  teachSel.innerHTML = `<option value="">${currentLang === 'ar' ? '-- اختر الأستاذ/ة --' : '-- Choose teacher --'}</option>`;
  found.teachers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    teachSel.appendChild(opt);
  });

  if (found.teachers.length === 1) {
    teachSel.value = found.teachers[0];
    if (currentModalType === 'support') showParentIfNeeded(level);
  }

  animateShow(teachGrp);
  teachSel.setAttribute('required','required');
}

function onTeacherChange() {
  const level    = document.getElementById('eduLevel')?.value;
  const teachVal = document.getElementById('teacher')?.value;
  hideField(document.getElementById('parentGroup'), 'parentName','parentPhone');
  if (teachVal && currentModalType === 'support') showParentIfNeeded(level);
}

function showParentIfNeeded(level) {
  if (!needsParent.includes(level)) return;
  const parentGrp   = document.getElementById('parentGroup');
  const parentName  = document.getElementById('parentName');
  const parentPhone = document.getElementById('parentPhone');
  animateShow(parentGrp);
  parentName?.setAttribute('required','required');
  parentPhone?.setAttribute('required','required');
}

// ─── VIP TYPE ─────────────────────────────────────────────
function onVipTypeChange() {
  const selected = document.querySelector('input[name="vipType"]:checked')?.value;

  const allGroups = [
    'vipEduLevelGroup','vipDaysCountGroup','professionGroup',
    'daysGroup','langTypeGroup','langLevelGroup','levelTestGroup'
  ];
  allGroups.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  resetDays();
  if (document.getElementById('vipDaysCount')) document.getElementById('vipDaysCount').value = '';
  if (document.getElementById('profession'))   document.getElementById('profession').value   = '';
  if (document.getElementById('langType'))     document.getElementById('langType').value     = '';
  if (document.getElementById('langLevel'))    document.getElementById('langLevel').value    = '';
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);

  if (selected === 'support') {
    animateShow(document.getElementById('vipEduLevelGroup'));
    document.getElementById('vipEduLevel')?.setAttribute('required','required');
  } else if (selected === 'lang') {
    animateShow(document.getElementById('professionGroup'));
    document.getElementById('profession')?.setAttribute('required','required');
    animateShow(document.getElementById('langTypeGroup'));
    document.getElementById('langType')?.setAttribute('required','required');
  }
}

// ─── VIP EDU LEVEL ────────────────────────────────────────
function onVipEduLevelChange() {
  const level        = document.getElementById('vipEduLevel')?.value;
  const daysCountGrp = document.getElementById('vipDaysCountGroup');
  const daysGrp      = document.getElementById('daysGroup');

  hideField(daysCountGrp);
  hideField(daysGrp);
  resetDays();
  if (document.getElementById('vipDaysCount')) document.getElementById('vipDaysCount').value = '';

  if (!level) return;
  animateShow(daysCountGrp);
  document.getElementById('vipDaysCount')?.setAttribute('required','required');
}

// ─── TAKWINI OPTIONS ──────────────────────────────────────
function showTakwiniOptions() {
  document.getElementById('takwiniOptionsGroup')?.remove();

  const wrap = document.createElement('div');
  wrap.id        = 'takwiniOptionsGroup';
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
      <span class="check-label">${opt}</span>`;
    radioWrap.appendChild(lbl);
  });

  wrap.appendChild(radioWrap);
  const birthInput = document.getElementById('birthDate');
  const birthGroup = birthInput?.closest('.form-group');
  birthGroup?.insertAdjacentElement('afterend', wrap);
}

// ─── SUBMIT FORM ──────────────────────────────────────────
async function submitForm(e) {
  e.preventDefault();

  const firstName  = document.getElementById('firstName')?.value.trim() || '';
  const lastName   = document.getElementById('lastName')?.value.trim() || '';
  const birthDate  = document.getElementById('birthDate')?.value || '';
  const birthPlace = document.getElementById('birthPlace')?.value?.trim() || '';
  const phone      = document.getElementById('phone')?.value.trim() || '';

  let hasError = false;
  [firstName, lastName].forEach((val, i) => {
    const ids = ['firstName','lastName'];
    if (!validateLang(val)) {
      document.getElementById(ids[i])?.classList.add('error');
      setTimeout(() => document.getElementById(ids[i])?.classList.remove('error'), 1500);
      hasError = true;
    }
  });
  if (hasError) return;

  const selectedDays = [...document.querySelectorAll('input[name="days"]:checked')]
    .map(c => c.value).join('، ');

  const vipTypeVal    = document.querySelector('input[name="vipType"]:checked')?.value || '';
  const vipEduLevel   = document.getElementById('vipEduLevel')?.value  || '';
  const professionVal = document.getElementById('profession')?.value   || '';
  const supportType   = document.querySelector('input[name="supportType"]:checked')?.value || '';
  const courseSelect  = document.getElementById('courseSelect')?.value || '';
  const takwiniOption = document.querySelector('input[name="takwiniOption"]:checked')?.value || '';

  const data = {
    type:          currentModalType,
    firstName,
    lastName,
    birthDate,
    birthPlace,
    phone,
    motivation:    document.getElementById('motivation')?.value.trim() || '',
    timestamp:     new Date().toISOString(),
    supportType,
    courseSelect,
    takwiniOption,
    eduLevel:      document.getElementById('eduLevel')?.value || '',
    specialty:     document.getElementById('specialty')?.value || '',
    subject:       document.getElementById('subject')?.value || '',
    teacher:       document.getElementById('teacher')?.value || '',
    candidateType: document.querySelector('input[name="candidateType"]:checked')?.value || '',
    parentName:    document.getElementById('parentName')?.value || '',
    parentPhone:   document.getElementById('parentPhone')?.value || '',
    langType:      document.getElementById('langType')?.value || '',
    langLevel:     document.getElementById('langLevel')?.value || '',
    levelTest:     document.querySelector('input[name="levelTest"]:checked')?.value || '',
    vipType:       vipTypeVal,
    vipEduLevel,
    profession:    professionVal,
    days:          selectedDays,
    daysCount:     document.getElementById('vipDaysCount')?.value || '',
  };

  openTermsForSubmit(data);
}

// ─── PENDING FORM DATA ────────────────────────────────────
let pendingFormData = null;

// ─── TERMS ────────────────────────────────────────────────
function openTermsForSubmit(data) {
  pendingFormData = data;

  const checkbox = document.getElementById('terms-checkbox');
  if (checkbox) {
    checkbox.checked  = false;
    checkbox.disabled = true;
  }

  const label = document.getElementById('terms-agree-label');
  if (label) {
    label.classList.add('locked');
    label.classList.remove('unlocked');
  }

  const tpb = document.getElementById('terms-proceed-btn');
  if (tpb) {
    tpb.disabled = true;
    tpb.classList.remove('enabled');
  }

  const tbody = document.querySelector('.terms-body');
  if (tbody) {
    tbody.scrollTop = 0;
    tbody.onscroll = function() {
      const reached = tbody.scrollTop + tbody.clientHeight >= tbody.scrollHeight - 20;
      if (reached) {
        tbody.onscroll = null;
        if (checkbox) checkbox.disabled = false;
        if (label) {
          label.classList.remove('locked');
          label.classList.add('unlocked');
        }
        document.getElementById('scroll-hint')?.remove();
      }
    };
  }

  document.getElementById('scroll-hint')?.remove();
  const hint = document.createElement('div');
  hint.id = 'scroll-hint';
  hint.className = 'scroll-hint';
  hint.innerHTML = `<span>⬇</span><span>${currentLang === 'ar' ? 'اقرأ القوانين كاملاً للمتابعة' : 'Scroll down to read all terms'}</span>`;

  const footer = document.querySelector('.terms-footer');
  if (footer) footer.insertBefore(hint, footer.firstChild);

  document.getElementById('modal')?.classList.remove('active');
  document.getElementById('terms-modal')?.classList.add('active');
}

function closeTerms() {
  const tbody = document.querySelector('.terms-body');
  if (tbody) tbody.onscroll = null;
  document.getElementById('scroll-hint')?.remove();
  document.getElementById('terms-modal')?.classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('lang-toggle')?.classList.remove('hidden');
  showLogo();
  pendingFormData = null;
}

function closeTermsOutside(e) {
  if (e.target === document.getElementById('terms-modal')) closeTerms();
}

function onTermsCheck() {
  const checkbox = document.getElementById('terms-checkbox');
  if (checkbox?.disabled) return;
  const btn = document.getElementById('terms-proceed-btn');
  if (!btn) return;
  btn.disabled = !checkbox.checked;
  btn.classList.toggle('enabled', checkbox.checked);
}

async function proceedToRegister() {
  if (!pendingFormData) return;

  const tbody = document.querySelector('.terms-body');
  if (tbody) tbody.onscroll = null;
  document.getElementById('scroll-hint')?.remove();
  document.getElementById('terms-modal')?.classList.remove('active');

  const btn = document.getElementById('terms-proceed-btn');
  btn?.classList.add('loading');

  showLoadingPopup(
    currentLang === 'ar' ? 'جاري إرسال التسجيل...' : 'Submitting registration...',
    currentLang === 'ar' ? 'يرجى الانتظار قليلاً' : 'Please wait a moment'
  );

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingFormData)
    });

    const regTypeLabel = typeLabelsAr[pendingFormData.type] || 'الخدمة المطلوبة';

    btn?.classList.remove('loading');
    hideLoadingPopup();

    pendingFormData = null;
    document.body.style.overflow = '';
    document.getElementById('lang-toggle')?.classList.remove('hidden');
    showLogo();
    resetForm();

    showSuccessModal(
      currentLang === 'ar' ? 'تم التسجيل بنجاح' : 'Registration completed successfully',
      currentLang === 'ar'
        ? `تم استلام طلبك في ${regTypeLabel} بنجاح، وسيتم التواصل معك قريباً.`
        : 'Your registration request has been received successfully. We will contact you soon.',
      null
    );
  } catch (error) {
    btn?.classList.remove('loading');
    hideLoadingPopup();
    console.error('Registration submit error:', error);
    alert(currentLang === 'ar' ? 'حدث خطأ أثناء الإرسال، حاول مرة أخرى.' : 'An error occurred while submitting, please try again.');
    document.getElementById('lang-toggle')?.classList.remove('hidden');
    showLogo();
    document.body.style.overflow = '';
  }
}

// ─── LOADING POPUP ────────────────────────────────────────
function showLoadingPopup(title, message) {
  const overlay = document.getElementById('loading-popup');
  if (!overlay) return;

  const titleEl = document.getElementById('loading-popup-title');
  const msgEl   = document.getElementById('loading-popup-msg');

  if (titleEl) titleEl.textContent = title || (currentLang === 'ar' ? 'جاري المعالجة...' : 'Processing...');
  if (msgEl)   msgEl.textContent   = message || (currentLang === 'ar' ? 'يرجى الانتظار' : 'Please wait');

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hideLoadingPopup() {
  const overlay = document.getElementById('loading-popup');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ─── SUCCESS POPUP ────────────────────────────────────────
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
  const modal = document.getElementById('success-popup');
  if (!modal) return;

  const titleEl   = document.getElementById('success-popup-title');
  const msgEl     = document.getElementById('success-popup-msg');
  const regWrap   = document.getElementById('success-popup-reg');
  const regNumEl  = document.getElementById('success-popup-reg-number');

  if (titleEl) titleEl.textContent = title || (currentLang === 'ar' ? 'تم بنجاح' : 'Success');
  if (msgEl)   msgEl.textContent   = message || (currentLang === 'ar' ? 'تم تنفيذ العملية بنجاح.' : 'The operation completed successfully.');

  if (regWrap && regNumEl) {
    if (regNumber) {
      regNumEl.textContent = regNumber;
      regWrap.style.display = 'block';
    } else {
      regWrap.style.display = 'none';
      regNumEl.textContent = '';
    }
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  const box = modal.querySelector('.success-popup-box');
  createConfetti(box);
}

function closeSuccessModal() {
  const modal = document.getElementById('success-popup');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

function closeSuccessOutside(e) {
  if (e.target === document.getElementById('success-popup')) closeSuccessModal();
}

// ─── JOIN TEAM MODAL ──────────────────────────────────────
function openJoinModal() {
  document.getElementById('join-modal')?.classList.add('active');
  document.getElementById('lang-toggle')?.classList.add('hidden');
  hideLogo();
  document.body.style.overflow = 'hidden';
}

function closeJoinModal() {
  document.getElementById('join-modal')?.classList.remove('active');
  document.getElementById('lang-toggle')?.classList.remove('hidden');
  showLogo();
  document.body.style.overflow = '';

  const form = document.getElementById('join-form');
  if (form) form.reset();

  const fileName = document.getElementById('cv-file-name');
  if (fileName) fileName.textContent = '';
}

function closeJoinModalOutside(e) {
  if (e.target === document.getElementById('join-modal')) closeJoinModal();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function() {
      const result = String(reader.result || '');
      const match = result.match(/^(.*?);base64,(.*)$/);
      if (!match) {
        reject(new Error('Invalid file format'));
        return;
      }
      resolve({
        mimeType: match[1],
        base64: match[2]
      });
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function submitJoinForm(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('join-submit-btn');
  if (submitBtn) {
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
  }

  showLoadingPopup(
    currentLang === 'ar' ? 'جاري إرسال طلب الانضمام...' : 'Submitting join request...',
    currentLang === 'ar' ? 'يرجى الانتظار قليلاً' : 'Please wait a moment'
  );

  try {
    const firstName  = document.getElementById('joinFirstName')?.value.trim() || '';
    const lastName   = document.getElementById('joinLastName')?.value.trim() || '';
    const phone      = document.getElementById('joinPhone')?.value.trim() || '';
    const email      = document.getElementById('joinEmail')?.value.trim() || '';
    const role       = document.querySelector('input[name="joinRole"]:checked')?.value || '';
    const specialty  = document.getElementById('joinSpecialty')?.value.trim() || '';
    const experience = document.getElementById('joinExperience')?.value.trim() || '';
    const file       = document.getElementById('joinCV')?.files?.[0] || null;

    let base64 = '';
    let mimeType = '';
    let originalFileName = '';

    if (file) {
      const converted = await fileToBase64(file);
      base64 = converted.base64;
      mimeType = converted.mimeType;
      originalFileName = file.name;
    }

    const formBody = new URLSearchParams();
    formBody.append('firstName', firstName);
    formBody.append('lastName', lastName);
    formBody.append('fullName', `${firstName} ${lastName}`.trim());
    formBody.append('phone', phone);
    formBody.append('email', email);
    formBody.append('role', role);
    formBody.append('specialty', specialty);
    formBody.append('experience', experience);
    formBody.append('base64', base64);
    formBody.append('mimeType', mimeType);
    formBody.append('originalFileName', originalFileName);
    formBody.append('timestamp', new Date().toISOString());

    const response = await fetch(JOIN_APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: formBody.toString()
    });

    let result = null;
    try {
      result = await response.json();
    } catch (_) {
      result = null;
    }

    submitBtn?.classList.remove('loading');
    if (submitBtn) submitBtn.disabled = false;
    hideLoadingPopup();

    if ((result && result.success) || response.ok) {
      closeJoinModal();
      showSuccessModal(
        currentLang === 'ar' ? 'تم إرسال الطلب بنجاح' : 'Request sent successfully',
        currentLang === 'ar'
          ? 'تم استلام طلب الانضمام إلى الفريق، وسيتم مراجعة ملفك والتواصل معك قريباً.'
          : 'Your team join request has been received successfully. We will review your application and contact you soon.'
      );
    } else {
      console.error('Join response error:', result);
      alert(
        currentLang === 'ar'
          ? 'فشل إرسال الطلب. تأكد من نشر Apps Script كـ Web App بصلاحية Anyone.'
          : 'Request failed. Make sure the Apps Script is deployed as a Web App with Anyone access.'
      );
    }
  } catch (err) {
    submitBtn?.classList.remove('loading');
    if (submitBtn) submitBtn.disabled = false;
    hideLoadingPopup();
    console.error('Join submit error:', err);
    alert(
      currentLang === 'ar'
        ? 'تعذر الاتصال. تحقق من رابط Apps Script وإعدادات النشر ثم حاول مجددًا.'
        : 'Connection failed. Check the Apps Script URL and deployment settings, then try again.'
    );
  }
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────
window._annCache = [];
let annCurrentIndex = 0;
let annAutoTimer = null;

function buildAnnouncementCard(item) {
  const card = document.createElement('div');
  card.className = 'ann-card';

  const title = currentLang === 'ar'
    ? (item.titleAr || item.title || '')
    : (item.titleEn || item.titleAr || item.title || '');

  const text = currentLang === 'ar'
    ? (item.bodyAr || item.textAr || item.body || item.text || '')
    : (item.bodyEn || item.textEn || item.bodyAr || item.textAr || item.body || item.text || '');

  const date = item.date || item.createdAt || '';
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

  const img = card.querySelector('.ann-card-img');
  if (img) {
    img.addEventListener('load', () => img.classList.add('loaded'));
    img.addEventListener('error', () => card.classList.add('text-only'));
  }

  return card;
}

function renderAnnouncementSlider(items) {
  const section = document.getElementById('announcements-section');
  const track   = document.getElementById('ann-track');
  const dots    = document.getElementById('ann-dots');

  if (!section || !track || !dots) return;

  track.innerHTML = '';
  dots.innerHTML = '';

  if (!items || items.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

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
  const track = document.getElementById('ann-track');
  const dots  = [...document.querySelectorAll('.ann-dot')];
  if (!track) return;

  track.style.transform = `translateX(-${annCurrentIndex * 100}%)`;
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
  annAutoTimer = setInterval(nextAnnouncement, 5000);
}

function stopAnnouncementAutoPlay() {
  if (annAutoTimer) {
    clearInterval(annAutoTimer);
    annAutoTimer = null;
  }
}

function _renderFromData(items) {
  window._annCache = Array.isArray(items) ? items : [];
  renderAnnouncementSlider(window._annCache);
}

async function loadAnnouncements() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getAnnouncements`);
    const data = await res.json();

    const items =
      data.items ||
      data.announcements ||
      data.data ||
      (Array.isArray(data) ? data : []);

    _renderFromData(items);
  } catch (error) {
    console.error('Announcements load error:', error);
    _renderFromData([]);
  }
}

// ─── EVENT BINDINGS ───────────────────────────────────────
function bindStaticEvents() {
  document.getElementById('btn-ar')?.addEventListener('click', () => setLang('ar'));
  document.getElementById('btn-en')?.addEventListener('click', () => setLang('en'));

  document.getElementById('reg-form')?.addEventListener('submit', submitForm);
  document.getElementById('join-form')?.addEventListener('submit', submitJoinForm);

  document.getElementById('terms-checkbox')?.addEventListener('change', onTermsCheck);

  document.getElementById('joinCV')?.addEventListener('change', function () {
    const file = this.files?.[0];
    const fileName = document.getElementById('cv-file-name');
    if (fileName) fileName.textContent = file ? file.name : '';
  });

  document.getElementById('ann-prev')?.addEventListener('click', prevAnnouncement);
  document.getElementById('ann-next')?.addEventListener('click', nextAnnouncement);

  document.getElementById('ann-track')?.addEventListener('mouseenter', stopAnnouncementAutoPlay);
  document.getElementById('ann-track')?.addEventListener('mouseleave', startAnnouncementAutoPlay);
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setLang('ar');
  bindStaticEvents();
  loadAnnouncements();
});
