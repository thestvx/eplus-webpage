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

const needsParent        = ['تحضيري','أولى ابتدائي','ثانية ابتدائي','ثالثة ابتدائي','رابعة ابتدائي','خامسة ابتدائي','أولى متوسط','ثانية متوسط','ثالثة متوسط','رابعة متوسط'];
const needsSpecialty     = ['أولى ثانوي','ثانية ثانوي','ثالثة ثانوي (بكالوريا)'];
const needsCandidateType = ['ثالثة ثانوي (بكالوريا)'];

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

// ─── TERMS MODAL ──────────────────────────────────────────
let pendingModalType = null;

function openTerms(type) {
  pendingModalType = type;
  const overlay = document.getElementById('terms-modal');
  const langToggle = document.getElementById('lang-toggle');

  // reset checkbox
  document.getElementById('terms-checkbox').checked = false;
  document.getElementById('terms-check-box').innerHTML = '';
  document.getElementById('terms-proceed-btn').disabled = true;
  document.getElementById('terms-proceed-btn').classList.remove('enabled');

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (langToggle) langToggle.classList.add('hidden');
}

function closeTerms() {
  document.getElementById('terms-modal').classList.remove('active');
  document.body.style.overflow = '';
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.classList.remove('hidden');
  pendingModalType = null;
}

function closeTermsOutside(e) {
  if (e.target === document.getElementById('terms-modal')) closeTerms();
}

function onTermsCheck() {
  const checked = document.getElementById('terms-checkbox').checked;
  const btn = document.getElementById('terms-proceed-btn');
  if (checked) {
    btn.disabled = false;
    btn.classList.add('enabled');
  } else {
    btn.disabled = true;
    btn.classList.remove('enabled');
  }
}

function proceedToRegister() {
  document.getElementById('terms-modal').classList.remove('active');
  if (pendingModalType) openModal(pendingModalType);
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
    successMsg:"تم تسجيل
