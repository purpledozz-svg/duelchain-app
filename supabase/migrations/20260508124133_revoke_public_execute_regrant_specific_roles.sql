/*
  # Revoke EXECUTE from PUBLIC on all SECURITY DEFINER functions
  # then re-grant only to the roles that legitimately need each function.

  ## Why the previous migration did not fully work
  All functions were granted to PUBLIC (the default), which includes every role
  including anon. REVOKE FROM anon does not override a PUBLIC grant.
  The only effective fix is REVOKE FROM PUBLIC, then explicit re-grants.

  ## Grant matrix (anon = unauthenticated device-ID users in this app)

  Functions anon legitimately needs:
  - check_username_taken        (profile creation flow)
  - create_player_profile       (profile creation flow)
  - get_player_by_player_id     (startup: load profile by device ID)
  - get_player_by_username      (public profile lookup)
  - get_player_by_wallet        (wallet-based login lookup)
  - get_queue_counts            (lobby shows counts before login)
  - join_matchmaking_queue      (device-auth app, no JWT)
  - leave_matchmaking_queue     (device-auth app, no JWT)
  - match_players               (device-auth app, no JWT)
  - search_players              (public player search)
  - update_queue_heartbeat      (device-auth app, no JWT)

  Functions authenticated-only:
  - check_friendship_exists
  - delete_my_profile
  - get_friend_profiles
  - get_friendship_status
  - get_my_friendships
  - get_my_profile
  - get_pending_requests
  - get_player_ids_by_device
  - get_profile_match_history
*/

-- ── Step 1: Revoke EXECUTE from PUBLIC on all SECURITY DEFINER functions ──────

REVOKE EXECUTE ON FUNCTION public.check_friendship_exists(text, text)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_username_taken(text)                        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_player_profile(text,text,text,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_my_profile(uuid)                          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_friend_profiles(uuid[])                      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_friendship_status(text, text)                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_friendships(text)                         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_profile()                                 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pending_requests(text)                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_player_by_player_id(text)                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_player_by_username(text)                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_player_by_wallet(text)                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_player_ids_by_device(text[])                 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_profile_match_history(uuid)                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_queue_counts()                               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_matchmaking_queue(text,text,text,numeric,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.leave_matchmaking_queue(text)                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_players(text,text,numeric,text)            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_players(text, integer)                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_queue_heartbeat(text)                     FROM PUBLIC;

-- ── Step 2: Re-grant to anon for functions needed before authentication ────────

GRANT EXECUTE ON FUNCTION public.check_username_taken(text)                         TO anon;
GRANT EXECUTE ON FUNCTION public.create_player_profile(text,text,text,text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_player_by_player_id(text)                     TO anon;
GRANT EXECUTE ON FUNCTION public.get_player_by_username(text)                      TO anon;
GRANT EXECUTE ON FUNCTION public.get_player_by_wallet(text)                        TO anon;
GRANT EXECUTE ON FUNCTION public.get_queue_counts()                                TO anon;
GRANT EXECUTE ON FUNCTION public.join_matchmaking_queue(text,text,text,numeric,text) TO anon;
GRANT EXECUTE ON FUNCTION public.leave_matchmaking_queue(text)                     TO anon;
GRANT EXECUTE ON FUNCTION public.match_players(text,text,numeric,text)             TO anon;
GRANT EXECUTE ON FUNCTION public.search_players(text, integer)                     TO anon;
GRANT EXECUTE ON FUNCTION public.update_queue_heartbeat(text)                      TO anon;

-- ── Step 3: Grant all functions to authenticated ───────────────────────────────

GRANT EXECUTE ON FUNCTION public.check_friendship_exists(text, text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_taken(text)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_player_profile(text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_profile(uuid)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(uuid[])                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friendship_status(text, text)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_friendships(text)                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile()                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_requests(text)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_by_player_id(text)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_by_username(text)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_by_wallet(text)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_ids_by_device(text[])                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_match_history(uuid)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_counts()                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_matchmaking_queue(text,text,text,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_matchmaking_queue(text)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_players(text,text,numeric,text)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_players(text, integer)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_queue_heartbeat(text)                     TO authenticated;

-- ── Step 4: Ensure service_role keeps access (bypasses RLS but needs EXECUTE) ──

GRANT EXECUTE ON FUNCTION public.check_friendship_exists(text, text)              TO service_role;
GRANT EXECUTE ON FUNCTION public.check_username_taken(text)                        TO service_role;
GRANT EXECUTE ON FUNCTION public.create_player_profile(text,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_my_profile(uuid)                          TO service_role;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(uuid[])                      TO service_role;
GRANT EXECUTE ON FUNCTION public.get_friendship_status(text, text)                TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_friendships(text)                         TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile()                                 TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_requests(text)                       TO service_role;
GRANT EXECUTE ON FUNCTION public.get_player_by_player_id(text)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.get_player_by_username(text)                     TO service_role;
GRANT EXECUTE ON FUNCTION public.get_player_by_wallet(text)                       TO service_role;
GRANT EXECUTE ON FUNCTION public.get_player_ids_by_device(text[])                 TO service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_match_history(uuid)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_queue_counts()                               TO service_role;
GRANT EXECUTE ON FUNCTION public.join_matchmaking_queue(text,text,text,numeric,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.leave_matchmaking_queue(text)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.match_players(text,text,numeric,text)            TO service_role;
GRANT EXECUTE ON FUNCTION public.search_players(text, integer)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.update_queue_heartbeat(text)                     TO service_role;
