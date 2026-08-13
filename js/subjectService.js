// ═══════════════════════════════════════════════════════════
//  SubjectService — Subject-Teacher mapping & dynamic dropdowns
//  SINGLE SOURCE OF TRUTH for all subject/teacher data.
//  Used by: index.html (initial registration), admin.html (add
//  subject), teacher.html. Data exposed on window.SUPPORT_STREAMS
//  and window.SUPPORT_MIDDLE_SCHOOL so register-support.js and
//  any other script reads from the SAME source.
// ═══════════════════════════════════════════════════════════

// ── Authoritative Subject + Teacher pairs (same as initial registration) ──
const SUPPORT_STREAMS = {
  'علوم تجريبية': [
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teacher: 'نمسي عبد الرحمان' },
    { subject: 'العلوم الفيزيائية والتكنولوجيا', teacher: 'لكموته لمين' },
    { subject: 'الرياضيات', teacher: 'نعورة عبدالباسط' },
    { subject: 'الرياضيات', teacher: 'ترعة فاطمة' },
    { subject: 'علوم الطبيعة والحياة', teacher: 'شكري صحراوي' },
    { subject: 'اللغة العربية', teacher: 'موساوي زبيدة' },
    { subject: 'اللغة الإنجليزية', teacher: 'كرام الصادق' },
    { subject: 'اللغة الإنجليزية ( دورة )', teacher: 'تليلي راضية' },
    { subject: 'العلوم الإسلامية ( دورة )', teacher: 'هبيته ربيع' },
    { subject: 'التاريخ ( دورة )', teacher: 'أيمن دخان' },
  ],
  'رياضيات': [
    { subject: 'العلوم الفيزيائية', teacher: 'نمسي عبد الرحمان' },
    { subject: 'العلوم الفيزيائية', teacher: 'لكموته لمين' },
    { subject: 'الرياضيات', teacher: 'نعورة عبدالباسط' },
    { subject: 'الرياضيات', teacher: 'ترعة فاطمة' },
    { subject: 'اللغة العربية', teacher: 'موساوي زبيدة' },
    { subject: 'اللغة الإنجليزية', teacher: 'كرام الصادق' },
    { subject: 'اللغة الإنجليزية ( دورة )', teacher: 'تليلي راضية' },
    { subject: 'العلوم الإسلامية ( دورة )', teacher: 'هبيته ربيع' },
    { subject: 'التاريخ ( دورة )', teacher: 'أيمن دخان' },
    { subject: 'الفلسفة', teacher: 'دادة نجاح سلام' },
  ],
  'تسيير واقتصاد': [
    { subject: 'اللغة العربية', teacher: 'موساوي زبيدة' },
    { subject: 'اللغة الإنجليزية', teacher: 'كرام الصادق' },
    { subject: 'اللغة الإنجليزية ( دورة )', teacher: 'تليلي راضية' },
    { subject: 'المحاسبة', teacher: 'عبد الرحمان سرهود' },
    { subject: 'اقتصاد وقانون', teacher: 'عبد الرحمان سرهود' },
    { subject: 'العلوم الإسلامية ( دورة )', teacher: 'هبيته ربيع' },
    { subject: 'التاريخ ( دورة )', teacher: 'أيمن دخان' },
    { subject: 'الفلسفة', teacher: 'دادة نجاح سلام' },
  ],
  'تقني رياضي': [
    { subject: 'العلوم الفيزيائية', teacher: 'نمسي عبد الرحمان' },
    { subject: 'العلوم الفيزيائية', teacher: 'لكموته لمين' },
    { subject: 'الرياضيات', teacher: 'نعورة عبدالباسط' },
    { subject: 'اللغة الإنجليزية', teacher: 'كرام الصادق' },
    { subject: 'اللغة الإنجليزية ( دورة )', teacher: 'تليلي راضية' },
    { subject: 'العلوم الإسلامية ( دورة )', teacher: 'هبيته ربيع' },
    { subject: 'التاريخ ( دورة )', teacher: 'أيمن دخان' },
  ],
  'آداب ولغات': [
    { subject: 'اللغة العربية', teacher: 'موساوي زبيدة' },
    { subject: 'الفلسفة', teacher: 'دادة نجاح سلام' },
    { subject: 'اللغة الفرنسية', teacher: 'كروش شمس الهدى' },
    { subject: 'اللغة الإنجليزية', teacher: 'كرام الصادق' },
    { subject: 'اللغة الإنجليزية ( دورة )', teacher: 'تليلي راضية' },
    { subject: 'اللغة الألمانية', teacher: 'حمزة علال' },
    { subject: 'اللغة الإسبانية', teacher: 'طوالبية ابراهيم' },
    { subject: 'العلوم الإسلامية ( دورة )', teacher: 'هبيته ربيع' },
    { subject: 'التاريخ ( دورة )', teacher: 'أيمن دخان' },
  ],
};

