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

  // ── Receipt Print (Professional A4 — Apple-invoice style) ──

  function printReceipt(payload) {
    const {
      receiptId, teacherName, subjectName, sessions, rate, amount, date, adminName, note,
      studentBreakdown, totalStudents, totalSessions: totalSess
    } = payload;
    const win = window.open('', '_blank', 'width=794,height=1123');
    if (!win) return false;

    const allRows = Array.isArray(studentBreakdown) && studentBreakdown.length
      ? studentBreakdown.map((s, i) =>
        '<tr><td class="row-num">' + (i + 1) + '</td><td class="row-name">' + (s.name || '---') + '</td><td class="row-sub">' + (s.subject || '---') + '</td><td class="row-att">' + (s.sessions || 0) + '</td><td class="row-abs">' + (s.absent || 0) + '</td><td class="row-amt">' + Number(s.amount || 0).toLocaleString('ar-DZ') + '</td></tr>'
      )
      : [];

    const _date = date || new Date().toISOString().split('T')[0];
    const _fmtDate = (function() {
      try {
        const d = new Date(_date + 'T12:00:00');
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
      } catch(e) { return _date; }
    })();

    const _receiptNum = (receiptId || 'RCP-' + Date.now().toString(36).toUpperCase()).toUpperCase();
    const ROWS_PER_PAGE = 12;
    const pages = [];
    if (allRows.length === 0) {
      pages.push(['<tr><td colspan="6" style="text-align:center;color:#8e8e93;padding:24px">No attendance records</td></tr>']);
    } else {
      for (let i = 0; i < allRows.length; i += ROWS_PER_PAGE) {
        pages.push(allRows.slice(i, i + ROWS_PER_PAGE));
      }
    }

    const pageStyles = '@page{margin:0;size:A4}' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:Inter,-apple-system,BlinkMacSystemFont,Helvetica Neue,Arial,sans-serif;color:#1d1d1f;background:#fff;-webkit-font-smoothing:antialiased;line-height:1.5}' +
    '.page{width:210mm;min-height:297mm;margin:0 auto;padding:0;position:relative;background:#fff;page-break-after:always;overflow:hidden}' +
    '.page:last-child{page-break-after:auto}' +
    '.hdr{padding:48px 64px 36px;display:flex;justify-content:space-between;align-items:flex-start}' +
    '.hdr-logo{display:flex;align-items:center;gap:12px;margin-bottom:6px}' +
    '.hdr-logo img{height:32px;filter:brightness(0)}' +
    '.hdr-brand{font-size:12px;font-weight:600;color:#86868b;letter-spacing:1.5px}' +
    '.hdr-right{text-align:right}' +
    '.hdr-title{font-size:22px;font-weight:700;color:#1d1d1f;letter-spacing:-0.3px;margin-bottom:2px}' +
    '.hdr-num{font-size:12px;font-weight:500;color:#8e8e93;font-family:SF Mono,Fira Code,Consolas,monospace}' +
    '.sep{margin:0 64px;border:none;border-top:1px solid #d2d2d7}' +
    '.body{padding:28px 64px 20px}' +
    '.row{display:flex;justify-content:space-between;margin-bottom:16px}' +
    '.row-block{flex:1}' +
    '.lbl{font-size:10px;font-weight:600;color:#86868b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px}' +
    '.val{font-size:13px;font-weight:600;color:#1d1d1f}' +
    '.tbl-wrap{margin:0 0 24px;border:1px solid #d2d2d7;border-radius:10px;overflow:hidden}' +
    'table{width:100%;border-collapse:collapse}' +
    'thead th{background:#f5f5f7;padding:9px 14px;font-size:10px;font-weight:600;color:#86868b;text-align:left;border-bottom:1px solid #d2d2d7;letter-spacing:0.3px}' +
    'thead th:nth-child(1){width:32px;text-align:center}' +
    'thead th:nth-child(4),thead th:nth-child(5),thead th:nth-child(6){text-align:right}' +
    'tbody td{padding:10px 14px;font-size:12px;font-weight:400;color:#1d1d1f;border-bottom:1px solid #f2f2f7}' +
    'tbody tr:last-child td{border-bottom:none}' +
    '.row-num{text-align:center;color:#8e8e93;font-weight:500}' +
    '.row-name{font-weight:500}' +
    '.row-sub{color:#86868b;font-size:11px}' +
    '.row-att{text-align:right;font-weight:600;color:#059669}' +
    '.row-abs{text-align:right;font-weight:600;color:#dc2626}' +
    '.row-amt{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}' +
    '.total-row{display:flex;justify-content:flex-end;align-items:baseline;margin-bottom:24px;gap:16px}' +
    '.total-lbl{font-size:12px;font-weight:500;color:#86868b}' +
    '.total-val{font-size:26px;font-weight:700;color:#1d1d1f;letter-spacing:-0.5px}' +
    '.total-curr{font-size:13px;font-weight:500;color:#86868b;margin-left:4px}' +
    '.note{background:#f5f5f7;border-radius:8px;padding:12px 18px;margin-bottom:24px}' +
    '.note-text{font-size:11px;font-weight:500;color:#6e6e73}' +
    '.ftr{border-top:1px solid #d2d2d7;padding:24px 64px 36px;display:flex;justify-content:space-between;align-items:flex-end}' +
    '.ftr-sig{text-align:center}' +
    '.ftr-line{width:120px;border-bottom:1px solid #d2d2d7;height:20px;margin-bottom:6px}' +
    '.ftr-sig .lbl{font-size:9px;font-weight:500;color:#8e8e93}' +
    '.ftr-meta{text-align:center}' +
    '.ftr-seal{width:44px;height:44px;border:1.5px solid #d2d2d7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:8px;font-weight:700;color:#c7c7cc;letter-spacing:1px}' +
    '.ftr-disclaimer{font-size:8px;color:#aeaeb2;text-align:center;border-top:1px solid #f2f2f7;padding-top:12px;margin:0 64px}' +
    '.page-num{position:absolute;bottom:14px;left:64px;font-size:9px;color:#c7c7cc}' +
    '.print-btn{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 40px;border:none;border-radius:12px;background:#1d1d1f;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 12px rgba(0,0,0,0.12);transition:all .15s;z-index:10}' +
    '.print-btn:hover{background:#424245}' +
    '@media print{.no-print{display:none!important}body{background:#fff}.page{box-shadow:none}@page{size:A4;margin:0}}';

    let html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Receipt ' + _receiptNum + '</title>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">' +
    '<style>' + pageStyles + '</style></head><body>';

    pages.forEach(function(pageRows, pi) {
      const isFirst = pi === 0;
      const isLast = pi === pages.length - 1;
      html += '<div class="page">';

      if (isFirst) {
        html += '<div class="hdr">' +
          '<div class="hdr-left">' +
            '<div class="hdr-logo"><img src="schoollogo/schoollogoblack.PNG" alt=""></div>' +
            '<div class="hdr-brand">EDUCATION PLUS CENTER</div>' +
          '</div>' +
          '<div class="hdr-right">' +
            '<div class="hdr-title">Payment Receipt</div>' +
            '<div class="hdr-num">' + _receiptNum + '</div>' +
          '</div>' +
        '</div>' +
        '<hr class="sep">' +
        '<div class="body">' +
          '<div class="row">' +
            '<div class="row-block"><div class="lbl">Teacher</div><div class="val">' + (teacherName || '---') + '</div></div>' +
            '<div class="row-block"><div class="lbl">Subject</div><div class="val">' + (subjectName || '---') + '</div></div>' +
            '<div class="row-block"><div class="lbl">Date</div><div class="val">' + _fmtDate + '</div></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="row-block"><div class="lbl">Students</div><div class="val">' + (totalStudents || 0) + '</div></div>' +
            '<div class="row-block"><div class="lbl">Rate / Session</div><div class="val">' + Number(rate || 0).toLocaleString('ar-DZ') + ' DZD</div></div>' +
            '<div class="row-block"><div class="lbl">Total Sessions</div><div class="val">' + (totalSess || 0) + '</div></div>' +
          '</div>';
      } else {
        html += '<div class="hdr" style="padding-bottom:24px">' +
          '<div class="hdr-left">' +
            '<div class="hdr-logo"><img src="schoollogo/schoollogoblack.PNG" alt=""></div>' +
            '<div class="hdr-brand">EDUCATION PLUS CENTER</div>' +
          '</div>' +
          '<div class="hdr-right">' +
            '<div class="hdr-title" style="font-size:16px">Payment Receipt (continued)</div>' +
            '<div class="hdr-num">' + _receiptNum + '</div>' +
          '</div>' +
        '</div>' +
        '<hr class="sep">' +
        '<div class="body" style="padding-top:20px">';
      }

      html += '<div class="tbl-wrap"><table>' +
        '<thead><tr>' +
          '<th>#</th><th>Student</th><th>Subject</th><th style="text-align:right">Attended</th><th style="text-align:right">Absent</th><th style="text-align:right">Amount (DZD)</th>' +
        '</tr></thead>' +
        '<tbody>' + pageRows.join('') + '</tbody>' +
      '</table></div>';

      if (isLast) {
        const totalAtt = allRows.reduce(function(s, r) { const m = r.match(/row-att">(\d+)/); return s + (m ? parseInt(m[1]) || 0 : 0); }, 0);
        const totalAbs = allRows.reduce(function(s, r) { const m = r.match(/row-abs">(\d+)/); return s + (m ? parseInt(m[1]) || 0 : 0); }, 0);
        html += '<div class="total-row">' +
          '<span class="total-lbl">Total Amount</span>' +
          '<span class="total-val">' + Number(amount || 0).toLocaleString('ar-DZ') + '<span class="total-curr"> DZD</span></span>' +
        '</div>' +
        (note ? '<div class="note"><div class="note-text"><strong>Note:</strong> ' + note + '</div></div>' : '');
      }

      html += '</div>';

      if (isLast) {
        html += '<div class="ftr">' +
          '<div class="ftr-sig"><div class="ftr-line"></div><div class="lbl">Teacher</div></div>' +
          '<div class="ftr-meta"><div class="ftr-seal">E+</div><div class="lbl">Education Plus Center</div></div>' +
          '<div class="ftr-sig"><div class="ftr-line"></div><div class="lbl">Admin: ' + (adminName || '---') + '</div></div>' +
        '</div>' +
        '<div class="ftr-disclaimer">Generated electronically by Education Plus Center Management System. ' + _fmtDate + '</div>';
      }

      html += '<div class="page-num">' + (pi + 1) + ' / ' + pages.length + '</div>';
      html += '</div>';
    });

    html += '<button class="print-btn no-print" onclick="window.print()">Print</button>' +
    '<script>window.onafterprint=function(){setTimeout(function(){window.close();},200)};' +
    'if(window.matchMedia){try{window.matchMedia("print").addEventListener("change",function(m){if(!m.matches)setTimeout(function(){window.close()},200)})}catch(e){}}</' + 'script>' +
    '</body></html>';

    win.document.write(html);
    win.document.close();
    return true;
  }

  // ── Expose ────────────────────────────────────────────
  return {
    init, setAuthTokenProvider,
    today, countAttendance, loadConfirmedRegistrations,
    computeDuesForTeacher, addPayment, recomputeBalance,
    getBalance, listBalances, getLedger, getReceipts, saveTeacherRate,
    deleteTransaction, clearTeacherPayments, printReceipt
  };
})();
