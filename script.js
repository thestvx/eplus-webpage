// ─── SQUARES BACKGROUND ───────────────────────────────────
const canvas = document.getElementById('squares-canvas');
const ctx    = canvas.getContext('2d');
let squares  = [];
const squareSize = 40, squareGap = 4;
let cols, rows;

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  cols = Math.ceil(window.innerWidth  / (squareSize + squareGap));
  rows = Math.ceil(window.innerHeight / (squareSize + squareGap));
  initSquares();
}
function initSquares() {
  squares = [];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++)
      squares.push({
        x: i*(squareSize+squareGap), y: j*(squareSize+squareGap),
        opacity: Math.random()*0.3, targetOpacity: Math.random()*0.3,
        speed: 0.005 + Math.random()*0.01
      });
}
function animateSquares() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  squares.forEach(sq => {
    if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01)
      sq.targetOpacity = Math.random()*0.4;
    sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
    ctx.fillStyle = `rgba(4,130,195,${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, squareSize, squareSize);
  });
  requestAnimationFrame(animateSquares);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateSquares();

// ─── APPS SCRIPT URL ──────────────────────────────────────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyiooCIgUPH3OHbdPJgjd23tnT1NA7IichZ28haow3Y5kf2wtGAXFFzpL1rpV2Fpnxysg/exec';

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
    annTitle:'إعلانات الأكاديمية',
    firstName:'الاسم', lastName:'اللقب', birthDate:'تاريخ الميلاد',
    birthPlace:'العنوان', phone:'رقم الهاتف',
    motivation:    'ما الذي دفعك إلى اختيار التسجيل في أكاديمية E-PLUS؟',
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
    vipStudyMode:'طريقة الدراسة', vipModeInPerson:'🏫 حضوري', vipModeOnline:'💻 أونلاين', vipModeHybrid:'🔀 حضوري وأونلاين (هجين)',
    requiredNote:'⚠️ يُرجى التأكد من تعبئة جميع الحقول الإلزامية قبل إتمام التسجيل. لا يمكن إرسال النموذج إلا بعد استكمال كافة المعلومات المطلوبة.',
    chooseDays:'اختر الأيام', daysSelected:'يوم محدد',
    submitBtn:'إتمام التسجيل ✦',
    termsTitle:'قوانين وشروط الأكاديمية',
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
    annTitle:'Academy Announcements',
    firstName:'First Name', lastName:'Last Name', birthDate:'Date of Birth',
    birthPlace:'Address', phone:'Phone Number',
    motivation:    'What motivated you to choose E-PLUS Academy?',
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
    vipStudyMode:'Study Mode', vipModeInPerson:'🏫 In-Person', vipModeOnline:'💻 Online', vipModeHybrid:'🔀 In-Person & Online (Hybrid)',
    requiredNote:'⚠️ Please ensure all required fields are filled before completing your registration. The form cannot be submitted until all required information is provided.',
    chooseDays:'Choose Days', daysSelected:'day(s) selected',
    submitBtn:'Complete Registration ✦',
    termsTitle:'Academy Terms & Conditions',
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

// ─── HELPER: إخفاء وإظهار اللوقو ─────────────────────────
function hideLogo() { document.querySelector('.top-logo').style.display = 'none'; }
function showLogo() { document.querySelector('.top-logo').style.display = 'flex'; }

function setLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';

  document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');

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
    { subject:'المحاسبة',          teachers:['الأستاذ سرهود عبدالرحمان'] },
    { subject:'اللغة العربية',    teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',   teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',          teachers:['الأستاذة دادة نجاح سلام'] },
    { subject:'تاريخ وجغرافيا',   teachers:['الأستاذ ايمن دخان'] },
    { subject:'العلوم الإسلامية', teachers:['الأستاذ هبيتة ربيع'] },
  ],
  'ثالثة ثانوي (بكالوريا)|آداب وفلسفة': [
    { subject:'اللغة العربية',     teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',    teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية', teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',           teachers:['الأستاذة دادة نجاح سلام'] },
    { subject:'تاريخ وجغرافيا',    teachers:['الأستاذ ايمن دخان'] },
    { subject:'الرياضيات (أدبيين)',teachers:['الأستاذ هبيتة ربيع'] },
    { subject:'العلوم الإسلامية',  teachers:['الأستاذ هبيتة ربيع'] },
  ],
  'ثالثة ثانوي (بكالوريا)|لغات أجنبية': [
    { subject:'اللغة الإسبانية',   teachers:['الأستاذ طوالبية ابراهيم'] },
    { subject:'اللغة الألمانية',   teachers:['الأستاذ حمزة علالي'] },
    { subject:'اللغة العربية',     teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',    teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية', teachers:['الأستاذ كرام الصادق'] },
    { subject:'الرياضيات (أدبيين)',teachers:['الأستاذ هبيتة ربيع'] },
    { subject:'العلوم الإسلامية',  teachers:['الأستاذ هبيتة ربيع'] },
  ],
};

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
  document.getElementById('modal-title').textContent = titles[type] || 'نموذج التسجيل';

  const motivationLabel = document.querySelector('label[for="motivation"] span[data-i18n="motivation"]');
  if (motivationLabel) {
    const t = i18n[currentLang];
    motivationLabel.textContent = (type === 'vip') ? t.motivationVip : t.motivation;
  }

  const eduGrp     = document.getElementById('eduLevelGroup');
  const langGrp    = document.getElementById('langTypeGroup');
  const vipTypeGrp = document.getElementById('vipTypeGroup');

  hideField(eduGrp,     'eduLevel');
  hideField(langGrp,    'langType');
  hideField(vipTypeGrp);

  if (type === 'support') {
    animateShow(eduGrp);
    eduGrp.querySelector('select').setAttribute('required','required');
  } else if (type === 'lang' || type === 'online') {
    animateShow(langGrp);
    langGrp.querySelector('select').setAttribute('required','required');
  } else if (type === 'vip') {
    animateShow(vipTypeGrp);
  } else if (type === 'ielts') {
    const daysCountGrp = document.getElementById('vipDaysCountGroup');
    animateShow(daysCountGrp);
    daysCountGrp.querySelector('select').setAttribute('required','required');
  }

  document.getElementById('lang-toggle').classList.add('hidden');
  hideLogo();
  document.getElementById('modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('lang-toggle').classList.remove('hidden');
  showLogo();
  resetForm();
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

function resetForm() {
  document.getElementById('reg-form').reset();
  const groups = [
    'eduLevelGroup','candidateTypeGroup','specialtyGroup','subjectGroup',
    'teacherGroup','parentGroup','langTypeGroup','langLevelGroup',
    'levelTestGroup','vipTypeGroup','vipEduLevelGroup','professionGroup',
    'vipDaysCountGroup','daysGroup','vipStudyModeGroup',
  ];
  groups.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.getElementById('comingSoonNote')?.remove();
  document.querySelectorAll('input[name="vipType"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="candidateType"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="vipStudyMode"]').forEach(r => r.checked = false);
  resetDays();
  maxDaysAllowed = 2;

  const motivationLabel = document.querySelector('label[for="motivation"] span[data-i18n="motivation"]');
  if (motivationLabel) {
    motivationLabel.textContent = i18n[currentLang].motivation;
  }
}

// ─── BUTTONS ──────────────────────────────────────────────
document.querySelectorAll('.reg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.getAttribute('data-reg-type');
    if (type) openModal(type);
  });
});

// ─── DAYS ─────────────────────────────────────────────────
let maxDaysAllowed = 2;

function onDayChange(checkbox) {
  const checked = document.querySelectorAll('input[name="days"]:checked');
  const count   = checked.length;
  if (count > maxDaysAllowed) { checkbox.checked = false; return; }
  document.querySelectorAll('.day-card').forEach(card => {
    const inp = card.querySelector('input');
    card.classList.toggle('selected', inp.checked);
    if (!inp.checked && count >= maxDaysAllowed) card.classList.add('disabled');
    else card.classList.remove('disabled');
  });
  const countEl = document.getElementById('days-count');
  if (countEl) countEl.textContent = Math.min(count, maxDaysAllowed);
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
  const val     = parseInt(document.getElementById('vipDaysCount').value);
  const daysGrp = document.getElementById('daysGroup');
  resetDays();
  if (!val) { daysGrp.style.display = 'none'; return; }
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
    if (s) { s.removeAttribute('required'); s.value = ''; }
  });
}
function showComingSoon(afterEl) {
  document.getElementById('comingSoonNote')?.remove();
  const note = document.createElement('div');
  note.id = 'comingSoonNote';
  note.className = 'coming-soon-note field-appear';
  note.innerHTML = `<span>🚧</span><span>المواد والأساتذة لهذا المستوى ستُضاف قريباً</span>`;
  afterEl.insertAdjacentElement('afterend', note);
}
function populateSubjects(key) {
  const subGrp    = document.getElementById('subjectGroup');
  const subSelect = document.getElementById('subject');
  const teachGrp  = document.getElementById('teacherGroup');
  document.getElementById('comingSoonNote')?.remove();
  hideField(subGrp,   'subject');
  hideField(teachGrp, 'teacher');
  const subjects = curriculum[key] ?? [];
  if (subjects.length === 0) {
    const specGrp = document.getElementById('specialtyGroup');
    const eduGrp  = document.getElementById('eduLevelGroup');
    const afterEl = (specGrp?.style.display !== 'none') ? specGrp : eduGrp;
    showComingSoon(afterEl);
    return;
  }
  subSelect.innerHTML = `<option value="">-- اختر المادة --</option>`;
  subjects.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.subject; opt.textContent = item.subject;
    subSelect.appendChild(opt);
  });
  animateShow(subGrp);
  subSelect.setAttribute('required','required');
}

// ─── LANG TYPE ────────────────────────────────────────────
// دورات لغات / أونلاين / VIP لغات: يُظهر langLevel بعد اختيار اللغة
// عند التغيير: يُخفي كل ما بعده
function onLangTypeChange() {
  const val        = document.getElementById('langType').value;
  const langLvlGrp = document.getElementById('langLevelGroup');
  const levelTestG = document.getElementById('levelTestGroup');
  const smGrp      = document.getElementById('vipStudyModeGroup');
  const dcGrp      = document.getElementById('vipDaysCountGroup');
  const dGrp       = document.getElementById('daysGroup');

  hideField(langLvlGrp, 'langLevel');
  hideField(levelTestG);
  if (smGrp) smGrp.style.display = 'none';
  if (currentModalType === 'vip') {
    if (dcGrp) dcGrp.style.display = 'none';
    if (dGrp)  { dGrp.style.display = 'none'; resetDays(); }
    document.getElementById('vipDaysCount').value = '';
  }
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="vipStudyMode"]').forEach(r => r.checked = false);

  if (val) {
    animateShow(langLvlGrp);
    langLvlGrp.querySelector('select')?.setAttribute('required','required');
  }
}

// ─── LANG LEVEL ───────────────────────────────────────────
// دورات لغات / أونلاين → levelTest
// VIP لغات            → vipStudyMode → vipDaysCount → daysGroup
function onLangLevelChange() {
  const val          = document.getElementById('langLevel').value;
  const levelTestGrp = document.getElementById('levelTestGroup');
  const smGrp        = document.getElementById('vipStudyModeGroup');
  const dcGrp        = document.getElementById('vipDaysCountGroup');
  const dGrp         = document.getElementById('daysGroup');

  hideField(levelTestGrp);
  if (smGrp) smGrp.style.display = 'none';
  if (currentModalType === 'vip') {
    if (dcGrp) dcGrp.style.display = 'none';
    if (dGrp)  { dGrp.style.display = 'none'; resetDays(); }
    document.getElementById('vipDaysCount').value = '';
  }
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="vipStudyMode"]').forEach(r => r.checked = false);

  if (!val) return;

  if (currentModalType === 'vip') {
    // VIP لغات: اختر طريقة الدراسة أولاً
    animateShow(smGrp);
  } else {
    // دورات لغات عادية / أونلاين
    animateShow(levelTestGrp);
  }
}

// ─── EDU LEVEL (دعم دراسي) ────────────────────────────────
function onEduLevelChange() {
  const level            = document.getElementById('eduLevel').value;
  const parentGrp        = document.getElementById('parentGroup');
  const specialtyGrp     = document.getElementById('specialtyGroup');
  const subGrp           = document.getElementById('subjectGroup');
  const teachGrp         = document.getElementById('teacherGroup');
  const candidateTypeGrp = document.getElementById('candidateTypeGroup');
  const parentName       = document.getElementById('parentName');
  const parentPhone      = document.getElementById('parentPhone');

  document.getElementById('comingSoonNote')?.remove();
  hideField(parentGrp,        'parentName','parentPhone');
  hideField(specialtyGrp,     'specialty');
  hideField(subGrp,           'subject');
  hideField(teachGrp,         'teacher');
  hideField(candidateTypeGrp);
  parentName.removeAttribute('required');
  parentPhone.removeAttribute('required');
  document.querySelectorAll('input[name="candidateType"]').forEach(r => r.checked = false);

  if (!level) return;
  if (needsCandidateType.includes(level)) { animateShow(candidateTypeGrp); return; }
  if (needsSpecialty.includes(level))     { showSpecialtyField(level); return; }
  populateSubjects(level);
}

function onCandidateTypeChange() {
  const level = document.getElementById('eduLevel').value;
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
  specialtySel.innerHTML = `<option value="">-- اختر التخصص --</option>`;
  specs.forEach(sp => {
    const opt = document.createElement('option');
    opt.value = sp; opt.textContent = sp;
    specialtySel.appendChild(opt);
  });
  animateShow(specialtyGrp);
  specialtySel.setAttribute('required','required');
}

function onSpecialtyChange() {
  const level = document.getElementById('eduLevel').value;
  const spec  = document.getElementById('specialty').value;
  document.getElementById('comingSoonNote')?.remove();
  hideField(document.getElementById('subjectGroup'), 'subject');
  hideField(document.getElementById('teacherGroup'), 'teacher');
  hideField(document.getElementById('parentGroup'),  'parentName','parentPhone');
  if (!spec) return;
  populateSubjects(`${level}|${spec}`);
}

function onSubjectChange() {
  const level      = document.getElementById('eduLevel').value;
  const spec       = document.getElementById('specialty').value;
  const subjectVal = document.getElementById('subject').value;
  const teachGrp   = document.getElementById('teacherGroup');
  const teachSel   = document.getElementById('teacher');

  hideField(teachGrp, 'teacher');
  hideField(document.getElementById('parentGroup'), 'parentName','parentPhone');
  if (!subjectVal) return;

  const key      = spec ? `${level}|${spec}` : level;
  const subjects = curriculum[key] || [];
  const found    = subjects.find(s => s.subject === subjectVal);
  if (!found || !found.teachers.length) return;

  teachSel.innerHTML = `<option value="">-- اختر الأستاذ/ة --</option>`;
  found.teachers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
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
  const level    = document.getElementById('eduLevel').value;
  const teachVal = document.getElementById('teacher').value;
  hideField(document.getElementById('parentGroup'), 'parentName','parentPhone');
  if (teachVal && currentModalType === 'support') showParentIfNeeded(level);
}

function showParentIfNeeded(level) {
  if (!needsParent.includes(level)) return;
  const parentGrp   = document.getElementById('parentGroup');
  const parentName  = document.getElementById('parentName');
  const parentPhone = document.getElementById('parentPhone');
  animateShow(parentGrp);
  parentName.setAttribute('required','required');
  parentPhone.setAttribute('required','required');
}

// ─── VIP TYPE ─────────────────────────────────────────────
// VIP دعم  → vipEduLevel → vipStudyMode → vipDaysCount → daysGroup
// VIP لغات → langType    → langLevel    → vipStudyMode → vipDaysCount → daysGroup
function onVipTypeChange() {
  const selected = document.querySelector('input[name="vipType"]:checked')?.value;

  const allGroups = [
    'vipEduLevelGroup','vipDaysCountGroup','professionGroup',
    'daysGroup','langTypeGroup','langLevelGroup',
    'levelTestGroup','vipStudyModeGroup'
  ];
  allGroups.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  resetDays();
  document.getElementById('vipDaysCount').value = '';
  document.getElementById('profession').value   = '';
  document.getElementById('langType').value     = '';
  document.getElementById('langLevel').value    = '';
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="vipStudyMode"]').forEach(r => r.checked = false);

  if (selected === 'support') {
    // خطوة 1: اختر المستوى الدراسي
    animateShow(document.getElementById('vipEduLevelGroup'));
    document.getElementById('vipEduLevel').setAttribute('required','required');
  } else if (selected === 'lang') {
    // خطوة 1: اختر اللغة مباشرة (بدون professionGroup)
    animateShow(document.getElementById('langTypeGroup'));
    document.getElementById('langType').setAttribute('required','required');
  }
}

// ─── VIP EDU LEVEL ────────────────────────────────────────
// بعد المستوى الدراسي في VIP دعم → اختر طريقة الدراسة
function onVipEduLevelChange() {
  const level   = document.getElementById('vipEduLevel').value;
  const smGrp   = document.getElementById('vipStudyModeGroup');
  const dcGrp   = document.getElementById('vipDaysCountGroup');
  const dGrp    = document.getElementById('daysGroup');

  if (smGrp) smGrp.style.display = 'none';
  if (dcGrp) dcGrp.style.display = 'none';
  if (dGrp)  { dGrp.style.display = 'none'; resetDays(); }
  document.getElementById('vipDaysCount').value = '';
  document.querySelectorAll('input[name="vipStudyMode"]').forEach(r => r.checked = false);

  if (!level) return;
  // خطوة 2: اختر طريقة الدراسة
  animateShow(smGrp);
}

// ─── VIP STUDY MODE ───────────────────────────────────────
// بعد اختيار طريقة الدراسة (في كلا VIP دعم و VIP لغات) → اختر عدد الأيام
function onVipStudyModeChange() {
  const selected = document.querySelector('input[name="vipStudyMode"]:checked')?.value;
  const dcGrp    = document.getElementById('vipDaysCountGroup');
  const dGrp     = document.getElementById('daysGroup');

  if (dcGrp) dcGrp.style.display = 'none';
  if (dGrp)  { dGrp.style.display = 'none'; resetDays(); }
  document.getElementById('vipDaysCount').value = '';

  if (selected) {
    // خطوة 3: اختر عدد الأيام في الأسبوع
    animateShow(dcGrp);
    document.getElementById('vipDaysCount').setAttribute('required','required');
  }
}

// ─── SUBMIT FORM ──────────────────────────────────────────
async function submitForm(e) {
  e.preventDefault();

  const firstName  = document.getElementById('firstName').value.trim();
  const lastName   = document.getElementById('lastName').value.trim();
  const birthDate  = document.getElementById('birthDate').value;
  const birthPlace = document.getElementById('birthPlace').value.trim();
  const phone      = document.getElementById('phone').value.trim();

  let hasError = false;
  [firstName, lastName, birthPlace].forEach((val, i) => {
    const ids = ['firstName','lastName','birthPlace'];
    if (!validateLang(val)) {
      document.getElementById(ids[i]).classList.add('error');
      setTimeout(() => document.getElementById(ids[i]).classList.remove('error'), 1500);
      hasError = true;
    }
  });
  if (hasError) return;

  const selectedDays = [...document.querySelectorAll('input[name="days"]:checked')]
    .map(c => c.value).join('، ');

  const data = {
    type:          currentModalType,
    firstName,
    lastName,
    birthDate,
    birthPlace,
    phone,
    motivation:    document.getElementById('motivation').value.trim(),
    timestamp:     new Date().toISOString(),
    eduLevel:      document.getElementById('eduLevel')?.value      || '',
    specialty:     document.getElementById('specialty')?.value     || '',
    subject:       document.getElementById('subject')?.value       || '',
    teacher:       document.getElementById('teacher')?.value       || '',
    candidateType: document.querySelector('input[name="candidateType"]:checked')?.value || '',
    parentName:    document.getElementById('parentName')?.value    || '',
    parentPhone:   document.getElementById('parentPhone')?.value   || '',
    langType:      document.getElementById('langType')?.value      || '',
    langLevel:     document.getElementById('langLevel')?.value     || '',
    levelTest:     document.querySelector('input[name="levelTest"]:checked')?.value  || '',
    vipType:       document.querySelector('input[name="vipType"]:checked')?.value    || '',
    vipEduLevel:   document.getElementById('vipEduLevel')?.value   || '',
    vipStudyMode:  document.querySelector('input[name="vipStudyMode"]:checked')?.value || '',
    profession:    document.getElementById('profession')?.value    || '',
    days:          selectedDays,
    daysCount:     document.getElementById('vipDaysCount')?.value  || '',
  };

  openTermsForSubmit(data);
}

// ─── PENDING FORM DATA ────────────────────────────────────
let pendingFormData = null;

// ─── TERMS ────────────────────────────────────────────────
function openTermsForSubmit(data) {
  pendingFormData = data;

  const checkbox = document.getElementById('terms-checkbox');
  checkbox.checked  = false;
  checkbox.disabled = true;
  const label = document.getElementById('terms-agree-label');
  if (label) { label.classList.add('locked'); label.classList.remove('unlocked'); }
  const tpb = document.getElementById('terms-proceed-btn');
  if (tpb)  { tpb.disabled = true; tpb.classList.remove('enabled'); }

  const tbody = document.querySelector('.terms-body');
  if (tbody) {
    tbody.scrollTop = 0;
    tbody.onscroll = function() {
      const reached = tbody.scrollTop + tbody.clientHeight >= tbody.scrollHeight - 20;
      if (reached) {
        tbody.onscroll = null;
        checkbox.disabled = false;
        if (label) { label.classList.remove('locked'); label.classList.add('unlocked'); }
        document.getElementById('scroll-hint')?.remove();
      }
    };
  }

  document.getElementById('scroll-hint')?.remove();
  const hint = document.createElement('div');
  hint.id = 'scroll-hint';
  hint.className = 'scroll-hint';
  hint.innerHTML = `<span>⬇</span><span>${
    currentLang === 'ar' ? 'اقرأ القوانين كاملاً للمتابعة' : 'Scroll down to read all terms'
  }</span>`;
  const footer = document.querySelector('.terms-footer');
  if (footer) footer.insertBefore(hint, footer.firstChild);

  document.getElementById('modal').classList.remove('active');
  document.getElementById('terms-modal').classList.add('active');
}

function closeTerms() {
  const tbody = document.querySelector('.terms-body');
  if (tbody) tbody.onscroll = null;
  document.getElementById('scroll-hint')?.remove();
  document.getElementById('terms-modal').classList.remove('active');
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
  if (checkbox.disabled) return;
  const btn = document.getElementById('terms-proceed-btn');
  btn.disabled = !checkbox.checked;
  btn.classList.toggle('enabled', checkbox.checked);
}

async function proceedToRegister() {
  if (!pendingFormData) return;
  const tbody = document.querySelector('.terms-body');
  if (tbody) tbody.onscroll = null;
  document.getElementById('scroll-hint')?.remove();
  document.getElementById('terms-modal').classList.remove('active');

  const btn = document.getElementById('terms-proceed-btn');
  btn.classList.add('loading');

  try {
    await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(pendingFormData)
    });
    btn.classList.remove('loading');
    pendingFormData = null;
    showSuccessPopup();
  } catch(err) {
    btn.classList.remove('loading');
    console.error(err);
    document.getElementById('terms-modal').classList.add('active');
    alert(currentLang === 'ar'
      ? 'حدث خطأ أثناء الإرسال، تحقق من اتصالك بالإنترنت.'
      : 'A network error occurred. Please check your connection.');
  }
}

// ─── SUCCESS POPUP ────────────────────────────────────────
function showSuccessPopup() {
  document.getElementById('success-popup-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'success-popup-overlay';
  overlay.className = 'success-popup-overlay';
  overlay.innerHTML = `
    <div class="success-popup-box" id="success-popup-box">
      <div class="success-popup-icon-wrap">
        <div class="success-popup-ring"></div>
        <div class="success-popup-check">✓</div>
      </div>
      <div class="success-popup-title">
        ${currentLang==='ar' ? '🎉 تم تسجيلك بنجاح!' : '🎉 Registration Successful!'}
      </div>
      <div class="success-popup-msg">
        ${currentLang==='ar'
          ? 'شكراً لك! تم استلام طلب تسجيلك بنجاح.<br>سيتم التواصل معك قريباً من طرف فريق أكاديمية E-PLUS.<br><span class="success-popup-sub">✦ رحلتك نحو النجاح تبدأ من هنا ✦</span>'
          : 'Thank you! Your registration has been received.<br>The E-PLUS Academy team will contact you soon.<br><span class="success-popup-sub">✦ Your journey to success starts here ✦</span>'}
      </div>
      <div class="success-popup-divider"></div>
      <div class="success-popup-info">
        <span>📋 ${typeLabelsAr[currentModalType] || currentModalType}</span>
        <span>🕐 ${new Date().toLocaleDateString(currentLang==='ar'?'ar-DZ':'en-GB',{year:'numeric',month:'long',day:'numeric'})}</span>
      </div>
      <button class="success-popup-btn" onclick="closeSuccessPopup()">
        ${currentLang==='ar' ? 'حسناً، شكراً!' : 'OK, Thank you!'}
      </button>
    </div>`;
  document.body.appendChild(overlay);
  spawnConfetti(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));
}

function closeSuccessPopup() {
  const overlay = document.getElementById('success-popup-overlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  setTimeout(() => overlay.remove(), 400);
  document.body.style.overflow = '';
  document.getElementById('lang-toggle')?.classList.remove('hidden');
  showLogo();
}

function spawnConfetti(parent) {
  const colors = ['#0a8acb','#045283','#f4b41a','#ffffff','#53a9df'];
  for (let i = 0; i < 38; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.cssText = `
      left:${Math.random()*100}%;
      top:${-10 - Math.random()*30}px;
      width:${6 + Math.random()*8}px;
      height:${6 + Math.random()*8}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>0.5?'50%':'2px'};
      animation-duration:${1.2+Math.random()*1.2}s;
      animation-delay:${Math.random()*0.6}s;
    `;
    parent.appendChild(c);
  }
}

// ─── FIREBASE ─────────────────────────────────────────────
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, query,
         orderBy, onSnapshot }             from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo",
  authDomain:        "eplus-center-39.firebaseapp.com",
  projectId:         "eplus-center-39",
  storageBucket:     "eplus-center-39.firebasestorage.app",
  messagingSenderId: "191532732034",
  appId:             "1:191532732034:web:b11449a2f0595db5d02e9b"
};

// تجنب duplicate-app إذا كان Firebase محمّلاً مسبقاً من index.html
const _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const _db  = getFirestore(_app);

// ─── ANNOUNCEMENTS STATE ──────────────────────────────────
let annCurrent   = 0;
let annAutoSlide = null;
let annTotalDocs = 0;

function getSlideDir() { return -1; }

function goToSlide(idx) {
  annCurrent = idx;
  const track = document.getElementById('ann-track');
  if (track) track.style.transform = `translateX(${idx * 100 * getSlideDir()}%)`;
  document.querySelectorAll('.ann-dot').forEach((dot, i) =>
    dot.classList.toggle('active', i === idx));
}

function startAnnAuto() {
  if (annTotalDocs <= 1) return;
  annAutoSlide = setInterval(
    () => goToSlide((annCurrent + 1) % annTotalDocs),
    8000
  );
}
function resetAnnAuto() {
  clearInterval(annAutoSlide);
  startAnnAuto();
}

// ─── FIREBASE LISTENER ────────────────────────────────────
onSnapshot(
  query(collection(_db, 'announcements'), orderBy('createdAt', 'desc')),
  snap => {
    window._annCache = snap.docs
      .map(doc => {
        const d = doc.data();
        return {
          title:     d.title     || '',
          text:      d.text      || '',
          imageUrl:  d.imageUrl  || '',
          createdAt: d.createdAt || null,
          hidden:    d.hidden    || false,
        };
      })
      .filter(d => d.hidden !== true);
    _renderFromData(window._annCache);
  }
);

// ─── RENDER ANNOUNCEMENTS ─────────────────────────────────
function _renderFromData(dataArr) {
  const section = document.getElementById('announcements-section');
  const track   = document.getElementById('ann-track');
  const dotsEl  = document.getElementById('ann-dots');

  if (!dataArr || dataArr.length === 0) {
    section.style.display = 'none';
    clearInterval(annAutoSlide);
    return;
  }

  clearInterval(annAutoSlide);
  annTotalDocs = dataArr.length;
  const savedIndex = (annCurrent < dataArr.length) ? annCurrent : 0;
  annCurrent = savedIndex;

  section.style.display = 'block';
  track.innerHTML  = '';
  dotsEl.innerHTML = '';
  track.style.direction = 'ltr';

  const isRtl = currentLang === 'ar';

  dataArr.forEach((d, i) => {
    const hasImg = d.imageUrl && d.imageUrl.startsWith('https');

    const card = document.createElement('div');
    card.className = hasImg ? 'ann-card has-image' : 'ann-card text-only';
    card.style.direction = isRtl ? 'rtl' : 'ltr';
    card.style.textAlign = isRtl ? 'right' : 'left';

    let dateStr = '';
    if (d.createdAt?.toDate) {
      try {
        dateStr = d.createdAt.toDate().toLocaleDateString(
          isRtl ? 'ar-DZ' : 'en-GB',
          { year:'numeric', month:'long', day:'numeric' }
        );
      } catch(e) { dateStr = ''; }
    }

    card.innerHTML = `
      ${hasImg
        ? `<img class="ann-card-img"
               src="${d.imageUrl}"
               alt="" draggable="false"
               loading="lazy"
               onerror="this.closest('.ann-card').classList.remove('has-image');
                        this.closest('.ann-card').classList.add('text-only');
                        this.remove();">`
        : ''}
      <div class="ann-card-body">
        <div class="ann-card-badge">
          📢 ${isRtl ? 'إعلان' : 'Announcement'}
        </div>
        ${d.title ? `<div class="ann-card-title">${d.title}</div>` : ''}
        ${d.text  ? `<div class="ann-card-text">${d.text}</div>`   : ''}
        ${dateStr ? `<div class="ann-card-date">🗓 ${dateStr}</div>` : ''}
      </div>`;

    track.appendChild(card);

    const img = card.querySelector('.ann-card-img');
    if (img) {
      img.addEventListener('load', () => img.classList.add('loaded'));
      if (img.complete) img.classList.add('loaded');
    }

    const dot = document.createElement('div');
    dot.className = 'ann-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => { goToSlide(i); resetAnnAuto(); });
    dotsEl.appendChild(dot);
  });

  const wrapper = document.querySelector('.ann-track-wrapper');
  wrapper.querySelectorAll('.ann-arrow').forEach(a => a.remove());

  if (dataArr.length > 1) {
    const prev = document.createElement('button');
    prev.className = 'ann-arrow ann-arrow-prev';
    prev.innerHTML = '‹';
    prev.addEventListener('click', () => {
      goToSlide((annCurrent - 1 + dataArr.length) % dataArr.length);
      resetAnnAuto();
    });
    const next = document.createElement('button');
    next.className = 'ann-arrow ann-arrow-next';
    next.innerHTML = '›';
    next.addEventListener('click', () => {
      goToSlide((annCurrent + 1) % dataArr.length);
      resetAnnAuto();
    });
    wrapper.appendChild(prev);
    wrapper.appendChild(next);
  }

  let touchStartX = 0;
  track.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive:true });
  track.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) {
      goToSlide(diff > 0
        ? (annCurrent - 1 + dataArr.length) % dataArr.length
        : (annCurrent + 1) % dataArr.length);
      resetAnnAuto();
    }
  });

  let isDragging = false, dragStartX = 0, dragDelta = 0;
  track.addEventListener('mousedown', e => {
    isDragging = true; dragStartX = e.clientX; dragDelta = 0;
    track.style.transition = 'none';
    track.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    dragDelta = e.clientX - dragStartX;
    track.style.transform =
      `translateX(calc(${annCurrent * 100 * getSlideDir()}% + ${dragDelta}px))`;
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    track.style.transition = '';
    track.style.cursor = '';
    goToSlide(Math.abs(dragDelta) > 60
      ? (dragDelta > 0
          ? (annCurrent - 1 + dataArr.length) % dataArr.length
          : (annCurrent + 1) % dataArr.length)
      : annCurrent);
    resetAnnAuto();
  });

  track.style.transform = `translateX(${savedIndex * 100 * getSlideDir()}%)`;
  document.querySelectorAll('.ann-dot').forEach((dot, i) =>
    dot.classList.toggle('active', i === savedIndex));

  startAnnAuto();
}


// ─── JOIN TEAM ────────────────────────────────────────────
const CLOUDINARY_UPLOAD_URL  = 'https://api.cloudinary.com/v1_1/dac4mwuwe/auto/upload';
const CLOUDINARY_UPLOAD_PRESET = 'epluscenterbackup';
const JOIN_APPS_SCRIPT_URL   = APPS_SCRIPT_URL; // نفس الـ Apps Script أو غيّره

function openJoinModal() {
  document.getElementById('join-modal').classList.add('active');
  document.getElementById('lang-toggle').classList.add('hidden');
  hideLogo();
  document.body.style.overflow = 'hidden';
}

function closeJoinModal() {
  document.getElementById('join-modal').classList.remove('active');
  document.getElementById('join-form').reset();
  document.getElementById('cv-file-name').textContent = '';
  document.getElementById('join-role-fields').style.display = 'none';
  document.getElementById('lang-toggle').classList.remove('hidden');
  showLogo();
  document.body.style.overflow = '';
  // reset role selection
  document.querySelectorAll('input[name="joinRole"]').forEach(r => r.checked = false);
  document.getElementById('join-submit-btn').classList.remove('loading');
}

function closeJoinModalOutside(e) {
  if (e.target === document.getElementById('join-modal')) closeJoinModal();
}

function onJoinRoleChange() {
  const roleFields = document.getElementById('join-role-fields');
  const selected = document.querySelector('input[name="joinRole"]:checked')?.value;
  if (selected) {
    roleFields.style.display = 'block';
    roleFields.classList.remove('field-appear');
    void roleFields.offsetWidth;
    roleFields.classList.add('field-appear');
  } else {
    roleFields.style.display = 'none';
  }
}

function onCvFileChange(input) {
  const file = input.files[0];
  const nameEl = document.getElementById('cv-file-name');
  if (file) {
    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      nameEl.textContent = '⚠️ الملف أكبر من 10MB';
      nameEl.style.color = '#ff6b6b';
      input.value = '';
      return;
    }
    nameEl.textContent = '📎 ' + file.name;
    nameEl.style.color = 'rgba(255,255,255,0.7)';
  } else {
    nameEl.textContent = '';
  }
}

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
}

async function submitJoinForm(e) {
  e.preventDefault();
  const btn = document.getElementById('join-submit-btn');
  btn.classList.add('loading');

  const firstName  = document.getElementById('joinFirstName').value.trim();
  const lastName   = document.getElementById('joinLastName').value.trim();
  const phone      = document.getElementById('joinPhone').value.trim();
  const email      = document.getElementById('joinEmail').value.trim();
  const role       = document.querySelector('input[name="joinRole"]:checked')?.value || '';
  const specialty  = document.getElementById('joinSpecialty').value.trim();
  const experience = document.getElementById('joinExperience').value.trim();
  const cvInput    = document.getElementById('joinCV');
  const cvFile     = cvInput.files[0] || null;

  let cvUrl = '';
  try {
    if (cvFile) {
      cvUrl = await uploadToCloudinary(cvFile);
    }

    const data = {
      type:       'join',
      firstName,
      lastName,
      phone,
      email,
      role,
      specialty,
      experience,
      cvUrl,
      timestamp:  new Date().toISOString(),
    };

    await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });

    btn.classList.remove('loading');
    closeJoinModal();
    showJoinSuccessPopup(role);
  } catch(err) {
    btn.classList.remove('loading');
    console.error(err);
    alert(currentLang === 'ar'
      ? 'حدث خطأ أثناء الإرسال، تحقق من اتصالك بالإنترنت.'
      : 'A network error occurred. Please check your connection.');
  }
}

function showJoinSuccessPopup(role) {
  document.getElementById('success-popup-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'success-popup-overlay';
  overlay.className = 'success-popup-overlay';
  overlay.innerHTML = `
    <div class="success-popup-box" id="success-popup-box">
      <div class="success-popup-icon-wrap">
        <div class="success-popup-ring"></div>
        <div class="success-popup-check">✓</div>
      </div>
      <div class="success-popup-title">🎉 ${currentLang==='ar' ? 'تم إرسال طلبك بنجاح!' : 'Application Submitted!'}</div>
      <div class="success-popup-msg">
        ${currentLang==='ar'
          ? `شكراً لاهتمامك بالانضمام إلى فريق أكاديمية E-PLUS بصفة <strong>${role}</strong>.<br>سيتم مراجعة طلبك والتواصل معك قريباً.<br><span class="success-popup-sub">✦ معاً نبني مستقبل أفضل ✦</span>`
          : `Thank you for your interest in joining E-PLUS Academy as <strong>${role}</strong>.<br>Your application will be reviewed and we'll contact you soon.<br><span class="success-popup-sub">✦ Together we build a better future ✦</span>`}
      </div>
      <div class="success-popup-divider"></div>
      <button class="success-popup-btn" onclick="closeSuccessPopup()">
        ${currentLang==='ar' ? 'حسناً، شكراً!' : 'OK, Thank you!'}
      </button>
    </div>`;
  document.body.appendChild(overlay);
  spawnConfetti(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));
}

// ─── EXPOSE TO WINDOW (مرة واحدة فقط) ───────────────────
window.setLang               = setLang;
window.openModal             = openModal;
window.closeModal            = closeModal;
window.closeModalOutside     = closeModalOutside;
window.resetForm             = resetForm;
window.submitForm            = submitForm;
window.onEduLevelChange      = onEduLevelChange;
window.onCandidateTypeChange = onCandidateTypeChange;
window.onSpecialtyChange     = onSpecialtyChange;
window.onSubjectChange       = onSubjectChange;
window.onTeacherChange       = onTeacherChange;
window.onLangTypeChange      = onLangTypeChange;
window.onLangLevelChange     = onLangLevelChange;
window.onVipTypeChange       = onVipTypeChange;
window.onVipEduLevelChange   = onVipEduLevelChange;
window.onVipStudyModeChange  = onVipStudyModeChange;
window.onVipDaysCountChange  = onVipDaysCountChange;
window.onDayChange           = onDayChange;
window.closeTerms            = closeTerms;
window.closeTermsOutside     = closeTermsOutside;
window.onTermsCheck          = onTermsCheck;
window.proceedToRegister     = proceedToRegister;
window.closeSuccessPopup     = closeSuccessPopup;
window.goToSlide             = goToSlide;
window.resetAnnAuto          = resetAnnAuto;
window.openJoinModal         = openJoinModal;
window.closeJoinModal        = closeJoinModal;
window.closeJoinModalOutside = closeJoinModalOutside;
window.onJoinRoleChange      = onJoinRoleChange;
window.onCvFileChange        = onCvFileChange;
window.submitJoinForm        = submitJoinForm;

// ─── INIT ─────────────────────────────────────────────────
setLang('ar');
