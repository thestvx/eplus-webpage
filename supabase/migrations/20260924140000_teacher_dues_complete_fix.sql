-- ═══════════════════════════════════════════════════════════════
-- إصلاح نهائي、根: حساب مستحقات الأستاذ = حصص الحضور × سعر الحصة
-- ═══════════════════════════════════════════════════════════════
--
-- العرض التوضيحي (أستاذ نمسي عبدالرحمان):
--   جدول الاشتراكات الشهرية : 117 تلميذاً / 740 حصة
--   تقرير المستحقات        :  87 تلميذاً / 572 حصة / 100.100 دج
--   25 تلميذاً غابوا كلياً (166 حصة) + ياسين رمولي ناقص (2 حصة)
--   166 + 2 = 168 = 740 - 572  ✓
--
-- السبب الجذري: مصدر البيانات كان مقصوصاً في قاعدة البيانات
--   admin_list_subscriptions_rich  →  LIMIT 500  (آخر 500 اشتراك فقط)
--   admin_list_subscriptions       →  LIMIT 200
-- طالما هذا الحد موجود، أي تعديل في JavaScript لن يصحّح الأرقام.
--
-- هذا الملف يطبّق إصلاحاً كاملاً من ثلاث جهات:
--   1) دالة جديدة تجلب اشتراكات الأستاذ الواحد فقط — بدون أي LIMIT.
--      هذا المصدر الجديد يُستخدم في حساب المستحقات، فلا يمكن أن يُقصّ.
--   2) إزالة حدّي 500 و 200 من دوال القوائم (حتى تظهر كل البيانات).
--   3) تصحيح سعر الحصة في الرصيد (p_rate بدل MAX(lesson_rate)).
--
-- بعد التطبيق: افتح صفحة الأستاذ واضغط «احسب المستحقات».
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1) المصدر الجديد: حصص اشتراكات أستاذ واحد (بلا حدود) ⭐
--    يعيد نفس الشكل الذي تستهلكه واجهة المستحقات:
--    [{ subscription: {...}, periods: [ { used_sessions: n }, ... ] }]
-- ───────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS admin_teacher_due_sessions(TEXT, TEXT);
CREATE OR REPLACE FUNCTION admin_teacher_due_sessions(
  p_teacher_id   TEXT,
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
  WHERE (
      (p_teacher_id IS NOT NULL AND p_teacher_id <> '' AND s.teacher_id = p_teacher_id)
   OR (p_teacher_name IS NOT NULL AND p_teacher_name <> ''
       AND lower(regexp_replace(COALESCE(s.teacher_name, ''), '\s+', '', 'g'))
         = lower(regexp_replace(p_teacher_name, '\s+', '', 'g')))
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_teacher_due_sessions(TEXT, TEXT) TO anon, service_role;

-- ───────────────────────────────────────────────────────────────
-- 2) إزالة القصّ الصامت من دوال القوائم
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_list_subscriptions(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC), '[]'::jsonb)
            FROM student_subscriptions s);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ⚠️ لا تضع LIMIT هنا. مصدر قديم لمستحقات الأستاذ، وقد أزاله
--    admin_teacher_due_sessions أعلاه.
CREATE OR REPLACE FUNCTION admin_list_subscriptions_rich(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'subscription', to_jsonb(s),
    'periods', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
                FROM subscription_periods p WHERE p.subscription_id = s.id)
) ORDER BY COALESCE(s.updated_at, s.created_at) DESC), '[]'::jsonb)
            FROM student_subscriptions s);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ───────────────────────────────────────────────────────────────
-- 3) تصحيح سعر الحصة في الرصيد
--    كان bal.rate = MAX(lesson_rate) ⇒ يعرض أعلى سعر قديم ولا يطابق
--    المجموع أبداً. الآن السعر المُدخَل (p_rate) هو المرجع.
-- ───────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────
-- 4) فحص سريع بعد التطبيق: يجب أن يطابق عدد الصفوف عدد التلاميذ
-- ───────────────────────────────────────────────────────────────
-- SELECT jsonb_array_length(admin_teacher_due_sessions('<teacher_id>', ''));