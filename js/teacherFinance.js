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

  // ── Receipt Print (Professional A4, Apple-like, no emojis) ──

  function printReceipt(payload) {
    const {
      receiptId, teacherName, subjectName, sessions, rate, amount, date, adminName, note,
      studentBreakdown, totalStudents, totalSessions: totalSess
    } = payload;
    const win = window.open('', '_blank', 'width=794,height=1123');
    if (!win) return false;
    const breakdownRows = Array.isArray(studentBreakdown) && studentBreakdown.length
      ? studentBreakdown.map((s, i) =>
        `<tr>
          <td>${i + 1}</td>
          <td>${s.name || '---'}</td>
          <td>${s.subject || '---'}</td>
          <td class="c-center">${s.sessions || 0}</td>
          <td class="c-left">${Number(s.amount || 0).toLocaleString('ar-DZ')}</td>
        </tr>`
      ).join('')
      : '<tr><td colspan="5" class="c-center" style="color:#86868b">---</td></tr>';

    const _date = date || new Date().toISOString().split('T')[0];
    const _formattedDate = (function() {
      try {
        return new Date(_date + 'T12:00:00').toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch(e) { return _date; }
    })();

    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>Document - ${receiptId}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  @page { margin: 0; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
    background: #fff; color: #1d1d1f; direction: rtl; -webkit-font-smoothing: antialiased;
  }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; position: relative; overflow: hidden; }

  .header-band {
    background: #1d1d1f; padding: 48px 56px 40px; color: #fff; position: relative;
  }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo { display: flex; align-items: center; gap: 14px; }
  .logo img { height: 44px; filter: brightness(0) invert(1); }
  .logo-text { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5); letter-spacing: 2px; text-transform: uppercase; }
  .doc-type { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); letter-spacing: 1px; text-transform: uppercase; text-align: left; }
  .doc-id { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.7); margin-top: 4px; text-align: left; font-family: 'SF Mono', 'Fira Code', monospace; direction: ltr; }
  .header-title { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; margin-bottom: 8px; }
  .header-sub { font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.45); }

  .content { padding: 40px 56px; }
  .section-label { font-size: 11px; font-weight: 700; color: #86868b; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 16px; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #e5e5ea; border-radius: 12px; overflow: hidden; margin-bottom: 36px; }
  .meta-cell { background: #fff; padding: 16px 20px; }
  .meta-cell .label { font-size: 11px; font-weight: 600; color: #86868b; margin-bottom: 4px; }
  .meta-cell .value { font-size: 15px; font-weight: 700; color: #1d1d1f; }

  .table-wrap { border: 1px solid #e5e5ea; border-radius: 12px; overflow: hidden; margin-bottom: 36px; }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    background: #f5f5f7; padding: 12px 16px; font-size: 11px; font-weight: 700; color: #86868b;
    text-align: right; border-bottom: 1px solid #e5e5ea; letter-spacing: 0.3px;
  }
  thead th.c-center { text-align: center; }
  thead th.c-left { text-align: left; }
  tbody td {
    padding: 14px 16px; font-size: 13px; font-weight: 500; color: #1d1d1f;
    border-bottom: 1px solid #f5f5f5;
  }
  tbody td.c-center { text-align: center; font-weight: 700; color: #1d1d1f; }
  tbody td.c-left { text-align: left; font-weight: 700; direction: ltr; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #fafafa; }

  .total-strip {
    background: #1d1d1f; border-radius: 12px; padding: 24px 28px;
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 36px;
  }
  .total-strip .label { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.5); }
  .total-strip .value { font-size: 28px; font-weight: 800; color: #fff; direction: ltr; letter-spacing: -0.5px; }
  .total-strip .currency { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.4); margin-right: 6px; }

  .note-bar {
    background: #f5f5f7; border-radius: 10px; padding: 14px 20px;
    font-size: 12px; color: #86868b; font-weight: 500; margin-bottom: 36px;
  }

  .footer-area {
    border-top: 1px solid #e5e5ea; padding: 24px 56px 40px;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .footer-sig { text-align: center; }
  .footer-sig .line { width: 140px; border-bottom: 1px solid #d1d1d6; margin-bottom: 6px; height: 20px; }
  .footer-sig .label { font-size: 11px; font-weight: 600; color: #86868b; }
  .footer-stamp { text-align: center; }
  .footer-stamp .seal {
    width: 64px; height: 64px; border: 2px solid #e5e5ea; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin: 0 auto 6px;
    font-size: 10px; font-weight: 700; color: #c7c7cc;
  }
  .footer-stamp .label { font-size: 11px; font-weight: 600; color: #86868b; }
  .footer-info { text-align: left; font-size: 10px; color: #c7c7cc; line-height: 1.8; }

  .print-btn {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    padding: 14px 48px; border: none; border-radius: 14px;
    background: #1d1d1f; color: #fff; font-size: 14px; font-weight: 700;
    cursor: pointer; font-family: inherit; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
    transition: all 0.2s;
  }
  .print-btn:hover { background: #424245; transform: translateX(-50%) translateY(-1px); }

  @media print {
    .no-print { display: none !important; }
    body { background: #fff; }
    .page { box-shadow: none; }
    @page { size: A4; margin: 0; }
  }
</style></head><body>

<div class="page">
  <div class="header-band">
    <div class="header-top">
      <div>
        <div class="logo">
          <img src="schoollogo/schoollogoblack.PNG" alt="E-PLUS">
          <span class="logo-text">E-PLUS Academy</span>
        </div>
      </div>
      <div>
        <div class="doc-type">Payment Receipt</div>
        <div class="doc-id">${receiptId || '---'}</div>
      </div>
    </div>
    <div class="header-title">Premium Payment Receipt</div>
    <div class="header-sub">Official teacher payment document for recorded attendance sessions</div>
  </div>

  <div class="content">
    <div class="section-label">Transaction Details</div>
    <div class="meta-grid">
      <div class="meta-cell">
        <div class="label">Teacher Name</div>
        <div class="value">${teacherName || '---'}</div>
      </div>
      <div class="meta-cell">
        <div class="label">Subject</div>
        <div class="value">${subjectName || '---'}</div>
      </div>
      <div class="meta-cell">
        <div class="label">Issue Date</div>
        <div class="value">${_formattedDate}</div>
      </div>
      <div class="meta-cell">
        <div class="label">Total Students</div>
        <div class="value">${totalStudents || 0}</div>
      </div>
      <div class="meta-cell">
        <div class="label">Rate Per Session</div>
        <div class="value">${Number(rate || 0).toLocaleString('ar-DZ')} DZD</div>
      </div>
      <div class="meta-cell">
        <div class="label">Total Sessions</div>
        <div class="value">${totalSess || 0}</div>
      </div>
    </div>

    <div class="section-label">Attendance Breakdown</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th style="width:40px">#</th>
          <th>Student Name</th>
          <th>Subject</th>
          <th class="c-center" style="width:80px">Sessions</th>
          <th class="c-left" style="width:120px">Amount (DZD)</th>
        </tr></thead>
        <tbody>${breakdownRows}</tbody>
      </table>
    </div>

    <div class="total-strip">
      <div class="label">Total Amount Due</div>
      <div><span class="value">${Number(amount || 0).toLocaleString('ar-DZ')}</span><span class="currency">DZD</span></div>
    </div>

    ${note ? '<div class="note-bar"><strong>Note:</strong> ' + note + '</div>' : ''}
  </div>

  <div class="footer-area">
    <div class="footer-sig">
      <div class="line"></div>
      <div class="label">Teacher Signature</div>
    </div>
    <div class="footer-stamp">
      <div class="seal">E+</div>
      <div class="label">Academy Stamp</div>
    </div>
    <div class="footer-sig">
      <div class="line"></div>
      <div class="label">Admin: ${adminName || '---'}</div>
    </div>
  </div>

  <div class="footer-info" style="padding: 0 56px 24px; text-align: left; font-size: 9px; color: #c7c7cc;">
    This document was generated electronically by E-PLUS Academy Management System.<br>
    Valid for administrative and financial records. ${_formattedDate}
  </div>
</div>

<button class="print-btn no-print" onclick="window.print()">Print Receipt</button>
<script>
window.onafterprint=function(){setTimeout(function(){window.close();},200);};
if(window.matchMedia){try{window.matchMedia('print').addEventListener('change',function(m){if(!m.matches)setTimeout(function(){window.close();},200);});}catch(e){}}
</script>
</body></html>`);
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
