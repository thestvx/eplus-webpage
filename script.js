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
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJkfl-ACAU-Fgi1UDLi04j61Uo81vkh5ohv5xzNl-0rSclyYU_QrCG5exv6o5Cqm557w/exec';

const typeLabelsAr = {
  support: 'تسجيلات الدعم',
  lang:    'دورات اللغات',
  vip:     'دروس VIP',
  ielts:   'اختبار IELTS',
  online:  'دورات أونلاين',
  takwini: 'دورات تكوينية',
};

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
function onLangTypeChange() {
  const val        = document.getElementById('langType').value;
  const langLvlGrp = document.getElementById('langLevelGroup');
  const levelTestG = document.getElementById('levelTestGroup');
  hideField(langLvlGrp, 'langLevel');
  hideField(levelTestG);
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  if (val) {
    animateShow(langLvlGrp);
    langLvlGrp.querySelector('select')?.setAttribute('required','required');
  }
}

function onLangLevelChange() {
  const val          = document.getElementById('langLevel').value;
  const levelTestGrp = document.getElementById('levelTestGroup');
  if (val) animateShow(levelTestGrp);
  else {
    levelTestGrp.style.display = 'none';
    document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  }
}

// ─── EDU LEVEL (دعم) ──────────────────────────────────────
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

// ─── VIP EDU LEVEL ────────────────────────────────────────
function onVipEduLevelChange() {
  const level        = document.getElementById('vipEduLevel').value;
  const profGrp      = document.getElementById('professionGroup');
  const profInput    = document.getElementById('profession');
  const daysCountGrp = document.getElementById('vipDaysCountGroup');
  const daysGrp      = document.getElementById('daysGroup');

  hideField(profGrp, 'profession');
  hideField(daysCountGrp);
  hideField(daysGrp);
  resetDays();
  document.getElementById('vipDaysCount').value = '';

  if (!level) return;
  if (level === 'المرحلة الجامعية') {
    animateShow(profGrp);
    profInput.setAttribute('required','required');
  }
  animateShow(daysCountGrp);
  document.getElementById('vipDaysCount').setAttribute('required','required');
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
      <div class="success-popup-academy">
        <img src="images/eplus-logo.png" alt="E-PLUS" draggable="false">
      </div>
      <h2 class="success-popup-title">
        ${currentLang === 'ar' ? '🎉 تم استلام تسجيلك بنجاح' : '🎉 Registration Received Successfully'}
      </h2>
      <p class="success-popup-msg">
        ${currentLang === 'ar'
          ? `شكراً لك على الانضمام إلى <strong>أكاديمية E-PLUS</strong>،<br>
             لقد وصلنا طلب تسجيلك وسيتم التواصل معك في أقرب وقت ممكن.<br>
             <span class="success-popup-sub">✦ رحلتك نحو النجاح تبدأ من هنا ✦</span>`
          : `Thank you for joining <strong>E-PLUS Academy</strong>.<br>
             Your registration has been received and we will contact you soon.<br>
             <span class="success-popup-sub">✦ Your journey to success starts here ✦</span>`}
      </p>
      <div class="success-popup-divider"></div>
      <div class="success-popup-info">
        <span>📞 0676431474</span>
        <span>📍 ${currentLang === 'ar' ? 'قمار، الوادي' : 'Guemar, El Oued'}</span>
      </div>
      <button class="success-popup-btn" onclick="closeSuccessPopup()">
        ${currentLang === 'ar' ? 'العودة إلى الصفحة الرئيسية' : 'Back to Home'}
      </button>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  document.getElementById('lang-toggle')?.classList.add('hidden');
  launchConfetti(document.getElementById('success-popup-box'));
  requestAnimationFrame(() => overlay.classList.add('active'));
}

function closeSuccessPopup() {
  const overlay = document.getElementById('success-popup-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 350);
  }
  document.body.style.overflow = '';
  document.getElementById('lang-toggle')?.classList.remove('hidden');
  closeModal();
}

