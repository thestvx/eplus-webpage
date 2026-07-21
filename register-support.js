// ═══════════════════════════════════════════════════════════
//  تسجيل الدعم المدرسي — Dynamic Form Flow
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.6GzLcHQBFQJukYpLMEbFjHhbZQHWFLCj3wlTLvPN0Dc';

// ── Streams ──
const SUPPORT_STREAMS = [
  'علوم تجريبية',
  'رياضيات',
  'تقني رياضي',
  'تسيير واقتصاد',
  'آداب وفلسفة',
  'لغات أجنبية',
];

// ── Subjects (generic list, same for all streams) ──
const SUPPORT_SUBJECTS = [
  'الرياضيات',
  'الفيزياء',
  'العلوم الطبيعية والحياة',
  'اللغة العربية',
  'اللغة الفرنسية',
  'اللغة الإنجليزية',
  'التاريخ والجغرافيا',
  'الفلسفة',
  'العلوم الإسلامية',
  'الإعلام الآلي',
];

// ── Laws ──
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

// ── State ──
let sStudentType = null;
let sLevel = null;
let sInstitutionVal = null;
let sStream = null;
let sSubjects = [];
let sFormData = null;

function byId(id) { return document.getElementById(id); }

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
  byId('msTags')&&(byId('msTags').innerHTML='');
  byId('msDropdown')&&(byId('msDropdown').style.display='none');
  const modal = byId('support-reg-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
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
  byId('msTags')&&(byId('msTags').innerHTML='');

  if (type === 'متمدرس') {
    const lg = byId('s-level-group');
    if (lg) { lg.style.display = 'block'; }
    const sel = byId('sLevel');
    if (sel) sel.value = '';
  } else {
    // حر — auto-select bac
    sLevel = 'السنة الثالثة ثانوي (بكالوريا)';
    const lg = byId('s-level-group');
    if (lg) lg.style.display = 'none';
    showInstitution();
  }
}

// ── Step 2: Level ──
function onLevelChange() {
  const sel = byId('sLevel');
  sLevel = sel ? sel.value : null;
  if (sLevel) {
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
  if (sel) sel.value = '';
  byId('s-institution-input-group')&&(byId('s-institution-input-group').style.display='none');
  byId('s-stream-group')&&(byId('s-stream-group').style.display='none');
  byId('s-subjects-group')&&(byId('s-subjects-group').style.display='none');
  byId('s-submit-btn')&&(byId('s-submit-btn').style.display='none');
}

function onInstitutionChange() {
  const sel = byId('sInstitution');
  sInstitutionVal = sel ? sel.value : null;
  if (!sInstitutionVal) return;
  sStream = null; sSubjects = [];
  byId('s-stream-group')&&(byId('s-stream-group').style.display='none');
  byId('s-subjects-group')&&(byId('s-subjects-group').style.display='none');
  byId('s-submit-btn')&&(byId('s-submit-btn').style.display='none');
  byId('msLabel')&&(byId('msLabel').textContent='اختر المواد');
  byId('msTags')&&(byId('msTags').innerHTML='');

  if (sInstitutionVal === 'أخرى') {
    byId('s-institution-input-group')&&(byId('s-institution-input-group').style.display='block');
    byId('sInstitutionInput')&&(byId('sInstitutionInput').value='');
  } else {
    byId('s-institution-input-group')&&(byId('s-institution-input-group').style.display='none');
    showStream();
  }
}

function onInstitutionInputChange() {
  const inp = byId('sInstitutionInput');
  if (inp && inp.value.trim().length >= 2) {
    showStream();
  } else {
    byId('s-stream-group')&&(byId('s-stream-group').style.display='none');
  }
}

// ── Step 4: Stream ──
function showStream() {
  const sg = byId('s-stream-group');
  if (!sg) return;
  sg.style.display = 'block';
  renderStreams();
}

function renderStreams() {
  const c = byId('s-streams-container');
  if (!c) return;
  c.innerHTML = SUPPORT_STREAMS.map(s =>
    `<label class="check-option">
      <input type="radio" name="sStream" value="${s}" onchange="onStreamChange('${s}')" />
      <span class="check-box"></span>
      <span class="check-label">${s}</span>
    </label>`
  ).join('');
}

function onStreamChange(stream) {
  sStream = stream;
  sSubjects = [];
  byId('msLabel')&&(byId('msLabel').textContent='اختر المواد');
  byId('msTags')&&(byId('msTags').innerHTML='');
  byId('msDropdown')&&(byId('msDropdown').style.display='none');
  const sg = byId('s-subjects-group');
  if (sg) sg.style.display = 'block';
  byId('s-submit-btn')&&(byId('s-submit-btn').style.display='none');
  renderSubjects();
}

// ── Step 5: Subjects (Multi-Select Dropdown) ──
function renderSubjects() {
  const opts = byId('ms-options');
  if (!opts) return;
  opts.innerHTML = SUPPORT_SUBJECTS.map((subj, i) =>
    `<div class="ms-opt ${sSubjects.includes(i)?'selected':''}" data-idx="${i}" onclick="msSelect(${i})">${subj}</div>`
  ).join('');
  updateMsLabel();
}

function msToggle() {
  const dd = byId('msDropdown');
  if (!dd) return;
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dd = byId('msDropdown');
  const trigger = byId('msTrigger');
  if (!dd || !trigger) return;
  if (dd.style.display !== 'none' && !dd.contains(e.target) && !trigger.contains(e.target)) {
    dd.style.display = 'none';
  }
});

