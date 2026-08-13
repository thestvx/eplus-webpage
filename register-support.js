// ═══════════════════════════════════════════════════════════
//  تسجيل الدعم المدرسي — Dynamic Form Flow
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.ep8b2omBGaN2qUB_XG8EE8XDhoRfAVAwnxOgEodEKBc';

// Data source: shared with admin/teacher via js/subjectService.js
// NOTE: read via window.* (NOT top-level const) to avoid a global-scope
// SyntaxError, because js/subjectService.js already declares
// const SUPPORT_STREAMS / const SUPPORT_MIDDLE_SCHOOL in the same scope.
const supportStreams = () => {
  const raw = window.SUPPORT_STREAMS || {};
  if (window.SubjectService && SubjectService.filterActiveTeachers) {
    const out = {};
    Object.keys(raw).forEach(k => { out[k] = SubjectService.filterActiveTeachers(raw[k]); });
    return out;
  }
  return raw;
};
const supportMiddleSchool = () => {
  const raw = window.SUPPORT_MIDDLE_SCHOOL || [];
  return (window.SubjectService && SubjectService.filterActiveTeachers) ? SubjectService.filterActiveTeachers(raw) : raw;
};

// ── استثناءات نموذج التسجيل فقط ──
// مادة معينة عند أستاذ معين لا تُعرض للتسجيلات الجديدة، بينما التلاميذ
// الذين سبق واختاروها يحتفظون بها ضمن موادهم المسجلة (لا يُمسّ سجلهم).
function registrationFormItems(pairs) {
  const active = (window.SubjectService && SubjectService.filterActiveTeachers) ? SubjectService.filterActiveTeachers(pairs) : (pairs || []);
  return (Array.isArray(active) ? active : []).filter(p =>
    !(p.subject === 'الرياضيات' && p.teacher === 'نعورة عبدالباسط')
  );
}

const SUPPORT_INSTITUTIONS = {
  'السنة الثالثة ثانوي (بكالوريا)': [
    'ثانوية هالي عبدالكريم بقمار',
    'متقنة عبدالقادر الياجوري بقمار',
    'ثانوية العلامة أبو القاسم سعد الله بقمار',
    'ثانوية بوضياف بوضياف بتغزوت',
    'أخرى',
  ],
  'السنة الرابعة متوسط': [
    'متوسطة خليفة بن حسن بقمار',
    'متوسطة أحمد عربية بقمار',
    'متوسطة البشير الإبراهيمي بقمار',
    'متوسطة الرويسي بلقاسم بقمار',
    'أخرى',
  ],
};

const SUPPORT_LAWS = [
  'يلتزم الطالب بحضور جميع الحصص في المواعيد المحددة.',
  'التأخر عن الحصة بأكثر من 10 دقائق يعتبر غياباً.',
  'الغياب المتكرر دون عذر مقبول يؤدي إلى الفصل من الدعم.',
  'الالتزام بآداب الحوار والاحترام المتبادل مع الأساتذة والطلاب.',
  'يمنع استخدام الهاتف المحمول داخل القسم.',
  'رسوم التسجيل 500 دج غير قابلة للاسترجاع.',
  'الأقساط الشهرية تدفع في أول كل شهر.',
  'في حالة الانسحاب، تطبق سياسة الاسترجاع وفقاً للوائح المركز.',
  'المركز غير مسؤول عن فقدان المتعلقات الشخصية.',
  'الطالب مسؤول عن متابعة دروسه وجدول الحصص عبر المنصة.',
  'يلتزم ولي الأمر بمتابعة مستوى الطالب والتواصل مع الإدارة.',
  'المركز يحتفظ بالحق في تعديل الجدول الزمني حسب الضرورة.',
  'بيانات التسجيل محمية ولا تستخدم إلا للأغراض التعليمية.',
  'القوانين الداخلية للمركز ملزمة للجميع. الموافقة على القوانين شرط أساسي للتسجيل.',
  'أتحمل المسؤولية الكاملة عن صحة المعلومات المقدمة.',
];

