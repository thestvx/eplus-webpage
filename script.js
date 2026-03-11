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

// ─── GOOGLE APPS SCRIPT URL ───────────────────────────────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyqwCoilqE9X-yqAO8SZ871UjPl7_n-4cuiEeRxJj1pYSHTolxP6-gYETr7b-n-W9FTMQ/exec';

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
window.onDayChange = function(checkbox) {
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
};

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
window.onEduLevelChange = function() {
  const level            = document.getElementById('eduLevel').value;
  const parentGrp        = document.getElementById('parentGroup');
  const specialtyGrp     = document.getElementById('specialtyGroup');
  const subGrp           = document.getElementById('subjectGroup');
  const teachGrp         = document.getElementById('teacherGroup');
  const candidateTypeGrp = document.getElementById('candidateTypeGroup');
  const parentName       = document.getElementById('parentName');
  const parentPhone      = document.getElementById('parentPhone');

  document.getElementById('comingSoonNote')?.remove();
  hideField(parentGrp,    'parentName','parentPhone');
  hideField(specialtyGrp, 'specialty');
  hideField(subGrp,       'subject');
  hideField(teachGrp,     'teacher');
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
};

window.onCandidateTypeChange = function() {
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
};

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

window.onSpecialtyChange = function() {
  const level    = document.getElementById('eduLevel').value;
  const spec     = document.getElementById('specialty').value;
  const subGrp   = document.getElementById('subjectGroup');
  const teachGrp = document.getElementById('teacherGroup');
  document.getElementById('comingSoonNote')?.remove();
  hideField(subGrp,   'subject');
  hideField(teachGrp, 'teacher');
  if (!spec) return;
  populateSubjects(`${level}|${spec}`);
};

window.onSubjectChange = function() {
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
};

window.onLangLevelChange = function() {
  const levelTestGrp = document.getElementById('levelTestGroup');
  const daysGrp      = document.getElementById('daysGroup');
  const val = document.getElementById('langLevel').value;
  if (val) {
    animateShow(levelTestGrp);
    animateShow(daysGrp);
  } else {
    levelTestGrp.style.display = 'none';
    daysGrp.style.display      = 'none';
    document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
    resetDays();
  }
};

// ─── TERMS MODAL ──────────────────────────────────────────
let pendingModalType   = null;
let termsTimerInterval = null;
const TERMS_WAIT_SECONDS = 180;

