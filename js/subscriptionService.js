// ═══════════════════════════════════════════════════════════════
//  SubscriptionService — الاشتراك الشهري للطلاب (1 / 2 / 3 أشهر)
//  ═══════════════════════════════════════════════════════════════
//  • كل شهر دراسي = 8 حصص بالضبط (SESSIONS_PER_MONTH)
//  • سعر الشهر = 2000 دج ⇒ 1 شهر 2000 (8)، 2 شهر 4000 (16)، 3 شهر 6000 (24)
//  • الاشتراك يُقسَّم إلى أشهر مستقلة (student_subscriptions + subscription_periods)
//    بحيث يكون لكل شهر: تواريخه، عدّاده، وحالته (upcoming / active / completed)
//  • كل التواريخ بـ Africa/Algiers (لا تعتمد على Timezone الجهاز)
//  • payment_id يجعل عملية الدفع Idempotent (لا تكرار للمدفوعات)
//
//  الأمان (بعد إعادة التصميم):
//  • القراءة: RPCs مقصورة بكل طالب (get_student_subscription,
//    get_student_attendance_events) — لا قراءة REST مباشرة للجداول.
//  • الإنشاء/الإدارة: عبر Edge Function admin-api (Authorization:
//    Bearer <firebase id token>) → دوال admin_* بمفتاح service_role
//    في الخادم فقط. لا أسرار في المتصفح.
//  • تسجيل الحضور: عبر Edge Function record-attendance (ذرّي في القاعدة)
//    — راجع attendance.html.
// ═══════════════════════════════════════════════════════════════