// ── Custom Alert (replaces native alert()) ──
function regAlert(message, title = 'تنبيه') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:20px;position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);z-index:99999;';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:400px;text-align:center;">
      <div class="modal-header"><h3 class="modal-title">${title}</h3></div>
      <div style="padding:20px 24px;font-size:14px;color:var(--text,#e5e5e5);line-height:1.7;">${message}</div>
      <div style="padding:0 24px 22px;display:flex;justify-content:center;">
        <button class="ep-btn-primary" style="min-width:120px;">حسناً</button>
      </div>
    </div>`;
  overlay.querySelector('button').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── Custom Toast (replaces console-only feedback) ──
function regToast(message, type = 'success') {
  const colors = { success: '#10b981', error: '#ef4444', warn: '#f59e0b' };
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;bottom:24px;right:50%;transform:translateX(50%);background:#0d1520;border:1px solid ${colors[type] || colors.success};color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:700;z-index:999999;box-shadow:0 8px 30px rgba(0,0,0,0.5);font-family:'Tajawal',sans-serif;max-width:90vw;`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity 0.3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2600);
}

// ── State ──
let sStudentType = null;
let sLevel = null;
let sInstitutionVal = null;
let sStream = null;
let sSubjects = []; // [{ subject, teacher }] — unique Subject+Teacher pairs
let sFormData = null;

function byId(id) { return document.getElementById(id); }

// ── Helpers ──
function _pairKey(p) {
  return ((p && p.subject) || '') + '||' + ((p && p.teacher) || '');
}

// المواد المسموح عرضها/اختيارها حالياً (مع استثناءات نموذج التسجيل)
function currentSubjectItems() {
  return registrationFormItems(sLevel === 'السنة الرابعة متوسط'
    ? supportMiddleSchool()
    : (supportStreams()[sStream] || []));
}

