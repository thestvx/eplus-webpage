-- E-Plus Academy Supabase Schema
-- TEXT primary keys لأن البيانات المهاجرة من Firebase لها IDs نصية

-- 1. TEACHERS
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  firebase_uid TEXT,
  specialty TEXT DEFAULT '',
  levels TEXT DEFAULT '',
  days JSONB DEFAULT '[]',
  teacher_id TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. GROUPS
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  teacher_id TEXT DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  days JSONB DEFAULT '[]',
  max_students INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  group_id TEXT DEFAULT '',
  teacher_id TEXT DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  subscription_status TEXT DEFAULT 'non_member',
  pay_status TEXT DEFAULT 'unknown',
  receipt TEXT DEFAULT '',
  joined_at_session INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ATTENDANCE RECORDS
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT '',
  group_id TEXT NOT NULL DEFAULT '',
  teacher_id TEXT NOT NULL DEFAULT '',
  session_num INT NOT NULL CHECK (session_num BETWEEN 1 AND 12),
  present BOOLEAN NOT NULL DEFAULT FALSE,
  date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ATTENDANCE ARCHIVES
CREATE TABLE IF NOT EXISTS attendance_archives (
  id TEXT PRIMARY KEY,
  group_id TEXT DEFAULT '',
  teacher_id TEXT DEFAULT '',
  cycle_number INT DEFAULT 1,
  group_name TEXT DEFAULT '',
  teacher_name TEXT DEFAULT '',
  snapshot JSONB DEFAULT '{}',
  archived_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ATTENDANCE CYCLES
CREATE TABLE IF NOT EXISTS attendance_cycles (
  id TEXT PRIMARY KEY,
  teacher_id TEXT DEFAULT '',
  group_id TEXT DEFAULT '',
  cycle_number INT DEFAULT 1,
  status TEXT DEFAULT 'current',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. REGISTRATIONS (تسجيلات الدعم المدرسي)
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  birth_date TEXT DEFAULT '',
  parent_name TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  student_type TEXT DEFAULT '',
  level TEXT DEFAULT '',
  institution TEXT DEFAULT '',
  stream TEXT DEFAULT '',
  subjects JSONB DEFAULT '[]',
  terms_accepted BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'مسجل مبدئياً',
  fee_amount INTEGER DEFAULT 500,
  student_token TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ترحيل: إضافة student_token إذا لم يكن موجوداً (للقواعد الموجودة مسبقاً)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS student_token TEXT DEFAULT '';

-- ترحيل: إضافة deleted_at للحذف الناعم (يحفظ السجل التاريخي ويزيل من القائمة النشطة)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ملء التوكنات الفارغة بقيم عشوائية فريدة
UPDATE registrations
SET student_token = substr(md5(random()::text || clock_timestamp()::text || id), 1, 32)
WHERE student_token = '' OR student_token IS NULL;

-- ترحيل: barcode_value — باركود EAN-13 ثابت لكل طالب
-- الصيغة: '200' + رقم التسجيل (9 خانات) + خانة تحقق EAN-13
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS barcode_value TEXT DEFAULT '';

-- دالة حساب خانة التحقق EAN-13 (تستخدم للترحيل فقط)
CREATE OR REPLACE FUNCTION ean13_check_digit(d12 TEXT) RETURNS TEXT AS $$
DECLARE
  i INT; s INT := 0; n INT;
BEGIN
  IF d12 IS NULL OR length(d12) <> 12 THEN RETURN ''; END IF;
  FOR i IN 1..12 LOOP
    n := CAST(substr(d12, i, 1) AS INT);
    IF (i % 2) = 1 THEN s := s + n; ELSE s := s + n * 3; END IF;
  END LOOP;
  RETURN CAST(((10 - (s % 10)) % 10) AS TEXT);
END; $$ LANGUAGE plpgsql;

-- تعبئة الباركود الحتمي للطلاب الحاليين (لا يتغير أبداً بعد ذلك)
UPDATE registrations
SET barcode_value = '200'
  || lpad(left(regexp_replace(id, '[^0-9]', '', 'g'), 9), 9, '0')
  || ean13_check_digit('200' || lpad(left(regexp_replace(id, '[^0-9]', '', 'g'), 9), 9, '0'))
WHERE (barcode_value IS NULL OR barcode_value = '')
  AND left(regexp_replace(id, '[^0-9]', '', 'g'), 9) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_barcode ON registrations(barcode_value) WHERE barcode_value != '';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_group_session ON attendance_records(group_id, session_num);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher ON attendance_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_archives_group ON attendance_archives(group_id, cycle_number);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_token ON registrations(student_token) WHERE student_token != '';

-- RLS
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_registrations" ON registrations;
CREATE POLICY "anon_insert_registrations" ON registrations FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_select_registrations" ON registrations;
CREATE POLICY "anon_select_registrations" ON registrations FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_update_registrations" ON registrations;
CREATE POLICY "anon_update_registrations" ON registrations FOR UPDATE TO anon USING (true);

-- 7b. SUMMER CAMP REGISTRATIONS (تسجيلات المخيم الصيفي — النسخة الثانية)
-- جدول مستقل تماماً عن تسجيلات الدعم المدرسي (لا يؤثر عليه).
CREATE TABLE IF NOT EXISTS summer_camp_registrations (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  birth_date TEXT DEFAULT '',
  guardian_name TEXT DEFAULT '',
  guardian_phone TEXT DEFAULT '',
  education_level TEXT DEFAULT '',
  programs JSONB DEFAULT '[]',
  total_amount INTEGER DEFAULT 0,
  terms_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_summer_camp_created_at ON summer_camp_registrations(created_at);

-- RLS (نفس نمط registrations)
ALTER TABLE summer_camp_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_summer_camp_registrations" ON summer_camp_registrations;
CREATE POLICY "anon_insert_summer_camp_registrations" ON summer_camp_registrations FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_select_summer_camp_registrations" ON summer_camp_registrations;
CREATE POLICY "anon_select_summer_camp_registrations" ON summer_camp_registrations FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_update_summer_camp_registrations" ON summer_camp_registrations;
CREATE POLICY "anon_update_summer_camp_registrations" ON summer_camp_registrations FOR UPDATE TO anon USING (true);

-- 8. TEACHER BALANCES (توازن مستحقات الأساتذة — مستمد من دفتر المعاملات)
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

-- 9. TEACHER TRANSACTIONS (دفتر معاملات الأساتذة)
-- dues = مستحقات (student × subject × teacher × session_count × lesson_rate)
-- payment = دفعة مدفوعة مستقلة (لا خصم يدوي أبداً)
-- lesson_rate = snapshot سعر الحصة لحظة إنشاء المعاملة (لن يتغير مع تغيّر الأسعار لاحقاً)
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

-- 10. TEACHER RECEIPTS (إيصالات الدفع)
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

-- RLS للمالية (نفس نمط registrations)
ALTER TABLE teacher_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_teacher_balances" ON teacher_balances;
CREATE POLICY "anon_all_teacher_balances" ON teacher_balances FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE teacher_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_teacher_transactions" ON teacher_transactions;
CREATE POLICY "anon_all_teacher_transactions" ON teacher_transactions FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE teacher_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_teacher_receipts" ON teacher_receipts;
CREATE POLICY "anon_all_teacher_receipts" ON teacher_receipts FOR ALL TO anon USING (true) WITH CHECK (true);

-- 11. STUDENT SUBSCRIPTIONS (الاشتراك الشهري: 1/2/3 أشهر)
-- payment_id يضمن عدم تكرار الدفع (Idempotent).
-- ملاحظة: هذه الجداول جزء من supabase-migration.sql — شغّلها في Supabase SQL Editor إن لم تكن منشأة.
CREATE TABLE IF NOT EXISTS student_subscriptions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT '',
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_payment ON student_subscriptions(payment_id) WHERE payment_id != '';

-- 12. SUBSCRIPTION PERIODS (كل شهر = 8 حصص، عدّاد مستقل)
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

-- 13. ATOMIC COUNTER RPCs
CREATE OR REPLACE FUNCTION increment_period_usage(p_period_id TEXT, p_used INT DEFAULT 1)
RETURNS TABLE (used_sessions INT, remaining_sessions INT) AS $$
  UPDATE subscription_periods
     SET used_sessions = used_sessions + p_used,
         remaining_sessions = remaining_sessions - p_used,
         updated_at = now()
   WHERE id = p_period_id AND remaining_sessions >= p_used
  RETURNING used_sessions, remaining_sessions;
$$ LANGUAGE sql VOLATILE;

CREATE OR REPLACE FUNCTION set_period_usage(p_period_id TEXT, p_used INT)
RETURNS TABLE (used_sessions INT, remaining_sessions INT) AS $$
  UPDATE subscription_periods
     SET used_sessions = GREATEST(0, p_used),
         remaining_sessions = GREATEST(0, total_sessions - GREATEST(0, p_used)),
         updated_at = now()
   WHERE id = p_period_id
  RETURNING used_sessions, remaining_sessions;
$$ LANGUAGE sql VOLATILE;

-- 14. PERIOD STATUS RPC
CREATE OR REPLACE FUNCTION refresh_period_status(p_period_id TEXT, p_today TEXT)
RETURNS TEXT AS $$
DECLARE
  v_start TEXT; v_end TEXT; v_status TEXT;
BEGIN
  SELECT start_date, end_date INTO v_start, v_end
    FROM subscription_periods WHERE id = p_period_id;
  IF v_start IS NULL THEN RETURN 'unknown'; END IF;
  IF p_today < v_start THEN v_status := 'upcoming';
  ELSIF p_today > v_end THEN v_status := 'completed';
  ELSE v_status := 'active';
  END IF;
  UPDATE subscription_periods SET status = v_status, updated_at = now()
   WHERE id = p_period_id;
  RETURN v_status;
END; $$ LANGUAGE plpgsql VOLATILE;

-- RLS للاشتراكات (نفس نمط registrations)
ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_student_subscriptions" ON student_subscriptions;
CREATE POLICY "anon_all_student_subscriptions" ON student_subscriptions FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE subscription_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_subscription_periods" ON subscription_periods;
CREATE POLICY "anon_all_subscription_periods" ON subscription_periods FOR ALL TO anon USING (true) WITH CHECK (true);
