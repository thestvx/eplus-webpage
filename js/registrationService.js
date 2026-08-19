// ═══════════════════════════════════════════════════════════
//  RegistrationService — Student registration data layer
//  All Supabase REST calls for registrations go through here
// ═══════════════════════════════════════════════════════════

const RegistrationService = (function () {
  const TABLE = 'registrations';
  const COLUMNS = 'id,first_name,last_name,parent_name,parent_phone,birth_date,student_type,level,stream,institution,subjects,fee_amount,status,student_token,barcode_value,created_at';
  const COLUMNS_NO_BARCODE = 'id,first_name,last_name,parent_name,parent_phone,birth_date,student_type,level,stream,institution,subjects,fee_amount,status,student_token,created_at';

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

  // barcode_value probe: cached result of whether the column exists yet
  // (the migration in supabase-schema.sql may not have been applied).
  let _barcodeColOk = null;
  async function _barcodeColumnAvailable() {
    if (_barcodeColOk !== null) return _barcodeColOk;
    try {
      const res = await fetch(baseQuery('select=barcode_value&limit=1'), { headers: headers() });
      _barcodeColOk = res.ok;
    } catch (e) { _barcodeColOk = false; }
    return _barcodeColOk;
  }

  // SELECT with fallback: if the full column list is rejected because
  // barcode_value doesn't exist yet (PGRST204/42703), retry without it so
  // lookups keep working until the schema migration is applied.
  async function _fetchCols(params) {
    let res = await fetch(baseQuery('select=' + COLUMNS + '&' + params), { headers: headers() });
    if (res.ok) return await res.json();
    let code = '';
    try {
      const t = await res.clone().text();
      try { code = (JSON.parse(t) || {}).code || ''; } catch (e) { code = ''; }
    } catch (e) { code = ''; }
    if (code === 'PGRST204' || code === '42703') {
      res = await fetch(baseQuery('select=' + COLUMNS_NO_BARCODE + '&' + params), { headers: headers() });
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  // ── Core Lookups ──────────────────────────────────────

  async function getById(id) {
    const data = await _fetchCols('id=eq.' + encodeURIComponent(id) + '&limit=1');
    return data && data.length > 0 ? data[0] : null;
  }

  async function getByToken(token) {
    const data = await _fetchCols('student_token=eq.' + encodeURIComponent(token) + '&limit=1');
    return data && data.length > 0 ? data[0] : null;
  }

  // Explicit search on registrations.barcode_value (the barcode printed on
  // the card). Never an id-derivation guess. Returns null when the column
  // hasn't been migrated yet so callers fall back to the id path.
  async function getByBarcode(barcodeValue) {
    if (!(await _barcodeColumnAvailable())) return null;
    const data = await _fetchCols('barcode_value=eq.' + encodeURIComponent(barcodeValue) + '&limit=1');
    return data && data.length > 0 ? data[0] : null;
  }

  async function getAll(status) {
    let params = 'deleted_at=is.null';
    if (status) params += '&status=eq.' + encodeURIComponent(status);
    const data = await _fetchCols(params);
    return data;
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
    getByBarcode,
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
window.RegistrationService = RegistrationService;
