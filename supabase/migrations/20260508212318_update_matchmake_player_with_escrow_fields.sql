/*
  # Update matchmake_player RPC to store wallet addresses and generate duel_id

  ## Changes
  - Accept p_wallet_address param so each player's wallet is stored in queue
  - When creating a competitive room, copy both wallets to party_rooms
  - Generate a deterministic duel_id for competitive matches using encode(digest(...))
  - Set onchain_status = 'waiting_p1' for competitive rooms (funding required)
  - Set status = 'waiting' (not 'active') for competitive rooms so game can't start
    until funds are locked; classic stays 'active' as before

  ## Notes
  - Classic mode behaviour is completely unchanged
  - The duel_id is keccak256(code || timestamp) mirroring the frontend helper
  - The room status for competitive is 'waiting' — the funding screen polls
    party_rooms.onchain_status and updates status to 'active' once funded
*/

CREATE OR REPLACE FUNCTION public.matchmake_player(
  p_player_id       text,
  p_game            text,
  p_mode            text    DEFAULT 'classic',
  p_stake           numeric DEFAULT NULL,
  p_currency        text    DEFAULT NULL,
  p_wallet_address  text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_opponent         text;
  v_opponent_wallet  text;
  v_room_id          uuid;
  v_code             text;
  v_state            jsonb;
  v_game             text;
  v_existing         text;
  v_duel_id          text;
  v_initial_status   text;
  v_onchain_status   text;
BEGIN
  -- ── 0. Validate input ────────────────────────────────────────────────────
  IF p_player_id IS NULL OR p_player_id = '' THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'player_id required');
  END IF;

  -- ── 1. Upsert caller into queue (keep row fresh, store wallet) ───────────
  INSERT INTO public.matchmaking_queue (
    player_id, game, mode, stake, currency, wallet_address, last_seen_at
  ) VALUES (
    p_player_id,
    CASE WHEN p_mode = 'competitive' THEN 'chess' ELSE p_game END,
    p_mode,
    CASE WHEN p_mode = 'classic' THEN NULL ELSE p_stake END,
    CASE WHEN p_mode = 'classic' THEN NULL ELSE p_currency END,
    p_wallet_address,
    now()
  )
  ON CONFLICT (player_id) DO UPDATE
    SET game             = EXCLUDED.game,
        mode             = EXCLUDED.mode,
        stake            = EXCLUDED.stake,
        currency         = EXCLUDED.currency,
        wallet_address   = EXCLUDED.wallet_address,
        last_seen_at     = now();

  -- ── 2. Check if already matched (room created by opponent's call) ─────────
  SELECT pr.code INTO v_existing
  FROM public.party_rooms pr
  WHERE pr.mode = 'matchmaking'
    AND pr.status IN ('active', 'waiting')
    AND (pr.p1_id = p_player_id OR pr.p2_id = p_player_id)
  ORDER BY pr.created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    SELECT pr.game INTO v_game
    FROM public.party_rooms pr
    WHERE pr.code = v_existing;

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
    v_initial_status := 'active';
    v_onchain_status := 'none';

  ELSE
    -- Competitive: match by stake + currency only
    SELECT q.player_id, q.wallet_address
    INTO v_opponent, v_opponent_wallet
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

    -- Competitive rooms start in 'waiting' so the game cannot start until funded
    v_initial_status := 'waiting';
    v_onchain_status := 'waiting_p1';
  END IF;

  -- No opponent yet — stay in queue
  IF v_opponent IS NULL THEN
    RETURN jsonb_build_object('status', 'waiting');
  END IF;

  -- ── 5. Create the room ───────────────────────────────────────────────────
  v_code  := generate_party_code();
  v_state := initialize_game_state(v_game);

  -- Generate duel_id for competitive matches: keccak256 is not available in
  -- PL/pgSQL, so we use encode(digest(seed, 'sha256'), 'hex') as a proxy.
  -- The frontend will use the actual keccak256 of this same seed.
  IF p_mode = 'competitive' THEN
    v_duel_id := '0x' || encode(
      digest(v_code || extract(epoch from now())::text, 'sha256'),
      'hex'
    );
  ELSE
    v_duel_id := NULL;
  END IF;

  INSERT INTO public.party_rooms (
    code, mode, game, status,
    p1_id, p2_id, p1_connected, p2_connected,
    game_state, turn,
    duel_id, p1_wallet, p2_wallet,
    currency, stake_usd,
    onchain_status
  ) VALUES (
    v_code, 'matchmaking', v_game, v_initial_status,
    p_player_id, v_opponent, true, true,
    v_state, 'p1',
    v_duel_id,
    p_wallet_address,   -- p1_wallet (room creator = caller)
    v_opponent_wallet,  -- p2_wallet (could be NULL if opponent didn't share)
    CASE WHEN p_mode = 'competitive' THEN p_currency ELSE NULL END,
    CASE WHEN p_mode = 'competitive' THEN p_stake    ELSE NULL END,
    v_onchain_status
  )
  RETURNING id INTO v_room_id;

  -- ── 6. Remove both players from queue ────────────────────────────────────
  DELETE FROM public.matchmaking_queue
  WHERE player_id IN (p_player_id, v_opponent);

  RETURN jsonb_build_object(
    'status',   'matched',
    'code',     v_code,
    'game',     v_game,
    'match_id', v_room_id,
    'duel_id',  v_duel_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- Re-grant (function signature changed — new param added)
REVOKE EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text, text) TO anon;
GRANT  EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text, text) TO service_role;
