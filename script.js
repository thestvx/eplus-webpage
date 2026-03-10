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

// ─── CURRICULUM DATA ──────────────────────────────────────
const curriculum = {
  'تحضيري':                       [],
  'أولى ابتدائي':                  [],
  'ثانية ابتدائي':                 [],
  'ثالثة ابتدائي':                 [],
  'رابعة ابتدائي':                 [],
  'خامسة ابتدائي':                 [],
  'أولى متوسط':                    [],
  'ثانية متوسط':                   [],
  'ثالثة متوسط':                   [],
  'رابعة متوسط': [
    { subject: 'رياضيات',          teachers: ['الأستاذ شامي سهيل'] },
    { subject: 'اللغة الإنجليزية', teachers: ['الأستاذة نصبة فاطمة'] },
    { subject: 'اللغة الفرنسية',   teachers: ['الأستاذة مرغني ريهام'] },
  ],
  'أولى ثانوي':                    [],
  'ثانية ثانوي':                   [],
  'ثالثة ثانوي (بكالوريا)': [
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teachers: ['الأستاذ نمسي عبدالرحمان','الأستاذ لكموتة لمين'] },
    { subject: 'الرياضيات (العلميين)',           teachers: ['الأستاذة ترعة فاطمة','الأستاذ عبدالباسط نعورة'] },
    { subject: 'العلوم الطبيعية والحياة',        teachers: ['الأستاذ صحراوي شكري'] },
    { subject: 'اللغة الإسبانية',               teachers: ['الأستاذ طوالبية ابراهيم'] },
    { subject: 'اللغة الألمانية',               teachers: ['الأستاذ حمزة علالي'] },
    { subject: 'اللغة العربية',                 teachers: ['الأستاذة موساوي زبيدة'] },
    { subject: 'اللغة الفرنسية',                teachers: ['الأستاذة كروش شمس الهدى'] },
    { subject: 'اللغة الإنجليزية',              teachers: ['الأستاذ كرام الصادق'] },
    { subject: 'الفلسفة',                       teachers: ['الأستاذة دادة نجاح سلام'] },
    { subject: 'تاريخ وجغرافيا',                teachers: ['الأستاذ ايمن دخان'] },
  ],
};

// المستويات التي تحتاج ولي أمر (رابعة متوسط وما دون)
const needsParent = [
  'تحضيري',
  'أولى ابتدائي','ثانية ابتدائي','ثالثة ابتدائي','رابعة ابتدائي','خامسة ابتدائي',
  'أولى متوسط','ثانية متوسط','ثالثة متوسط','رابعة متوسط'
];

// ─── EDU LEVEL HANDLER ────────────────────────────────────
function onEduLevelChange() {
  const level       = document.getElementById('eduLevel').value;
  const subGrp      = document.getElementById('subjectGroup');
  const teachGrp    = document.getElementById('teacherGroup');
  const parentGrp   = document.getElementById('parentGroup');
  const subSelect   = document.getElementById('subject');
  const teachSelect = document.getElementById('teacher');
  const parentName  = document.getElementById('parentName');
  const parentPhone = document.getElementById('parentPhone');

  document.getElementById('comingSoonNote')?.remove();

  // إعادة ضبط
  subGrp.style.display    = 'none';
  teachGrp.style.display  = 'none';
  parentGrp.style.display = 'none';
  subSelect.removeAttribute('required');
  teachSelect.removeAttribute('required');
  parentName.removeAttribute('required');
  parentPhone.removeAttribute('required');
  subSelect.value   = '';
  teachSelect.value = '';

  if (!level) return;

  // ولي الأمر
  if (needsParent.includes(level)) {
    parentGrp.style.display = 'block';
    parentGrp.classList.remove('field-appear');
    void parentGrp.offsetWidth;
    parentGrp.classList.add('field-appear');
    parentName.setAttribute('required','required');
    parentPhone.setAttribute('required','required');
  }

  const subjects = curriculum[level] || [];

  if (subjects.length === 0) {
    const note = document.createElement('div');
    note.id = 'comingSoonNote';
    note.className = 'coming-soon-note field-appear';
    note.innerHTML = `<span>🚧</span><span>المواد والأساتذة لهذا المستوى ستُضاف قريباً</span>`;
    document.getElementById('eduLevelGroup').insertAdjacentElement('afterend', note);
    return;
  }

  subSelect.innerHTML = `<option value="">-- اختر المادة --</option>`;
  subjects.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.subject; opt.textContent = item.subject;
    subSelect.appendChild(opt);
  });

  subGrp.style.display = 'block';
  subGrp.classList.remove('field-appear');
  void subGrp.offsetWidth;
  subGrp.classList.add('field-appear');
  subSelect.setAttribute('required','required');
}

