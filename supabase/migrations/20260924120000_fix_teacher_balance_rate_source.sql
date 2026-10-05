-- تصحيح مصدر سعر الحصة في رصيد الأستاذ
--
-- المشكلة:
--   admin_recompute_balance كان يقرأ السعر من
--   MAX(lesson_rate) داخل teacher_transactions. فإذا كانت صفوف
--   المستحقات تحمل أسعاراً مختلفة (أسعار قديمة + سعر جديد)،
--   كانت الواجهة تعرض أعلى سعر، بينما إجمالي المستحقات
--   (total_due = مجموع amounts) محسوب بأسعار مختلطة.
--   النتيجة: 「المستحقات 100.100 دج / 740 حصة / 175 دج للحصة」
--   وهو غير متسق، لأن 740 × 175 = 129.500 دج.
--
-- الإصلاح:
--   السعر المعتمد الذي تمرّره الواجهة (p_rate) هو مرجع العرض.
--   MAX(lesson_rate) يُستخدم فقط كبديل عند غياب p_rate.
--
-- ملاحظة مهمة:
--   هذا التصحيح يضمن أن السعر المعروض هو السعر المحسوب به.
--   أما تصحيح الصفوف القديمة التي تحمل أسعاراً مختلطة فيتم
--   من الواجهة عبر زر «احسب المستحقات»، لأن سعر الحصة
--   قرار إداري يخص كل أستاذ على حدة.

CREATE OR REPLACE FUNCTION admin_recompute_balance(
  p_admin_uid TEXT,
  p_teacher_id TEXT,
  p_teacher_name TEXT,
  p_session_override INT,
  p_student_override INT,
  p_rate INT,
  p_admin_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_due INT := 0; v_paid INT := 0; v_sessions INT := 0; v_students INT := 0; v_rate INT := 0;
  v_maxrow INT := 0;
  v JSONB;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_teacher_id IS NULL OR p_teacher_id = '' THEN RAISE EXCEPTION 'teacher_id required'; END IF;

  SELECT COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'dues'), 0),
         COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'payment'), 0),
         COALESCE(SUM(session_count) FILTER (WHERE transaction_type = 'dues'), 0)
    INTO v_due, v_paid, v_sessions
    FROM teacher_transactions WHERE teacher_id = p_teacher_id;

  SELECT COUNT(DISTINCT student_id) INTO v_students
    FROM teacher_transactions
   WHERE teacher_id = p_teacher_id AND transaction_type = 'dues' AND student_id <> '';

  -- السعر المعروض يجب أن يكون السعر الذي تُحسب به المستحقات فعلاً.
  SELECT COALESCE(MAX(lesson_rate), 0) INTO v_maxrow
    FROM teacher_transactions
   WHERE teacher_id = p_teacher_id AND transaction_type = 'dues' AND lesson_rate > 0;
  v_rate := GREATEST(COALESCE(p_rate, 0), 0);
  IF v_rate = 0 THEN v_rate := v_maxrow; END IF;

  INSERT INTO teacher_balances
    (teacher_id, teacher_name, total_due, total_paid, pending, student_count, session_count, rate)
  VALUES
    (p_teacher_id, COALESCE(p_teacher_name, ''), v_due, v_paid, v_due - v_paid,
     COALESCE(p_student_override, v_students), COALESCE(p_session_override, v_sessions), v_rate)
  ON CONFLICT (teacher_id) DO UPDATE SET
    teacher_name = EXCLUDED.teacher_name,
    total_due = EXCLUDED.total_due,
    total_paid = EXCLUDED.total_paid,
    pending = EXCLUDED.pending,
    student_count = EXCLUDED.student_count,
    session_count = EXCLUDED.session_count,
    rate = EXCLUDED.rate,
    updated_at = now()
  RETURNING to_jsonb(teacher_balances) INTO v;
  RETURN v;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;