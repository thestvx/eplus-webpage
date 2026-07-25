// ═══════════════════════════════════════════════════════════
//  RegistrationService — Student registration data layer
//  All Supabase REST calls for registrations go through here
// ═══════════════════════════════════════════════════════════

const RegistrationService = (function () {
  const TABLE = 'registrations';
  const COLUMNS = 'id,first_name,last_name,parent_name,parent_phone,birth_date,student_type,level,stream,institution,subjects,fee_amount,status,student_token,created_at,timestamp';

  function headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    };
  }

  function baseQuery(params) {
    return SUPABASE_URL + '/rest/v1/' + TABLE + '?' + params;
  }

  // ── Core Lookups ──────────────────────────────────────

  async function getById(id) {
    const res = await fetch(baseQuery('select=' + COLUMNS + '&id=eq.' + encodeURIComponent(id) + '&limit=1'), { headers: headers() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  }

  async function getByToken(token) {
    const res = await fetch(baseQuery('select=' + COLUMNS + '&student_token=eq.' + encodeURIComponent(token) + '&limit=1'), { headers: headers() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  }

  async function getAll(status) {
    let q = 'select=' + COLUMNS;
    if (status) q += '&status=eq.' + encodeURIComponent(status);
    const res = await fetch(baseQuery(q), { headers: headers() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  async function getConfirmed() {
    return getAll('مسجل نهائياً');
  }

  // ── Subject Operations ────────────────────────────────

  function getSubjects(student) {
    return Array.isArray(student.subjects) ? student.subjects : [];
  }

  function getSubjectNames(student) {
    return getSubjects(student).map(s => s.subject || s);
  }

  function getSubjectsForTeacher(student, teacherId) {
    const teacherSubjects = getSubjects(student);
    return teacherSubjects.filter(s => s.teacherId === teacherId);
  }

  function getSubjectsForTeacherByName(student, teacherName) {
    const teacherSubjects = getSubjects(student);
    return teacherSubjects.filter(s => s.teacher === teacherName);
  }

  // ── Validation ────────────────────────────────────────

  function isValidConfirmed(student) {
    return student && student.status === 'مسجل نهائياً';
  }

  function isProvisional(student) {
    return student && student.status === 'مسجل مبدئياً';
  }

  // ── Patch Operations ──────────────────────────────────

  async function patch(id, data) {
    const res = await fetch(baseQuery('id=eq.' + encodeURIComponent(id)), {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return true;
  }

  async function addSubjectToStudent(id, subjectsArray) {
    return patch(id, { subjects: subjectsArray });
  }

  // ── Expose ────────────────────────────────────────────
  return {
    getById,
    getByToken,
    getAll,
    getConfirmed,
    getSubjects,
    getSubjectNames,
    getSubjectsForTeacher,
    getSubjectsForTeacherByName,
    isValidConfirmed,
    isProvisional,
    patch,
    addSubjectToStudent,
    headers,
    baseQuery
  };
})();