// ─── TRANSLATIONS ─────────────────────────────────────────
const translations = {
  ar: {
    badge:"✦ رحلتك نحو النجاح تبدأ من هنا ✦",
    title:"EDUCATION PLUS CENTER",
    subtitle:"التسجيل في الدورات والبرامج التعليمية",
    btn1:"تسجيلات الدعم", btn2:"دورات اللغات", btn3:"دروس VIP",
    btn4:"اختبار IELTS",  btn5:"دورات أونلاين", btn6:"دورات تكوينية",
    firstName:"الاسم", lastName:"اللقب", birthDate:"تاريخ الميلاد",
    birthPlace:"العنوان", langType:"اختر اللغة",
    eduLevel:"المستوى الدراسي", specialty:"التخصص",
    subject:"المادة", teacher:"الأستاذ/ة",
    candidateType:"نوع المترشح", enrolled:"متمدرس", freeCandidate:"حر",
    parentInfo:"معلومات ولي الأمر", parentName:"اسم ولي الأمر", parentPhone:"هاتف ولي الأمر",
    langLevel:"مستوى اللغة (CEFR)",
    levelTest:"هل تريد إجراء اختبار تحديد المستوى؟",
    yes:"نعم", no:"لا", phone:"رقم الهاتف",
    motivation:"ما هو الدافع الذي جعلك تختار أكاديمية E-PLUS؟",
    optional:"(اختياري)",
    submitBtn:"إتمام التسجيل ✦",
    termsTitle:"قوانين وشروط الأكاديمية",
    termsAgree:"لقد قرأت جميع القوانين والشروط وأوافق عليها",
    termsProceed:"تأكيد التسجيل ✦",
    closeBtn:"العودة إلى الصفحة الرئيسية",
    chooseDays:"اختر الأيام", daysOf:"/2", daysSelected:"يوم محدد",
    langWarn:"يرجى إدخال جميع المعلومات باللغة العربية فقط",
    annTitle:"إعلانات الأكاديمية",
    vipDaysCount:"كم يوم تريد الحضور في الأسبوع؟",
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
    badge:"✦ Your Journey to Success Starts Here ✦",
    title:"EDUCATION PLUS CENTER",
    subtitle:"Register for Courses and Educational Programs",
    btn1:"Support Registration", btn2:"Language Courses", btn3:"VIP Lessons",
    btn4:"IELTS Test", btn5:"Online Courses", btn6:"Training Courses",
    firstName:"First Name", lastName:"Last Name", birthDate:"Date of Birth",
    birthPlace:"Address", langType:"Choose Language",
    eduLevel:"Academic Level", specialty:"Specialty",
    subject:"Subject", teacher:"Teacher",
    candidateType:"Candidate Type", enrolled:"Enrolled", freeCandidate:"Independent",
    parentInfo:"Guardian Information", parentName:"Guardian Name", parentPhone:"Guardian Phone",
    langLevel:"Language Level (CEFR)",
    levelTest:"Do you want a placement test?",
    yes:"Yes", no:"No", phone:"Phone Number",
    motivation:"What motivated you to choose E-PLUS Academy?",
    optional:"(optional)",
    submitBtn:"Complete Registration ✦",
    termsTitle:"Academy Terms & Conditions",
    termsAgree:"I have read all terms and conditions and agree",
    termsProceed:"Confirm Registration ✦",
    closeBtn:"Return to Home Page",
    chooseDays:"Choose your days", daysOf:"/2", daysSelected:"days selected",
    langWarn:"Please enter all information in English only",
    annTitle:"Academy Announcements",
    vipDaysCount:"How many days per week?",
    t1:"The learner is officially registered upon payment of registration fees on the specified date.",
    t2:"The learner must demonstrate good conduct, cleanliness and appropriate dress.",
    t3:"All individuals at the educational center must be respected.",
    t4:"Respect study times and do not leave without prior permission.",
    t5:"Do not miss classes except for necessary reasons with prior notification.",
    t6:"In case of absence without reason, the guardian will be notified.",
    t7:"Class fees will not be compensated for repeated absences.",
    t8:"In case of stopping studies, only 80% of the remaining value will be compensated.",
    t9:"In case of long-term absence, please contact administration.",
    t10:"The center is not responsible for loss of any valuables.",
    t11:"Touching or operating educational tools without permission is prohibited.",
    t12:"Any damage to center equipment will subject the perpetrator to punishment.",
    t13:"In case of unacceptable behavior, the guardian will be formally notified.",
    t14:"Agreement to publish the learner's photos on social media and educational videos.",
  }
};

let currentLang      = localStorage.getItem('lang') || 'ar';
let currentModalType = null;

