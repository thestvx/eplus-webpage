ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS record_type TEXT DEFAULT 'present';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS allow_cycle BOOLEAN DEFAULT false;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS student_name TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS student_type TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS level TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS stream TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS institution TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'eplus-attendance';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT true;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS server_time TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS request_id TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_att_sessions_request ON attendance_sessions(request_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_allow_cycle ON attendance_sessions(student_id, subscription_id) WHERE allow_cycle = true AND status = 'recorded';

CREATE TABLE IF NOT EXISTS attendance_control_state (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  teacher_name TEXT DEFAULT '',
  subject_name TEXT DEFAULT '',
  teacher_id TEXT DEFAULT '',
  is_open BOOLEAN DEFAULT false,
  opened_at TEXT DEFAULT '',
  closed_at TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_control_state_date ON attendance_control_state(date);

ALTER TABLE attendance_control_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_attendance_control_state" ON attendance_control_state;
CREATE POLICY "anon_all_attendance_control_state" ON attendance_control_state FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS attendance_request_results (
  request_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  result JSONB NOT NULL,
  saved_count INTEGER NOT NULL DEFAULT 0,
  deducted_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE attendance_request_results ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION record_support_attendance_batch(
  p_request_id TEXT,
  p_student_id TEXT,
  p_payload JSONB,
  p_date TEXT,
  p_check_in_time TEXT,
  p_items JSONB
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

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_idx := v_idx + 1;
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

      IF EXISTS (
        SELECT 1 FROM attendance_sessions
         WHERE student_id = p_student_id
           AND teacher_id = v_teacher_id
           AND subject_id = v_subject_id
           AND date = p_date
           AND status = 'recorded'
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
        ) THEN
          RAISE EXCEPTION 'دورة الاشتراك غير صالحة للسماح الاستثنائي';
        END IF;
        IF EXISTS (
          SELECT 1 FROM attendance_sessions
           WHERE student_id = p_student_id
             AND subscription_id = v_sub_id
             AND allow_cycle = true
             AND status = 'recorded'
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
        confirmed, server_time, request_id, created_at, updated_at
      )
      VALUES (
        v_mirror_id, p_student_id, v_teacher_id, v_teacher_name, v_subject_id, v_subject_name,
        p_date, p_check_in_time, trim(COALESCE(p_payload->>'barcodeValue', '')),
        v_sub_id, v_period_id, v_month, v_mirror_id, 'recorded', v_record_type, v_allow_cycle,
        trim(COALESCE(p_payload->>'studentName', '')), trim(COALESCE(p_payload->>'studentType', '')),
        trim(COALESCE(p_payload->>'level', '')), trim(COALESCE(p_payload->>'stream', '')),
        trim(COALESCE(p_payload->>'institution', '')), v_source,
        true, v_server_time, p_request_id, v_now, v_now
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id INTO v_id;

      IF v_id IS NULL THEN
        RAISE EXCEPTION 'تم تسجيل الحضور لهذه المادة اليوم' USING ERRCODE = '23505';
      END IF;
      v_saved := v_saved + 1;

      IF v_mode = 'normal' AND NOT v_permanent THEN
        UPDATE subscription_periods
           SET used_sessions = used_sessions + 1,
               remaining_sessions = remaining_sessions - 1,
               updated_at = v_now
         WHERE id = v_period_id
           AND remaining_sessions >= 1
        RETURNING used_sessions, remaining_sessions INTO v_used, v_rem;

        IF v_rem IS NULL THEN
          RAISE EXCEPTION 'انتهى الاشتراك لهذه المادة';
        END IF;
        v_deducted := v_deducted + 1;
      END IF;

      v_results := v_results || jsonb_build_object(
        'index', v_idx - 1,
        'teacherName', v_teacher_name,
        'subjectName', v_subject_name,
        'ok', true,
        'action', v_action,
        'attendanceId', v_id,
        'periodId', v_period_id,
        'subscriptionId', v_sub_id,
        'remaining', CASE WHEN v_mode = 'normal' AND NOT v_permanent THEN v_rem ELSE NULL END,
        'permanent', v_permanent
      );
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT, v_sqlstate = RETURNED_SQLSTATE;
      v_results := v_results || jsonb_build_object(
        'index', v_idx - 1,
        'teacherName', v_teacher_name,
        'subjectName', v_subject_name,
        'ok', false,
        'reason', COALESCE(NULLIF(v_error, ''), 'تعذر تسجيل الحضور'),
        'code', v_sqlstate
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
    'serverTime', v_server_time
  );

  INSERT INTO attendance_request_results (request_id, student_id, payload, result, saved_count, deducted_count)
  VALUES (p_request_id, p_student_id, p_payload, v_result, v_saved, v_deducted)
  ON CONFLICT (request_id) DO NOTHING;

  RETURN v_result || jsonb_build_object('idempotent_replay', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION record_support_attendance_batch(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_support_attendance_batch(TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION get_attendance_control_state(p_date TEXT)
RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'date', date,
    'teacherName', teacher_name,
    'subjectName', subject_name,
    'teacherId', teacher_id,
    'isOpen', is_open,
    'openedAt', opened_at,
    'closedAt', closed_at,
    'updatedAt', updated_at
  )), '[]'::jsonb)
  FROM attendance_control_state
  WHERE date = p_date;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION get_attendance_control_state(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_attendance_control_state(TEXT) TO service_role;

ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT false;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS state_reason TEXT DEFAULT '';

CREATE OR REPLACE FUNCTION undo_attendance(
  p_attendance_id TEXT,
  p_subscription_period_id TEXT DEFAULT '',
  p_refund BOOLEAN DEFAULT true,
  p_reason TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_row attendance_sessions%ROWTYPE;
  v_period_id TEXT;
  v_refunded BOOLEAN := false;
BEGIN
  IF p_attendance_id IS NULL OR trim(p_attendance_id) = '' THEN
    RAISE EXCEPTION 'attendance_id required';
  END IF;

  SELECT * INTO v_row FROM attendance_sessions WHERE id = p_attendance_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'action', 'missing', 'attendanceId', p_attendance_id);
  END IF;

  IF v_row.status IN ('cancelled', 'deleted') THEN
    RETURN jsonb_build_object('ok', true, 'action', 'noop', 'attendanceId', v_row.id, 'refunded', false);
  END IF;

  IF v_row.status <> 'recorded' THEN
    RETURN jsonb_build_object('ok', true, 'action', 'ignored', 'attendanceId', v_row.id, 'status', v_row.status, 'refunded', false);
  END IF;

  UPDATE attendance_sessions
     SET status = 'cancelled',
         cancelled_at = now(),
         refunded = false,
         state_reason = COALESCE(p_reason, ''),
         updated_at = now()
   WHERE id = v_row.id;

  v_period_id := COALESCE(NULLIF(trim(COALESCE(p_subscription_period_id, '')), ''), NULLIF(trim(COALESCE(v_row.subscription_period_id, '')), ''), '');

  IF p_refund AND v_row.record_type NOT IN ('allow_sub', 'allow') AND v_period_id <> '' THEN
    UPDATE subscription_periods
       SET used_sessions = GREATEST(0, used_sessions - 1),
           remaining_sessions = LEAST(total_sessions, remaining_sessions + 1),
           updated_at = now()
     WHERE id = v_period_id;
    UPDATE attendance_sessions SET refunded = true WHERE id = v_row.id;
    v_refunded := true;
  END IF;

  RETURN jsonb_build_object('ok', true, 'action', 'cancelled', 'attendanceId', v_row.id, 'periodId', v_period_id, 'refunded', v_refunded);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION undo_attendance(TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION undo_attendance(TEXT, TEXT, BOOLEAN, TEXT) TO anon, service_role;
DROP FUNCTION IF EXISTS undo_attendance(TEXT, TEXT);

CREATE OR REPLACE FUNCTION restore_attendance(
  p_attendance_id TEXT,
  p_subscription_period_id TEXT DEFAULT '',
  p_refund BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_row attendance_sessions%ROWTYPE;
  v_period_id TEXT;
  v_restored BOOLEAN := false;
BEGIN
  IF p_attendance_id IS NULL OR trim(p_attendance_id) = '' THEN
    RAISE EXCEPTION 'attendance_id required';
  END IF;

  SELECT * INTO v_row FROM attendance_sessions WHERE id = p_attendance_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'action', 'missing', 'attendanceId', p_attendance_id);
  END IF;

  IF v_row.status = 'recorded' THEN
    RETURN jsonb_build_object('ok', true, 'action', 'noop', 'attendanceId', v_row.id, 'restored', false);
  END IF;

  IF v_row.status NOT IN ('cancelled', 'deleted') THEN
    RETURN jsonb_build_object('ok', true, 'action', 'ignored', 'attendanceId', v_row.id, 'status', v_row.status, 'restored', false);
  END IF;

  UPDATE attendance_sessions
     SET status = 'recorded',
         cancelled_at = NULL,
         state_reason = '',
         updated_at = now()
   WHERE id = v_row.id;

  v_period_id := COALESCE(NULLIF(trim(COALESCE(p_subscription_period_id, '')), ''), NULLIF(trim(COALESCE(v_row.subscription_period_id, '')), ''), '');

  IF p_refund AND v_row.refunded = true AND v_row.record_type NOT IN ('allow_sub', 'allow') AND v_period_id <> '' THEN
    UPDATE subscription_periods
       SET used_sessions = used_sessions + 1,
           remaining_sessions = GREATEST(0, remaining_sessions - 1),
           updated_at = now()
     WHERE id = v_period_id;
    UPDATE attendance_sessions SET refunded = false WHERE id = v_row.id;
    v_restored := true;
  END IF;

  RETURN jsonb_build_object('ok', true, 'action', 'restored', 'attendanceId', v_row.id, 'periodId', v_period_id, 'restored', v_restored);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION restore_attendance(TEXT, TEXT, BOOLEAN) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION restore_attendance(TEXT, TEXT, BOOLEAN) TO anon, service_role;
