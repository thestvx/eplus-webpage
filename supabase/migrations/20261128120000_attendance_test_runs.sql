ALTER TABLE attendance_control_state
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_run_id TEXT NOT NULL DEFAULT '';

ALTER TABLE attendance_sessions
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_run_id TEXT NOT NULL DEFAULT '';

ALTER TABLE attendance_request_results
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_run_id TEXT NOT NULL DEFAULT '';

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE student_subscriptions
  ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE subscription_periods
  ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS idx_att_control_state_open_unique;
CREATE UNIQUE INDEX idx_att_control_state_open_unique
  ON attendance_control_state (
    date,
    COALESCE(NULLIF(teacher_id, ''), attendance_norm_teacher(teacher_name)),
    attendance_norm_subject(subject_name),
    COALESCE(test_run_id, '')
  )
  WHERE is_open = true;

DROP INDEX IF EXISTS idx_att_sessions_dup;
CREATE UNIQUE INDEX idx_att_sessions_dup
  ON attendance_sessions (student_id, teacher_id, subject_id, date, COALESCE(test_run_id, ''))
  WHERE status = 'recorded';

CREATE INDEX IF NOT EXISTS idx_att_sessions_test_run ON attendance_sessions(test_run_id) WHERE test_run_id <> '';
CREATE INDEX IF NOT EXISTS idx_att_control_test_run ON attendance_control_state(test_run_id) WHERE test_run_id <> '';
CREATE INDEX IF NOT EXISTS idx_att_request_test_run ON attendance_request_results(test_run_id) WHERE test_run_id <> '';
CREATE INDEX IF NOT EXISTS idx_reg_test_data ON registrations(is_test_data) WHERE is_test_data = true;
CREATE INDEX IF NOT EXISTS idx_sub_test_data ON student_subscriptions(is_test_data) WHERE is_test_data = true;
CREATE INDEX IF NOT EXISTS idx_period_test_data ON subscription_periods(is_test_data) WHERE is_test_data = true;

