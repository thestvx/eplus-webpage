ALTER TABLE attendance_control_state
  ADD COLUMN IF NOT EXISTS subject_id TEXT DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_att_control_state_open_unique
  ON attendance_control_state (
    date,
    COALESCE(NULLIF(teacher_id, ''), attendance_norm_teacher(teacher_name)),
    attendance_norm_subject(subject_name)
  )
  WHERE is_open = true;

CREATE OR REPLACE FUNCTION attendance_find_open_session(
  p_date TEXT,
  p_teacher_id TEXT DEFAULT '',
  p_teacher_name TEXT DEFAULT '',
  p_subject_id TEXT DEFAULT '',
  p_subject_name TEXT DEFAULT '',
  p_session_id TEXT DEFAULT ''
)
RETURNS attendance_control_state
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row attendance_control_state%ROWTYPE;
  v_date TEXT := trim(COALESCE(p_date, ''));
  v_teacher_id TEXT := trim(COALESCE(p_teacher_id, ''));
  v_teacher_name TEXT := trim(COALESCE(p_teacher_name, ''));
  v_subject_id TEXT := trim(COALESCE(p_subject_id, ''));
  v_subject_name TEXT := trim(COALESCE(p_subject_name, ''));
  v_session_id TEXT := trim(COALESCE(p_session_id, ''));