function onSubjectChange() {
  const level       = document.getElementById('eduLevel').value;
  const subjectVal  = document.getElementById('subject').value;
  const teachGrp    = document.getElementById('teacherGroup');
  const teachSelect = document.getElementById('teacher');

  teachGrp.style.display = 'none';
  teachSelect.removeAttribute('required');
  teachSelect.value = '';

  if (!subjectVal) return;

  const found = (curriculum[level] || []).find(s => s.subject === subjectVal);
  if (!found || found.teachers.length === 0) return;

  teachSelect.innerHTML = `<option value="">-- اختر الأستاذ/ة --</option>`;
  found.teachers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    teachSelect.appendChild(opt);
  });

  if (found.teachers.length === 1) teachSelect.value = found.teachers[0];

  teachGrp.style.display = 'block';
  teachGrp.classList.remove('field-appear');
  void teachGrp.offsetWidth;
  teachGrp.classList.add('field-appear');
  teachSelect.setAttribute('required','required');
}

// ─── TRANSLATIONS ─────────────────────────────────────────
const translations = {
  ar: {
    badge: "✦ رحلتك نحو النجاح تبدأ من هنا ✦",
    title: "EDUCATION PLUS CENTER",
    subtitle: "التسجيل في الدورات والبرامج التعليمية",
    btn1: "تسجيلات الدعم",
    btn2: "دورات اللغات",
    btn3: "دروس VIP",
    btn4: "اختبار IELTS",
    firstName: "الاسم", lastName: "اللقب",
    birthDate: "تاريخ الميلاد", birthPlace: "مكان الميلاد",
    eduLevel: "المستوى الدراسي", selectEduLevel: "-- اختر المستوى --",
    subject: "المادة", selectSubject: "-- اختر المادة --",
    teacher: "الأستاذ/ة", selectTeacher: "-- اختر الأستاذ/ة --",
    parentInfo: "معلومات ولي الأمر",
    parentName: "اسم ولي الأمر", parentPhone: "هاتف ولي الأمر",
    langLevel: "مستوى اللغة (CEFR)", selectLevel: "-- اختر المستوى --",
    phone: "رقم الهاتف",
    motivation: "ما هو الدافع الذي جعلك تختار أكاديمية E-PLUS؟",
    optional: "(اختياري)",
    submitBtn: "إرسال التسجيل ✦",
    successTitle: "🎉 تم التسجيل بنجاح!",
    successMsg: "تم تسجيل معلوماتك بنجاح،\\nسيتم التواصل معك قريباً.",
    closeBtn: "العودة إلى الصفحة الرئيسية",
    supportTitle: "تسجيلات الدعم",
    langTitle: "تسجيل دورة لغة",
    vipTitle: "تسجيل دروس VIP",
    ieltsTitle: "التسجيل في اختبار IELTS",
    levels: {
      A1:"A1 - مبتدئ", A2:"A2 - مبتدئ متقدم",
      B1:"B1 - متوسط", B2:"B2 - متوسط متقدم",
      C1:"C1 - متقدم", C2:"C2 - احترافي"
    }
  },
  en: {
    badge: "✦ Your journey to success starts here ✦",
    title: "EDUCATION PLUS CENTER",
    subtitle: "Register for Courses & Educational Programs",
    btn1: "Support Registration", btn2: "Language Courses",
    btn3: "VIP Lessons", btn4: "IELTS Test",
    firstName: "First Name", lastName: "Last Name",
    birthDate: "Date of Birth", birthPlace: "Place of Birth",
    eduLevel: "Academic Level", selectEduLevel: "-- Select Level --",
    subject: "Subject", selectSubject: "-- Select Subject --",
    teacher: "Teacher", selectTeacher: "-- Select Teacher --",
    parentInfo: "Parent / Guardian Info",
    parentName: "Parent Name", parentPhone: "Parent Phone",
    langLevel: "Language Level (CEFR)", selectLevel: "-- Select Level --",
    phone: "Phone Number",
    motivation: "What motivated you to choose E-PLUS Academy?",
    optional: "(optional)",
    submitBtn: "Submit Registration ✦",
    successTitle: "🎉 Registered Successfully!",
    successMsg: "Your information has been recorded.\\nWe will contact you soon.",
    closeBtn: "Back to Main Page",
    supportTitle: "Support Registration",
    langTitle: "Language Course Registration",
    vipTitle: "VIP Lessons Registration",
    ieltsTitle: "IELTS Test Registration",
    levels: {
      A1:"A1 - Beginner", A2:"A2 - Elementary",
      B1:"B1 - Intermediate", B2:"B2 - Upper Intermediate",
      C1:"C1 - Advanced", C2:"C2 - Proficiency"
    }
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
    if (t[key]) {
      if (key === 'successMsg') el.innerHTML = t[key].replace('\\n','<br>');
      else el.textContent = t[key];
    }
  });
  document.querySelectorAll('[data-i18n-level]').forEach(el => {
    const level = el.getAttribute('data-i18n-level');
    if (t.levels?.[level]) el.textContent = t.levels[level];
  });
}