function msSelect(idx) {
  const i = sSubjects.indexOf(idx);
  if (i === -1) sSubjects.push(idx); else sSubjects.splice(i, 1);
  const opts = byId('ms-options');
  if (opts) {
    const children = opts.children;
    for (let c of children) {
      if (parseInt(c.dataset.idx) === idx) c.classList.toggle('selected');
    }
  }
  updateMsLabel();
  updateMsTags();
  if (sSubjects.length > 0) {
    byId('s-submit-btn')&&(byId('s-submit-btn').style.display='block');
  } else {
    byId('s-submit-btn')&&(byId('s-submit-btn').style.display='none');
  }
}

function msRemove(idx) {
  msSelect(idx);
}

function updateMsLabel() {
  const lbl = byId('msLabel');
  if (lbl) lbl.textContent = sSubjects.length ? `تم اختيار ${sSubjects.length} مادة` : 'اختر المواد';
}

function updateMsTags() {
  const c = byId('msTags');
  if (!c) return;
  c.innerHTML = sSubjects.map(i =>
    `<span class="ms-tag">${SUPPORT_SUBJECTS[i]} <span class="ms-tag-rm" onclick="msRemove(${i})">×</span></span>`
  ).join('');
}

// ── Step 6: Submit (opens laws modal) ──
function onSubmitClick() {
  // Validate all fields
  const firstName = byId('sFirstName')?.value?.trim();
  const lastName = byId('sLastName')?.value?.trim();
  const birthDate = byId('sBirthDate')?.value;
  const phone = byId('sPhone')?.value?.trim();
  const parentName = byId('sParentName')?.value?.trim();
  const parentPhone = byId('sParentPhone')?.value?.trim();

  if (!firstName || !lastName || !birthDate || !phone || !parentName || !parentPhone) {
    alert('⚠️ الرجاء ملء جميع الحقول الإلزامية'); return;
  }
  if (!sStudentType) { alert('⚠️ الرجاء اختيار نوع الطالب'); return; }
  if (sStudentType === 'متمدرس' && !sLevel) { alert('⚠️ الرجاء اختيار المستوى الدراسي'); return; }
  if (!sInstitutionVal) { alert('⚠️ الرجاء اختيار المؤسسة التعليمية'); return; }
  if (sInstitutionVal === 'أخرى') {
    const instInp = byId('sInstitutionInput')?.value?.trim();
    if (!instInp) { alert('⚠️ الرجاء إدخال اسم المؤسسة التعليمية'); return; }
  }
  if (!sStream) { alert('⚠️ الرجاء اختيار الشعبة'); return; }
  if (sSubjects.length === 0) { alert('⚠️ الرجاء اختيار مادة واحدة على الأقل'); return; }

  // Determine institution value
  const institution = sInstitutionVal === 'أخرى'
    ? (byId('sInstitutionInput')?.value?.trim() || '')
    : sInstitutionVal;

  // Store form data for later submit
  sFormData = {
    id: '',
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
    parent_name: parentName,
    parent_phone: parentPhone,
    student_type: sStudentType,
    level: sLevel,
    institution,
    stream: sStream,
    subjects: sSubjects.map(i => SUPPORT_SUBJECTS[i]),
    terms_accepted: true,
    status: 'مسجل مبدئياً',
    fee_amount: 500,
  };

  // Generate 3-digit ID now
  const rand = String(Math.floor(Math.random() * 900) + 100);
  sFormData.id = rand;

  // Open laws modal
  openLawsModal();
}

// ── Laws Modal ──
function openLawsModal() {
  const lawsText = byId('laws-text');
  if (lawsText) {
    lawsText.innerHTML = SUPPORT_LAWS.map((l, i) =>
      `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;line-height:1.7;">
        <strong style="color:var(--gold,#c8a84b);">${i + 1}.</strong> ${l}
      </div>`
    ).join('');
  }
  byId('laws-checkbox-area')&&(byId('laws-checkbox-area').style.display='none');
  byId('lawsAgree')&&(byId('lawsAgree').checked=false);
  byId('lawsConfirmBtn')&&(byId('lawsConfirmBtn').disabled=true);
  closeSupportReg();
  const modal = byId('laws-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }

  // Reset scroll
  const area = byId('laws-scroll-area');
  if (area) { area.scrollTop = 0; }

  // Observe scroll position
  setTimeout(setupLawsScroll, 100);
}

function setupLawsScroll() {
  const area = byId('laws-scroll-area');
  const sentinel = byId('laws-bottom-sentinel');
  if (!area || !sentinel) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        byId('laws-checkbox-area')&&(byId('laws-checkbox-area').style.display='block');
        observer.disconnect();
      }
    });
  }, { root: area, threshold: 1.0 });

  observer.observe(sentinel);
}

function onLawsAgreeChange() {
  const cb = byId('lawsAgree');
  const btn = byId('lawsConfirmBtn');
  if (btn) btn.disabled = !cb.checked;
}

async function onLawsConfirm() {
  if (!sFormData) return;
  const btn = byId('lawsConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري التسجيل...'; }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(sFormData),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt.slice(0, 200));
    }

    // Success — close laws modal, open success modal
    closeLawsModal();
    openSuccessModal(sFormData.id);
  } catch (e) {
    alert('❌ فشل التسجيل: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'تأكيد التسجيل الأولي'; }
  }
}

function closeLawsModal() {
  const modal = byId('laws-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

function closeLawsModalOutside(e) {
  if (e.target === byId('laws-modal')) closeLawsModal();
}

// ── Success Modal ──
function openSuccessModal(id) {
  byId('success-id-display')&&(byId('success-id-display').textContent=id);
  const modal = byId('success-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
}

function closeSuccessModal() {
  const modal = byId('success-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  sFormData = null;
}

function closeSuccessModalOutside(e) {
  if (e.target === byId('success-modal')) closeSuccessModal();
}

// ── Admin helpers (used by admin-support.js) ──
async function loadRegistrations() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
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
