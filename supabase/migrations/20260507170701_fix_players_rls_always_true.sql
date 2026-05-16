/*
  # Fix players RLS — replace always-true INSERT and DELETE policies

  ## Problem
  - "Anyone can create a player profile" used WITH CHECK (true) — anyone could insert any row
  - "Anyone can delete a player profile"  used USING (true)        — anyone could delete any row

  ## Identity model
  The app uses wallet_address or player_id (device UUID string) as identity,
  not Supabase auth. Both are set as session GUC values:
    app.current_wallet  → players.wallet_address
    app.player_id       → players.player_id

  ## Changes
  - Drop the two always-true policies
  - Re-create INSERT: the new row's wallet_address OR player_id must match
    the session identity (prevents inserting rows for other users)
  - Re-create DELETE: only the owning player can delete their own profile,
    matched via wallet_address or player_id

  ## Notes
  - The existing UPDATE policies already check ownership via wallet_address
  - SELECT policies are kept (public read of profiles is intentional for leaderboard/search)
*/

-- Drop always-true policies
DROP POLICY IF EXISTS "Anyone can create a player profile" ON public.players;
DROP POLICY IF EXISTS "Anyone can delete a player profile" ON public.players;

-- INSERT — the new profile must belong to the current session identity
CREATE POLICY "Players can create their own profile"
  ON public.players
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      current_setting('app.current_wallet', true) <> ''
      AND wallet_address = current_setting('app.current_wallet', true)
    )
    OR
    (
      current_setting('app.player_id', true) <> ''
      AND player_id = current_setting('app.player_id', true)
    )
  );

-- DELETE — only the owning player can delete their profile
CREATE POLICY "Players can delete their own profile"
  ON public.players
  FOR DELETE
  TO anon, authenticated
  USING (
    (
      current_setting('app.current_wallet', true) <> ''
      AND wallet_address = current_setting('app.current_wallet', true)
    )
    OR
    (
      current_setting('app.player_id', true) <> ''
      AND player_id = current_setting('app.player_id', true)
    )
  );
