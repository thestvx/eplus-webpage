-- 7e. LANGUAGE COURSE CARDS (بطاقات اشتراكات دورات اللغات)
-- A card is printed on an A4 sheet (4 per page) with ONLY a barcode and a
-- 5-digit ID. Every printed card starts in status 'printed' (available).
-- Filling a card ("تعبئة بطاقة") binds it to a student/teacher and a number
-- of sessions → status 'active'. When all sessions are used → 'finished'.
-- id              : 5 random digits (unique, consumed when the sheet is printed)
-- barcode_value   : EAN-13 '201' + 9-digit padded id + check digit
CREATE TABLE IF NOT EXISTS language_cards (
  id TEXT PRIMARY KEY,
  barcode_value TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'printed',
  student_id TEXT DEFAULT '',
  student_name TEXT DEFAULT '',
  language TEXT DEFAULT '',
  teacher_id TEXT DEFAULT '',
  teacher_name TEXT DEFAULT '',
  sessions_total INTEGER NOT NULL DEFAULT 0,
  sessions_used INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_lang_cards_created_at ON language_cards(created_at);
CREATE INDEX IF NOT EXISTS idx_lang_cards_status ON language_cards(status);
CREATE INDEX IF NOT EXISTS idx_lang_cards_teacher ON language_cards(teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lang_cards_barcode ON language_cards(barcode_value) WHERE barcode_value != '';

ALTER TABLE language_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_lang_cards" ON language_cards;
CREATE POLICY "anon_insert_lang_cards" ON language_cards FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_select_lang_cards" ON language_cards;
CREATE POLICY "anon_select_lang_cards" ON language_cards FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_update_lang_cards" ON language_cards;
CREATE POLICY "anon_update_lang_cards" ON language_cards FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "anon_delete_lang_cards" ON language_cards;
CREATE POLICY "anon_delete_lang_cards" ON language_cards FOR DELETE TO anon USING (true);
