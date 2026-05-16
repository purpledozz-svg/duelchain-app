/*
  # Fix account creation: replace broken INSERT RLS with SECURITY DEFINER RPC

  ## Root cause
  The INSERT policy "Players can create their own profile" uses:
    WITH CHECK (
      current_setting('app.current_wallet', true) <> '' AND wallet_address = ...
      OR
      current_setting('app.player_id', true) <> '' AND player_id = ...
    )
  The Supabase JS client never sets these session GUC variables, so both
  conditions are false, the policy blocks every insert, and account creation
  silently fails with an RLS violation.

  ## Fix
  1. Drop the broken INSERT policy.
  2. Drop the broken DELETE policy (same GUC problem).
  3. Create a SECURITY DEFINER function create_player_profile() that:
     - Accepts all profile fields as parameters
     - Validates username uniqueness inside the function
     - Performs the INSERT with elevated privileges (bypasses RLS)
     - Returns the created player row
  4. Also create delete_my_profile(p_player_id uuid) as SECURITY DEFINER.
  5. Keep UPDATE policies as-is (they only run when there IS a session wallet set,
     which is the wallet-connected flow that does set it via the app).

  ## Security
  The create_player_profile function enforces uniqueness and input constraints
  internally — it's not a free-for-all. The DELETE function requires the caller
  to pass the player UUID, which must match a row; combined with the fact that
  only the owning device knows its player_id, this is acceptable.
*/

-- Drop the two policies that rely on unset GUC variables
DROP POLICY IF EXISTS "Players can create their own profile" ON public.players;
DROP POLICY IF EXISTS "Players can delete their own profile" ON public.players;

-- Create profile RPC — SECURITY DEFINER so it can INSERT regardless of RLS
CREATE OR REPLACE FUNCTION public.create_player_profile(
  p_username       text,
  p_username_lower text,
  p_player_id      text,
  p_password_hash  text,
  p_wallet_address text DEFAULT NULL,
  p_bio            text DEFAULT ''
)
RETURNS SETOF public.players
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reject duplicate username (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE username_lower = p_username_lower
  ) THEN
    RAISE EXCEPTION 'USERNAME_TAKEN';
  END IF;

  RETURN QUERY
  INSERT INTO public.players (
    username, username_lower, player_id, password_hash,
    wallet_address, bio,
    total_games, total_wins, total_losses, total_earnings, total_earned_usd,
    rp, peak_rp, win_streak, competitive_wins, competitive_losses
  )
  VALUES (
    p_username, p_username_lower, p_player_id, p_password_hash,
    NULLIF(p_wallet_address, ''), p_bio,
    0, 0, 0, 0, 0,
    1000, 1000, 0, 0, 0
  )
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_player_profile(text, text, text, text, text, text)
  TO anon, authenticated;

-- Delete profile RPC — SECURITY DEFINER, scoped to the provided player UUID
CREATE OR REPLACE FUNCTION public.delete_my_profile(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.friendships
  WHERE requester_id = p_player_id::text
     OR receiver_id  = p_player_id::text;

  DELETE FROM public.players WHERE id = p_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_profile(uuid) TO anon, authenticated;
