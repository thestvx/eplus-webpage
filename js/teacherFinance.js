// ═══════════════════════════════════════════════════════════
//  js/teacherFinance.js — Teacher dues/payments/ledger/receipts
//  (دعم مالي لأساتذة الدعم المدرسي)
//
//  Rules:
//  • dues   = student × subject × teacher × session_count × rate
//  • 1 حضور = 1 حصة بالضبط مرة واحدة (يُحسب من سجلات الحضور فقط،
//    ومعرّف الدفتر ثابت ⇒ إعادة الفتح لا تكرّر)
//  • لا يوجد خصم يدوي إطلاقاً — الدفعات تُسجّل كمعاملات مستقلة
//  • lessonRateAtTransaction = snapshot، تغيّر الأسعار لاحقاً لا يمسّ التاريخ
//  • الرصيد مُستمد من دفتر المعاملات (لا يُخزّن يدوياً)
//
//  الأمان (بعد إعادة التصميم): كل قراءة/كتابة عبر Edge Function
//  admin-api (Authorization: Bearer <firebase id token>) → دوال admin_*
//  بمفتاح service_role في الخادم فقط. لا أسرار REST مباشرة في المتصفح.
// ═══════════════════════════════════════════════════════════

window.TeacherFinance = (function () {
  const ATT_COLLECTION = 'support_attendance';

  let ADMIN_API_URL = '';
  let AUTH_TOKEN_PROVIDER = null;

  function init(url) {
    ADMIN_API_URL = url || '';
  }

  function setAuthTokenProvider(fn) {
    AUTH_TOKEN_PROVIDER = typeof fn === 'function' ? fn : null;
  }

  function today() { return new Date().toISOString().split('T')[0]; }
  function _uid(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
  function _fs() { return window._firestore || null; }
  function _fb() { return window._db || window.db || (typeof db !== 'undefined' ? db : null); }
  function _norm(name) { return String(name || '').replace(/\s+/g, '').toLowerCase(); }

  async function _idToken() {
    if (typeof AUTH_TOKEN_PROVIDER === 'function') {
      return await AUTH_TOKEN_PROVIDER();
    }
    return null;
  }

  // ── admin-api helper ───────────────────────────────────
  // كل الدوال تستدعي admin-api بـ action + payload (معرّف من Firebase ID token)

  async function _adminCall(action, payload) {
    if (!ADMIN_API_URL) throw new Error('TeacherFinance not initialized (init)');
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

  // ── Attendance (Firestore) — 1 حضور = 1 حصة ───────────

  async function countAttendance(studentId, subjectId, teacherId, subjectName, teacherName) {
    const fs = _fs();
    const db = _fb();
    if (!fs || !db) return 0;
    try {
      const { query, where, getDocs, collection } = fs;
      let q = query(collection(db, ATT_COLLECTION),
        where('studentId', '==', studentId));
      const snap = await getDocs(q);
      let count = 0;
      snap.forEach(d => {
        const r = d.data();
        if (r.type === 'grace' || r.type === 'grace_session') return;
        if (teacherName && r.teacherName && _norm(r.teacherName) !== _norm(teacherName)) return;
        if (subjectName && r.subjectName && _norm(r.subjectName) !== _norm(subjectName)) return;
        count++;
      });
      return count;
    } catch (e) {
      console.warn('[TeacherFinance] attendance count failed:', e);
      return 0;
    }
  }

  // ── Registrations (عبر admin-api) ──────────────────────

  async function loadConfirmedRegistrations() {
    const rows = await _adminCall('list-registrations', {});
    return (Array.isArray(rows) ? rows : []).filter(r => !r.deleted_at && r.status === 'مسجل نهائياً' && Array.isArray(r.subjects));
  }

  // ── Dues: تحويل الحضور إلى مستحقات ────────────────────

  // يحسب المستحقات لمعلم معيّن من سجلات الحضور الحقيقية.
  // معرّف الدفتر ثابت (dues_teacher_student_subject) ⇒ إعادة التشغيل
  // لا تكرّر أبداً، بل تحدّث الحصة والرصيد نفسهم.
  async function computeDuesForTeacher(teacher, rate, adminName) {
    const teacherId = teacher.teacherId || teacher.id || '';
    const teacherName = teacher.name || '';
    const baseRate = Number(rate || teacher.rate || 0) || 0;
    const registrations = await loadConfirmedRegistrations();
    const duesRows = [];
    let totalSessions = 0;
    let uniqueStudents = new Set();

    for (const r of registrations) {
      const subjects = r.subjects.filter(s => {
        if (s.teacherId) return s.teacherId === teacherId;
        if (teacherId && s.teacher) return _norm(s.teacher) === _norm(teacherName);
        return false;
      });
      for (const s of subjects) {
        const subjectId = s.subjectId || (window.SubjectService && SubjectService.getSubjectId(s.subject || s.subjectName || '')) || '';
        const subjectName = s.subject || s.subjectName || '';
        const count = await countAttendance(r.id, subjectId, teacherId, subjectName, teacherName);
        if (count <= 0) continue;
        const lessonRate = Number(s.lessonRateAtTransaction) > 0 ? Number(s.lessonRateAtTransaction) : baseRate;
        const amount = count * lessonRate;
        uniqueStudents.add(r.id);
        totalSessions += count;
        duesRows.push({
          id: 'dues_' + teacherId + '_' + r.id + '_' + subjectId,
          teacher_id: teacherId,
          teacher_name: teacherName,
          student_id: r.id,
          student_name: ((r.first_name || '') + ' ' + (r.last_name || '')).trim(),
          subject_id: subjectId,
          subject_name: subjectName,
          session_count: count,
          lesson_rate: lessonRate,
          amount: amount,
          transaction_type: 'dues',
          status: 'pending',
          date: today(),
          notes: count + ' حصة × ' + lessonRate + ' دج',
          admin_name: adminName || '',
        });
      }
    }

    // Upsert دفتر المستحقات (يحدّث بدل التكرار) عبر admin-api
    if (duesRows.length) await _adminCall('upsert-transactions', { rows: duesRows });

    await recomputeBalance(teacherId, teacherName, totalSessions, uniqueStudents.size, baseRate, adminName);
    return { duesRows, totalSessions, studentCount: uniqueStudents.size, rate: baseRate };
  }

  // ── Payment: دفعة مستقلة (بدون أي خصم يدوي) ────────────

  async function addPayment(teacher, amount, note, adminName) {
    const teacherId = teacher.teacherId || teacher.id || '';
    const teacherName = teacher.name || '';
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    const r = await _adminCall('add-payment', {
      teacherId: teacherId,
      teacherName: teacherName,
      amount: amt,
      note: note || '',
      adminName: adminName || '',
      rate: teacher.rate || 0,
    });
    return { txId: r.tx_id, receiptId: r.receipt_id, amount: r.amount, date: r.date };
  }

  // ── Balance: مُستمد بالكامل من دفتر المعاملات ──────────

  async function recomputeBalance(teacherId, teacherName, sessionOverride, studentOverride, rate, adminName) {
    return await _adminCall('recompute-balance', {
      teacherId: teacherId,
      teacherName: teacherName || '',
      sessionOverride: sessionOverride == null ? null : Number(sessionOverride),
      studentOverride: studentOverride == null ? null : Number(studentOverride),
      rate: Number(rate) || 0,
      adminName: adminName || '',
    });
  }

  async function getBalance(teacherId) {
    return await _adminCall('get-balance', { teacherId: teacherId }) || null;
  }

  async function listBalances() {
    const rows = await _adminCall('list-balances', {});
    return Array.isArray(rows) ? rows : [];
  }

  async function getLedger(teacherId) {
    const rows = await _adminCall('get-ledger', { teacherId: teacherId });
    return Array.isArray(rows) ? rows : [];
  }

  async function getReceipts(teacherId) {
    const rows = await _adminCall('get-receipts', { teacherId: teacherId });
    return Array.isArray(rows) ? rows : [];
  }

  // تحديث سعر الحصة الحالي في ملف الأستاذ (Firestore) + دفتر الرصيد
  async function saveTeacherRate(teacherId, rate, adminName) {
    const fs = _fs();
    const db = _fb();
    const r = Math.max(0, Math.round(Number(rate) || 0));
    if (fs && db) {
      try {
        const { doc, updateDoc } = fs;
        await updateDoc(doc(db, 'support_teachers', teacherId), { rate: r, updatedAt: new Date().toISOString() });
      } catch (e) { console.warn('rate save failed', e); }
    }
    return await _adminCall('set-rate', { teacherId: teacherId, rate: r });
  }

  // ── حذف معاملة (مع إعادة حساب الرصيد) ──────────────────

  async function deleteTransaction(teacherId, teacherName, txId, rate, adminName) {
    return await _adminCall('delete-transaction', {
      teacherId: teacherId,
      teacherName: teacherName || '',
      txId: txId,
      rate: Number(rate) || 0,
      adminName: adminName || '',
    });
  }

  // ── مسح جماعي لكل دفعات الأستاذ (زر «مسح سجل الدفعات») ─────
  //    يحذف كل الدفعات المالية (payments) من Supabase مع
  //    الإيصالات والخزينة، ويُبقي المستحقات (dues) دون مساس.
  async function clearTeacherPayments(teacherId, teacherName, rate, adminName) {
    return await _adminCall('clear-payments', {
      teacherId: teacherId,
      teacherName: teacherName || '',
      rate: Number(rate) || 0,
      adminName: adminName || '',
    });
  }

  // ── Receipt (A4 رسمي فاخر — logo، شفافية كاملة، بلا ايموجي) ──

  function _receiptStyles() {
    return '' +
    '@import url("https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap");' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    '.rcpt-page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;color:#1E1B4B;font-family:"Tajawal",sans-serif;direction:rtl;display:flex;flex-direction:column;padding:36px 48px 32px;box-sizing:border-box;position:relative;overflow:hidden}' +
    '.rcpt-deco{position:absolute;left:16px;top:95px;bottom:130px;width:16px;opacity:.09;pointer-events:none}' +
    '.rcpt-deco::before{content:"";position:absolute;left:5px;top:0;bottom:0;width:3px;background:repeating-linear-gradient(135deg,#6D28D9 0 3px,transparent 3px,transparent 10px)}' +
    '.rcpt-deco::after{content:"";position:absolute;left:0;top:0;bottom:0;width:14px;background:repeating-linear-gradient(-135deg,#C9A036 0 2px,transparent 2px,transparent 14px)}' +
    '.rcpt-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px}' +
    '.rcpt-logo{height:50px;width:auto;display:block}' +
    '.rcpt-brand{text-align:left;flex-shrink:0}' +
    '.rcpt-brand-name{font-size:12.5px;font-weight:900;color:#4C1D95;letter-spacing:3.5px;text-transform:uppercase}' +
    '.rcpt-brand-tag{font-size:9px;color:#6B7280;font-weight:600;letter-spacing:.4px;margin-top:2px}' +
    '.rcpt-rule{height:2px;border:none;margin:0 0 22px;border-radius:1px;background:linear-gradient(90deg,#6D28D9 0%,#8B5CF6 35%,#C9A036 70%,#D4A843 100%)}' +
    '.rcpt-kicker{text-align:center;font-size:9px;letter-spacing:4.5px;color:#9CA3AF;font-weight:700;text-transform:uppercase;margin-bottom:5px}' +
    '.rcpt-title{text-align:center;font-size:22px;font-weight:900;color:#1E1B4B;margin:0 0 22px;letter-spacing:.2px}' +
    '.rcpt-info{display:flex;gap:0;margin:0 0 22px;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;background:#FAFAFD}' +
    '.rcpt-info .rcpt-cell{flex:1;padding:13px 16px;border-left:1px solid #F0EFF5}' +
    '.rcpt-info .rcpt-cell:last-child{border-left:none}' +
    '.rcpt-info .rcpt-k{display:block;font-size:8.5px;color:#9CA3AF;font-weight:700;letter-spacing:.4px;margin-bottom:5px;text-transform:uppercase}' +
    '.rcpt-info .rcpt-v{display:block;font-size:13px;font-weight:800;color:#1E1B4B;direction:rtl}' +
    '.rcpt-info .rcpt-v.ltr{direction:ltr;text-align:right}' +
    '.rcpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 26px}' +
    '.rcpt-card{background:#F8F7FC;border:1px solid #EDE9F6;border-radius:14px;padding:14px 16px}' +
    '.rcpt-card-title{font-size:8.5px;font-weight:800;color:#6D28D9;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;padding-bottom:7px;border-bottom:1px solid #EDE9F6}' +
    '.rcpt-card-row{display:flex;justify-content:space-between;align-items:baseline;padding:5.5px 0;font-size:12px}' +
    '.rcpt-card-row:not(:last-child){border-bottom:1px solid #F3F0FA}' +
    '.rcpt-card-row .rcpt-k{color:#6B7280;font-weight:700}' +
    '.rcpt-card-row .rcpt-v{font-weight:800;color:#1E1B4B}' +
    '.rcpt-paid{color:#059669!important}' +
    '.rcpt-amount-box{text-align:center;margin:0 0 22px;padding:28px 24px;border:2px solid #EDE9F6;border-radius:18px;background:linear-gradient(180deg,#FEFEFF,#F8F7FC 100%)}' +
    '.rcpt-amount-label{font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}' +
    '.rcpt-amount-val{font-size:50px;font-weight:900;color:#4C1D95;line-height:1.1;letter-spacing:-1px}' +
    '.rcpt-amount-cur{font-size:15px;font-weight:800;color:#8B5CF6}' +
    '.rcpt-amount-words{font-size:12px;color:#6B7280;font-weight:700;margin-top:8px}' +
    '.rcpt-thanks{display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 20px;border:1px solid #EDE9F6;border-radius:12px;background:#FAFAFD;margin-bottom:0;font-size:12px;color:#4C1D95;font-weight:700}' +
    '.rcpt-thanks-icon{color:#C9A036;font-size:9px}' +
    '.rcpt-note{padding:11px 16px;border:1px solid #EDE9F6;border-radius:12px;background:#FAFAFD;margin-bottom:0;font-size:11.5px;color:#6B7280;font-weight:600}' +
    '.rcpt-sigs{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-top:auto;padding-top:44px}' +
    '.rcpt-sig{text-align:center;flex:1}' +
    '.rcpt-sig-line{width:136px;border-bottom:1.5px solid #1E1B4B;height:26px;margin:0 auto}' +
    '.rcpt-sig .rcpt-sig-label{font-size:10px;color:#6B7280;font-weight:700;margin-top:3px}' +
    '.rcpt-mid{text-align:center;flex:0 0 auto;padding:0 18px}' +
    '.rcpt-mid img{height:40px;display:block;margin:0 auto 3px}' +
    '.rcpt-mid span{font-size:8.5px;color:#9CA3AF;font-weight:700;letter-spacing:.4px}' +
    '.rcpt-footer{border-top:1px solid #EDE9F6;margin-top:16px;padding-top:10px;text-align:center;font-size:8.5px;color:#9CA3AF;line-height:1.7}' +
    '@media print{.rcpt-page{box-shadow:none;margin:0;padding:28px 40px;min-height:100vh}@page{size:A4 portrait;margin:0}}';
  }

  // تحويل المبلغ إلى حروف عربية (فقط لا غير) للصيغة الرسمية
  function _numWords(num) {
    const n = Math.floor(Number(num) || 0);
    if (n <= 0) return '';
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hunds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    function tri(x) {
      x = Math.floor(x);
      if (!x) return '';
      const h = Math.floor(x / 100);
      const r = x % 100;
      let part = '';
      if (r) {
        if (r < 10) part = ones[r];
        else if (r < 20) part = teens[r - 10];
        else part = (r % 10 ? ones[r % 10] + ' و' : '') + tens[Math.floor(r / 10)];
      }
      if (h) part = part ? hunds[h] + ' و' + part : hunds[h];
      return part;
    }
    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const rest = n % 1000;
    let s = '';
    if (millions) {
      s += tri(millions) + ' ' + (millions === 1 ? 'مليون' : millions === 2 ? 'مليونان' : millions <= 10 ? 'ملايين' : 'مليون');
    }
    if (thousands) {
      if (s) s += ' و';
      s += tri(thousands) + ' ' + (thousands === 1 ? 'ألف' : thousands === 2 ? 'ألفان' : thousands <= 10 ? 'آلاف' : 'ألف');
    }
    if (rest) {
      if (s) s += ' و';
      s += tri(rest);
    }
    return s;
  }

  function _receiptBody(payload) {
    const p = payload || {};
    const _receiptNum = (p.receiptId || ('RCP-' + (p.date || today()).replace(/-/g, '') + '-0000')).toUpperCase();
    const fmt = n => { try { return Number(n || 0).toLocaleString('ar-DZ'); } catch(e) { return String(Number(n) || 0); } };
    const _date = p.date ? String(p.date).split('-').reverse().join(' / ') : '—';
    const words = _numWords(p.amount);

    const card1 = [];
    if (p.teacherName) card1.push(['الأستاذ(ة)', p.teacherName]);
    if (p.subjectName) card1.push(['المادة', p.subjectName]);
    if (Number(p.rate)) card1.push(['سعر الحصة', fmt(p.rate) + ' دج']);
    const card2 = [];
    if (Number(p.totalSessions)) card2.push(['عدد الحصص', fmt(p.totalSessions) + ' حصة']);
    if (Number(p.totalStudents)) card2.push(['عدد التلاميذ', fmt(p.totalStudents)]);
    card2.push(['الحالة', 'مسدد بالكامل']);

    const row = r => '<div class="rcpt-card-row"><span class="rcpt-k">' + r[0] + '</span><span class="rcpt-v">' + r[1] + '</span></div>';
    const thanks = p.note
      ? '<div class="rcpt-note">ملاحظة: ' + p.note + '</div>'
      : '<div class="rcpt-thanks"><span class="rcpt-thanks-icon">✦&nbsp;✦</span> نُشكر الأستاذ(ة) على ثقته في المركز التعليمي.</div>';

    return '' +
    '<div class="rcpt-page">' +
      '<div class="rcpt-deco"></div>' +
      '<div class="rcpt-header">' +
        '<img class="rcpt-logo" src="schoollogo/schoollogoblack.PNG" alt="logo">' +
        '<div class="rcpt-brand"><div class="rcpt-brand-name">EDUCATION PLUS CENTER</div><div class="rcpt-brand-tag">أكاديمية التعليم والدعم المدرسي</div></div>' +
      '</div>' +
      '<hr class="rcpt-rule">' +
      '<div class="rcpt-kicker">OFFICIAL PAYMENT RECEIPT</div>' +
      '<div class="rcpt-title">إيصال لسداد مستحقات</div>' +
      '<div class="rcpt-info">' +
        '<div class="rcpt-cell"><span class="rcpt-k">رقم الوصل</span><span class="rcpt-v ltr">' + _receiptNum + '</span></div>' +
        '<div class="rcpt-cell"><span class="rcpt-k">تاريخ الإيصال</span><span class="rcpt-v">' + _date + '</span></div>' +
        '<div class="rcpt-cell"><span class="rcpt-k">المبلغ المدفوع</span><span class="rcpt-v">' + fmt(p.amount) + ' دج</span></div>' +
      '</div>' +
      '<div class="rcpt-grid">' +
        '<div class="rcpt-card"><div class="rcpt-card-title">بيانات الأستاذ</div>' + (card1.length ? card1.map(row).join('') : '<div class="rcpt-card-row"><span class="rcpt-k">الأستاذ</span><span class="rcpt-v">—</span></div>') + '</div>' +
        '<div class="rcpt-card"><div class="rcpt-card-title">تفاصيل الدفع</div>' + (card2.length ? card2.map(row).join('') : '') + '</div>' +
      '</div>' +
      '<div class="rcpt-amount-box">' +
        '<div class="rcpt-amount-label">المبلغ الإجمالي المدفوع</div>' +
        '<div class="rcpt-amount-val">' + fmt(p.amount) + ' <span class="rcpt-amount-cur">دج</span></div>' +
        (words ? '<div class="rcpt-amount-words">' + words + ' دينار جزائري</div>' : '') +
      '</div>' +
      thanks +
      '<div class="rcpt-sigs">' +
        '<div class="rcpt-sig"><div class="rcpt-sig-line"></div><div class="rcpt-sig-label">توقيع الأستاذ(ة)</div></div>' +
        '<div class="rcpt-mid"><img src="schoollogo/schoollogoblack.PNG" alt="logo"><span>EDUCATION PLUS CENTER</span></div>' +
        '<div class="rcpt-sig"><div class="rcpt-sig-line"></div><div class="rcpt-sig-label">الإدارة: ' + (p.adminName || '—') + '</div></div>' +
      '</div>' +
      '<div class="rcpt-footer">وصل إلكتروني رسمي صادر عبر نظام إدارة أكاديمية التعليم والدعم المدرسي — يُحتفظ به للرجوع إليه</div>' +
    '</div>';
  }

  // HTML جاهز للعرض داخل نافذة (preview/معاينة)
  function buildReceiptHtml(payload) {
    return '<style>' + _receiptStyles() + '</style>' + _receiptBody(payload || {});
  }

  function printReceipt(payload) {
    const win = window.open('', '_blank', 'width=850,height=1100');
    if (!win) return false;
    const styles = _receiptStyles() +
      '.print-btn{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:14px 46px;border:none;border-radius:12px;background:#1d1d1f;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;z-index:10}' +
      '@media print{.no-print{display:none!important}}';
    const doc = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>وصل ' + ((payload && payload.receiptId) || '').toUpperCase() + '</title><style>' + styles + '</style></head><body style="background:#e8e8ed">' +
      _receiptBody(payload || {}) +
      '<button class="print-btn no-print" onclick="window.print()">🖨️ طباعة</button>' +
      '<script>window.onafterprint=function(){setTimeout(function(){window.close();},200)};' +
      'if(window.matchMedia){try{window.matchMedia("print").addEventListener("change",function(m){if(!m.matches)setTimeout(function(){window.close()},200)})}catch(e){}}</' + 'script>' +
      '</body></html>';
    win.document.open();
    win.document.write(doc);
    win.document.close();
    return true;
  }

  // ── Expose ────────────────────────────────────────────
  return {
    init, setAuthTokenProvider,
    today, countAttendance, loadConfirmedRegistrations,
    computeDuesForTeacher, addPayment, recomputeBalance,
    getBalance, listBalances, getLedger, getReceipts, saveTeacherRate,
    deleteTransaction, clearTeacherPayments, printReceipt, buildReceiptHtml
  };
})();
