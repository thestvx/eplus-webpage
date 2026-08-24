-- ═══════════════════════════════════════════════════════════════════
--  E-PLUS — Migration آمنة (نظام اشتراكات الطلاب + الحضور + المالية)
--  ═══════════════════════════════════════════════════════════════════
--  طريقة التشغيل: Supabase Dashboard → SQL Editor → Run (مرة واحدة).
--
--  مبادئ هذه النسخة (بعد الموافقة على إعادة التصميم):
--  • لا توجد أي أسرار في المتصفح: لا Admin Token ولا Service Role Key
--    في أي ملف واجهة أمامية. كل العمليات الحسّاسة تتم عبر Edge Functions
--    (supabase/functions/record-attendance, supabase/functions/admin-api)
--    بمفتاح Service Role في بيئة الخادم فقط.
--  • البوابة الإدارية: جدول admin_users بمعرّف Firebase UID —
--    الـ Edge Function يتحقق من Firebase ID Token ثم من الجدول.
--  • قاعدة بيانات الحضور: جدول attendance_sessions (مصدر موثوق) +
--    تسجيل ذرّي record_attendance (تحقق كامل + إدراج + خصم حصة في
--    معاملة واحدة: ينجحان معاً أو يفشلان معاً) + undo_attendance
--    للتعويض عند فشل المرآة في Firestore (إلغاء ناعم، لا حذف).
--  • RLS: لا توجد أي سياسة anon على أي جدول إطلاقاً.
--    anon يستطيع فقط استدعاء قراءتين مقصورتين بكل طالب:
--    get_student_subscription / get_student_attendance_events.
--    بقية الدوال محجوزة لـ service_role (تديرها Edge Functions فقط).
--  • لا DROP ولا TRUNCATE لأي جدول؛ لا حذف بيانات؛ لا تعديل registrations؛
--    نظام Barcode (EAN-13) يبقى كما هو.
--
--  خطوة ما بعد التشغيل (مرة واحدة):
--     INSERT INTO admin_users (uid, role, display_name)
--     VALUES ('<firebase-uid-المدير>', 'superadmin', 'المدير');
--   (ممكن إضافة المزيد لاحقاً من Edge Function admin-api → add-admin)
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. جداول المالية (Teacher Finance)
--    RLS مفعّل بدون أي سياسة anon ⇒ لا وصول مباشر من الواجهات.
--    الوصول فقط عبر admin-api (Edge Function) → دوال admin_*.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teacher_balances (
  teacher_id TEXT PRIMARY KEY,
  teacher_name TEXT NOT NULL DEFAULT '',
  total_due INTEGER DEFAULT 0,
  total_paid INTEGER DEFAULT 0,
  pending INTEGER DEFAULT 0,
  student_count INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  rate INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_transactions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL DEFAULT '',
  teacher_name TEXT DEFAULT '',
  student_id TEXT DEFAULT '',
  student_name TEXT DEFAULT '',
  subject_id TEXT DEFAULT '',
  subject_name TEXT DEFAULT '',
  session_count INTEGER DEFAULT 0,
  lesson_rate INTEGER DEFAULT 0,
  amount INTEGER DEFAULT 0,
  transaction_type TEXT DEFAULT 'dues',
  status TEXT DEFAULT 'pending',
  date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  admin_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_tx_teacher ON teacher_transactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_tx_date ON teacher_transactions(date);
CREATE INDEX IF NOT EXISTS idx_teacher_tx_student ON teacher_transactions(student_id);

CREATE TABLE IF NOT EXISTS teacher_receipts (
  id TEXT PRIMARY KEY,
  transaction_id TEXT DEFAULT '',
  teacher_id TEXT DEFAULT '',
  teacher_name TEXT DEFAULT '',
  amount INTEGER DEFAULT 0,
  date TEXT DEFAULT '',
  admin_name TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_receipts_teacher ON teacher_receipts(teacher_id);

-- ────────────────────────────────────────────────────────────────
-- 2. اشتراكات الطلاب (student_subscriptions)
--    لا قراءة anon مباشرة — فقط عبر get_student_subscription (RPC).
--    الإنشاء/الإدارة فقط عبر admin_create_subscription (service_role).
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_subscriptions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT '',
  -- كل اشتراك يخص مادة + أستاذ واحد بالضبط (فصل الحصص والمالية بين المواد)
  teacher_id TEXT DEFAULT '',
  subject_id TEXT DEFAULT '',
  teacher_name TEXT DEFAULT '',
  subject_name TEXT DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  months INTEGER NOT NULL DEFAULT 1,
  total_price INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'active',
  payment_id TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_student ON student_subscriptions(student_id);
-- ترقية آمنة للقواعد الموجودة (لا حذف لأي صف): إضافة أعمدة المادة/الأستاذ
-- ⚠️ الترتيب حاسم: أضف الأعمدة أولاً ثم أنشئ الفهرس الذي يعتمد عليها
--    (خلاف ذلك يفشل الترقية بخطأ "column subject_id does not exist"
--     عند وجود الجدول من نسخة قديمة بلا هذه الأعمدة).
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS teacher_name TEXT;
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS subject_name TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_subject_teacher ON student_subscriptions(student_id, subject_id, teacher_id);
-- منع تكرار الدفع: نفس payment_id لمرة واحدة فقط (خط دفاع إضافي)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_payment ON student_subscriptions(payment_id) WHERE payment_id != '';

-- ────────────────────────────────────────────────────────────────
-- 3. أشهر الاشتراك (subscription_periods)
--    كل شهر = 8 حصص بعدّاد مستقل. لا تعديل من anon أبداً.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_periods (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL DEFAULT '',
  month_number INTEGER NOT NULL DEFAULT 1,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  total_sessions INTEGER NOT NULL DEFAULT 8,
  used_sessions INTEGER NOT NULL DEFAULT 0,
  remaining_sessions INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'upcoming',
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_periods_subscription ON subscription_periods(subscription_id);

-- ────────────────────────────────────────────────────────────────
-- 4. جدول الحضور الموثوق (attendance_sessions)
--    المصدر الأساسي لكل حضور (يُمرَّر إلى Firestore كمرآة للعرض).
--    status: recorded | cancelled (إلغاء ناعم — لا حذف أبداً)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT '',
  teacher_id TEXT DEFAULT '',
  teacher_name TEXT DEFAULT '',
  subject_id TEXT DEFAULT '',
  subject_name TEXT DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  check_in_time TEXT DEFAULT '',
  barcode_value TEXT DEFAULT '',
  subscription_id TEXT DEFAULT '',
  subscription_period_id TEXT DEFAULT '',
  month_number INTEGER DEFAULT 0,
  mirror_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'recorded',
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_att_sessions_student ON attendance_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_period ON attendance_sessions(subscription_period_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_teacher ON attendance_sessions(teacher_id);
-- منع التكرار على مستوى قاعدة البيانات: نفس الطالب + الأستاذ + المادة + اليوم
-- يُسمح بإعادة التسجيل فقط بعد إلغاء ناعم (status='cancelled' يخرج من الفهرس).
CREATE UNIQUE INDEX IF NOT EXISTS idx_att_sessions_dup
  ON attendance_sessions(student_id, teacher_id, subject_id, date)
  WHERE status = 'recorded';

-- ────────────────────────────────────────────────────────────────
-- 5. جدول الإداريين (admin_users)
--    البوابة الإدارية = Firebase UID (لا توكنات مشتقة من المتصفح).
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  uid TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'admin',
  display_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 6. تحقق الإدارة (is_admin) + إدارة القائمة
--    يُستدعى داخل كل RPC حساس (SECURITY DEFINER). لا يُستدعى من anon.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin(p_uid TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
     WHERE uid = p_uid
       AND role IN ('admin', 'superadmin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- فحص صريح تستخدمه Edge Function (service_role فقط)
CREATE OR REPLACE FUNCTION admin_is_uid_admin(p_uid TEXT)
RETURNS BOOLEAN AS $$
  SELECT is_admin(p_uid);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- إضافة إداري. الدفعة الأولى (جدول فارغ) تُفتح تلقائياً للإقلاع؛
-- بعدها لا يمكن الإضافة إلا بإداري موجود (تعريفاً: عبر admin-api).
CREATE OR REPLACE FUNCTION admin_add_admin(p_admin_uid TEXT, p_new_uid TEXT, p_role TEXT DEFAULT 'admin')
RETURNS TEXT AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) AND EXISTS (SELECT 1 FROM admin_users) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_new_uid IS NULL OR p_new_uid = '' THEN RAISE EXCEPTION 'uid required'; END IF;
  IF COALESCE(p_role, 'admin') NOT IN ('admin', 'superadmin') THEN RAISE EXCEPTION 'invalid role'; END IF;
  INSERT INTO admin_users (uid, role, display_name)
  VALUES (p_new_uid, COALESCE(p_role, 'admin'), '')
  ON CONFLICT (uid) DO UPDATE SET role = EXCLUDED.role;
  RETURN 'ok';
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- إزالة إداري (لا يمكن إزالة نفسك)
CREATE OR REPLACE FUNCTION admin_remove_admin(p_admin_uid TEXT, p_target_uid TEXT)
RETURNS TEXT AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_target_uid IS NULL OR p_target_uid = '' THEN RAISE EXCEPTION 'uid required'; END IF;
  IF p_admin_uid = p_target_uid THEN RAISE EXCEPTION 'cannot remove yourself'; END IF;
  DELETE FROM admin_users WHERE uid = p_target_uid;
  RETURN 'ok';
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- قائمة الإداريين (بدون أي أسرار)
CREATE OR REPLACE FUNCTION admin_list_admins(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'uid', uid, 'role', role, 'display_name', display_name, 'created_at', created_at
  ) ORDER BY created_at), '[]'::jsonb) FROM admin_users);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ────────────────────────────────────────────────────────────────
-- 7. قراءات مقصورة بكل طالب (الوحيدة المفتوحة لـ anon)
--    لا كشف لأي بيانات غير الطالب المطلوب.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_student_subscription(p_student_id TEXT)
RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'subscription', to_jsonb(s),
    'periods', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
                FROM subscription_periods p WHERE p.subscription_id = s.id)
  ) ORDER BY s.created_at DESC), '[]'::jsonb)
  FROM student_subscriptions s
  WHERE s.student_id = p_student_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

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
    'createdAt', created_at
  ) ORDER BY date DESC, created_at DESC), '[]'::jsonb)
  FROM attendance_sessions
  WHERE student_id = p_student_id AND status = 'recorded';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ────────────────────────────────────────────────────────────────
