// ═══════════════════════════════════════════════════════════
//  تسجيل دورات اللغات — Dynamic Form Flow
// ═══════════════════════════════════════════════════════════

(function() {
'use strict';

const LANG_SUPABASE_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
const LANG_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.ep8b2omBGaN2qUB_XG8EE8XDhoRfAVAwnxOgEodEKBc';

const LANG_TABLE = 'language_registrations';

const LANGUAGES = [
  { value: 'الإنجليزية', label: '🇬🇧 الإنجليزية', icon: '🇬🇧' },
  { value: 'الفرنسية', label: '🇫🇷 الفرنسية', icon: '🇫🇷' },
  { value: 'الإسبانية', label: '🇪🇸 الإسبانية', icon: '🇪🇸' },
  { value: 'الألمانية', label: '🇩🇪 الألمانية', icon: '🇩🇪' },
  { value: 'الإيطالية', label: '🇮🇹 الإيطالية', icon: '🇮🇹' },
  { value: 'التركية', label: '🇹🇷 التركية', icon: '🇹🇷' },
];

const CEFR_LEVELS = [
  { value: 'A0', label: '🔰 A0 — مبتدئ كلياً', desc: 'بدون أي معرفة سابقة' },
  { value: 'A1', label: '🟢 A1 — مبتدئ', desc: 'مفردات وجمل أساسية' },
  { value: 'A2', label: '🟡 A2 — أساسي', desc: 'تواصل بسيط' },
  { value: 'B1', label: '🔵 B1 — متوسط', desc: 'فهم المواضيع المألوفة' },
  { value: 'B2', label: '🟠 B2 — فوق المتوسط', desc: 'تدفق جيد في الحديث والكتابة' },
  { value: 'C1', label: '🔴 C1 — متقدم', desc: 'إنتاج لغوي واسع' },
  { value: 'C2', label: '⭐ C2 — إتقان', desc: 'كالناطق الأصلي' },
];

const LANG_LAWS = [
  'يلتزم الطالب بحضور جميع الحصص في المواعيد المحددة.',
  'التأخر عن الحصة بأكثر من 10 دقائق يعتبر غياباً.',
  'الغياب المتكرر دون عذر مقبول يؤدي إلى الفصل من الدورة.',
  'الالتزام بآداب الحوار والاحترام المتبادل مع الأساتذة والطلاب.',
  'يمنع استخدام الهاتف المحمول داخل القسم أثناء الحصة.',
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
let lLanguage = null;
let lCefrLevel = null;
let lFormData = null;

function $id(id) { return document.getElementById(id); }

function _genLangId() {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

function _genToken(n) {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < n; i++) r += c.charAt(Math.floor(Math.random() * c.length));
  return r;
}

// ── Custom Alert ──
function langAlert(msg, title) {
  const ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:20px;position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);z-index:99999;';
  ov.innerHTML = '<div class="modal-box" style="max-width:400px;text-align:center;"><div class="modal-header"><h3 class="modal-title">' + (title || 'تنبيه') + '</h3></div><div style="padding:20px 24px;font-size:14px;color:var(--text,#e5e5e5);line-height:1.7;">' + msg + '</div><div style="padding:0 24px 22px;display:flex;justify-content:center;"><button class="ep-btn-primary" style="min-width:120px;">حسناً</button></div></div>';
  ov.querySelector('button').onclick = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function langToast(msg, type) {
  const colors = { success: '#10b981', error: '#ef4444', warn: '#f59e0b' };
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:24px;right:50%;transform:translateX(50%);background:#0d1520;border:1px solid ' + (colors[type] || colors.success) + ';color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:700;z-index:999999;box-shadow:0 8px 30px rgba(0,0,0,0.5);font-family:\'Tajawal\',sans-serif;max-width:90vw;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity 0.3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2600);
}

// ── Open / Close ──
window.openLangReg = function() {
  lLanguage = null; lCefrLevel = null; lFormData = null;
  const f = $id('lang-reg-form');
  if (f) f.reset();
  [$id('l-cefr-group'), $id('l-test-group'), $id('l-submit-btn')].forEach(el => {
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('input[name="lLang"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="lLevelTest"]').forEach(r => r.checked = false);
  const modal = $id('lang-reg-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); modal.scrollTop = 0; }
};

window.closeLangReg = function() {
  const modal = $id('lang-reg-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
};

window.closeLangRegOutside = function(e) {
  if (e.target === $id('lang-reg-modal')) closeLangReg();
};

// ── Step 1: Language selection ──
window.onLangSelectChange = function() {
  const sel = $id('lLanguageSelect');
  lLanguage = sel ? sel.value : null;
  lCefrLevel = null;
  [$id('l-cefr-group'), $id('l-test-group'), $id('l-submit-btn')].forEach(el => {
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('input[name="lLevelTest"]').forEach(r => r.checked = false);
  if (lLanguage) {
    const cefrEl = $id('l-cefr-group');
    if (cefrEl) cefrEl.style.display = 'block';
  }
};

// ── Step 2: CEFR level ──
window.onCefrChange = function(val) {
  lCefrLevel = val;
  [$id('l-test-group'), $id('l-submit-btn')].forEach(el => {
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('input[name="lLevelTest"]').forEach(r => r.checked = false);
  if (lCefrLevel) {
    const testEl = $id('l-test-group');
    if (testEl) testEl.style.display = 'block';
  }
};

// ── Step 3: Placement test answer → show submit ──
window.onLevelTestChange = function() {
  const submitEl = $id('l-submit-btn');
  if (submitEl) submitEl.style.display = 'block';
};

// ── Validation ──
function validateForm() {
  const firstName = ($id('lFirstName') || {}).value || '';
  const lastName = ($id('lLastName') || {}).value || '';
  const day = ($id('lBirthDay') || {}).value || '';
  const month = ($id('lBirthMonth') || {}).value || '';
  const year = ($id('lBirthYear') || {}).value || '';
  const parentName = ($id('lParentName') || {}).value || '';
  const parentPhone = ($id('lParentPhone') || {}).value || '';
  const levelTest = document.querySelector('input[name="lLevelTest"]:checked');

  if (!firstName.trim()) { langAlert('الرجاء إدخال الاسم'); return null; }
  if (!lastName.trim()) { langAlert('الرجاء إدخال اللقب'); return null; }
  if (!day || !month || !year) { langAlert('الرجاء إدخال تاريخ الميلاد كاملاً'); return null; }
  if (!parentName.trim()) { langAlert('الرجاء إدخال اسم ولي الأمر'); return null; }
  if (!parentPhone.trim() || parentPhone.trim().length < 8) { langAlert('الرجاء إدخال رقم هاتف صحيح لولي الأمر'); return null; }
  if (!lLanguage) { langAlert('الرجاء اختيار اللغة'); return null; }
  var availLangs = ['الإنجليزية','الفرنسية','الإسبانية','الألمانية'];
  if (availLangs.indexOf(lLanguage) === -1) { langAlert('هذه اللغة غير متاحة حالياً. الرجاء اختيار لغة أخرى.'); return null; }
  if (!lCefrLevel) { langAlert('الرجاء اختيار مستواك'); return null; }
  if (!levelTest) { langAlert('الرجاء الرد على سؤال اختبار التعيين'); return null; }

  const birthDate = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  return {
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    birth_date: birthDate,
    parent_name: parentName.trim(),
    parent_phone: parentPhone.trim(),
    language: lLanguage,
    cefr_level: lCefrLevel,
    level_test: levelTest.value,
    motivation: ($id('lMotivation') || {}).value || '',
  };
}

// ── Submit → open laws ──
window.onSubmitLangClick = function() {
  const data = validateForm();
  if (!data) return;
  lFormData = data;
  openLangLaws();
};

// ── Laws Modal ──
function openLangLaws() {
  const lawsText = $id('lang-laws-text');
  if (lawsText) {
    lawsText.innerHTML = LANG_LAWS.map((l, i) => '<p style="margin:0 0 14px 0;line-height:1.8;font-size:14px;"><strong style="color:var(--primary,#c8a84b);">' + (i + 1) + '.</strong> ' + l + '</p>').join('');
  }
  const agree = $id('langLawsAgree');
  const confirmBtn = $id('langLawsConfirmBtn');
  const cbArea = $id('lang-laws-modal')?.querySelector('.laws-checkbox-area');
  if (agree) { agree.checked = false; agree.disabled = true; }
  if (confirmBtn) confirmBtn.disabled = true;
  if (cbArea) cbArea.style.display = 'none';

  const modal = $id('lang-laws-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }

  const scrollArea = $id('lang-laws-scroll-area');
  const sentinel = $id('lang-laws-bottom-sentinel');
  if (scrollArea && sentinel) {
    scrollArea.scrollTop = 0;

    function showCheckboxArea() {
      if (cbArea && cbArea.style.display !== 'block') {
        cbArea.style.display = 'block';
        cbArea.style.animation = 'lawsFadeIn 0.4s ease forwards';
      }
      if (agree) agree.disabled = false;
    }

    if (scrollArea.scrollHeight <= scrollArea.clientHeight + 5) {
      showCheckboxArea();
      return;
    }

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { showCheckboxArea(); obs.disconnect(); }
    }, { root: scrollArea, threshold: 0.8 });
    obs.observe(sentinel);

    scrollArea.addEventListener('scroll', function onScroll() {
      if (scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 10) {
        showCheckboxArea();
        scrollArea.removeEventListener('scroll', onScroll);
        obs.disconnect();
      }
    });
  }
}

window.closeLangLawsOutside = function(e) {
  if (e.target === $id('lang-laws-modal')) closeLangLaws();
};

window.closeLangLaws = function() {
  const modal = $id('lang-laws-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  openLangReg();
};

window.onLangLawsAgreeChange = function() {
  const agree = $id('langLawsAgree');
  const btn = $id('langLawsConfirmBtn');
  if (btn) btn.disabled = !agree.checked;
};

window.onLangLawsConfirm = function() {
  closeLangLaws();
  doLangSubmit();
};

// ── Supabase Insert ──
async function doLangSubmit() {
  if (!lFormData) return;
  const loading = $id('lang-loading-modal');
  if (loading) { loading.style.display = 'flex'; loading.classList.add('active'); }

  const MAX_TRIES = 1000;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const payload = Object.assign({}, lFormData, {
      id: _genLangId(),
      status: 'مسجل مبدئياً',
      fee_amount: 500,
      student_token: _genToken(32),
      terms_accepted: true,
      barcode_value: (typeof EAN13 !== 'undefined' && EAN13.make) ? EAN13.make(lFormData.id || '000') : '',
    });
    try {
      if (typeof EAN13 === 'undefined' || !EAN13.make) delete payload.barcode_value;
    } catch(e) { delete payload.barcode_value; }

    try {
      const res = await fetch(LANG_SUPABASE_URL + '/rest/v1/' + LANG_TABLE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': LANG_SUPABASE_KEY,
          'Authorization': 'Bearer ' + LANG_SUPABASE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (loading) { loading.style.display = 'none'; loading.classList.remove('active'); }
        openLangSuccess(payload.id, lLanguage, lCefrLevel);
        lFormData = null;
        return;
      }
      if (res.status === 409) continue;
      const errText = await res.text().catch(() => '');
        throw new Error(errText.slice(0, 200));
    } catch (e) {
      if (attempt >= MAX_TRIES - 1) {
        if (loading) { loading.style.display = 'none'; loading.classList.remove('active'); }
        langAlert('حدث خطأ أثناء التسجيل: ' + e.message, 'خطأ');
      }
    }
  }
}

// ── Success Modal ──
function openLangSuccess(id, language, level) {
  const modal = $id('lang-success-modal');
  const idEl = $id('lang-success-id');
  const langEl = $id('lang-success-lang');
  const lvlEl = $id('lang-success-level');
  if (idEl) idEl.textContent = id;
  if (langEl) langEl.textContent = language;
  if (lvlEl) lvlEl.textContent = level;
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
}

window.closeLangSuccess = function() {
  const modal = $id('lang-success-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
};

})();