CREATE TABLE IF NOT EXISTS attendance_test_runs (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL DEFAULT '',
  teacher_name TEXT NOT NULL,
  subject_id TEXT NOT NULL DEFAULT '',
  subject_name TEXT NOT NULL,
  test_date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  session_opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  session_id TEXT NOT NULL DEFAULT '',
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  deducted_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  rollback_reason TEXT NOT NULL DEFAULT '',
  results JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS attendance_test_operations (
  id BIGSERIAL PRIMARY KEY,
  test_run_id TEXT NOT NULL REFERENCES attendance_test_runs(id) ON DELETE RESTRICT,
  operation_type TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  student_id TEXT NOT NULL DEFAULT '',
  period_id TEXT NOT NULL DEFAULT '',
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reversed_at TIMESTAMPTZ,
  UNIQUE (test_run_id, operation_type, entity_table, entity_id)
);

CREATE TABLE IF NOT EXISTS attendance_test_events (
  id BIGSERIAL PRIMARY KEY,
  test_run_id TEXT NOT NULL REFERENCES attendance_test_runs(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  student_id TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_att_test_ops_run ON attendance_test_operations(test_run_id, id);
CREATE INDEX IF NOT EXISTS idx_att_test_events_run ON attendance_test_events(test_run_id, id);
CREATE INDEX IF NOT EXISTS idx_att_test_runs_status ON attendance_test_runs(status, created_at DESC);

ALTER TABLE attendance_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_test_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_test_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE attendance_test_runs, attendance_test_operations, attendance_test_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE attendance_test_runs, attendance_test_operations, attendance_test_events TO service_role;

CREATE OR REPLACE FUNCTION attendance_test_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_test_runs_updated ON attendance_test_runs;
CREATE TRIGGER trg_attendance_test_runs_updated
  BEFORE UPDATE ON attendance_test_runs
  FOR EACH ROW EXECUTE FUNCTION attendance_test_touch_updated_at();

CREATE OR REPLACE FUNCTION attendance_test_journal(
  p_test_run_id TEXT,
  p_operation_type TEXT,
  p_entity_table TEXT,
  p_entity_id TEXT,
  p_student_id TEXT,
  p_period_id TEXT,
  p_before_state JSONB,
  p_after_state JSONB
)
RETURNS VOID AS $$
BEGIN
  IF trim(COALESCE(p_test_run_id, '')) = '' THEN
    RETURN;
  END IF;
  INSERT INTO attendance_test_operations (
    test_run_id, operation_type, entity_table, entity_id,
    student_id, period_id, before_state, after_state
  )
  VALUES (
    p_test_run_id, p_operation_type, p_entity_table, p_entity_id,
    COALESCE(p_student_id, ''), COALESCE(p_period_id, ''), p_before_state, p_after_state
  )
  ON CONFLICT (test_run_id, operation_type, entity_table, entity_id) DO UPDATE
    SET student_id = EXCLUDED.student_id,
        period_id = EXCLUDED.period_id,
        before_state = CASE
          WHEN attendance_test_operations.before_state IS NULL THEN EXCLUDED.before_state
          ELSE attendance_test_operations.before_state
        END,
        after_state = EXCLUDED.after_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION attendance_test_log(
  p_test_run_id TEXT,
  p_event_type TEXT,
  p_student_id TEXT DEFAULT '',
  p_entity_id TEXT DEFAULT '',
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  IF trim(COALESCE(p_test_run_id, '')) = '' THEN
    RETURN;
  END IF;
  INSERT INTO attendance_test_events (test_run_id, event_type, student_id, entity_id, details, event_at)
  VALUES (p_test_run_id, p_event_type, COALESCE(p_student_id, ''), COALESCE(p_entity_id, ''), COALESCE(p_details, '{}'::jsonb), now());
  UPDATE attendance_test_runs SET updated_at = now() WHERE id = p_test_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION attendance_test_journal(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION attendance_test_log(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION get_student_attendance_events(p_student_id TEXT)
RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'studentId', student_id,
    'teacherId', teacher_id,
    'teacherName', teacher_name,
    'subjectId', subject_id,
    'subjectName', subject_name,
    'date', date,
    'checkInTime', check_in_time,
    'barcodeValue', barcode_value,
    'subscriptionId', subscription_id,
    'subscriptionPeriodId', subscription_period_id,
    'monthNumber', month_number,
    'createdAt', created_at,
    'status', status,
    'recordType', record_type,
    'stateReason', state_reason,
    'refunded', refunded,
    'remainingAfter', remaining_after,
    'sessionId', session_id,
    'source', source
  ) ORDER BY date DESC, created_at DESC), '[]'::jsonb)
  FROM attendance_sessions
  WHERE student_id = p_student_id
    AND status IN ('recorded', 'absent')
    AND COALESCE(is_test, false) = false
    AND COALESCE(test_run_id, '') = '';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_list_subscriptions(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC), '[]'::jsonb)
            FROM student_subscriptions s
           WHERE COALESCE(s.is_test_data, false) = false);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_list_subscriptions_rich(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'subscription', to_jsonb(s),
    'periods', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
                FROM subscription_periods p WHERE p.subscription_id = s.id)
  ) ORDER BY COALESCE(s.updated_at, s.created_at) DESC), '[]'::jsonb)
            FROM student_subscriptions s
           WHERE COALESCE(s.is_test_data, false) = false);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_get_subscription_detail(p_admin_uid TEXT, p_subscription_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_sub JSONB;
  v_periods JSONB;
  v_student JSONB;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT to_jsonb(s) INTO v_sub
    FROM student_subscriptions s
   WHERE s.id = p_subscription_id AND COALESCE(s.is_test_data, false) = false;
  IF v_sub IS NULL THEN RAISE EXCEPTION 'subscription not found'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb) INTO v_periods
    FROM subscription_periods p WHERE p.subscription_id = p_subscription_id;
  SELECT to_jsonb(r) INTO v_student FROM registrations r WHERE r.id = v_sub->>'student_id';
  RETURN jsonb_build_object('subscription', v_sub, 'periods', v_periods, 'student', v_student);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_teacher_due_sessions(
  p_teacher_id TEXT,
  p_teacher_name TEXT
)
RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'subscription', to_jsonb(s),
      'periods', (
        SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
        FROM subscription_periods p
        WHERE p.subscription_id = s.id
      )
    )
  ), '[]'::jsonb)
  FROM student_subscriptions s
  WHERE COALESCE(s.is_test_data, false) = false
    AND (
      (p_teacher_id IS NOT NULL AND p_teacher_id <> '' AND s.teacher_id = p_teacher_id)
      OR (p_teacher_name IS NOT NULL AND p_teacher_name <> ''
          AND lower(regexp_replace(COALESCE(s.teacher_name, ''), '\s+', '', 'g'))
            = lower(regexp_replace(p_teacher_name, '\s+', '', 'g')))
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_teacher_active_subs(p_teacher_id TEXT)
RETURNS TABLE(student_id TEXT, student_name TEXT, first_name TEXT, last_name TEXT, level TEXT, stream TEXT, subject_name TEXT, subject_id TEXT, teacher_name TEXT, status TEXT) AS $$
  SELECT s.student_id,
         COALESCE(r.first_name || ' ' || r.last_name, s.student_id) AS student_name,
         r.first_name, r.last_name, r.level, r.stream,
         s.subject_name, s.subject_id, s.teacher_name, s.status
  FROM student_subscriptions s
  LEFT JOIN registrations r ON r.id::TEXT = s.student_id
  WHERE s.teacher_id = p_teacher_id
    AND s.status IN ('active', 'permanent')
    AND COALESCE(s.is_test_data, false) = false
    AND COALESCE(r.is_test_data, false) = false;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_teacher_registered_students(p_teacher_id TEXT, p_teacher_name TEXT)
RETURNS TABLE(student_id TEXT, first_name TEXT, last_name TEXT, level TEXT, stream TEXT, created_at TIMESTAMPTZ, matched_subjects TEXT) AS $$
  SELECT r.id::TEXT, r.first_name, r.last_name, r.level, r.stream, r.created_at,
         string_agg(DISTINCT COALESCE(el->>'subject', el->>'subjectName', el->>'name', ''), ', ')
  FROM registrations r,
       jsonb_array_elements(
         CASE WHEN jsonb_typeof(r.subjects) = 'array' THEN r.subjects ELSE '[]'::jsonb END
       ) el
  WHERE r.status = 'مسجل نهائياً'
    AND r.deleted_at IS NULL
    AND COALESCE(r.is_test_data, false) = false
    AND (
      el->>'teacherId' = p_teacher_id
      OR el->>'teacher_id' = p_teacher_id
      OR REPLACE(REPLACE(LOWER(COALESCE(el->>'teacher', el->>'teacherName', el->>'teacher_name', el->>'teachername', '')), ' ', ''), 'عبدال', 'abd')
         = REPLACE(REPLACE(LOWER(p_teacher_name), ' ', ''), 'عبدال', 'abd')
      OR REPLACE(LOWER(r.subjects::text), ' ', '')
         LIKE '%' || REPLACE(LOWER(p_teacher_name), ' ', '') || '%'
    )
  GROUP BY r.id, r.first_name, r.last_name, r.level, r.stream, r.created_at;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_list_registrations(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC), '[]'::jsonb)
            FROM registrations r
           WHERE COALESCE(r.is_test_data, false) = false);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS attendance_find_open_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION attendance_find_open_session(
  p_date TEXT,
  p_teacher_id TEXT DEFAULT '',
  p_teacher_name TEXT DEFAULT '',
  p_subject_id TEXT DEFAULT '',
  p_subject_name TEXT DEFAULT '',
  p_session_id TEXT DEFAULT '',
  p_test_run_id TEXT DEFAULT ''
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
  v_test_run_id TEXT := trim(COALESCE(p_test_run_id, ''));
BEGIN
  IF v_date = '' THEN
    RETURN NULL;
  END IF;

  IF v_session_id <> '' THEN
    SELECT * INTO v_row
      FROM attendance_control_state
     WHERE id = v_session_id
       AND date = v_date
       AND is_open IS TRUE
       AND COALESCE(test_run_id, '') = v_test_run_id;
    RETURN v_row;
  END IF;

  SELECT * INTO v_row
    FROM attendance_control_state
   WHERE date = v_date
     AND is_open IS TRUE
     AND COALESCE(test_run_id, '') = v_test_run_id
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

DROP FUNCTION IF EXISTS attendance_session_state(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION attendance_session_state(
  p_date TEXT,
  p_teacher_id TEXT DEFAULT '',
  p_teacher_name TEXT DEFAULT '',
  p_subject_id TEXT DEFAULT '',
  p_subject_name TEXT DEFAULT '',
  p_session_id TEXT DEFAULT '',
  p_test_run_id TEXT DEFAULT ''
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
  v_test_run_id TEXT := trim(COALESCE(p_test_run_id, ''));
  v_checked_at TEXT := to_char(now() AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI:SS');
BEGIN
  v_open := attendance_find_open_session(
    p_date, p_teacher_id, p_teacher_name, p_subject_id, p_subject_name, p_session_id, v_test_run_id
  );

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
      'isTest', v_open.is_test,
      'testRunId', COALESCE(v_open.test_run_id, ''),
      'checkedAt', v_checked_at
    );
  END IF;

  SELECT * INTO v_any
    FROM attendance_control_state
   WHERE date = trim(COALESCE(p_date, ''))
     AND COALESCE(test_run_id, '') = v_test_run_id
     AND (
       CASE
         WHEN trim(COALESCE(p_teacher_id, '')) <> '' AND trim(COALESCE(p_teacher_name, '')) <> '' THEN
           (COALESCE(teacher_id, '') = '' OR teacher_id = trim(p_teacher_id))
           AND attendance_norm_teacher(teacher_name) = attendance_norm_teacher(trim(p_teacher_name))
         WHEN trim(COALESCE(p_teacher_id, '')) <> '' THEN COALESCE(teacher_id, '') = '' OR teacher_id = trim(p_teacher_id)
         ELSE attendance_norm_teacher(teacher_name) = attendance_norm_teacher(trim(COALESCE(p_teacher_name, '')))
       END
     )
     AND (
       CASE
         WHEN trim(COALESCE(p_subject_id, '')) <> '' AND trim(COALESCE(p_subject_name, '')) <> '' THEN
           (COALESCE(subject_id, '') = '' OR subject_id = trim(p_subject_id))
           AND attendance_norm_subject(subject_name) = attendance_norm_subject(trim(p_subject_name))
         WHEN trim(COALESCE(p_subject_id, '')) <> '' THEN COALESCE(subject_id, '') = '' OR subject_id = trim(p_subject_id)
         ELSE attendance_norm_subject(subject_name) = attendance_norm_subject(trim(p_subject_name))
       END
     )
   ORDER BY updated_at DESC, id DESC
   LIMIT 1;

  IF trim(COALESCE(p_teacher_id, '')) <> '' THEN
    SELECT EXISTS (
      SELECT 1
        FROM attendance_control_state
       WHERE date = trim(p_date)
         AND is_open IS TRUE
         AND COALESCE(test_run_id, '') = v_test_run_id
         AND attendance_norm_subject(subject_name) = attendance_norm_subject(trim(COALESCE(p_subject_name, '')))
         AND COALESCE(teacher_id, '') <> ''
         AND teacher_id <> trim(p_teacher_id)
    ) INTO v_other_teacher;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM attendance_control_state
     WHERE date = trim(COALESCE(p_date, ''))
       AND is_open IS TRUE
       AND COALESCE(test_run_id, '') = v_test_run_id
       AND (
         CASE
           WHEN trim(COALESCE(p_teacher_id, '')) <> '' THEN teacher_id = trim(p_teacher_id)
           ELSE attendance_norm_teacher(teacher_name) = attendance_norm_teacher(trim(COALESCE(p_teacher_name, '')))
         END
       )
       AND attendance_norm_subject(subject_name) <> attendance_norm_subject(trim(COALESCE(p_subject_name, '')))
  ) INTO v_other_subject;

  IF trim(COALESCE(p_session_id, '')) <> '' AND EXISTS (
    SELECT 1 FROM attendance_control_state
     WHERE id = trim(p_session_id)
       AND date = trim(p_date)
       AND is_open IS NOT TRUE
       AND COALESCE(test_run_id, '') = v_test_run_id
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
    'dbState', CASE WHEN v_any.id IS NOT NULL AND v_any.is_open IS NOT TRUE THEN 'closed' ELSE 'none' END,
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
    'isTest', v_test_run_id <> '',
    'testRunId', v_test_run_id,
    'checkedAt', v_checked_at
  );
END;
$$;

DROP FUNCTION IF EXISTS open_attendance_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION open_attendance_session(
  p_admin_uid TEXT,
  p_date TEXT,
  p_teacher_id TEXT DEFAULT '',
  p_teacher_name TEXT DEFAULT '',
  p_subject_id TEXT DEFAULT '',
  p_subject_name TEXT DEFAULT '',
  p_opened_at TEXT DEFAULT '',
  p_test_run_id TEXT DEFAULT ''
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
  v_test_run_id TEXT := trim(COALESCE(p_test_run_id, ''));
  v_test_run attendance_test_runs%ROWTYPE;
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

  IF v_test_run_id <> '' THEN
    SELECT * INTO v_test_run FROM attendance_test_runs WHERE id = v_test_run_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'اختبار الحضور غير موجود' USING ERRCODE = 'P0002';
    END IF;
    IF v_test_run.created_by <> p_admin_uid THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF v_test_run.status NOT IN ('draft', 'in_progress') THEN
      RAISE EXCEPTION 'لا يمكن بدء اختبار منتهٍ' USING ERRCODE = '42501';
    END IF;
    IF COALESCE(v_test_run.teacher_id, '') <> v_teacher_id
       OR attendance_norm_teacher(v_test_run.teacher_name) <> v_teacher_name
       OR attendance_norm_subject(v_test_run.subject_name) <> v_subject_name THEN
      RAISE EXCEPTION 'بيانات الاختبار لا تطابق الأستاذ والمادة' USING ERRCODE = '42501';
    END IF;
    v_key := lower(regexp_replace(v_test_run_id, '[^A-Za-z0-9_-]', '_', 'g'));
    v_session_id := v_date || '_test_' || v_key;
  ELSE
    v_key := lower(regexp_replace(v_teacher_name, '\s+', '', 'g'));
    v_session_id := v_date || '_' || v_key;
    IF v_subject_name <> '' THEN
      v_session_id := v_session_id || '_' || lower(regexp_replace(v_subject_name, '\s+', '', 'g'));
    END IF;
  END IF;

  v_opened_at := NULLIF(trim(COALESCE(p_opened_at, '')), '');
  IF v_opened_at IS NULL THEN
    v_opened_at := to_char(now() AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI:SS');
  END IF;

  INSERT INTO attendance_control_state (
    id, date, teacher_id, teacher_name, subject_id, subject_name,
    is_open, opened_at, closed_at, updated_at, is_test, test_run_id
  )
  VALUES (
    v_session_id, v_date, v_teacher_id, v_teacher_name, v_subject_id, v_subject_name,
    true, v_opened_at, '', now(), v_test_run_id <> '', v_test_run_id
  )
  ON CONFLICT (id) DO UPDATE
    SET teacher_id = EXCLUDED.teacher_id,
        teacher_name = EXCLUDED.teacher_name,
        subject_id = EXCLUDED.subject_id,
        subject_name = EXCLUDED.subject_name,
        is_open = true,
        opened_at = EXCLUDED.opened_at,
        closed_at = '',
        updated_at = now(),
        is_test = EXCLUDED.is_test,
        test_run_id = EXCLUDED.test_run_id;

  IF v_test_run_id <> '' THEN
    UPDATE attendance_test_runs
       SET status = 'in_progress',
           started_at = COALESCE(started_at, now()),
           session_opened_at = now(),
           session_id = v_session_id,
           updated_at = now()
     WHERE id = v_test_run_id;
    PERFORM attendance_test_log(v_test_run_id, 'test_started', '', v_session_id, jsonb_build_object('date', v_date));
    PERFORM attendance_test_log(v_test_run_id, 'session_opened', '', v_session_id, jsonb_build_object('openedAt', v_opened_at));
  END IF;

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
    'isOpen', true,
    'isTest', v_test_run_id <> '',
    'testRunId', v_test_run_id
  );
END;
$$;

DROP FUNCTION IF EXISTS close_attendance_session_by_ids(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION close_attendance_session_by_ids(
  p_admin_uid TEXT,
  p_date TEXT,
  p_teacher_id TEXT DEFAULT '',
  p_teacher_name TEXT DEFAULT '',
  p_subject_id TEXT DEFAULT '',
  p_subject_name TEXT DEFAULT '',
  p_actor TEXT DEFAULT '',
  p_closed_at TEXT DEFAULT '',
  p_session_id TEXT DEFAULT '',
  p_test_run_id TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row attendance_control_state%ROWTYPE;
  v_test_run_id TEXT := trim(COALESCE(p_test_run_id, ''));
  v_session_id TEXT := trim(COALESCE(p_session_id, ''));
BEGIN
  IF NOT admin_is_uid_admin(p_admin_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_row := attendance_find_open_session(
    p_date, p_teacher_id, p_teacher_name, p_subject_id, p_subject_name, v_session_id, v_test_run_id
  );

  IF v_row.id IS NOT NULL THEN
    v_session_id := v_row.id;
    IF v_test_run_id = '' THEN
      v_test_run_id := COALESCE(v_row.test_run_id, '');
    END IF;
  ELSIF v_session_id = '' AND v_test_run_id <> '' THEN
    SELECT session_id INTO v_session_id FROM attendance_test_runs WHERE id = v_test_run_id;
    v_session_id := COALESCE(v_session_id, '');
  ELSIF v_session_id = '' THEN
    RAISE EXCEPTION 'جلسة الحضور غير موجودة' USING ERRCODE = 'P0002';
  END IF;

  RETURN close_attendance_session(p_admin_uid, v_session_id, p_actor, p_closed_at, v_test_run_id);
END;
$$;

DROP FUNCTION IF EXISTS record_support_attendance_batch(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION record_support_attendance_batch(
  p_request_id TEXT,
  p_student_id TEXT,
  p_payload JSONB,
  p_date TEXT,
  p_check_in_time TEXT,
  p_items JSONB,
  p_test_run_id TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_existing_result JSONB;
  v_existing_payload JSONB;
  v_results JSONB := '[]'::jsonb;
  v_result JSONB;
  v_item JSONB;
  v_idx INT := 0;
  v_saved INT := 0;
  v_deducted INT := 0;
  v_used INT;
  v_rem INT;
  v_id TEXT;
  v_error TEXT;
  v_sqlstate TEXT;
  v_teacher_name TEXT;
  v_subject_name TEXT;
  v_teacher_id TEXT;
  v_subject_id TEXT;
  v_mode TEXT;
  v_action TEXT;
  v_open BOOLEAN;
  v_sub_id TEXT;
  v_period_id TEXT;
  v_month INT;
  v_mirror_id TEXT;
  v_record_type TEXT;
  v_allow_cycle BOOLEAN;
  v_permanent BOOLEAN;
  v_source TEXT;
  v_now TIMESTAMPTZ := now();
  v_server_time TEXT := to_char(now() AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI:SS');
  v_session_id TEXT := '';
  v_requested_session_id TEXT := '';
  v_control attendance_control_state%ROWTYPE;
  v_test_run_id TEXT := trim(COALESCE(p_test_run_id, ''));
  v_test_run attendance_test_runs%ROWTYPE;
  v_period_before JSONB;
  v_period_after JSONB;
  v_row_after JSONB;
  v_abs RECORD;
BEGIN
  IF p_request_id IS NULL OR length(trim(p_request_id)) < 8 THEN
    RAISE EXCEPTION 'request_id required';
  END IF;
  IF p_student_id IS NULL OR trim(p_student_id) = '' THEN
    RAISE EXCEPTION 'student_id required';
  END IF;
  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'payload required';
  END IF;
  IF p_date IS NULL OR p_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'invalid date';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items required';
  END IF;
  IF jsonb_array_length(p_items) > 12 THEN
    RAISE EXCEPTION 'too many items';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_request_id), hashtext(p_student_id));

  SELECT result, payload INTO v_existing_result, v_existing_payload
    FROM attendance_request_results
   WHERE request_id = p_request_id;

  IF FOUND THEN
    IF p_payload IS DISTINCT FROM v_existing_payload THEN
      RAISE EXCEPTION 'idempotency key reused with a different payload';
    END IF;
    RETURN v_existing_result || jsonb_build_object('idempotent_replay', true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM registrations
     WHERE id = p_student_id AND deleted_at IS NULL AND status = 'مسجل نهائياً'
  ) THEN
    RAISE EXCEPTION 'student is not finally registered';
  END IF;

  IF v_test_run_id <> '' THEN
    SELECT * INTO v_test_run FROM attendance_test_runs WHERE id = v_test_run_id FOR SHARE;
    IF NOT FOUND OR v_test_run.status <> 'in_progress' OR COALESCE(v_test_run.session_id, '') = '' THEN
      RAISE EXCEPTION 'اختبار الحضور غير جاهز ل تسجيل الحضور' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM registrations
       WHERE id = p_student_id
         AND COALESCE(is_test_data, false) = true
         AND deleted_at IS NULL
         AND status = 'مسجل نهائياً'
    ) THEN
      RAISE EXCEPTION 'تسجيل الحضور في اختبار يتطلب طالب اختبار معزول' USING ERRCODE = '42501';
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM registrations
     WHERE id = p_student_id AND COALESCE(is_test_data, false) = true
  ) THEN
    RAISE EXCEPTION 'طالب الاختبار يتطلب جلسة اختبار' USING ERRCODE = '42501';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_idx := v_idx + 1;
    v_rem := NULL;
    v_session_id := '';
    BEGIN
      v_teacher_name := trim(COALESCE(v_item->>'teacherName', ''));
      v_subject_name := trim(COALESCE(v_item->>'subjectName', ''));
      v_teacher_id := trim(COALESCE(v_item->>'teacherId', ''));
      v_subject_id := trim(COALESCE(v_item->>'subjectId', ''));
      v_mode := trim(COALESCE(v_item->>'mode', 'normal'));
      v_open := COALESCE((v_item->>'attendanceOpen')::boolean, false);
      v_sub_id := trim(COALESCE(v_item->>'subscriptionId', ''));
      v_period_id := trim(COALESCE(v_item->>'periodId', ''));
      v_month := COALESCE((v_item->>'monthNumber')::int, 0);
      v_permanent := COALESCE((v_item->>'permanent')::boolean, false);
      v_mirror_id := trim(COALESCE(v_item->>'mirrorId', ''));

      IF v_teacher_name = '' OR v_subject_name = '' THEN
        RAISE EXCEPTION 'teacherName and subjectName required';
      END IF;
      IF v_mirror_id = '' THEN
        RAISE EXCEPTION 'mirrorId required';
      END IF;
      IF v_mode NOT IN ('normal', 'allow') THEN
        RAISE EXCEPTION 'unsupported mode';
      END IF;
      IF NOT v_open THEN
        RAISE EXCEPTION 'الحضور غير مفتوح لهذا الأستاذ' USING ERRCODE = '42501';
      END IF;

      v_requested_session_id := trim(COALESCE(v_item->>'sessionId', ''));
      IF v_requested_session_id = '' THEN
        RAISE EXCEPTION 'sessionId required' USING ERRCODE = '42501';
      END IF;
      v_control := attendance_find_open_session(
        p_date, v_teacher_id, v_teacher_name, v_subject_id, v_subject_name, v_requested_session_id, v_test_run_id
      );
      IF v_control.id IS NULL THEN
        RAISE EXCEPTION 'الحضور غير مفتوح لهذا الأستاذ' USING ERRCODE = '42501';
      END IF;
      IF COALESCE(v_control.test_run_id, '') <> v_test_run_id THEN
        RAISE EXCEPTION 'الجلسة لا تنتمي إلى الاختبار المحدد' USING ERRCODE = '42501';
      END IF;
      v_session_id := v_control.id;

      FOR v_abs IN
        SELECT id, subscription_period_id, refunded
          FROM attendance_sessions
         WHERE student_id = p_student_id
           AND date = p_date
           AND status = 'recorded'
           AND record_type = 'absent'
           AND COALESCE(test_run_id, '') = v_test_run_id
           AND (
             (v_session_id <> '' AND session_id = v_session_id)
             OR (session_id = '' AND (
               (v_teacher_id <> '' AND teacher_id = v_teacher_id)
               OR attendance_norm_teacher(teacher_name) = attendance_norm_teacher(v_teacher_name)
             ) AND (
               v_subject_name = ''
               OR attendance_norm_subject(subject_name) = attendance_norm_subject(v_subject_name)
             ))
           )
         FOR UPDATE
      LOOP
        UPDATE attendance_sessions
           SET status = 'cancelled',
               cancelled_at = v_now,
               state_reason = 'reopened',
               updated_at = v_now
         WHERE id = v_abs.id;

        IF COALESCE(v_abs.refunded, false) = false AND COALESCE(v_abs.subscription_period_id, '') <> '' THEN
          SELECT to_jsonb(p) INTO v_period_before
            FROM subscription_periods p
           WHERE id = v_abs.subscription_period_id
           FOR UPDATE;
          UPDATE subscription_periods
             SET used_sessions = GREATEST(0, used_sessions - 1),
                 remaining_sessions = LEAST(total_sessions, remaining_sessions + 1),
                 updated_at = v_now
           WHERE id = v_abs.subscription_period_id;
          SELECT to_jsonb(p) INTO v_period_after
            FROM subscription_periods p
           WHERE id = v_abs.subscription_period_id;
          PERFORM attendance_test_journal(
            v_test_run_id, 'absence_refund', 'subscription_periods', v_abs.subscription_period_id,
            p_student_id, v_abs.subscription_period_id, v_period_before, v_period_after
          );
          PERFORM attendance_test_log(
            v_test_run_id, 'absence_refund', p_student_id, v_abs.subscription_period_id,
            jsonb_build_object('periodId', v_abs.subscription_period_id)
          );
          UPDATE attendance_sessions SET refunded = true WHERE id = v_abs.id;
        END IF;
      END LOOP;

      IF EXISTS (
        SELECT 1 FROM attendance_sessions
         WHERE student_id = p_student_id
           AND teacher_id = v_teacher_id
           AND subject_id = v_subject_id
           AND date = p_date
           AND status = 'recorded'
           AND record_type <> 'absent'
           AND COALESCE(test_run_id, '') = v_test_run_id
      ) THEN
        RAISE EXCEPTION 'تم تسجيل الحضور لهذه المادة اليوم' USING ERRCODE = '23505';
      END IF;

      IF v_mode = 'allow' THEN
        IF v_sub_id = '' THEN
          RAISE EXCEPTION 'subscriptionId required for allow';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM student_subscriptions s
           WHERE s.id = v_sub_id
             AND s.student_id = p_student_id
             AND s.status NOT IN ('cancelled', 'paused')
             AND COALESCE(s.is_test_data, false) = (v_test_run_id <> '')
        ) THEN
          RAISE EXCEPTION 'دورة الاشتراك غير صالحة للسماح الاستثنائي';
        END IF;
        IF EXISTS (
          SELECT 1 FROM attendance_sessions
           WHERE student_id = p_student_id
             AND subscription_id = v_sub_id
             AND allow_cycle = true
             AND status = 'recorded'
             AND COALESCE(test_run_id, '') = v_test_run_id
        ) THEN
          RAISE EXCEPTION 'تم استخدام السماح لهذه الدورة';
        END IF;
        v_action := 'allow';
        v_record_type := 'allow_sub';
        v_allow_cycle := true;
        v_period_id := '';
        v_source := 'eplus-attendance-allow';
      ELSE
        IF v_sub_id = '' THEN
          RAISE EXCEPTION 'subscriptionId required';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM student_subscriptions s
           WHERE s.id = v_sub_id
             AND s.student_id = p_student_id
             AND s.status NOT IN ('cancelled', 'paused')
             AND COALESCE(s.is_test_data, false) = (v_test_run_id <> '')
        ) THEN
          RAISE EXCEPTION 'الاشتراك غير صالح';
        END IF;
        IF NOT v_permanent THEN
          IF v_period_id = '' THEN
            RAISE EXCEPTION 'periodId required';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM subscription_periods p
             WHERE p.id = v_period_id
               AND p.subscription_id = v_sub_id
               AND p.remaining_sessions >= 1
               AND COALESCE(p.is_test_data, false) = (v_test_run_id <> '')
          ) THEN
            RAISE EXCEPTION 'انتهى الاشتراك لهذه المادة';
          END IF;
        ELSE
          v_period_id := '';
          v_month := 0;
        END IF;
        v_action := 'normal';
        v_record_type := 'present';
        v_allow_cycle := false;
        v_source := 'eplus-attendance';
      END IF;

      INSERT INTO attendance_sessions (
        id, student_id, teacher_id, teacher_name, subject_id, subject_name,
        date, check_in_time, barcode_value, subscription_id, subscription_period_id,
        month_number, mirror_id, status, record_type, allow_cycle,
        student_name, student_type, level, stream, institution, source,
        confirmed, server_time, request_id, session_id, remaining_after,
        created_at, updated_at, is_test, test_run_id
      )
      VALUES (
        v_mirror_id, p_student_id, v_teacher_id, v_teacher_name, v_subject_id, v_subject_name,
        p_date, p_check_in_time, trim(COALESCE(p_payload->>'barcodeValue', '')),
        v_sub_id, v_period_id, v_month, v_mirror_id, 'recorded', v_record_type, v_allow_cycle,
        trim(COALESCE(p_payload->>'studentName', '')), trim(COALESCE(p_payload->>'studentType', '')),
        trim(COALESCE(p_payload->>'level', '')), trim(COALESCE(p_payload->>'stream', '')),
        trim(COALESCE(p_payload->>'institution', '')), v_source,
        true, v_server_time, p_request_id, v_session_id,
        NULL::integer,
        v_now, v_now, v_test_run_id <> '', v_test_run_id
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id INTO v_id;

      IF v_id IS NULL THEN
        RAISE EXCEPTION 'تم تسجيل الحضور لهذه المادة اليوم' USING ERRCODE = '23505';
      END IF;
      v_saved := v_saved + 1;

      IF v_mode = 'normal' AND NOT v_permanent THEN
        SELECT to_jsonb(p) INTO v_period_before
          FROM subscription_periods p
         WHERE id = v_period_id
         FOR UPDATE;
        UPDATE subscription_periods
           SET used_sessions = used_sessions + 1,
               remaining_sessions = remaining_sessions - 1,
               updated_at = v_now
         WHERE id = v_period_id
           AND remaining_sessions >= 1
        RETURNING remaining_sessions INTO v_rem;

        IF v_rem IS NULL THEN
          RAISE EXCEPTION 'انتهى الاشتراك لهذه المادة';
        END IF;
        SELECT to_jsonb(p) INTO v_period_after
          FROM subscription_periods p
         WHERE id = v_period_id;
        PERFORM attendance_test_journal(
          v_test_run_id, 'attendance_deduction', 'subscription_periods', v_period_id,
          p_student_id, v_period_id, v_period_before, v_period_after
        );
        v_deducted := v_deducted + 1;
      END IF;

      UPDATE attendance_sessions
         SET remaining_after = v_rem
       WHERE id = v_id;

      SELECT to_jsonb(a) INTO v_row_after FROM attendance_sessions a WHERE id = v_id;
      PERFORM attendance_test_journal(
        v_test_run_id, 'attendance_record', 'attendance_sessions', v_id,
        p_student_id, v_period_id, NULL::jsonb, v_row_after
      );
      PERFORM attendance_test_log(
        v_test_run_id, 'student_check_in', p_student_id, v_id,
        jsonb_build_object(
          'teacherName', v_teacher_name,
          'subjectName', v_subject_name,
          'recordType', v_record_type,
          'deducted', v_mode = 'normal' AND NOT v_permanent,
          'remaining', v_rem,
          'checkInTime', p_check_in_time
        )
      );

      v_results := v_results || jsonb_build_object(
        'index', v_idx - 1,
        'teacherName', v_teacher_name,
        'subjectName', v_subject_name,
        'ok', true,
        'action', v_action,
        'attendanceId', v_id,
        'sessionId', v_session_id,
        'recordType', v_record_type,
        'stateReason', '',
        'deducted', v_mode = 'normal' AND NOT v_permanent AND v_rem IS NOT NULL,
        'periodId', v_period_id,
        'subscriptionId', v_sub_id,
        'remaining', v_rem,
        'permanent', v_permanent,
        'isTest', v_test_run_id <> '',
        'testRunId', v_test_run_id
      );
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT, v_sqlstate = RETURNED_SQLSTATE;
      PERFORM attendance_test_log(
        v_test_run_id, 'student_check_in_failed', p_student_id, '',
        jsonb_build_object('index', v_idx - 1, 'reason', COALESCE(NULLIF(v_error, ''), 'تعذر تسجيل الحضور'))
      );
      v_results := v_results || jsonb_build_object(
        'index', v_idx - 1,
        'teacherName', v_teacher_name,
        'subjectName', v_subject_name,
        'ok', false,
        'reason', COALESCE(NULLIF(v_error, ''), 'تعذر تسجيل الحضور'),
        'code', v_sqlstate,
        'isTest', v_test_run_id <> '',
        'testRunId', v_test_run_id
      );
    END;
  END LOOP;

  v_result := jsonb_build_object(
    'ok', true,
    'requestId', p_request_id,
    'results', v_results,
    'summary', jsonb_build_object(
      'total', v_idx,
      'succeeded', v_saved,
      'failed', v_idx - v_saved,
      'deducted', v_deducted
    ),
    'isTest', v_test_run_id <> '',
    'testRunId', v_test_run_id,
    'serverTime', v_server_time
  );

  INSERT INTO attendance_request_results (
    request_id, student_id, payload, result, saved_count, deducted_count, is_test, test_run_id
  )
  VALUES (p_request_id, p_student_id, p_payload, v_result, v_saved, v_deducted, v_test_run_id <> '', v_test_run_id)
  ON CONFLICT (request_id) DO NOTHING;

  RETURN v_result || jsonb_build_object('idempotent_replay', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS close_attendance_session(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION close_attendance_session(
  p_admin_uid TEXT,
  p_session_id TEXT,
  p_actor TEXT DEFAULT '',
  p_closed_at TEXT DEFAULT '',
  p_test_run_id TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_control attendance_control_state%ROWTYPE;
  v_existing_result JSONB;
  v_request_id TEXT;
  v_opened_at TIMESTAMPTZ;
  v_closed_time TEXT;
  v_now TIMESTAMPTZ := now();
  v_student RECORD;
  v_sub RECORD;
  v_period RECORD;
  v_period_id TEXT;
  v_period_month INT;
  v_remaining INTEGER;
  v_reason TEXT;
  v_absent_id TEXT;
  v_results JSONB := '[]'::jsonb;
  v_result JSONB;
  v_eligible INT := 0;
  v_present INT := 0;
  v_absent INT := 0;
  v_deducted INT := 0;
  v_total_deducted INT := 0;
  v_no_deduction INT := 0;
  v_skipped_registration INT := 0;
  v_late_registration INT := 0;
  v_test_run_id TEXT := trim(COALESCE(p_test_run_id, ''));
  v_test_run attendance_test_runs%ROWTYPE;
  v_is_test BOOLEAN := false;
  v_period_before JSONB;
  v_period_after JSONB;
  v_row_after JSONB;
BEGIN
  IF p_session_id IS NULL OR trim(p_session_id) = '' THEN
    RAISE EXCEPTION 'sessionId required';
  END IF;
  IF NOT COALESCE(admin_is_uid_admin(p_admin_uid), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_control
    FROM attendance_control_state
   WHERE id = p_session_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'جلسة الحضور غير موجودة' USING ERRCODE = 'P0002';
  END IF;

  IF v_test_run_id = '' THEN
    v_test_run_id := COALESCE(v_control.test_run_id, '');
  END IF;
  v_is_test := v_test_run_id <> '';

  IF COALESCE(v_control.test_run_id, '') <> v_test_run_id THEN
    RAISE EXCEPTION 'الجلسة لا تنتمي إلى الاختبار المحدد' USING ERRCODE = '42501';
  END IF;

  IF v_is_test THEN
    SELECT * INTO v_test_run FROM attendance_test_runs WHERE id = v_test_run_id FOR UPDATE;
    IF NOT FOUND OR v_test_run.status <> 'in_progress' OR COALESCE(v_test_run.session_id, '') <> p_session_id THEN
      RAISE EXCEPTION 'اختبار الحضور غير جاهز للإغلاق' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_request_id := 'close:' || v_test_run_id || ':' || p_session_id;
  PERFORM pg_advisory_xact_lock(hashtext(v_request_id), 0);

  SELECT result INTO v_existing_result
    FROM attendance_request_results
   WHERE request_id = v_request_id;

  IF FOUND THEN
    RETURN v_existing_result || jsonb_build_object('idempotentReplay', true);
  END IF;

  IF v_control.is_open IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'ok', true,
      'action', 'noop',
      'sessionId', p_session_id,
      'reason', 'session-already-closed',
      'closedAt', COALESCE(NULLIF(v_control.closed_at, ''), ''),
      'isTest', v_is_test,
      'testRunId', v_test_run_id
    );
  END IF;

  v_opened_at := NULLIF(trim(COALESCE(v_control.opened_at, '')), '')::timestamptz;
  IF v_opened_at IS NULL THEN
    v_opened_at := v_control.updated_at;
  END IF;
  v_closed_time := COALESCE(
    NULLIF(trim(COALESCE(p_closed_at, '')), ''),
    to_char(now() AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI:SS')
  );

  SELECT count(*) INTO v_skipped_registration
    FROM student_subscriptions s
   WHERE s.created_at <= v_opened_at
     AND s.start_date <= v_control.date
     AND s.end_date >= v_control.date
     AND COALESCE(s.is_test_data, false) = v_is_test
     AND (
       (COALESCE(v_control.teacher_id, '') <> '' AND s.teacher_id = v_control.teacher_id)
       OR attendance_norm_teacher(s.teacher_name) = attendance_norm_teacher(v_control.teacher_name)
     )
     AND (
       COALESCE(v_control.subject_name, '') = ''
       OR attendance_norm_subject(s.subject_name) = attendance_norm_subject(v_control.subject_name)
     )
     AND EXISTS (
       SELECT 1 FROM registrations r
        WHERE r.id = s.student_id
          AND r.deleted_at IS NULL
          AND r.status = 'مسجل نهائياً'
          AND r.created_at <= v_opened_at
          AND COALESCE(r.is_test_data, false) = v_is_test
     )
     AND NOT EXISTS (
       SELECT 1 FROM registrations r, jsonb_array_elements(COALESCE(r.subjects, '[]'::jsonb)) sub
        WHERE r.id = s.student_id
          AND r.deleted_at IS NULL
          AND r.status = 'مسجل نهائياً'
          AND r.created_at <= v_opened_at
          AND COALESCE(r.is_test_data, false) = v_is_test
          AND (
            (COALESCE(v_control.teacher_id, '') <> '' AND attendance_norm_teacher(sub->>'teacherId') = attendance_norm_teacher(v_control.teacher_id))
            OR attendance_norm_teacher(COALESCE(NULLIF(sub->>'teacher', ''), NULLIF(sub->>'teacherName', ''), '')) = attendance_norm_teacher(v_control.teacher_name)
          )
          AND (
            COALESCE(v_control.subject_name, '') = ''
            OR attendance_norm_subject(COALESCE(NULLIF(sub->>'subject', ''), NULLIF(sub->>'subjectName', ''), '')) = attendance_norm_subject(v_control.subject_name)
          )
     );

  SELECT count(*) INTO v_late_registration
    FROM registrations r
   WHERE r.deleted_at IS NULL
     AND r.status = 'مسجل نهائياً'
     AND r.created_at > v_opened_at
     AND COALESCE(r.is_test_data, false) = v_is_test
     AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(COALESCE(r.subjects, '[]'::jsonb)) sub
        WHERE (
          (COALESCE(v_control.teacher_id, '') <> '' AND attendance_norm_teacher(sub->>'teacherId') = attendance_norm_teacher(v_control.teacher_id))
          OR attendance_norm_teacher(COALESCE(NULLIF(sub->>'teacher', ''), NULLIF(sub->>'teacherName', ''), '')) = attendance_norm_teacher(v_control.teacher_name)
        )
        AND (
          COALESCE(v_control.subject_name, '') = ''
          OR attendance_norm_subject(COALESCE(NULLIF(sub->>'subject', ''), NULLIF(sub->>'subjectName', ''), '')) = attendance_norm_subject(v_control.subject_name)
        )
     );

  FOR v_student IN
    SELECT DISTINCT r.*
      FROM registrations r
     WHERE r.deleted_at IS NULL
       AND r.status = 'مسجل نهائياً'
       AND r.created_at <= v_opened_at
       AND COALESCE(r.is_test_data, false) = v_is_test
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(COALESCE(r.subjects, '[]'::jsonb)) sub
          WHERE (
            (COALESCE(v_control.teacher_id, '') <> '' AND attendance_norm_teacher(sub->>'teacherId') = attendance_norm_teacher(v_control.teacher_id))
            OR attendance_norm_teacher(COALESCE(NULLIF(sub->>'teacher', ''), NULLIF(sub->>'teacherName', ''), '')) = attendance_norm_teacher(v_control.teacher_name)
          )
          AND (
            COALESCE(v_control.subject_name, '') = ''
            OR attendance_norm_subject(COALESCE(NULLIF(sub->>'subject', ''), NULLIF(sub->>'subjectName', ''), '')) = attendance_norm_subject(v_control.subject_name)
          )
       )
     ORDER BY r.id
  LOOP
    v_eligible := v_eligible + 1;

    IF EXISTS (
      SELECT 1 FROM attendance_sessions a
       WHERE a.student_id = v_student.id
         AND a.date = v_control.date
         AND a.status = 'recorded'
         AND a.record_type <> 'absent'
         AND COALESCE(a.test_run_id, '') = v_test_run_id
         AND (
           (COALESCE(v_control.teacher_id, '') <> '' AND a.teacher_id = v_control.teacher_id)
           OR attendance_norm_teacher(a.teacher_name) = attendance_norm_teacher(v_control.teacher_name)
         )
         AND (
           COALESCE(v_control.subject_name, '') = ''
           OR attendance_norm_subject(a.subject_name) = attendance_norm_subject(v_control.subject_name)
         )
    ) THEN
      v_present := v_present + 1;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM attendance_sessions a
       WHERE a.student_id = v_student.id
         AND a.date = v_control.date
         AND a.status = 'recorded'
         AND a.record_type = 'absent'
         AND a.session_id = p_session_id
         AND COALESCE(a.test_run_id, '') = v_test_run_id
    ) THEN
      v_absent := v_absent + 1;
      CONTINUE;
    END IF;

    SELECT s.* INTO v_sub
      FROM student_subscriptions s
     WHERE s.student_id = v_student.id
       AND s.created_at <= v_opened_at
       AND s.start_date <= v_control.date
       AND s.end_date >= v_control.date
       AND COALESCE(s.is_test_data, false) = v_is_test
       AND (
         (COALESCE(v_control.teacher_id, '') <> '' AND s.teacher_id = v_control.teacher_id)
         OR attendance_norm_teacher(s.teacher_name) = attendance_norm_teacher(v_control.teacher_name)
       )
       AND (
         COALESCE(v_control.subject_name, '') = ''
         OR attendance_norm_subject(s.subject_name) = attendance_norm_subject(v_control.subject_name)
       )
       AND (
         s.status IN ('active', 'permanent')
         OR (s.status IN ('cancelled', 'paused') AND s.updated_at > v_opened_at)
       )
     ORDER BY CASE s.status WHEN 'active' THEN 0 WHEN 'permanent' THEN 1 ELSE 2 END, s.created_at DESC
     LIMIT 1;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_period_id := '';
    v_period_month := 0;
    v_remaining := NULL;

    IF v_sub.status IN ('cancelled', 'paused') THEN
      v_reason := 'cancelled-after-open';
    ELSIF v_sub.status = 'permanent' THEN
      v_reason := 'permanent-no-deduction';
    ELSE
      SELECT p.* INTO v_period
        FROM subscription_periods p
       WHERE p.subscription_id = v_sub.id
         AND p.status = 'active'
         AND p.start_date <= v_control.date
         AND p.end_date >= v_control.date
         AND p.remaining_sessions >= 1
         AND COALESCE(p.is_test_data, false) = v_is_test
       ORDER BY CASE WHEN p.start_date <= v_control.date AND p.end_date >= v_control.date THEN 0 ELSE 1 END,
                p.start_date DESC,
                p.month_number DESC
       LIMIT 1
       FOR UPDATE;

      IF FOUND THEN
        v_period_id := v_period.id;
        v_period_month := v_period.month_number;
        SELECT to_jsonb(p) INTO v_period_before
          FROM subscription_periods p
         WHERE id = v_period.id;
        UPDATE subscription_periods
           SET used_sessions = used_sessions + 1,
               remaining_sessions = remaining_sessions - 1,
               updated_at = v_now
         WHERE id = v_period.id
           AND remaining_sessions >= 1
        RETURNING remaining_sessions INTO v_remaining;

        IF v_remaining IS NULL THEN
          v_period_id := '';
          v_period_month := 0;
          v_reason := 'no-balance';
        ELSE
          SELECT to_jsonb(p) INTO v_period_after
            FROM subscription_periods p
           WHERE id = v_period.id;
          PERFORM attendance_test_journal(
            v_test_run_id, 'absence_deduction', 'subscription_periods', v_period.id,
            v_student.id, v_period.id, v_period_before, v_period_after
          );
          v_reason := 'absent-deducted';
        END IF;
      ELSIF EXISTS (
        SELECT 1 FROM subscription_periods p
         WHERE p.subscription_id = v_sub.id
           AND p.status = 'active'
           AND p.start_date <= v_control.date
           AND p.end_date >= v_control.date
           AND COALESCE(p.is_test_data, false) = v_is_test
      ) THEN
        v_reason := 'no-balance';
      ELSE
        v_reason := 'allow-no-deduction';
      END IF;
    END IF;

    IF v_period_id = '' THEN
      v_no_deduction := v_no_deduction + 1;
    ELSE
      v_deducted := v_deducted + 1;
    END IF;

    v_absent_id := 'abs_' || regexp_replace(p_session_id || '_' || v_student.id, '[^A-Za-z0-9_-]', '_', 'g');
    IF v_is_test THEN
      v_absent_id := 'abs_test_' || regexp_replace(v_test_run_id || '_' || v_student.id, '[^A-Za-z0-9_-]', '_', 'g');
    END IF;

    INSERT INTO attendance_sessions (
      id, student_id, teacher_id, teacher_name, subject_id, subject_name,
      date, check_in_time, subscription_id, subscription_period_id, month_number,
      mirror_id, status, record_type, allow_cycle, student_name, student_type,
      level, stream, institution, source, confirmed, server_time, request_id,
      session_id, remaining_after, state_reason, refunded, created_at, updated_at,
      is_test, test_run_id
    )
    VALUES (
      v_absent_id, v_student.id, COALESCE(v_control.teacher_id, ''), COALESCE(v_control.teacher_name, ''), '', COALESCE(v_control.subject_name, ''),
      v_control.date, v_closed_time, v_sub.id, v_period_id, v_period_month,
      v_absent_id, 'recorded', 'absent', false,
      trim(COALESCE(v_student.first_name, '') || ' ' || COALESCE(v_student.last_name, '')),
      COALESCE(v_student.student_type, ''), COALESCE(v_student.level, ''),
      COALESCE(v_student.stream, ''), COALESCE(v_student.institution, ''),
      'eplus-attendance-absent', true, v_closed_time, v_request_id,
      p_session_id, v_remaining, v_reason, false, v_now, v_now,
      v_is_test, v_test_run_id
    )
    ON CONFLICT (id) DO NOTHING;

    v_absent := v_absent + 1;

    SELECT to_jsonb(a) INTO v_row_after FROM attendance_sessions a WHERE id = v_absent_id;
    PERFORM attendance_test_journal(
      v_test_run_id, 'absence_record', 'attendance_sessions', v_absent_id,
      v_student.id, v_period_id, NULL::jsonb, v_row_after
    );
    PERFORM attendance_test_log(
      v_test_run_id, 'student_absence', v_student.id, v_absent_id,
      jsonb_build_object(
        'reason', v_reason,
        'deducted', v_period_id <> '',
        'remainingAfter', v_remaining,
        'closedAt', v_closed_time
      )
    );

    v_results := v_results || jsonb_build_object(
      'studentId', v_student.id,
      'studentName', trim(COALESCE(v_student.first_name, '') || ' ' || COALESCE(v_student.last_name, '')),
      'attendanceId', v_absent_id,
      'recordType', 'absent',
      'deducted', v_period_id <> '',
      'reason', v_reason,
      'remainingAfter', v_remaining,
      'subscriptionId', v_sub.id,
      'periodId', v_period_id,
      'monthNumber', v_period_month,
      'checkInTime', v_closed_time,
      'isTest', v_is_test,
      'testRunId', v_test_run_id
    );
  END LOOP;

  UPDATE attendance_control_state
     SET is_open = false,
         closed_at = v_closed_time,
         updated_at = v_now
   WHERE id = p_session_id;

  v_total_deducted := v_deducted;
  IF v_is_test THEN
    SELECT count(*) INTO v_total_deducted
      FROM attendance_test_operations
     WHERE test_run_id = v_test_run_id
       AND operation_type IN ('attendance_deduction', 'absence_deduction')
       AND reversed_at IS NULL;
  END IF;

  v_result := jsonb_build_object(
    'ok', true,
    'action', 'closed',
    'sessionId', p_session_id,
    'date', v_control.date,
    'teacherId', COALESCE(v_control.teacher_id, ''),
    'teacherName', COALESCE(v_control.teacher_name, ''),
    'subjectName', COALESCE(v_control.subject_name, ''),
    'openedAt', COALESCE(v_control.opened_at, ''),
    'closedAt', v_closed_time,
    'actor', COALESCE(p_actor, ''),
    'results', v_results,
    'summary', jsonb_build_object(
      'eligible', v_eligible,
      'present', v_present,
      'absent', v_absent,
      'deducted', v_total_deducted,
      'noDeduction', v_no_deduction,
      'skippedRegistration', v_skipped_registration,
      'registrationDuringSession', v_late_registration
    ),
    'isTest', v_is_test,
    'testRunId', v_test_run_id,
    'serverTime', to_char(v_now AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI:SS')
  );

  IF v_is_test THEN
    SELECT count(*) INTO v_late_registration
      FROM attendance_test_events
     WHERE test_run_id = v_test_run_id AND event_type = 'student_check_in_failed';
    UPDATE attendance_test_runs
       SET status = 'completed',
           closed_at = now(),
            present_count = v_present,
            absent_count = v_absent,
            deducted_count = v_total_deducted,
            failed_count = v_late_registration,
           results = jsonb_build_object('closeResult', v_result),
           updated_at = now()
     WHERE id = v_test_run_id;
    PERFORM attendance_test_log(
      v_test_run_id, 'session_closed', '', p_session_id,
      jsonb_build_object(
        'closedAt', v_closed_time,
        'present', v_present,
        'absent', v_absent,
        'deducted', v_deducted,
        'failed', v_late_registration
      )
    );
  END IF;

  INSERT INTO attendance_request_results (
    request_id, student_id, payload, result, saved_count, deducted_count, is_test, test_run_id
  )
  VALUES (
    v_request_id,
    '',
    jsonb_build_object(
      'sessionId', p_session_id,
      'date', v_control.date,
      'teacherId', COALESCE(v_control.teacher_id, ''),
      'teacherName', COALESCE(v_control.teacher_name, ''),
      'subjectName', COALESCE(v_control.subject_name, ''),
      'actor', COALESCE(p_actor, ''),
      'testRunId', v_test_run_id
    ),
    v_result,
    v_absent,
    v_deducted,
    v_is_test,
    v_test_run_id
  )
  ON CONFLICT (request_id) DO NOTHING;

  RETURN v_result || jsonb_build_object('idempotentReplay', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION attendance_test_create(
  p_admin_uid TEXT,
  p_teacher_id TEXT DEFAULT '',
  p_teacher_name TEXT DEFAULT '',
  p_subject_id TEXT DEFAULT '',
  p_subject_name TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_teacher_id TEXT := trim(COALESCE(p_teacher_id, ''));
  v_teacher_name TEXT := attendance_norm_teacher(p_teacher_name);
  v_subject_id TEXT := trim(COALESCE(p_subject_id, ''));
  v_subject_name TEXT := attendance_norm_subject(p_subject_name);
  v_test_run_id TEXT;
  v_date TEXT := to_char(now() AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD');
  v_result JSONB;
BEGIN
  IF NOT COALESCE(admin_is_uid_admin(p_admin_uid), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_teacher_name = '' OR v_subject_name = '' THEN
    RAISE EXCEPTION 'teacherName and subjectName required';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM registrations r,
           jsonb_array_elements(COALESCE(r.subjects, '[]'::jsonb)) sub
     WHERE r.deleted_at IS NULL
       AND r.status = 'مسجل نهائياً'
       AND COALESCE(r.is_test_data, false) = false
       AND (
         (v_teacher_id <> '' AND attendance_norm_teacher(COALESCE(sub->>'teacherId', sub->>'teacher_id', '')) = v_teacher_id)
         OR attendance_norm_teacher(COALESCE(NULLIF(sub->>'teacher', ''), NULLIF(sub->>'teacherName', ''), NULLIF(sub->>'teacher_name', ''), '')) = v_teacher_name
       )
       AND attendance_norm_subject(COALESCE(NULLIF(sub->>'subject', ''), NULLIF(sub->>'subjectName', ''), NULLIF(sub->>'subject_name', ''), '')) = v_subject_name
  ) THEN
    RAISE EXCEPTION 'الأستاذ والمادة غير موجودين في بيانات النظام' USING ERRCODE = 'P0002';
  END IF;

  v_test_run_id := 'attest_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS') || '_' || substr(md5(random()::text || p_admin_uid || v_teacher_name || v_subject_name), 1, 10);

  INSERT INTO attendance_test_runs (
    id, teacher_id, teacher_name, subject_id, subject_name,
    test_date, created_by, created_at, updated_at, status
  )
  VALUES (
    v_test_run_id, v_teacher_id, v_teacher_name, v_subject_id, v_subject_name,
    v_date, p_admin_uid, now(), now(), 'draft'
  );

  PERFORM attendance_test_log(v_test_run_id, 'test_created', '', '', jsonb_build_object('teacherName', v_teacher_name, 'subjectName', v_subject_name));

  SELECT to_jsonb(t) INTO v_result FROM attendance_test_runs t WHERE id = v_test_run_id;
  RETURN jsonb_build_object('ok', true, 'testRunId', v_test_run_id, 'run', v_result);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION attendance_test_start(
  p_admin_uid TEXT,
  p_test_run_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_run attendance_test_runs%ROWTYPE;
  v_result JSONB;
BEGIN
  IF NOT COALESCE(admin_is_uid_admin(p_admin_uid), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_run FROM attendance_test_runs WHERE id = p_test_run_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'اختبار الحضور غير موجود' USING ERRCODE = 'P0002';
  END IF;
  IF v_run.created_by <> p_admin_uid THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_run.status NOT IN ('draft', 'in_progress') THEN
    RAISE EXCEPTION 'لا يمكن بدء اختبار منتهٍ' USING ERRCODE = '42501';
  END IF;

  v_result := open_attendance_session(
    p_admin_uid,
    v_run.test_date,
    v_run.teacher_id,
    v_run.teacher_name,
    v_run.subject_id,
    v_run.subject_name,
    NULL,
    p_test_run_id
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION attendance_test_close(
  p_admin_uid TEXT,
  p_test_run_id TEXT,
  p_actor TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_run attendance_test_runs%ROWTYPE;
  v_result JSONB;
BEGIN
  IF NOT COALESCE(admin_is_uid_admin(p_admin_uid), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_run FROM attendance_test_runs WHERE id = p_test_run_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'اختبار الحضور غير موجود' USING ERRCODE = 'P0002';
  END IF;
  IF v_run.created_by <> p_admin_uid THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_run.status <> 'in_progress' OR COALESCE(v_run.session_id, '') = '' THEN
    RAISE EXCEPTION 'لا يمكن إغلاق اختبار غير جارٍ' USING ERRCODE = '42501';
  END IF;

  v_result := close_attendance_session(
    p_admin_uid,
    v_run.session_id,
    p_actor,
    NULL,
    p_test_run_id
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION attendance_test_list(
  p_admin_uid TEXT,
  p_search TEXT DEFAULT '',
  p_subject TEXT DEFAULT '',
  p_status TEXT DEFAULT '',
  p_from TEXT DEFAULT '',
  p_to TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_search TEXT := lower(trim(COALESCE(p_search, '')));
  v_subject TEXT := attendance_norm_subject(p_subject);
  v_status TEXT := lower(trim(COALESCE(p_status, '')));
  v_from DATE := NULLIF(trim(COALESCE(p_from, '')), '')::date;
  v_to DATE := NULLIF(trim(COALESCE(p_to, '')), '')::date;
BEGIN
  IF NOT COALESCE(admin_is_uid_admin(p_admin_uid), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC, t.id DESC)
        FROM attendance_test_runs t
       WHERE (v_search = '' OR lower(t.id) LIKE '%' || v_search || '%' OR lower(t.teacher_name) LIKE '%' || v_search || '%')
         AND (v_subject = '' OR attendance_norm_subject(t.subject_name) = v_subject)
         AND (v_status = '' OR lower(t.status) = v_status)
         AND (v_from IS NULL OR t.created_at::date >= v_from)
         AND (v_to IS NULL OR t.created_at::date <= v_to)
    ),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION attendance_test_detail(
  p_admin_uid TEXT,
  p_test_run_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_run attendance_test_runs%ROWTYPE;
  v_present JSONB;
  v_absent JSONB;
  v_timeline JSONB;
  v_summary JSONB;
BEGIN
  IF NOT COALESCE(admin_is_uid_admin(p_admin_uid), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_run FROM attendance_test_runs WHERE id = p_test_run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'اختبار الحضور غير موجود' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'studentId', op.student_id,
    'studentName', op.after_state->>'student_name',
    'checkInTime', op.after_state->>'check_in_time',
    'recordType', op.after_state->>'record_type',
    'reason', op.after_state->>'state_reason',
    'beforeSessions', CASE WHEN per.before_state IS NULL THEN NULL ELSE (per.before_state->>'remaining_sessions')::int END,
    'afterSessions', CASE WHEN per.after_state IS NULL THEN NULL ELSE (per.after_state->>'remaining_sessions')::int END,
    'periodId', COALESCE(op.period_id, ''),
    'eventAt', op.created_at
  ) ORDER BY op.created_at, op.id), '[]'::jsonb)
    INTO v_present
    FROM attendance_test_operations op
    LEFT JOIN attendance_test_operations per
      ON per.test_run_id = op.test_run_id
     AND per.student_id = op.student_id
     AND per.entity_table = 'subscription_periods'
     AND per.operation_type = 'attendance_deduction'
   WHERE op.test_run_id = p_test_run_id
     AND op.operation_type = 'attendance_record';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'studentId', op.student_id,
    'studentName', op.after_state->>'student_name',
    'checkInTime', op.after_state->>'check_in_time',
    'reason', op.after_state->>'state_reason',
    'beforeSessions', CASE WHEN per.before_state IS NULL THEN NULL ELSE (per.before_state->>'remaining_sessions')::int END,
    'afterSessions', CASE WHEN per.after_state IS NULL THEN NULL ELSE (per.after_state->>'remaining_sessions')::int END,
    'periodId', COALESCE(op.period_id, ''),
    'eventAt', op.created_at
  ) ORDER BY op.created_at, op.id), '[]'::jsonb)
    INTO v_absent
    FROM attendance_test_operations op
    LEFT JOIN attendance_test_operations per
      ON per.test_run_id = op.test_run_id
     AND per.student_id = op.student_id
     AND per.entity_table = 'subscription_periods'
     AND per.operation_type = 'absence_deduction'
   WHERE op.test_run_id = p_test_run_id
     AND op.operation_type = 'absence_record';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'eventType', e.event_type,
    'studentId', e.student_id,
    'entityId', e.entity_id,
    'details', e.details,
    'eventAt', e.event_at
  ) ORDER BY e.event_at, e.id), '[]'::jsonb)
    INTO v_timeline
    FROM attendance_test_events e
   WHERE e.test_run_id = p_test_run_id;

  v_summary := jsonb_build_object(
    'present', v_run.present_count,
    'absent', v_run.absent_count,
    'deducted', v_run.deducted_count,
    'failed', v_run.failed_count,
    'successful', GREATEST(0, v_run.present_count + v_run.absent_count - v_run.failed_count),
    'operationCount', (SELECT count(*) FROM attendance_test_operations WHERE test_run_id = p_test_run_id)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'run', to_jsonb(v_run),
    'presentStudents', v_present,
    'absentStudents', v_absent,
    'timeline', v_timeline,
    'summary', v_summary,
    'rollback', v_run.results -> 'rollback',
    'rollbackBlocked', v_run.results -> 'rollbackBlocked'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION attendance_test_rollback(
  p_admin_uid TEXT,
  p_test_run_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_run attendance_test_runs%ROWTYPE;
  v_op RECORD;
  v_current JSONB;
  v_conflicts JSONB := '[]'::jsonb;
  v_restored INT := 0;
  v_rollback JSONB;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT COALESCE(admin_is_uid_admin(p_admin_uid), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_test_run_id), 0);

  SELECT * INTO v_run FROM attendance_test_runs WHERE id = p_test_run_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'اختبار الحضور غير موجود' USING ERRCODE = 'P0002';
  END IF;

  IF v_run.status = 'rolled_back' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'status', 'rolled_back',
      'testRunId', p_test_run_id,
      'rolledBackAt', v_run.rolled_back_at,
      'rollback', v_run.results -> 'rollback'
    );
  END IF;

  IF v_run.status NOT IN ('draft', 'completed', 'needs_review') THEN
    RAISE EXCEPTION 'لا يمكن التراجع عن اختبار قيد التنفيذ' USING ERRCODE = '42501';
  END IF;

  FOR v_op IN
    SELECT * FROM attendance_test_operations
     WHERE test_run_id = p_test_run_id
       AND entity_table IN ('subscription_periods', 'student_subscriptions')
     ORDER BY id
  LOOP
    IF v_op.entity_table = 'subscription_periods' THEN
      SELECT to_jsonb(p) INTO v_current FROM subscription_periods p WHERE id = v_op.entity_id;
      IF v_current IS NULL
         OR (v_current->>'used_sessions')::int IS DISTINCT FROM (v_op.after_state->>'used_sessions')::int
         OR (v_current->>'remaining_sessions')::int IS DISTINCT FROM (v_op.after_state->>'remaining_sessions')::int
         OR (v_current->>'status') IS DISTINCT FROM (v_op.after_state->>'status')
         OR (v_current->>'updated_at')::timestamptz IS DISTINCT FROM (v_op.after_state->>'updated_at')::timestamptz THEN
        v_conflicts := v_conflicts || jsonb_build_object(
          'operationId', v_op.id,
          'entityTable', v_op.entity_table,
          'entityId', v_op.entity_id,
          'studentId', v_op.student_id,
          'expected', v_op.after_state,
          'current', v_current
        );
      END IF;
    ELSIF v_op.entity_table = 'student_subscriptions' THEN
      SELECT to_jsonb(s) INTO v_current FROM student_subscriptions s WHERE id = v_op.entity_id;
      IF v_current IS NULL
         OR (v_current->>'status') IS DISTINCT FROM (v_op.after_state->>'status')
         OR (v_current->>'updated_at')::timestamptz IS DISTINCT FROM (v_op.after_state->>'updated_at')::timestamptz THEN
        v_conflicts := v_conflicts || jsonb_build_object(
          'operationId', v_op.id,
          'entityTable', v_op.entity_table,
          'entityId', v_op.entity_id,
          'studentId', v_op.student_id,
          'expected', v_op.after_state,
          'current', v_current
        );
      END IF;
    END IF;
  END LOOP;

  IF jsonb_array_length(v_conflicts) > 0 THEN
    UPDATE attendance_test_runs
       SET status = 'needs_review',
           rollback_reason = 'conflicting-real-changes',
           results = results || jsonb_build_object('rollbackBlocked', jsonb_build_object('conflicts', v_conflicts, 'attemptedAt', v_now)),
           updated_at = v_now
     WHERE id = p_test_run_id;
    PERFORM attendance_test_log(
      p_test_run_id, 'rollback_blocked', '', '',
      jsonb_build_object('reason', 'conflicting-real-changes', 'conflictCount', jsonb_array_length(v_conflicts))
    );
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'needs_review',
      'testRunId', p_test_run_id,
      'reason', 'توجد تغييرات حقيقية لاحقة على بيانات الاختبار — لم يتم تعديل أي شيء',
      'conflicts', v_conflicts
    );
  END IF;

  FOR v_op IN
    SELECT * FROM attendance_test_operations
     WHERE test_run_id = p_test_run_id
     ORDER BY id DESC
  LOOP
    IF v_op.entity_table = 'subscription_periods' THEN
      UPDATE subscription_periods
         SET used_sessions = (v_op.before_state->>'used_sessions')::int,
             remaining_sessions = (v_op.before_state->>'remaining_sessions')::int,
             status = COALESCE(v_op.before_state->>'status', status),
             updated_at = (v_op.before_state->>'updated_at')::timestamptz
       WHERE id = v_op.entity_id;
      v_restored := v_restored + 1;
    ELSIF v_op.entity_table = 'student_subscriptions' THEN
      UPDATE student_subscriptions
         SET status = COALESCE(v_op.before_state->>'status', status),
             updated_at = (v_op.before_state->>'updated_at')::timestamptz
       WHERE id = v_op.entity_id;
      v_restored := v_restored + 1;
    END IF;
    UPDATE attendance_test_operations
       SET reversed_at = v_now
     WHERE id = v_op.id;
  END LOOP;

  DELETE FROM attendance_sessions WHERE test_run_id = p_test_run_id;
  DELETE FROM attendance_request_results WHERE test_run_id = p_test_run_id;
  DELETE FROM attendance_control_state WHERE test_run_id = p_test_run_id;

  v_rollback := jsonb_build_object(
    'restoredOperations', v_restored,
    'deletedAttendanceRows', (SELECT count(*) FROM attendance_test_operations WHERE test_run_id = p_test_run_id AND entity_table = 'attendance_sessions'),
    'rolledBackAt', v_now,
    'rolledBackBy', p_admin_uid
  );

  UPDATE attendance_test_runs
     SET status = 'rolled_back',
         rolled_back_at = v_now,
         rollback_reason = '',
         results = results || jsonb_build_object('rollback', v_rollback),
         updated_at = v_now
   WHERE id = p_test_run_id;
  PERFORM attendance_test_log(
    p_test_run_id, 'test_rolled_back', '', '',
    jsonb_build_object('restoredOperations', v_restored, 'rolledBackAt', v_now)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'status', 'rolled_back',
    'testRunId', p_test_run_id,
    'rolledBackAt', v_now,
    'rollback', v_rollback
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION attendance_find_open_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION attendance_find_open_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION attendance_session_state(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION attendance_session_state(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION open_attendance_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION open_attendance_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION close_attendance_session_by_ids(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_attendance_session_by_ids(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION record_support_attendance_batch(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_support_attendance_batch(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB, TEXT) TO service_role;

REVOKE ALL ON FUNCTION close_attendance_session(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_attendance_session(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION attendance_test_create(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION attendance_test_start(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION attendance_test_close(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION attendance_test_list(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION attendance_test_detail(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION attendance_test_rollback(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION attendance_test_create(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION attendance_test_start(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION attendance_test_close(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION attendance_test_list(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION attendance_test_detail(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION attendance_test_rollback(TEXT, TEXT) TO service_role;
