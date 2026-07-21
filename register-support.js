// ═══════════════════════════════════════════════════════════
//  تسجيل الدعم المدرسي - School Support Registration
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.6GzLcHQBFQJukYpLMEbFjHhbZQHWFLCj3wlTLvPN0Dc';

const STREAMS = {
  'علوم تجريبية': [
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teacher: 'نمسي عبد الرحمان' },
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teacher: 'لكموته لمين' },
    { subject: 'رياضيات', teacher: 'نعورة عبدالباسط' },
    { subject: 'رياضيات', teacher: 'ترعة فاطمة' },
    { subject: 'علوم الطبيعة والحياة', teacher: 'شكري صحراوي' },
    { subject: 'عربية', teacher: 'موساوي زبيدة' },
    { subject: 'فرنسية', teacher: 'كروش شمس الهدى' },
    { subject: 'انجليزية', teacher: 'كرام الصادق' },
    { subject: 'علوم اسلامية', teacher: 'هبيته ربيع' },
    { subject: 'اجتماعيات', teacher: 'ايمن دخان' },
    { subject: 'فلسفة', teacher: 'دادة نجاح سلام' },
  ],
  'رياضيات': [
    { subject: 'العلوم الفيزيائية', teacher: 'نمسي عبد الرحمان' },
    { subject: 'العلوم الفيزيائية', teacher: 'لكموته لمين' },
    { subject: 'رياضيات', teacher: 'نعورة عبد الباسط' },
    { subject: 'رياضيات', teacher: 'ترعة فاطمة' },
    { subject: 'عربية', teacher: 'موساوي زبيدة' },
    { subject: 'فرنسية', teacher: 'كروش شمس الهدى' },
    { subject: 'انجليزية', teacher: 'كرام الصادق' },
    { subject: 'علوم اسلامية', teacher: 'هبيته ربيع' },
    { subject: 'اجتماعيات', teacher: 'ايمن دخان' },
    { subject: 'فلسفة', teacher: 'دادة نجاح سلام' },
  ],
  'تسيير واقتصاد': [
    { subject: 'عربية', teacher: 'موساوي زبيدة' },
    { subject: 'فرنسية', teacher: 'كروش شمس الهدى' },
    { subject: 'انجليزية', teacher: 'كرام الصادق' },
    { subject: 'محاسبة', teacher: 'عبد الرحمان سرهود' },
    { subject: 'علوم اسلامية', teacher: 'هبيته ربيع' },
    { subject: 'اجتماعيات', teacher: 'ايمن دخان' },
    { subject: 'فلسفة', teacher: 'دادة نجاح سلام' },
  ],
  'تقني رياضي': [
    { subject: 'العلوم الفيزيائية', teacher: 'نمسي عبد الرحمان' },
    { subject: 'العلوم الفيزيائية', teacher: 'لكموته لمين' },
    { subject: 'فرنسية', teacher: 'كروش شمس الهدى' },
    { subject: 'انجليزية', teacher: 'كرام الصادق' },
    { subject: 'علوم اسلامية', teacher: 'هبيته ربيع' },
    { subject: 'اجتماعيات', teacher: 'ايمن دخان' },
    { subject: 'فلسفة', teacher: 'دادة نجاح سلام' },
  ],
  'آداب ولغات': [
    { subject: 'عربية', teacher: 'موساوي زبيدة' },
    { subject: 'فلسفة', teacher: 'دادة نجاح سلام' },
    { subject: 'فرنسية', teacher: 'كروش شمس الهدى' },
    { subject: 'انجليزية', teacher: 'كرام الصادق' },
    { subject: 'المانية', teacher: 'حمزة علال' },
    { subject: 'اسبانية', teacher: 'طوالبية ابراهيم' },
    { subject: 'رياضيات ادبيين', teacher: 'هبيته ربيع' },
    { subject: 'علوم اسلامية', teacher: 'هبيته ربيع' },
    { subject: 'اجتماعيات', teacher: 'ايمن دخان' },
  ],
};

const TERMS = [
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
  'القوانين الداخلية للمركز ملزمة للجميع.الموافقة على القوانين شرط أساسي للتسجيل.',
];

let regStep = 1;
let regData = {};

async function openSupportReg() {
  regStep = 1;
  regData = {};
  document.getElementById('reg-support-modal').classList.add('open');
  renderRegStep();
}

function closeSupportReg() {
  document.getElementById('reg-support-modal').classList.remove('open');
}

function renderRegStep() {
  const container = document.getElementById('reg-support-content');
  if (!container) return;

  let html = '';
  const progress = [1, 2, 3, 4, 5].map(s =>
    `<span class="reg-step-dot ${s === regStep ? 'active' : (s < regStep ? 'done' : '')}">${s}</span>`
  ).join(' → ');

  html += `<div class="reg-progress">${progress}</div>`;

  switch (regStep) {
    case 1: html += renderStep1(); break;
    case 2: html += renderStep2(); break;
    case 3: html += renderStep3(); break;
    case 4: html += renderStep4(); break;
    case 5: html += renderStep5(); break;
  }

  container.innerHTML = html;
}