// ─── SET LANG ─────────────────────────────────────────────
function setLang(lang) {
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
  if (warnText) warnText.textContent  = t.langWarn;

  const levelNames = {
    ar:{ A1:'A1 - مبتدئ', A2:'A2 - مبتدئ متقدم', B1:'B1 - متوسط',
         B2:'B2 - متوسط متقدم', C1:'C1 - متقدم', C2:'C2 - احترافي' },
    en:{ A1:'A1 - Beginner', A2:'A2 - Elementary', B1:'B1 - Intermediate',
         B2:'B2 - Upper Intermediate', C1:'C1 - Advanced', C2:'C2 - Proficient' }
  };
  document.querySelectorAll('[data-i18n-level]').forEach(el => {
    const lv = el.getAttribute('data-i18n-level');
    if (levelNames[lang]?.[lv]) el.textContent = levelNames[lang][lv];
  });

  const dayNames = {
    ar:{ sat:'السبت', sun:'الأحد', mon:'الإثنين', tue:'الثلاثاء',
         wed:'الأربعاء', thu:'الخميس', fri:'الجمعة' },
    en:{ sat:'Saturday', sun:'Sunday', mon:'Monday', tue:'Tuesday',
         wed:'Wednesday', thu:'Thursday', fri:'Friday' }
  };
  document.querySelectorAll('[data-i18n-day]').forEach(el => {
    const key = el.getAttribute('data-i18n-day');
    if (dayNames[lang]?.[key]) el.textContent = dayNames[lang][key];
  });

  // ✅ إعادة رسم الإعلانات عند تغيير اللغة
  if (window._lastAnnDocs?.length) renderAnnouncements(window._lastAnnDocs);
}

// ─── MODAL TITLES ─────────────────────────────────────────
const modalTitles = {
  support: { ar:'تسجيلات الدعم',            en:'Support Registration' },
  lang:    { ar:'تسجيل دورة لغة',           en:'Language Course Registration' },
  vip:     { ar:'تسجيل دروس VIP',           en:'VIP Lessons Registration' },
  ielts:   { ar:'التسجيل في اختبار IELTS',   en:'IELTS Test Registration' },
  online:  { ar:'التسجيل في دورات أونلاين',  en:'Online Courses Registration' },
  takwini: { ar:'التسجيل في دورات تكوينية',  en:'Training Courses Registration' },
};

