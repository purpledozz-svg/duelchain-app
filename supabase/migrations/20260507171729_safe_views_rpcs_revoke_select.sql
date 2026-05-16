/*
  # Safe views, RPC functions, and revoke broad SELECT grants

  ## Goal
  Remove 12 remaining GraphQL schema visibility warnings by:
  1. Creating safe public views for data the UI needs publicly
  2. Creating SECURITY DEFINER RPC functions for private/user-specific reads
  3. Revoking direct SELECT on base tables from anon and authenticated

  ## Safe public views (anon + authenticated can SELECT)
  - player_public_profiles  — public profile info (no password_hash/player_id/wallet_address)
  - leaderboard_overall     — top earners, safe fields only
  - leaderboard_ranked      — top by RP
  - leaderboard_game_stats  — per-game stats joined with player public info

  ## RPC functions (SECURITY DEFINER, identity via session GUC)
  - get_my_profile()
  - get_player_by_wallet(wallet)
  - get_player_by_player_id(device_id)
  - get_player_by_username(username)
  - check_username_taken(username) → bool
  - search_players(query, limit)
  - get_player_ids_by_device(ids[])
  - get_friend_profiles(ids uuid[])
  - get_my_friendships(player_id)
  - get_pending_requests(player_id)
  - get_friendship_status(my_id, their_id)
  - check_friendship_exists(requester_id, receiver_id)
  - get_profile_match_history(player_uuid)

  ## Revokes
  - anon SELECT on: players, game_stats, matches, monthly_prizes
  - authenticated SELECT on: players, game_stats, matches, matchmaking_queue,
    monthly_prizes, party_rooms, friendships, rank_history
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. SAFE PUBLIC VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.player_public_profiles AS
SELECT
  id,
  username,
  username_lower,
  avatar_url,
  bio,
  rp,
  peak_rp,
  win_streak,
  competitive_wins,
  competitive_losses,
  total_games,
  total_wins,
  total_losses,
  total_earned_usd,
  created_at
FROM public.players;

GRANT SELECT ON public.player_public_profiles TO anon, authenticated;

-- Leaderboard: overall (top earners)
CREATE OR REPLACE VIEW public.leaderboard_overall AS
SELECT
  id,
  username,
  avatar_url,
  rp,
  total_games,
  total_wins,
  total_losses,
  total_earned_usd,
  wallet_address
FROM public.players
ORDER BY total_earned_usd DESC NULLS LAST
LIMIT 50;

GRANT SELECT ON public.leaderboard_overall TO anon, authenticated;

-- Leaderboard: ranked (top by RP)
CREATE OR REPLACE VIEW public.leaderboard_ranked AS
SELECT
  id,
  username,
  avatar_url,
  rp,
  peak_rp,
  competitive_wins,
  competitive_losses,
  total_earned_usd,
  wallet_address
FROM public.players
ORDER BY rp DESC NULLS LAST
LIMIT 50;

GRANT SELECT ON public.leaderboard_ranked TO anon, authenticated;

-- Leaderboard: per-game stats joined with safe player info
-- game_stats columns: id, player_id, game_type, month, games_played, wins, losses, total_earned_usd, rank
CREATE OR REPLACE VIEW public.leaderboard_game_stats AS
SELECT
  gs.id,
  gs.player_id    AS player_db_id,
  gs.game_type,
  gs.month,
  gs.games_played,
  gs.wins,
  gs.losses,
  gs.total_earned_usd AS earned_usd,
  p.username,
  p.avatar_url,
  p.wallet_address
FROM public.game_stats gs
JOIN public.players p ON p.id = gs.player_id;

GRANT SELECT ON public.leaderboard_game_stats TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RPC FUNCTIONS (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.players
LANGUAGE sql SECURITY DEFINER SET search_path = public
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
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_player_by_wallet(p_wallet text)
RETURNS SETOF public.players
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.players WHERE wallet_address = p_wallet LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_player_by_wallet(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_player_by_player_id(p_device_id text)
RETURNS SETOF public.players
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.players WHERE player_id = p_device_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_player_by_player_id(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_player_by_username(p_username text)
RETURNS SETOF public.players
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.players WHERE username_lower = lower(p_username) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_player_by_username(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_username_taken(p_username text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players
    WHERE username_lower = lower(p_username) OR username = p_username
  );
$$;
GRANT EXECUTE ON FUNCTION public.check_username_taken(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_players(p_query text, p_limit int DEFAULT 10)
RETURNS TABLE (
  id             uuid,
  username       text,
  username_lower text,
  total_games    int,
  total_wins     int,
  created_at     timestamptz,
  bio            text,
  avatar_url     text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, username, username_lower, total_games, total_wins, created_at, bio, avatar_url
  FROM public.players
  WHERE username_lower ILIKE (lower(p_query) || '%')
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.search_players(text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_player_ids_by_device(p_device_ids text[])
RETURNS TABLE (id uuid, player_id text)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, player_id FROM public.players WHERE player_id = ANY(p_device_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_player_ids_by_device(text[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_friend_profiles(p_ids uuid[])
RETURNS TABLE (
  id             uuid,
  username       text,
  username_lower text,
  total_games    int,
  total_wins     int,
  created_at     timestamptz,
  bio            text,
  avatar_url     text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, username, username_lower, total_games, total_wins, created_at, bio, avatar_url
  FROM public.players
  WHERE id = ANY(p_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_friendships(p_player_id text)
RETURNS SETOF public.friendships
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.friendships
  WHERE (requester_id = p_player_id OR receiver_id = p_player_id)
    AND status = 'accepted';
$$;
GRANT EXECUTE ON FUNCTION public.get_my_friendships(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_pending_requests(p_player_id text)
RETURNS SETOF public.friendships
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.friendships
  WHERE receiver_id = p_player_id AND status = 'pending';
$$;
GRANT EXECUTE ON FUNCTION public.get_pending_requests(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_friendship_status(p_my_id text, p_their_id text)
RETURNS SETOF public.friendships
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.friendships
  WHERE (requester_id = p_my_id    AND receiver_id = p_their_id)
     OR (requester_id = p_their_id AND receiver_id = p_my_id)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_friendship_status(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_friendship_exists(p_requester_id text, p_receiver_id text)
RETURNS SETOF public.friendships
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.friendships
  WHERE (requester_id = p_requester_id AND receiver_id = p_receiver_id)
     OR (requester_id = p_receiver_id  AND receiver_id = p_requester_id)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.check_friendship_exists(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_match_history(p_player_uuid uuid)
RETURNS SETOF public.party_rooms
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.party_rooms
  WHERE (p1_id = p_player_uuid::text OR p2_id = p_player_uuid::text)
    AND status = 'finished'
  ORDER BY created_at DESC
  LIMIT 10;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_match_history(uuid) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. REVOKE DIRECT SELECT FROM BASE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE SELECT ON public.players           FROM anon;
REVOKE SELECT ON public.game_stats        FROM anon;
REVOKE SELECT ON public.matches           FROM anon;
REVOKE SELECT ON public.monthly_prizes    FROM anon;

REVOKE SELECT ON public.players           FROM authenticated;
REVOKE SELECT ON public.game_stats        FROM authenticated;
REVOKE SELECT ON public.matches           FROM authenticated;
REVOKE SELECT ON public.matchmaking_queue FROM authenticated;
REVOKE SELECT ON public.monthly_prizes    FROM authenticated;
REVOKE SELECT ON public.party_rooms       FROM authenticated;
REVOKE SELECT ON public.friendships       FROM authenticated;
REVOKE SELECT ON public.rank_history      FROM authenticated;

-- Drop now-redundant broad SELECT RLS policies
DROP POLICY IF EXISTS "Anyone can read player profiles"             ON public.players;
DROP POLICY IF EXISTS "Anyone can view player profiles"             ON public.players;
DROP POLICY IF EXISTS "Anyone can read game stats"                  ON public.game_stats;
DROP POLICY IF EXISTS "Anyone can read matches"                     ON public.matches;
DROP POLICY IF EXISTS "Anyone can read monthly prizes"              ON public.monthly_prizes;
DROP POLICY IF EXISTS "Authenticated players can read queue"        ON public.matchmaking_queue;
DROP POLICY IF EXISTS "Authenticated players can read party rooms"  ON public.party_rooms;
DROP POLICY IF EXISTS "Authenticated users can read rank history"   ON public.rank_history;