// ── Step 1: Personal Info ──
function renderStep1() {
  return `
    <div class="reg-step-title">📝 المعلومات الشخصية</div>
    <div class="reg-field">
      <label>الاسم</label>
      <input id="regFirstName" value="${regData.firstName || ''}" placeholder="الاسم">
    </div>
    <div class="reg-field">
      <label>اللقب</label>
      <input id="regLastName" value="${regData.lastName || ''}" placeholder="اللقب">
    </div>
    <div class="reg-field">
      <label>تاريخ الميلاد</label>
      <input id="regBirthDate" type="date" value="${regData.birthDate || ''}">
    </div>
    <div class="reg-field">
      <label>اسم ولي الأمر</label>
      <input id="regParentName" value="${regData.parentName || ''}" placeholder="اسم ولي الأمر">
    </div>
    <div class="reg-field">
      <label>رقم ولي الأمر</label>
      <input id="regParentPhone" value="${regData.parentPhone || ''}" placeholder="05XX XX XX XX">
    </div>
    <button class="reg-btn" onclick="regNextStep()">التالي ←</button>
  `;
}

// ── Step 2: Student Type & Level ──
function renderStep2() {
  const levels = [
    'التحضيري', 'السنة الأولى', 'السنة الثانية', 'السنة الثالثة',
    'السنة الرابعة', 'السنة الخامسة', 'السنة الأولى متوسط',
    'السنة الثانية متوسط', 'السنة الثالثة متوسط', 'السنة الرابعة متوسط',
    'السنة الأولى ثانوي', 'السنة الثانية ثانوي',
    'السنة الثالثة ثانوي (البكالوريا)'
  ];
  const type = regData.studentType || '';

  let html = `<div class="reg-step-title">🎓 نوع الطالب والمستوى</div>`;

  html += `<div class="reg-field"><label>نوع الطالب</label>`;
  html += `<div class="reg-radio-group">
    <label class="reg-radio ${type === 'مدرسي' ? 'selected' : ''}">
      <input type="radio" name="studentType" value="مدرسي" ${type === 'مدرسي' ? 'checked' : ''} onchange="regData.studentType=this.value"> طالب مدرسي
    </label>
    <label class="reg-radio ${type === 'حُر' ? 'selected' : ''}">
      <input type="radio" name="studentType" value="حُر" ${type === 'حُر' ? 'checked' : ''} onchange="regData.studentType=this.value"> طالب حُر
    </label>
  </div></div>`;

  const selectedLevel = regData.level || '';
  html += `<div class="reg-field"><label>المستوى الدراسي</label><div class="reg-levels-grid">`;
  levels.forEach(l => {
    const isBac = l === 'السنة الثالثة ثانوي (البكالوريا)';
    const active = isBac ? '' : 'disabled';
    const sel = l === selectedLevel ? 'selected' : '';
    html += `<div class="reg-level-card ${active} ${sel}" onclick="${isBac ? "selectLevel(this,'" + l + "')" : ""}">
      ${isBac ? '' : '🔒 '}${l}
    </div>`;
  });
  html += `</div></div>`;

  html += `<div class="reg-nav-btns">
    <button class="reg-btn reg-btn-secondary" onclick="regPrevStep()">→ السابق</button>
    <button class="reg-btn" onclick="regNextStep()">التالي ←</button>
  </div>`;
  return html;
}

function selectLevel(el, level) {
  document.querySelectorAll('.reg-level-card.selected').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  regData.level = level;
}

// ── Step 3: Stream & Subjects ──
function renderStep3() {
  const streamNames = Object.keys(STREAMS);
  const selected = regData.stream || '';

  let html = `<div class="reg-step-title">📚 الشعبة والمواد</div>`;

  html += `<div class="reg-field"><label>اختر شعبتك</label><div class="reg-streams-grid">`;
  streamNames.forEach(s => {
    const sel = s === selected ? 'selected' : '';
    html += `<div class="reg-stream-card ${sel}" onclick="selectStream(this,'${s}')">${s}</div>`;
  });
  html += `</div></div>`;

  if (regData.stream && STREAMS[regData.stream]) {
    html += `<div class="reg-field"><label>المواد والأساتذة</label><div class="reg-subjects-list">`;
    STREAMS[regData.stream].forEach((item, i) => {
      const checked = regData.selectedSubjects ? regData.selectedSubjects.includes(i) : true;
      html += `<label class="reg-subj-item">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleSubject(${i},this.checked)">
        <span class="reg-subj-name">${item.subject}</span>
        <span class="reg-teacher-name">🎓 ${item.teacher}</span>
      </label>`;
    });
    html += `</div></div>`;
  }

  html += `<div class="reg-nav-btns">
    <button class="reg-btn reg-btn-secondary" onclick="regPrevStep()">→ السابق</button>
    <button class="reg-btn" onclick="regNextStep()">التالي ←</button>
  </div>`;
  return html;
}

