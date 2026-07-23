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

-- ملء التوكنات الفارغة بقيم عشوائية فريدة
UPDATE registrations
SET student_token = substr(md5(random()::text || clock_timestamp()::text || id), 1, 32)
WHERE student_token = '' OR student_token IS NULL;

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
