/*
  # Fix friendship read RPCs — convert to SECURITY DEFINER

  ## Problem
  The SELECT grant on public.friendships was revoked from anon and authenticated
  roles in a prior migration (safe_views_rpcs_revoke_select). The four read-only
  friendship RPC functions were created WITHOUT SECURITY DEFINER, so they run as
  the calling role (anon/authenticated) and fail silently with 0 rows because
  that role has no SELECT privilege on the table.

  The three mutation RPCs (send_friend_request, accept_friend_request,
  remove_friend) were already SECURITY DEFINER and work correctly.

  ## Fix
  Replace get_pending_requests, get_my_friendships, get_friendship_status, and
  check_friendship_exists with identical logic but SECURITY DEFINER so they
  execute as the function owner (postgres) and can read friendships freely.

  No schema changes. No data changes. No RLS changes.
*/

-- ── get_pending_requests ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_pending_requests(p_player_id text)
RETURNS SETOF public.friendships
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.friendships
  WHERE receiver_id = p_player_id AND status = 'pending';
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_requests(text) TO anon, authenticated;

-- ── get_my_friendships ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_friendships(p_player_id text)
RETURNS SETOF public.friendships
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.friendships
  WHERE (requester_id = p_player_id OR receiver_id = p_player_id)
    AND status = 'accepted';
$$;

GRANT EXECUTE ON FUNCTION public.get_my_friendships(text) TO anon, authenticated;

-- ── get_friendship_status ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_friendship_status(p_my_id text, p_their_id text)
RETURNS SETOF public.friendships
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.friendships
  WHERE (requester_id = p_my_id    AND receiver_id = p_their_id)
     OR (requester_id = p_their_id AND receiver_id = p_my_id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_friendship_status(text, text) TO anon, authenticated;

-- ── check_friendship_exists ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_friendship_exists(p_requester_id text, p_receiver_id text)
RETURNS SETOF public.friendships
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.friendships
  WHERE (requester_id = p_requester_id AND receiver_id = p_receiver_id)
     OR (requester_id = p_receiver_id  AND receiver_id = p_requester_id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_friendship_exists(text, text) TO anon, authenticated;
