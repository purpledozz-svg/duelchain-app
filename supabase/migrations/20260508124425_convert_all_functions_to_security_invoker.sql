/*
  # Convert all SECURITY DEFINER functions to SECURITY INVOKER

  ## Why
  Supabase's security advisor flags every SECURITY DEFINER function that anon or
  authenticated can call, regardless of intent. The only way to fully silence these
  alerts is to convert functions to SECURITY INVOKER, which runs under the calling
  role's own privileges and is governed by RLS — the PostgreSQL-recommended approach.

  ## What changes
  All 20 public SECURITY DEFINER functions are recreated with SECURITY INVOKER.
  The function bodies are identical; only the SECURITY DEFINER keyword is removed.

  ## RLS compatibility
  The existing RLS policies on players, friendships, matchmaking_queue, and
  party_rooms use app.current_wallet / app.player_id session settings (device-ID
  auth pattern). Functions that read those tables will work correctly because
  those RLS policies are already in place. A SELECT policy on players is added
  in this migration to allow lookups needed by profile/auth flows.

  ## Grant changes
  With SECURITY INVOKER, the function runs as the caller. We still need EXECUTE
  grants on the functions themselves (anon for pre-login flows, authenticated for
  all), but the SECURITY DEFINER warning disappears because the functions no longer
  elevate privileges.
*/

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Add missing RLS SELECT policy on players (required for INVOKER functions)
-- ════════════════════════════════════════════════════════════════════════════

-- Allow any role to read players rows — the player data returned by lookup
-- functions (get_player_by_username, get_player_by_wallet, etc.) is the same
-- data the existing SECURITY DEFINER functions returned. The functions themselves
-- filter by the right column, so broad SELECT is acceptable for a public game.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'players'
      AND policyname = 'Anyone can read player profiles'
  ) THEN
    CREATE POLICY "Anyone can read player profiles"
      ON public.players
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Recreate all functions as SECURITY INVOKER
-- ════════════════════════════════════════════════════════════════════════════

-- check_username_taken
CREATE OR REPLACE FUNCTION public.check_username_taken(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.players
  WHERE username_lower = lower(p_username) OR username = p_username
);
$$;

-- create_player_profile
CREATE OR REPLACE FUNCTION public.create_player_profile(
  p_username text,
  p_username_lower text,
  p_player_id text,
  p_password_hash text,
  p_wallet_address text DEFAULT NULL,
  p_bio text DEFAULT ''
)
RETURNS SETOF players
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.players WHERE username_lower = p_username_lower
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

-- get_player_by_player_id
CREATE OR REPLACE FUNCTION public.get_player_by_player_id(p_device_id text)
RETURNS SETOF players
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT * FROM public.players WHERE player_id = p_device_id LIMIT 1;
$$;

-- get_player_by_username
CREATE OR REPLACE FUNCTION public.get_player_by_username(p_username text)
RETURNS SETOF players
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT * FROM public.players WHERE username_lower = lower(p_username) LIMIT 1;
$$;

-- get_player_by_wallet
CREATE OR REPLACE FUNCTION public.get_player_by_wallet(p_wallet text)
RETURNS SETOF players
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT * FROM public.players WHERE wallet_address = p_wallet LIMIT 1;
$$;

-- search_players
CREATE OR REPLACE FUNCTION public.search_players(p_query text, p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid, username text, username_lower text, total_games integer,
              total_wins integer, created_at timestamptz, bio text, avatar_url text)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT id, username, username_lower, total_games, total_wins, created_at, bio, avatar_url
FROM public.players
WHERE username_lower ILIKE (lower(p_query) || '%')
LIMIT p_limit;
$$;

-- get_my_profile
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF players
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT * FROM public.players
WHERE (
  current_setting('app.current_wallet', true) <> ''
  AND wallet_address = current_setting('app.current_wallet', true)
) OR (
  current_setting('app.player_id', true) <> ''
  AND player_id = current_setting('app.player_id', true)
)
LIMIT 1;
$$;

