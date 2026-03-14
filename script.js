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
    vipStudyMode:'طريقة الدراسة', vipModeInPerson:'🏫 حضوري', vipModeOnline:'💻 أونلاين', vipModeHybrid:'🔀 حضوري وأونلاين (هجين)',
    requiredNote:'⚠️ يُرجى التأكد من تعبئة جميع الحقول الإلزامية قبل إتمام التسجيل. لا يمكن إرسال النموذج إلا بعد استكمال كافة المعلومات المطلوبة.',
    chooseDays:'اختر الأيام', daysSelected:'يوم محدد',
    submitBtn:'إتمام التسجيل ✦',
    termsTitle:'قوانين وشروط المركز',
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
    vipStudyMode:'Study Mode', vipModeInPerson:'🏫 In-Person', vipModeOnline:'💻 Online', vipModeHybrid:'🔀 In-Person & Online (Hybrid)',
    requiredNote:'⚠️ Please ensure all required fields are filled before completing your registration. The form cannot be submitted until all required information is provided.',
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
    'vipDaysCountGroup','daysGroup','vipStudyModeGroup','vipDatePickerGroup',
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

  // reset calendar
  vcalSelectedDate = null;
  if (document.getElementById('vipSelectedDate'))
    document.getElementById('vipSelectedDate').value = '';
  if (document.getElementById('vipSelectedTime'))
    document.getElementById('vipSelectedTime').value = '';
  document.querySelectorAll('input[name="vipTime"]').forEach(r => r.checked = false);
  const disp = document.getElementById('vcal-selected-display');
  if (disp) disp.style.display = 'none';

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
  // week-day-cell support
  document.querySelectorAll('.week-day-cell').forEach(cell => {
    const inp = cell.querySelector('input');
    if (!inp) return;
    cell.classList.toggle('selected', inp.checked);
    if (!inp.checked && count >= maxDaysAllowed) cell.classList.add('disabled');
    else cell.classList.remove('disabled');
  });
  const countEl = document.getElementById('days-count');
  if (countEl) countEl.textContent = Math.min(count, maxDaysAllowed);
  const counter = document.getElementById('days-counter');
  if (counter) counter.classList.toggle('complete', count === maxDaysAllowed);
}

