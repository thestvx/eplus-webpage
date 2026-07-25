// ═══════════════════════════════════════════════════════════
//  SubjectService — Subject-Teacher mapping & dynamic dropdowns
//  Resolves subjects to IDs, finds teachers per level/subject
// ═══════════════════════════════════════════════════════════

const SubjectService = (function () {

  // ── Subject ID Mapping ────────────────────────────────
  const SUBJECT_IDS = {
    'الرياضيات': 'math',
    'اللغة الفرنسية': 'french',
    'اللغة الإنجليزية': 'english',
    'اللغة العربية': 'arabic',
    'العلوم الفيزيائية وعلوم الطبيعة والحياة': 'science_4m',
    'الاجتماعيات': 'social',
    'العلوم الفيزيائية والتكنولوجيا': 'physics_tech',
    'علوم الطبيعة والحياة': 'biology',
    'العلوم الإسلامية': 'islamic',
    'الفلسفة': 'philosophy',
    'المحاسبة': 'accounting',
    'اللغة الألمانية': 'german',
    'اللغة الإسبانية': 'spanish'
  };

  const SUBJECT_ICONS = {
    'الرياضيات': '📐',
    'اللغة الفرنسية': '🇫🇷',
    'اللغة الإنجليزية': '🇬🇧',
    'اللغة العربية': '📗',
    'العلوم الفيزيائية وعلوم الطبيعة والحياة': '🔬',
    'الاجتماعيات': '🌍',
    'العلوم الفيزيائية والتكنولوجيا': '⚛️',
    'علوم الطبيعة والحياة': '🧬',
    'العلوم الإسلامية': '🕌',
    'الفلسفة': '🧠',
    'المحاسبة': '💼',
    'اللغة الألمانية': '🇩🇪',
    'اللغة الإسبانية': '🇪🇸'
  };

  // ── Level → Subjects Mapping ──────────────────────────
  const SUBJECTS_BY_LEVEL = {
    'السنة الرابعة متوسط': [
      'الرياضيات', 'اللغة الفرنسية', 'الاجتماعيات', 'اللغة الإنجليزية',
      'اللغة العربية', 'العلوم الفيزيائية وعلوم الطبيعة والحياة'
    ],
    'السنة الثالثة ثانوي (بكالوريا)': {
      'علوم تجريبية': ['العلوم الفيزيائية والتكنولوجيا', 'الرياضيات', 'علوم الطبيعة والحياة', 'اللغة العربية', 'اللغة الفرنسية', 'اللغة الإنجليزية', 'العلوم الإسلامية', 'الاجتماعيات', 'الفلسفة'],
      'رياضيات': ['العلوم الفيزيائية', 'الرياضيات', 'اللغة العربية', 'اللغة الفرنسية', 'اللغة الإنجليزية', 'العلوم الإسلامية', 'الاجتماعيات', 'الفلسفة'],
      'تسيير واقتصاد': ['اللغة العربية', 'اللغة الفرنسية', 'اللغة الإنجليزية', 'المحاسبة', 'العلوم الإسلامية', 'الاجتماعيات', 'الفلسفة'],
      'تقني رياضي': ['العلوم الفيزيائية', 'اللغة الفرنسية', 'اللغة الإنجليزية', 'العلوم الإسلامية', 'الاجتماعيات', 'الفلسفة'],
      'آداب ولغات': ['اللغة العربية', 'الفلسفة', 'اللغة الفرنسية', 'اللغة الإنجليزية', 'اللغة الألمانية', 'اللغة الإسبانية', 'العلوم الإسلامية', 'الاجتماعيات']
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

  async function _loadTeachers() {
    const now = Date.now();
    if (_teachersCache && (now - _teachersCacheTime) < CACHE_TTL) {
      return _teachersCache;
    }
    try {
      const snap = await db.collection('support_teachers')
        .where('status', '==', 'active')
        .get();
      _teachersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _teachersCacheTime = now;
    } catch (e) {
      console.error('SubjectService: Failed to load teachers', e);
      _teachersCache = [];
    }
    return _teachersCache;
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

  // ── Dynamic Dropdown Builder ──────────────────────────

  async function buildSubjectTeacherOptions(level, stream) {
    const subjects = getSubjectsForLevel(level, stream);
    const options = [];

    for (const subject of subjects) {
      const teachers = await getTeachersForSubject(subject, level);
      if (teachers.length === 0) {
        options.push({
          label: getSubjectIcon(subject) + ' ' + subject + ' — (بدون أستاذ)',
          value: subject,
          subjectId: getSubjectId(subject),
          subject: subject,
          teacherId: null,
          teacherName: null
        });
      } else {
        for (const teacher of teachers) {
          options.push({
            label: getSubjectIcon(subject) + ' ' + subject + ' — الأستاذ ' + (teacher.name || ''),
            value: subject + '|' + (teacher.teacherId || teacher.id),
            subjectId: getSubjectId(subject),
            subject: subject,
            teacherId: teacher.teacherId || teacher.id,
            teacherName: teacher.name || ''
          });
        }
      }
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
      const teacher = s.teacher || '—';
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
    getSubjectId,
    getSubjectName,
    getSubjectIcon,
    getSubjectsForLevel,
    getTeachersForSubject,
    getTeachersForLevel,
    buildSubjectTeacherOptions,
    buildSubjectDisplayList,
    invalidateCache
  };
})();
