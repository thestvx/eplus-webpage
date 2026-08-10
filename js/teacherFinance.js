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
// ═══════════════════════════════════════════════════════════

window.TeacherFinance = (function () {
  const SUPABASE_URL = 'https://jftfvpultaqufhsekdle.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmdGZ2cHVsdGFxdWZoc2VrZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTI2NzMsImV4cCI6MjA5OTMyODY3M30.ep8b2omBGaN2qUB_XG8EE8XDhoRfAVAwnxOgEodEKBc';

  const ATT_COLLECTION = 'support_attendance';
  const REG_TABLE = 'registrations';
  const BAL_TABLE = 'teacher_balances';
  const TX_TABLE = 'teacher_transactions';
  const RCPT_TABLE = 'teacher_receipts';

  function _headers(json) {
    const h = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  function today() { return new Date().toISOString().split('T')[0]; }
  function _uid(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
  function _fb() { return window._db || window.db || (typeof db !== 'undefined' ? db : null); }
  function _norm(name) { return String(name || '').replace(/\s+/g, '').toLowerCase(); }

  // ── Supabase helpers ───────────────────────────────────

  async function _list(table, query) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*${query || ''}`, { headers: _headers() });
    if (!res.ok) {
      // PGRST205 = relation does not exist — migrations may not be applied yet
      if (res.status === 404) {
        console.warn('[TeacherFinance] table "' + table + '" غير موجودة بعد — نفّذ supabase-migration.sql في Supabase Dashboard.');
        return [];
      }
      throw new Error('HTTP ' + res.status + ' on ' + table);
    }
    return res.json();
  }
  async function _upsert(table, rows) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: _headers(true),
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + table);
    return res.json();
  }
  async function _patch(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: _headers(true),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + table);
  }
  async function _remove(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: _headers(),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + table);
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

  // ── Registrations (Supabase) ───────────────────────────

  async function loadConfirmedRegistrations() {
    const rows = await _list(REG_TABLE, '');
    return rows.filter(r => !r.deleted_at && r.status === 'مسجل نهائياً' && Array.isArray(r.subjects));
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

    // Upsert دفتر المستحقات (يحدّث بدل التكرار)
    if (duesRows.length) await _upsert(TX_TABLE, duesRows);

    await recomputeBalance(teacherId, teacherName, totalSessions, uniqueStudents.size, baseRate, adminName);
    return { duesRows, totalSessions, studentCount: uniqueStudents.size, rate: baseRate };
  }

  // ── Payment: دفعة مستقلة (بدون أي خصم يدوي) ────────────

  async function addPayment(teacher, amount, note, adminName) {
    const teacherId = teacher.teacherId || teacher.id || '';
    const teacherName = teacher.name || '';
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    const txId = _uid('pay');
    const date = today();

    await _upsert(TX_TABLE, [{
      id: txId,
      teacher_id: teacherId,
      teacher_name: teacherName,
      student_id: '',
      student_name: '',
      subject_id: '',
      subject_name: '',
      session_count: 0,
      lesson_rate: 0,
      amount: amt,
      transaction_type: 'payment',
      status: 'paid',
      date: date,
      notes: note || 'دفعة مالية',
      admin_name: adminName || '',
    }]);

    const rcptId = 'RCP-' + date.replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
    await _upsert(RCPT_TABLE, [{
      id: rcptId,
      transaction_id: txId,
      teacher_id: teacherId,
      teacher_name: teacherName,
      amount: amt,
      date: date,
      admin_name: adminName || '',
      notes: note || '',
    }]);

    await recomputeBalance(teacherId, teacherName, null, null, teacher.rate || 0, adminName);
    return { txId, receiptId: rcptId, amount: amt, date };
  }

  // ── Balance: مُستمد بالكامل من دفتر المعاملات ──────────

  async function recomputeBalance(teacherId, teacherName, sessionOverride, studentOverride, rate, adminName) {
    const all = await _list(TX_TABLE, '&teacher_id=eq.' + encodeURIComponent(teacherId));
    let totalDue = 0, totalPaid = 0, sessions = 0;
    const students = new Set();
    let lastRate = Number(rate) || 0;
    all.forEach(t => {
      if (t.transaction_type === 'dues') { totalDue += (t.amount || 0); sessions += (t.session_count || 0); if (t.student_id) students.add(t.student_id); if (Number(t.lesson_rate) > 0) lastRate = Number(t.lesson_rate); }
      else if (t.transaction_type === 'payment') { totalPaid += (t.amount || 0); }
    });
    const row = {
      teacher_id: teacherId,
      teacher_name: teacherName || '',
      total_due: totalDue,
      total_paid: totalPaid,
      pending: totalDue - totalPaid,
      student_count: studentOverride != null ? studentOverride : students.size,
      session_count: sessionOverride != null ? sessionOverride : sessions,
      rate: lastRate,
      updated_at: new Date().toISOString(),
    };
    await _upsert(BAL_TABLE, [row]);
    return row;
  }

  async function getBalance(teacherId) {
    const rows = await _list(BAL_TABLE, '&teacher_id=eq.' + encodeURIComponent(teacherId));
    return rows[0] || null;
  }

  async function getLedger(teacherId) {
    const rows = await _list(TX_TABLE, '&teacher_id=eq.' + encodeURIComponent(teacherId) + '&order=date.desc');
    return rows;
  }

  async function getReceipts(teacherId) {
    return await _list(RCPT_TABLE, '&teacher_id=eq.' + encodeURIComponent(teacherId) + '&order=date.desc');
  }

  // تحديث سعر الحصة الحالي في ملف الأستاذ (Firestore) + دفتر الرصيد
  async function saveTeacherRate(teacherId, rate, adminName) {
    const db = _fb();
    const r = Math.max(0, Math.round(Number(rate) || 0));
    if (db) {
      try { await db.collection('support_teachers').doc(teacherId).update({ rate: r, updatedAt: new Date().toISOString() }); } catch (e) { console.warn('rate save failed', e); }
    }
    await _upsert(BAL_TABLE, [{
      teacher_id: teacherId,
      rate: r,
      updated_at: new Date().toISOString(),
    }]);
    return r;
  }

  // ── حذف معاملة (مع إعادة حساب الرصيد) ──────────────────

  async function deleteTransaction(teacherId, teacherName, txId, rate, adminName) {
    await _remove(TX_TABLE, txId);
    await recomputeBalance(teacherId, teacherName, null, null, rate, adminName);
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
    today, countAttendance, loadConfirmedRegistrations,
    computeDuesForTeacher, addPayment, recomputeBalance,
    getBalance, getLedger, getReceipts, saveTeacherRate,
    deleteTransaction, printReceipt
  };
})();