// توليد ID ثلاثي الأرقام (000–999)
function _genRegId() {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

// ── Smooth scroll بين المراحل الرئيسية ──
// container: العنصر القابل للتمرير (نافذة المودال أو الصفحة)
// لا نستخدم scrollIntoView بشكل أعمى حتى لا يختفي رأس المرحلة خلف الـ sticky header.
function smoothScrollTo(container, targetTop, duration) {
  if (!container) return;
  const start = container.scrollTop;
  const maxScroll = container.scrollHeight - container.clientHeight;
  const target = Math.max(0, Math.min(targetTop, maxScroll));
  if (Math.abs(target - start) < 1) return;
  const t0 = performance.now();
  function step(now) {
    const t = Math.min(1, (now - t0) / duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
    container.scrollTop = start + (target - start) * eased;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// تمرير العنصر إلى بداية المرحلة مع إزاحة قابلة للضبط
// opts.offset: مسافة إضافية أعلى العنصر (افتراضياً 24px لمراعاة الـ sticky header/حشوة المودال)
// opts.duration: مدة التمرير (افتراضياً 550ms ضمن النطاق المطلوب 400–700ms)
function sScrollToPhase(el, opts) {
  if (!el) return;
  const o = opts || {};
  const container = el.closest('.modal-overlay') || document.scrollingElement;
  if (!container) return;
  const headerOffset = (o.offset != null) ? o.offset : 24;
  const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - headerOffset;
  smoothScrollTo(container, top, o.duration || 550);
}

// شريط "تم اختيار X مادة" + قائمة "المواد المختارة" + زر الإتمام
function updateMsUI() {
  const lbl = byId('msLabel');
  if (lbl) lbl.textContent = sSubjects.length ? `تم اختيار ${sSubjects.length} مادة` : 'اختر المواد';

  const strip = byId('msStrip');
  if (strip) {
    strip.style.display = sSubjects.length ? 'flex' : 'none';
    strip.innerHTML = sSubjects.map(p =>
      `<span class="ms-chip"><strong>${p.subject}</strong> <span style="opacity:0.75;font-weight:400;">— ${p.teacher}</span></span>`
    ).join('');
  }

  const sgrp = byId('s-selected-group');
  const slist = byId('s-selected-list');
  const scount = byId('s-selected-count');
  if (sgrp && slist) {
    sgrp.style.display = sSubjects.length ? 'block' : 'none';
    if (scount) scount.textContent = `(${sSubjects.length})`;
    slist.innerHTML = sSubjects.map((p, i) =>
      `<div class="s-selected-item"><span>🎓 <strong>${p.subject}</strong> — <span style="opacity:0.75;font-weight:400;">${p.teacher}</span></span><button type="button" class="s-selected-rm" onclick="msRemoveIdx(${i})" title="حذف المادة">×</button></div>`
    ).join('');
  }

  byId('s-submit-btn') && (byId('s-submit-btn').style.display = sSubjects.length ? 'block' : 'none');
}

// إعادة التحقق عند تغيير المستوى/الشعبة: تُحذف المواد غير المتاحة
// مع الحفاظ على المواد المتاحة، ويُعاد عرض القائمة/العداد.
function revalidateSubjects(items) {
  const list = Array.isArray(items) ? items : currentSubjectItems();
  const valid = new Set(list.map(_pairKey));
  const before = sSubjects.length;
  sSubjects = sSubjects.filter(p => valid.has(_pairKey(p)));
  const opts = byId('ms-options');
  if (opts) renderSubjects(); else updateMsUI();
  if (sSubjects.length < before) {
    regToast('تمت إزالة المواد غير المتاحة للمستوى/الشعبة الجديد وبقيت المواد المتاحة', 'warn');
  }
}

// ── Open / Close main modal ──
function openSupportReg() {
  sStudentType = null; sLevel = null; sInstitutionVal = null; sStream = null;
  sSubjects = []; sFormData = null;
  const f = byId('support-reg-form');
  if (f) f.reset();
  [byId('s-level-group'),byId('s-institution-group'),byId('s-institution-input-group'),
   byId('s-stream-group'),byId('s-subjects-group'),byId('s-submit-btn')].forEach(el=>{
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('input[name="sStdType"]').forEach(r=>r.checked=false);
  byId('msLabel')&&(byId('msLabel').textContent='اختر المواد');
  byId('msStrip')&&(byId('msStrip').style.display='none');
  byId('s-selected-group')&&(byId('s-selected-group').style.display='none');
  byId('msDropdown')&&(byId('msDropdown').style.display='none');
  byId('ms-options')&&(byId('ms-options').innerHTML='');
  const modal = byId('support-reg-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); modal.scrollTop = 0; }
}

function closeSupportReg() {
  const modal = byId('support-reg-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

function closeSupportRegOutside(e) {
  if (e.target === byId('support-reg-modal')) closeSupportReg();
}

// ── Step 1: Student Type ──
function onStdTypeChange(type) {
  sStudentType = type;
  sLevel = null; sInstitutionVal = null; sStream = null; sSubjects = [];
  [byId('s-institution-group'),byId('s-institution-input-group'),
   byId('s-stream-group'),byId('s-subjects-group'),byId('s-submit-btn')].forEach(el=>{
    if (el) el.style.display = 'none';
  });
  byId('msLabel')&&(byId('msLabel').textContent='اختر المواد');
  byId('msStrip')&&(byId('msStrip').style.display='none');
  byId('s-selected-group')&&(byId('s-selected-group').style.display='none');
  byId('ms-options')&&(byId('ms-options').innerHTML='');

  if (type === 'متمدرس') {
    const lg = byId('s-level-group');
    if (lg) { lg.style.display = 'block'; }
    const sel = byId('sLevel');
    if (sel) { sel.disabled = false; sel.value = ''; }
  } else if (type === 'حر') {
    sLevel = 'السنة الثالثة ثانوي (بكالوريا)';
    sInstitutionVal = 'غير محدد';
    const lg = byId('s-level-group');
    if (lg) { lg.style.display = 'block'; }
    const sel = byId('sLevel');
    if (sel) { sel.value = 'السنة الثالثة ثانوي (بكالوريا)'; sel.disabled = true; }
    showStream();
  }
}

// ── Step 2: Level ──
function onLevelChange() {
  const sel = byId('sLevel');
  sLevel = sel ? sel.value : null;
  if (sLevel) {
    sInstitutionVal = null; sStream = null;
    showInstitution();
  } else {
    [byId('s-institution-group'),byId('s-institution-input-group'),
     byId('s-stream-group'),byId('s-subjects-group'),byId('s-submit-btn')].forEach(el=>{
      if (el) el.style.display = 'none';
    });
  }
}

// ── Step 3: Institution ──
function showInstitution() {
  const ig = byId('s-institution-group');
  if (ig) { ig.style.display = 'block'; }
  const sel = byId('sInstitution');
  if (sel) {
    const institutions = SUPPORT_INSTITUTIONS[sLevel] || [];
    sel.innerHTML = '<option value="">اختر المؤسسة التعليمية</option>' +
      institutions.map(inst => `<option value="${inst}">${inst}</option>`).join('');
    if (sInstitutionVal) sel.value = sInstitutionVal;
  }
  byId('s-institution-input-group')&&(byId('s-institution-input-group').style.display='none');
  byId('s-stream-group')&&(byId('s-stream-group').style.display='none');
  byId('s-subjects-group')&&(byId('s-subjects-group').style.display='none');
  byId('s-submit-btn')&&(byId('s-submit-btn').style.display='none');
}

function onInstitutionChange() {
  const sel = byId('sInstitution');
  sInstitutionVal = sel ? sel.value : null;
  if (!sInstitutionVal) return;
  sStream = null;
  byId('s-stream-group')&&(byId('s-stream-group').style.display='none');
  byId('s-subjects-group')&&(byId('s-subjects-group').style.display='none');
  byId('s-submit-btn')&&(byId('s-submit-btn').style.display='none');
  byId('msLabel')&&(byId('msLabel').textContent='اختر المواد');
  byId('msStrip')&&(byId('msStrip').style.display='none');
  byId('s-selected-group')&&(byId('s-selected-group').style.display='none');
  byId('ms-options')&&(byId('ms-options').innerHTML='');

  if (sInstitutionVal === 'أخرى') {
    byId('s-institution-input-group')&&(byId('s-institution-input-group').style.display='block');
    byId('sInstitutionInput')&&(byId('sInstitutionInput').value='');
    return;
  }
  byId('s-institution-input-group')&&(byId('s-institution-input-group').style.display='none');

  if (sLevel === 'السنة الرابعة متوسط') {
    showMiddleSchoolSubjects();
  } else {
    showStream();
  }
}

function onInstitutionInputChange() {
  const inp = byId('sInstitutionInput');
  if (inp && inp.value.trim().length >= 2) {
    if (sLevel === 'السنة الرابعة متوسط') {
      showMiddleSchoolSubjects();
    } else {
      showStream();
    }
  } else {
    byId('s-stream-group')&&(byId('s-stream-group').style.display='none');
    byId('s-subjects-group')&&(byId('s-subjects-group').style.display='none');
  }
}

function showMiddleSchoolSubjects() {
  revalidateSubjects();
  byId('msDropdown')&&(byId('msDropdown').style.display='none');
  const sg = byId('s-subjects-group');
  if (sg) sg.style.display = 'block';
  renderMiddleSchoolSubjects();
  sScrollToPhase(sg, { offset: 32 });
}

function renderMiddleSchoolSubjects() {
  const opts = byId('ms-options');
  if (!opts) return;
  const items = registrationFormItems(supportMiddleSchool());
  opts.innerHTML = items.map((item, i) => {
    const sel = sSubjects.some(p => p.subject === item.subject && p.teacher === item.teacher);
    return `<div class="ms-opt ${sel?'selected':''}" data-idx="${i}" onclick="msSelect(${i})"><strong>${item.subject}</strong> <span style="opacity:0.6;font-weight:400;">— 🎓 ${item.teacher}</span></div>`;
  }).join('');
  updateMsUI();
}

// ── Step 4: Stream ──
function showStream() {
  const sg = byId('s-stream-group');
  if (!sg) return;
  sg.style.display = 'block';
  byId('s-institution-group')&&(byId('s-institution-group').style.display='none');
  byId('s-institution-input-group')&&(byId('s-institution-input-group').style.display='none');
  renderStreams();
}

function renderStreams() {
  const c = byId('s-streams-container');
  if (!c) return;
  c.innerHTML = Object.keys(supportStreams()).map(s =>
    `<label class="check-option">
      <input type="radio" name="sStream" value="${s}" onchange="onStreamChange('${s}')" ${s === sStream ? 'checked' : ''} />
      <span class="check-box"></span>
      <span class="check-label">${s}</span>
    </label>`
  ).join('');
}

function onStreamChange(stream, opts) {
  sStream = stream;
  byId('msDropdown')&&(byId('msDropdown').style.display='none');
  revalidateSubjects();
  const sg = byId('s-subjects-group');
  if (sg) sg.style.display = 'block';
  renderSubjects();
  if (!opts || !opts.skipScroll) sScrollToPhase(sg, { offset: 32 });
}

// ── Step 5: Subjects (Multi-Select Dropdown — per stream) ──
function renderSubjects() {
  const opts = byId('ms-options');
  if (!opts) return;
  const items = currentSubjectItems();
  opts.innerHTML = items.map((item, i) => {
    const sel = sSubjects.some(p => p.subject === item.subject && p.teacher === item.teacher);
    return `<div class="ms-opt ${sel?'selected':''}" data-idx="${i}" onclick="msSelect(${i})"><strong>${item.subject}</strong> <span style="opacity:0.6;font-weight:400;">— 🎓 ${item.teacher}</span></div>`;
  }).join('');
  updateMsUI();
}

function msToggle() {
  const dd = byId('msDropdown');
  const arrow = document.querySelector('.ms-arrow');
  if (!dd) return;
  const open = dd.style.display === 'none' || !dd.style.display;
  dd.style.display = open ? 'block' : 'none';
  if (arrow) arrow.classList.toggle('open', open);
  if (open) _msScrollIntoView();
}

// عند فتح القائمة المنسدلة: ينزل المودال/الصفحة تلقائياً حتى تظهر
// جميع المواد داخل الشاشة (أسفل القائمة محاذي لأسفل الشاشة الظاهرة).
function _msScrollIntoView() {
  const dd = byId('msDropdown');
  if (!dd || dd.style.display === 'none') return;
  const container = dd.closest('.modal-overlay') || document.scrollingElement;
  if (!container) return;
  const cRect = container.getBoundingClientRect();
  const dRect = dd.getBoundingClientRect();
  const ddBottomInContainer = dRect.bottom - cRect.top + container.scrollTop;
  const target = Math.max(0, ddBottomInContainer - container.clientHeight + 12);
  if (target > container.scrollTop + 2) {
    smoothScrollTo(container, target, 480);
  }
}

document.addEventListener('click', (e) => {
  const dd = byId('msDropdown');
  const trigger = byId('msTrigger');
  const arrow = document.querySelector('.ms-arrow');
  if (!dd || !trigger) return;
  if (dd.style.display !== 'none' && !dd.contains(e.target) && !trigger.contains(e.target)) {
    dd.style.display = 'none';
    if (arrow) arrow.classList.remove('open');
  }
});

function msSelect(idx) {
  const items = currentSubjectItems();
  const item = items[idx];
  if (!item) return;
  const i = sSubjects.findIndex(p => p.subject === item.subject && p.teacher === item.teacher);
  if (i === -1) sSubjects.push({ subject: item.subject, teacher: item.teacher });
  else sSubjects.splice(i, 1);
  renderSubjects();
}

function msRemove(idx) {
  msSelect(idx);
}

// حذف مادة من قائمة "المواد المختارة" بمعرّفها داخل sSubjects
function msRemoveIdx(i) {
  if (i < 0 || i >= sSubjects.length) return;
  sSubjects.splice(i, 1);
  renderSubjects();
}

// ── Step 6: Submit (opens laws modal) ──
function onSubmitClick() {
  const firstName = byId('sFirstName')?.value?.trim();
  const lastName = byId('sLastName')?.value?.trim();
  const birthDate = byId('sBirthDate')?.value;
  const parentName = byId('sParentName')?.value?.trim();
  const parentPhone = byId('sParentPhone')?.value?.trim();

  if (!firstName || !lastName || !birthDate || !parentName || !parentPhone) {
    regAlert('⚠️ الرجاء ملء جميع الحقول الإلزامية'); return;
  }
  if (!sStudentType) { regAlert('⚠️ الرجاء اختيار نوع الطالب'); return; }
  if (sStudentType === 'متمدرس' && !sLevel) { regAlert('⚠️ الرجاء اختيار المستوى الدراسي'); return; }
  if (sStudentType === 'متمدرس') {
    if (!sInstitutionVal) { regAlert('⚠️ الرجاء اختيار المؤسسة التعليمية'); return; }
    if (sInstitutionVal === 'أخرى') {
      const instInp = byId('sInstitutionInput')?.value?.trim();
      if (!instInp) { regAlert('⚠️ الرجاء إدخال اسم المؤسسة التعليمية'); return; }
    }
  }
  if (sLevel === 'السنة الثالثة ثانوي (بكالوريا)' && !sStream) {
    regAlert('⚠️ الرجاء اختيار الشعبة'); return;
  }
  if (sLevel === 'السنة الرابعة متوسط' || sStream) {
    if (sSubjects.length === 0) { regAlert('⚠️ الرجاء اختيار مادة واحدة على الأقل'); return; }
  }

  const institution = sInstitutionVal === 'أخرى'
    ? (byId('sInstitutionInput')?.value?.trim() || '')
    : sInstitutionVal;

  const id = _genRegId();

  function _genToken(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let t = '';
    for (let i = 0; i < len; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
    return t;
  }

  sFormData = {
    id,
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
    parent_name: parentName,
    parent_phone: parentPhone,
    student_type: sStudentType,
    level: sLevel,
    institution,
    stream: sStream,
    subjects: sSubjects.map(p => ({ subject: p.subject, teacher: p.teacher })),
    terms_accepted: true,
    status: 'مسجل مبدئياً',
    fee_amount: 500,
    student_token: _genToken(32),
    barcode_value: (typeof EAN13 !== 'undefined' && EAN13.make(id)) || '',
  };

  openLawsModal();
}

// ── Open Laws Modal from Hero (without closing support reg) ──
function openLawsFromHero() {
  const lawsText = byId('laws-text');
  if (lawsText) {
    lawsText.innerHTML = SUPPORT_LAWS.map((l, i) =>
      `<div class="law-item"><strong class="law-num">${i + 1}.</strong> ${l}</div>`
    ).join('');
  }
  byId('laws-checkbox-area')&&(byId('laws-checkbox-area').style.display='none');
  byId('lawsAgree')&&(byId('lawsAgree').checked=false);
  byId('lawsConfirmBtn')&&(byId('lawsConfirmBtn').disabled=true);
  const modal = byId('laws-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); modal.scrollTop = 0; }
  const area = byId('laws-scroll-area');
  if (area) { area.scrollTop = 0; }
  setTimeout(setupLawsScroll, 100);
}

// ── Laws Modal ──
function openLawsModal() {
  const lawsText = byId('laws-text');
  if (lawsText) {
    lawsText.innerHTML = SUPPORT_LAWS.map((l, i) =>
      `<div class="law-item"><strong class="law-num">${i + 1}.</strong> ${l}</div>`
    ).join('');
  }
  byId('laws-checkbox-area')&&(byId('laws-checkbox-area').style.display='none');
  byId('lawsAgree')&&(byId('lawsAgree').checked=false);
  byId('lawsConfirmBtn')&&(byId('lawsConfirmBtn').disabled=true);
  closeSupportReg();
  const modal = byId('laws-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); modal.scrollTop = 0; }
  const area = byId('laws-scroll-area');
  if (area) { area.scrollTop = 0; }
  setTimeout(setupLawsScroll, 100);
}

// العودة من مرحلة القوانين إلى مرحلة معلومات الطالب (المرحلة كاملة)
// مع الحفاظ على كل البيانات بدون إعادة تحميل وبدون فقدان المواد المختارة.
function lawsBackToForm() {
  resetLawsModalState();
  closeLawsModal();
  const formModal = byId('support-reg-modal');
  if (formModal) {
    formModal.style.display = 'flex';
    formModal.classList.add('active');
    sScrollToPhase(byId('s-personal-group') || formModal, { offset: 20 });
  }
}

// إعادة ضبط حالة مودال القوانين (قبل الفتح أو الرجوع)
function resetLawsModalState() {
  byId('laws-checkbox-area')&&(byId('laws-checkbox-area').style.display='none');
  byId('lawsAgree')&&(byId('lawsAgree').checked=false);
  byId('lawsConfirmBtn')&&(byId('lawsConfirmBtn').disabled=true);
  const area = byId('laws-scroll-area');
  if (area) area.scrollTop = 0;
}

function setupLawsScroll() {
  const area = byId('laws-scroll-area');
  const sentinel = byId('laws-bottom-sentinel');
  if (!area || !sentinel) return;

  function showCheckbox() {
    const cbArea = byId('laws-checkbox-area');
    if (cbArea && cbArea.style.display !== 'block') {
      cbArea.style.display = 'block';
      cbArea.style.animation = 'lawsFadeIn 0.4s ease forwards';
    }
  }

  // If content doesn't overflow, show immediately
  if (area.scrollHeight <= area.clientHeight + 5) {
    showCheckbox();
    return;
  }

  // IntersectionObserver approach
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { showCheckbox(); observer.disconnect(); }
    });
  }, { root: area, threshold: 0.8 });
  observer.observe(sentinel);

  // Fallback: manual scroll check
  area.addEventListener('scroll', function onScroll() {
    if (area.scrollTop + area.clientHeight >= area.scrollHeight - 10) {
      showCheckbox();
      area.removeEventListener('scroll', onScroll);
      observer.disconnect();
    }
  });
}

function onLawsAgreeChange() {
  const cb = byId('lawsAgree');
  const btn = byId('lawsConfirmBtn');
  if (btn) btn.disabled = !cb.checked;
}

// ── Loading Modal ──
function openLoadingModal() {
  const modal = byId('loading-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
}

function closeLoadingModal() {
  const modal = byId('loading-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

// حماية من الترحيل الناقص: يُحذف barcode_value من الحمولة ما دام العمود
// غير موجود في قاعدة البيانات، حتى لا يفشل التسجيل قبل تطبيق السكيما.
let _barcodeColOk = null;
async function _barcodeColumnAvailable() {
  if (_barcodeColOk !== null) return _barcodeColOk;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=barcode_value&limit=1`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    _barcodeColOk = res.ok;
  } catch (e) { _barcodeColOk = false; }
  return _barcodeColOk;
}

// الموافقة على قوانين المركز → الإرسال النهائي للبيانات إلى قاعدة البيانات
async function onLawsConfirm() {
  if (!sFormData) return;
  if (sSubjects.length === 0) { regAlert('⚠️ الرجاء اختيار مادة واحدة على الأقل'); return; }
  sFormData.subjects = sSubjects.map(p => ({ subject: p.subject, teacher: p.teacher }));
  sFormData.terms_accepted = true;
  const btn = byId('lawsConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري التسجيل...'; }
  openLoadingModal();
  try {
    // ID ثلاثي الأرقام (000–999): عند تصادم 23505 نعيد توليد ID جديد
    // ونعيد المحاولة (حتى 1000 محاولة) دون تغيير الباركود نهائياً —
    // الباركود يُشتق من الـ ID النهائي ويبقى ثابتاً للتسجيل الواحد.
    const MAX_TRIES = 1000;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      if (attempt > 0) {
        sFormData.id = _genRegId();
        sFormData.barcode_value = (typeof EAN13 !== 'undefined' && EAN13.make(sFormData.id)) || '';
      }
      const payload = Object.assign({}, sFormData);
      if (typeof EAN13 !== 'undefined' && !(await _barcodeColumnAvailable())) {
        delete payload.barcode_value;
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        closeLoadingModal();
        closeLawsModal();
        openSuccessModal(sFormData.id);
        return;
      }
      if (res.status === 409) continue;
      const txt = await res.text();
      throw new Error(txt.slice(0, 200));
    }
    throw new Error('لا توجد Registration IDs ثلاثية متاحة حالياً');
  } catch (e) {
    closeLoadingModal();
    if (byId('lawsConfirmBtn')) { byId('lawsConfirmBtn').disabled = false; byId('lawsConfirmBtn').textContent = 'تأكيد التسجيل الأولي'; }
    setTimeout(() => regAlert('❌ فشل التسجيل: ' + e.message, 'خطأ'), 200);
  }
}

function closeLawsModal() {
  const modal = byId('laws-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

function closeLawsModalOutside(e) {
  if (e.target === byId('laws-modal')) lawsBackToForm();
}

// ── Success Modal ──
function openSuccessModal(id) {
  byId('success-id-display')&&(byId('success-id-display').textContent=id);
  if (sFormData) {
    const lvl = byId('success-level');
    if (lvl) lvl.textContent = sFormData.level || '—';
    const cnt = byId('success-subjects-count');
    if (cnt) cnt.textContent = (Array.isArray(sFormData.subjects) ? sFormData.subjects.length : 0) + ' مواد';
    const stream = byId('success-stream');
    const streamChip = byId('success-stream-chip');
    if (stream && streamChip) {
      if (sFormData.stream) {
        stream.textContent = sFormData.stream;
        streamChip.style.display = 'inline-flex';
      } else {
        streamChip.style.display = 'none';
      }
    }
  }
  const modal = byId('success-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
    modal.scrollTop = 0;
    const animEls = modal.querySelectorAll('.success-stagger, .success-check-wrap, .success-check-circle, .success-check-mark, .ep-success-box');
    animEls.forEach(el => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  }
}

function closeSuccessModal() {
  const modal = byId('success-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  sFormData = null;
}

function closeSuccessModalOutside(e) {
  if (e.target === byId('success-modal')) closeSuccessModal();
}

// ── Admin helpers ──
async function loadRegistrations() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return (await res.json()).filter(r => !r.deleted_at);
  } catch (e) {
    console.error('Failed to load registrations:', e);
    return [];
  }
}

async function confirmRegistration(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status: 'مسجل نهائياً' }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return true;
  } catch (e) {
    console.error('Failed to confirm registration:', e);
    return false;
  }
}

async function deleteRegistration(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return true;
  } catch (e) {
    console.error('Failed to delete registration:', e);
    return false;
  }
}

async function updateRegistration(id, data) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return true;
  } catch (e) {
    console.error('Failed to update registration:', e);
    return false;
  }
}

// ── Init: load deleted teachers so choices stay in sync ──
(function initDeletedTeachers() {
  if (window.SubjectService && typeof SubjectService.loadDeletedTeachers === 'function') {
    SubjectService.loadDeletedTeachers().then(() => {
      try {
        if (byId('s-subjects-group')?.style.display === 'block') {
          if (sLevel === 'السنة الرابعة متوسط') { renderMiddleSchoolSubjects(); }
          else if (sStream) { onStreamChange(sStream, { skipScroll: true }); }
        }
      } catch (e) { console.warn('Re-render after deleted-teachers load failed:', e); }
    }).catch(() => {});
  }
})();