-- 8. تسجيل الحضور الذرّي (service_role — عبر Edge Function)
--    record_attendance: تحقق كامل + إدراج + خصم حصة في معاملة واحدة.
--    أي فشل (طالب غير نهائي، لا اشتراك فعّال، لا حصص متبقية، مادة
--    غير مسجلة، تكرار) يلغي كل شيء — لا حضور ناقص ولا حصة مخصومة.
-- ────────────────────────────────────────────────────────────────
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

  -- 2) الاشتراك نشط وغير ملغى، ويخص نفس المادة + نفس الأستاذ المسجلين
  --    (عزل تام: حضور الرياضيات لا يُخصم من اشتراك الفيزياء ولا العكس)
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

-- ────────────────────────────────────────────────────────────────
-- 9. إلغاء حضور (تعويض عند فشل المرآة) — service_role
--    إلغاء ناعم: status='cancelled' + إعادة الحصة إلى الشهر.
--    لا حذف لأي سجل.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION undo_attendance(p_attendance_id TEXT, p_subscription_period_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_id TEXT;
  v_pid TEXT;
  v_used INT;
  v_rem INT;
BEGIN
  IF p_attendance_id IS NULL OR p_attendance_id = '' THEN RAISE EXCEPTION 'attendance_id required'; END IF;

  UPDATE attendance_sessions
     SET status = 'cancelled', cancelled_at = now()
   WHERE id = p_attendance_id AND status = 'recorded'
  RETURNING id, subscription_period_id INTO v_id, v_pid;

  IF v_id IS NULL THEN RAISE EXCEPTION 'attendance not found or already cancelled'; END IF;

  v_pid := COALESCE(NULLIF(p_subscription_period_id, ''), v_pid);
  IF v_pid IS NULL OR v_pid = '' THEN RAISE EXCEPTION 'subscription_period_id required'; END IF;

  UPDATE subscription_periods
     SET used_sessions = used_sessions - 1,
         remaining_sessions = remaining_sessions + 1,
         updated_at = now()
   WHERE id = v_pid AND used_sessions > 0
  RETURNING used_sessions, remaining_sessions INTO v_used, v_rem;

  RETURN jsonb_build_object(
    'attendance_id', v_id,
    'used_sessions', v_used,
    'remaining_sessions', v_rem
  );
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ────────────────────────────────────────────────────────────────
-- 10. إنشاء اشتراك (إدارة فقط) — ذرّي: اشتراك + كل الأشهر
--     payment_id يجعل الدفع Idempotent (يرفض التكرار بـ 23505).
-- ────────────────────────────────────────────────────────────────
-- تطبيع اسم (إزالة مسافات + خفض حالة) لمطابقة أسماء المواد والأساتذة
-- بحساسية تجاه اختلاف المسافات فقط (البيانات التاريخية قد تحوي مسافات زائدة).
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
  -- الاشتراك يجب أن يخص مادة + أستاذ (لا اشتراكات عامة جديدة)
  IF v_subject_id = '' THEN RAISE EXCEPTION 'subject_id required (per-subject subscription)'; END IF;
  IF v_teacher_id = '' THEN RAISE EXCEPTION 'teacher_id required (per-subject subscription)'; END IF;
  v_total := COALESCE(p_total_price, v_months * 2000);
  IF v_total < 0 THEN RAISE EXCEPTION 'total_price must be >= 0'; END IF;

  -- الطالب مسجل فعلاً لدى هذا الأستاذ في هذه المادة (مصدر واحد للتسجيل).
  -- المطابقة بالاسم أولاً: بيانات التسجيل القديمة قد لا تحوي subjectId/teacherId
  -- (فقط subject + teacher)، لذا المطابقة الصارمة بالـ IDs تُفشل طلاباً مسجلين فعلاً.
  -- الـ IDs تُستخدم كتطابق إضافي إن وُجدت، مع بديل اسمي: الاجتماعيات = التاريخ ( دورة ).
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

  -- منع التداخل: لا يتداخل اشتراك مع اشتراك آخر نشط لنفس الطالب
  -- في نفس المادة + نفس الأستاذ. (الطلبة قد يملكون اشتراكات مختلفة
  -- في مواد مختلفة بشكل متوازٍ — وهذا مسموح.)
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

-- إيقاف/استئناف اشتراك مؤقتاً: الحالة تصير 'paused' (لا يُسجَّل حضور)
-- حتى يُستأنف → 'active'. لا يمكن تغيير اشتراك ملغى.
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

-- قائمة الاشتراكات (للوحة الإدارة)
CREATE OR REPLACE FUNCTION admin_list_subscriptions(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC), '[]'::jsonb)
            FROM (SELECT * FROM student_subscriptions ORDER BY created_at DESC LIMIT 200) s);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- قائمة الاشتراكات الغنية: كل اشتراك + أشهره (للوحة الإدارة)
