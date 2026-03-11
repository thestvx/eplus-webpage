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

// ─── LANGUAGE VALIDATION ──────────────────────────────────
function isArabic(text)  { return /[\u0600-\u06FF]/.test(text); }
function isEnglish(text) { return /[a-zA-Z]/.test(text); }
function validateLang(text) {
  if (!text.trim()) return true;
  if (currentLang === 'ar') return isArabic(text) && !isEnglish(text);
  if (currentLang === 'en') return isEnglish(text) && !isArabic(text);
  return true;
}

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

// ─── DAYS HANDLER ─────────────────────────────────────────
function onDayChange(checkbox) {
  const checked = document.querySelectorAll('input[name="days"]:checked');
  const count   = checked.length;
  if (count > 2) { checkbox.checked = false; return; }
  document.querySelectorAll('.day-card').forEach(card => {
    const inp = card.querySelector('input');
    card.classList.toggle('selected', inp.checked);
    if (!inp.checked && count >= 2) card.classList.add('disabled');
    else card.classList.remove('disabled');
  });
  const countEl = document.getElementById('days-count');
  if (countEl) countEl.textContent = Math.min(count, 2);
  const counter = document.getElementById('days-counter');
  if (counter) counter.classList.toggle('complete', count === 2);
}

function resetDays() {
  document.querySelectorAll('input[name="days"]').forEach(c => c.checked = false);
  document.querySelectorAll('.day-card').forEach(c => c.classList.remove('selected','disabled'));
  const countEl = document.getElementById('days-count');
  if (countEl) countEl.textContent = '0';
  const counter = document.getElementById('days-counter');
  if (counter) counter.classList.remove('complete');
}

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
  hideField(subGrp, 'subject');
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
  if (needsCandidateType.includes(level)) { animateShow(candidateTypeGrp); return; }
  if (needsSpecialty.includes(level))     { showSpecialtyField(level); return; }
  populateSubjects(level);
}

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

function onLangLevelChange() {
  const levelTestGrp = document.getElementById('levelTestGroup');
  const daysGrp      = document.getElementById('daysGroup');
  const val = document.getElementById('langLevel').value;
  if (val) {
    animateShow(levelTestGrp);
    animateShow(daysGrp);
  } else {
    levelTestGrp.style.display = 'none';
    daysGrp.style.display = 'none';
    document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
    resetDays();
  }
}

// ─── TERMS MODAL ──────────────────────────────────────────
let pendingModalType = null;