const SUPPORT_MIDDLE_SCHOOL = [
  { subject: 'الرياضيات', teacher: 'شامي سهيل' },
  { subject: 'اللغة الفرنسية', teacher: 'مرغني ريهام' },
  { subject: 'اللغة الفرنسية', teacher: 'حميدي بلقيس' },
  { subject: 'الاجتماعيات', teacher: 'أيمن دخان' },
  { subject: 'اللغة الإنجليزية', teacher: 'نصبة فاطمة' },
  { subject: 'اللغة الإنجليزية', teacher: 'بادة العربي' },
  { subject: 'اللغة العربية', teacher: 'سويد هدى' },
  { subject: 'العلوم الفيزيائية والتكنولوجيا', teacher: 'خنوفة علي' },
  { subject: 'علوم الطبيعة والحياة', teacher: 'خنوفة علي' },
];

// Expose on window so register-support.js (index.html) reads the SAME data
window.SUPPORT_STREAMS = SUPPORT_STREAMS;
window.SUPPORT_MIDDLE_SCHOOL = SUPPORT_MIDDLE_SCHOOL;

const SubjectService = (function () {

  // ── Deleted-teacher registry ──────────────────────────
  // Teachers deleted from the admin (status='deleted') are hidden
  // from new-registration choices + admin dropdowns while their
  // historical student/attendance/finance data stays intact.
  const _deletedTeachers = new Set();

  function _normName(name) {
    return String(name || '').replace(/\s+/g, '').toLowerCase();
  }
  function _persistDeleted() {
    try { sessionStorage.setItem('eplus_deleted_teachers', JSON.stringify(Array.from(_deletedTeachers))); } catch (e) {}
  }
  function _restoreDeleted() {
    try {
      const raw = sessionStorage.getItem('eplus_deleted_teachers');
      if (raw) JSON.parse(raw).forEach(n => n && _deletedTeachers.add(n));
    } catch (e) {}
  }
  _restoreDeleted();
  window.EPLUS_DELETED_TEACHERS = _deletedTeachers;

  function isTeacherDeleted(teacherName) {
    return _deletedTeachers.has(_normName(teacherName));
  }
  function markTeacherDeleted(teacherName) {
    const n = _normName(teacherName);
    if (n) { _deletedTeachers.add(n); _persistDeleted(); }
  }
  function markTeacherRestored(teacherName) {
    _deletedTeachers.delete(_normName(teacherName)); _persistDeleted();
  }
  async function loadDeletedTeachers() {
    try {
      const q = _queryTeachersByStatus('deleted');
      if (!q) return;
      const snap = await q;
      snap.docs.forEach(d => { const n = _normName(d.data().name); if (n) _deletedTeachers.add(n); });
      _persistDeleted();
    } catch (e) {
      console.warn('SubjectService: loadDeletedTeachers failed', e);
    }
  }
  function filterActiveTeachers(pairs) {
    return Array.isArray(pairs) ? pairs.filter(p => !isTeacherDeleted(p.teacher)) : pairs;
  }

  // ── Subject ID Mapping ────────────────────────────────
  const SUBJECT_IDS = {
    'الرياضيات': 'math',
    'اللغة الفرنسية': 'french',
    'اللغة الإنجليزية': 'english',
    'اللغة الإنجليزية ( دورة )': 'english',
    'اللغة العربية': 'arabic',
    'العلوم الفيزيائية وعلوم الطبيعة والحياة': 'science_4m',
    'الاجتماعيات': 'social',
    'التاريخ ( دورة )': 'social',
    'العلوم الفيزيائية والتكنولوجيا': 'physics_tech',
    'العلوم الفيزيائية': 'physics',
    'علوم الطبيعة والحياة': 'biology',
    'العلوم الإسلامية': 'islamic',
    'العلوم الإسلامية ( دورة )': 'islamic',
    'الفلسفة': 'philosophy',
    'المحاسبة': 'accounting',
    'اقتصاد وقانون': 'law',
    'اللغة الألمانية': 'german',
    'اللغة الإسبانية': 'spanish',
    'رياضيات (للأدبيين)': 'math_lit'
  };

  const SUBJECT_ICONS = {
    'الرياضيات': '📐',
    'اللغة الفرنسية': '🇫🇷',
    'اللغة الإنجليزية': '🇬🇧',
    'اللغة الإنجليزية ( دورة )': '🇬🇧',
    'اللغة العربية': '📗',
    'العلوم الفيزيائية وعلوم الطبيعة والحياة': '🔬',
    'الاجتماعيات': '🌍',
    'التاريخ ( دورة )': '🌍',
    'العلوم الفيزيائية والتكنولوجيا': '⚛️',
    'العلوم الفيزيائية': '⚛️',
    'علوم الطبيعة والحياة': '🧬',
    'العلوم الإسلامية': '🕌',
    'العلوم الإسلامية ( دورة )': '🕌',
    'الفلسفة': '🧠',
    'المحاسبة': '💼',
    'اقتصاد وقانون': '⚖️',
    'اللغة الألمانية': '🇩🇪',
    'اللغة الإسبانية': '🇪🇸',
    'رياضيات (للأدبيين)': '📐'
  };

  // ── Level → Subjects Mapping (subjects only, kept in sync with pairs) ──
  const SUBJECTS_BY_LEVEL = {
    'السنة الرابعة متوسط': [
      'الرياضيات', 'اللغة الفرنسية', 'الاجتماعيات', 'اللغة الإنجليزية',
      'اللغة العربية', 'العلوم الفيزيائية والتكنولوجيا', 'علوم الطبيعة والحياة'
    ],
    'السنة الثالثة ثانوي (بكالوريا)': {
      'علوم تجريبية': ['العلوم الفيزيائية والتكنولوجيا', 'الرياضيات', 'علوم الطبيعة والحياة', 'اللغة العربية', 'اللغة الإنجليزية', 'اللغة الإنجليزية ( دورة )', 'العلوم الإسلامية ( دورة )', 'التاريخ ( دورة )'],
      'رياضيات': ['العلوم الفيزيائية', 'الرياضيات', 'اللغة العربية', 'اللغة الإنجليزية', 'اللغة الإنجليزية ( دورة )', 'العلوم الإسلامية ( دورة )', 'التاريخ ( دورة )', 'الفلسفة'],
      'تسيير واقتصاد': ['اللغة العربية', 'اللغة الإنجليزية', 'اللغة الإنجليزية ( دورة )', 'المحاسبة', 'اقتصاد وقانون', 'العلوم الإسلامية ( دورة )', 'التاريخ ( دورة )', 'الفلسفة'],
      'تقني رياضي': ['العلوم الفيزيائية', 'الرياضيات', 'اللغة الإنجليزية', 'اللغة الإنجليزية ( دورة )', 'العلوم الإسلامية ( دورة )', 'التاريخ ( دورة )'],
      'آداب ولغات': ['اللغة العربية', 'الفلسفة', 'اللغة الفرنسية', 'اللغة الإنجليزية', 'اللغة الإنجليزية ( دورة )', 'اللغة الألمانية', 'اللغة الإسبانية', 'العلوم الإسلامية ( دورة )', 'التاريخ ( دورة )']
    }
  };

  // ── ID Resolution ─────────────────────────────────────

  function getSubjectId(name) {
    return SUBJECT_IDS[name] || name.replace(/\s+/g, '_').toLowerCase();
  }

  function getSubjectName(id) {
    for (const [name, sid] of Object.entries(SUBJECT_IDS)) {
      if (sid === id) return name;
    }
    return id;
  }

  function getSubjectIcon(name) {
    return SUBJECT_ICONS[name] || '📚';
  }

  // ── Authoritative Subject + Teacher Pairs ─────────────
  // Returns the exact {subject, teacher} pairs used by the
  // initial registration (index.html) for a given level/stream.
  function getSubjectTeacherPairs(level, stream) {
    let pairs;
    if (level === 'السنة الرابعة متوسط') {
      pairs = Array.isArray(SUPPORT_MIDDLE_SCHOOL) ? SUPPORT_MIDDLE_SCHOOL : [];
    } else if (level === 'السنة الثالثة ثانوي (بكالوريا)' && stream && SUPPORT_STREAMS[stream]) {
      pairs = SUPPORT_STREAMS[stream] || [];
    } else {
      pairs = [];
    }
    return filterActiveTeachers(pairs);
  }

  // ── Level Subject Lists ───────────────────────────────

  function getSubjectsForLevel(level, stream) {
    if (level === 'السنة الرابعة متوسط') {
      return SUBJECTS_BY_LEVEL['السنة الرابعة متوسط'] || [];
    }
    if (level === 'السنة الثالثة ثانوي (بكالوريا)' && stream) {
      return SUBJECTS_BY_LEVEL['السنة الثالثة ثانوي (بكالوريا)'][stream] || [];
    }
    return [];
  }

  // ── Teacher-Subject Resolution ────────────────────────

  let _teachersCache = null;
  let _teachersCacheTime = 0;
  const CACHE_TTL = 60000; // 1 minute

  function _resolveDb() {
    return window._db || window.db || (typeof db !== 'undefined' ? db : null);
  }

  // Query support_teachers through whichever Firestore API is live:
  //  • admin.html  → modular v11: helpers in window._firestore + db in window._db
  //  • teacher.html→ compat 9.23.0: global `db` with .collection()
  function _queryTeachersByStatus(status) {
    const fs = window._firestore;
    const db = _resolveDb();
    if (fs && db && typeof fs.getDocs === 'function' && typeof fs.collection === 'function' && typeof fs.query === 'function' && typeof fs.where === 'function') {
      return fs.getDocs(fs.query(fs.collection(db, 'support_teachers'), fs.where('status', '==', status)));
    }
    const fdb = _resolveDb();
    return fdb && typeof fdb.collection === 'function'
      ? fdb.collection('support_teachers').where('status', '==', status).get()
      : null;
  }

  async function _loadTeachers() {
    const now = Date.now();
    if (_teachersCache && (now - _teachersCacheTime) < CACHE_TTL) {
      return _teachersCache;
    }
    try {
      const q = _queryTeachersByStatus('active');
      if (q) {
        const snap = await q;
        _teachersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _teachersCacheTime = now;
        return _teachersCache;
      }
    } catch (e) {
      console.error('SubjectService: Failed to load teachers', e);
      _teachersCache = [];
      _teachersCacheTime = now;
      return _teachersCache;
    }
    _teachersCache = [];
    _teachersCacheTime = now;
    return _teachersCache;
  }

  // Find the Firestore teacher matching a name (for teacherId enrichment)
  function _findTeacherByName(teachers, teacherName, level) {
    if (!teacherName) return null;
    const norm = name => String(name || '').replace(/\s+/g, '').toLowerCase();
    const target = norm(teacherName);
    return teachers.find(t => {
      if (norm(t.name) !== target) return false;
      if (!level) return true;
      const tLevels = Array.isArray(t.levels) ? t.levels : [];
      return tLevels.length === 0 || tLevels.includes(level);
    }) || null;
  }

  async function getTeachersForSubject(subjectName, level) {
    const teachers = await _loadTeachers();
    return teachers.filter(t => {
      const tLevels = Array.isArray(t.levels) ? t.levels : [];
      const tSubjects = (Array.isArray(t.subjects) ? t.subjects : []).map(s => s.subject || s);
      return tLevels.includes(level) && tSubjects.includes(subjectName);
    });
  }

  async function getTeachersForLevel(level, stream) {
    const teachers = await _loadTeachers();
    return teachers.filter(t => {
      const tLevels = Array.isArray(t.levels) ? t.levels : [];
      if (!tLevels.includes(level)) return false;
      if (level === 'السنة الثالثة ثانوي (بكالوريا)' && stream) {
        const tStreams = Array.isArray(t.streams) ? t.streams : [];
        return tStreams.includes(stream);
      }
      return true;
    });
  }

  // Resolve a teacherId by name (robust: name-first like attendance kiosk,
  // level used only as a soft preference). Falls back to partial name match.
  async function resolveTeacherId(subjectName, teacherName, level) {
    const teachers = await _loadTeachers();
    if (!teacherName) return '';
    const norm = name => String(name || '').replace(/\s+/g, '').toLowerCase();
    const target = norm(teacherName);
    const exact = teachers.filter(t => norm(t.name) === target);
    if (exact.length) {
      if (level) {
        const byLevel = exact.find(t => (Array.isArray(t.levels) ? t.levels : []).includes(level));
        if (byLevel) return byLevel.teacherId || byLevel.id || '';
      }
      const t = exact[0];
      return t.teacherId || t.id || '';
    }
    const partial = teachers.find(t => {
      const n = norm(t.name);
      return n && (n.includes(target) || target.includes(n));
    });
    if (partial) return partial.teacherId || partial.id || '';
    return '';
  }

  // ── Dynamic Dropdown Builder ──────────────────────────
  // Builds options from the AUTHORITATIVE registration pairs,
  // then enriches each with the Firestore teacherId when the
  // teacher exists. Guarantees the admin dropdown exactly
  // matches what the student saw during initial registration.
  async function buildSubjectTeacherOptions(level, stream) {
    const pairs = getSubjectTeacherPairs(level, stream);
    const teachers = await _loadTeachers();
    const options = [];

    for (const p of pairs) {
      const subject = p.subject;
      const teacherName = p.teacher;
      const t = _findTeacherByName(teachers, teacherName, level);
      options.push({
        label: getSubjectIcon(subject) + ' ' + subject + ' — الأستاذ ' + teacherName,
        value: subject + '|' + (t ? (t.teacherId || t.id) : teacherName),
        subjectId: getSubjectId(subject),
        subject: subject,
        teacherId: t ? (t.teacherId || t.id) : '',
        teacherName: teacherName,
        teacher: teacherName
      });
    }
    return options;
  }

  // ── Build Subjects Display (for student detail) ───────

  function buildSubjectDisplayList(subjects) {
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return '<div style="color:var(--text-muted);font-size:12px">لا توجد مواد</div>';
    }
    return subjects.map(s => {
      const name = s.subject || s;
      const teacher = s.teacher || s.teacherName || '—';
      const icon = getSubjectIcon(name);
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:var(--primary-light);font-size:12px">
        <span>${icon} ${name}</span>
        <span style="color:var(--text-muted)">—</span>
        <span>🎓 ${teacher}</span>
      </div>`;
    }).join('');
  }

  // ── Invalidate Cache ──────────────────────────────────
  function invalidateCache() {
    _teachersCache = null;
    _teachersCacheTime = 0;
  }

  // ── Expose ────────────────────────────────────────────
  return {
    SUBJECT_IDS,
    SUBJECT_ICONS,
    SUBJECTS_BY_LEVEL,
    SUPPORT_STREAMS,
    SUPPORT_MIDDLE_SCHOOL,
    getSubjectId,
    getSubjectName,
    getSubjectIcon,
    getSubjectTeacherPairs,
    getSubjectsForLevel,
    getTeachersForSubject,
    getTeachersForLevel,
    resolveTeacherId,
    buildSubjectTeacherOptions,
    buildSubjectDisplayList,
    invalidateCache,
    isTeacherDeleted,
    markTeacherDeleted,
    markTeacherRestored,
    loadDeletedTeachers,
    filterActiveTeachers
  };
})();
window.SubjectService = SubjectService;
