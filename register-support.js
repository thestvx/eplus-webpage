// ═══════════════════════════════════════════════════════════
//  تسجيل الدعم المدرسي - School Support Registration v2
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.6GzLcHQBFQJukYpLMEbFjHhbZQHWFLCj3wlTLvPN0Dc';

const STREAMS = {
  'علوم تجريبية': [
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teacher: 'نمسي عبد الرحمان' },
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teacher: 'لكموته لمين' },
    { subject: 'رياضيات', teacher: 'نعورة عبدالباسط' },
    { subject: 'رياضيات', teacher: 'ترعة فاطمة' },
    { subject: 'علوم الطبيعة و الحياة', teacher: 'شكري صحراوي' },
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
  'القوانين الداخلية للمركز ملزمة للجميع. الموافقة على القوانين شرط أساسي للتسجيل.',
  'أتحمل المسؤولية الكاملة عن صحة المعلومات المقدمة.',
];

const LEVELS = [
  { label: 'السنة الأولى ثانوي', disabled: true, icon: '🔒' },
  { label: 'السنة الثانية ثانوي', disabled: true, icon: '🔒' },
  { label: 'السنة الثالثة ثانوي (البكالوريا)', disabled: false, icon: '📖' },
];

let regStep = 1;
let regData = {};

async function openSupportReg() {
  regStep = 1;
  regData = {};
  const modal = document.getElementById('reg-support-modal');
  modal.style.display = 'flex';
  modal.classList.add('active');
  renderRegStep();
}

function closeSupportReg() {
  const modal = document.getElementById('reg-support-modal');
  modal.classList.remove('active');
  modal.style.display = 'none';
}

function renderRegStep() {
  const container = document.getElementById('reg-support-content');
  if (!container) return;

  const totalSteps = 6;
  const dots = Array.from({ length: totalSteps }, (_, i) => {
    const s = i + 1;
    let cls = 'reg-step-dot';
    if (s === regStep) cls += ' active';
    else if (s < regStep) cls += ' done';
    return `<span class="${cls}">${s}</span>`;
  }).join('');

  let html = `<div class="reg-progress">${dots}</div>`;

  switch (regStep) {
    case 1: html += renderStep1(); break;
    case 2: html += renderStep2(); break;
    case 3: html += renderStep3(); break;
    case 4: html += renderStep4(); break;
    case 5: html += renderStep5(); break;
    case 6: html += renderStep6(); break;
  }

  container.innerHTML = html;
}

// ── Step 1: Personal Info ──
function renderStep1() {
  return `
    <div class="reg-step-title">📝 المعلومات الشخصية</div>
    <div class="reg-field">
      <label>الاسم <span style="color:var(--gold,#c8a84b)">*</span></label>
      <input id="rFirstName" value="${esc(regData.firstName || '')}" placeholder="الاسم" dir="auto">
    </div>
    <div class="reg-field">
      <label>اللقب <span style="color:var(--gold,#c8a84b)">*</span></label>
      <input id="rLastName" value="${esc(regData.lastName || '')}" placeholder="اللقب" dir="auto">
    </div>
    <div class="reg-field">
      <label>تاريخ الميلاد <span style="color:var(--gold,#c8a84b)">*</span></label>
      <input id="rBirthDate" type="date" value="${esc(regData.birthDate || '')}">
    </div>
    <div class="reg-field">
      <label>اسم ولي الأمر <span style="color:var(--gold,#c8a84b)">*</span></label>
      <input id="rParentName" value="${esc(regData.parentName || '')}" placeholder="اسم ولي الأمر" dir="auto">
    </div>
    <div class="reg-field">
      <label>رقم ولي الأمر <span style="color:var(--gold,#c8a84b)">*</span></label>
      <input id="rParentPhone" value="${esc(regData.parentPhone || '')}" placeholder="05XX XX XX XX" dir="ltr">
    </div>
    <div class="reg-nav-btns">
      <button class="reg-btn" onclick="regNextStep()">التالي ←</button>
    </div>
  `;
}

