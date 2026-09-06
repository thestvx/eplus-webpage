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

  // ── Active monthly subscriptions (عبر admin-api) ────────
  //  يُرجع أزواج (student_id, subject) ذات اشتراك شهري نشط عند الأستاذ.
  //  تُستخدم لاحتساب المستحقات لذوي الاشتراك الشهري النشط فقط.

  function _sEqual(a, b) {
    return _norm(a) === _norm(b);
  }

  async function loadActiveSubs(teacherId) {
    try {
      const rows = await _adminCall('list-active-subs', { teacherId: teacherId });
      if (!Array.isArray(rows)) return { list: [], ok: false };
      return { list: rows, ok: true };
    } catch (e) {
      console.warn('[TeacherFinance] load active subs failed:', e);
      return { list: [], ok: false };
    }
  }

  function isActiveSubActive(studentId, subjectName, activeSubs) {
    for (let i = 0; i < activeSubs.length; i++) {
      const s = activeSubs[i];
      if (String(s.student_id) !== String(studentId)) continue;
      if (_sEqual(s.subject_name, subjectName)) return true;
      if (s.subject_id && _sEqual(s.subject_id, subjectName)) return true;
    }
    return false;
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
    const activeSubsRes = await loadActiveSubs(teacherId);
    const activeSubs = activeSubsRes.list;
    const filterDues = activeSubsRes.ok;
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
        if (filterDues && !isActiveSubActive(r.id, subjectName, activeSubs)) continue;
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
        const { doc, updateDoc, getDocs, query, collection, where } = fs;
        // مستندات support_teachers تُخزَّن بمعرّفات Firestore تلقائية، لذلك
        // نبحث عن المستند الحقيقي للأستاذ بحقل teacherId ثم نحدّث سعره هناك.
        let targetDocId = teacherId;
        try {
          const q = query(collection(db, 'support_teachers'), where('teacherId', '==', teacherId));
          const snap = await getDocs(q);
          if (!snap.empty) targetDocId = snap.docs[0].id;
        } catch (e) { console.warn('rate doc lookup failed', e); }
        await updateDoc(doc(db, 'support_teachers', targetDocId), { rate: r, updatedAt: new Date().toISOString() });
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
    '.rcpt-page{width:210mm;min-height:297mm;margin:0 auto;font-family:"Tajawal",sans-serif;direction:rtl;display:flex;flex-direction:column;padding:38px 50px 32px;box-sizing:border-box;position:relative;overflow:hidden;color:#221A44;' +
      'background:radial-gradient(1100px 480px at 50% -120px,rgba(124,58,237,.07),transparent 62%),radial-gradient(900px 520px at 100% 108%,rgba(76,29,149,.09),transparent 60%),radial-gradient(760px 420px at 0% 115%,rgba(109,40,217,.06),transparent 55%),linear-gradient(180deg,#FDFCFF 0%,#FAF8FE 55%,#F6F2FB 100%)}' +
    '.rcpt-page,.rcpt-page *{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.rcpt-bg{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}' +
    '.rcpt-page>*:not(.rcpt-bg){position:relative;z-index:1}' +
    '.bg-arc{position:absolute;border-radius:50%}' +
    '.bg-arc-1{width:560px;height:560px;border:1.5px solid rgba(76,29,149,.14);top:-210px;left:-250px}' +
    '.bg-arc-2{width:380px;height:380px;border:1px solid rgba(76,29,149,.10);top:-120px;left:-160px}' +
    '.bg-arc-3{width:210px;height:210px;border:1px solid rgba(109,40,217,.08);top:-40px;left:-70px}' +
    '.bg-arc-4{width:820px;height:820px;border:1.5px solid rgba(76,29,149,.08);bottom:-360px;right:-380px}' +
    '.bg-arc-5{width:560px;height:560px;border:1px solid rgba(109,40,217,.08);bottom:-180px;right:-220px}' +
    '.bg-arc-6{width:300px;height:300px;border:1px solid rgba(124,58,237,.06);bottom:-60px;right:-110px}' +
    '.bg-band{position:absolute;top:0;bottom:0;left:0;width:230px;background-image:repeating-linear-gradient(135deg,rgba(76,29,149,.045) 0 1.5px,transparent 1.5px 22px),repeating-linear-gradient(-135deg,rgba(109,40,217,.035) 0 1.5px,transparent 1.5px 30px)}' +
    '.bg-band::before{content:"";position:absolute;top:0;bottom:0;left:26px;width:1px;background:linear-gradient(180deg,transparent,rgba(109,40,217,.10) 18%,rgba(109,40,217,.10) 82%,transparent)}' +
    '.bg-glow{position:absolute;border-radius:50%}' +
    '.bg-glow-1{width:520px;height:520px;top:-160px;left:50%;transform:translateX(-50%);background:radial-gradient(50% 50% at 50% 50%,rgba(124,58,237,.08),transparent 70%)}' +
    '.bg-glow-2{width:640px;height:640px;right:-280px;bottom:-320px;background:radial-gradient(50% 50% at 50% 50%,rgba(76,29,149,.10),transparent 70%)}' +
    '.bg-gem{position:absolute;width:8px;height:8px;background:#C9A036;opacity:.4;transform:rotate(45deg)}' +
    '.bg-gem-1{top:64px;left:38px;width:11px;height:11px}' +
    '.bg-gem-2{bottom:96px;right:54px;opacity:.3}' +
    '.bg-gem-3{top:192px;left:58px;width:6px;height:6px;opacity:.25}' +
    '.rcpt-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:15px}' +
    '.rcpt-logo{height:54px;width:auto;display:block}' +
    '.rcpt-brand{text-align:left;flex-shrink:0}' +
    '.rcpt-brand-name{font-size:13px;font-weight:900;color:#4C1D95;letter-spacing:4px;text-transform:uppercase}' +
    '.rcpt-brand-tag{font-size:9px;color:#837C9C;font-weight:600;letter-spacing:.4px;margin-top:2px}' +
    '.rcpt-rule{position:relative;height:1px;border:none;margin:0 0 20px;background:linear-gradient(90deg,transparent,rgba(76,29,149,.22) 22%,rgba(76,29,149,.22) 78%,transparent)}' +
    '.rcpt-rule::after{content:"";position:absolute;left:50%;top:-3px;width:7px;height:7px;background:#C9A036;opacity:.5;transform:translateX(-50%) rotate(45deg)}' +
    '.rcpt-kicker{text-align:center;font-size:8.5px;letter-spacing:5px;color:#8A83A3;font-weight:700;text-transform:uppercase;margin-bottom:6px}' +
    '.rcpt-title{text-align:center;font-size:24px;font-weight:900;color:#201742;margin:0 0 20px;letter-spacing:.2px}' +
    '.rcpt-info{display:flex;gap:0;margin:0 0 20px;border:1px solid #EAE5F2;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.72);box-shadow:0 6px 22px rgba(76,29,149,.045)}' +
    '.rcpt-info .rcpt-cell{flex:1;padding:14px 18px;border-left:1px solid #F0ECF7}' +
    '.rcpt-info .rcpt-cell:last-child{border-left:none}' +
    '.rcpt-info .rcpt-k{display:block;font-size:8.5px;color:#8A83A3;font-weight:700;letter-spacing:.5px;margin-bottom:5px;text-transform:uppercase}' +
    '.rcpt-info .rcpt-v{display:block;font-size:13.5px;font-weight:800;color:#221A44;direction:rtl}' +
    '.rcpt-info .rcpt-v.ltr{direction:ltr;text-align:right}' +
    '.rcpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 24px}' +
    '.rcpt-card{background:rgba(255,255,255,.6);border:1px solid #EAE5F2;border-radius:16px;padding:15px 18px;box-shadow:0 4px 14px rgba(76,29,149,.035)}' +
    '.rcpt-card-title{font-size:8.5px;font-weight:800;color:#6D28D9;letter-spacing:1.8px;text-transform:uppercase;margin-bottom:9px;padding-bottom:8px;border-bottom:1px solid #EDE8F6}' +
    '.rcpt-card-row{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;font-size:12.5px}' +
    '.rcpt-card-row:not(:last-child){border-bottom:1px solid #F3EFFA}' +
    '.rcpt-card-row .rcpt-k{color:#837C9C;font-weight:700}' +
    '.rcpt-card-row .rcpt-v{font-weight:800;color:#221A44}' +
    '.rcpt-paid{color:#4C1D95!important;font-weight:900}' +
    '.rcpt-amount-box{position:relative;text-align:center;margin:0 0 18px;padding:34px 28px 28px;border:1px solid #E2DCF1;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(244,240,252,.66));box-shadow:0 10px 34px rgba(76,29,149,.06)}' +
    '.rcpt-amount-box::before{content:"";display:block;width:54px;height:2px;background:#C9A036;margin:0 auto 16px;border-radius:2px;opacity:.75}' +
    '.rcpt-amount-label{font-size:9px;font-weight:700;color:#8A83A3;letter-spacing:3.5px;text-transform:uppercase;margin-bottom:8px}' +
    '.rcpt-amount-val{font-size:56px;font-weight:900;color:#24184A;line-height:1.05;letter-spacing:-1.5px}' +
    '.rcpt-amount-cur{font-size:16px;font-weight:800;color:#6D28D9}' +
    '.rcpt-amount-words{font-size:12.5px;color:#6E6784;font-weight:700;margin-top:12px}' +
    '.rcpt-thanks{display:flex;align-items:center;justify-content:center;gap:10px;padding:13px 20px;border:1px solid #EAE5F2;border-radius:14px;background:rgba(255,255,255,.68);box-shadow:0 4px 14px rgba(76,29,149,.03);margin-bottom:0;font-size:12px;color:#4C1D95;font-weight:700}' +
    '.rcpt-thanks-icon{color:#C9A036;font-size:9px}' +
    '.rcpt-note{padding:12px 16px;border:1px solid #EAE5F2;border-radius:14px;background:rgba(255,255,255,.68);margin-bottom:0;font-size:11.5px;color:#6E6784;font-weight:600}' +
    '.rcpt-sigs{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-top:auto;padding-top:42px}' +
    '.rcpt-sig{text-align:center;flex:1}' +
    '.rcpt-sig-line{width:150px;border-bottom:1.5px solid #3E2A75;height:28px;margin:0 auto}' +
    '.rcpt-sig .rcpt-sig-label{font-size:10px;color:#837C9C;font-weight:700;margin-top:3px}' +
    '.rcpt-mid{text-align:center;flex:0 0 auto;padding:0 22px}' +
    '.rcpt-mid img{height:42px;display:block;margin:0 auto 4px}' +
    '.rcpt-mid span{font-size:8.5px;color:#8A83A3;font-weight:700;letter-spacing:.5px}' +
    '.rcpt-footer{border-top:1px solid #E9E4F3;margin-top:16px;padding-top:11px;text-align:center;font-size:8.5px;color:#9A93B2;line-height:1.7}' +
    '@media print{.rcpt-page{box-shadow:none;margin:0;padding:30px 42px;min-height:100vh}@page{size:A4 portrait;margin:0}}';
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
      '<div class="rcpt-bg" aria-hidden="true">' +
        '<div class="bg-glow bg-glow-1"></div>' +
        '<div class="bg-glow bg-glow-2"></div>' +
        '<div class="bg-arc bg-arc-1"></div>' +
        '<div class="bg-arc bg-arc-2"></div>' +
        '<div class="bg-arc bg-arc-3"></div>' +
        '<div class="bg-arc bg-arc-4"></div>' +
        '<div class="bg-arc bg-arc-5"></div>' +
        '<div class="bg-arc bg-arc-6"></div>' +
        '<div class="bg-band"></div>' +
        '<span class="bg-gem bg-gem-1"></span>' +
        '<span class="bg-gem bg-gem-2"></span>' +
        '<span class="bg-gem bg-gem-3"></span>' +
      '</div>' +
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