function resetDays() {
  document.querySelectorAll('input[name="days"]').forEach(c => c.checked = false);
  document.querySelectorAll('.day-card').forEach(c => c.classList.remove('selected','disabled'));
  document.querySelectorAll('.week-day-cell').forEach(c => c.classList.remove('selected','disabled'));
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
function onLangTypeChange() {
  const val        = document.getElementById('langType').value;
  const langLvlGrp = document.getElementById('langLevelGroup');
  const levelTestG = document.getElementById('levelTestGroup');
  const smGrp      = document.getElementById('vipStudyModeGroup');
  const dcGrp      = document.getElementById('vipDaysCountGroup');
  const dGrp       = document.getElementById('daysGroup');
  const dpGrp      = document.getElementById('vipDatePickerGroup');

  hideField(langLvlGrp, 'langLevel');
  hideField(levelTestG);
  if (smGrp)  smGrp.style.display  = 'none';
  if (dpGrp)  dpGrp.style.display  = 'none';
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
function onLangLevelChange() {
  const val          = document.getElementById('langLevel').value;
  const levelTestGrp = document.getElementById('levelTestGroup');
  const smGrp        = document.getElementById('vipStudyModeGroup');
  const dcGrp        = document.getElementById('vipDaysCountGroup');
  const dGrp         = document.getElementById('daysGroup');
  const dpGrp        = document.getElementById('vipDatePickerGroup');

  hideField(levelTestGrp);
  if (smGrp)  smGrp.style.display  = 'none';
  if (dpGrp)  dpGrp.style.display  = 'none';
  if (currentModalType === 'vip') {
    if (dcGrp) dcGrp.style.display = 'none';
    if (dGrp)  { dGrp.style.display = 'none'; resetDays(); }
    document.getElementById('vipDaysCount').value = '';
  }
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="vipStudyMode"]').forEach(r => r.checked = false);

  if (!val) return;

  if (currentModalType === 'vip') {
    // VIP لغات → تقويم مباشرة
    animateShow(dpGrp);
    initVipCalendar();
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
function onVipTypeChange() {
  const selected = document.querySelector('input[name="vipType"]:checked')?.value;

  const allGroups = [
    'vipEduLevelGroup','vipDaysCountGroup','professionGroup',
    'daysGroup','langTypeGroup','langLevelGroup',
    'levelTestGroup','vipStudyModeGroup','vipDatePickerGroup'
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
  vcalSelectedDate = null;
  document.querySelectorAll('input[name="vipTime"]').forEach(r => r.checked = false);

  if (selected === 'support') {
    animateShow(document.getElementById('vipEduLevelGroup'));
    document.getElementById('vipEduLevel').setAttribute('required','required');
  } else if (selected === 'lang') {
    // خطوة 1: اختر اللغة
    animateShow(document.getElementById('langTypeGroup'));
    document.getElementById('langType').setAttribute('required','required');
  }
}

// ─── VIP EDU LEVEL ────────────────────────────────────────
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
  animateShow(smGrp);
}

// ─── VIP STUDY MODE ───────────────────────────────────────
function onVipStudyModeChange() {
  const selected = document.querySelector('input[name="vipStudyMode"]:checked')?.value;
  const dcGrp    = document.getElementById('vipDaysCountGroup');
  const dGrp     = document.getElementById('daysGroup');

  if (dcGrp) dcGrp.style.display = 'none';
  if (dGrp)  { dGrp.style.display = 'none'; resetDays(); }
  document.getElementById('vipDaysCount').value = '';

  if (selected) {
    animateShow(dcGrp);
    document.getElementById('vipDaysCount').setAttribute('required','required');
  }
}

// ═══════════════════════════════════════════════════════════
// ─── VIP CALENDAR (للغات VIP فقط) ─────────────────────────
// ═══════════════════════════════════════════════════════════
const AR_MONTHS = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];

let vcalCurrentDate  = new Date();
let vcalSelectedDate = null;
let _vcalInitialized = false;

function initVipCalendar() {
  vcalCurrentDate  = new Date();
  vcalSelectedDate = null;

  const dateInp = document.getElementById('vipSelectedDate');
  const timeInp = document.getElementById('vipSelectedTime');
  if (dateInp) dateInp.value = '';
  if (timeInp) timeInp.value = '';

  const disp = document.getElementById('vcal-selected-display');
  if (disp) disp.style.display = 'none';

  document.querySelectorAll('input[name="vipTime"]').forEach(r => {
    r.checked = false;
    r.addEventListener('change', updateVcalDisplay);
  });

  if (!_vcalInitialized) {
    document.getElementById('vcal-prev').addEventListener('click', () => {
      vcalCurrentDate.setMonth(vcalCurrentDate.getMonth() - 1);
      renderVcal();
    });
    document.getElementById('vcal-next').addEventListener('click', () => {
      vcalCurrentDate.setMonth(vcalCurrentDate.getMonth() + 1);
      renderVcal();
    });
    _vcalInitialized = true;
  }

  renderVcal();
}

function renderVcal() {
  const y = vcalCurrentDate.getFullYear();
  const m = vcalCurrentDate.getMonth();
  const lbl = document.getElementById('vcal-month-label');
  if (lbl) lbl.textContent = `${AR_MONTHS[m]} ${y}`;

  const grid = document.getElementById('vcal-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const firstDay    = new Date(y, m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today       = new Date();
  today.setHours(0,0,0,0);

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'vcal-day vcal-day-empty';
    grid.appendChild(e);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d);
    const div      = document.createElement('div');
    div.className  = 'vcal-day';
    div.textContent = d;

    if (cellDate < today) {
      div.classList.add('vcal-day-past');
    } else {
      if (cellDate.toDateString() === today.toDateString())
        div.classList.add('vcal-day-today');
      if (vcalSelectedDate &&
          cellDate.toDateString() === vcalSelectedDate.toDateString())
        div.classList.add('vcal-day-selected');

      div.addEventListener('click', () => {
        vcalSelectedDate = new Date(y, m, d);
        const dateInp = document.getElementById('vipSelectedDate');
        if (dateInp) dateInp.value = `${d} ${AR_MONTHS[m]} ${y}`;
        renderVcal();
        updateVcalDisplay();
      });
    }
    grid.appendChild(div);
  }
}

function updateVcalDisplay() {
  const dateVal  = document.getElementById('vipSelectedDate')?.value  || '';
  const timeEl   = document.querySelector('input[name="vipTime"]:checked');
  const timeVal  = timeEl ? timeEl.value : '';
  const timeInp  = document.getElementById('vipSelectedTime');
  if (timeInp) timeInp.value = timeVal;

  const display  = document.getElementById('vcal-selected-display');
  const textEl   = document.getElementById('vcal-selected-text');
  if (display && textEl && dateVal) {
    display.style.display = 'flex';
    textEl.textContent = timeVal ? `${dateVal} — ${timeVal}` : dateVal;
  }
}

// ─── JOIN TEAM MODAL ──────────────────────────────────────
function openJoinModal() {
  document.getElementById('join-modal')?.classList.add('active');
  document.body.style.overflow = 'hidden';
  hideLogo();
  document.getElementById('lang-toggle')?.classList.add('hidden');
}

function closeJoinModal() {
  document.getElementById('join-modal')?.classList.remove('active');
  document.body.style.overflow = '';
  showLogo();
  document.getElementById('lang-toggle')?.classList.remove('hidden');
  document.getElementById('join-form')?.reset();
  document.getElementById('join-role-fields').style.display = 'none';
  document.getElementById('cv-file-name').textContent = '';
}

function closeJoinModalOutside(e) {
  if (e.target === document.getElementById('join-modal')) closeJoinModal();
}

function onJoinRoleChange() {
  const fields = document.getElementById('join-role-fields');
  if (fields) animateShow(fields);
}

function onCvFileChange(input) {
  const nameEl = document.getElementById('cv-file-name');
  if (nameEl) nameEl.textContent = input.files[0]?.name || '';
}

async function submitJoinForm(e) {
  e.preventDefault();
  const btn = document.getElementById('join-submit-btn');
  btn.classList.add('loading');
  const data = {
    formType:      'join_team',
    joinFirstName: document.getElementById('joinFirstName').value.trim(),
    joinLastName:  document.getElementById('joinLastName').value.trim(),
    joinPhone:     document.getElementById('joinPhone').value.trim(),
    joinEmail:     document.getElementById('joinEmail').value.trim(),
    joinRole:      document.querySelector('input[name="joinRole"]:checked')?.value || '',
    joinSpecialty: document.getElementById('joinSpecialty')?.value.trim() || '',
    joinExperience:document.getElementById('joinExperience')?.value.trim() || '',
    timestamp:     new Date().toISOString(),
  };
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    btn.classList.remove('loading');
    closeJoinModal();
    alert('✅ تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً.');
  } catch(err) {
    btn.classList.remove('loading');
    alert('حدث خطأ أثناء الإرسال، تحقق من اتصالك بالإنترنت.');
  }
}

