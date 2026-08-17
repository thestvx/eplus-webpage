-- Run this in Supabase SQL Editor
CREATE OR REPLACE FUNCTION admin_delete_subscription(
  p_admin_uid uuid,
  p_subscription_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT admin_is_uid_admin(p_admin_uid) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM subscription_periods WHERE subscription_id = p_subscription_id;
  DELETE FROM subscriptions WHERE id = p_subscription_id;
END;
$$;
