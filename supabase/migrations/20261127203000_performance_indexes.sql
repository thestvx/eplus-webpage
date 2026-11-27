CREATE INDEX IF NOT EXISTS idx_att_control_state_recent
  ON attendance_control_state (date, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_att_sessions_student_date_active
  ON attendance_sessions (student_id, date)
  WHERE status = 'recorded' AND record_type <> 'absent';

CREATE INDEX IF NOT EXISTS idx_att_sessions_student_events
  ON attendance_sessions (student_id, date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_student_dates
  ON student_subscriptions (student_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_periods_subscription_active
  ON subscription_periods (subscription_id, status, start_date DESC, month_number DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_final_created
  ON registrations (created_at DESC)
  WHERE deleted_at IS NULL AND status = 'مسجل نهائياً';

CREATE INDEX IF NOT EXISTS idx_subscriptions_teacher_status
  ON student_subscriptions (teacher_id, status);
