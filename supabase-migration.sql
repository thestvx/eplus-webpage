-- ═══════════════════════════════════════════════════════════════════
--  E-PLUS — Migration (idempotent)
--  ═══════════════════════════════════════════════════════════════════
--  Run this ONCE in: Supabase Dashboard → SQL Editor → Run
--
--  Fixes + adds:
--    1) teacher_balances / teacher_transactions / teacher_receipts
--       (tables were declared in supabase-schema.sql but never created
--        in this project — this caused the HTTP 404 on /rest/v1/...)
--    2) student_subscriptions  (الاشتراك الشهري: 1/2/3 أشهر)
--    3) subscription_periods  (كل شهر = 8 حصص، أرقام مستقلة)
--    4) Atomic RPCs for usage counters (used_sessions / remaining_sessions)
--    5) RLS policies matching the existing project posture (anon, like registrations)
--
--  Safe to re-run (all statements are IF NOT EXISTS / OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. TEACHER FINANCE TABLES (were missing → 404)
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
-- 2. STUDENT SUBSCRIPTIONS
--    كل اشتراك = كيان مستقل (Subscription A ثم Subscription B)
--    payment_id يضمن عدم تكرار الدفع (Idempotent).
-- ────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────
-- 3. SUBSCRIPTION PERIODS (شهر مستقل: تواريخه + عدّاد حصصه)
--    used_sessions / remaining_sessions يُحدّثان عبر RPC ذرّي
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
-- 4. ATOMIC COUNTER RPCs
--    increment_period_usage  → يمنع تجاوز حصص الشهر (remaining > 0)
--    set_period_usage        → إعادة ضبط/مصادقة العداد من سجلات الحضور
-- ────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────
-- 5. PERIOD STATUS RPC (upcoming / active / completed)
-- ────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────
-- 6. RLS (same posture as the existing `registrations` table)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_student_subscriptions" ON student_subscriptions;
CREATE POLICY "anon_all_student_subscriptions" ON student_subscriptions
  FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE subscription_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_subscription_periods" ON subscription_periods;
CREATE POLICY "anon_all_subscription_periods" ON subscription_periods
  FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE teacher_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_teacher_balances" ON teacher_balances;
CREATE POLICY "anon_all_teacher_balances" ON teacher_balances
  FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE teacher_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_teacher_transactions" ON teacher_transactions;
CREATE POLICY "anon_all_teacher_transactions" ON teacher_transactions
  FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE teacher_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_teacher_receipts" ON teacher_receipts;
CREATE POLICY "anon_all_teacher_receipts" ON teacher_receipts
  FOR ALL TO anon USING (true) WITH CHECK (true);
