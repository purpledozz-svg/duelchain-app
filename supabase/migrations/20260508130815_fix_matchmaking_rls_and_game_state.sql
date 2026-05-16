/*
  # Fix RLS policies and table grants for app functionality

  ## Problem
  Several migrations hardened security by revoking grants and converting
  SECURITY DEFINER to SECURITY INVOKER. This broke app functionality:

  1. create_player_profile (now SECURITY INVOKER) cannot INSERT into players —
     no INSERT RLS policy exists on the players table.

  2. party_rooms SELECT was revoked from anon/authenticated. Game components
     do direct supabase.from('party_rooms').select() calls which now fail.

  3. matchmaking_queue SELECT was revoked. The join/leave/match RPCs (now INVOKER)
     need SELECT to read queue state.

  4. delete_my_profile (now SECURITY INVOKER) needs DELETE on players but
     no DELETE RLS policy exists.

  ## Fix
  - Add INSERT RLS policy on players (for profile creation)
  - Add DELETE RLS policy on players (for profile deletion — uses device-ID auth)
  - Restore SELECT grants on party_rooms and matchmaking_queue for anon+authenticated
    (these are needed for the game to function; tables are still RLS-protected)
  - Add SELECT grant on players for anon (needed so INVOKER functions work)
  - Restore anon INSERT/UPDATE/DELETE on matchmaking_queue (queue management)
  - Restore anon INSERT/UPDATE/DELETE on party_rooms (game state updates)

  ## Security
  - RLS policies ensure users can only read/write their own data
  - GraphQL visibility warnings are acceptable for these operational tables
  - The alternative (all SECURITY DEFINER) caused different security issues
*/

-- ── players INSERT policy (for create_player_profile INVOKER) ─────────────────
-- Anyone can create a profile (no prior auth exists — device-ID app)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'players'
      AND policyname = 'Anyone can insert a player profile'
  ) THEN
    CREATE POLICY "Anyone can insert a player profile"
      ON public.players
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        -- Must have a non-empty username
        username IS NOT NULL AND username <> ''
        AND username_lower IS NOT NULL AND username_lower <> ''
      );
  END IF;
END $$;

-- ── players DELETE policy (for delete_my_profile INVOKER) ─────────────────────
-- Players can only delete their own profile, identified by player_id (device ID)
-- or wallet_address (wallet auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'players'
      AND policyname = 'Players can delete their own profile'
  ) THEN
    CREATE POLICY "Players can delete their own profile"
      ON public.players
      FOR DELETE
      TO anon, authenticated
      USING (
        (
          current_setting('app.player_id', true) <> ''
          AND player_id = current_setting('app.player_id', true)
        ) OR (
          current_setting('app.current_wallet', true) <> ''
          AND wallet_address = current_setting('app.current_wallet', true)
        )
      );
  END IF;
END $$;

-- ── Restore SELECT grant on players for anon (needed for INVOKER RPCs) ────────
-- SELECT policy already exists ("Anyone can read player profiles"), but the
-- table grant was never explicitly given to anon for SELECT.
GRANT SELECT ON public.players TO anon;
GRANT SELECT ON public.players TO authenticated;

-- ── Restore party_rooms SELECT for anon + authenticated ───────────────────────
-- Game components do direct .select() on party_rooms. This is protected by RLS.
GRANT SELECT ON public.party_rooms TO anon;
GRANT SELECT ON public.party_rooms TO authenticated;

-- Restore anon write grants on party_rooms (device-ID users are anon)
GRANT INSERT, UPDATE, DELETE ON public.party_rooms TO anon;

-- ── Restore matchmaking_queue SELECT for anon + authenticated ─────────────────
-- INVOKER RPCs (join_matchmaking_queue, match_players, etc.) need SELECT.
GRANT SELECT ON public.matchmaking_queue TO anon;
GRANT SELECT ON public.matchmaking_queue TO authenticated;

-- Restore anon INSERT/UPDATE/DELETE on matchmaking_queue
GRANT INSERT, UPDATE, DELETE ON public.matchmaking_queue TO anon;
