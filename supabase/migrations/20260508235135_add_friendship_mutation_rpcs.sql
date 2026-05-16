/*
  # Add friendship mutation RPC functions

  ## Problem
  The friendships table RLS INSERT/UPDATE/DELETE policies require session-level
  GUC variables (app.current_wallet / app.player_id) that the frontend Supabase
  JS client never sets. This caused all direct insert/update/delete calls on the
  friendships table to fail silently with an RLS violation.

  ## Solution
  Add three SECURITY DEFINER RPC functions that bypass RLS and perform their own
  validation using the caller-supplied player IDs. The read-only functions
  (check_friendship_exists, get_friendship_status, get_my_friendships,
  get_pending_requests) already exist and work correctly.

  ## New functions
  1. send_friend_request(requester_id, receiver_id) — insert a pending row
     - Validates requester ≠ receiver
     - Prevents duplicate requests (either direction)
     - Returns: 'ok', 'self', 'duplicate', 'already_friends'
  2. accept_friend_request(friendship_id, acceptor_id) — set status='accepted'
     - Validates acceptor is the receiver of the row
  3. remove_friend(player_a_id, player_b_id) — delete friendship in either direction
*/

-- ── 1. send_friend_request ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.send_friend_request(
  p_requester_id text,
  p_receiver_id  text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.friendships%ROWTYPE;
BEGIN
  -- Prevent self-request
  IF p_requester_id = p_receiver_id THEN
    RETURN 'self';
  END IF;

  -- Check for existing relationship in either direction
  SELECT * INTO v_existing
  FROM public.friendships
  WHERE (requester_id = p_requester_id AND receiver_id = p_receiver_id)
     OR (requester_id = p_receiver_id  AND receiver_id = p_requester_id)
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.status = 'accepted' THEN
      RETURN 'already_friends';
    ELSE
      RETURN 'duplicate';
    END IF;
  END IF;

  INSERT INTO public.friendships (requester_id, receiver_id, status)
  VALUES (p_requester_id, p_receiver_id, 'pending');

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_friend_request(text, text) TO anon, authenticated;

-- ── 2. accept_friend_request ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_friend_request(
  p_friendship_id uuid,
  p_acceptor_id   text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.friendships%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.friendships
  WHERE id = p_friendship_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Only the receiver may accept
  IF v_row.receiver_id <> p_acceptor_id THEN
    RETURN 'unauthorized';
  END IF;

  UPDATE public.friendships
  SET status = 'accepted'
  WHERE id = p_friendship_id;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid, text) TO anon, authenticated;

-- ── 3. remove_friend ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.remove_friend(
  p_player_a_id text,
  p_player_b_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.friendships
  WHERE (requester_id = p_player_a_id AND receiver_id = p_player_b_id)
     OR (requester_id = p_player_b_id AND receiver_id = p_player_a_id);

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_friend(text, text) TO anon, authenticated;
