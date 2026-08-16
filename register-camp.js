// ═══════════════════════════════════════════════════════════
//  تسجيل برنامج المخيم الصيفي — النسخة الثانية
//  Multi-Step Registration: المعلومات الأساسية ← المستوى الدراسي
//  ← البرامج المطلوبة ← ملخص التسجيل ← القوانين ← تم التسجيل
//
//  ⚠️ مصدر قوانين المركز: يُقرأ من SUPPORT_LAWS المُعرّف في
//  register-support.js (نفس المصدر تماماً — أي تعديل مستقبلي على
//  القوانين يظهر هنا تلقائياً، دون نسخة منفصلة). لذلك يجب تحميل
//  هذا الملف بعد register-support.js.
//
//  ⚠️ مصدر البرامج والأسعار والمدة: يُقرأ من window.CAMP_PROGRAMS
//  و window.CAMP_LEVELS المُعرّفان في js/camp-programs.js
//  (مصدر بيانات مركزي واحد يُستخدم في نموذج التسجيل ولوحة التحكم
//  والفلاتر والإحصائيات والطباعة و CSV). لذلك يجب تحميل
//  camp-programs.js قبل هذا الملف.
//
//  قاعدة البيانات: جدول مستقل (summer_camp_registrations) لا يمسّ
//  جدول تسجيلات الدعم المدرسي إطلاقاً.
// ═══════════════════════════════════════════════════════════

const CAMP_TABLE = 'summer_camp_registrations';

// البرامج والمستويات من المصدر المركزي (camp-programs.js) مع خطة بديلة دفاعية
const CAMP_PROGRAMS = (window.CAMP_PROGRAMS && window.CAMP_PROGRAMS.length)
  ? window.CAMP_PROGRAMS
  : [
      { id: 'fr',      icon: '🇫🇷', name: 'اللغة الفرنسية',        price: 4000, duration: 'مكثّف لمدة شهر' },
      { id: 'en',      icon: '🇬🇧', name: 'اللغة الإنجليزية',      price: 4000, duration: 'مكثّف لمدة شهر' },
      { id: 'it',      icon: '💻', name: 'IT',                     price: 2000, duration: 'لمدة شهر' },
      { id: 'line',    icon: '✍️', name: 'تحسين الخط',             price: 2000, duration: 'لمدة شهر' },
      { id: 'soroban', icon: '🧠', name: 'الحساب الذهني — سوروبان', price: 2000, duration: 'لمدة شهر' },
    ];

const CAMP_LEVELS = (window.CAMP_LEVELS && window.CAMP_LEVELS.length)
  ? window.CAMP_LEVELS
  : [
      { value: 'ابتدائي', label: 'المستوى الابتدائي', emoji: '🟢' },
      { value: 'متوسط',  label: 'المستوى المتوسط',    emoji: '🔵' },
      { value: 'ثانوي',  label: 'المستوى الثانوي',    emoji: '🟣' },
    ];

// ── State ──
let cCampLevel = null;
let cCampPrograms = []; // ids بالترتيب
let cCampFormData = null;

function cById(id) { return document.getElementById(id); }

// ── قوانين المركز — نفس المصدر تماماً (register-support.js) ──
function campLaws() {
  return (typeof SUPPORT_LAWS !== 'undefined' && Array.isArray(SUPPORT_LAWS)) ? SUPPORT_LAWS : [];
}

// ── إعدادات Supabase — نفس مشروع الدعم المدرسي (جدول منفصل) ──
function campSupabase() {
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    throw new Error('تعذر تحميل إعدادات قاعدة البيانات');
  }
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}

// ── تنبيه موحّد (يعيد استخدام نفس مظهر تنبيهات النظام) ──
function campAlert(message, title) {
  if (typeof regAlert === 'function') { regAlert(message, title || 'تنبيه'); return; }
  alert(message);
}

