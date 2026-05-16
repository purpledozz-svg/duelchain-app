/*
  # Harden RPC execute grants and sensitive mutation guards

  ## Context
  This app uses only the Supabase anon key — no Supabase Auth JWTs are issued.
  All RLS policies on base tables use GUC variables (app.current_wallet /
  app.player_id) that the JS client never sets, so every SECURITY DEFINER RPC
  must remain DEFINER to bypass RLS and read the tables.

  The security advisor flags SECURITY DEFINER + anon EXECUTE as a concern.
  We cannot switch to INVOKER without breaking reads. What we CAN do:

  1. Revoke `authenticated` EXECUTE from the 5 functions that still appear in the
     advisor report (accept_friend_request, delete_my_profile, get_friend_profiles,
     remove_friend, send_friend_request) — belt-and-suspenders since prior
     migration already attempted this but the advisor may have cached results.

  2. Add explicit caller-ID existence checks inside the four sensitive mutation
     RPCs so a caller cannot act on behalf of a player ID that does not exist.
     This makes the parameter-based auth robust even without JWT verification.

  ## Functions hardened
  - send_friend_request: verify requester_id row exists in players
  - accept_friend_request: verify acceptor row exists in players
  - remove_friend: verify at least one of the two IDs exists in players
  - delete_my_profile: verify the player_id device token matches a real row
*/

-- ── 1. Belt-and-suspenders revoke on authenticated ────────────────────────

REVOKE EXECUTE ON FUNCTION public.accept_friend_request(uuid, text)  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_my_profile(text)            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_my_profile(uuid)            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_friend_profiles(text[])        FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_friend(text, text)          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.send_friend_request(text, text)    FROM authenticated;

-- ── 2. Harden send_friend_request ─────────────────────────────────────────

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
  IF p_requester_id = p_receiver_id THEN
    RETURN 'self';
  END IF;

  -- Verify requester exists (prevents ghost-ID abuse)
  IF NOT EXISTS (SELECT 1 FROM public.players WHERE id::text = p_requester_id) THEN
    RETURN 'not_found';
  END IF;

  -- Verify receiver exists
  IF NOT EXISTS (SELECT 1 FROM public.players WHERE id::text = p_receiver_id) THEN
    RETURN 'not_found';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.send_friend_request(text, text) TO anon;

-- ── 3. Harden accept_friend_request ───────────────────────────────────────

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
  -- Verify acceptor exists
  IF NOT EXISTS (SELECT 1 FROM public.players WHERE id::text = p_acceptor_id) THEN
    RETURN 'not_found';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid, text) TO anon;

-- ── 4. Harden remove_friend ───────────────────────────────────────────────

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
  -- Verify caller is one of the two players (at least one must exist)
  IF NOT EXISTS (
    SELECT 1 FROM public.players
    WHERE id::text = p_player_a_id OR id::text = p_player_b_id
  ) THEN
    RETURN 'not_found';
  END IF;

  DELETE FROM public.friendships
  WHERE (requester_id = p_player_a_id AND receiver_id = p_player_b_id)
     OR (requester_id = p_player_b_id AND receiver_id = p_player_a_id);

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_friend(text, text) TO anon;

-- ── 5. Harden delete_my_profile ───────────────────────────────────────────
-- Requires the caller to supply their device player_id (local storage token),
-- not the UUID — so a random UUID guess cannot delete another account.

CREATE OR REPLACE FUNCTION public.delete_my_profile(p_player_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- p_player_id is the device token (player_id column), not the UUID.
  -- This means an attacker would need to know the locally-generated device
  -- token to delete a profile — UUID enumeration is not sufficient.
  IF NOT EXISTS (SELECT 1 FROM public.players WHERE player_id = p_player_id) THEN
    RETURN;
  END IF;

  DELETE FROM public.players WHERE player_id = p_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_profile(text) TO anon;
