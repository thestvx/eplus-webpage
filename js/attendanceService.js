// ═══════════════════════════════════════════════════════════
//  AttendanceService — Independent attendance layer
//  Handles: scan, validate, record, duplicate check, reports
//  All relationships use IDs — display names are for UI only
// ═══════════════════════════════════════════════════════════

const AttendanceService = (function () {
  const COLLECTION = 'support_attendance';

  // ── Schema (reference) ────────────────────────────────
  // {
  //   id:             auto-generated
  //   studentId:      string  (registration ID)
  //   studentName:    string  (display only)
  //   teacherId:      string  (support_teachers teacherId)
  //   teacherName:    string  (display only)
  //   subjectId:      string  (e.g. "math", "french")
  //   subjectName:    string  (display only, e.g. "الرياضيات")
  //   date:           string  (YYYY-MM-DD)
  //   checkInTime:    string  (HH:MM:SS)
  //   checkOutTime:   string | null
  //   status:         "present" | "absent" | "late"
  //   sessionNumber:  number  (1, 2, 3... for multiple sessions per day)
  //   level:          string
  //   stream:         string
  //   institution:    string
  //   createdAt:      string (ISO)
  //   updatedAt:      string | null
  // }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function nowTime() {
    return new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  // ── Duplicate Check ───────────────────────────────────
  // Duplicate = same student + same teacher + same subject + same day/session.

  async function isDuplicate(studentId, subjectId, date, sessionNumber, teacherId) {
    let q = db.collection(COLLECTION)
      .where('studentId', '==', studentId)
      .where('subjectId', '==', subjectId)
      .where('date', '==', date || today());
    if (sessionNumber) q = q.where('sessionNumber', '==', sessionNumber);
    if (teacherId) q = q.where('teacherId', '==', teacherId);
    const snap = await q.limit(1).get();
    return !snap.empty;
  }

  // ── Student Validation ────────────────────────────────

  async function validateStudent(studentId) {
    const student = await RegistrationService.getById(studentId);
    if (!student) return { valid: false, reason: 'طالب غير موجود', student: null };
    if (student.status === 'مسجل مبدئياً') return { valid: false, reason: '⚠️ لا يمكن تسجيل الحضور هذا الطالب غير مسجل نهائياً', student };
    if (student.status !== 'مسجل نهائياً') return { valid: false, reason: 'بطاقة غير صالحة — ' + student.status, student };
    return { valid: true, student };
  }

  // ── Scan Resolution ───────────────────────────────────
  // 1) EAN-13 from our system (numeric, '200' prefix) → barcode_value → student.
  // 2) Legacy students (no barcode_value row yet) → decode the ID from the
  //    deterministic barcode and look up by ID.
  // 3) Backward-compatible EPLUS-xxx / plain ID scans.
  async function resolveStudentFromScan(raw) {
    const clean = String(raw || '').trim();
    if (!clean) return { student: null, source: null };
    const numeric = String(clean).replace(/\D/g, '');
    if (numeric.length === 13 && numeric.startsWith('200')) {
      let student = null;
      try { student = await RegistrationService.getByBarcode(numeric); } catch (e) { /* fall through */ }
      if (!student && typeof EAN13 !== 'undefined' && EAN13.isValid(numeric)) {
        const decodedId = EAN13.decode(numeric);
        if (decodedId) { try { student = await RegistrationService.getById(decodedId); } catch (e) {} }
      }
      return { student, source: 'barcode' };
    }
    const legacyId = clean.replace(/^EPLUS-/i, '').trim();
    return { student: await RegistrationService.getById(legacyId), source: 'id' };
  }

  // ── Subject Matching ──────────────────────────────────

  function matchStudentSubjects(student, teacherId) {
    const subjects = Array.isArray(student.subjects) ? student.subjects : [];
    return subjects.filter(s => {
      if (s.teacherId) return s.teacherId === teacherId;
      return false;
    });
  }

  function matchStudentSubjectsByName(student, teacherName) {
    const subjects = Array.isArray(student.subjects) ? student.subjects : [];
    return subjects.filter(s => {
      return (s.teacher === teacherName);
    });
  }

  // ── Record Attendance ─────────────────────────────────

  async function record(data) {
    const {
      studentId, studentName, teacherId, teacherName,
      subjectId, subjectName, date, checkInTime,
      status, sessionNumber, level, stream, institution
    } = data;

    const recDate = date || today();
    const recTime = checkInTime || nowTime();
    const recSession = sessionNumber || 1;

    const dup = await isDuplicate(studentId, subjectId, recDate, recSession, teacherId);
    if (dup) return { success: false, reason: 'duplicate', message: 'تم تسجيل حضور هذا الطالب مسبقاً لهذه الحصة' };

    const doc = {
      studentId: studentId,
      studentName: studentName || '',
      teacherId: teacherId,
      teacherName: teacherName || '',
      subjectId: subjectId,
      subjectName: subjectName || '',
      date: recDate,
      checkInTime: recTime,
      checkOutTime: null,
      status: status || 'present',
      sessionNumber: recSession,
      level: level || '',
      stream: stream || '',
      institution: institution || '',
      createdAt: new Date().toISOString(),
      updatedAt: null
    };

    const ref = await db.collection(COLLECTION).add(doc);
    return { success: true, id: ref.id, doc };
  }

  // ── Check-out ─────────────────────────────────────────

  async function checkOut(studentId, subjectId, date) {
    const recDate = date || today();
    const snap = await db.collection(COLLECTION)
      .where('studentId', '==', studentId)
      .where('subjectId', '==', subjectId)
      .where('date', '==', recDate)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snap.empty) return { success: false, reason: 'not_found' };
    const doc = snap.docs[0];
    if (doc.data().checkOutTime) return { success: false, reason: 'already_checked_out' };

    await db.collection(COLLECTION).doc(doc.id).update({
      checkOutTime: nowTime(),
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  }

  // ── Get Records (with filters) ────────────────────────

  async function getRecords(filters) {
    let q = db.collection(COLLECTION);

    if (filters.teacherId) q = q.where('teacherId', '==', filters.teacherId);
    if (filters.studentId) q = q.where('studentId', '==', filters.studentId);
    if (filters.date) q = q.where('date', '==', filters.date);
    if (filters.subjectId) q = q.where('subjectId', '==', filters.subjectId);
    if (filters.level) q = q.where('level', '==', filters.level);

    const snap = await q.get();
    let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (filters.dateFrom) records = records.filter(r => r.date >= filters.dateFrom);
    if (filters.dateTo) records = records.filter(r => r.date <= filters.dateTo);

    records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return records;
  }

  // ── Reports ───────────────────────────────────────────

  async function getDailyReport(teacherId, date) {
    const records = await getRecords({ teacherId, date: date || today() });
    const allConfirmed = await RegistrationService.getConfirmed();
    const teacherSubjects = (await SubjectService.getTeachersForLevel('', '')).find(t => t.teacherId === teacherId);
    const teacherName = teacherSubjects ? teacherSubjects.name : '';

    return {
      date: date || today(),
      records,
      totalPresent: records.length,
      teacherName
    };
  }

  async function getMonthlyReport(teacherId, yearMonth) {
    const ym = yearMonth || new Date().toISOString().slice(0, 7);
    const all = await getRecords({ teacherId });
    return all.filter(r => r.date.startsWith(ym));
  }

  async function getStudentStats(studentId) {
    const records = await getRecords({ studentId });
    const bySubject = {};
    records.forEach(r => {
      if (!bySubject[r.subjectId]) bySubject[r.subjectId] = { subjectName: r.subjectName, count: 0 };
      bySubject[r.subjectId].count++;
    });
    return { total: records.length, bySubject, records };
  }

  async function getTeacherStats(teacherId) {
    const records = await getRecords({ teacherId });
    const byDate = {};
    records.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    });
    const uniqueStudents = new Set(records.map(r => r.studentId));
    return { total: records.length, uniqueStudents: uniqueStudents.size, byDate, records };
  }

  // ── Main Scan Handler ─────────────────────────────────

  async function processScan(barcode, teacherId, teacherName) {
    const { student } = await resolveStudentFromScan(barcode);
    if (!student) {
      return { success: false, type: 'invalid', reason: 'طالب غير موجود', student: null };
    }
    const validation = await validateStudent(student.id);
    if (!validation.valid) {
      return { success: false, type: 'invalid', reason: validation.reason, student: validation.student };
    }

    const matchedSubjects = matchStudentSubjects(student, teacherId);

    if (matchedSubjects.length === 0) {
      const matchedByName = matchStudentSubjectsByName(student, teacherName);
      if (matchedByName.length > 0) {
        return await _processMatchedSubjects(student, matchedByName, teacherId, teacherName);
      }
      return { success: false, type: 'no_match', reason: 'الطالب غير مسجل في أي من موادك', student };
    }

    return await _processMatchedSubjects(student, matchedSubjects, teacherId, teacherName);
  }

  async function _processMatchedSubjects(student, matchedSubjects, teacherId, teacherName) {
    const recDate = today();
    const results = [];

    for (const s of matchedSubjects) {
      const subId = s.subjectId || SubjectService.getSubjectId(s.subject || s.subjectName || '');
      const subName = s.subject || s.subjectName || '';
      const tName = s.teacher || s.teacherName || teacherName || '';
      const dup = await isDuplicate(student.id, subId, recDate, null, teacherId);
      results.push({
        subjectId: subId,
        subjectName: subName,
        teacherName: tName,
        alreadyRecorded: dup
      });
    }

    const allRecorded = results.every(r => r.alreadyRecorded);

    if (matchedSubjects.length === 1 && !allRecorded) {
      const s = matchedSubjects[0];
      const subId = s.subjectId || SubjectService.getSubjectId(s.subject || s.subjectName || '');
      const subName = s.subject || s.subjectName || '';
      const rec = await record({
        studentId: student.id,
        studentName: ((student.first_name || '') + ' ' + (student.last_name || '')).trim(),
        teacherId,
        teacherName,
        subjectId: subId,
        subjectName: subName,
        level: student.level || '',
        stream: student.stream || '',
        institution: student.institution || ''
      });
      return {
        success: true,
        type: 'single_recorded',
        student,
        recording: rec,
        results
      };
    }

    return {
      success: true,
      type: 'multi_subjects',
      student,
      results,
      allRecorded
    };
  }

  // ── Single Subject Record (from UI) ───────────────────

  async function recordSingle(studentId, teacherId, teacherName, subjectId, subjectName) {
    const student = await RegistrationService.getById(studentId);
    if (!student) return { success: false, reason: 'student_not_found' };
    if (!RegistrationService.isValidConfirmed(student)) return { success: false, reason: 'invalid_registration' };

    return await record({
      studentId,
      studentName: ((student.first_name || '') + ' ' + (student.last_name || '')).trim(),
      teacherId,
      teacherName,
      subjectId,
      subjectName,
      level: student.level || '',
      stream: student.stream || '',
      institution: student.institution || ''
    });
  }

  // ── Expose ────────────────────────────────────────────
  return {
    COLLECTION,
    today,
    nowTime,
    isDuplicate,
    validateStudent,
    resolveStudentFromScan,
    matchStudentSubjects,
    matchStudentSubjectsByName,
    record,
    recordSingle,
    checkOut,
    getRecords,
    getDailyReport,
    getMonthlyReport,
    getStudentStats,
    getTeacherStats,
    processScan
  };
})();
