// ═══════════════════════════════════════════════════════════
//  تسجيل الدعم المدرسي — Support Registration
//  يستخدم نفس مكون استمارة التسجيل تماماً، مع تغيير الحقول فقط
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

let supportStep = 1;
const supportData = { selectedSubjects: [] };

function byId(id) { return document.getElementById(id); }

// ── Open / Close ──
function openSupportReg() {
  supportStep = 1;
  Object.keys(supportData).forEach(k => {
    if (Array.isArray(supportData[k])) supportData[k] = [];
    else supportData[k] = undefined;
  });
  supportData.selectedSubjects = [];
  const modal = byId('support-reg-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
  renderSupportStreams();
  supportRenderStep();
}

function closeSupportReg() {
  const modal = byId('support-reg-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

function closeSupportRegOutside(e) {
  if (e.target === byId('support-reg-modal')) closeSupportReg();
}

// ── Render dynamic content ──
function renderSupportStreams() {
  const container = byId('s-streams-container');
  if (!container) return;
  container.innerHTML = Object.keys(SUPPORT_STREAMS).map(s =>
    `<label class="check-option">
      <input type="radio" name="sStream" value="${s}" onchange="supportData.stream='${s}'" />
      <span class="check-box"></span>
      <span class="check-label">${s}</span>
    </label>`
  ).join('');
}

function renderSupportSubjects() {
  const container = byId('s-subjects-container');
  if (!container || !supportData.stream) return;
  const items = SUPPORT_STREAMS[supportData.stream] || [];
  container.innerHTML = items.map((item, i) =>
    `<label class="check-option">
      <input type="checkbox" value="${i}" ${supportData.selectedSubjects.includes(i) ? 'checked' : ''} onchange="supportToggleSubject(${i},this.checked)" />
      <span class="check-box"></span>
      <span class="check-label">${item.subject} — 🎓 ${item.teacher}</span>
    </label>`
  ).join('');
}

function supportToggleSubject(idx, checked) {
  if (checked) {
    if (!supportData.selectedSubjects.includes(idx)) supportData.selectedSubjects.push(idx);
  } else {
    supportData.selectedSubjects = supportData.selectedSubjects.filter(i => i !== idx);
  }
}

function renderSupportTerms() {
  const container = byId('s-terms-container');
  if (!container) return;
  container.innerHTML = SUPPORT_TERMS.map((t, i) =>
    `<label class="check-option">
      <input type="checkbox" class="s-term-cb" onchange="supportCheckTerms()" />
      <span class="check-box"></span>
      <span class="check-label">${t}</span>
    </label>`
  ).join('');
}

function supportCheckTerms() {
  const all = document.querySelectorAll('#s-terms-container .s-term-cb');
  const checked = document.querySelectorAll('#s-terms-container .s-term-cb:checked');
  byId('s-btn-confirm').disabled = checked.length !== all.length;
}

// ── Step rendering ──
function supportRenderStep() {
  for (let i = 1; i <= 5; i++) {
    const el = byId('support-step-' + i);
    if (el) el.style.display = i === supportStep ? 'block' : 'none';
  }

  // Dynamic content per step
  if (supportStep === 4) renderSupportSubjects();
  if (supportStep === 5) { renderSupportTerms(); supportCheckTerms(); }

  // Buttons
  byId('s-btn-prev').style.display = supportStep > 1 ? 'block' : 'none';
  const nextBtn = byId('s-btn-next');
  const confirmBtn = byId('s-btn-confirm');
  if (nextBtn) {
    nextBtn.style.display = supportStep < 5 ? 'block' : 'none';
    nextBtn.textContent = supportStep === 4 ? 'إتمام التسجيل ←' : 'التالي ←';
  }
  if (confirmBtn) confirmBtn.style.display = supportStep === 5 ? 'block' : 'none';
}

// ── Navigation ──
function supportNextStep() {
  if (supportStep === 1) {
    const fn = byId('sFirstName')?.value?.trim();
    const ln = byId('sLastName')?.value?.trim();
    const bd = byId('sBirthDate')?.value;
    const pn = byId('sParentName')?.value?.trim();
    const pp = byId('sParentPhone')?.value?.trim();
    if (!fn || !ln || !bd || !pn || !pp) {
      alert('الرجاء ملء جميع الحقول الإلزامية');
      return;
    }
    supportData.firstName = fn;
    supportData.lastName = ln;
    supportData.birthDate = bd;
    supportData.parentName = pn;
    supportData.parentPhone = pp;
  }
  if (supportStep === 2) {
    if (!supportData.studentType) { alert('الرجاء اختيار نوع الطالب'); return; }
    if (!supportData.level) { alert('الرجاء اختيار المستوى الدراسي'); return; }
  }
  if (supportStep === 3) {
    const checked = document.querySelector('input[name="sStream"]:checked');
    if (!checked) { alert('الرجاء اختيار الشعبة'); return; }
    supportData.stream = checked.value;
  }
  if (supportStep === 4) {
    if (!supportData.selectedSubjects || supportData.selectedSubjects.length === 0) {
      alert('الرجاء اختيار مادة واحدة على الأقل');
      return;
    }
  }
  if (supportStep < 5) { supportStep++; supportRenderStep(); }
}

function supportPrevStep() {
  if (supportStep > 1) { supportStep--; supportRenderStep(); }
}

// ── Submit ──
async function supportConfirm() {
  const btn = byId('s-btn-confirm');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري التسجيل...'; }

  try {
    const selectedSubjects = (supportData.selectedSubjects || []).map(i => SUPPORT_STREAMS[supportData.stream][i]);
    const year = new Date().getFullYear();
    const rand = String(Math.floor(Math.random() * 90000) + 10000);
    const id = 'EP-' + year + '-' + rand;

    const payload = {
      id,
      first_name: supportData.firstName,
      last_name: supportData.lastName,
      birth_date: supportData.birthDate,
      parent_name: supportData.parentName,
      parent_phone: supportData.parentPhone,
      student_type: supportData.studentType,
      level: supportData.level,
      stream: supportData.stream,
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

    // Show success
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
            🆔 <strong>هذا الرقم سيرافقك طوال مدة تسجيلك</strong> في المركز التعليمي، احتفظ به جيداً ولا تشاركه مع أي شخص.<br><br>
            🏫 <strong>لإتمام تسجيلك النهائي:</strong><br>
            • تفضل بزيارة المركز التعليمي شخصياً.<br>
            • أحضر معك رقم التسجيل الخاص بك.<br>
            • قم بدفع حقوق التسجيل المقدرة بـ <strong style="color:var(--gold,#c8a84b);">500 دج</strong>.<br><br>
            ✨ نتمنى لك مسيرة تعليمية موفقة ومليئة بالنجاح والتفوق! 🌟
          </div>
          <button class="ep-btn-primary submit-btn" onclick="closeSupportReg()" style="margin-top:8px;">تم</button>
        </div>
      `;
    }
  } catch (e) {
    alert('حدث خطأ أثناء التسجيل: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = 'تأكيد التسجيل ✦'; }
  }
}

// ── Admin: Load registrations ──
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
