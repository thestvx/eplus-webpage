-- Language course cards: payment amount + attendance recording + auto-finish

ALTER TABLE language_cards
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE language_cards
SET status = 'finished', updated_at = now()
WHERE status = 'active'
  AND sessions_total > 0
  AND sessions_used >= sessions_total;

CREATE TABLE IF NOT EXISTS language_attendance (
  id BIGSERIAL PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES language_cards(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  teacher_id TEXT NOT NULL DEFAULT '',
  teacher_name TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Africa/Algiers')::date),
  cancelled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lang_att_card_date
  ON language_attendance(card_id, date) WHERE cancelled = false;
CREATE INDEX IF NOT EXISTS idx_lang_att_date ON language_attendance(date);
CREATE INDEX IF NOT EXISTS idx_lang_att_teacher ON language_attendance(teacher_id);

ALTER TABLE language_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lang_att" ON language_attendance;
CREATE POLICY "anon_select_lang_att" ON language_attendance FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_insert_lang_att" ON language_attendance;
CREATE POLICY "anon_insert_lang_att" ON language_attendance FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lang_att" ON language_attendance;
CREATE POLICY "anon_update_lang_att" ON language_attendance FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "anon_delete_lang_att" ON language_attendance;
CREATE POLICY "anon_delete_lang_att" ON language_attendance FOR DELETE TO anon USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE language_attendance TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE language_attendance_id_seq TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION language_cards_sync_finish()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'finished' AND NEW.status IS DISTINCT FROM 'finished' THEN
    RAISE EXCEPTION 'language card % is finished and cannot be renewed', OLD.id;
  END IF;
  IF COALESCE(NEW.sessions_total, 0) > 0 AND COALESCE(NEW.sessions_used, 0) >= NEW.sessions_total THEN
    NEW.status := 'finished';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_language_cards_sync_finish ON language_cards;
CREATE TRIGGER trg_language_cards_sync_finish
  BEFORE INSERT OR UPDATE ON language_cards
  FOR EACH ROW EXECUTE FUNCTION language_cards_sync_finish();

CREATE OR REPLACE FUNCTION record_language_attendance(p_card_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card language_cards%ROWTYPE;
  v_today DATE := (now() AT TIME ZONE 'Africa/Algiers')::date;
  v_used INTEGER;
BEGIN
  SELECT * INTO v_card FROM language_cards WHERE id = p_card_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF v_card.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'deleted');
  END IF;
  IF v_card.status = 'finished' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'finished',
      'sessions_used', v_card.sessions_used, 'sessions_total', v_card.sessions_total,
      'student_name', v_card.student_name, 'language', v_card.language, 'teacher_name', v_card.teacher_name);
  END IF;
  IF v_card.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_active',
      'sessions_used', v_card.sessions_used, 'sessions_total', v_card.sessions_total,
      'student_name', v_card.student_name, 'language', v_card.language, 'teacher_name', v_card.teacher_name);
  END IF;
  IF COALESCE(v_card.sessions_total, 0) <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_sessions',
      'sessions_used', v_card.sessions_used, 'sessions_total', v_card.sessions_total,
      'student_name', v_card.student_name, 'language', v_card.language, 'teacher_name', v_card.teacher_name);
  END IF;
  IF COALESCE(v_card.sessions_used, 0) >= v_card.sessions_total THEN
    UPDATE language_cards SET status = 'finished', updated_at = now() WHERE id = p_card_id;
    RETURN jsonb_build_object('ok', false, 'code', 'finished',
      'sessions_used', v_card.sessions_used, 'sessions_total', v_card.sessions_total,
      'student_name', v_card.student_name, 'language', v_card.language, 'teacher_name', v_card.teacher_name);
  END IF;
  IF EXISTS (
    SELECT 1 FROM language_attendance
    WHERE card_id = p_card_id AND date = v_today AND cancelled = false
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already',
      'sessions_used', v_card.sessions_used, 'sessions_total', v_card.sessions_total,
      'student_name', v_card.student_name, 'language', v_card.language, 'teacher_name', v_card.teacher_name);
  END IF;

  INSERT INTO language_attendance(card_id, student_name, language, teacher_id, teacher_name, date)
  VALUES (p_card_id, v_card.student_name, v_card.language, v_card.teacher_id, v_card.teacher_name, v_today);

  v_used := COALESCE(v_card.sessions_used, 0) + 1;
  UPDATE language_cards
  SET sessions_used = v_used,
      status = CASE WHEN v_used >= v_card.sessions_total THEN 'finished' ELSE 'active' END,
      updated_at = now()
  WHERE id = p_card_id;

  RETURN jsonb_build_object('ok', true,
    'code', CASE WHEN v_used >= v_card.sessions_total THEN 'finished' ELSE 'recorded' END,
    'sessions_used', v_used, 'sessions_total', v_card.sessions_total,
    'student_name', v_card.student_name, 'language', v_card.language, 'teacher_name', v_card.teacher_name);
END;
$$;

REVOKE ALL ON FUNCTION record_language_attendance(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_language_attendance(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
