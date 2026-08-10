// ═══════════════════════════════════════════════════════════════
//  SubscriptionService — الاشتراك الشهري للطلاب (1 / 2 / 3 أشهر)
//  ═══════════════════════════════════════════════════════════════
//  • كل شهر دراسي = 8 حصص بالضبط (SESSIONS_PER_MONTH)
//  • سعر الشهر = 2000 دج ⇒ 1 شهر 2000 (8)، 2 شهر 4000 (16)، 3 شهر 6000 (24)
//  • الاشتراك يُقسَّم إلى أشهر مستقلة (student_subscriptions + subscription_periods)
//    بحيث يكون لكل شهر: تواريخه، عدّاده، وحالته (upcoming / active / completed)
//  • كل التواريخ بـ Africa/Algiers (لا تعتمد على Timezone الجهاز)
//  • payment_id يجعل عملية الدفع Idempotent (لا تكرار للمدفوعات)
// ═══════════════════════════════════════════════════════════════

const SubscriptionService = (function () {
  const ALGERIA_TZ = 'Africa/Algiers';
  const PRICE_PER_MONTH = 2000;
  const SESSIONS_PER_MONTH = 8;
  const MONTH_PRICES = { 1: 2000, 2: 4000, 3: 6000 };
  const MONTH_SESSIONS = { 1: 8, 2: 16, 3: 24 };
  const SUB_TABLE = 'student_subscriptions';
  const PERIOD_TABLE = 'subscription_periods';
  const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  let SUPABASE_URL = '';
  let SUPABASE_KEY = '';

  function init(url, key) {
    SUPABASE_URL = url || '';
    SUPABASE_KEY = key || '';
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

  // ── REST helpers (raw fetch like the rest of the project) ──
  function _headers(json) {
    const h = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  function _enc(v) { return encodeURIComponent(v); }

  async function _list(table, query) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*${query || ''}`, { headers: _headers() });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('[SubscriptionService] list ' + table + ' failed:', e);
      return [];
    }
  }

  async function _insert(table, rows) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: _headers(true),
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + table + ': ' + await res.text());
    return res.json();
  }

  async function _patch(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${_enc(id)}`, {
      method: 'PATCH',
      headers: _headers(true),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + table);
  }

  // ── Data access ──────────────────────────────────────────
  async function getSubscriptions(studentId) {
    return _list(SUB_TABLE, '&student_id=eq.' + _enc(studentId) + '&order=created_at.desc');
  }

  async function getPeriods(subscriptionId) {
    return _list(PERIOD_TABLE, '&subscription_id=eq.' + _enc(subscriptionId) + '&order=month_number.asc');
  }

  // الاشتراك الفعّال في تاريخ معيّن؛ إن لم يوجد فعّال نعيد آخر اشتراك غير ملغى
  // (لتعرض الواجهات "انتهى الاشتراك" بصدق بدلاً من اختلاق بيانات).
  async function getActiveSubscription(studentId, refDate) {
    const subs = await getSubscriptions(studentId);
    if (!subs.length) return null;
    const r = refDate || today();
    for (const s of subs) {
      if (s.status === 'cancelled') continue;
      if (r >= s.start_date && r <= s.end_date) {
        return { subscription: s, periods: await getPeriods(s.id) };
      }
    }
    for (const s of subs) {
      if (s.status !== 'cancelled') {
        return { subscription: s, periods: await getPeriods(s.id) };
      }
    }
    return null;
  }

  function activePeriod(periods, refDate) {
    const r = refDate || today();
    return (periods || []).find(p => r >= p.start_date && r <= p.end_date) || null;
  }

  // إنشاء اشتراك جديد (Subscription B لا يعيد استخدام Subscription A)
  async function createSubscription(opts) {
    const months = parseInt(opts.months, 10) || 1;
    const start = opts.startDate || today();
    const periods = buildPeriods(start, months);
    const end = periods[periods.length - 1].endDate;
    const id = 'SUB-' + opts.studentId + '-' + Date.now().toString(36);
    const paymentId = opts.paymentId || ('SUBPAY-' + opts.studentId + '-' + Date.now().toString(36));

    const sub = {
      id,
      student_id: opts.studentId,
      start_date: start,
      end_date: end,
      months,
      total_price: MONTH_PRICES[months] || (months * PRICE_PER_MONTH),
      total_sessions: MONTH_SESSIONS[months] || (months * SESSIONS_PER_MONTH),
      status: 'active',
      payment_id: paymentId,
      notes: opts.notes || '',
      created_at: new Date().toISOString()
    };
    await _insert(SUB_TABLE, sub);

    const nowIso = new Date().toISOString();
    const periodRows = periods.map(p => ({
      id: id + '-M' + p.monthNumber,
      subscription_id: id,
      month_number: p.monthNumber,
      start_date: p.startDate,
      end_date: p.endDate,
      total_sessions: p.totalSessions,
      used_sessions: 0,
      remaining_sessions: p.totalSessions,
      status: p.status,
      updated_at: nowIso
    }));
    await _insert(PERIOD_TABLE, periodRows);

    return { subscription: sub, periods: periodRows };
  }

  // عدّاد ذرّي (RPC) — يمنع تجاوز حصص الشهر في قاعدة البيانات نفسها
  async function incrementPeriodUsage(periodId, count) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_period_usage`, {
        method: 'POST',
        headers: _headers(true),
        body: JSON.stringify({ p_period_id: periodId, p_used: count || 1 })
      });
      if (!res.ok) return null;
      const r = await res.json();
      return (r && r[0]) || null;
    } catch (e) {
      console.warn('[SubscriptionService] increment_period_usage failed:', e);
      return null;
    }
  }

  async function setPeriodUsage(periodId, used) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_period_usage`, {
        method: 'POST',
        headers: _headers(true),
        body: JSON.stringify({ p_period_id: periodId, p_used: used || 0 })
      });
      if (!res.ok) return null;
      const r = await res.json();
      return (r && r[0]) || null;
    } catch (e) {
      console.warn('[SubscriptionService] set_period_usage failed:', e);
      return null;
    }
  }

  async function refreshPeriodStatus(periodId, refDate) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/refresh_period_status`, {
        method: 'POST',
        headers: _headers(true),
        body: JSON.stringify({ p_period_id: periodId, p_today: refDate || today() })
      });
      if (!res.ok) return null;
      const r = await res.json();
      return (r && r[0] && r[0].refresh_period_status) || r || null;
    } catch (e) {
      console.warn('[SubscriptionService] refresh_period_status failed:', e);
      return null;
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
    today,
    nowTime,
    addCalendarMonths,
    addDays,
    computePeriodStatus,
    buildPeriods,
    computeSubscriptionTotals,
    getSubscriptions,
    getPeriods,
    getActiveSubscription,
    activePeriod,
    createSubscription,
    incrementPeriodUsage,
    setPeriodUsage,
    refreshPeriodStatus,
    fmtAr,
    fmtPrice,
    statusLabel,
    SESSIONS_PER_MONTH,
    PRICE_PER_MONTH,
    MONTH_PRICES,
    MONTH_SESSIONS
  };
})();