// ── Step 2: Student type + Level ──
function renderStep2() {
  const type = regData.studentType || '';
  const selLevel = regData.level || '';

  let html = `<div class="reg-step-title">🎓 نوع الطالب والمستوى الدراسي</div>`;

  html += `<div class="reg-field"><label>نوع الطالب <span style="color:var(--gold,#c8a84b)">*</span></label>`;
  html += `<div class="reg-radio-group">
    <label class="reg-radio ${type === 'مدرسي' ? 'selected' : ''}" onclick="pickStudentType('مدرسي',this)">
      <input type="radio" name="rStdType" value="مدرسي" ${type === 'مدرسي' ? 'checked' : ''}> طالب مدرسي
    </label>
    <label class="reg-radio ${type === 'حُر' ? 'selected' : ''}" onclick="pickStudentType('حُر',this)">
      <input type="radio" name="rStdType" value="حُر" ${type === 'حُر' ? 'checked' : ''}> طالب حُر
    </label>
  </div></div>`;

  html += `<div class="reg-field"><label>المستوى الدراسي <span style="color:var(--gold,#c8a84b)">*</span></label><div class="reg-levels-grid">`;
  LEVELS.forEach(l => {
    const active = l.disabled ? 'disabled' : '';
    const sel = l.label === selLevel ? 'selected' : '';
    html += `<div class="reg-level-card ${active} ${sel}" onclick="${l.disabled ? '' : "pickLevel('" + esc(l.label) + "',this)"}">
      <div style="font-size:16px;margin-bottom:2px">${l.icon}</div>
      ${l.label}
      ${l.disabled ? '<div style="font-size:10px;opacity:0.5;margin-top:4px">غير متاح</div>' : ''}
    </div>`;
  });
  html += `</div></div>`;

  html += `<div class="reg-nav-btns">
    <button class="reg-btn reg-btn-secondary" onclick="regPrevStep()">→ السابق</button>
    <button class="reg-btn" onclick="regNextStep()">التالي ←</button>
  </div>`;
  return html;
}

function pickStudentType(val, el) {
  document.querySelectorAll('.reg-radio.selected').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input').checked = true;
  regData.studentType = val;
}

function pickLevel(label, el) {
  document.querySelectorAll('.reg-level-card.selected').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  regData.level = label;
}

// ── Step 3: Stream ──
function renderStep3() {
  const names = Object.keys(STREAMS);
  const sel = regData.stream || '';

  let html = `<div class="reg-step-title">📚 اختر الشعبة</div>`;
  html += `<div class="reg-field"><label>الشعب المتاحة <span style="color:var(--gold,#c8a84b)">*</span></label><div class="reg-streams-grid">`;
  names.forEach(s => {
    const c = s === sel ? 'selected' : '';
    html += `<div class="reg-stream-card ${c}" onclick="pickStream('${esc(s)}',this)">${s}</div>`;
  });
  html += `</div></div>`;

  html += `<div class="reg-nav-btns">
    <button class="reg-btn reg-btn-secondary" onclick="regPrevStep()">→ السابق</button>
    <button class="reg-btn" onclick="regNextStep()">التالي ←</button>
  </div>`;
  return html;
}

function pickStream(val, el) {
  document.querySelectorAll('.reg-stream-card.selected').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  regData.stream = val;
}

// ── Step 4: Subjects ──
function renderStep4() {
  const items = STREAMS[regData.stream] || [];
  if (!regData.selectedSubjects) regData.selectedSubjects = [];

  let html = `<div class="reg-step-title">📖 اختر المواد والأساتذة</div>`;
  html += `<div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:10px">الشعبة: <strong style="color:var(--gold,#c8a84b)">${esc(regData.stream)}</strong></div>`;

  if (items.length === 0) {
    html += `<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4)">لا توجد مواد متاحة لهذه الشعبة</div>`;
  } else {
    html += `<div class="reg-subjects-list">`;
    items.forEach((item, i) => {
      const checked = regData.selectedSubjects.includes(i);
      html += `<label class="reg-subj-item ${checked ? 'checked' : ''}" onclick="toggleSubject(${i})">
        <input type="checkbox" ${checked ? 'checked' : ''}>
        <span class="reg-subj-name">${esc(item.subject)}</span>
        <span class="reg-teacher-name">🎓 ${esc(item.teacher)}</span>
      </label>`;
    });
    html += `</div>`;
  }

  html += `<div class="reg-nav-btns">
    <button class="reg-btn reg-btn-secondary" onclick="regPrevStep()">→ السابق</button>
    <button class="reg-btn" onclick="regNextStep()">إتمام التسجيل ←</button>
  </div>`;
  return html;
}

function toggleSubject(idx) {
  if (!regData.selectedSubjects) regData.selectedSubjects = [];
  const pos = regData.selectedSubjects.indexOf(idx);
  if (pos === -1) regData.selectedSubjects.push(idx);
  else regData.selectedSubjects.splice(pos, 1);
  renderRegStep();
}