CREATE OR REPLACE FUNCTION admin_list_subscriptions_rich(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'subscription', to_jsonb(s),
    'periods', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb)
                FROM subscription_periods p WHERE p.subscription_id = s.id)
  ) ORDER BY s.created_at DESC), '[]'::jsonb)
            FROM (SELECT * FROM student_subscriptions ORDER BY created_at DESC LIMIT 200) s);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- تفاصيل اشتراك واحد + أشهره + بيانات الطالب (لنافذة التفاصيل)
CREATE OR REPLACE FUNCTION admin_get_subscription_detail(p_admin_uid TEXT, p_subscription_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_sub JSONB;
  v_periods JSONB;
  v_student JSONB;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT to_jsonb(s) INTO v_sub FROM student_subscriptions s WHERE s.id = p_subscription_id;
  IF v_sub IS NULL THEN RAISE EXCEPTION 'subscription not found'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.month_number), '[]'::jsonb) INTO v_periods
    FROM subscription_periods p WHERE p.subscription_id = p_subscription_id;
  SELECT to_jsonb(r) INTO v_student FROM registrations r WHERE r.id = v_sub->>'student_id';
  RETURN jsonb_build_object('subscription', v_sub, 'periods', v_periods, 'student', v_student);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- قائمة التسجيلات النهائية (لمحرر الاشتراكات والمستحقات)