const SubscriptionService = (function () {
  const ALGERIA_TZ = 'Africa/Algiers';
  const PRICE_PER_MONTH = 2000;
  const SESSIONS_PER_MONTH = 8;
  const MONTH_PRICES = { 1: 2000, 2: 4000, 3: 6000 };
  const MONTH_SESSIONS = { 1: 8, 2: 16, 3: 24 };
  // الباقات الثابتة فقط — السعر والحصص محسوبان ولا يُكتبان يدوياً أبداً
  const PACKAGES = [
    { months: 1, label: 'شهر واحد', price: 2000, sessions: 8 },
    { months: 2, label: 'شهرين', price: 4000, sessions: 16 },
    { months: 3, label: '3 أشهر', price: 6000, sessions: 24 }
  ];
  // الباقات الثابتة لنافذة اشتراك جديد (بفهرستها الظاهرة) — شهر 8 حصص + شهر 4 حصص
  const PACKAGE_BY_INDEX = {
    1: { months: 1, label: 'شهر — 8 حصص', price: 2000, sessions: 8 },
    2: { months: 1, label: 'شهر — 4 حصص', price: 2000, sessions: 4 }
  };
  const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  let SUPABASE_URL = '';
  let SUPABASE_KEY = '';
  let ADMIN_API_URL = '';
  let AUTH_TOKEN_PROVIDER = null;

  function init(url, key) {
    SUPABASE_URL = url || '';
    SUPABASE_KEY = key || '';
    ADMIN_API_URL = (SUPABASE_URL ? SUPABASE_URL + '/functions/v1/admin-api' : '');
  }

  function setAuthTokenProvider(fn) {
    AUTH_TOKEN_PROVIDER = typeof fn === 'function' ? fn : null;
  }

  async function _idToken() {
    if (typeof AUTH_TOKEN_PROVIDER === 'function') {
      return await AUTH_TOKEN_PROVIDER();
    }
    return null;
  }

  function packageByMonths(n) {
    return PACKAGES.find(p => p.months === (parseInt(n, 10) || 1)) || PACKAGES[0];
  }

  function packageByIndex(n) {
    return PACKAGE_BY_INDEX[n] || null;
  }

  function endDateFor(startDate, months) {
    return addDays(addCalendarMonths(startDate, months), -1);
  }

  // ── Africa/Algiers helpers ───────────────────────────────
  function _partsMap() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: ALGERIA_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).formatToParts(new Date());
    const m = {};
    parts.forEach(p => { m[p.type] = p.value; });
    if (m.hour === '24') m.hour = '00';
    return m;
  }

  function today() {
    try {
      const m = _partsMap();
      return m.year + '-' + m.month + '-' + m.day;
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }

  function nowTime() {
    try {
      const m = _partsMap();
      return m.hour + ':' + m.minute + ':' + m.second;
    } catch (e) {
      return new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
  }

  // ── Pure calendar arithmetic on YYYY-MM-DD strings ───────
  function _ymd(s) {
    return { y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10) };
  }
  function _pad(n) { return String(n).padStart(2, '0'); }

  function addCalendarMonths(dateStr, n) {
    const { y, m, d } = _ymd(dateStr);
    const total = (m - 1) + n;
    let ny = y + Math.floor(total / 12);
    let nm = (total % 12) + 1;
    if (nm <= 0) { nm += 12; ny -= 1; }
    const lastDay = new Date(ny, nm, 0).getDate();
    const nd = Math.min(d, lastDay);
    return String(ny).padStart(4, '0') + '-' + _pad(nm) + '-' + _pad(nd);
  }

  function addDays(dateStr, n) {
    const { y, m, d } = _ymd(dateStr);
    const dt = new Date(y, m - 1, d + n);
    return dt.getFullYear() + '-' + _pad(dt.getMonth() + 1) + '-' + _pad(dt.getDate());
  }

  function computePeriodStatus(startDate, endDate, refDate) {
    const r = refDate || today();
    if (r < startDate) return 'upcoming';
    if (r > endDate) return 'completed';
    return 'active';
  }

  // كل شهر: 8 حصص — تُبنى من تاريخ البداية (بداية الشهر الأول = بداية الاشتراك)
  function buildPeriods(startDate, months) {
    const periods = [];
    let s = startDate;
    const ref = today();
    for (let i = 1; i <= months; i++) {
      const nextStart = addCalendarMonths(s, 1);
      const end = addDays(nextStart, -1);
      periods.push({
        monthNumber: i,
        startDate: s,
        endDate: end,
        totalSessions: SESSIONS_PER_MONTH,
        usedSessions: 0,
        remainingSessions: SESSIONS_PER_MONTH,
        status: computePeriodStatus(s, end, ref)
      });
      s = nextStart;
    }
    return periods;
  }

  function computeSubscriptionTotals(periods) {
    const used = (periods || []).reduce((a, p) => a + ((p.usedSessions || p.used_sessions || 0)), 0);
    const total = (periods || []).reduce((a, p) => a + ((p.totalSessions || p.total_sessions || SESSIONS_PER_MONTH)), 0);
    return { totalSessions: total, usedSessions: used, remainingSessions: Math.max(0, total - used) };
  }

  // ── REST helpers (RPC فقط — لا قراءة مباشرة للجداول) ─────
  function _headers(json) {
    const h = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function _rpc(fn, args) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: _headers(true),
      body: JSON.stringify(args || {}),
    });
    if (!res.ok) {
      const e = new Error('HTTP ' + res.status + ' on rpc ' + fn);
      e.status = res.status;
      throw e;
    }
    return res.json();
  }

  async function _adminCall(action, payload) {
    if (!ADMIN_API_URL) throw new Error('SubscriptionService not initialized');
    const token = await _idToken();
    if (!token) throw new Error('admin auth required');
    const res = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(Object.assign({ action: action }, payload || {})),
    });
    let r = null;
    try { r = await res.json(); } catch (e) {}
    if (!res.ok || !r || !r.ok) {
      const err = new Error((r && r.error) || ('HTTP ' + res.status));
      err.code = (r && r.code) || null;
      err.status = res.status;
      throw err;
    }
    return r.data;
  }

  // ── Data access (RPC مقصورة بكل طالب) ───────────────────
  async function getSubscriptions(studentId) {
    try {
      const rows = await _rpc('get_student_subscription', { p_student_id: studentId });
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.warn('[SubscriptionService] get_student_subscription failed:', e);
      return [];
    }
  }

  // الاشتراك الفعّال في تاريخ معيّن؛ إن لم يوجد فعّال نعيد آخر اشتراك غير ملغى
  async function getActiveSubscription(studentId, refDate) {
    const rows = await getSubscriptions(studentId);
    if (!rows.length) return null;
    const r = refDate || today();
    for (const row of rows) {
      const s = row.subscription || {};
      if (s.status === 'cancelled') continue;
      if (r >= s.start_date && r <= s.end_date) {
        return { subscription: s, periods: row.periods || [] };
      }
    }
    for (const row of rows) {
      const s = row.subscription || {};
      if (s.status !== 'cancelled') {
        return { subscription: s, periods: row.periods || [] };
      }
    }
    return null;
  }

  // تطبيع اسم للمطابقة (نفس سلوك _sn في القاعدة): إزالة كل الفروق
  // (فراغات/حروف كبيرة-صغيرة) حتى لا يُرفض اشتراك سليم بسبب اختلاف الكتابة.
  function _normName(x) { return String(x || '').replace(/\s+/g, '').toLowerCase(); }
  // تطبيع اسم الأستاذ (نفس سلوك _ncan): إزالة الفراغات ثم ترتيب الحروف —
  // «عبد الرحمان سرهود» = «سرهود عبدالرحمان».
  function _normTeacher(x) { return _normName(x).split('').sort().join(''); }
  function _eqName(a, b) {
    if (!a || !b) return false;
    return _normName(a) === _normName(b) || _normTeacher(a) === _normTeacher(b);
  }

  // مطابقة اشتراك مع مادة+أستاذ. لو الاشتراك قديم (بدون teacher_id/subject_id)
  // يعمل بالتوافق الرجعي على أساس أن المادة/الأستاذ غير محددين = كل المواد/الأساتذة.
  function _matchesSubjectTeacher(s, subjectId, teacherId) {
    var sId = s.subject_id || '';
    var tId = s.teacher_id || '';
    var sName = s.subject_name || '';
    var tName = s.teacher_name || '';
    if (sId && sId !== (subjectId || '')) {
      if (!sName || !_eqName(sName, subjectId)) return false;
    }
    if (tId && tId !== (teacherId || '')) {
      if (!tName || !_eqName(tName, teacherId)) return false;
    }
    return true;
  }

  function _periodRemaining(p) {
    if (!p) return 0;
    var total = Number(p.total_sessions);
    if (!isFinite(total) || total <= 0) total = SESSIONS_PER_MONTH;
    var used = Number(p.used_sessions) || 0;
    return Math.max(0, total - used);
  }

  // اشتراك مادة+أستاذ محدد نشط في تاريخ معيّن (فصل الحصص بين المواد)
  // يطابق: نفس الطالب + نفس المادة + نفس الأستاذ. لو الاشتراك قديم (بدون
  // teacher_id/subject_id) يعمل بالتوافق على أساس أن المادة غير محددة = كل المواد.
  async function getActiveSubscriptionForSubject(studentId, subjectId, teacherId, refDate) {
    const rows = await getSubscriptions(studentId);
    if (!rows.length) return null;
    const r = refDate || today();
    for (const row of rows) {
      const s = row.subscription || {};
      if (s.status === 'cancelled') continue;
      if (!_matchesSubjectTeacher(s, subjectId, teacherId)) continue;
      if (r >= s.start_date && r <= s.end_date) {
        return { subscription: s, periods: row.periods || [] };
      }
    }
    return null;
  }

  function activePeriod(periods, refDate) {
    const r = refDate || today();
    return (periods || []).find(p => r >= p.start_date && r <= p.end_date) || null;
  }

  // احتياط دائم: اشتراك مدفوع وساري المدة لكن لا توجد «فترة» صالحة للحضور
  // (فترة ناقصة/بتواريخ خاطئة/شهران في صفوف منفصلة). لا يُمنع حضور مدفوع أبداً:
  // يُبنى الاختيار من رصيد الاشتراك نفسه ويُسجَّل الحضور دون خصم فترة محددة.
  function _syntheticPick(sub, periods, r) {
    if (!sub) return null;
    if (sub.status === 'cancelled' || sub.status === 'paused') {
      return { period: null, remaining: 0, attended: 0, permanent: false, allowed: false, synthetic: true };
    }
    if (isPermanent(sub)) return { period: null, remaining: Infinity, attended: 0, permanent: true, allowed: true, synthetic: true };
    const inDate = (!sub.start_date || r >= String(sub.start_date)) && (!sub.end_date || r <= String(sub.end_date));
    if (!inDate) return { period: null, remaining: 0, attended: 0, permanent: false, allowed: false, synthetic: true };
    const used = (periods || []).reduce(function (a, p) { return a + (Number(p.used_sessions) || 0); }, 0);
    let total = Number(sub.total_sessions) || 0;
    if (!total) total = (periods || []).reduce(function (a, p) { return a + (Number(p.total_sessions) || SESSIONS_PER_MONTH); }, 0);
    if (!total) total = (Number(sub.months) || 1) * SESSIONS_PER_MONTH;
    const remaining = Math.max(0, total - used);
    if (remaining <= 0) return { period: null, remaining: 0, attended: used, permanent: false, allowed: false, synthetic: true };
    // إن وُجدت فترة بها رصيد (لكن تواريخها لم تُطابَق) نُرجعها ليُخصم منها الحضور.
    let bestP = null;
    (periods || []).forEach(function (p) {
      if (p && _periodRemaining(p) > 0 && (!bestP || _periodRemaining(p) > _periodRemaining(bestP))) bestP = p;
    });
    return { period: bestP, remaining: remaining, attended: used, permanent: false, allowed: true, synthetic: true };
  }

  // يختار أفضل فترة قابلة لتسجيل الحضور ضمن الاشتراك (يتعامل مع الشهور المتعددة
  // والفترات المتداخلة/غير المتطابقة): أولوية لفترة اليوم إن كانت بها حصص، وإلا
  // لأحدث فترة بدأت وبها حصص متبقية. وإن استُهلكت كل الفترات التي بدأت، ينتقل
  // تلقائياً إلى أقرب فترة قادمة بها حصص ضمن المدة المدفوعة (مثال: اشتراك شهرين).
  function selectCheckInPeriod(sub, periods, refDate) {
    const r = refDate || today();
    if (!sub) return null;
    if (isPermanent(sub)) return { period: null, remaining: Infinity, attended: 0, permanent: true, allowed: true };
    if (sub.status === 'cancelled' || sub.status === 'paused') {
      return { period: null, remaining: 0, attended: 0, permanent: false, allowed: false };
    }
    const list = (periods || []).filter(Boolean).slice().sort(function (a, b) {
      return String(a.start_date || '').localeCompare(String(b.start_date || '')) ||
        ((Number(a.month_number) || 0) - (Number(b.month_number) || 0));
    });
    if (!list.length) return _syntheticPick(sub, [], r);
    const containing = list.find(function (p) { return r >= (p.start_date || '') && r <= (p.end_date || ''); });
    if (containing && _periodRemaining(containing) > 0) {
      return { period: containing, remaining: _periodRemaining(containing), attended: Number(containing.used_sessions) || 0, permanent: false, allowed: true };
    }
    const started = list.filter(function (p) { return (p.start_date || '') <= r && _periodRemaining(p) > 0; });
    if (started.length) {
      const p = started[started.length - 1];
      return { period: p, remaining: _periodRemaining(p), attended: Number(p.used_sessions) || 0, permanent: false, allowed: true };
    }
    // الانتقال للفترة القادمة عند استهلاك كل الفترات التي بدأت — ضمن المدة المدفوعة فقط
    const upcoming = list.filter(function (p) { return (p.start_date || '') > r && _periodRemaining(p) > 0; });
    const withinPaid = (!sub.start_date || r >= String(sub.start_date)) && (!sub.end_date || r <= String(sub.end_date));
    if (upcoming.length && withinPaid) {
      const p = upcoming[0];
      return { period: p, remaining: _periodRemaining(p), attended: Number(p.used_sessions) || 0, permanent: false, allowed: true };
    }
    const last = containing || list[list.length - 1];
    // سلامة أخيرة: اشتراك ساري المدة وبه رصيد مدفوع فعلي لكن لا فترة صالحة
    // تُخصم منها (بيانات الشهر الثاني ناقصة/متداخلة) — لا نمنع الحضور.
    const net = _syntheticPick(sub, list, r);
    if (net && net.allowed) return net;
    return { period: last, remaining: containing ? _periodRemaining(containing) : 0, attended: Number((last || {}).used_sessions) || 0, permanent: false, allowed: false };
  }

  // نقطة الدخول الوحيدة لقرار تسجيل الحضور: يفحص «كل» اشتراكات الطالب
  // (الصفوف المنفصلة/تعدد الشهور) ويعيد أفضل اشتراك+فترة يُسمح بالحضور عليها.
  // يستعمل في بطاقة المادة وفي بوابة التسجيل معاً — فلا تختلف الحالة عن القرار.
  function _pickScore(pick, r) {
    if (!pick || !pick.allowed) return -1;
    let sc = 0;
    if (pick.permanent) sc += 100;
    if (pick.period && r >= String(pick.period.start_date || '') && r <= String(pick.period.end_date || '')) sc += 10;
    sc += Math.min(5, Number(pick.remaining) || 0) * 0.1;
    return sc;
  }
  function resolveCheckIn(rows, subjectId, teacherId, refDate) {
    const r = refDate || today();
    const matches = (rows || []).filter(function (row) {
      const s = row.subscription || {};
      return s.status !== 'cancelled' && _matchesSubjectTeacher(s, subjectId, teacherId);
    });
    let best = null;
    for (const row of matches) {
      const s = row.subscription || {};
      if (s.status === 'paused') continue;
      const pick = selectCheckInPeriod(s, row.periods || [], r);
      if (!best || _pickScore(pick, r) > _pickScore(best.pick, r)) {
        best = { subscription: s, periods: row.periods || [], pick: pick };
      }
    }
    if (best && best.pick && best.pick.allowed) return best;
    // لا يُسمح بالحضور: نعيد اشتراكاً مطابقاً للعرض حتى تظهر الحالة الصحيحة
    // («انتهى الاشتراك» بدل «لا يوجد اشتراك») ويبقى خيار السماح بالحضور.
    for (const row of matches) {
      const s = row.subscription || {};
      if (s.status === 'paused') continue;
      if (isPermanent(s) || (r >= String(s.start_date || '') && r <= String(s.end_date || ''))) {
        const pick = selectCheckInPeriod(s, row.periods || [], r) ||
          { period: null, remaining: 0, attended: 0, permanent: false, allowed: false };
        return { subscription: s, periods: row.periods || [], pick: pick };
      }
    }
    if (best) return best;
    if (matches.length) {
      const row = matches[0];
      return { subscription: row.subscription || {}, periods: row.periods || [], pick: null };
    }
    return null;
  }

  // يبحث في كل اشتراكات الطالب عن أفضل اشتراك مطابق للمادة+الأستاذ يمكن تسجيل
  // الحضور عليه اليوم (يعالج انفصال صفوف الاشتراك أو تعدد الشهور عبر صفوف منفصلة).
  function findBestSubscriptionForSubject(rows, subjectId, teacherId, refDate) {
    const r = refDate || today();
    const matches = (rows || []).filter(function (row) {
      const s = row.subscription || {};
      return s.status !== 'cancelled' && _matchesSubjectTeacher(s, subjectId, teacherId);
    });
    if (!matches.length) return null;
    for (const row of matches) {
      const s = row.subscription || {};
      if (s.status === 'paused') continue;
      const pick = selectCheckInPeriod(s, row.periods || [], r);
      if (pick && pick.allowed) return { subscription: s, periods: row.periods || [] };
    }
    const row = matches[0];
    return { subscription: row.subscription || {}, periods: row.periods || [] };
  }

  // أحداث حضور الطالب من قاعدة البيانات الموثوقة (attendance_sessions)
  async function getStudentEvents(studentId) {
    try {
      const rows = await _rpc('get_student_attendance_events', { p_student_id: studentId });
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.warn('[SubscriptionService] get_student_attendance_events failed:', e);
      return [];
    }
  }

  // ── إدارة (عبر Edge Function admin-api — لا أسرار) ──────
  async function createSubscription(opts) {
    const months = parseInt(opts.months, 10) || 1;
    const start = opts.startDate || today();
    const pkg = packageByMonths(months);
    const isCustom = !!opts.permanent || !!(opts.totalSessions || opts.totalPrice);
    const price = opts.permanent ? (opts.totalPrice || 0) : (isCustom ? (opts.totalPrice || pkg.price) : pkg.price);
    const paymentId = opts.paymentId || ('SUBPAY-' + opts.studentId + '-' + (opts.subjectId || '') + '-' + start + '-' + months + (opts.permanent ? '-PERM' : ''));
    const data = await _adminCall('create-subscription', {
      studentId: opts.studentId,
      months: months,
      startDate: start,
      totalPrice: price,
      paymentId: paymentId,
      notes: opts.notes || '',
      subjectId: opts.subjectId || '',
      teacherId: opts.teacherId || '',
      subjectName: opts.subjectName || '',
      teacherName: opts.teacherName || '',
      ...(opts.permanent ? { permanent: true, totalSessions: 100000 } : isCustom ? { totalSessions: opts.totalSessions || undefined } : {})
    });
    if (!data) throw new Error('create-subscription returned no data');
    return data;
  }

  // قائمة غنية: كل اشتراك مع أشهره (للوحة الإدارة)
  async function adminListSubscriptions() {
    return await _adminCall('list-subscriptions-rich', {});
  }

  async function adminSubscriptionDetail(subscriptionId) {
    return await _adminCall('get-subscription-detail', { subscriptionId: subscriptionId });
  }

  // إيقاف مؤقت (paused) / استئناف (active) — الحضور يتوقف حتى الاستئناف
  async function adminSetSubscriptionPaused(subscriptionId, paused) {
    return await _adminCall('pause-subscription', {
      subscriptionId: subscriptionId,
      paused: paused === true
    });
  }

  async function adminDeleteSubscription(subscriptionId) {
    return await _adminCall('delete-subscription', { subscriptionId: subscriptionId });
  }

  async function adminSetPeriodSessions(periodId, usedSessions) {
    return await _adminCall('set-period-sessions', { periodId: periodId, usedSessions: usedSessions });
  }

  async function incrementPeriodUsage(periodId, amount) {
    try {
      const data = await _rpc('increment_period_usage', { p_period_id: periodId, p_used: amount || 1 });
      return data && data[0] ? data[0] : null;
    } catch (e) {
      console.warn('[SubscriptionService] incrementPeriodUsage failed:', e);
      return null;
    }
  }

  // يبحث عن اشتراك فعّال متداخل مع النافذة المطلوبة [start, end]
  // للنفس الطالب + نفس المادة + نفس الأستاذ (لا يمنع مواد أخرى متوازية)
  async function findOverlapping(studentId, start, months, subjectId, teacherId) {
    const end = endDateFor(start, months);
    let rows = [];
    try { rows = await adminListSubscriptions(); } catch (e) { return null; }
    const arr = Array.isArray(rows) ? rows : [];
    for (const row of arr) {
      const s = row.subscription || {};
      if (String(s.student_id) !== String(studentId)) continue;
      if (s.status === 'cancelled') continue;
      if (subjectId && s.subject_id && s.subject_id !== String(subjectId)) continue;
      if (teacherId && s.teacher_id && s.teacher_id !== String(teacherId)) continue;
      const sStart = s.start_date || '';
      const sEnd = s.end_date || '';
      if (sStart && sEnd && start <= sEnd && end >= sStart) return row;
    }
    return null;
  }

  // ── حالات العرض (لا تعتمد على التاريخ فقط) ─────────────
  // اشتراك: active | upcoming | expired | done | cancelled
  function subscriptionStatus(sub, refDate) {
    const r = refDate || today();
    if (sub.status === 'cancelled') return 'cancelled';
    if (sub.status === 'paused') return 'paused';
    if (sub.status === 'permanent') return 'active';
    if (r < (sub.start_date || '')) return 'upcoming';
    if (r > (sub.end_date || '')) return 'expired';
    const periods = (sub.periods || []);
    const active = periods.find(p => p && r >= p.start_date && r <= p.end_date);
    if (active && (active.remaining_sessions || 0) <= 0) return 'done';
    return 'active';
  }

  function isPermanent(sub) {
    return !!(sub && sub.status === 'permanent');
  }

  function subscriptionStatusLabel(st) {
    switch (st) {
      case 'active': return '🟢 نشط';
      case 'permanent': return '♾️ دائم';
      case 'upcoming': return '⏳ لم يبدأ';
      case 'done': return '📌 مكتمل الحصص';
      case 'expired': return '⚪ انتهى';
      case 'cancelled': return '🚫 ملغى';
      case 'paused': return '⏸️ موقوف مؤقتاً';
      default: return '—';
    }
  }

  // شهر واحد: upcoming | active | full | completed | expired_remain
  function monthStatus(p, refDate) {
    const r = refDate || today();
    const used = p.used_sessions || 0;
    const total = p.total_sessions || SESSIONS_PER_MONTH;
    const remaining = Math.max(0, total - used);
    if (r < (p.start_date || '')) return 'upcoming';
    if (r > (p.end_date || '')) return remaining > 0 ? 'expired_remain' : 'completed';
    return remaining <= 0 ? 'full' : 'active';
  }

  function monthStatusLabel(st) {
    switch (st) {
      case 'active': return '🟢 نشط';
      case 'upcoming': return '⚪ لم يبدأ';
      case 'full': return '🔴 انتهت الحصص';
      case 'completed': return '✅ مكتمل';
      case 'expired_remain': return '⏰ انتهى الشهر — توجد حصص غير مستخدمة';
      default: return '—';
    }
  }

  // ── Formatting (عرض عربي) ────────────────────────────────
  function fmtAr(dateStr, withYear) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr || '—';
    const { y, m, d } = _ymd(dateStr.slice(0, 10));
    return d + ' ' + AR_MONTHS[m - 1] + (withYear ? ' ' + y : '');
  }

  function fmtPrice(n) {
    return String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' دج';
  }

  function statusLabel(s) {
    return s === 'active' ? '🟢 جاري' : s === 'upcoming' ? '⏳ لم يبدأ بعد' : s === 'completed' ? '✅ اكتمل' : '—';
  }

  return {
    init,
    setAuthTokenProvider,
    today,
    nowTime,
    addCalendarMonths,
    addDays,
    computePeriodStatus,
    buildPeriods,
    computeSubscriptionTotals,
    getSubscriptions,
    getActiveSubscription,
    getActiveSubscriptionForSubject,
    findBestSubscriptionForSubject,
    resolveCheckIn,
    activePeriod,
    selectCheckInPeriod,
    getStudentEvents,
    createSubscription,
    adminListSubscriptions,
    adminSubscriptionDetail,
    adminSetSubscriptionPaused,
    adminDeleteSubscription,
    adminSetPeriodSessions,
    incrementPeriodUsage,
    findOverlapping,
    subscriptionStatus,
    subscriptionStatusLabel,
    monthStatus,
    monthStatusLabel,
    packageByMonths,
    packageByIndex,
    endDateFor,
    fmtAr,
    fmtPrice,
    statusLabel,
    isPermanent,
    SESSIONS_PER_MONTH,
    PRICE_PER_MONTH,
    MONTH_PRICES,
    MONTH_SESSIONS,
    PACKAGES
  };
})();