// ─── SUBMIT FORM ──────────────────────────────────────────
async function submitForm(e) {
  e.preventDefault();

  const firstName  = document.getElementById('firstName').value.trim();
  const lastName   = document.getElementById('lastName').value.trim();
  const birthDate  = document.getElementById('birthDate').value;
  const phone      = document.getElementById('phone').value.trim();

  let hasError = false;
  [firstName, lastName].forEach((val, i) => {
    const ids = ['firstName','lastName'];
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
    vipSelectedDate: document.getElementById('vipSelectedDate')?.value || '',
    vipSelectedTime: document.getElementById('vipSelectedTime')?.value || '',
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
          ? 'شكراً لك! تم استلام طلب تسجيلك بنجاح.<br>سيتم التواصل معك قريباً من طرف فريق مركز E-PLUS.<br><span class="success-popup-sub">✦ رحلتك نحو النجاح تبدأ من هنا ✦</span>'
          : 'Thank you! Your registration has been received.<br>The E-PLUS Center team will contact you soon.<br><span class="success-popup-sub">✦ Your journey to success starts here ✦</span>'}
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
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

function closeSuccessPopup() {
  const overlay = document.getElementById('success-popup-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  document.body.style.overflow = '';
  document.getElementById('lang-toggle')?.classList.remove('hidden');
  showLogo();
  closeModal();
}

// ─── CONFETTI ─────────────────────────────────────────────
function spawnConfetti(container) {
  const colors = ['#0a8acb','#f0c040','#ffffff','#00e5ff','#ffd700','#00bcd4'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      position:absolute;
      width:${6 + Math.random()*8}px;
      height:${6 + Math.random()*8}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>0.5?'50%':'2px'};
      left:${Math.random()*100}%;
      top:-10px;
      opacity:1;
      pointer-events:none;
      animation: confettiFall ${1.5+Math.random()*2}s ease-in forwards;
      animation-delay:${Math.random()*0.8}s;
    `;
    container.appendChild(piece);
  }
}

// ─── ANNOUNCEMENTS (Firebase) ─────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, Timestamp }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseApp = initializeApp({
  apiKey:            "AIzaSyAMcplfO4veFVLtZZcyqfTJx9NGCit8gjo",
  authDomain:        "eplus-center-39.firebaseapp.com",
  projectId:         "eplus-center-39",
  storageBucket:     "eplus-center-39.firebasestorage.app",
  messagingSenderId: "191532732034",
  appId:             "1:191532732034:web:b11449a2f0595db5d02e9b"
}, 'main');

const db = getFirestore(firebaseApp);

async function loadAnnouncements() {
  try {
    const now = Timestamp.now();
    const q   = query(
      collection(db, 'announcements'),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const docs = [];
    snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
    if (docs.length === 0) return;
    window._annCache = docs;
    _renderFromData(docs);
  } catch(e) {
    console.warn('announcements load failed:', e);
  }
}

function _renderFromData(docs) {
  const section = document.getElementById('announcements-section');
  const track   = document.getElementById('ann-track');
  const dotsEl  = document.getElementById('ann-dots');
  if (!section || !track || !dotsEl) return;

  section.style.display = 'block';
  track.innerHTML   = '';
  dotsEl.innerHTML  = '';

  const t = i18n[currentLang];

  docs.forEach((ann, idx) => {
    const slide = document.createElement('div');
    slide.className = 'ann-slide';
    slide.dataset.index = idx;

    const dateStr = ann.createdAt?.toDate
      ? ann.createdAt.toDate().toLocaleDateString(
          currentLang === 'ar' ? 'ar-DZ' : 'en-GB',
          { year:'numeric', month:'long', day:'numeric' }
        )
      : '';

    const titleText = currentLang === 'en' && ann.titleEn ? ann.titleEn : (ann.title || '');
    const bodyText  = currentLang === 'en' && ann.bodyEn  ? ann.bodyEn  : (ann.body  || '');

    slide.innerHTML = `
      <div class="ann-slide-header">
        <span class="ann-tag">📢 ${t.annTitle || 'إعلانات المركز التعليمي'}</span>
        ${dateStr ? `<span class="ann-date">📅 ${dateStr}</span>` : ''}
      </div>
      <div class="ann-slide-title">${titleText}</div>
      ${bodyText ? `<div class="ann-slide-body">${bodyText}</div>` : ''}
      ${ann.imageUrl ? `<img src="${ann.imageUrl}" class="ann-slide-img" alt="" draggable="false">` : ''}
    `;
    track.appendChild(slide);

    const dot = document.createElement('div');
    dot.className = 'ann-dot' + (idx === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToSlide(idx));
    dotsEl.appendChild(dot);
  });

  if (docs.length > 1) startSlideshow(docs.length);
  else goToSlide(0);
}

let _slideTimer = null;
let _currentSlide = 0;

function goToSlide(idx) {
  const slides = document.querySelectorAll('.ann-slide');
  const dots   = document.querySelectorAll('.ann-dot');
  slides.forEach((s,i) => s.classList.toggle('active', i === idx));
  dots.forEach((d,i)   => d.classList.toggle('active',  i === idx));
  _currentSlide = idx;
}

function startSlideshow(total) {
  clearInterval(_slideTimer);
  goToSlide(0);
  _slideTimer = setInterval(() => {
    goToSlide((_currentSlide + 1) % total);
  }, 5000);
}

loadAnnouncements();