CREATE OR REPLACE FUNCTION admin_list_registrations(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC), '[]'::jsonb)
            FROM registrations r
           WHERE r.deleted_at IS NULL AND r.status = 'مسجل نهائياً');
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ────────────────────────────────────────────────────────────────
-- 11. RPCs المالية (إدارة فقط) — تحل محل REST المباشر
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_upsert_transactions(p_admin_uid TEXT, p_rows JSONB)
RETURNS INT AS $$
DECLARE
  r JSONB;
  n INT := 0;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN RAISE EXCEPTION 'p_rows must be a JSON array'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    IF r->>'id' IS NULL OR r->>'id' = '' THEN RAISE EXCEPTION 'id required in row'; END IF;
    IF r->>'teacher_id' IS NULL OR r->>'teacher_id' = '' THEN RAISE EXCEPTION 'teacher_id required in row'; END IF;
    IF COALESCE(r->>'transaction_type', '') NOT IN ('dues', 'payment') THEN RAISE EXCEPTION 'invalid transaction_type'; END IF;
    IF COALESCE((r->>'amount')::int, 0) < 0 THEN RAISE EXCEPTION 'amount must be >= 0'; END IF;
    IF COALESCE((r->>'session_count')::int, 0) < 0 THEN RAISE EXCEPTION 'session_count must be >= 0'; END IF;
    IF COALESCE((r->>'lesson_rate')::int, 0) < 0 THEN RAISE EXCEPTION 'lesson_rate must be >= 0'; END IF;

    INSERT INTO teacher_transactions
      (id, teacher_id, teacher_name, student_id, student_name, subject_id, subject_name,
       session_count, lesson_rate, amount, transaction_type, status, date, notes, admin_name)
    VALUES
      (r->>'id', r->>'teacher_id', COALESCE(r->>'teacher_name', ''), COALESCE(r->>'student_id', ''),
       COALESCE(r->>'student_name', ''), COALESCE(r->>'subject_id', ''), COALESCE(r->>'subject_name', ''),
       COALESCE((r->>'session_count')::int, 0), COALESCE((r->>'lesson_rate')::int, 0),
       COALESCE((r->>'amount')::int, 0), r->>'transaction_type', COALESCE(r->>'status', 'pending'),
       COALESCE(r->>'date', ''), COALESCE(r->>'notes', ''), COALESCE(r->>'admin_name', ''))
    ON CONFLICT (id) DO UPDATE SET
      teacher_id = EXCLUDED.teacher_id,
      teacher_name = EXCLUDED.teacher_name,
      student_id = EXCLUDED.student_id,
      student_name = EXCLUDED.student_name,
      subject_id = EXCLUDED.subject_id,
      subject_name = EXCLUDED.subject_name,
      session_count = EXCLUDED.session_count,
      lesson_rate = EXCLUDED.lesson_rate,
      amount = EXCLUDED.amount,
      transaction_type = EXCLUDED.transaction_type,
      status = EXCLUDED.status,
      date = EXCLUDED.date,
      notes = EXCLUDED.notes,
      admin_name = EXCLUDED.admin_name;
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_upsert_balance(p_admin_uid TEXT, p_row JSONB)
RETURNS JSONB AS $$
DECLARE
  r JSONB;
  v JSONB;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  r := p_row;
  IF r IS NULL OR r->>'teacher_id' IS NULL OR r->>'teacher_id' = '' THEN RAISE EXCEPTION 'teacher_id required'; END IF;
  INSERT INTO teacher_balances
    (teacher_id, teacher_name, total_due, total_paid, pending, student_count, session_count, rate)
  VALUES
    (r->>'teacher_id', COALESCE(r->>'teacher_name', ''),
     GREATEST(COALESCE((r->>'total_due')::int, 0), 0),
     GREATEST(COALESCE((r->>'total_paid')::int, 0), 0),
     GREATEST(COALESCE((r->>'pending')::int, 0), 0),
     GREATEST(COALESCE((r->>'student_count')::int, 0), 0),
     GREATEST(COALESCE((r->>'session_count')::int, 0), 0),
     GREATEST(COALESCE((r->>'rate')::int, 0), 0))
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

  SELECT COALESCE(MAX(lesson_rate), 0) INTO v_rate
    FROM teacher_transactions
   WHERE teacher_id = p_teacher_id AND transaction_type = 'dues' AND lesson_rate > 0;
  IF v_rate = 0 THEN v_rate := GREATEST(COALESCE(p_rate, 0), 0); END IF;

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