BEGIN
  IF v_date = '' THEN
    RETURN NULL;
  END IF;

  IF v_session_id <> '' THEN
    SELECT * INTO v_row
      FROM attendance_control_state
     WHERE id = v_session_id
       AND date = v_date
       AND is_open IS TRUE;
    RETURN v_row;
  END IF;

  SELECT * INTO v_row
    FROM attendance_control_state
   WHERE date = v_date
     AND is_open IS TRUE
     AND (
       CASE
         WHEN v_teacher_id <> '' AND v_teacher_name <> '' THEN
           (COALESCE(teacher_id, '') = '' OR teacher_id = v_teacher_id)
           AND attendance_norm_teacher(teacher_name) = attendance_norm_teacher(v_teacher_name)
         WHEN v_teacher_id <> '' THEN COALESCE(teacher_id, '') = '' OR teacher_id = v_teacher_id
         ELSE attendance_norm_teacher(teacher_name) = attendance_norm_teacher(v_teacher_name)
       END
     )
     AND (
       CASE
         WHEN v_subject_id <> '' AND v_subject_name <> '' THEN
           (COALESCE(subject_id, '') = '' OR subject_id = v_subject_id)
           AND attendance_norm_subject(subject_name) = attendance_norm_subject(v_subject_name)
         WHEN v_subject_id <> '' THEN COALESCE(subject_id, '') = '' OR subject_id = v_subject_id
         ELSE attendance_norm_subject(subject_name) = attendance_norm_subject(v_subject_name)
       END
     )
   ORDER BY COALESCE(NULLIF(opened_at, ''), updated_at::text) DESC,
            updated_at DESC,
            id DESC
   LIMIT 1;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION attendance_find_open_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION attendance_find_open_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION attendance_session_state(
  p_date TEXT,
  p_teacher_id TEXT DEFAULT '',
  p_teacher_name TEXT DEFAULT '',
  p_subject_id TEXT DEFAULT '',
  p_subject_name TEXT DEFAULT '',
  p_session_id TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open attendance_control_state%ROWTYPE;
  v_any attendance_control_state%ROWTYPE;
  v_other_teacher BOOLEAN := false;
  v_other_subject BOOLEAN := false;
  v_code TEXT;
  v_reason TEXT;
  v_matched_by TEXT;
  v_checked_at TEXT := to_char(now() AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI:SS');
BEGIN
  v_open := attendance_find_open_session(
    p_date, p_teacher_id, p_teacher_name, p_subject_id, p_subject_name, p_session_id
  );

  SELECT * INTO v_any
    FROM attendance_control_state
   WHERE date = trim(COALESCE(p_date, ''))
      AND (
        CASE
          WHEN trim(COALESCE(p_teacher_id, '')) <> '' AND trim(COALESCE(p_teacher_name, '')) <> '' THEN
            (COALESCE(teacher_id, '') = '' OR teacher_id = trim(p_teacher_id))
            AND attendance_norm_teacher(teacher_name)
                = attendance_norm_teacher(trim(p_teacher_name))
          WHEN trim(COALESCE(p_teacher_id, '')) <> '' THEN COALESCE(teacher_id, '') = '' OR teacher_id = trim(p_teacher_id)
          ELSE attendance_norm_teacher(teacher_name)
               = attendance_norm_teacher(trim(COALESCE(p_teacher_name, '')))
        END
      )
      AND (
        CASE
          WHEN trim(COALESCE(p_subject_id, '')) <> '' AND trim(COALESCE(p_subject_name, '')) <> '' THEN
            (COALESCE(subject_id, '') = '' OR subject_id = trim(p_subject_id))
            AND attendance_norm_subject(subject_name)
                = attendance_norm_subject(trim(p_subject_name))
          WHEN trim(COALESCE(p_subject_id, '')) <> '' THEN COALESCE(subject_id, '') = '' OR subject_id = trim(p_subject_id)
          ELSE attendance_norm_subject(subject_name)
               = attendance_norm_subject(trim(COALESCE(p_subject_name, '')))
        END
      )

   ORDER BY updated_at DESC, id DESC
   LIMIT 1;

  IF v_open.id IS NOT NULL THEN
    v_code := 'ATTENDANCE_OPEN';
    v_reason := 'الأستاذ فتح جلسة الحضور';
    v_matched_by := CASE
      WHEN trim(COALESCE(p_session_id, '')) <> '' THEN 'session-id'
      WHEN trim(COALESCE(p_teacher_id, '')) <> '' THEN 'teacher-id+subject'
      ELSE 'teacher-name+subject'
    END;
    RETURN jsonb_build_object(
      'ok', true,
      'open', true,
      'dbState', 'open',
      'code', v_code,
      'reason', v_reason,
      'matchedBy', v_matched_by,
      'date', v_open.date,
      'sessionId', v_open.id,
      'foundSessionId', v_open.id,
      'requestedSessionId', trim(COALESCE(p_session_id, '')),
      'teacherId', v_open.teacher_id,
      'teacherName', v_open.teacher_name,
      'subjectId', v_open.subject_id,
      'subjectName', v_open.subject_name,
      'checkedAt', v_checked_at
    );
  END IF;

  IF trim(COALESCE(p_teacher_id, '')) <> '' THEN
    SELECT EXISTS (
      SELECT 1
        FROM attendance_control_state
       WHERE date = trim(p_date)
         AND is_open IS TRUE
         AND attendance_norm_subject(subject_name)
             = attendance_norm_subject(trim(COALESCE(p_subject_name, '')))
          AND COALESCE(teacher_id, '') <> ''
          AND teacher_id <> trim(p_teacher_id)

    ) INTO v_other_teacher;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM attendance_control_state
     WHERE date = trim(COALESCE(p_date, ''))
       AND is_open IS TRUE
       AND (
         CASE
           WHEN trim(COALESCE(p_teacher_id, '')) <> ''
             THEN teacher_id = trim(p_teacher_id)
           ELSE attendance_norm_teacher(teacher_name)
                = attendance_norm_teacher(trim(COALESCE(p_teacher_name, '')))
         END
       )
       AND attendance_norm_subject(subject_name)
           <> attendance_norm_subject(trim(COALESCE(p_subject_name, '')))
  ) INTO v_other_subject;

  IF trim(COALESCE(p_session_id, '')) <> '' AND EXISTS (
    SELECT 1 FROM attendance_control_state
     WHERE id = trim(p_session_id) AND date = trim(p_date) AND is_open IS NOT TRUE
  ) THEN
    v_code := 'SESSION_CLOSED';
    v_reason := 'الجلسة المطلوبة مغلقة في قاعدة البيانات';
  ELSIF v_any.id IS NOT NULL AND v_any.is_open IS NOT TRUE THEN
    v_code := 'ATTENDANCE_CLOSED';
    v_reason := 'الجلسة مغلقة في قاعدة البيانات';
  ELSIF v_other_teacher THEN
    v_code := 'TEACHER_ID_MISMATCH';
    v_reason := 'معرف الأستاذ لا يطابق الجلسة المفتوحة';
  ELSIF v_other_subject THEN
    v_code := 'SUBJECT_MISMATCH';
    v_reason := 'المادة لا تطابق الجلسة المفتوحة';
  ELSE
    v_code := 'NO_OPEN_SESSION';
    v_reason := 'الأستاذ لم يفتح جلسة الحضور بعد';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'open', false,
    'dbState', CASE WHEN v_any.id IS NOT NULL AND v_any.is_open IS NOT TRUE
                    THEN 'closed' ELSE 'none' END,
    'code', v_code,
    'reason', v_reason,
    'matchedBy', '',
    'date', trim(COALESCE(p_date, '')),
    'sessionId', '',
    'foundSessionId', COALESCE(v_any.id, ''),
    'requestedSessionId', trim(COALESCE(p_session_id, '')),
    'teacherId', trim(COALESCE(p_teacher_id, '')),
    'teacherName', COALESCE(v_any.teacher_name, trim(COALESCE(p_teacher_name, ''))),
    'subjectId', trim(COALESCE(p_subject_id, '')),
    'subjectName', COALESCE(v_any.subject_name, trim(COALESCE(p_subject_name, ''))),
    'checkedAt', v_checked_at
  );
