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

  // ── Receipt Print (Premium, RTL, academy logo, per-student breakdown) ──

  function printReceipt(payload) {
    const {
      receiptId, teacherName, subjectName, sessions, rate, amount, date, adminName, note,
      studentBreakdown, totalStudents, totalSessions: totalSess
    } = payload;
    const win = window.open('', '_blank', 'width=520,height=800');
    if (!win) return false;
    const breakdownRows = Array.isArray(studentBreakdown) && studentBreakdown.length
      ? studentBreakdown.map((s, i) =>
        `<tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:12px 14px;font-weight:700;color:#1e293b">${i + 1}</td>
          <td style="padding:12px 14px;font-weight:700;color:#1e293b">${s.name || '—'}</td>
          <td style="padding:12px 14px;text-align:center;font-weight:800;color:#6366f1">${s.sessions || 0}</td>
          <td style="padding:12px 14px;text-align:left;font-weight:800;color:#059669">${Number(s.amount || 0).toLocaleString('ar-DZ')} دج</td>
        </tr>`
      ).join('')
      : `<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8;font-weight:700">لا توجد تفاصيل حضور</td></tr>`;

    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>وصل مالي — ${receiptId}</title>
<style>
  @page { margin: 12mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Tajawal','Segoe UI',Arial,sans-serif; background: #f8f9fc; color: #1e293b; direction: rtl; }
  .page { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden; }
  .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 28px 24px; text-align: center; position: relative; }
  .header::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 24px; background: #fff; border-radius: 24px 24px 0 0; }
  .logo-wrap { display: flex; justify-content: center; margin-bottom: 12px; }
  .logo-wrap img { height: 64px; width: auto; filter: brightness(0) invert(1); }
  .brand-name { font-size: 18px; font-weight: 900; color: #fff; letter-spacing: 1px; }
  .brand-sub { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }
  .success-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); color: #059669; padding: 6px 18px; border-radius: 999px; font-size: 13px; font-weight: 800; margin: 20px auto 0; }
  .success-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: #059669; }
  .success-sub { text-align: center; font-size: 11.5px; color: #94a3b8; margin-top: 8px; font-weight: 600; }
  .body { padding: 24px 28px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
  .info-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .info-val { font-size: 14px; font-weight: 900; color: #1e293b; }
  .info-val.primary { color: #6366f1; }
  .divider { border: none; border-top: 2px dashed #e2e8f0; margin: 16px 0; }
  .section-title { font-size: 13px; font-weight: 900; color: #64748b; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .detail-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
  .detail-table th { background: #f1f5f9; padding: 10px 14px; font-size: 11px; font-weight: 800; color: #64748b; text-align: right; border-bottom: 2px solid #e2e8f0; }
  .detail-table th:nth-child(3), .detail-table th:nth-child(4) { text-align: center; }
  .detail-table td { font-size: 13px; }
  .total-box { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; padding: 20px; text-align: center; margin: 20px 0; }
  .total-label { font-size: 12px; color: rgba(255,255,255,0.8); font-weight: 700; }
  .total-amount { font-size: 32px; font-weight: 900; color: #fff; margin-top: 4px; direction: ltr; }
  .total-currency { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); }
  .footer { text-align: center; padding: 20px 28px; border-top: 1px solid #f1f5f9; }
  .footer-note { font-size: 11px; color: #94a3b8; line-height: 1.8; }
  .receipt-id-badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.9); margin-top: 8px; }
  .print-btn { display: block; width: 100%; padding: 14px; border: none; border-radius: 14px; background: linear-gradient(135deg, #059669, #047857); color: #fff; font-size: 15px; font-weight: 900; cursor: pointer; font-family: inherit; margin-top: 20px; box-shadow: 0 4px 16px rgba(5,150,105,0.25); }
  .print-btn:hover { transform: translateY(-1px); }
  @media print { .no-print { display: none !important; } body { background: #fff; } .page { box-shadow: none; border-radius: 0; } }
  @media (max-width: 540px) { .page { border-radius: 0; margin: 0; } .info-grid { grid-template-columns: 1fr; } }
</style></head><body>
<div class="page">
  <div class="header">
    <div class="logo-wrap"><img src="schoollogo/schoollogoblack.PNG" alt="E-PLUS"></div>
    <div class="brand-name">E-PLUS Academy</div>
    <div class="brand-sub">مؤسسة E-PLUS التعليمية — بقمار</div>
    <div class="receipt-id-badge">رقم الوصل: ${receiptId}</div>
  </div>

  <div class="body">
    <div style="text-align:center">
      <div class="success-badge"><span class="dot"></span> تم إصدار الوصل بنجاح</div>
      <div class="success-sub">مستحقات الأستاذ عن الحصص المسجلة</div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">الأستاذ</div>
        <div class="info-val">${teacherName || '—'}</div>
      </div>
      <div class="info-card">
        <div class="info-label">المادة</div>
        <div class="info-val">${subjectName || '—'}</div>
      </div>
      <div class="info-card">
        <div class="info-label">تاريخ الإصدار</div>
        <div class="info-val">${date || '—'}</div>
      </div>
      <div class="info-card">
        <div class="info-label">إجمالي التلاميذ</div>
        <div class="info-val primary">${totalStudents || 0} تلميذ</div>
      </div>
    </div>

    <div class="info-card" style="background:rgba(99,102,241,0.04);border-color:rgba(99,102,241,0.15);margin-bottom:16px;text-align:center">
      <div class="info-label">سعر الحصة الواحدة</div>
      <div class="info-val primary" style="font-size:20px">${Number(rate || 0).toLocaleString('ar-DZ')} دج</div>
    </div>

    <hr class="divider">

    <div class="section-title">📊 تفاصيل الحضور والحساب</div>
    <table class="detail-table">
      <thead><tr>
        <th>#</th>
        <th>اسم التلميذ</th>
        <th style="text-align:center">الحصص</th>
        <th style="text-align:center">المستحق</th>
      </tr></thead>
      <tbody>${breakdownRows}</tbody>
    </table>

    <div class="total-box">
      <div class="total-label">إجمالي المستحقات</div>
      <div class="total-amount">${Number(amount || 0).toLocaleString('ar-DZ')} <span class="total-currency">دج</span></div>
    </div>

    ${note ? '<div style="text-align:center;font-size:11px;color:#94a3b8;margin-bottom:8px">البيان: ' + note + '</div>' : ''}
  </div>

  <div class="footer">
    <div class="footer-note">
      MANAGEMENT: ${adminName || 'الإدارة'}<br>
      هذا الوصل تم إنشاؤه إلكترونياً من نظام E-PLUS Academy
    </div>
    <button class="print-btn no-print" onclick="window.print()">🖨️ طباعة الوصل</button>
  </div>
</div>
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
