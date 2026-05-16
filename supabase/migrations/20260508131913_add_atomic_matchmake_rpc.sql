/*
  # Atomic matchmaking RPC

  ## Problem
  The existing approach has two critical bugs:

  1. PARAMETER NAME MISMATCH: The frontend calls match_players with
     { game_type: ... } but the SQL function parameter is named p_game_type.
     Supabase RPC passes named args, so p_game_type receives NULL and the
     function never finds anyone. Match never happens.

  2. REALTIME RACE: The realtime subscription on party_rooms filtered by
     p1_id/p2_id only works for JWT-authenticated sessions. This app uses
     device-ID (anon) sessions, so the filter is silently dropped — player 2
     never gets notified even when a room is created.

  ## Solution
  Replace the two-step flow (join queue → poll match_players) with a single
  atomic RPC: matchmake_player().

  Called by EVERY player on each poll tick, it:
  1. Upserts the caller into the queue (keeping the row fresh).
  2. Checks if the caller already has a matched room (covers the "I was matched
     while waiting" case — robust alternative to realtime).
  3. Tries to find a compatible opponent and create a room atomically using
     FOR UPDATE SKIP LOCKED to prevent double-matching.
  4. Returns one of three states:
     - { status: 'matched', code, game }  → navigate to the game
     - { status: 'waiting' }              → stay in queue, poll again
     - { status: 'error', message }       → something went wrong

  Both players call this function every 2 seconds. Whoever gets the lock
  first creates the room; the other finds the room on their next poll tick.

  ## Grants
  Callable by anon (unauthenticated device-ID users) and authenticated.
*/

CREATE OR REPLACE FUNCTION public.matchmake_player(
  p_player_id   text,
  p_game        text,
  p_mode        text    DEFAULT 'classic',
  p_stake       numeric DEFAULT NULL,
  p_currency    text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_opponent  text;
  v_room_id   uuid;
  v_code      text;
  v_state     jsonb;
  v_game      text;
  v_existing  text;  -- existing room code if already matched
BEGIN
  -- ── 0. Validate input ────────────────────────────────────────────────────
  IF p_player_id IS NULL OR p_player_id = '' THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'player_id required');
  END IF;

  -- ── 1. Upsert caller into queue (keep row fresh) ─────────────────────────
  INSERT INTO public.matchmaking_queue (
    player_id, game, mode, stake, currency, last_seen_at
  ) VALUES (
    p_player_id,
    CASE WHEN p_mode = 'competitive' THEN 'chess' ELSE p_game END,
    p_mode,
    CASE WHEN p_mode = 'classic' THEN NULL ELSE p_stake END,
    CASE WHEN p_mode = 'classic' THEN NULL ELSE p_currency END,
    now()
  )
  ON CONFLICT (player_id) DO UPDATE
    SET game         = EXCLUDED.game,
        mode         = EXCLUDED.mode,
        stake        = EXCLUDED.stake,
        currency     = EXCLUDED.currency,
        last_seen_at = now();

  -- ── 2. Check if already matched (room created by opponent's call) ─────────
  SELECT pr.code INTO v_existing
  FROM public.party_rooms pr
  WHERE pr.mode = 'matchmaking'
    AND pr.status = 'active'
    AND (pr.p1_id = p_player_id OR pr.p2_id = p_player_id)
  ORDER BY pr.created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- Already in a room — return it
    SELECT pr.game INTO v_game
    FROM public.party_rooms pr
    WHERE pr.code = v_existing;

    -- Remove from queue since we are matched
    DELETE FROM public.matchmaking_queue WHERE player_id = p_player_id;

    RETURN jsonb_build_object('status', 'matched', 'code', v_existing, 'game', v_game);
  END IF;

  -- ── 3. Purge stale queue entries ─────────────────────────────────────────
  DELETE FROM public.matchmaking_queue
  WHERE last_seen_at < now() - interval '35 seconds';

  -- ── 4. Find a compatible opponent (atomic lock) ──────────────────────────
  IF p_mode = 'classic' THEN
    SELECT q.player_id INTO v_opponent
    FROM public.matchmaking_queue q
    WHERE q.game = p_game
      AND q.mode = 'classic'
      AND q.player_id <> p_player_id
      AND q.last_seen_at >= now() - interval '30 seconds'
    ORDER BY q.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    v_game := p_game;

  ELSE
    -- Competitive: match by stake + currency only
    SELECT q.player_id INTO v_opponent
    FROM public.matchmaking_queue q
    WHERE q.mode = 'competitive'
      AND q.stake    IS NOT DISTINCT FROM p_stake
      AND q.currency IS NOT DISTINCT FROM p_currency
      AND q.player_id <> p_player_id
      AND q.last_seen_at >= now() - interval '30 seconds'
    ORDER BY q.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- Random game drawn from the three available competitive games
    v_game := (ARRAY['chess', 'connect-four', 'tictactoe'])[
      floor(random() * 3 + 1)::int
    ];
  END IF;

  -- No opponent yet — stay in queue
  IF v_opponent IS NULL THEN
    RETURN jsonb_build_object('status', 'waiting');
  END IF;

  -- ── 5. Create the room ───────────────────────────────────────────────────
  v_code  := generate_party_code();
  v_state := initialize_game_state(v_game);

  INSERT INTO public.party_rooms (
    code, mode, game, status,
    p1_id, p2_id, p1_connected, p2_connected,
    game_state, turn
  ) VALUES (
    v_code, 'matchmaking', v_game, 'active',
    p_player_id, v_opponent, true, true,
    v_state, 'p1'
  )
  RETURNING id INTO v_room_id;

  -- ── 6. Remove both players from queue ────────────────────────────────────
  DELETE FROM public.matchmaking_queue
  WHERE player_id IN (p_player_id, v_opponent);

  RETURN jsonb_build_object(
    'status',   'matched',
    'code',     v_code,
    'game',     v_game,
    'match_id', v_room_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- Grants
REVOKE EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text) TO anon;
GRANT  EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text) TO service_role;

-- Also fix the leave_matchmaking_queue grant (needed for cancel)
REVOKE EXECUTE ON FUNCTION public.leave_matchmaking_queue(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.leave_matchmaking_queue(text) TO anon;
GRANT  EXECUTE ON FUNCTION public.leave_matchmaking_queue(text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.leave_matchmaking_queue(text) TO service_role;
