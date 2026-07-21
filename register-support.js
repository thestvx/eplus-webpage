// ═══════════════════════════════════════════════════════════
//  تسجيل الدعم المدرسي — نموذج صفحة واحدة
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.6GzLcHQBFQJukYpLMEbFjHhbZQHWFLCj3wlTLvPN0Dc';

const SUPPORT_STREAMS = {
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

const SUPPORT_LEVELS = [
  { label: 'السنة الأولى ابتدائي', disabled: true, icon: '🔒', group: 'المرحلة الابتدائية' },
  { label: 'السنة الثانية ابتدائي', disabled: true, icon: '🔒', group: 'المرحلة الابتدائية' },
  { label: 'السنة الثالثة ابتدائي', disabled: true, icon: '🔒', group: 'المرحلة الابتدائية' },
  { label: 'السنة الرابعة ابتدائي', disabled: true, icon: '🔒', group: 'المرحلة الابتدائية' },
  { label: 'السنة الخامسة ابتدائي', disabled: true, icon: '🔒', group: 'المرحلة الابتدائية' },
  { label: 'السنة الأولى متوسط', disabled: true, icon: '🔒', group: 'المرحلة المتوسطة' },
  { label: 'السنة الثانية متوسط', disabled: true, icon: '🔒', group: 'المرحلة المتوسطة' },
  { label: 'السنة الثالثة متوسط', disabled: true, icon: '🔒', group: 'المرحلة المتوسطة' },
  { label: 'السنة الرابعة متوسط', disabled: true, icon: '🔒', group: 'المرحلة المتوسطة' },
  { label: 'السنة الأولى ثانوي', disabled: true, icon: '🔒', group: 'المرحلة الثانوية' },
  { label: 'السنة الثانية ثانوي', disabled: true, icon: '🔒', group: 'المرحلة الثانوية' },
  { label: 'السنة الثالثة ثانوي (بكالوريا)', disabled: false, icon: '📖', group: 'المرحلة الثانوية' },
];

const SUPPORT_TERMS = [
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

let supportSelectedSubjects = [];

function byId(id) { return document.getElementById(id); }

// ── Open / Close ──
function openSupportReg() {
  supportSelectedSubjects = [];
  const form = byId('support-reg-form');
  if (form) form.reset();
  // Hide conditional sections
  byId('s-stream-group').style.display = 'none';
  byId('s-subjects-group').style.display = 'none';
  byId('s-institution-group').style.display = 'none';
  renderSupportLevels();
  renderSupportTerms();
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

// ── Render Levels ──
function renderSupportLevels() {
  const container = byId('s-levels-container');
  if (!container) return;
  let html = '';
  let currentGroup = '';
  SUPPORT_LEVELS.forEach(l => {
    if (l.group !== currentGroup) {
      currentGroup = l.group;
      html += `<div style="width:100%;font-size:12px;font-weight:700;color:var(--gold,#c8a84b);padding:6px 0 2px;border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;">${l.group}</div>`;
    }
    html += `<label class="check-option">
      <input type="radio" name="sLevel" value="${l.label}" ${l.disabled ? 'disabled' : ''} onchange="${l.disabled ? '' : "supportOnLevelChange(this.value)"}" />
      <span class="check-box"></span>
      <span class="check-label">${l.icon} ${l.label}${l.disabled ? ' — غير متاح' : ''}</span>
    </label>`;
  });
  container.innerHTML = html;
}

function supportOnLevelChange(val) {
  const isBac = val === 'السنة الثالثة ثانوي (بكالوريا)';
  byId('s-stream-group').style.display = isBac ? 'block' : 'none';
  byId('s-institution-group').style.display = isBac ? 'block' : 'none';
  byId('s-subjects-group').style.display = 'none';
  if (isBac) renderSupportStreams();
}

// ── Render Streams ──
function renderSupportStreams() {
  const container = byId('s-streams-container');
  if (!container) return;
  container.innerHTML = Object.keys(SUPPORT_STREAMS).map(s =>
    `<label class="check-option">
      <input type="radio" name="sStream" value="${s}" onchange="supportOnStreamChange('${s}')" />
      <span class="check-box"></span>
      <span class="check-label">${s}</span>
    </label>`
  ).join('');
}

function supportOnStreamChange(stream) {
  supportSelectedSubjects = [];
  renderSupportSubjects(stream);
  byId('s-subjects-group').style.display = 'block';
}

// ── Render Subjects ──
function renderSupportSubjects(stream) {
  const container = byId('s-subjects-container');
  if (!container) return;
  const items = SUPPORT_STREAMS[stream] || [];
  container.innerHTML = items.map((item, i) =>
    `<label class="check-option">
      <input type="checkbox" value="${i}" ${supportSelectedSubjects.includes(i) ? 'checked' : ''} onchange="supportToggleSubject(${i},this.checked)" />
      <span class="check-box"></span>
      <span class="check-label">${item.subject} — 🎓 ${item.teacher}</span>
    </label>`
  ).join('');
}

function supportToggleSubject(idx, checked) {
  if (checked) {
    if (!supportSelectedSubjects.includes(idx)) supportSelectedSubjects.push(idx);
  } else {
    supportSelectedSubjects = supportSelectedSubjects.filter(i => i !== idx);
  }
}

// ── Render Terms ──
function renderSupportTerms() {
  const container = byId('s-terms-container');
  if (!container) return;
  container.innerHTML = SUPPORT_TERMS.map(t =>
    `<label class="check-option">
      <input type="checkbox" class="s-term-cb" />
      <span class="check-box"></span>
      <span class="check-label">${t}</span>
    </label>`
  ).join('');
}

// ── Submit ──
async function supportSubmit(e) {
  e.preventDefault();
  const btn = byId('s-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري التسجيل...'; }

  try {
    // Validate
    const firstName = byId('sFirstName')?.value?.trim();
    const lastName = byId('sLastName')?.value?.trim();
    const birthDate = byId('sBirthDate')?.value;
    const phone = byId('sPhone')?.value?.trim();
    const parentName = byId('sParentName')?.value?.trim();
    const parentPhone = byId('sParentPhone')?.value?.trim();
    const studentType = document.querySelector('input[name="sStdType"]:checked');
    const level = document.querySelector('input[name="sLevel"]:checked');

    if (!firstName || !lastName || !birthDate || !phone || !parentName || !parentPhone) {
      throw new Error('الرجاء ملء جميع الحقول الإلزامية');
    }
    if (!studentType) throw new Error('الرجاء اختيار نوع الطالب');
    if (!level) throw new Error('الرجاء اختيار المستوى الدراسي');

    const levelVal = level.value;
    const isBac = levelVal === 'السنة الثالثة ثانوي (بكالوريا)';
    const institution = isBac ? (byId('sInstitution')?.value?.trim() || '') : '';
    const stream = isBac ? document.querySelector('input[name="sStream"]:checked') : null;

    if (isBac && !institution) throw new Error('الرجاء إدخال اسم المؤسسة التعليمية');
    if (isBac && !stream) throw new Error('الرجاء اختيار الشعبة');
    if (isBac && supportSelectedSubjects.length === 0) throw new Error('الرجاء اختيار مادة واحدة على الأقل');

    // Check terms
    const termCBs = document.querySelectorAll('#s-terms-container .s-term-cb');
    const termChecked = document.querySelectorAll('#s-terms-container .s-term-cb:checked');
    if (termChecked.length !== termCBs.length) throw new Error('الرجاء الموافقة على جميع القوانين والشروط');

    const selectedSubjects = isBac ? supportSelectedSubjects.map(i => SUPPORT_STREAMS[stream.value][i]) : [];
    const year = new Date().getFullYear();
    const rand = String(Math.floor(Math.random() * 90000) + 10000);
    const id = 'EP-' + year + '-' + rand;

    const payload = {
      id,
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      parent_name: parentName,
      parent_phone: parentPhone,
      student_type: studentType.value,
      level: levelVal,
      institution,
      stream: isBac ? stream.value : '',
      subjects: selectedSubjects,
      terms_accepted: true,
      status: 'مسجل مبدئياً',
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

    // Success
    const formView = byId('support-form-view');
    const successView = byId('support-success-view');
    if (formView) formView.style.display = 'none';
    if (successView) {
      successView.style.display = 'block';
      successView.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">✅ تم تأكيد تسجيلك الأولي</h3>
          <button class="close-btn" onclick="closeSupportReg()" type="button">✕</button>
        </div>
        <div style="padding:20px;text-align:center;">
          <div style="font-size:42px;margin-bottom:8px;">🎉</div>
          <div style="font-size:17px;font-weight:800;color:#10b981;margin-bottom:12px;">تم تأكيد تسجيلك الأولي بنجاح!</div>
          <div style="background:rgba(200,168,75,0.07);border:1px solid rgba(200,168,75,0.2);border-radius:10px;padding:12px;margin:10px 0;">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">رقم التلميذ الخاص بك:</div>
            <div style="font-size:24px;font-weight:900;color:var(--gold,#c8a84b);letter-spacing:1px;direction:ltr;">${id}</div>
          </div>
          <div style="font-size:12px;line-height:1.7;color:var(--text-muted);margin:14px 0;text-align:right;">
            🆔 <strong>هذا الرقم سيرافقك طوال مدة تسجيلك</strong> في المركز التعليمي، احتفظ به جيداً.<br><br>
            🏫 <strong>لإتمام تسجيلك النهائي:</strong><br>
            • تفضل بزيارة المركز التعليمي شخصياً.<br>
            • أحضر معك رقم التسجيل الخاص بك.<br>
            • قم بدفع حقوق التسجيل المقدرة بـ <strong style="color:var(--gold,#c8a84b);">500 دج</strong>.<br><br>
            ✨ نتمنى لك مسيرة تعليمية موفقة! 🌟
          </div>
          <button class="ep-btn-primary submit-btn" onclick="closeSupportReg()" style="margin-top:8px;">تم</button>
        </div>
      `;
    }
  } catch (e) {
    alert(e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'إتمام التسجيل ✦'; }
  }
}

// ── Admin: Load / Confirm ──
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