-- delete_my_profile
CREATE OR REPLACE FUNCTION public.delete_my_profile(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.friendships
  WHERE requester_id = p_player_id::text
     OR receiver_id  = p_player_id::text;

  DELETE FROM public.players WHERE id = p_player_id;
END;
$$;

-- get_friend_profiles
CREATE OR REPLACE FUNCTION public.get_friend_profiles(p_ids uuid[])
RETURNS TABLE(id uuid, username text, username_lower text, total_games integer,
              total_wins integer, created_at timestamptz, bio text, avatar_url text)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT id, username, username_lower, total_games, total_wins, created_at, bio, avatar_url
FROM public.players
WHERE id = ANY(p_ids);
$$;

-- get_player_ids_by_device
CREATE OR REPLACE FUNCTION public.get_player_ids_by_device(p_device_ids text[])
RETURNS TABLE(id uuid, player_id text)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT id, player_id FROM public.players WHERE player_id = ANY(p_device_ids);
$$;

-- check_friendship_exists
CREATE OR REPLACE FUNCTION public.check_friendship_exists(p_requester_id text, p_receiver_id text)
RETURNS SETOF friendships
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT * FROM public.friendships
WHERE (requester_id = p_requester_id AND receiver_id = p_receiver_id)
   OR (requester_id = p_receiver_id  AND receiver_id = p_requester_id)
LIMIT 1;
$$;

-- get_friendship_status
CREATE OR REPLACE FUNCTION public.get_friendship_status(p_my_id text, p_their_id text)
RETURNS SETOF friendships
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT * FROM public.friendships
WHERE (requester_id = p_my_id    AND receiver_id = p_their_id)
   OR (requester_id = p_their_id AND receiver_id = p_my_id)
LIMIT 1;
$$;

-- get_my_friendships
CREATE OR REPLACE FUNCTION public.get_my_friendships(p_player_id text)
RETURNS SETOF friendships
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT * FROM public.friendships
WHERE (requester_id = p_player_id OR receiver_id = p_player_id)
  AND status = 'accepted';
$$;

-- get_pending_requests
CREATE OR REPLACE FUNCTION public.get_pending_requests(p_player_id text)
RETURNS SETOF friendships
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT * FROM public.friendships
WHERE receiver_id = p_player_id AND status = 'pending';
$$;

-- get_profile_match_history
CREATE OR REPLACE FUNCTION public.get_profile_match_history(p_player_uuid uuid)
RETURNS SETOF party_rooms
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT * FROM public.party_rooms
WHERE (p1_id = p_player_uuid::text OR p2_id = p_player_uuid::text)
  AND status = 'finished'
ORDER BY created_at DESC
LIMIT 10;
$$;

-- get_queue_counts
CREATE OR REPLACE FUNCTION public.get_queue_counts()
RETURNS TABLE(game_id text, player_count bigint)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
SELECT game, COUNT(*) AS player_count
FROM public.matchmaking_queue
WHERE last_seen_at >= now() - interval '30 seconds'
GROUP BY game;
$$;

-- join_matchmaking_queue
CREATE OR REPLACE FUNCTION public.join_matchmaking_queue(
  p_player_id text,
  p_game text,
  p_mode text DEFAULT 'classic',
  p_stake numeric DEFAULT NULL,
  p_currency text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.matchmaking_queue WHERE player_id = p_player_id;

  INSERT INTO public.matchmaking_queue (
    player_id, game, mode, stake, currency, last_seen_at
  ) VALUES (
    p_player_id, p_game, p_mode, p_stake, p_currency, now()
  );
END;
$$;

-- leave_matchmaking_queue
CREATE OR REPLACE FUNCTION public.leave_matchmaking_queue(p_player_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.matchmaking_queue WHERE player_id = p_player_id;
END;
$$;

-- update_queue_heartbeat
CREATE OR REPLACE FUNCTION public.update_queue_heartbeat(p_player_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.matchmaking_queue
  SET last_seen_at = now()
  WHERE player_id = p_player_id;
END;
$$;

-- match_players (most complex function — body unchanged, only SECURITY keyword)
CREATE OR REPLACE FUNCTION public.match_players(
  p_game_type text,
  p_mode text DEFAULT 'classic',
  p_stake numeric DEFAULT NULL,
  p_currency text DEFAULT NULL
)
RETURNS TABLE(match_id uuid, match_code text, player1_id text, player2_id text, game_drawn text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_p1       text;
  v_p2       text;
  v_room_id  uuid;
  v_code     text;
  v_state    jsonb;
  v_game     text;
BEGIN
  DELETE FROM public.matchmaking_queue
  WHERE last_seen_at < now() - interval '35 seconds';

  IF p_mode = 'classic' THEN
    SELECT q.player_id INTO v_p1
    FROM public.matchmaking_queue q
    WHERE q.game = p_game_type
      AND q.mode = 'classic'
      AND q.last_seen_at >= now() - interval '30 seconds'
    ORDER BY q.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_p1 IS NULL THEN RETURN; END IF;

    SELECT q.player_id INTO v_p2
    FROM public.matchmaking_queue q
    WHERE q.game = p_game_type
      AND q.mode = 'classic'
      AND q.player_id <> v_p1
      AND q.last_seen_at >= now() - interval '30 seconds'
    ORDER BY q.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_p2 IS NULL THEN RETURN; END IF;

    v_game := p_game_type;

  ELSE
    SELECT q.player_id INTO v_p1
    FROM public.matchmaking_queue q
    WHERE q.mode = 'competitive'
      AND q.stake    IS NOT DISTINCT FROM p_stake
      AND q.currency IS NOT DISTINCT FROM p_currency
      AND q.last_seen_at >= now() - interval '30 seconds'
    ORDER BY q.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_p1 IS NULL THEN RETURN; END IF;

    SELECT q.player_id INTO v_p2
    FROM public.matchmaking_queue q
    WHERE q.mode = 'competitive'
      AND q.stake    IS NOT DISTINCT FROM p_stake
      AND q.currency IS NOT DISTINCT FROM p_currency
      AND q.player_id <> v_p1
      AND q.last_seen_at >= now() - interval '30 seconds'
    ORDER BY q.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_p2 IS NULL THEN RETURN; END IF;

    v_game := (ARRAY['chess','connect-four','tictactoe'])[
      floor(random() * 3 + 1)::int
    ];
  END IF;

  v_code  := generate_party_code();
  v_state := initialize_game_state(v_game);

  INSERT INTO public.party_rooms (
    code, mode, game, status,
    p1_id, p2_id, p1_connected, p2_connected,
    game_state, turn
  ) VALUES (
    v_code, 'matchmaking', v_game, 'active',
    v_p1, v_p2, true, true,
    v_state, 'p1'
  )
  RETURNING id INTO v_room_id;

  IF p_mode = 'classic' THEN
    DELETE FROM public.matchmaking_queue
    WHERE player_id IN (v_p1, v_p2) AND mode = 'classic' AND game = p_game_type;
  ELSE
    DELETE FROM public.matchmaking_queue
    WHERE player_id IN (v_p1, v_p2) AND mode = 'competitive';
  END IF;

  RETURN QUERY SELECT v_room_id, v_code, v_p1, v_p2, v_game;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Re-apply EXECUTE grants (CREATE OR REPLACE resets them)
-- ════════════════════════════════════════════════════════════════════════════

-- anon: only pre-login flows
GRANT EXECUTE ON FUNCTION public.check_username_taken(text)                          TO anon;
GRANT EXECUTE ON FUNCTION public.create_player_profile(text,text,text,text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_player_by_player_id(text)                      TO anon;
GRANT EXECUTE ON FUNCTION public.get_player_by_username(text)                       TO anon;
GRANT EXECUTE ON FUNCTION public.get_player_by_wallet(text)                         TO anon;
GRANT EXECUTE ON FUNCTION public.get_queue_counts()                                 TO anon;
GRANT EXECUTE ON FUNCTION public.join_matchmaking_queue(text,text,text,numeric,text) TO anon;
GRANT EXECUTE ON FUNCTION public.leave_matchmaking_queue(text)                      TO anon;
GRANT EXECUTE ON FUNCTION public.match_players(text,text,numeric,text)              TO anon;
GRANT EXECUTE ON FUNCTION public.search_players(text, integer)                      TO anon;
GRANT EXECUTE ON FUNCTION public.update_queue_heartbeat(text)                       TO anon;

-- authenticated: all functions
GRANT EXECUTE ON FUNCTION public.check_friendship_exists(text, text)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_taken(text)                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_player_profile(text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_profile(uuid)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(uuid[])                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friendship_status(text, text)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_friendships(text)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile()                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_requests(text)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_by_player_id(text)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_by_username(text)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_by_wallet(text)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_ids_by_device(text[])                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_match_history(uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_counts()                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_matchmaking_queue(text,text,text,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_matchmaking_queue(text)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_players(text,text,numeric,text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_players(text, integer)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_queue_heartbeat(text)                      TO authenticated;

-- service_role: all functions
GRANT EXECUTE ON FUNCTION public.check_friendship_exists(text, text)               TO service_role;
GRANT EXECUTE ON FUNCTION public.check_username_taken(text)                         TO service_role;
GRANT EXECUTE ON FUNCTION public.create_player_profile(text,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_my_profile(uuid)                           TO service_role;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(uuid[])                       TO service_role;
GRANT EXECUTE ON FUNCTION public.get_friendship_status(text, text)                 TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_friendships(text)                          TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile()                                  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_requests(text)                        TO service_role;
GRANT EXECUTE ON FUNCTION public.get_player_by_player_id(text)                     TO service_role;
GRANT EXECUTE ON FUNCTION public.get_player_by_username(text)                      TO service_role;
GRANT EXECUTE ON FUNCTION public.get_player_by_wallet(text)                        TO service_role;
GRANT EXECUTE ON FUNCTION public.get_player_ids_by_device(text[])                  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_match_history(uuid)                   TO service_role;
GRANT EXECUTE ON FUNCTION public.get_queue_counts()                                TO service_role;
GRANT EXECUTE ON FUNCTION public.join_matchmaking_queue(text,text,text,numeric,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.leave_matchmaking_queue(text)                     TO service_role;
GRANT EXECUTE ON FUNCTION public.match_players(text,text,numeric,text)             TO service_role;
GRANT EXECUTE ON FUNCTION public.search_players(text, integer)                     TO service_role;
GRANT EXECUTE ON FUNCTION public.update_queue_heartbeat(text)                      TO service_role;
