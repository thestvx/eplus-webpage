(function () {
  'use strict';

  var WP_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
  var WP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.ep8b2omBGaN2qUB_XG8EE8XDhoRfAVAwnxOgEodEKBc';
  var WP_TABLE = 'program_registrations';
  var WP_PROGRAMS = {
    young: {
      group: '6–9',
      label: '6–9 سنوات',
      list: ['اللغات', 'الرياضة', 'الأوريغامي وتشكيل الورق', 'الرسم والتلوين', 'Palm Garden']
    },
    older: {
      group: '10–14',
      label: '10–14 سنة',
      list: ['اللغات', 'الرياضة', 'الأمن السيبراني', 'فوتوشوب وورشة How to design a good poster', 'Palm Garden']
    }
  };

  var WP_LAWS = [
    'يلتزم الطالب بحضور جميع الحصص في المواعيد المحددة.',
    'التأخر عن الحصة بأكثر من 10 دقائق يعتبر غياباً.',
    'الغياب المتكرر دون عذر مقبول يؤدي إلى الفصل من البرنامج.',
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
    'أتحمل المسؤولية الكاملة عن صحة المعلومات المقدمة.'
  ];

  var wpFormData = null;
  var wpLastFocus = null;
  var wpLawsObserver = null;
  var wpLawsScrollHandler = null;
  var wpLawsFallback = null;
  var wpToastTimer = null;

  function wpById(id) {
    return document.getElementById(id);
  }

  function wpValue(id) {
    var el = wpById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function wpProgramsForAge(age) {
    return age <= 9 ? WP_PROGRAMS.young : WP_PROGRAMS.older;
  }

  window.wpAgeChanged = function () {
    var box = wpById('wpAgePrograms');
    if (!box) return;
    var raw = wpValue('wpAge');
    var age = Number(raw);
    if (!raw || age % 1 !== 0 || age < 6 || age > 14) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    var info = wpProgramsForAge(age);
    box.innerHTML = '<div class="wp-age-programs-head"><strong>البرامج المناسبة لعمر ' + age + ' سنوات</strong><span>فئة ' + info.label + '</span></div>'
      + '<div class="wp-age-chips">' + info.list.map(function (item) {
        return '<span class="wp-age-chip"><i class="fa-solid fa-check" aria-hidden="true"></i> ' + item + '</span>';
      }).join('') + '</div>';
    box.hidden = false;
  };

  function wpNotify(message) {
    var old = document.querySelector('.wp-toast');
    if (old) old.remove();
    clearTimeout(wpToastTimer);
    var el = document.createElement('div');
    el.className = 'wp-toast';
    el.textContent = message;
    document.body.appendChild(el);
    wpToastTimer = setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .25s';
      setTimeout(function () { if (el.parentNode) el.remove(); }, 260);
    }, 3000);
  }

  function wpSyncLock() {
    var anyOpen = document.querySelector('.wp-modal.is-open, .wp-loading.is-open');
    document.body.classList.toggle('wp-modal-open', !!anyOpen);
  }

  function wpShow(el) {
    if (!el) return;
    el.classList.add('is-open');
    el.style.display = 'flex';
    el.scrollTop = 0;
    wpSyncLock();
  }

  function wpHide(el) {
    if (!el) return;
    el.classList.remove('is-open');
    el.style.display = 'none';
    wpSyncLock();
  }

  function wpFocus(id) {
    setTimeout(function () {
      var el = wpById(id);
      if (el) el.focus();
    }, 90);
  }

  function wpClearLawsWatchers() {
    if (wpLawsObserver) {
      wpLawsObserver.disconnect();
      wpLawsObserver = null;
    }
    if (wpLawsScrollHandler) {
      var area = wpById('wp-laws-scroll');
      if (area) area.removeEventListener('scroll', wpLawsScrollHandler);
      wpLawsScrollHandler = null;
    }
    if (wpLawsFallback) {
      clearTimeout(wpLawsFallback);
      wpLawsFallback = null;
    }
  }

  function wpRevealLawsCheck() {
    var check = wpById('wp-laws-check');
    var agree = wpById('wpLawsAgree');
    if (!check || check.style.display === 'block') return;
    check.style.display = 'block';
    check.style.animation = 'none';
    void check.offsetWidth;
    check.style.animation = '';
    if (agree) agree.disabled = false;
    wpClearLawsWatchers();
  }

  function wpSetupLawsScroll() {
    wpClearLawsWatchers();
    var area = wpById('wp-laws-scroll');
    var sentinel = wpById('wp-laws-sentinel');
    if (!area || !sentinel) {
      wpRevealLawsCheck();
      return;
    }
    area.scrollTop = 0;
    if (area.scrollHeight <= area.clientHeight + 5) {
      wpRevealLawsCheck();
      return;
    }
    wpLawsObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) wpRevealLawsCheck();
    }, { root: area, threshold: 0.8 });
    wpLawsObserver.observe(sentinel);
    wpLawsScrollHandler = function () {
      if (area.scrollTop + area.clientHeight >= area.scrollHeight - 10) wpRevealLawsCheck();
    };
    area.addEventListener('scroll', wpLawsScrollHandler, { passive: true });
    wpLawsFallback = setTimeout(wpRevealLawsCheck, 2200);
  }

  function wpOpenLaws() {
    var box = wpById('wpAgePrograms');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    var text = wpById('wp-laws-text');
    if (text) {
      text.innerHTML = WP_LAWS.map(function (law, index) {
        return '<div class="wp-law-item"><strong class="wp-law-num">' + (index + 1) + '.</strong><span>' + law + '</span></div>';
      }).join('');
    }
    var agree = wpById('wpLawsAgree');
    var confirmBtn = wpById('wpLawsConfirmBtn');
    var check = wpById('wp-laws-check');
    if (agree) { agree.checked = false; agree.disabled = true; }
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'تأكيد التسجيل'; }
    if (check) check.style.display = 'none';
    wpShow(wpById('wp-laws-modal'));
    wpHide(wpById('wp-reg-modal'));
    wpSetupLawsScroll();
    wpFocus('wpLawsAgree');
  }

  window.openWinterPlusReg = function () {
    wpFormData = null;
    wpLastFocus = document.activeElement;
    var form = wpById('wp-reg-form');
    if (form) form.reset();
    var agePrograms = wpById('wpAgePrograms');
    if (agePrograms) { agePrograms.hidden = true; agePrograms.innerHTML = ''; }
    wpHide(wpById('wp-laws-modal'));
    wpHide(wpById('wp-success-modal'));
    wpShow(wpById('wp-reg-modal'));
    wpFocus('wpFirstName');
  };

  window.wpCloseReg = function () {
    wpHide(wpById('wp-reg-modal'));
    wpFormData = null;
    if (wpLastFocus && typeof wpLastFocus.focus === 'function') {
      setTimeout(function () { wpLastFocus.focus(); }, 60);
    }
  };

  window.wpCloseRegOutside = function (event) {
    if (event.target === wpById('wp-reg-modal')) wpCloseReg();
  };

  window.wpSubmitForm = function (event) {
    if (event) event.preventDefault();
    var firstName = wpValue('wpFirstName');
    var lastName = wpValue('wpLastName');
    var guardianName = wpValue('wpGuardianName');
    var guardianPhone = wpValue('wpGuardianPhone');
  var ageInput = wpValue('wpAge');
  var age = parseInt(ageInput, 10);
  var reason = wpValue('wpReason');

    if (!firstName) { wpNotify('الرجاء إدخال اسم التلميذ.'); wpFocus('wpFirstName'); return; }
    if (!lastName) { wpNotify('الرجاء إدخال لقب التلميذ.'); wpFocus('wpLastName'); return; }
    if (!guardianName) { wpNotify('الرجاء إدخال اسم ولي الأمر.'); wpFocus('wpGuardianName'); return; }
    var digits = guardianPhone.replace(/\D/g, '');
    if (digits.length < 8) { wpNotify('الرجاء إدخال رقم هاتف صحيح لولي الأمر.'); wpFocus('wpGuardianPhone'); return; }
    if (!ageInput || age % 1 !== 0 || isNaN(age)) { wpNotify('أدخل عمر التلميذ كرقم بين 6 و14 سنة.'); wpFocus('wpAge'); return; }
  if (age <= 5) { wpNotify('الحد الأدنى لعمر التلميذ هو 6 سنوات.'); wpFocus('wpAge'); return; }
  if (age >= 15) { wpNotify('الحد الأقصى لعمر التلميذ هو 14 سنة.'); wpFocus('wpAge'); return; }

    wpFormData = {
      first_name: firstName,
      last_name: lastName,
      guardian_name: guardianName,
      guardian_phone: guardianPhone,
      age: age,
      reason: reason
    };
    wpOpenLaws();
  };

  window.wpBackToForm = function () {
    wpClearLawsWatchers();
    wpHide(wpById('wp-laws-modal'));
    wpShow(wpById('wp-reg-modal'));
  };

  window.wpCloseLawsOutside = function (event) {
    if (event.target === wpById('wp-laws-modal')) wpBackToForm();
  };

  window.wpLawsAgreeChange = function () {
    var agree = wpById('wpLawsAgree');
    var btn = wpById('wpLawsConfirmBtn');
    if (btn) btn.disabled = !(agree && agree.checked);
  };

  function wpToken(length) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var token = '';
    for (var i = 0; i < length; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
    return token;
  }

  function wpRegId() {
    return 'WP-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  }

  function wpPayload(id) {
    return {
      id: id,
      type: 'winterplus',
      first_name: wpFormData.first_name,
      last_name: wpFormData.last_name,
      birth_date: '',
      phone: wpFormData.guardian_phone,
      parent_name: wpFormData.guardian_name,
      parent_phone: wpFormData.guardian_phone,
      extra: {
        program: 'WinterPlus 2026',
        age: wpFormData.age,
        age_group: wpProgramsForAge(wpFormData.age).group,
        motivation: wpFormData.reason || '',
        days: ['اللغات', 'الرياضة', 'التقنية والإبداع', 'Palm Garden']
      },
      fee_amount: null,
      status: 'مسجل مبدئياً',
      terms_accepted: true,
      student_token: wpToken(32)
    };
  }

  async function wpInsertRegistration() {
    var maxTries = 50;
    for (var attempt = 0; attempt < maxTries; attempt++) {
      var payload = wpPayload(wpRegId());
      var res = await fetch(WP_URL + '/rest/v1/' + WP_TABLE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WP_KEY,
          'Authorization': 'Bearer ' + WP_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) return payload;
      if (res.status === 409) continue;
      var text = await res.text().catch(function () { return ''; });
      throw new Error(text.slice(0, 180) || ('HTTP ' + res.status));
    }
    throw new Error('تعذر توليد رقم متابعة، حاول مرة أخرى.');
  }

  window.wpLawsConfirm = async function () {
    var agree = wpById('wpLawsAgree');
    if (!wpFormData) { wpNotify('انتهت صلاحية النموذج، الرجاء إعادة المحاولة.'); wpBackToForm(); return; }
    if (!agree || !agree.checked) { wpNotify('الرجاء الموافقة على قوانين المركز أولاً.'); return; }

    var btn = wpById('wpLawsConfirmBtn');
    var loading = wpById('wp-loading');
    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ التسجيل...'; }
    wpHide(wpById('wp-laws-modal'));
    if (loading) { loading.classList.add('is-open'); loading.setAttribute('aria-hidden', 'false'); }
    wpSyncLock();

    try {
      var payload = await wpInsertRegistration();
      if (loading) { loading.classList.remove('is-open'); loading.setAttribute('aria-hidden', 'true'); }
      wpSyncLock();
      var successId = wpById('wp-success-id');
      if (successId) successId.textContent = payload.id;
      wpShow(wpById('wp-success-modal'));
      wpFormData = null;
      var form = wpById('wp-reg-form');
      if (form) form.reset();
    } catch (error) {
      if (loading) { loading.classList.remove('is-open'); loading.setAttribute('aria-hidden', 'true'); }
      wpSyncLock();
      if (btn) { btn.disabled = false; btn.textContent = 'تأكيد التسجيل'; }
      wpShow(wpById('wp-laws-modal'));
      wpNotify('تعذر إرسال التسجيل: ' + error.message);
    }
  };

  window.wpCloseSuccess = function () {
    wpHide(wpById('wp-success-modal'));
    if (wpLastFocus && typeof wpLastFocus.focus === 'function') {
      setTimeout(function () { wpLastFocus.focus(); }, 60);
    }
  };

  window.wpCloseSuccessOutside = function (event) {
    if (event.target === wpById('wp-success-modal')) wpCloseSuccess();
  };

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var loading = wpById('wp-loading');
    if (loading && loading.classList.contains('is-open')) return;
    var success = wpById('wp-success-modal');
    if (success && success.classList.contains('is-open')) { wpCloseSuccess(); return; }
    var laws = wpById('wp-laws-modal');
    if (laws && laws.classList.contains('is-open')) { wpBackToForm(); return; }
    var reg = wpById('wp-reg-modal');
    if (reg && reg.classList.contains('is-open')) wpCloseReg();
  });
})();