window.openTerms = function(type) {
  pendingModalType = type;
  const checkbox = document.getElementById('terms-checkbox');
  checkbox.checked  = false;
  checkbox.disabled = true;
  const tcb = document.getElementById('terms-check-box');
  if (tcb) tcb.innerHTML = '';
  const label = document.getElementById('terms-agree-label');
  if (label) { label.classList.add('locked'); label.classList.remove('unlocked'); }
  const tpb = document.getElementById('terms-proceed-btn');
  if (tpb) { tpb.disabled = true; tpb.classList.remove('enabled'); }
  const tbody = document.querySelector('.terms-body');
  if (tbody) tbody.scrollTop = 0;
  showTermsTimer(TERMS_WAIT_SECONDS);
  document.getElementById('terms-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.classList.add('hidden');
};

function showTermsTimer(seconds) {
  clearInterval(termsTimerInterval);
  let remaining = seconds;
  let timerEl = document.getElementById('terms-timer');
  if (!timerEl) {
    timerEl = document.createElement('div');
    timerEl.id = 'terms-timer';
    timerEl.className = 'terms-timer';
    const footer = document.querySelector('.terms-footer');
    footer.insertBefore(timerEl, footer.firstChild);
  }
  timerEl.style.display = 'flex';

  function updateTimer() {
    const m = String(Math.floor(remaining / 60)).padStart(2,'0');
    const s = String(remaining % 60).padStart(2,'0');
    timerEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="timer-icon">⏱</span>
        <span class="timer-text">
          ${currentLang === 'ar'
            ? `يرجى قراءة القوانين كاملاً — يمكنك الموافقة بعد <strong>${m}:${s}</strong>`
            : `Please read all terms — you can agree after <strong>${m}:${s}</strong>`
          }
        </span>
      </div>
      <div class="timer-bar-wrap"><div class="timer-bar" id="timer-bar"></div></div>
    `;
    const pct = ((seconds - remaining) / seconds) * 100;
    const bar = document.getElementById('timer-bar');
    if (bar) bar.style.width = pct + '%';
  }

  updateTimer();
  termsTimerInterval = setInterval(() => {
    remaining--;
    updateTimer();
    if (remaining <= 0) {
      clearInterval(termsTimerInterval);
      timerEl.style.display = 'none';
      const checkbox = document.getElementById('terms-checkbox');
      checkbox.disabled = false;
      const label = document.getElementById('terms-agree-label');
      if (label) { label.classList.remove('locked'); label.classList.add('unlocked'); }
    }
  }, 1000);
}

window.closeTerms = function() {
  clearInterval(termsTimerInterval);
  document.getElementById('terms-modal').classList.remove('active');
  document.body.style.overflow = '';
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.classList.remove('hidden');
  pendingModalType = null;
  const timerEl = document.getElementById('terms-timer');
  if (timerEl) timerEl.remove();
};

window.closeTermsOutside = function(e) {
  if (e.target === document.getElementById('terms-modal')) window.closeTerms();
};

window.onTermsCheck = function() {
  const checkbox = document.getElementById('terms-checkbox');
  if (checkbox.disabled) return;
  const checked = checkbox.checked;
  const btn = document.getElementById('terms-proceed-btn');
  btn.disabled = !checked;
  btn.classList.toggle('enabled', checked);
};

window.proceedToRegister = function() {
  clearInterval(termsTimerInterval);
  document.getElementById('terms-modal').classList.remove('active');
  if (pendingModalType) {
    const type = pendingModalType;
    pendingModalType = null;
    window.openModal(type);
  }
};

// ─── TRANSLATIONS ─────────────────────────────────────────
const translations = {
  ar: {
    badge:"✦ رحلتك نحو النجاح تبدأ من هنا ✦", title:"EDUCATION PLUS CENTER",
    subtitle:"التسجيل في الدورات والبرامج التعليمية",
    btn1:"تسجيلات الدعم", btn2:"دورات اللغات", btn3:"دروس VIP",
    btn4:"اختبار IELTS", btn5:"دورات أونلاين",
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
    termsAgree:"لقد قرأت جميع القوانين والشروط وأوافق عليها",
    termsProceed:"المتابعة للتسجيل ✦",
    duplicateTitle:"⚠️ تسجيل مكرر!",
    duplicateMsg:"هذا الاسم واللقب مسجلان مسبقاً.<br>يرجى التواصل مع الإدارة إذا كان هناك خطأ.",
    chooseDays:"اختر يومين للحضور في الأسبوع", daysOf:"/2", daysSelected:"يوم محدد",
    langWarn:"يرجى إدخال جميع المعلومات باللغة العربية فقط",
    langError:"يرجى الكتابة بالعربية فقط", annTitle:"إعلانات الأكاديمية",
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
  },
  en: {
    badge:"✦ Your Journey to Success Starts Here ✦", title:"EDUCATION PLUS CENTER",
    subtitle:"Register for Courses and Educational Programs",
    btn1:"Support Registration", btn2:"Language Courses", btn3:"VIP Lessons",
    btn4:"IELTS Test", btn5:"Online Courses",
    firstName:"First Name", lastName:"Last Name", birthDate:"Date of Birth", birthPlace:"Place of Birth",
    eduLevel:"Academic Level", specialty:"Specialty", subject:"Subject", teacher:"Teacher",
    candidateType:"Candidate Type", enrolled:"Enrolled", freeCandidate:"Independent",
    parentInfo:"Guardian Information", parentName:"Guardian Name", parentPhone:"Guardian Phone",
    langLevel:"Language Level (CEFR)", levelTest:"Do you want a placement test?",
    yes:"Yes", no:"No", phone:"Phone Number",
    motivation:"What motivated you to choose E-PLUS Academy?", optional:"(optional)",
    submitBtn:"Submit Registration ✦",
    successTitle:"🎉 Registration Successful!", successMsg:"Your information has been registered,<br>we will contact you soon.",
    closeBtn:"Return to Home Page",
    supportTitle:"Support Registration", langTitle:"Language Course Registration",
    vipTitle:"VIP Lessons Registration", ieltsTitle:"IELTS Test Registration",
    onlineTitle:"Online Courses Registration",
    termsTitle:"Academy Terms & Conditions",
    termsAgree:"I have read all terms and conditions and agree",
    termsProceed:"Proceed to Registration ✦",
    duplicateTitle:"⚠️ Duplicate Registration!",
    duplicateMsg:"This name is already registered.<br>Please contact administration if this is an error.",
    chooseDays:"Choose two days per week", daysOf:"/2", daysSelected:"days selected",
    langWarn:"Please enter all information in English only",
    langError:"Please write in English only", annTitle:"Academy Announcements",
    t1:"The learner is officially registered at the center upon payment of registration fees on the specified date.",
    t2:"The learner must demonstrate good conduct, cleanliness and appropriate dress.",
    t3:"All individuals at the educational center must be respected — colleagues, teachers and administrative staff.",
    t4:"Respect study times and do not leave without prior permission.",
    t5:"Do not miss classes except for necessary reasons with prior notification to administration.",
    t6:"In case of absence without reason, the guardian will be notified.",
    t7:"Class fees will not be compensated for repeated absences or discontinuation of study.",
    t8:"In case of stopping studies, only 80% of the remaining value will be compensated.",
    t9:"In case of long-term absence, please contact administration to settle the situation.",
    t10:"The center is not responsible for loss of any valuables (money, phone, jewelry...).",
    t11:"Touching or operating educational tools and equipment without permission is prohibited.",
    t12:"Any damage to center equipment will subject the perpetrator to punishment and compensation for losses.",
    t13:"In case of unacceptable behavior, the guardian will be formally notified upon repeated violation.",
    t14:"Agreement to publish the learner's photos on social media networks and educational videos of the center.",
  }
};

let currentLang = localStorage.getItem('lang') || 'ar';

window.setLang = function(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  const t = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.innerHTML = t[key];
  });
  const warnIcon = document.getElementById('lang-warning-icon');
  const warnText = document.getElementById('lang-warning-text');
  if (warnIcon) warnIcon.textContent = lang === 'ar' ? '🇸🇦' : '🇬🇧';
  if (warnText) warnText.textContent = t.langWarn;
  document.querySelectorAll('[data-i18n-level]').forEach(el => {
    const lv = el.getAttribute('data-i18n-level');
    const levelNames = {
      ar:{ A1:'A1 - مبتدئ', A2:'A2 - مبتدئ متقدم', B1:'B1 - متوسط', B2:'B2 - متوسط متقدم', C1:'C1 - متقدم', C2:'C2 - احترافي' },
      en:{ A1:'A1 - Beginner', A2:'A2 - Elementary', B1:'B1 - Intermediate', B2:'B2 - Upper Intermediate', C1:'C1 - Advanced', C2:'C2 - Proficient' }
    };
    if (levelNames[lang]?.[lv]) el.textContent = levelNames[lang][lv];
  });
  const dayNames = {
    ar:{ sat:'السبت', sun:'الأحد', mon:'الإثنين', tue:'الثلاثاء', wed:'الأربعاء', thu:'الخميس', fri:'الجمعة' },
    en:{ sat:'Saturday', sun:'Sunday', mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday' }
  };
  const daySubNames = {
    ar:{ sat:'SAT', sun:'SUN', mon:'MON', tue:'TUE', wed:'WED', thu:'THU', fri:'FRI' },
    en:{ sat:'SAT', sun:'SUN', mon:'MON', tue:'TUE', wed:'WED', thu:'THU', fri:'FRI' }
  };
  document.querySelectorAll('[data-i18n-day]').forEach(el => {
    const key = el.getAttribute('data-i18n-day');
    if (dayNames[lang]?.[key]) el.textContent = dayNames[lang][key];
  });
  document.querySelectorAll('[data-i18n-day-sub]').forEach(el => {
    const key = el.getAttribute('data-i18n-day-sub');
    if (daySubNames[lang]?.[key]) el.textContent = daySubNames[lang][key];
  });
};

// ─── MODAL ────────────────────────────────────────────────
const modalTitles = {
  support:{ ar:'تسجيلات الدعم',               en:'Support Registration' },
  lang:   { ar:'تسجيل دورة لغة',              en:'Language Course Registration' },
  vip:    { ar:'تسجيل دروس VIP',              en:'VIP Lessons Registration' },
  ielts:  { ar:'التسجيل في اختبار IELTS',      en:'IELTS Test Registration' },
  online: { ar:'التسجيل في دورات أونلاين',     en:'Online Courses Registration' },
};

let currentModalType = null;

window.openModal = function(type) {
  currentModalType = type;
  const titleEl = document.getElementById('modal-title');
  if (titleEl) titleEl.textContent = modalTitles[type]?.[currentLang] || type;

  const eduGrp       = document.getElementById('eduLevelGroup');
  const langLvlGrp   = document.getElementById('langLevelGroup');
  const daysGrp      = document.getElementById('daysGroup');
  const levelTestGrp = document.getElementById('levelTestGroup');
  const subGrp       = document.getElementById('subjectGroup');
  const teachGrp     = document.getElementById('teacherGroup');
  const specialtyGrp = document.getElementById('specialtyGroup');
  const candidateGrp = document.getElementById('candidateTypeGroup');
  const parentGrp    = document.getElementById('parentGroup');

  [eduGrp, langLvlGrp, daysGrp, levelTestGrp, subGrp, teachGrp, specialtyGrp, candidateGrp, parentGrp]
    .forEach(el => { if (el) el.style.display = 'none'; });
  document.getElementById('comingSoonNote')?.remove();
  document.querySelectorAll('input[name="candidateType"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  resetDays();

  if (type === 'support') { if (eduGrp)     animateShow(eduGrp); }
  if (type === 'lang')    { if (langLvlGrp) animateShow(langLvlGrp); }
  if (type === 'vip')     { if (eduGrp)     animateShow(eduGrp); }
  if (type === 'ielts')   { if (daysGrp)    animateShow(daysGrp); }
  if (type === 'online')  { if (langLvlGrp) animateShow(langLvlGrp); }

  document.getElementById('form-view').style.display = 'block';
  document.getElementById('success-view').classList.remove('show');
  document.getElementById('duplicate-view').classList.remove('show');
  document.getElementById('reg-form').reset();

  document.getElementById('modal').classList.add('active');
  document.body.style.overflow = 'hidden';
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.classList.add('hidden');
};

window.closeModal = function() {
  document.getElementById('modal').classList.remove('active');
  document.body.style.overflow = '';
  currentModalType = null;
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.classList.remove('hidden');
};

window.closeModalOutside = function(e) {
  if (e.target === document.getElementById('modal')) window.closeModal();
};

// ─── FORM SUBMIT ──────────────────────────────────────────
window.submitForm = async function(e) {
  e.preventDefault();
  const btn = document.querySelector('#reg-form .submit-btn');

  const firstName  = document.getElementById('firstName').value.trim();
  const lastName   = document.getElementById('lastName').value.trim();
  const birthDate  = document.getElementById('birthDate').value;
  const birthPlace = document.getElementById('birthPlace').value.trim();
  const phone      = document.getElementById('phone').value.trim();

  const textFields = [
    { el: document.getElementById('firstName'),  val: firstName },
    { el: document.getElementById('lastName'),   val: lastName },
    { el: document.getElementById('birthPlace'), val: birthPlace },
  ];
  let langError = false;
  textFields.forEach(f => {
    if (f.val && !validateLang(f.val)) {
      f.el.classList.add('error');
      setTimeout(() => f.el.classList.remove('error'), 1500);
      langError = true;
    }
  });
  if (langError) return;

  const required = document.querySelectorAll('#reg-form [required]');
  let valid = true;
  required.forEach(field => {
    if (!field.value.trim()) {
      field.classList.add('error');
      setTimeout(() => field.classList.remove('error'), 1500);
      valid = false;
    }
  });
  if (!valid) return;

  btn.classList.add('loading');

  const data = {
    firstName, lastName, birthDate, birthPlace, phone,
    type:       currentModalType,
    lang:       currentLang,
    motivation: document.getElementById('motivation').value.trim(),
    timestamp:  new Date().toISOString(),
  };

  if (currentModalType === 'support' || currentModalType === 'vip') {
    data.eduLevel = document.getElementById('eduLevel').value;
    const spec  = document.getElementById('specialty');
    if (spec && spec.value)   data.specialty    = spec.value;
    const subj  = document.getElementById('subject');
    if (subj && subj.value)   data.subject      = subj.value;
    const teach = document.getElementById('teacher');
    if (teach && teach.value) data.teacher      = teach.value;
    const ctype = document.querySelector('input[name="candidateType"]:checked');
    if (ctype) data.candidateType = ctype.value;
    const pName  = document.getElementById('parentName');
    const pPhone = document.getElementById('parentPhone');
    if (pName?.value)  data.parentName  = pName.value.trim();
    if (pPhone?.value) data.parentPhone = pPhone.value.trim();
  }
  if (currentModalType === 'lang' || currentModalType === 'online') {
    data.langLevel = document.getElementById('langLevel').value;
    const lt = document.querySelector('input[name="levelTest"]:checked');
    if (lt) data.levelTest = lt.value;
    const days = [...document.querySelectorAll('input[name="days"]:checked')].map(d => d.value);
    if (days.length) data.days = days.join('، ');
  }
  if (currentModalType === 'ielts') {
    const days = [...document.querySelectorAll('input[name="days"]:checked')].map(d => d.value);
    if (days.length) data.days = days.join('، ');
  }

  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js");
    const { getFirestore, collection, addDoc, query, where, getDocs }
      = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");

    const firebaseConfig = {
      apiKey:            "AIzaSyCtb6RPW5sq5zK5JMmTYlBFEnQQZfVoI7s",
      authDomain:        "epluscenter-panel.firebaseapp.com",
      projectId:         "epluscenter-panel",
      storageBucket:     "epluscenter-panel.firebasestorage.app",
      messagingSenderId: "1000462675381",
      appId:             "1:1000462675381:web:b2156128337f7c11c17dfc"
    };

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const db  = getFirestore(app);

    // ── فحص التكرار ──
    const dupQ = query(
      collection(db, 'registrations'),
      where('firstName', '==', firstName),
      where('lastName',  '==', lastName),
      where('type',      '==', currentModalType)
    );
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      btn.classList.remove('loading');
      document.getElementById('form-view').style.display = 'none';
      document.getElementById('duplicate-view').classList.add('show');
      return;
    }

    // ── حفظ في Firebase ──
    await addDoc(collection(db, 'registrations'), data);

    // ── إرسال لـ Google Sheets ──
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});

    btn.classList.remove('loading');
    document.getElementById('form-view').style.display = 'none';
    document.getElementById('success-view').classList.add('show');
    launchConfetti();

  } catch(err) {
    btn.classList.remove('loading');
    alert('حدث خطأ أثناء الإرسال: ' + err.message);
  }
};

// ─── CONFETTI ─────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#045283','#0a8acb','#f4b41a','#ffffff','#53a9df'];
  const box = document.getElementById('modal-box');
  for (let i = 0; i < 38; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.cssText = `
      left:${Math.random()*100}%;top:${20+Math.random()*30}%;
      width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>0.5?'50%':'3px'};
      animation-duration:${0.9+Math.random()*0.8}s;
      animation-delay:${Math.random()*0.4}s;
    `;
    box.appendChild(c);
    setTimeout(() => c.remove(), 2200);
  }
}

// ─── ANNOUNCEMENTS (FIREBASE) ─────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCtb6RPW5sq5zK5JMmTYlBFEnQQZfVoI7s",
  authDomain:        "epluscenter-panel.firebaseapp.com",
  projectId:         "epluscenter-panel",
  storageBucket:     "epluscenter-panel.firebasestorage.app",
  messagingSenderId: "1000462675381",
  appId:             "1:1000462675381:web:b2156128337f7c11c17dfc"
};

const _app = initializeApp(firebaseConfig);
const _db  = getFirestore(_app);

function renderAnnouncements(docs) {
  const section = document.getElementById('announcements-section');
  const track   = document.getElementById('ann-track');
  const dotsEl  = document.getElementById('ann-dots');
  if (!docs.length) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  track.innerHTML  = '';
  dotsEl.innerHTML = '';
  let current  = 0;
  let autoSlide;

  docs.forEach((doc, i) => {
    const d = doc.data();
    const card = document.createElement('div');
    card.className = d.imageUrl ? 'ann-card has-image' : 'ann-card text-only';
    const dateStr = d.createdAt?.toDate
      ? d.createdAt.toDate().toLocaleDateString('ar-DZ',{ year:'numeric', month:'long', day:'numeric' })
      : '';
    card.innerHTML = `
      ${d.imageUrl ? `<img class="ann-card-img" src="${d.imageUrl}" alt="${d.title||''}">` : ''}
      <div class="ann-card-body">
        <div class="ann-card-badge">📢 إعلان</div>
        ${d.title ? `<div class="ann-card-title">${d.title}</div>` : ''}
        ${d.text  ? `<div class="ann-card-text">${d.text}</div>`   : ''}
        ${dateStr ? `<div class="ann-card-date">🗓 ${dateStr}</div>` : ''}
      </div>`;
    track.appendChild(card);

    const dot = document.createElement('div');
    dot.className = 'ann-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => { goToSlide(i); resetAutoSlide(); };
    dotsEl.appendChild(dot);
  });

  // ── أزرار السهم ──
  const wrapper = document.querySelector('.ann-track-wrapper');
  wrapper.querySelectorAll('.ann-arrow').forEach(a => a.remove());

  if (docs.length > 1) {
    const btnPrev = document.createElement('button');
    btnPrev.className = 'ann-arrow ann-arrow-prev';
    btnPrev.innerHTML = '‹';
    btnPrev.onclick = () => { goToSlide((current - 1 + docs.length) % docs.length); resetAutoSlide(); };

    const btnNext = document.createElement('button');
    btnNext.className = 'ann-arrow ann-arrow-next';
    btnNext.innerHTML = '›';
    btnNext.onclick = () => { goToSlide((current + 1) % docs.length); resetAutoSlide(); };

    wrapper.appendChild(btnPrev);
    wrapper.appendChild(btnNext);
  }

  // ── Swipe موبايل ──
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive:true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goToSlide(diff > 0
        ? (current + 1) % docs.length
        : (current - 1 + docs.length) % docs.length
      );
      resetAutoSlide();
    }
  });

  function goToSlide(idx) {
    current = idx;
    track.style.transform = `translateX(${idx * 100}%)`;
    document.querySelectorAll('.ann-dot').forEach((d, i) =>
      d.classList.toggle('active', i === idx));
  }

  function startAutoSlide() {
    if (docs.length <= 1) return;
    autoSlide = setInterval(() => goToSlide((current + 1) % docs.length), 8000);
  }

  function resetAutoSlide() {
    clearInterval(autoSlide);
    startAutoSlide();
  }

  startAutoSlide();
}

const annQuery = query(collection(_db, 'announcements'), orderBy('createdAt', 'desc'));
onSnapshot(annQuery, snap => renderAnnouncements(snap.docs));

// ─── INIT ─────────────────────────────────────────────────
setLang(currentLang);