CREATE OR REPLACE FUNCTION admin_add_payment(
  p_admin_uid TEXT,
  p_teacher_id TEXT,
  p_teacher_name TEXT,
  p_amount INT,
  p_note TEXT,
  p_admin_name TEXT,
  p_rate INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_tx TEXT;
  v_rcpt TEXT;
  v_date TEXT;
  v_amt INT;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_teacher_id IS NULL OR p_teacher_id = '' THEN RAISE EXCEPTION 'teacher_id required'; END IF;
  v_amt := GREATEST(0, COALESCE(p_amount, 0));
  v_date := to_char(CURRENT_DATE, 'YYYY-MM-DD');
  v_tx := 'pay_' || md5(random()::text || now()::text);
  v_rcpt := 'RCP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((1000 + floor(random() * 9000))::int::text, 4, '0');

  INSERT INTO teacher_transactions
    (id, teacher_id, teacher_name, student_id, student_name, subject_id, subject_name,
     session_count, lesson_rate, amount, transaction_type, status, date, notes, admin_name)
  VALUES
    (v_tx, p_teacher_id, COALESCE(p_teacher_name, ''), '', '', '', '',
     0, 0, v_amt, 'payment', 'paid', v_date, COALESCE(p_note, 'دفعة مالية'), COALESCE(p_admin_name, ''));

  INSERT INTO teacher_receipts
    (id, transaction_id, teacher_id, teacher_name, amount, date, admin_name, notes)
  VALUES
    (v_rcpt, v_tx, p_teacher_id, COALESCE(p_teacher_name, ''), v_amt, v_date,
     COALESCE(p_admin_name, ''), COALESCE(p_note, ''));

  PERFORM admin_recompute_balance(p_admin_uid, p_teacher_id, p_teacher_name, NULL, NULL, p_rate, p_admin_name);

  RETURN jsonb_build_object('tx_id', v_tx, 'receipt_id', v_rcpt, 'amount', v_amt, 'date', v_date);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_delete_transaction(
  p_admin_uid TEXT,
  p_tx_id TEXT,
  p_teacher_id TEXT,
  p_teacher_name TEXT,
  p_rate INT,
  p_admin_name TEXT
)
RETURNS TEXT AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_tx_id IS NULL OR p_tx_id = '' THEN RAISE EXCEPTION 'tx id required'; END IF;
  DELETE FROM teacher_transactions WHERE id = p_tx_id;
  PERFORM admin_recompute_balance(p_admin_uid, p_teacher_id, p_teacher_name, NULL, NULL, p_rate, p_admin_name);
  RETURN p_tx_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_set_teacher_rate(p_admin_uid TEXT, p_teacher_id TEXT, p_rate INT)
RETURNS JSONB AS $$
DECLARE
  v JSONB;
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_teacher_id IS NULL OR p_teacher_id = '' THEN RAISE EXCEPTION 'teacher_id required'; END IF;
  INSERT INTO teacher_balances (teacher_id, rate)
  VALUES (p_teacher_id, GREATEST(0, COALESCE(p_rate, 0)))
  ON CONFLICT (teacher_id) DO UPDATE SET rate = EXCLUDED.rate, updated_at = now()
  RETURNING to_jsonb(teacher_balances) INTO v;
  RETURN v;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_get_teacher_balance(p_admin_uid TEXT, p_teacher_id TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT to_jsonb(t) FROM teacher_balances t WHERE t.teacher_id = p_teacher_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_list_balances(p_admin_uid TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) FROM teacher_balances b);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_get_teacher_ledger(p_admin_uid TEXT, p_teacher_id TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.date DESC), '[]'::jsonb)
            FROM teacher_transactions t WHERE t.teacher_id = p_teacher_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION admin_get_teacher_receipts(p_admin_uid TEXT, p_teacher_id TEXT)
