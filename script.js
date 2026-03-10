// ─── SQUARES BACKGROUND ───────────────────────────────────
const canvas = document.getElementById('squares-canvas');
const ctx = canvas.getContext('2d');
let squares = [];
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
    if (Math.abs(sq.opacity - sq.targetOpacity) < 0.01) sq.targetOpacity = Math.random()*0.4;
    sq.opacity += (sq.targetOpacity - sq.opacity) * sq.speed;
    ctx.fillStyle = `rgba(4,130,195,${sq.opacity})`;
    ctx.fillRect(sq.x, sq.y, squareSize, squareSize);
  });
  requestAnimationFrame(animateSquares);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateSquares();

// ─── SPECIALTIES DATA ─────────────────────────────────────
const specialties = {
  'أولى ثانوي': ['علوم تجريبية','آداب ولغات'],
  'ثانية ثانوي': ['علوم تجريبية','تقني رياضي','رياضيات','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية'],
  'ثالثة ثانوي (بكالوريا)': ['علوم تجريبية','تقني رياضي','رياضيات','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية'],
};

// ─── CURRICULUM DATA ──────────────────────────────────────
const curriculum = {
  'تحضيري':[], 'أولى ابتدائي':[], 'ثانية ابتدائي':[],
  'ثالثة ابتدائي':[], 'رابعة ابتدائي':[], 'خامسة ابتدائي':[],
  'أولى متوسط':[], 'ثانية متوسط':[], 'ثالثة متوسط':[],
  'رابعة متوسط': [
    { subject:'رياضيات',          teachers:['الأستاذ شامي سهيل'] },
    { subject:'اللغة الإنجليزية', teachers:['الأستاذة نصبة فاطمة'] },
    { subject:'اللغة الفرنسية',   teachers:['الأستاذة مرغني ريهام'] },
  ],
  'أولى ثانوي|علوم تجريبية':[], 'أولى ثانوي|آداب ولغات':[],
  'ثانية ثانوي|علوم تجريبية':[], 'ثانية ثانوي|تقني رياضي':[],
  'ثانية ثانوي|رياضيات':[], 'ثانية ثانوي|تسيير واقتصاد':[],
  'ثانية ثانوي|آداب وفلسفة':[], 'ثانية ثانوي|لغات أجنبية':[],
  'ثالثة ثانوي (بكالوريا)|علوم تجريبية': [
    { subject:'العلوم الفيزيائية والتكنولوجيا', teachers:['الأستاذ نمسي عبدالرحمان','الأستاذ لكموتة لمين'] },
    { subject:'الرياضيات (العلميين)',           teachers:['الأستاذة ترعة فاطمة','الأستاذ عبدالباسط نعورة'] },
    { subject:'العلوم الطبيعية والحياة',        teachers:['الأستاذ صحراوي شكري'] },
    { subject:'اللغة العربية',                 teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',                teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',              teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',                       teachers:['الأستاذة دادة نجاح سلام'] },
    { subject:'تاريخ وجغرافيا',                teachers:['الأستاذ ايمن دخان'] },
  ],
  'ثالثة ثانوي (بكالوريا)|تقني رياضي': [
    { subject:'العلوم الفيزيائية والتكنولوجيا', teachers:['الأستاذ نمسي عبدالرحمان','الأستاذ لكموتة لمين'] },
    { subject:'الرياضيات (العلميين)',           teachers:['الأستاذة ترعة فاطمة','الأستاذ عبدالباسط نعورة'] },
    { subject:'اللغة العربية',                 teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',                teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',              teachers:['الأستاذ كرام الصادق'] },
  ],
  'ثالثة ثانوي (بكالوريا)|رياضيات': [
    { subject:'العلوم الفيزيائية والتكنولوجيا', teachers:['الأستاذ نمسي عبدالرحمان','الأستاذ لكموتة لمين'] },
    { subject:'الرياضيات (العلميين)',           teachers:['الأستاذة ترعة فاطمة','الأستاذ عبدالباسط نعورة'] },
    { subject:'اللغة العربية',                 teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',                teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية',              teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',                       teachers:['الأستاذة دادة نجاح سلام'] },
  ],
  'ثالثة ثانوي (بكالوريا)|تسيير واقتصاد': [
    { subject:'اللغة العربية',     teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',    teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية', teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',           teachers:['الأستاذة دادة نجاح سلام'] },
    { subject:'تاريخ وجغرافيا',    teachers:['الأستاذ ايمن دخان'] },
  ],
  'ثالثة ثانوي (بكالوريا)|آداب وفلسفة': [
    { subject:'اللغة العربية',     teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',    teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية', teachers:['الأستاذ كرام الصادق'] },
    { subject:'الفلسفة',           teachers:['الأستاذة دادة نجاح سلام'] },
    { subject:'تاريخ وجغرافيا',    teachers:['الأستاذ ايمن دخان'] },
  ],
  'ثالثة ثانوي (بكالوريا)|لغات أجنبية': [
    { subject:'اللغة الإسبانية',   teachers:['الأستاذ طوالبية ابراهيم'] },
    { subject:'اللغة الألمانية',   teachers:['الأستاذ حمزة علالي'] },
    { subject:'اللغة العربية',     teachers:['الأستاذة موساوي زبيدة'] },
    { subject:'اللغة الفرنسية',    teachers:['الأستاذة كروش شمس الهدى'] },
    { subject:'اللغة الإنجليزية', teachers:['الأستاذ كرام الصادق'] },
  ],
};

const needsParent       = ['تحضيري','أولى ابتدائي','ثانية ابتدائي','ثالثة ابتدائي','رابعة ابتدائي','خامسة ابتدائي','أولى متوسط','ثانية متوسط','ثالثة متوسط','رابعة متوسط'];
const needsSpecialty    = ['أولى ثانوي','ثانية ثانوي','ثالثة ثانوي (بكالوريا)'];
const needsCandidateType= ['ثالثة ثانوي (بكالوريا)'];

// ─── HELPERS ──────────────────────────────────────────────
function animateShow(el) {
  el.style.display = 'block';
  el.classList.remove('field-appear');
  void el.offsetWidth;
  el.classList.add('field-appear');
}
function hideField(el, ...ids) {
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
  note.innerHTML = `<span>🚧</span><span>المواد والأساتذة لهذا المستوى والتخصص ستُضاف قريباً</span>`;
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
    const afterEl = specGrp.style.display !== 'none' ? specGrp : eduGrp;
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

// ─── EDU LEVEL HANDLER ────────────────────────────────────
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

  if (needsParent.includes(level)) {
    animateShow(parentGrp);
    parentName.setAttribute('required','required');
    parentPhone.setAttribute('required','required');
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

// ─── CANDIDATE TYPE HANDLER ───────────────────────────────
function onCandidateTypeChange() {
  const level        = document.getElementById('eduLevel').value;
  const specialtyGrp = document.getElementById('specialtyGroup');
  const subGrp       = document.getElementById('subjectGroup');
  const teachGrp     = document.getElementById('teacherGroup');

  document.getElementById('comingSoonNote')?.remove();
  hideField(specialtyGrp, 'specialty');
  hideField(subGrp,       'subject');
  hideField(teachGrp,     'teacher');

  const selected = document.querySelector('input[name="candidateType"]:checked');
  if (!selected) return;

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

// ─── SPECIALTY HANDLER ────────────────────────────────────
function onSpecialtyChange() {
  const level    = document.getElementById('eduLevel').value;
  const spec     = document.getElementById('specialty').value;
  const subGrp   = document.getElementById('subjectGroup');
  const teachGrp = document.getElementById('teacherGroup');

  document.getElementById('comingSoonNote')?.remove();
  hideField(subGrp,   'subject');
  hideField(teachGrp, 'teacher');

  if (!spec) return;
  populateSubjects(`${level}|${spec}`);
}

// ─── SUBJECT HANDLER ──────────────────────────────────────
function onSubjectChange() {
  const level       = document.getElementById('eduLevel').value;
  const spec        = document.getElementById('specialty').value;
  const subjectVal  = document.getElementById('subject').value;
  const teachGrp    = document.getElementById('teacherGroup');
  const teachSelect = document.getElementById('teacher');

  hideField(teachGrp, 'teacher');
  if (!subjectVal) return;

  const key      = spec ? `${level}|${spec}` : level;
  const subjects = curriculum[key] || [];
  const found    = subjects.find(s => s.subject === subjectVal);
  if (!found || found.teachers.length === 0) return;

  teachSelect.innerHTML = `<option value="">-- اختر الأستاذ/ة --</option>`;
  found.teachers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    teachSelect.appendChild(opt);
  });
  if (found.teachers.length === 1) teachSelect.value = found.teachers[0];

  animateShow(teachGrp);
  teachSelect.setAttribute('required','required');
}

// ─── LANG LEVEL HANDLER ───────────────────────────────────
function onLangLevelChange() {
  const levelTestGrp = document.getElementById('levelTestGroup');
  const val = document.getElementById('langLevel').value;
  if (val) {
    animateShow(levelTestGrp);
  } else {
    levelTestGrp.style.display = 'none';
    document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  }
}

// ─── TRANSLATIONS ─────────────────────────────────────────
const translations = {
  ar: {
    badge:"✦ رحلتك نحو النجاح تبدأ من هنا ✦",
    title:"EDUCATION PLUS CENTER",
    subtitle:"التسجيل في الدورات والبرامج التعليمية",
    btn1:"تسجيلات الدعم", btn2:"دورات اللغات",
    btn3:"دروس VIP", btn4:"اختبار IELTS", btn5:"دورات أونلاين",
    firstName:"الاسم", lastName:"اللقب",
    birthDate:"تاريخ الميلاد", birthPlace:"مكان الميلاد",
    eduLevel:"المستوى الدراسي",
    specialty:"التخصص", subject:"المادة", teacher:"الأستاذ/ة",
    candidateType:"نوع المترشح",
    enrolled:"متمدرس", freeCandidate:"حر",
    parentInfo:"معلومات ولي الأمر",
    parentName:"اسم ولي الأمر", parentPhone:"هاتف ولي الأمر",
    langLevel:"مستوى اللغة (CEFR)",
    levelTest:"هل تريد إجراء اختبار تحديد المستوى؟",
    yes:"نعم", no:"لا",
    phone:"رقم الهاتف",
    motivation:"ما هو الدافع الذي جعلك تختار أكاديمية E-PLUS؟",
    optional:"(اختياري)",
    submitBtn:"إرسال التسجيل ✦",
    successTitle:"🎉 تم التسجيل بنجاح!",
    successMsg:"تم تسجيل معلوماتك بنجاح،<br>سيتم التواصل معك قريباً.",
    closeBtn:"العودة إلى الصفحة الرئيسية",
    supportTitle:"تسجيلات الدعم", langTitle:"تسجيل دورة لغة",
    vipTitle:"تسجيل دروس VIP", ieltsTitle:"التسجيل في اختبار IELTS",
    onlineTitle:"التسجيل في دورات أونلاين",
    levels:{ A1:"A1 - مبتدئ",A2:"A2 - مبتدئ متقدم",B1:"B1 - متوسط",B2:"B2 - متوسط متقدم",C1:"C1 - متقدم",C2:"C2 - احترافي" }
  },
  en: {
    badge:"✦ Your journey to success starts here ✦",
    title:"EDUCATION PLUS CENTER",
    subtitle:"Register for Courses & Educational Programs",
    btn1:"Support Registration", btn2:"Language Courses",
    btn3:"VIP Lessons", btn4:"IELTS Test", btn5:"Online Courses",
    firstName:"First Name", lastName:"Last Name",
    birthDate:"Date of Birth", birthPlace:"Place of Birth",
    eduLevel:"Academic Level",
    specialty:"Specialty", subject:"Subject", teacher:"Teacher",
    candidateType:"Candidate Type",
    enrolled:"Enrolled", freeCandidate:"Independent",
    parentInfo:"Parent / Guardian Info",
    parentName:"Parent Name", parentPhone:"Parent Phone",
    langLevel:"Language Level (CEFR)",
    levelTest:"Would you like a placement test?",
    yes:"Yes", no:"No",
    phone:"Phone Number",
    motivation:"What motivated you to choose E-PLUS Academy?",
    optional:"(optional)",
    submitBtn:"Submit Registration ✦",
    successTitle:"🎉 Registered Successfully!",
    successMsg:"Your information has been recorded.<br>We will contact you soon.",
    closeBtn:"Back to Main Page",
    supportTitle:"Support Registration", langTitle:"Language Course Registration",
    vipTitle:"VIP Lessons Registration", ieltsTitle:"IELTS Test Registration",
    onlineTitle:"Online Courses Registration",
    levels:{ A1:"A1 - Beginner",A2:"A2 - Elementary",B1:"B1 - Intermediate",B2:"B2 - Upper Intermediate",C1:"C1 - Advanced",C2:"C2 - Proficiency" }
  }
};

let currentLang = localStorage.getItem('eplus-lang') || 'ar';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('eplus-lang', lang);
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  applyTranslations();
}
function applyTranslations() {
  const t = translations[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) {
      if (key === 'successMsg') el.innerHTML = t[key];
      else el.textContent = t[key];
    }
  });
  document.querySelectorAll('[data-i18n-level]').forEach(el => {
    const lv = el.getAttribute('data-i18n-level');
    if (t.levels?.[lv]) el.textContent = t.levels[lv];
  });
}

// ─── GOOGLE SHEETS ────────────────────────────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxZl2-qMGrY0r_jnVB0yTUkye21bz9ziFViHcKFouFYE6JNW1iILN3OIhVgn9RVjGkWg/exec';

// ─── MODAL ────────────────────────────────────────────────
let currentModalType = 'support';

function openModal(type) {
  currentModalType = type;
  const t              = translations[currentLang];
  const overlay        = document.getElementById('modal');
  const langToggle     = document.getElementById('lang-toggle');
  const eduLevelGrp    = document.getElementById('eduLevelGroup');
  const parentGrp      = document.getElementById('parentGroup');
  const specialtyGrp   = document.getElementById('specialtyGroup');
  const subGrp         = document.getElementById('subjectGroup');
  const teachGrp       = document.getElementById('teacherGroup');
  const langLevelGrp   = document.getElementById('langLevelGroup');
  const langLevelSel   = document.getElementById('langLevel');
  const candidateGrp   = document.getElementById('candidateTypeGroup');
  const levelTestGrp   = document.getElementById('levelTestGroup');
  const parentName     = document.getElementById('parentName');
  const parentPhone    = document.getElementById('parentPhone');

  document.getElementById('modal-title').textContent =
    { support:t.supportTitle, lang:t.langTitle, vip:t.vipTitle, ielts:t.ieltsTitle, online:t.onlineTitle }[type] || '';

  [eduLevelGrp,parentGrp,specialtyGrp,subGrp,teachGrp,langLevelGrp,candidateGrp,levelTestGrp]
    .forEach(el => el.style.display = 'none');

  langLevelSel.removeAttribute('required');
  parentName.removeAttribute('required');
  parentPhone.removeAttribute('required');
  document.querySelectorAll('input[name="candidateType"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  document.getElementById('comingSoonNote')?.remove();

  if (type === 'support') {
    eduLevelGrp.style.display = 'block';
  } else if (type === 'lang') {
    langLevelGrp.style.display = 'block';
    langLevelSel.setAttribute('required','required');
  }

  document.getElementById('form-view').style.display = 'block';
  document.getElementById('success-view').classList.remove('show');
  document.getElementById('reg-form').reset();
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (langToggle) langToggle.classList.add('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.body.style.overflow = '';
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.classList.remove('hidden');
}
function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// ─── FORM SUBMIT ──────────────────────────────────────────
async function submitForm(e) {
  e.preventDefault();
  const inputs = document.getElementById('reg-form').querySelectorAll('[required]');
  let valid = true;
  inputs.forEach(input => {
    input.classList.remove('error');
    if (!input.value.trim()) {
      valid = false;
      input.classList.add('error');
      setTimeout(() => input.classList.remove('error'), 2000);
    }
  });
  if (!valid) return;

  const candidateGrp = document.getElementById('candidateTypeGroup');
  if (candidateGrp.style.display !== 'none') {
    const selected = document.querySelector('input[name="candidateType"]:checked');
    if (!selected) {
      candidateGrp.style.animation = 'none';
      void candidateGrp.offsetWidth;
      candidateGrp.style.animation = 'shake 0.35s ease';
      return;
    }
  }

  const btn = document.querySelector('#form-view .submit-btn');
  btn.classList.add('loading');

  const typeLabels = { support:'دعم', lang:'لغات', vip:'VIP', ielts:'IELTS', online:'أونلاين' };

  const data = {
    timestamp:     new Date().toLocaleString('ar-DZ'),
    type:          typeLabels[currentModalType] || currentModalType,
    firstName:     document.getElementById('firstName').value.trim(),
    lastName:      document.getElementById('lastName').value.trim(),
    birthDate:     document.getElementById('birthDate').value,
    birthPlace:    document.getElementById('birthPlace').value.trim(),
    phone:         document.getElementById('phone').value.trim(),
    eduLevel:      document.getElementById('eduLevel').value      || '-',
    candidateType: document.querySelector('input[name="candidateType"]:checked')?.value || '-',
    specialty:     document.getElementById('specialty').value     || '-',
    subject:       document.getElementById('subject').value       || '-',
    teacher:       document.getElementById('teacher').value       || '-',
    parentName:    document.getElementById('parentName').value.trim()  || '-',
    parentPhone:   document.getElementById('parentPhone').value.trim() || '-',
    langLevel:     document.getElementById('langLevel').value     || '-',
    levelTest:     document.querySelector('input[name="levelTest"]:checked')?.value || '-',
    motivation:    document.getElementById('motivation').value.trim()  || '-',
  };

  try {
    await fetch(SCRIPT_URL, {
      method:'POST', mode:'no-cors',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    });
  } catch(err) { console.warn('Sheet error:', err); }

  btn.classList.remove('loading');
  document.getElementById('form-view').style.display = 'none';
  document.getElementById('success-view').classList.add('show');
  launchConfetti();
}

// ─── CONFETTI ─────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#045283','#0570b0','#0a8acb','#f4b41a','#ffffff','#53a9df'];
  const box = document.getElementById('modal-box');
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'confetti';
      const size = 6 + Math.random()*9;
      c.style.cssText = `
        left:${5+Math.random()*90}%; top:8%;
        width:${size}px; height:${size}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        border-radius:${Math.random()>0.5?'50%':'2px'};
        animation-duration:${1.2+Math.random()*1.2}s;
        animation-timing-function:cubic-bezier(0.25,0.46,0.45,0.94);
      `;
      box.appendChild(c);
      setTimeout(() => c.remove(), 2600);
    }, i*35);
  }
}

// ─── INIT ─────────────────────────────────────────────────
setLang(currentLang);
