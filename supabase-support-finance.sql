-- ═══════════════════════════════════════════════════════════════════════
--  موارد مالية الدعم المدرسي — School Support Financial Resources
--  شغّل هذا الملف كاملاً في Supabase SQL Editor (مرة واحدة).
--  ينشئ: جدول سجل المعاملات + جدول الخزينة + دالة الرصيد الذرّي
--         + تحديث admin_add_payment لخصم رواتب الأساتذة من الخزينة.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1) سجل معاملات الدعم المدرسي ──
CREATE TABLE IF NOT EXISTS support_finance_tx (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL DEFAULT 'subscription',
  direction TEXT NOT NULL DEFAULT 'in',
  amount INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  student_id TEXT DEFAULT '',
  student_name TEXT DEFAULT '',
  subject_name TEXT DEFAULT '',
  teacher_id TEXT DEFAULT '',
  teacher_name TEXT DEFAULT '',
  reference_id TEXT DEFAULT '',
  admin_name TEXT DEFAULT '',
  date TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_finance_tx_type ON support_finance_tx(source_type);
CREATE INDEX IF NOT EXISTS idx_support_finance_tx_date ON support_finance_tx(date);
CREATE INDEX IF NOT EXISTS idx_support_finance_tx_direction ON support_finance_tx(direction);

-- ── 2) جدول الخزينة (رصيد إجمالي واحد) ──
CREATE TABLE IF NOT EXISTS support_finance_balance (
  id TEXT PRIMARY KEY,
  total_balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO support_finance_balance (id, total_balance) VALUES ('global', 0)
  ON CONFLICT (id) DO NOTHING;

-- ── 3) دالة ذرّية لإضافة/خصم من الخزينة ──
CREATE OR REPLACE FUNCTION add_support_balance(p_delta INT)
RETURNS INT AS $$
DECLARE
  v_bal INT;
BEGIN
  INSERT INTO support_finance_balance (id, total_balance) VALUES ('global', GREATEST(0, COALESCE(p_delta,0)))
  ON CONFLICT (id) DO UPDATE
    SET total_balance = GREATEST(0, support_finance_balance.total_balance + COALESCE(p_delta, 0)),
        updated_at = now()
  RETURNING total_balance INTO v_bal;
  RETURN v_bal;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION add_support_balance(INT) TO anon, service_role;

-- ── 4) RLS للجدولين (وصول anon للوحة الإدارة) ──
ALTER TABLE support_finance_tx ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_support_finance_tx" ON support_finance_tx;
CREATE POLICY "anon_all_support_finance_tx" ON support_finance_tx FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE support_finance_balance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_support_finance_balance" ON support_finance_balance;
CREATE POLICY "anon_all_support_finance_balance" ON support_finance_balance FOR ALL TO anon USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════
--  تحديث admin_add_payment : خصم راتب الأستاذ من الخزينة + تسجيل معاملة
-- ═══════════════════════════════════════════════════════════════════════
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

  -- خصم راتب الأستاذ من موارد الدعم المدرسي (الخزينة) + تسجيل معاملة راتب
  INSERT INTO support_finance_tx
    (id, source_type, direction, amount, description, teacher_id, teacher_name,
     reference_id, admin_name, date)
  VALUES
    (v_tx, 'salary', 'out', v_amt,
     COALESCE(p_note, 'دفعة مالية') || ' — راتب ' || COALESCE(p_teacher_name, 'أستاذ'),
     p_teacher_id, COALESCE(p_teacher_name, ''), v_tx,
     COALESCE(p_admin_name, ''), v_date);

  INSERT INTO support_finance_balance (id, total_balance, updated_at)
  VALUES ('global', -v_amt, now())
  ON CONFLICT (id) DO UPDATE
    SET total_balance = GREATEST(0, support_finance_balance.total_balance - v_amt),
        updated_at = now();

  PERFORM admin_recompute_balance(p_admin_uid, p_teacher_id, p_teacher_name, NULL, NULL, p_rate, p_admin_name);

  RETURN jsonb_build_object('tx_id', v_tx, 'receipt_id', v_rcpt, 'amount', v_amt, 'date', v_date);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION admin_add_payment(TEXT, TEXT, TEXT, INT, TEXT, TEXT, INT) TO service_role;