RETURNS JSONB AS $$
BEGIN
  IF NOT is_admin(p_admin_uid) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.date DESC), '[]'::jsonb)
            FROM teacher_receipts r WHERE r.teacher_id = p_teacher_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ────────────────────────────────────────────────────────────────
-- 12. RLS — صفر سياسات anon + رفض صريح
--     نُسقط سياسات النسخ القديمة (إن وُجدت) ونفعّل RLS على كل جدول.
--     لا سياسة قراءة/كتابة لأي دور عام.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE teacher_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_teacher_balances" ON teacher_balances;
DROP POLICY IF EXISTS "anon_all_teacher_transactions" ON teacher_transactions;
DROP POLICY IF EXISTS "anon_all_teacher_receipts" ON teacher_receipts;
DROP POLICY IF EXISTS "anon_all_student_subscriptions" ON student_subscriptions;
DROP POLICY IF EXISTS "anon_read_student_subscriptions" ON student_subscriptions;
DROP POLICY IF EXISTS "anon_all_subscription_periods" ON subscription_periods;
DROP POLICY IF EXISTS "anon_read_subscription_periods" ON subscription_periods;
DROP POLICY IF EXISTS "anon_all_attendance_sessions" ON attendance_sessions;
DROP POLICY IF EXISTS "anon_all_admin_users" ON admin_users;

