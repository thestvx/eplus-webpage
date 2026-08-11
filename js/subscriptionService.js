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
    const used = (periods || []).reduce((a, p) => a + ((p.usedSessions || 0)), 0);
    const total = (periods || []).length * SESSIONS_PER_MONTH;
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

  function activePeriod(periods, refDate) {
    const r = refDate || today();
    return (periods || []).find(p => r >= p.start_date && r <= p.end_date) || null;
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
    const paymentId = opts.paymentId || ('SUBPAY-' + opts.studentId + '-' + start + '-' + months);
    const data = await _adminCall('create-subscription', {
      studentId: opts.studentId,
      months: months,
      startDate: start,
      totalPrice: MONTH_PRICES[months] || (months * PRICE_PER_MONTH),
      paymentId: paymentId,
      notes: opts.notes || ''
    });
    if (!data) throw new Error('create-subscription returned no data');
    return data;
  }

  async function adminListSubscriptions() {
    return await _adminCall('list-subscriptions', {});
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
    activePeriod,
    getStudentEvents,
    createSubscription,
    adminListSubscriptions,
    fmtAr,
    fmtPrice,
    statusLabel,
    SESSIONS_PER_MONTH,
    PRICE_PER_MONTH,
    MONTH_PRICES,
    MONTH_SESSIONS
  };
})();
