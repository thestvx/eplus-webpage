CREATE OR REPLACE FUNCTION increment_period_usage(p_period_id TEXT, p_used INT DEFAULT 1)
RETURNS TABLE (used_sessions INT, remaining_sessions INT) AS $$
  UPDATE subscription_periods
     SET used_sessions = used_sessions + p_used,
         remaining_sessions = remaining_sessions - p_used,
         updated_at = now()
   WHERE id = p_period_id AND remaining_sessions >= p_used
  RETURNING used_sessions, remaining_sessions;
$$ LANGUAGE sql VOLATILE;