REVOKE ALL ON TABLE teacher_balances, teacher_transactions, teacher_receipts,
             student_subscriptions, subscription_periods,
             attendance_sessions, admin_users
  FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 13. صلاحيات الدوال (صريحة)
--     anon: قراءتا الطالب فقط.
--     service_role: كل الدوال الحسّاسة (تستدعيها Edge Functions).
-- ────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION is_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_is_uid_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_add_admin(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_remove_admin(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_list_admins(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_attendance(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION undo_attendance(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_create_subscription(TEXT, TEXT, TEXT, INT, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_pause_subscription(TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_list_subscriptions(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_list_subscriptions_rich(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_subscription_detail(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_list_registrations(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_upsert_transactions(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_upsert_balance(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_recompute_balance(TEXT, TEXT, TEXT, INT, INT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_add_payment(TEXT, TEXT, TEXT, INT, TEXT, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_delete_transaction(TEXT, TEXT, TEXT, TEXT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_set_teacher_rate(TEXT, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_teacher_balance(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_list_balances(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_teacher_ledger(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_teacher_receipts(TEXT, TEXT) FROM PUBLIC;

-- القراءتان المقصورتان بكل طالب (الكيوسك وبوابة الطالب)
GRANT EXECUTE ON FUNCTION get_student_subscription(TEXT) TO anon, service_role;
GRANT EXECUTE ON FUNCTION get_student_attendance_events(TEXT) TO anon, service_role;

-- قراءة اشتراكات الأستاذ النشطة (للPortal)
DROP FUNCTION IF EXISTS get_teacher_active_subs(TEXT);
CREATE OR REPLACE FUNCTION get_teacher_active_subs(p_teacher_id TEXT)
RETURNS TABLE(student_id TEXT, student_name TEXT, first_name TEXT, last_name TEXT, level TEXT, stream TEXT, subject_name TEXT, subject_id TEXT, teacher_name TEXT) AS $$
  SELECT s.student_id,
         COALESCE(r.first_name||' '||r.last_name, s.student_id) AS student_name,
         r.first_name, r.last_name, r.level, r.stream,
         s.subject_name, s.subject_id, s.teacher_name
  FROM student_subscriptions s
  LEFT JOIN registrations r ON r.id::TEXT = s.student_id
  WHERE s.teacher_id = p_teacher_id AND s.status = 'active';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- قائمة الطلاب المسجلين نهائياً عند الأستاذ (من جدول التسجيلات مباشرة)
CREATE OR REPLACE FUNCTION get_teacher_registered_students(p_teacher_id TEXT, p_teacher_name TEXT)
RETURNS TABLE(student_id TEXT, first_name TEXT, last_name TEXT, level TEXT, stream TEXT, created_at TIMESTAMPTZ, matched_subjects TEXT) AS $$
  SELECT r.id::TEXT, r.first_name, r.last_name, r.level, r.stream, r."createdAt",
         string_agg(DISTINCT COALESCE(el->>'subject', el->>'subjectName', el->>'name', ''), ', ')
  FROM registrations r,
       jsonb_array_elements(
         CASE WHEN jsonb_typeof(r.subjects) = 'array' THEN r.subjects ELSE '[]'::jsonb END
       ) el
  WHERE r.status = 'مسجل نهائياً'
    AND r.deleted_at IS NULL
    AND (
      el->>'teacherId' = p_teacher_id
      OR el->>'teacher_id' = p_teacher_id
      OR LOWER(COALESCE(el->>'teacher', el->>'teacherName', el->>'teacher_name', '')) = LOWER(p_teacher_name)
    )
  GROUP BY r.id, r.first_name, r.last_name, r.level, r.stream, r."createdAt";
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION get_teacher_active_subs(TEXT) TO anon, service_role;
GRANT EXECUTE ON FUNCTION get_teacher_registered_students(TEXT, TEXT) TO anon, service_role;

-- الدوال الحسّاسة: service_role فقط (تستدعيها Edge Functions بمفتاح الخادم)
GRANT EXECUTE ON FUNCTION admin_is_uid_admin(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_add_admin(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_remove_admin(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_list_admins(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION record_attendance(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION undo_attendance(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_create_subscription(TEXT, TEXT, TEXT, INT, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_pause_subscription(TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION admin_list_subscriptions(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_list_subscriptions_rich(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_subscription_detail(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_list_registrations(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_upsert_transactions(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION admin_upsert_balance(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION admin_recompute_balance(TEXT, TEXT, TEXT, INT, INT, INT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_add_payment(TEXT, TEXT, TEXT, INT, TEXT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_delete_transaction(TEXT, TEXT, TEXT, TEXT, INT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_set_teacher_rate(TEXT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_teacher_balance(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_list_balances(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_teacher_ledger(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_teacher_receipts(TEXT, TEXT) TO service_role;

-- ────────────────────────────────────────────────────────────────
-- 14. خطوات ما بعد التشغيل (تذكير)
--     1) INSERT INTO admin_users (uid, role, display_name)
--        VALUES ('<firebase-uid-المدير>', 'superadmin', 'المدير');
--     2) انشر Edge Functions عبر Supabase CLI:
--        supabase functions deploy record-attendance --no-verify-jwt
--        supabase functions deploy admin-api --no-verify-jwt
--        (ضع SUPABASE_SERVICE_ROLE_KEY تلقائياً؛ أضف FIREBASE_WEB_API_KEY
--         كـ secret إن لم تكن القيمة الافتراضية في الكود كافية)
--     3) حدّث الواجهات (تم ضمن هذا التحديث): admin.html / attendance.html /
--        student.html / js/subscriptionService.js / js/teacherFinance.js
--     4) أزل مفتاح service_role القديم من admin.html (تم) ثم أدر مفاتيحك:
--        Dashboard → Settings → API → Service Role → regenerate.
--     5) أداة «ترحيل إلى Supabase» في admin.html تبقى تستقبل Service Role
--        عند التشغيل (لصق مؤقت فقط) لتوافق الترحيل التاريخي — تُزال لاحقاً.
-- ═══════════════════════════════════════════════════════════════════