// ─── OPEN MODAL ───────────────────────────────────────────
function openModal(type) {
  currentModalType = type;
  const titleEl = document.getElementById('modal-title');
  if (titleEl) titleEl.textContent = modalTitles[type]?.[currentLang] || type;

  ['eduLevelGroup','vipEduLevelGroup','vipDaysCountGroup','professionGroup',
   'langTypeGroup','langLevelGroup','daysGroup','levelTestGroup',
   'subjectGroup','teacherGroup','specialtyGroup','candidateTypeGroup','parentGroup']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

  document.getElementById('comingSoonNote')?.remove();
  document.querySelectorAll('input[name="candidateType"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="levelTest"]').forEach(r => r.checked = false);
  maxDaysAllowed = 2;
  resetDays();

  if (type === 'support') animateShow(document.getElementById('eduLevelGroup'));
  if (type === 'vip')     animateShow(document.getElementById('vipEduLevelGroup'));
  if (type === 'lang' || type === 'online') {
    animateShow(document.getElementById('langTypeGroup'));
    document.getElementById('langType').setAttribute('required','required');
  }
  if (type === 'ielts') {
    maxDaysAllowed = 2;
    animateShow(document.getElementById('daysGroup'));
  }

  document.getElementById('reg-form').reset();
  document.getElementById('modal').classList.add('active');
  document.body.style.overflow = 'hidden';
  document.getElementById('lang-toggle')?.classList.add('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.body.style.overflow = '';
  currentModalType = null;
  document.getElementById('lang-toggle')?.classList.remove('hidden');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// ─── FORM SUBMIT ──────────────────────────────────────────
function submitForm(e) {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value.trim();
  const lastName  = document.getElementById('lastName').value.trim();
  const address   = document.getElementById('birthPlace').value.trim();

  let langError = false;
  [['firstName',firstName],['lastName',lastName],['birthPlace',address]].forEach(([id,val]) => {
    if (val && !validateLang(val)) {
      const el = document.getElementById(id);
      el.classList.add('error');
      setTimeout(() => el.classList.remove('error'), 1500);
      langError = true;
    }
  });
  if (langError) return;

  let valid = true;
  document.querySelectorAll('#reg-form [required]').forEach(field => {
    if (!field.value.trim()) {
      field.classList.add('error');
      setTimeout(() => field.classList.remove('error'), 1500);
      valid = false;
    }
  });
  if (!valid) return;

  const data = {
    timestamp:  new Date().toLocaleString('ar-DZ'),
    type:       typeLabelsAr[currentModalType] || currentModalType,
    firstName,
    lastName,
    birthDate:  document.getElementById('birthDate').value,
    address,
    phone:      document.getElementById('phone').value.trim(),
    motivation: document.getElementById('motivation').value.trim(),
  };

  if (currentModalType === 'support') {
    data.eduLevel = document.getElementById('eduLevel').value;
    const spec  = document.getElementById('specialty');
    const subj  = document.getElementById('subject');
    const teach = document.getElementById('teacher');
    const ctype = document.querySelector('input[name="candidateType"]:checked');
    const pName = document.getElementById('parentName');
    const pPh   = document.getElementById('parentPhone');
    if (spec?.value)  data.specialty     = spec.value;
    if (subj?.value)  data.subject       = subj.value;
    if (teach?.value) data.teacher       = teach.value;
    if (ctype)        data.candidateType = ctype.value;
    if (pName?.value) data.parentName    = pName.value.trim();
    if (pPh?.value)   data.parentPhone   = pPh.value.trim();
  }

  if (currentModalType === 'vip') {
    const vipLevel = document.getElementById('vipEduLevel');
    const prof     = document.getElementById('profession');
    if (vipLevel?.value) data.eduLevel   = vipLevel.value;
    if (prof?.value)     data.profession = prof.value.trim();
    const days = [...document.querySelectorAll('input[name="days"]:checked')].map(d => d.value);
    if (days.length) data.selectedDays = days.join('، ');
  }

  if (currentModalType === 'lang' || currentModalType === 'online') {
    const langTypeEl = document.getElementById('langType');
    if (langTypeEl?.value) data.langType = langTypeEl.value;
    data.langLevel = document.getElementById('langLevel').value;
    const lt = document.querySelector('input[name="levelTest"]:checked');
    if (lt) data.levelTest = lt.value;
  }

  if (currentModalType === 'ielts') {
    const days = [...document.querySelectorAll('input[name="days"]:checked')].map(d => d.value);
    if (days.length) data.selectedDays = days.join('، ');
  }

  openTermsForSubmit(data);
}

// ─── CONFETTI ─────────────────────────────────────────────
function launchConfetti(container) {
  const colors = ['#045283','#0a8acb','#f4b41a','#ffffff','#53a9df'];
  for (let i = 0; i < 55; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.cssText = `
      left:${Math.random()*100}%;top:${10+Math.random()*30}%;
      width:${6+Math.random()*9}px;height:${6+Math.random()*9}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>0.5?'50%':'3px'};
      animation-duration:${0.9+Math.random()*1}s;
      animation-delay:${Math.random()*0.5}s;`;
    container.appendChild(c);
    setTimeout(() => c.remove(), 2500);
  }
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────
let annCurrent   = 0;
let annAutoSlide = null;

function renderAnnouncements(docs) {
  window._lastAnnDocs = docs;
  const section = document.getElementById('announcements-section');
  const track   = document.getElementById('ann-track');
  const dotsEl  = document.getElementById('ann-dots');
  if (!docs.length) { section.style.display = 'none'; return; }

  const savedIndex = annCurrent;
  clearInterval(annAutoSlide);
  section.style.display = 'block';
  track.innerHTML  = '';
  dotsEl.innerHTML = '';

  const isRtl = currentLang === 'ar';

  docs.forEach((doc, i) => {
    const d    = doc.data();
    const card = document.createElement('div');
    card.className = d.imageUrl ? 'ann-card has-image' : 'ann-card text-only';

    // ✅ اتجاه النص حسب اللغة
    card.style.direction = isRtl ? 'rtl' : 'ltr';
    card.style.textAlign = isRtl ? 'right' : 'left';

    const dateStr = d.createdAt?.toDate
      ? d.createdAt.toDate().toLocaleDateString(isRtl ? 'ar-DZ' : 'en-GB',
          { year:'numeric', month:'long', day:'numeric' })
      : '';

    card.innerHTML = `
      ${d.imageUrl ? `<img class="ann-card-img" src="${d.imageUrl}" alt="" draggable="false">` : ''}
      <div class="ann-card-body">
        <div class="ann-card-badge">📢 ${isRtl ? 'إعلان' : 'Announcement'}</div>
        ${d.title ? `<div class="ann-card-title">${d.title}</div>` : ''}
        ${d.text  ? `<div class="ann-card-text">${d.text}</div>`   : ''}
        ${dateStr ? `<div class="ann-card-date">🗓 ${dateStr}</div>` : ''}
      </div>`;
    track.appendChild(card);

    const dot = document.createElement('div');
    dot.className = 'ann-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => { goToSlide(i); resetAuto(); };
    dotsEl.appendChild(dot);
  });

  const wrapper = document.querySelector('.ann-track-wrapper');
  wrapper.querySelectorAll('.ann-arrow').forEach(a => a.remove());

  if (docs.length > 1) {
    const prev = document.createElement('button');
    prev.className = 'ann-arrow ann-arrow-prev';
    prev.innerHTML = '‹';
    prev.onclick = () => { goToSlide((annCurrent - 1 + docs.length) % docs.length); resetAuto(); };
    const next = document.createElement('button');
    next.className = 'ann-arrow ann-arrow-next';
    next.innerHTML = '›';
    next.onclick = () => { goToSlide((annCurrent + 1) % docs.length); resetAuto(); };
    wrapper.appendChild(prev);
    wrapper.appendChild(next);
  }

  // touch / drag
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive:true });
  track.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) {
      goToSlide(diff > 0
        ? (annCurrent - 1 + docs.length) % docs.length
        : (annCurrent + 1) % docs.length);
      resetAuto();
    }
  });

  let isDragging = false, dragStartX = 0, dragDelta = 0;
  track.addEventListener('mousedown', e => {
    isDragging = true; dragStartX = e.clientX; dragDelta = 0;
    track.style.transition = 'none'; track.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    dragDelta = e.clientX - dragStartX;
    track.style.transform = `translateX(calc(${annCurrent * -100}% + ${dragDelta}px))`;
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false; track.style.transition = ''; track.style.cursor = '';
    goToSlide(Math.abs(dragDelta) > 60
      ? (dragDelta > 0
          ? (annCurrent - 1 + docs.length) % docs.length
          : (annCurrent + 1) % docs.length)
      : annCurrent);
    resetAuto();
  });

  const startIndex = savedIndex < docs.length ? savedIndex : 0;
  annCurrent = startIndex;
  track.style.transform = `translateX(${startIndex * -100}%)`;
  document.querySelectorAll('.ann-dot').forEach((d, i) =>
    d.classList.toggle('active', i === startIndex));
  startAuto();

  function goToSlide(idx) {
    annCurrent = idx;
    track.style.transform = `translateX(${idx * -100}%)`;
    document.querySelectorAll('.ann-dot').forEach((d, i) =>
      d.classList.toggle('active', i === idx));
  }
  function startAuto() {
    if (docs.length <= 1) return;
    annAutoSlide = setInterval(() => goToSlide((annCurrent + 1) % docs.length), 8000);
  }
  function resetAuto() { clearInterval(annAutoSlide); startAuto(); }
}

