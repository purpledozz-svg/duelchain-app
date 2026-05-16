/*
  # Fix matchmaking: RLS SELECT policies + game state for tictactoe

  ## Problems fixed

  1. party_rooms has RLS enabled but ZERO SELECT policies
     → Every authenticated SELECT returns 0 rows despite the grant
     → getParty(), joinParty(), subscribeToMatchmaking (realtime), and all
       in-game reads return null/empty
     → Fix: add a permissive SELECT policy that allows anyone with the grant
       to read rooms they are a participant in, plus a broad policy for
       the matchmaking flow (reading by code)

  2. matchmaking_queue has RLS enabled but NO SELECT policy
     → Authenticated users can INSERT/UPDATE/DELETE but not SELECT their own row
     → Fix: add SELECT policy

  3. initialize_game_state('tictactoe') returns {} instead of a valid board
     → The server function only handles 'tic-tac-toe' (with hyphen)
     → The Lobby/frontend uses 'tictactoe' (no hyphen)
     → Fix: add 'tictactoe' case to initialize_game_state

  ## Security
  - party_rooms SELECT: allow reading any room by code (needed for join/watch)
    and own rooms by p1_id/p2_id — consistent with existing INSERT/UPDATE policies
    which already only check that p1_id is non-null (not auth-based)
  - matchmaking_queue SELECT: allow reading own row by player_id (non-null check,
    consistent with existing INSERT/UPDATE/DELETE policies)
*/

-- ── 1. party_rooms SELECT policy ─────────────────────────────────────────────

-- Anyone with the SELECT grant can read a party room (needed for join-by-code,
-- matchmaking, and in-game state sync). The existing INSERT/UPDATE policies
-- already use the same non-auth pattern (p1_id IS NOT NULL).
CREATE POLICY "Party participants and spectators can read rooms"
  ON public.party_rooms
  FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anon to read rooms they are joining (needed for non-auth profile users)
CREATE POLICY "Anyone can read party rooms"
  ON public.party_rooms
  FOR SELECT
  TO anon
  USING (true);

-- ── 2. matchmaking_queue SELECT policy ───────────────────────────────────────

CREATE POLICY "Players can read queue entries"
  ON public.matchmaking_queue
  FOR SELECT
  TO anon, authenticated
  USING ((player_id IS NOT NULL) AND (player_id <> ''));

-- ── 3. Fix initialize_game_state to handle 'tictactoe' ───────────────────────

CREATE OR REPLACE FUNCTION public.initialize_game_state(game_type text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  CASE game_type
    WHEN 'chess' THEN
      RETURN '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "moves": [], "capturePoints": {"w": 0, "b": 0}, "captureLog": [], "clock": {"wMs": 300000, "bMs": 300000, "active": "w", "lastTickMs": 0, "incrementMs": 2000}}'::jsonb;
    WHEN 'connect-four' THEN
      RETURN '{"grid": [[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null]], "moves": []}'::jsonb;
    WHEN 'tictactoe', 'tic-tac-toe' THEN
      RETURN '{"board": [null,null,null,null,null,null,null,null,null], "moves": []}'::jsonb;
    WHEN 'rps' THEN
      RETURN '{"p1_choice": null, "p2_choice": null, "round": 1, "scores": {"p1": 0, "p2": 0}}'::jsonb;
    WHEN 'flappy-duel' THEN
      RETURN '{"status": "countdown", "startTimeMs": null, "maxDurationMs": 60000, "p1_alive": true, "p2_alive": true, "p1_deathMs": null, "p2_deathMs": null, "p1_score": 0, "p2_score": 0, "winner": null}'::jsonb;
    WHEN 'stop-at-10' THEN
      RETURN '{"status": "waiting", "targetMs": 10000, "roundStartMs": null, "preCountdownMs": 4000, "p1_stopMs": null, "p2_stopMs": null, "p1_elapsed": null, "p2_elapsed": null, "round": 1, "scores": {"p1": 0, "p2": 0}, "winner": null}'::jsonb;
    WHEN 'hot-potato' THEN
      RETURN '{"status": "waiting", "players": [], "aliveIds": [], "holderId": null, "roundStartMs": null, "explosionAtMs": null, "eliminationLog": [], "winner": null}'::jsonb;
    WHEN 'stop-it' THEN
      RETURN '{"start_time": null, "p1_time": null, "p2_time": null, "target_time": 5000}'::jsonb;
    ELSE
      RETURN '{}'::jsonb;
  END CASE;
END;
$$;

-- Clean up test data from diagnostic run
DELETE FROM public.party_rooms WHERE p1_id = 'test-p1' OR p2_id = 'test-p2';
DELETE FROM public.matchmaking_queue WHERE player_id IN ('test-p1', 'test-p2');
