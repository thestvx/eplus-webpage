ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS session_id TEXT DEFAULT '';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS remaining_after INTEGER;

CREATE INDEX IF NOT EXISTS idx_att_sessions_session ON attendance_sessions(session_id) WHERE session_id <> '';

CREATE OR REPLACE FUNCTION attendance_norm_teacher(p_name TEXT)
RETURNS TEXT AS $$
  SELECT regexp_replace(
    replace(
      replace(
        replace(
          replace(trim(COALESCE(p_name, '')), 'خادم الله نور الهدى', 'خادم الله نور'),
          'عبد الرحمان',
          'عبدالرحمان'
        ),
        'عبد ال',
        'عبدال'
      ),
      'الانجليزية',
      'الإنجليزية'
    ),
    '[[:space:]]+',
    ' ',
    'g'
  );
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION attendance_norm_subject(p_name TEXT)
RETURNS TEXT AS $$
  SELECT regexp_replace(
    replace(replace(trim(COALESCE(p_name, '')), 'اللغة الانجليزية', 'اللغة الإنجليزية'), 'الانجليزية', 'الإنجليزية'),
    '[[:space:]]+',
    ' ',
    'g'
  );
$$ LANGUAGE sql IMMUTABLE;

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
  v_session_id TEXT := '';
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

      SELECT id INTO v_session_id
        FROM attendance_control_state
       WHERE date = p_date
         AND is_open = true
         AND (
           (v_teacher_id <> '' AND teacher_id = v_teacher_id)
           OR attendance_norm_teacher(teacher_name) = attendance_norm_teacher(v_teacher_name)
         )
         AND (
           v_subject_name = ''
           OR attendance_norm_subject(subject_name) = attendance_norm_subject(v_subject_name)
         )
       ORDER BY updated_at DESC
       LIMIT 1;
      IF NOT FOUND THEN
        v_session_id := '';
      END IF;

      FOR v_abs IN
        SELECT id, subscription_period_id, refunded
          FROM attendance_sessions
         WHERE student_id = p_student_id
           AND date = p_date
           AND status = 'recorded'
           AND record_type = 'absent'
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
          UPDATE subscription_periods
             SET used_sessions = GREATEST(0, used_sessions - 1),
                 remaining_sessions = LEAST(total_sessions, remaining_sessions + 1),
                 updated_at = v_now
           WHERE id = v_abs.subscription_period_id;
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
        confirmed, server_time, request_id, session_id, remaining_after,
        created_at, updated_at
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
        v_now, v_now
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
        RETURNING remaining_sessions INTO v_rem;

        IF v_rem IS NULL THEN
          RAISE EXCEPTION 'انتهى الاشتراك لهذه المادة';
        END IF;
        v_deducted := v_deducted + 1;
      END IF;

      UPDATE attendance_sessions
         SET remaining_after = v_rem
       WHERE id = v_id;

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
  WHERE student_id = p_student_id AND status IN ('recorded', 'absent');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION close_attendance_session(
  p_admin_uid TEXT,
  p_session_id TEXT,
  p_actor TEXT DEFAULT '',
  p_closed_at TEXT DEFAULT ''
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
  v_no_deduction INT := 0;
  v_skipped_registration INT := 0;
  v_late_registration INT := 0;
BEGIN
  IF p_session_id IS NULL OR trim(p_session_id) = '' THEN
    RAISE EXCEPTION 'sessionId required';
  END IF;
  IF NOT COALESCE(admin_is_uid_admin(p_admin_uid), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_request_id := 'close:' || p_session_id;
  PERFORM pg_advisory_xact_lock(hashtext(v_request_id), 0);

  SELECT result INTO v_existing_result
    FROM attendance_request_results
   WHERE request_id = v_request_id;

  IF FOUND THEN
    RETURN v_existing_result || jsonb_build_object('idempotentReplay', true);
  END IF;

  SELECT * INTO v_control
    FROM attendance_control_state
   WHERE id = p_session_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'جلسة الحضور غير موجودة' USING ERRCODE = 'P0002';
  END IF;

  IF v_control.is_open IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'ok', true,
      'action', 'noop',
      'sessionId', p_session_id,
      'reason', 'session-already-closed',
      'closedAt', COALESCE(NULLIF(v_control.closed_at, ''), '')
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
     )
     AND NOT EXISTS (
       SELECT 1 FROM registrations r, jsonb_array_elements(COALESCE(r.subjects, '[]'::jsonb)) sub
        WHERE r.id = s.student_id
          AND r.deleted_at IS NULL
          AND r.status = 'مسجل نهائياً'
          AND r.created_at <= v_opened_at
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
       ORDER BY CASE WHEN p.start_date <= v_control.date AND p.end_date >= v_control.date THEN 0 ELSE 1 END,
                p.start_date DESC,
                p.month_number DESC
       LIMIT 1
       FOR UPDATE;

      IF FOUND THEN
        v_period_id := v_period.id;
        v_period_month := v_period.month_number;
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
          v_reason := 'absent-deducted';
        END IF;
      ELSIF EXISTS (
        SELECT 1 FROM subscription_periods p
         WHERE p.subscription_id = v_sub.id
           AND p.status = 'active'
           AND p.start_date <= v_control.date
           AND p.end_date >= v_control.date
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

    INSERT INTO attendance_sessions (
      id, student_id, teacher_id, teacher_name, subject_id, subject_name,
      date, check_in_time, subscription_id, subscription_period_id, month_number,
      mirror_id, status, record_type, allow_cycle, student_name, student_type,
      level, stream, institution, source, confirmed, server_time, request_id,
      session_id, remaining_after, state_reason, refunded, created_at, updated_at
    )
    VALUES (
      v_absent_id, v_student.id, COALESCE(v_control.teacher_id, ''), COALESCE(v_control.teacher_name, ''), '', COALESCE(v_control.subject_name, ''),
      v_control.date, v_closed_time, v_sub.id, v_period_id, v_period_month,
      v_absent_id, 'recorded', 'absent', false,
      trim(COALESCE(v_student.first_name, '') || ' ' || COALESCE(v_student.last_name, '')),
      COALESCE(v_student.student_type, ''), COALESCE(v_student.level, ''),
      COALESCE(v_student.stream, ''), COALESCE(v_student.institution, ''),
      'eplus-attendance-absent', true, v_closed_time, v_request_id,
      p_session_id, v_remaining, v_reason, false, v_now, v_now
    )
    ON CONFLICT (id) DO NOTHING;

    v_absent := v_absent + 1;

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
      'checkInTime', v_closed_time
    );
  END LOOP;

  UPDATE attendance_control_state
     SET is_open = false,
         closed_at = v_closed_time,
         updated_at = v_now
   WHERE id = p_session_id;

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
      'deducted', v_deducted,
      'noDeduction', v_no_deduction,
      'skippedRegistration', v_skipped_registration,
      'registrationDuringSession', v_late_registration
    ),
    'serverTime', to_char(v_now AT TIME ZONE 'Africa/Algiers', 'YYYY-MM-DD HH24:MI:SS')
  );

  INSERT INTO attendance_request_results (request_id, student_id, payload, result, saved_count, deducted_count)
  VALUES (
    v_request_id,
    '',
    jsonb_build_object(
      'sessionId', p_session_id,
      'date', v_control.date,
      'teacherId', COALESCE(v_control.teacher_id, ''),
      'teacherName', COALESCE(v_control.teacher_name, ''),
      'subjectName', COALESCE(v_control.subject_name, ''),
      'actor', COALESCE(p_actor, '')
    ),
    v_result,
    v_absent,
    v_deducted
  )
  ON CONFLICT (request_id) DO NOTHING;

  RETURN v_result || jsonb_build_object('idempotentReplay', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION close_attendance_session(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_attendance_session(TEXT, TEXT, TEXT, TEXT) TO service_role;
