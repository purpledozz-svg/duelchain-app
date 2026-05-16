/*
  # Fix all reader RPCs — convert to SECURITY DEFINER

  ## Problem
  A prior migration (safe_views_rpcs_revoke_select) revoked SELECT on base tables
  from anon and authenticated roles, but the reader RPC functions were created
  WITHOUT SECURITY DEFINER. They run as the calling role and silently return 0
  rows because that role can no longer SELECT the underlying tables.

  ## Fix
  Recreate every reader/writer RPC with SECURITY DEFINER. Drop+recreate where
  the return type changes (get_friend_profiles gains rp/peak_rp columns and a
  text[] overload). Logic is otherwise unchanged.
*/

-- ── Player lookup RPCs ────────────────────────────────────────────────────

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

-- ── get_friend_profiles — drop old signature, recreate with text[] + rp ──
-- The old uuid[] version returned 8 columns; new text[] version returns 10.
-- Drop both overloads and recreate cleanly.

DROP FUNCTION IF EXISTS public.get_friend_profiles(uuid[]);

-- text[] overload — requester_id/receiver_id are stored as text, no casting needed
CREATE OR REPLACE FUNCTION public.get_friend_profiles(p_ids text[])
RETURNS TABLE (
  id             uuid,
  username       text,
  username_lower text,
  total_games    int,
  total_wins     int,
  created_at     timestamptz,
  bio            text,
  avatar_url     text,
  rp             int,
  peak_rp        int
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, username, username_lower, total_games, total_wins, created_at, bio, avatar_url, rp, peak_rp
  FROM public.players
  WHERE id::text = ANY(p_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(text[]) TO anon, authenticated;

-- ── Profile mutations ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_player_profile(
  p_username       text,
  p_username_lower text,
  p_player_id      text,
  p_password_hash  text,
  p_wallet_address text DEFAULT '',
  p_bio            text DEFAULT ''
)
RETURNS SETOF public.players
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.players WHERE username_lower = p_username_lower) THEN
    RAISE EXCEPTION 'USERNAME_TAKEN';
  END IF;

  RETURN QUERY
  INSERT INTO public.players (username, username_lower, player_id, password_hash, wallet_address, bio)
  VALUES (p_username, p_username_lower, p_player_id, p_password_hash, p_wallet_address, p_bio)
  RETURNING *;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_player_profile(text, text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_my_profile(p_player_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.players WHERE player_id = p_player_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_my_profile(text) TO anon, authenticated;

-- ── Match history ─────────────────────────────────────────────────────────

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
