/*
  # Add RLS policies for game_stats and monthly_prizes

  ## Problem
  Both tables have RLS enabled but zero policies. With RLS on and no policies,
  the default is deny-all — no role can read or write any rows. This is a
  security misconfiguration that also silently breaks any feature reading
  these tables.

  ## game_stats
  - Written by server-side logic (award-rp edge function / admin processes).
  - Should be readable by authenticated users (leaderboard_game_stats view
    joins this table; the view is now SECURITY INVOKER so the calling role
    needs access).
  - No direct client writes — INSERT/UPDATE/DELETE only via service_role.

  ## monthly_prizes
  - Administrative table for prize distribution.
  - Players should be able to read their own prize records.
  - No client writes — all writes via service_role.

  ## Security
  - Both tables use uuid player_id foreign-keyed to players.id — NOT auth.uid().
    The app uses device-ID-based player identity, not Supabase Auth JWTs.
  - Therefore we cannot use auth.uid() = player_id for row-level filtering.
  - Instead we grant broad authenticated SELECT (consistent with how the
    leaderboard views expose aggregated data), and restrict writes to service_role.
  - anon SELECT on game_stats is needed for leaderboard_game_stats to render
    for logged-out visitors (consistent with the leaderboard views being public).
*/

-- ── game_stats ────────────────────────────────────────────────────────────────

-- Leaderboard data is public — anon and authenticated can read
CREATE POLICY "Anyone can read game stats for leaderboard"
  ON public.game_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service_role / postgres (bypasses RLS) can write game stats
-- No INSERT/UPDATE/DELETE policies for anon or authenticated

-- ── monthly_prizes ────────────────────────────────────────────────────────────

-- Players can view all prize records (useful for prize history UI)
CREATE POLICY "Authenticated users can read prize records"
  ON public.monthly_prizes
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role / postgres (bypasses RLS) can write prize records
-- No INSERT/UPDATE/DELETE policies for anon or authenticated
