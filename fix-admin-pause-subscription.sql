-- ────────────────────────────────────────────────────────────────
-- E-PLUS: الإيقاف المؤقت للاشتراكات (pause/resume)
-- شغّل هذا الملف كاملاً في: Supabase → SQL Editor → Run
-- ────────────────────────────────────────────────────────────────

-- 1) منع تسجيل الحضور للاشتراكات الموقوفة مؤقتاً
CREATE OR REPLACE FUNCTION record_attendance(
  p_student_id TEXT,
  p_teacher_id TEXT,
  p_teacher_name TEXT,
  p_subject_id TEXT,
  p_subject_name TEXT,
  p_barcode_value TEXT,
  p_subscription_id TEXT,
  p_subscription_period_id TEXT,
  p_month_number INT,
  p_date TEXT,
  p_check_in_time TEXT,
  p_mirror_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_id TEXT;
  v_used INT;
  v_rem INT;
BEGIN
  IF p_student_id IS NULL OR p_student_id = '' THEN RAISE EXCEPTION 'student_id required'; END IF;
  IF p_mirror_id IS NULL OR p_mirror_id = '' THEN RAISE EXCEPTION 'mirror_id required'; END IF;
  IF p_date IS NULL OR p_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'invalid date (YYYY-MM-DD)'; END IF;
  IF p_check_in_time IS NULL OR p_check_in_time = '' THEN
    p_check_in_time := to_char(now() AT TIME ZONE 'Africa/Algiers', 'HH24:MI:SS');
  END IF;

  -- 1) الطالب موجود ومسجل نهائياً وغير محذوف
  IF NOT EXISTS (
    SELECT 1 FROM registrations r
     WHERE r.id = p_student_id
       AND r.deleted_at IS NULL
       AND r.status = 'مسجل نهائياً'
  ) THEN RAISE EXCEPTION 'student not registered (final)'; END IF;

  -- 2) الاشتراك نشط وغير ملغى وغير موقوف مؤقتاً، ويخص نفس المادة + نفس الأستاذ
  IF p_subscription_id IS NULL OR p_subscription_id = '' THEN RAISE EXCEPTION 'subscription_id required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM student_subscriptions s
     WHERE s.id = p_subscription_id
       AND s.student_id = p_student_id
       AND s.status NOT IN ('cancelled', 'paused')
       AND (s.subject_id = '' OR s.subject_id = COALESCE(p_subject_id, ''))
       AND (s.teacher_id = '' OR s.teacher_id = COALESCE(p_teacher_id, ''))
  ) THEN RAISE EXCEPTION 'subscription not active for this subject/teacher'; END IF;

  -- 3) الشهر الحالي (period) يخص هذا الاشتراك ويتضمن التاريخ المطلوب
  IF p_subscription_period_id IS NULL OR p_subscription_period_id = '' THEN RAISE EXCEPTION 'subscription_period_id required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM subscription_periods p
     WHERE p.id = p_subscription_period_id
       AND p.subscription_id = p_subscription_id
       AND p.month_number = COALESCE(p_month_number, p.month_number)
       AND p.start_date <= p_date
       AND p.end_date >= p_date
       AND p.remaining_sessions >= 1
       AND p.used_sessions < p.total_sessions
  ) THEN RAISE EXCEPTION 'period not active or no sessions remaining'; END IF;

  -- 4) الطالب مسجل لدى هذا الأستاذ في هذه المادة (تطابق غير صارم على الحقول الفارغة)
  IF NOT EXISTS (
    SELECT 1 FROM registrations r,
           jsonb_array_elements(CASE WHEN jsonb_typeof(r.subjects) = 'array' THEN r.subjects ELSE '[]'::jsonb END) el
     WHERE r.id = p_student_id
       AND (el->>'teacherId' IS NULL OR el->>'teacherId' = '' OR el->>'teacherId' = p_teacher_id)
       AND (el->>'subjectId'  IS NULL OR el->>'subjectId'  = '' OR el->>'subjectId'  = p_subject_id)
  ) THEN RAISE EXCEPTION 'student not enrolled for this teacher/subject'; END IF;

  -- 5) منع التكرار (يحمي أيضاً فهرس unique_partial عند التزامن)
  IF EXISTS (
    SELECT 1 FROM attendance_sessions a
     WHERE a.student_id = p_student_id
       AND a.teacher_id = p_teacher_id
       AND a.subject_id = p_subject_id
       AND a.date = p_date
       AND a.status = 'recorded'
  ) THEN RAISE EXCEPTION 'duplicate attendance' USING ERRCODE = '23505'; END IF;

  -- 6) الإدراج + الخصم (معاملة واحدة — أي خطأ يرجع الكل)
  v_id := p_mirror_id;
  INSERT INTO attendance_sessions
    (id, student_id, teacher_id, teacher_name, subject_id, subject_name,
     date, check_in_time, barcode_value, subscription_id, subscription_period_id,
     month_number, mirror_id, status)
  VALUES
    (v_id, p_student_id, COALESCE(p_teacher_id, ''), COALESCE(p_teacher_name, ''),
     COALESCE(p_subject_id, ''), COALESCE(p_subject_name, ''),
     p_date, p_check_in_time, COALESCE(p_barcode_value, ''),
     p_subscription_id, p_subscription_period_id,
     COALESCE(p_month_number, 0), v_id, 'recorded');

  UPDATE subscription_periods
     SET used_sessions = used_sessions + 1,
         remaining_sessions = remaining_sessions - 1,
         updated_at = now()
   WHERE id = p_subscription_period_id
     AND remaining_sessions >= 1
   RETURNING used_sessions, remaining_sessions INTO v_used, v_rem;

  IF v_rem IS NULL THEN RAISE EXCEPTION 'no remaining sessions'; END IF;

  RETURN jsonb_build_object(
    'attendance_id', v_id,
    'mirror_id', v_id,
    'used_sessions', v_used,
    'remaining_sessions', v_rem
  );
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2) دالة الإيقاف/الاستئناف المؤقت (خدمة الأدمين فقط)
CREATE OR REPLACE FUNCTION admin_pause_subscription(
  p_admin_uid TEXT,
  p_subscription_id TEXT,
  p_paused BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_subscription_id IS NULL OR p_subscription_id = '' THEN RAISE EXCEPTION 'subscription_id required'; END IF;
  IF EXISTS (SELECT 1 FROM student_subscriptions s
              WHERE s.id = p_subscription_id AND s.status = 'cancelled') THEN
    RAISE EXCEPTION 'cannot change a cancelled subscription';
  END IF;
  v_status := CASE WHEN p_paused THEN 'paused' ELSE 'active' END;
  UPDATE student_subscriptions SET status = v_status
   WHERE id = p_subscription_id;
  RETURN (SELECT jsonb_build_object('subscription', to_jsonb(s))
            FROM student_subscriptions s WHERE s.id = p_subscription_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3) الصلاحيات (خدمة edge فقط — لا anon)
REVOKE ALL ON FUNCTION record_attendance(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_attendance(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION admin_pause_subscription(TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_pause_subscription(TEXT, TEXT, BOOLEAN) TO service_role;