function openTerms(type) {
  pendingModalType = type;
  document.getElementById('terms-checkbox').checked = false;
  const tcb = document.getElementById('terms-check-box');
  if (tcb) tcb.innerHTML = '';
  const tpb = document.getElementById('terms-proceed-btn');
  if (tpb) { tpb.disabled = true; tpb.classList.remove('enabled'); }
  const tbody = document.querySelector('.terms-body');
  if (tbody) tbody.scrollTop = 0;
  document.getElementById('terms-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.classList.add('hidden');
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
  btn.disabled = !checked;
  btn.classList.toggle('enabled', checked);
}

function proceedToRegister() {
  document.getElementById('terms-modal').classList.remove('active');
  if (pendingModalType) {
    const type = pendingModalType;
    pendingModalType = null;
    openModal(type);
  }
}

// ─── TRANSLATIONS ─────────────────────────────────────────
const translations = {
  ar: {
    badge:"✦ رحلتك نحو النجاح تبدأ من هنا ✦", title:"EDUCATION PLUS CENTER",
    subtitle:"التسجيل في الدورات والبرامج التعليمية",
    btn1:"تسجيلات الدعم", btn2:"دورات اللغات", btn3:"دروس VIP", btn4:"اختبار IELTS", btn5:"دورات أونلاين",
    firstName:"الاسم", lastName:"اللقب", birthDate:"تاريخ الميلاد", birthPlace:"مكان الميلاد",
    eduLevel:"المستوى الدراسي", specialty:"التخصص", subject:"المادة", teacher:"الأستاذ/ة",
    candidateType:"نوع المترشح", enrolled:"متمدرس", freeCandidate:"حر",
    parentInfo:"معلومات ولي الأمر", parentName:"اسم ولي الأمر", parentPhone:"هاتف ولي الأمر",
    langLevel:"مستوى اللغة (CEFR)", levelTest:"هل تريد إجراء اختبار تحديد المستوى؟",
    yes:"نعم", no:"لا", phone:"رقم الهاتف",
    motivation:"ما هو الدافع الذي جعلك تختار أكاديمية E-PLUS؟", optional:"(اختياري)",
    submitBtn:"إرسال التسجيل ✦",
    successTitle:"🎉 تم التسجيل بنجاح!", successMsg:"تم تسجيل معلوماتك بنجاح،<br>سيتم التواصل معك قريباً.",
    closeBtn:"العودة إلى الصفحة الرئيسية",
    supportTitle:"تسجيلات الدعم", langTitle:"تسجيل دورة لغة", vipTitle:"تسجيل دروس VIP",
    ieltsTitle:"التسجيل في اختبار IELTS", onlineTitle:"التسجيل في دورات أونلاين",
    termsTitle:"قوانين وشروط الأكاديمية",
    termsAgree:"لقد قرأت جميع القوانين والشروط وأوافق عليها", termsProceed:"المتابعة للتسجيل ✦",
    duplicateTitle:"⚠️ تسجيل مكرر!", duplicateMsg:"هذا الاسم واللقب مسجلان مسبقاً.<br>يرجى التواصل مع الإدارة إذا كان هناك خطأ.",
    chooseDays:"اختر يومين للحضور في الأسبوع", daysOf:"/2", daysSelected:"يوم محدد",
    langWarn:"يرجى إدخال جميع المعلومات باللغة العربية فقط",
    langError:"يرجى الكتابة بالعربية فقط",
    t1:"يعتبر المتعلم مسجلاً بصفة رسمية بالمركز عند قيامه بتسديد رسوم التسجيل في التاريخ المحدد.",
    t2:"يجب أن يتسم المتعلم بحسن الأخلاق والنظافة والهندام الملائم.",
    t3:"يجب احترام جميع الأفراد في المركز التعليمي، الزملاء، المدرسين والطاقم الإداري.",
    t4:"احترام أوقات الدراسة، وعدم الانصراف دون إذن مسبق.",
    t5:"عدم التغيب عن الحصص إلا لأسباب ضرورية مع إعلام الإدارة مسبقاً.",
    t6:"في حالة الغياب بدون سبب يتم إعلام الولي.",
    t7:"لا يتم تعويض قيمة الحصص عند الغياب المتكرر أو الانقطاع عن الدراسة.",
    t8:"في حالة التوقف عن الدراسة يتم تعويض 80% فقط من القيمة المتبقية.",
    t9:"في حالة الغياب طويل المدى يرجى الاتصال بالإدارة لأجل تسوية الوضعية.",
    t10:"لا يتحمل المركز ضياع أي أغراض ثمينة (نقود، هاتف، مجوهرات...).",
    t11:"يمنع لمس أو تشغيل أدوات وأجهزة التعليم المختلفة دون إذن.",
    t12:"أي عملية إتلاف لتجهيزات المركز تعرض صاحبها للعقوبة وتعويض الخسائر.",
    t13:"في حالة السلوكات غير المقبولة، ينذر الولي كتابياً عند تكرر المخالفة.",
    t14:"الموافقة على نشر صور المتعلم في شبكات التواصل الاجتماعي، ومقاطع الفيديو التربوية الخاصة بالمركز.",
    days:{ sat:'السبت', sun:'الأحد', mon:'الإثنين', tue:'الثلاثاء', wed:'الأربعاء', thu:'الخميس', fri:'الجمعة' },
    levels:{ A1:"A1 - مبتدئ", A2:"A2 - مبتدئ متقدم", B1:"B1 - متوسط", B2:"B2 - متوسط متقدم", C1:"C1 - متقدم", C2:"C2 - احترافي" }
  },
  en: {
    badge:"✦ Your journey to success starts here ✦", title:"EDUCATION PLUS CENTER",
    subtitle:"Register for Courses & Educational Programs",
    btn1:"Support Registration", btn2:"Language Courses", btn3:"VIP Lessons", btn4:"IELTS Test", btn5:"Online Courses",
    firstName:"First Name", lastName:"Last Name", birthDate:"Date of Birth", birthPlace:"Place of Birth",
    eduLevel:"Academic Level", specialty:"Specialty", subject:"Subject", teacher:"Teacher",
    candidateType:"Candidate Type", enrolled:"Enrolled", freeCandidate:"Independent",
    parentInfo:"Parent / Guardian Info", parentName:"Parent Name", parentPhone:"Parent Phone",
    langLevel:"Language Level (CEFR)", levelTest:"Would you like a placement test?",
    yes:"Yes", no:"No", phone:"Phone Number",
    motivation:"What motivated you to choose E-PLUS Academy?", optional:"(optional)",
    submitBtn:"Submit Registration ✦",
    successTitle:"🎉 Registered Successfully!", successMsg:"Your information has been recorded.<br>We will contact you soon.",
    closeBtn:"Back to Main Page",
    supportTitle:"Support Registration", langTitle:"Language Course Registration", vipTitle:"VIP Lessons Registration",
    ieltsTitle:"IELTS Test Registration", onlineTitle:"Online Courses Registration",
    termsTitle:"Academy Terms & Conditions",
    termsAgree:"I have read all the terms and conditions and I agree", termsProceed:"Proceed to Register ✦",
    duplicateTitle:"⚠️ Already Registered!", duplicateMsg:"This name is already registered.<br>Please contact the administration if this is an error.",
    chooseDays:"Choose 2 days per week to attend", daysOf:"/2", daysSelected:"days selected",
    langWarn:"Please enter all information in English only",
    langError:"Please write in English only",
    t1:"The student is officially registered upon payment of registration fees on the specified date.",
    t2:"The student must demonstrate good manners, cleanliness, and appropriate dress.",
    t3:"All individuals at the center must be respected — peers, teachers, and administrative staff.",
    t4:"Study schedules must be respected, and students must not leave without prior permission.",
    t5:"Absences are only permitted for necessary reasons, with prior notification to administration.",
    t6:"In case of absence without reason, the guardian will be notified.",
    t7:"Missed sessions will not be compensated for repeated absences or discontinuation.",
    t8:"In case of discontinuation, only 80% of the remaining value will be refunded.",
    t9:"For long-term absences, please contact the administration to resolve the situation.",
    t10:"The center is not responsible for loss of valuables (money, phone, jewelry...).",
    t11:"Touching or operating educational equipment without permission is prohibited.",
    t12:"Any damage to center equipment will result in penalties and compensation for losses.",
    t13:"For unacceptable behavior, the guardian will be formally warned upon repeated violations.",
    t14:"Consent to publish the student's photos on social media and educational videos of the center.",
    days:{ sat:'Saturday', sun:'Sunday', mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday' },
    levels:{ A1:"A1 - Beginner", A2:"A2 - Elementary", B1:"B1 - Intermediate", B2:"B2 - Upper Intermediate", C1:"C1 - Advanced", C2:"C2 - Proficiency" }
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
  updateLangWarning();
}

function applyTranslations() {
  const t = translations[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) {
      if (['successMsg','duplicateMsg'].includes(key)) el.innerHTML = t[key];
      else el.textContent = t[key];
    }
  });
  document.querySelectorAll('[data-i18n-level]').forEach(el => {
    const lv = el.getAttribute('data-i18n-level');
    if (t.levels?.[lv]) el.textContent = t.levels[lv];
  });
  