function selectStream(el, stream) {
  document.querySelectorAll('.reg-stream-card.selected').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  regData.stream = stream;
  regData.selectedSubjects = [];
  renderRegStep();
}

function toggleSubject(idx, checked) {
  if (!regData.selectedSubjects) regData.selectedSubjects = [];
  if (checked) {
    if (!regData.selectedSubjects.includes(idx)) regData.selectedSubjects.push(idx);
  } else {
    regData.selectedSubjects = regData.selectedSubjects.filter(i => i !== idx);
  }
}

// ── Step 4: Terms ──
function renderStep4() {
  let html = `<div class="reg-step-title">⚖️ القوانين والشروط</div>`;
  html += `<div class="reg-terms-list">`;
  TERMS.forEach((t, i) => {
    html += `<label class="reg-term-item">
      <input type="checkbox" onchange="checkTerms()" class="reg-term-cb">
      <span>${t}</span>
    </label>`;
  });
  html += `</div>`;
  html += `<div class="reg-nav-btns">
    <button class="reg-btn reg-btn-secondary" onclick="regPrevStep()">→ السابق</button>
    <button class="reg-btn" id="regConfirmBtn" onclick="confirmRegistration()" disabled>✅ تأكيد التسجيل</button>
  </div>`;
  return html;
}

function checkTerms() {
  const allChecked = document.querySelectorAll('.reg-term-cb:checked').length === TERMS.length;
  document.getElementById('regConfirmBtn').disabled = !allChecked;
}

// ── Step 5: Success ──
function renderStep5() {
  const id = regData.generatedId || '';
  return `
    <div class="reg-success">
      <div class="reg-success-icon">🎉</div>
      <div class="reg-success-title">تم تأكيد تسجيلك الأولي بنجاح!</div>
      <div class="reg-success-id">
        <div>رقم التلميذ الخاص بك:</div>
        <div class="reg-id-badge">${id}</div>
      </div>
      <div class="reg-success-msg">
        📌 يجب حفظ هذا الرقم جيداً، ستحتاجه لتأكيد تسجيلك النهائي.<br><br>
        🏫 تفضل بزيارة المركز التعليمي لتأكيد تسجيلك النهائي ودفع حقوق التسجيل المقدرة بـ <strong>500 دج</strong>.
      </div>
      <button class="reg-btn" onclick="closeSupportReg()">تم</button>
    </div>
  `;
}

// ── Navigation ──
function regNextStep() {
  if (regStep === 1) {
    regData.firstName = document.getElementById('regFirstName')?.value?.trim();
    regData.lastName = document.getElementById('regLastName')?.value?.trim();
    regData.birthDate = document.getElementById('regBirthDate')?.value;
    regData.parentName = document.getElementById('regParentName')?.value?.trim();
    regData.parentPhone = document.getElementById('regParentPhone')?.value?.trim();
    if (!regData.firstName || !regData.lastName || !regData.birthDate || !regData.parentName || !regData.parentPhone) {
      alert('الرجاء ملء جميع الحقول');
      return;
    }
  }
  if (regStep === 2) {
    if (!regData.studentType) { alert('الرجاء اختيار نوع الطالب'); return; }
    if (!regData.level) { alert('الرجاء اختيار المستوى الدراسي'); return; }
  }
  if (regStep === 3) {
    if (!regData.stream) { alert('الرجاء اختيار الشعبة'); return; }
    if (!regData.selectedSubjects || regData.selectedSubjects.length === 0) { alert('الرجاء اختيار مادة واحدة على الأقل'); return; }
  }
  regStep++;
  renderRegStep();
}

function regPrevStep() {
  if (regStep > 1) regStep--;
  renderRegStep();
}

// ── Submit to Supabase ──
async function confirmRegistration() {
  const spinner = document.getElementById('reg-spinner');
  const btn = document.getElementById('regConfirmBtn');
  if (spinner) spinner.style.display = 'flex';
  if (btn) btn.disabled = true;

  try {
    const selectedSubjects = (regData.selectedSubjects || []).map(i => STREAMS[regData.stream][i]);

    const id = 'EP-' + new Date().getFullYear() + '-' +
      String(Math.floor(Math.random() * 90000) + 10000);

    const payload = {
      id,
      first_name: regData.firstName,
      last_name: regData.lastName,
      birth_date: regData.birthDate,
      parent_name: regData.parentName,
      parent_phone: regData.parentPhone,
      student_type: regData.studentType,
      level: regData.level,
      stream: regData.stream,
      subjects: selectedSubjects,
      terms_accepted: true,
      status: 'pending',
      fee_amount: 500,
    };

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

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt.slice(0, 200));
    }

    regData.generatedId = id;
    regStep = 5;
    renderRegStep();
  } catch (e) {
    alert('حدث خطأ أثناء التسجيل: ' + e.message);
    if (btn) btn.disabled = false;
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

// ── Admin: View Registrations ──
async function loadRegistrations() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('Failed to load registrations:', e);
    return [];
  }
}