// ── Step 5: Terms ──
function renderStep5() {
  let html = `<div class="reg-step-title">⚖️ القوانين والشروط</div>`;
  html += `<div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:12px">يرجى قراءة القوانين التالية والموافقة عليها جميعاً لإتمام التسجيل</div>`;
  html += `<div class="reg-terms-list">`;
  TERMS.forEach((t, i) => {
    html += `<label class="reg-term-item">
      <input type="checkbox" class="reg-term-cb" data-idx="${i}" onchange="checkTerms()">
      <span>${esc(t)}</span>
    </label>`;
  });
  html += `</div>`;
  html += `<div style="font-size:12px;color:rgba(255,255,255,0.4);margin:8px 0;padding:8px;background:rgba(200,168,75,0.08);border-radius:8px;text-align:center">
    ⚠️ بالموافقة على هذه القوانين، أتحمل المسؤولية الكاملة عن صحة المعلومات المقدمة وألتزم بجميع الشروط المذكورة أعلاه.
  </div>`;
  html += `<div class="reg-nav-btns">
    <button class="reg-btn reg-btn-secondary" onclick="regPrevStep()">→ السابق</button>
    <button class="reg-btn" id="rConfirmBtn" onclick="confirmRegistration()" disabled>✅ تأكيد التسجيل الأولي</button>
  </div>`;
  return html;
}

function checkTerms() {
  const all = document.querySelectorAll('.reg-term-cb');
  const checked = document.querySelectorAll('.reg-term-cb:checked');
  document.getElementById('rConfirmBtn').disabled = checked.length !== all.length;
}

// ── Step 6: Success ──
function renderStep6() {
  const id = regData.generatedId || '';
  return `
    <div class="reg-success">
      <div class="reg-success-icon">🎉</div>
      <div class="reg-success-title">✅ تم تأكيد تسجيلك الأولي بنجاح!</div>
      <div class="reg-success-msg" style="font-size:15px;font-weight:600;color:rgba(255,255,255,0.8)">
        رقم التلميذ الخاص بك هو:
      </div>
      <div class="reg-success-id">
        <div class="reg-id-badge" style="direction:ltr;font-size:24px">${id}</div>
      </div>
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:14px;margin:14px 0;text-align:right">
        <div style="font-size:14px;line-height:1.8;color:rgba(255,255,255,0.75)">
          🆔 <strong>هذا الرقم سيرافقك طوال مدة تسجيلك في المركز التعليمي</strong>، احتفظ به جيداً ولا تشاركه مع أي شخص.<br><br>
          🏫 <strong>لإتمام تسجيلك النهائي:</strong><br>
          • تفضل بزيارة المركز التعليمي شخصياً.<br>
          • أحضر معك رقم التسجيل الخاص بك.<br>
          • قم بدفع حقوق التسجيل المقدرة بـ <strong style="color:var(--gold,#c8a84b)">500 دج</strong>.<br><br>
          ✨ نتمنى لك مسيرة تعليمية موفقة ومليئة بالنجاح والتفوق! 🌟
        </div>
      </div>
      <button class="reg-btn" onclick="closeSupportReg()" style="margin-top:8px">تم</button>
    </div>
  `;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ── Navigation ──
function regNextStep() {
  if (regStep === 1) {
    regData.firstName = document.getElementById('rFirstName')?.value?.trim();
    regData.lastName = document.getElementById('rLastName')?.value?.trim();
    regData.birthDate = document.getElementById('rBirthDate')?.value;
    regData.parentName = document.getElementById('rParentName')?.value?.trim();
    regData.parentPhone = document.getElementById('rParentPhone')?.value?.trim();
    if (!regData.firstName || !regData.lastName || !regData.birthDate || !regData.parentName || !regData.parentPhone) {
      alert('الرجاء ملء جميع الحقول الإلزامية');
      return;
    }
  }
  if (regStep === 2) {
    if (!regData.studentType) { alert('الرجاء اختيار نوع الطالب'); return; }
    if (!regData.level) { alert('الرجاء اختيار المستوى الدراسي'); return; }
  }
  if (regStep === 3) {
    if (!regData.stream) { alert('الرجاء اختيار الشعبة'); return; }
  }
  if (regStep === 4) {
    if (!regData.selectedSubjects || regData.selectedSubjects.length === 0) {
      alert('الرجاء اختيار مادة واحدة على الأقل');
      return;
    }
    if (!regData.stream || !STREAMS[regData.stream]) { alert('الرجاء اختيار الشعبة أولاً'); return; }
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
  const btn = document.getElementById('rConfirmBtn');
  if (spinner) spinner.style.display = 'flex';
  if (btn) btn.disabled = true;

  try {
    const selectedSubjects = (regData.selectedSubjects || []).map(i => STREAMS[regData.stream][i]);

    const year = new Date().getFullYear();
    const rand = String(Math.floor(Math.random() * 90000) + 10000);
    const id = 'EP-' + year + '-' + rand;

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
    regStep = 6;
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
    return await res.json();
  } catch (e) {
    console.error('Failed to load registrations:', e);
    return [];
  }
}