// ─── GOOGLE SHEETS ────────────────────────────────────────
const SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL';

// ─── MODAL ────────────────────────────────────────────────
let currentModalType = 'support';

function openModal(type) {
  currentModalType = type;
  const t           = translations[currentLang];
  const overlay     = document.getElementById('modal');
  const langToggle  = document.getElementById('lang-toggle');
  const eduLevelGrp = document.getElementById('eduLevelGroup');
  const parentGrp   = document.getElementById('parentGroup');
  const subGrp      = document.getElementById('subjectGroup');
  const teachGrp    = document.getElementById('teacherGroup');
  const langLevelGrp= document.getElementById('langLevelGroup');
  const langLevelSel= document.getElementById('langLevel');
  const parentName  = document.getElementById('parentName');
  const parentPhone = document.getElementById('parentPhone');

  // العنوان
  const titles = {
    support: t.supportTitle, lang: t.langTitle,
    vip: t.vipTitle, ielts: t.ieltsTitle
  };
  document.getElementById('modal-title').textContent = titles[type] || '';

  // إخفاء كل الحقول الإضافية أولاً
  eduLevelGrp.style.display  = 'none';
  parentGrp.style.display    = 'none';
  subGrp.style.display       = 'none';
  teachGrp.style.display     = 'none';
  langLevelGrp.style.display = 'none';
  langLevelSel.removeAttribute('required');
  parentName.removeAttribute('required');
  parentPhone.removeAttribute('required');
  document.getElementById('comingSoonNote')?.remove();

  // إظهار الحقول حسب النوع
  if (type === 'support') {
    eduLevelGrp.style.display = 'block';
  } else if (type === 'lang' || type === 'ielts') {
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
  const overlay    = document.getElementById('modal');
  const langToggle = document.getElementById('lang-toggle');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  if (langToggle) langToggle.classList.remove('hidden');
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

  const btn = document.querySelector('#form-view .submit-btn');
  btn.classList.add('loading');

  const typeLabels = { support:'دعم', lang:'لغات', vip:'VIP', ielts:'IELTS' };

  const data = {
    timestamp:   new Date().toLocaleString('ar-DZ'),
    type:        typeLabels[currentModalType] || currentModalType,
    firstName:   document.getElementById('firstName').value.trim(),
    lastName:    document.getElementById('lastName').value.trim(),
    birthDate:   document.getElementById('birthDate').value,
    birthPlace:  document.getElementById('birthPlace').value.trim(),
    phone:       document.getElementById('phone').value.trim(),
    eduLevel:    document.getElementById('eduLevel').value    || '-',
    subject:     document.getElementById('subject').value     || '-',
    teacher:     document.getElementById('teacher').value     || '-',
    parentName:  document.getElementById('parentName').value.trim()  || '-',
    parentPhone: document.getElementById('parentPhone').value.trim() || '-',
    langLevel:   document.getElementById('langLevel').value   || '-',
    motivation:  document.getElementById('motivation').value.trim()  || '-',
  };

  try {
    await fetch(SCRIPT_URL, {
      method:'POST', mode:'no-cors',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    });
  } catch(err) {
    console.warn('Sheet error:', err);
  }

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
