/*
  # Tighten role-level table grants

  ## Summary
  Both `anon` and `authenticated` currently hold ALL privileges on every table
  (including DELETE, TRUNCATE, TRIGGER, REFERENCES). This migration revokes all
  grants and re-issues only the minimum privileges each role requires.

  ## Access model
  This app uses anonymous player IDs (no Supabase Auth). All client requests
  arrive under the `anon` role. RLS policies enforce row-level access control.
  The `authenticated` role is kept for future auth migration but receives the
  same scoped grants.

  ### game_stats
  - anon: SELECT only (leaderboard reads; writes handled by service role)
  - authenticated: SELECT only

  ### matches
  - anon: SELECT, INSERT, UPDATE (players create and update match records)
  - authenticated: SELECT, INSERT, UPDATE

  ### matchmaking_queue
  - anon: SELECT, INSERT, UPDATE, DELETE (full queue lifecycle)
  - authenticated: SELECT, INSERT, UPDATE, DELETE

  ### monthly_prizes
  - anon: SELECT only (leaderboard reads; writes handled by service role)
  - authenticated: SELECT only

  ### party_rooms
  - anon: SELECT, INSERT, UPDATE, DELETE (full party lifecycle)
  - authenticated: SELECT, INSERT, UPDATE, DELETE

  ### players
  - anon: SELECT, INSERT, UPDATE (profile creation and updates)
  - authenticated: SELECT, INSERT, UPDATE
*/

-- ============================================================
-- game_stats — read-only for clients
-- ============================================================
REVOKE ALL ON public.game_stats FROM anon, authenticated;
GRANT SELECT ON public.game_stats TO anon, authenticated;

-- ============================================================
-- matches — clients create and update match records
-- ============================================================
REVOKE ALL ON public.matches FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.matches TO anon, authenticated;

-- ============================================================
-- matchmaking_queue — clients manage their own queue entries
-- ============================================================
REVOKE ALL ON public.matchmaking_queue FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matchmaking_queue TO anon, authenticated;

-- ============================================================
-- monthly_prizes — read-only for clients
-- ============================================================
REVOKE ALL ON public.monthly_prizes FROM anon, authenticated;
GRANT SELECT ON public.monthly_prizes TO anon, authenticated;

-- ============================================================
-- party_rooms — clients manage party lifecycle
-- ============================================================
REVOKE ALL ON public.party_rooms FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_rooms TO anon, authenticated;

-- ============================================================
-- players — clients create and update their profiles
-- ============================================================
REVOKE ALL ON public.players FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.players TO anon, authenticated;