END;
$$;

REVOKE ALL ON FUNCTION attendance_session_state(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION attendance_session_state(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION open_attendance_session(
  p_admin_uid TEXT,
  p_date TEXT,
  p_teacher_id TEXT DEFAULT '',
  p_teacher_name TEXT DEFAULT '',
  p_subject_id TEXT DEFAULT '',
  p_subject_name TEXT DEFAULT '',
  p_opened_at TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_date TEXT := trim(COALESCE(p_date, ''));
  v_teacher_id TEXT := trim(COALESCE(p_teacher_id, ''));
  v_subject_id TEXT := trim(COALESCE(p_subject_id, ''));
  v_teacher_name TEXT := attendance_norm_teacher(p_teacher_name);
  v_subject_name TEXT := attendance_norm_subject(p_subject_name);
  v_key TEXT;
  v_session_id TEXT;
  v_opened_at TEXT;
BEGIN
  IF v_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'invalid date';
  END IF;
  IF v_teacher_name = '' THEN
    RAISE EXCEPTION 'teacherName required';
  END IF;
  IF NOT admin_is_uid_admin(p_admin_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_key := lower(regexp_replace(v_teacher_name, '\s+', '', 'g'));
  v_session_id := v_date || '_' || v_key;
  IF v_subject_name <> '' THEN
    v_session_id := v_session_id || '_' || lower(regexp_replace(v_subject_name, '\s+', '', 'g'));
  END IF;
  v_opened_at := NULLIF(trim(COALESCE(p_opened_at, '')), '');
  IF v_opened_at IS NULL THEN
    v_opened_at := to_char(now() AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI:SS');
  END IF;

  INSERT INTO attendance_control_state (
    id, date, teacher_id, teacher_name, subject_id, subject_name,
    is_open, opened_at, closed_at, updated_at
  )
  VALUES (
    v_session_id, v_date, v_teacher_id, v_teacher_name, v_subject_id, v_subject_name,
    true, v_opened_at, '', now()
  )
  ON CONFLICT (id) DO UPDATE
    SET teacher_id = EXCLUDED.teacher_id,
        teacher_name = EXCLUDED.teacher_name,
        subject_id = EXCLUDED.subject_id,
        subject_name = EXCLUDED.subject_name,
        is_open = true,
        opened_at = EXCLUDED.opened_at,
        closed_at = '',
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'action', 'opened',
    'sessionId', v_session_id,
    'date', v_date,
    'teacherId', v_teacher_id,
    'teacherName', v_teacher_name,
    'subjectId', v_subject_id,
    'subjectName', v_subject_name,
    'openedAt', v_opened_at,
    'isOpen', true
  );
END;
$$;

REVOKE ALL ON FUNCTION open_attendance_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION open_attendance_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION close_attendance_session_by_ids(
  p_admin_uid TEXT,
  p_date TEXT,
  p_teacher_id TEXT DEFAULT '',
  p_teacher_name TEXT DEFAULT '',
  p_subject_id TEXT DEFAULT '',
  p_subject_name TEXT DEFAULT '',
  p_actor TEXT DEFAULT '',
  p_closed_at TEXT DEFAULT '',
  p_session_id TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row attendance_control_state%ROWTYPE;
  v_session_id TEXT := trim(COALESCE(p_session_id, ''));
BEGIN
  IF NOT admin_is_uid_admin(p_admin_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_row := attendance_find_open_session(
    p_date, p_teacher_id, p_teacher_name, p_subject_id, p_subject_name, v_session_id
  );

  IF v_row.id IS NOT NULL THEN
    v_session_id := v_row.id;
  ELSIF v_session_id = '' THEN
    RAISE EXCEPTION 'جلسة الحضور غير موجودة' USING ERRCODE = 'P0002';
  END IF;

  RETURN close_attendance_session(p_admin_uid, v_session_id, p_actor, p_closed_at);
END;
$$;

REVOKE ALL ON FUNCTION close_attendance_session_by_ids(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_attendance_session_by_ids(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
