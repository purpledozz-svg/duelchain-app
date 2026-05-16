/*
  # Separate Classic and Competitive matchmaking queues

  1. Schema Changes
    - Adds `mode` column (text) to `matchmaking_queue` with default 'competitive'
      to indicate whether a player is queueing for Classic (free) or Competitive (wagered).
    - Adds `stake` column (numeric) to `matchmaking_queue` to store the USD wager
      amount for Competitive matches. NULL for Classic.
    - Adds `currency` column (text) to `matchmaking_queue` to store the chosen
      wager currency (e.g. 'ETH', 'USDC'). NULL for Classic.

  2. Function update
    - `match_players` now accepts the mode and stake/currency context and only
      pairs players whose `game`, `mode`, `stake`, and `currency` all match.
      Classic players only match with Classic players. Competitive only match
      with players at the same stake and currency.

  3. Notes
    - All columns are added with `IF NOT EXISTS` to stay safe on reruns.
    - Existing rows receive the default values; no data is dropped.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matchmaking_queue' AND column_name = 'mode'
  ) THEN
    ALTER TABLE matchmaking_queue ADD COLUMN mode text NOT NULL DEFAULT 'competitive';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matchmaking_queue' AND column_name = 'stake'
  ) THEN
    ALTER TABLE matchmaking_queue ADD COLUMN stake numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matchmaking_queue' AND column_name = 'currency'
  ) THEN
    ALTER TABLE matchmaking_queue ADD COLUMN currency text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.match_players(
  game_type text,
  p_mode text DEFAULT 'competitive',
  p_stake numeric DEFAULT NULL,
  p_currency text DEFAULT NULL
)
RETURNS TABLE(match_id uuid, match_code text, player1_id text, player2_id text)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_player1_id text;
  v_player2_id text;
  v_match_id uuid;
  v_match_code text;
  v_game_state jsonb;
BEGIN
  PERFORM cleanup_stale_queue_entries();

  SELECT q.player_id INTO v_player1_id
  FROM matchmaking_queue q
  WHERE q.game = game_type
    AND q.mode = p_mode
    AND (p_mode = 'classic' OR (q.stake IS NOT DISTINCT FROM p_stake AND q.currency IS NOT DISTINCT FROM p_currency))
    AND q.last_seen_at >= now() - interval '30 seconds'
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_player1_id IS NULL THEN
    RETURN;
  END IF;

  SELECT q.player_id INTO v_player2_id
  FROM matchmaking_queue q
  WHERE q.game = game_type
    AND q.mode = p_mode
    AND (p_mode = 'classic' OR (q.stake IS NOT DISTINCT FROM p_stake AND q.currency IS NOT DISTINCT FROM p_currency))
    AND q.player_id != v_player1_id
    AND q.last_seen_at >= now() - interval '30 seconds'
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_player2_id IS NULL THEN
    RETURN;
  END IF;

  v_match_code := generate_party_code();
  v_game_state := initialize_game_state(game_type);

  INSERT INTO party_rooms (
    code, mode, game, status,
    p1_id, p2_id, p1_connected, p2_connected,
    game_state, turn
  ) VALUES (
    v_match_code,
    'matchmaking',
    game_type,
    'active',
    v_player1_id,
    v_player2_id,
    true,
    true,
    v_game_state,
    'p1'
  )
  RETURNING id INTO v_match_id;

  DELETE FROM matchmaking_queue
  WHERE player_id IN (v_player1_id, v_player2_id)
    AND game = game_type
    AND mode = p_mode;

  RETURN QUERY SELECT v_match_id, v_match_code, v_player1_id, v_player2_id;
END;
$function$;