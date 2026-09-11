-- ═══════════════════════════════════════════════════════════
-- تسجيلات برامج المركز (دروس VIP ، IELTS ، الدورات الأونلاين ، الدورات التكوينية)
-- type: vip | ielts | online | takwini
-- subjects: JSONB [{subject, teacher}] (لـ VIP الدعم الدراسي)
-- extra: JSONB بنية مرنة لكل نموذج (vip_type, edu_level, lang_type, lang_level,
--        course, course_level, course_mode, motivation ... إلخ)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS program_registrations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  birth_date TEXT DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT DEFAULT '',
  parent_name TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  subjects JSONB DEFAULT '[]',
  extra JSONB DEFAULT '{}',
  fee_amount INTEGER DEFAULT 500,
  status TEXT DEFAULT 'مسجل مبدئياً',
  terms_accepted BOOLEAN DEFAULT FALSE,
  student_token TEXT DEFAULT '',
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_reg_type ON program_registrations(type);
CREATE INDEX IF NOT EXISTS idx_program_reg_status ON program_registrations(status);
CREATE INDEX IF NOT EXISTS idx_program_reg_created_at ON program_registrations(created_at);

ALTER TABLE program_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_program_reg" ON program_registrations;
CREATE POLICY "anon_insert_program_reg" ON program_registrations FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_program_reg" ON program_registrations;
CREATE POLICY "anon_select_program_reg" ON program_registrations FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_update_program_reg" ON program_registrations;
CREATE POLICY "anon_update_program_reg" ON program_registrations FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "anon_delete_program_reg" ON program_registrations;
CREATE POLICY "anon_delete_program_reg" ON program_registrations FOR DELETE TO anon USING (true);