// ── Smooth scroll بين المراحل (نفس أسلوب نظام الدعم المدرسي) ──
function campSmoothScrollTo(container, targetTop, duration) {
  if (!container) return;
  const start = container.scrollTop;
  const maxScroll = container.scrollHeight - container.clientHeight;
  const target = Math.max(0, Math.min(targetTop, maxScroll));
  if (Math.abs(target - start) < 1) return;
  const t0 = performance.now();
  function step(now) {
    const t = Math.min(1, (now - t0) / (duration || 550));
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    container.scrollTop = start + (target - start) * eased;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function campScrollToPhase(el, opts) {
  if (!el) return;
  const o = opts || {};
  const container = el.closest('.modal-overlay') || document.scrollingElement;
  if (!container) return;
  const headerOffset = (o.offset != null) ? o.offset : 24;
  const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - headerOffset;
  campSmoothScrollTo(container, top, o.duration || 550);
}

// ── ID فريد لطالب المخيم الصيفي (SC-XXXX مع إعادة المحاولة عند التصادم) ──
function campGenRegId() {
  return 'SC-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

// ── الإجمالي (بدون احتساب مزدوج) ──
function campTotal() {
  return cCampPrograms.reduce((sum, id) => {
    const p = CAMP_PROGRAMS.find(x => x.id === id);
    return sum + (p ? p.price : 0);
  }, 0);
}

// ── Open / Close main modal ──
function openCampReg() {
  cCampLevel = null; cCampPrograms = []; cCampFormData = null;
  const f = cById('camp-reg-form');
  if (f) f.reset();
  ['camp-level-group', 'camp-programs-group', 'camp-review-group'].forEach(id => {
    const el = cById(id); if (el) el.style.display = 'none';
  });
  ['campNext1Btn', 'campNext2Btn', 'campNext3Btn'].forEach(id => {
    const el = cById(id); if (el) { el.style.display = ''; }
  });
  const b2 = cById('campNext2Btn'); if (b2) b2.disabled = true;
  const b3 = cById('campNext3Btn'); if (b3) b3.disabled = true;
  renderCampLevels();
  renderCampPrograms();
  updateCampSummary();
  renderCampReview();
  const modal = cById('camp-reg-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); modal.scrollTop = 0; }
}

function closeCampReg() {
  const modal = cById('camp-reg-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

function closeCampRegOutside(e) {
  if (e.target === cById('camp-reg-modal')) closeCampReg();
}

// ── المرحلة 1: المعلومات الأساسية ──
function campNextFromInfo() {
  const firstName = cById('cFirstName')?.value?.trim();
  const lastName = cById('cLastName')?.value?.trim();
  const birthDate = cById('cBirthDate')?.value;
  const parentName = cById('cParentName')?.value?.trim();
  const parentPhone = cById('cParentPhone')?.value?.trim();

  if (!firstName) { campAlert('الرجاء إدخال الاسم.'); cById('cFirstName')?.focus(); return; }
  if (!lastName) { campAlert('الرجاء إدخال اللقب.'); cById('cLastName')?.focus(); return; }
  if (!birthDate) { campAlert('الرجاء إدخال تاريخ الميلاد.'); cById('cBirthDate')?.focus(); return; }
  if (!parentName) { campAlert('الرجاء إدخال اسم ولي الأمر.'); cById('cParentName')?.focus(); return; }
  if (!parentPhone) { campAlert('الرجاء إدخال هاتف ولي الأمر.'); cById('cParentPhone')?.focus(); return; }

  cById('campNext1Btn') && (cById('campNext1Btn').style.display = 'none');
  const lg = cById('camp-level-group');
  if (lg) { lg.style.display = 'block'; }
  const b2 = cById('campNext2Btn'); if (b2) b2.disabled = !cCampLevel;
  campScrollToPhase(lg, { offset: 24 });
}

// ── المرحلة 2: المستوى الدراسي (اختيار واحد) ──
function renderCampLevels() {
  const c = cById('camp-level-options');
  if (!c) return;
  c.innerHTML = CAMP_LEVELS.map(l =>
    `<label class="check-option">
      <input type="radio" name="cCampLevel" value="${l.value}" onchange="campOnLevelChange()" ${cCampLevel === l.value ? 'checked' : ''} />
      <span class="check-box"></span>
      <span class="check-label">${l.emoji} ${l.label}</span>
    </label>`
  ).join('');
}

function campOnLevelChange() {
  const checked = document.querySelector('input[name="cCampLevel"]:checked');
  cCampLevel = checked ? checked.value : null;
  const b2 = cById('campNext2Btn'); if (b2) b2.disabled = !cCampLevel;
}

function campNextFromLevel() {
  if (!cCampLevel) { campAlert('الرجاء اختيار المستوى الدراسي.'); return; }
  cById('campNext2Btn') && (cById('campNext2Btn').style.display = 'none');
  const pg = cById('camp-programs-group');
  if (pg) { pg.style.display = 'block'; }
  const b3 = cById('campNext3Btn'); if (b3) b3.disabled = cCampPrograms.length === 0;
  campScrollToPhase(pg, { offset: 24 });
}

// ── المرحلة 3: البرامج المطلوبة (اختيار متعدد) ──
function renderCampPrograms() {
  const g = cById('camp-prog-grid');
  if (!g) return;
  g.innerHTML = CAMP_PROGRAMS.map(p => {
    const sel = cCampPrograms.includes(p.id);
    return `<button type="button" class="camp-prog-card ${sel ? 'selected' : ''}" data-id="${p.id}" onclick="campToggleProgram('${p.id}')">
      <span class="camp-prog-check">${sel ? '✓' : ''}</span>
      <span class="camp-prog-icon">${p.icon}</span>
      <span class="camp-prog-name">${p.name}</span>
      <span class="camp-prog-price">${p.price} دج</span>
      <span class="camp-prog-duration">${p.duration}</span>
    </button>`;
  }).join('');
}

function campToggleProgram(id) {
  const i = cCampPrograms.indexOf(id);
  if (i === -1) cCampPrograms.push(id);
  else cCampPrograms.splice(i, 1);
  renderCampPrograms();
  updateCampSummary();
  const b3 = cById('campNext3Btn'); if (b3) b3.disabled = cCampPrograms.length === 0;
}

function campRemoveProgram(id) {
  campToggleProgram(id);
}

function updateCampSummary() {
  const list = cById('camp-selected-list');
  const box = cById('camp-summary-box');
  if (!list) return;
  if (cCampPrograms.length) {
    list.innerHTML = cCampPrograms.map(id => {
      const p = CAMP_PROGRAMS.find(x => x.id === id);
      if (!p) return '';
      return `<div class="camp-selected-item">
        <span>${p.icon} <strong>${p.name}</strong> — <span class="camp-item-duration">${p.duration}</span> <span class="camp-item-price">${p.price} دج</span></span>
        <button type="button" class="camp-selected-rm" onclick="campRemoveProgram('${p.id}')" title="حذف البرنامج">× حذف</button>
      </div>`;
    }).join('');
    if (box) box.style.display = 'block';
  } else {
    list.innerHTML = '';
    if (box) box.style.display = 'none';
  }
  const totalEl = cById('camp-total-amount');
  if (totalEl) totalEl.textContent = campTotal().toLocaleString('fr-DZ') + ' دج';
}

function campNextFromPrograms() {
  if (cCampPrograms.length === 0) { campAlert('الرجاء اختيار برنامج واحد على الأقل.'); return; }
  cById('campNext3Btn') && (cById('campNext3Btn').style.display = 'none');
  renderCampReview();
  const rg = cById('camp-review-group');
  if (rg) { rg.style.display = 'block'; }
  campScrollToPhase(rg, { offset: 24 });
}

// ── المرحلة 4: ملخص التسجيل ──
function campLevelLabel() {
  const l = CAMP_LEVELS.find(x => x.value === cCampLevel);
  return l ? `${l.emoji} ${l.label}` : '—';
}

function renderCampReview() {
  const c = cById('camp-review-content');
  if (!c) return;
  const firstName = cById('cFirstName')?.value?.trim() || '—';
  const lastName = cById('cLastName')?.value?.trim() || '—';
  const birthDate = cById('cBirthDate')?.value || '';
  const parentName = cById('cParentName')?.value?.trim() || '—';
  const parentPhone = cById('cParentPhone')?.value?.trim() || '—';
  const birthFmt = birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString('ar-DZ') : '—';

  const programsHtml = cCampPrograms.length
    ? cCampPrograms.map(id => {
        const p = CAMP_PROGRAMS.find(x => x.id === id);
        if (!p) return '';
        return `<div class="camp-review-prog"><span>${p.icon} <strong>${p.name}</strong></span><span>${p.price} دج</span><span class="camp-review-dur">${p.duration}</span></div>`;
      }).join('')
    : '<div style="font-size:12.5px;color:rgba(255,255,255,0.5);">لا توجد برامج</div>';

  c.innerHTML =
    `<div class="camp-review-row"><span class="camp-review-label">👤 الطالب</span><span class="camp-review-val">${firstName} ${lastName}</span></div>` +
    `<div class="camp-review-row"><span class="camp-review-label">🎂 تاريخ الميلاد</span><span class="camp-review-val">${birthFmt}</span></div>` +
    `<div class="camp-review-row"><span class="camp-review-label">👪 ولي الأمر</span><span class="camp-review-val">${parentName}</span></div>` +
    `<div class="camp-review-row"><span class="camp-review-label">📞 الهاتف</span><span class="camp-review-val" dir="ltr">${parentPhone}</span></div>` +
    `<div class="camp-review-row"><span class="camp-review-label">🎓 المستوى الدراسي</span><span class="camp-review-val">${campLevelLabel()}</span></div>` +
    `<div class="camp-review-progs"><span class="camp-review-label">📚 البرامج المطلوبة</span>${programsHtml}</div>` +
    `<div class="camp-review-total"><span>الإجمالي</span><strong>${campTotal().toLocaleString('fr-DZ')} دج</strong></div>`;
}

// ── الانتقال إلى القوانين (إعادة تحقق كاملة من كل المراحل) ──
function campGotoLaws() {
  const firstName = cById('cFirstName')?.value?.trim();
  const lastName = cById('cLastName')?.value?.trim();
  const birthDate = cById('cBirthDate')?.value;
  const parentName = cById('cParentName')?.value?.trim();
  const parentPhone = cById('cParentPhone')?.value?.trim();

  if (!firstName) { campAlert('الرجاء إدخال الاسم.'); return; }
  if (!lastName) { campAlert('الرجاء إدخال اللقب.'); return; }
  if (!birthDate) { campAlert('الرجاء إدخال تاريخ الميلاد.'); return; }
  if (!parentName) { campAlert('الرجاء إدخال اسم ولي الأمر.'); return; }
  if (!parentPhone) { campAlert('الرجاء إدخال هاتف ولي الأمر.'); return; }
  if (!cCampLevel) { campAlert('الرجاء اختيار المستوى الدراسي.'); return; }
  if (cCampPrograms.length === 0) { campAlert('الرجاء اختيار برنامج واحد على الأقل.'); return; }

  renderCampReview();
  campOpenLawsModal();
}

// ── Laws Modal (نفس قوانين المركز — مصدر واحد) ──
function campOpenLawsModal() {
  const lawsText = cById('camp-laws-text');
  if (lawsText) {
    lawsText.innerHTML = campLaws().map((l, i) =>
      `<div class="law-item"><strong class="law-num">${i + 1}.</strong> ${l}</div>`
    ).join('');
  }
  cById('camp-laws-agree') && (cById('camp-laws-agree').checked = false);
  cById('camp-laws-confirm-btn') && (cById('camp-laws-confirm-btn').disabled = true);
  closeCampReg();
  const modal = cById('camp-laws-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); modal.scrollTop = 0; }
  const area = cById('camp-laws-scroll-area');
  if (area) area.scrollTop = 0;
}

// العودة من القوانين إلى نموذج التسجيل مع الاحتفاظ بكل البيانات والاختيارات
function campLawsBackToForm() {
  campCloseLawsModal();
  const formModal = cById('camp-reg-modal');
  if (formModal) {
    formModal.style.display = 'flex';
    formModal.classList.add('active');
    campScrollToPhase(cById('camp-review-group') || formModal, { offset: 20 });
  }
}

function campLawsAgreeChange() {
  const cb = cById('camp-laws-agree');
  const btn = cById('camp-laws-confirm-btn');
  if (btn) btn.disabled = !cb.checked;
}

function campCloseLawsModal() {
  const modal = cById('camp-laws-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

function campCloseLawsModalOutside(e) {
  if (e.target === cById('camp-laws-modal')) campLawsBackToForm();
}

// ── Loading Modal (يعيد استخدام مودال الانتظار العام) ──
function campOpenLoading() {
  if (typeof openLoadingModal === 'function') { openLoadingModal(); return; }
  const m = cById('loading-modal');
  if (m) { m.style.display = 'flex'; m.classList.add('active'); }
}

function campCloseLoading() {
  if (typeof closeLoadingModal === 'function') { closeLoadingModal(); return; }
  const m = cById('loading-modal');
  if (m) { m.style.display = 'none'; m.classList.remove('active'); }
}

// ── الإرسال النهائي إلى قاعدة البيانات (جدول مستقل) ──
async function campLawsConfirm() {
  const firstName = cById('cFirstName')?.value?.trim() || '';
  const lastName = cById('cLastName')?.value?.trim() || '';
  const birthDate = cById('cBirthDate')?.value || '';
  const guardianName = cById('cParentName')?.value?.trim() || '';
  const guardianPhone = cById('cParentPhone')?.value?.trim() || '';

  if (!firstName || !lastName || !birthDate || !guardianName || !guardianPhone) {
    campAlert('⚠️ الرجاء ملء جميع الحقول الإلزامية'); return;
  }
  if (!cCampLevel) { campAlert('الرجاء اختيار المستوى الدراسي.'); return; }
  if (cCampPrograms.length === 0) { campAlert('الرجاء اختيار برنامج واحد على الأقل.'); return; }

  const btn = cById('camp-laws-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري التسجيل...'; }
  campOpenLoading();
  try {
    const { url, key } = campSupabase();
    const MAX_TRIES = 10000;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      const payload = {
        id: campGenRegId(),
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        education_level: cCampLevel,
        programs: cCampPrograms.map(pid => {
          const p = CAMP_PROGRAMS.find(x => x.id === pid);
          return { id: p.id, icon: p.icon, name: p.name, price: p.price, duration: p.duration };
        }),
        total_amount: campTotal(),
        terms_accepted: true,
      };
      const res = await fetch(`${url}/rest/v1/${CAMP_TABLE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        campCloseLoading();
        campCloseLawsModal();
        campOpenSuccessModal(payload.id);
        return;
      }
      if (res.status === 409) continue;
      const txt = await res.text();
      throw new Error(txt.slice(0, 200));
    }
    throw new Error('لا توجد معرفات تسجيل متاحة حالياً');
  } catch (e) {
    campCloseLoading();
    if (btn) { btn.disabled = false; btn.textContent = 'أوافق وأكمل التسجيل'; }
    setTimeout(() => campAlert('❌ فشل التسجيل: ' + e.message, 'خطأ'), 200);
  }
}

// ── Success Modal ──
function campOpenSuccessModal(id) {
  cById('camp-success-id-display') && (cById('camp-success-id-display').textContent = id);
  cById('camp-success-level') && (cById('camp-success-level').textContent = campLevelLabel().replace(/^\S+\s/, ''));
  cById('camp-success-programs') && (cById('camp-success-programs').textContent = cCampPrograms.map(pid => {
    const p = CAMP_PROGRAMS.find(x => x.id === pid);
    return p ? p.icon + ' ' + p.name : '';
  }).join(' • '));
  cById('camp-success-total') && (cById('camp-success-total').textContent = campTotal().toLocaleString('fr-DZ') + ' دج');
  const modal = cById('camp-success-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
    modal.scrollTop = 0;
    modal.querySelectorAll('.success-stagger, .success-check-wrap, .success-check-circle, .success-check-mark, .ep-success-box').forEach(el => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  }
}

function campCloseSuccessModal() {
  const modal = cById('camp-success-modal');
  if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  cCampFormData = null;
}

function campCloseSuccessModalOutside(e) {
  if (e.target === cById('camp-success-modal')) campCloseSuccessModal();
}
