-- ═══════════════════════════════════════════════════════════
--  إصلاح: إنشاء اشتراك لطلاب مسجلين نهائياً
--  كان يفشل بخطأ "student not enrolled" لأن بيانات التسجيل
--  القديمة لا تحوي subjectId/teacherId داخل subjects.
--  الآن المطابقة بالاسم (subject + teacher) مع تجاهل المسافات،
--  وبديل اسمي: الاجتماعيات = التاريخ ( دورة ).
--  يُشغَّل في Supabase → SQL Editor ثم Run.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _sn(p TEXT) RETURNS TEXT AS $$
  SELECT lower(regexp_replace(COALESCE(p, ''), '\s+', '', 'g'));
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION admin_create_subscription(
  p_admin_uid TEXT,
  p_student_id TEXT,
  p_start_date TEXT,
  p_months INT,
  p_total_price INT,
  p_payment_id TEXT,
  p_notes TEXT DEFAULT NULL,
  p_teacher_id TEXT DEFAULT NULL,
  p_subject_id TEXT DEFAULT NULL,
  p_teacher_name TEXT DEFAULT NULL,
  p_subject_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_sub_id TEXT;
  v_months INT;
  v_cur DATE;
  v_next TIMESTAMP;
  v_start TEXT;
  v_end TEXT;
  v_total INT;
  v_today TEXT := to_char(CURRENT_DATE, 'YYYY-MM-DD');
  v_teacher_id TEXT := COALESCE(NULLIF(p_teacher_id, ''), '');
  v_subject_id TEXT := COALESCE(NULLIF(p_subject_id, ''), '');
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_student_id IS NULL OR p_student_id = '' THEN RAISE EXCEPTION 'student_id required'; END IF;
  IF p_start_date IS NULL OR p_start_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'invalid start_date (YYYY-MM-DD)'; END IF;
  v_months := COALESCE(p_months, 1);
  IF v_months NOT IN (1, 2, 3) THEN RAISE EXCEPTION 'months must be 1, 2 or 3'; END IF;
  IF p_payment_id IS NULL OR p_payment_id = '' THEN RAISE EXCEPTION 'payment_id required (idempotency)'; END IF;
  IF EXISTS (SELECT 1 FROM student_subscriptions WHERE payment_id = p_payment_id) THEN
    RAISE EXCEPTION 'payment already exists: %', p_payment_id USING ERRCODE = '23505';
  END IF;
  IF v_subject_id = '' THEN RAISE EXCEPTION 'subject_id required (per-subject subscription)'; END IF;
  IF v_teacher_id = '' THEN RAISE EXCEPTION 'teacher_id required (per-subject subscription)'; END IF;
  v_total := COALESCE(p_total_price, v_months * 2000);
  IF v_total < 0 THEN RAISE EXCEPTION 'total_price must be >= 0'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM registrations r,
           jsonb_array_elements(CASE WHEN jsonb_typeof(r.subjects) = 'array' THEN r.subjects ELSE '[]'::jsonb END) el
     WHERE r.id = p_student_id
       AND r.deleted_at IS NULL
       AND r.status = 'مسجل نهائياً'
       AND (
             (el->>'subjectId' IS NOT NULL AND el->>'subjectId' <> '' AND el->>'subjectId' = v_subject_id)
          OR (COALESCE(p_subject_name, '') <> '' AND _sn(el->>'subject') = _sn(p_subject_name))
          OR (_sn(el->>'subject') IN ('الاجتماعيات','التاريخ(دورة)') AND _sn(p_subject_name) IN ('الاجتماعيات','التاريخ(دورة)'))
       )
       AND (
             (el->>'teacherId' IS NOT NULL AND el->>'teacherId' <> '' AND el->>'teacherId' = v_teacher_id)
          OR _sn(el->>'teacher') = _sn(p_teacher_name)
          OR (el->>'teacher' IS NULL OR el->>'teacher' = '')
       )
  ) THEN RAISE EXCEPTION 'student not enrolled for this subject/teacher'; END IF;

  v_sub_id := 'SUB-' || p_student_id || '-' || to_char(now(), 'YYYYMMDDHH24MISSMS');
  v_cur := p_start_date::date;
  v_next := v_cur + (v_months * interval '1 month');
  v_end := to_char(v_next - interval '1 day', 'YYYY-MM-DD');

  IF EXISTS (
    SELECT 1 FROM student_subscriptions s
     WHERE s.student_id = p_student_id
       AND s.status <> 'cancelled'
       AND s.subject_id = v_subject_id
       AND s.teacher_id = v_teacher_id
       AND p_start_date <= s.end_date
       AND v_end >= s.start_date
  ) THEN RAISE EXCEPTION 'overlapping active subscription for this student/subject/teacher'; END IF;

  INSERT INTO student_subscriptions
    (id, student_id, teacher_id, subject_id, teacher_name, subject_name,
     start_date, end_date, months, total_price, total_sessions, status, payment_id, notes)
  VALUES
    (v_sub_id, p_student_id, v_teacher_id, v_subject_id,
     COALESCE(p_teacher_name, ''), COALESCE(p_subject_name, ''),
     p_start_date, v_end, v_months, v_total, v_months * 8, 'active', p_payment_id, COALESCE(p_notes, ''));

  FOR i IN 1..v_months LOOP
    v_start := to_char(v_cur, 'YYYY-MM-DD');
    v_next := v_cur + interval '1 month';
    v_end := to_char(v_next - interval '1 day', 'YYYY-MM-DD');
    INSERT INTO subscription_periods
      (id, subscription_id, month_number, start_date, end_date, total_sessions, used_sessions, remaining_sessions, status)
    VALUES
      (v_sub_id || '-M' || i, v_sub_id, i, v_start, v_end, 8, 0, 8,
       CASE WHEN v_today < v_start THEN 'upcoming'
            WHEN v_today > v_end THEN 'completed'
            ELSE 'active' END);
    v_cur := v_next::date;
  END LOOP;

  RETURN (SELECT jsonb_build_object(
    'subscription', to_jsonb(s),
    'periods', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
                FROM subscription_periods p WHERE p.subscription_id = s.id)
  ) FROM student_subscriptions s WHERE s.id = v_sub_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
