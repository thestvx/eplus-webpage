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

  async function countAttendance(studentId, subjectId, teacherId) {
    const db = _fb();
    if (!db) return 0;
    try {
      let q = db.collection(ATT_COLLECTION)
        .where('studentId', '==', studentId)
        .where('subjectId', '==', subjectId);
      if (teacherId) q = q.where('teacherId', '==', teacherId);
      const snap = await q.get();
      return snap.size || 0;
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
        const count = await countAttendance(r.id, subjectId, teacherId);
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
    const db = _fb();
    const r = Math.max(0, Math.round(Number(rate) || 0));
    if (db) {
      try { await db.collection('support_teachers').doc(teacherId).update({ rate: r, updatedAt: new Date().toISOString() }); } catch (e) { console.warn('rate save failed', e); }
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

  // ── Receipt Print (RTL، هوية E-PLUS، بدون تنسيق المتصفح الافتراضي) ──

  function printReceipt(payload) {
    const {
      receiptId, teacherName, studentName, subjectName, sessions, rate, amount, date, adminName, note
    } = payload;
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) return false;
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>إيصال - ${receiptId}</title>
<style>
  @page { margin: 8mm; size: 80mm 120mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Tajawal','Segoe UI',Arial,sans-serif; background: #fff; color: #0d1520; margin: 0; padding: 0; direction: rtl; }
  .receipt { max-width: 100%; margin: 0 auto; padding: 8px 10px; }
  .head { text-align: center; border-bottom: 2px dashed #0d1520; padding-bottom: 10px; margin-bottom: 12px; }
  .logo { font-size: 20px; font-weight: 900; color: #7C3AED; letter-spacing: 0.5px; }
  .brand { font-size: 12px; color: #6d28d9; font-weight: 700; margin-top: 2px; }
  .rcpt-id { display: inline-block; margin-top: 6px; font-size: 11px; background: #ede9fe; color: #4c4587; padding: 3px 10px; border-radius: 999px; font-weight: 800; }
  .title { text-align: center; font-size: 15px; font-weight: 900; margin: 10px 0; }
  table.rows { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  table.rows td { padding: 6px 4px; border-bottom: 1px dotted #cbd5e1; }
  table.rows td.k { color: #64748b; font-weight: 700; width: 42%; }
  table.rows td.v { font-weight: 900; text-align: left; }
  .amount-box { text-align: center; margin: 14px 0; padding: 10px; border: 2px solid #0d1520; border-radius: 10px; }
  .amount-box .lbl { font-size: 11px; color: #64748b; font-weight: 700; }
  .amount-box .val { font-size: 22px; font-weight: 900; color: #0d1520; }
  .footer { text-align: center; margin-top: 14px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
  .sig { display: flex; justify-content: space-between; margin-top: 26px; font-size: 11.5px; font-weight: 800; color: #334155; }
  @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body><div class="receipt">
  <div class="head">
    <div class="logo">E-PLUS</div>
    <div class="brand">مؤسسة E-PLUS التعليمية — بقمار</div>
    <div class="rcpt-id">إيصال رقم ${receiptId}</div>
  </div>
  <div class="title">🧾 إيصال دفع مستحقات أستاذ</div>
  <table class="rows">
    <tr><td class="k">اسم الأستاذ</td><td class="v">${teacherName}</td></tr>
    ${studentName ? `<tr><td class="k">التلميذ</td><td class="v">${studentName}</td></tr>` : ''}
    ${subjectName ? `<tr><td class="k">المادة</td><td class="v">${subjectName}</td></tr>` : ''}
    ${sessions ? `<tr><td class="k">عدد الحصص</td><td class="v">${sessions}</td></tr>` : ''}
    ${rate ? `<tr><td class="k">سعر الحصة (دج)</td><td class="v">${rate}</td></tr>` : ''}
    <tr><td class="k">التاريخ</td><td class="v">${date}</td></tr>
    ${note ? `<tr><td class="k">البيان</td><td class="v">${note}</td></tr>` : ''}
  </table>
  <div class="amount-box">
    <div class="lbl">المبلغ المدفوع</div>
    <div class="val">${Number(amount).toLocaleString('ar-DZ')} دج</div>
  </div>
  <div class="sig">
    <span>المدير: ${adminName || 'الإدارة'}</span>
    <span>إمضاء الأستاذ: ............</span>
  </div>
  <div class="footer">شكراً لثقتكم في E-PLUS</div>
  <div style="text-align:center;margin-top:12px">
    <button class="no-print" onclick="window.print()" style="padding:10px 30px;border:none;border-radius:10px;background:#7C3AED;color:#fff;font-weight:800;cursor:pointer">🖨️ طباعة</button>
  </div>
</div><script>window.onafterprint=function(){setTimeout(function(){window.close();},200);};if(window.matchMedia){try{window.matchMedia('print').addEventListener('change',function(m){if(!m.matches)setTimeout(function(){window.close();},200);});}catch(e){}}</script></body></html>`);
    win.document.close();
    return true;
  }

  // ── Expose ────────────────────────────────────────────
  return {
    init, setAuthTokenProvider,
    today, countAttendance, loadConfirmedRegistrations,
    computeDuesForTeacher, addPayment, recomputeBalance,
    getBalance, listBalances, getLedger, getReceipts, saveTeacherRate,
    deleteTransaction, printReceipt
  };
})();
