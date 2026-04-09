-- Grants extra headroom by lowering chat_count within the active rolling window.
-- Window length must match app env CHAT_QUOTA_WINDOW_HOURS (passed as p_window_hours).

CREATE OR REPLACE FUNCTION public.extend_chat_quota_credits(
  p_credits integer DEFAULT 5,
  p_window_hours numeric DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  started_at timestamptz;
  win interval;
BEGIN
  win := p_window_hours * interval '1 hour';
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  END IF;

  IF p_credits IS NULL OR p_credits < 1 OR p_credits > 100 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_CREDITS');
  END IF;

  IF p_window_hours IS NULL OR p_window_hours <= 0 OR p_window_hours > 168 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_WINDOW');
  END IF;

  SELECT window_start INTO started_at
  FROM public.user_chat_usage
  WHERE user_id = uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'applied', 0, 'note', 'no_usage_row');
  END IF;

  IF now() >= started_at + win THEN
    RETURN jsonb_build_object('ok', true, 'applied', 0, 'note', 'window_expired');
  END IF;

  UPDATE public.user_chat_usage
  SET chat_count = GREATEST(0, chat_count - p_credits)
  WHERE user_id = uid;

  RETURN jsonb_build_object('ok', true, 'applied', p_credits);
END;
$$;

REVOKE ALL ON FUNCTION public.extend_chat_quota_credits(integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extend_chat_quota_credits(integer, numeric) TO authenticated;
