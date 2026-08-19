CREATE TABLE IF NOT EXISTS calibration_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT,
  calibration JSONB NOT NULL,
  sheet JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calibration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read calibration_history" ON calibration_history FOR SELECT USING (true);
CREATE POLICY "Public insert calibration_history" ON calibration_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete calibration_history" ON calibration_history FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_calibration_history_created_at ON calibration_history (created_at DESC);