// ─── FIREBASE ─────────────────────────────────────────────
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot }
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const _app = initializeApp({
  apiKey:            "AIzaSyCtb6RPW5sq5zK5JMmTYlBFEnQQZfVoI7s",
  authDomain:        "epluscenter-panel.firebaseapp.com",
  projectId:         "epluscenter-panel",
  storageBucket:     "epluscenter-panel.firebasestorage.app",
  messagingSenderId: "1000462675381",
  appId:             "1:1000462675381:web:b2156128337f7c11c17dfc"
});
const _db = getFirestore(_app);

onSnapshot(
  query(collection(_db, 'announcements'), orderBy('createdAt', 'desc')),
  snap => renderAnnouncements(snap.docs)
);

// ✅ تهيئة اللغة عند التحميل
setLang(currentLang);

// ─── أزرار التسجيل بـ addEventListener (حل مشكلة type=module) ───
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-reg-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal(btn.getAttribute('data-reg-type'));
    });
  });
});

// ─── EXPOSE TO GLOBAL (للدوال المستخدمة في onclick بالـ HTML) ───
window.setLang           = setLang;
window.closeTerms        = closeTerms;
window.closeTermsOutside = closeTermsOutside;
window.onTermsCheck      = onTermsCheck;
window.proceedToRegister = proceedToRegister;
window.closeModal        = closeModal;
window.closeModalOutside = closeModalOutside;
window.submitForm        = submitForm;
window.closeSuccessPopup = closeSuccessPopup;
window.onEduLevelChange      = onEduLevelChange;
window.onCandidateTypeChange = onCandidateTypeChange;
window.onSpecialtyChange     = onSpecialtyChange;
window.onSubjectChange       = onSubjectChange;
window.onTeacherChange       = onTeacherChange;
window.onLangTypeChange      = onLangTypeChange;
window.onLangLevelChange     = onLangLevelChange;
window.onVipEduLevelChange   = onVipEduLevelChange;
window.onVipDaysCountChange  = onVipDaysCountChange;
window.onDayChange           = onDayChange;
