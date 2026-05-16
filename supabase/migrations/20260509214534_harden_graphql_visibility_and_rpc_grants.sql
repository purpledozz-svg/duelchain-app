/*
  # Harden GraphQL visibility and RPC execute grants

  ## Context
  This app does NOT use Supabase Auth. Every frontend request uses the anon key.
  The `authenticated` role is never exercised by any frontend code. All business
  logic and access control lives inside SECURITY DEFINER RPC functions.

  ## Changes

  ### 1. Revoke direct SELECT on base tables from anon + authenticated
  players, matchmaking_queue, and party_rooms were still SELECT-able, making them
  visible in the GraphQL schema. All reads go through SECURITY DEFINER RPCs or
  safe public views — direct table access is not needed.

  ### 2. Revoke ALL grants from `authenticated`
  The role is never used. Keeping grants on it just widens the attack surface.
  Revoked: SELECT (where still present), INSERT, UPDATE, DELETE on all tables,
  and EXECUTE on every RPC.

  ### 3. Revoke anon EXECUTE from internal-only RPCs
  Cleanup, cron, and internal utility functions that the frontend never calls
  directly have anon EXECUTE revoked. They are only called server-side.
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Revoke direct SELECT on base tables
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE SELECT ON public.players           FROM anon, authenticated;
REVOKE SELECT ON public.matchmaking_queue FROM anon, authenticated;
REVOKE SELECT ON public.party_rooms       FROM anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Revoke all grants from `authenticated` (unused role)
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE INSERT, UPDATE, DELETE ON public.players           FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.matchmaking_queue FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.party_rooms       FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.friendships       FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.game_stats        FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.matches           FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.monthly_prizes    FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rank_history      FROM authenticated;

-- EXECUTE grants for authenticated — revoke all
REVOKE EXECUTE ON FUNCTION public.accept_friend_request(uuid, text)                      FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_rematch(text, text)                             FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_friendship_exists(text, text)                    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_username_taken(text)                             FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_parties()                              FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_party_rooms()                          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_queue_entries()                          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_party_room(text, text)                          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_player_profile(text, text, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.decline_rematch(text, text)                            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_my_profile(text)                                FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_my_profile(uuid)                                FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_party_code()                                  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_friend_profiles(text[])                            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_friendship_status(text, text)                      FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_friendships(text)                               FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_profile()                                       FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_pending_requests(text)                             FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_player_by_player_id(text)                          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_player_by_username(text)                           FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_player_by_wallet(text)                             FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_player_ids_by_device(text[])                       FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profile_match_history(uuid)                        FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_queue_counts()                                     FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.initialize_game_state(text)                            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.join_matchmaking_queue(text, text, text, numeric, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.leave_matchmaking_queue(text)                          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.match_players(text, text, numeric, text)               FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_friend(text, text)                              FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.request_rematch(text, text)                            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.search_players(text, int)                              FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.send_friend_request(text, text)                        FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_queue_heartbeat(text)                           FROM authenticated;

-- update_game_stats, update_matchmaking_heartbeat, update_player_stats have no args
REVOKE EXECUTE ON FUNCTION public.update_game_stats()                    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_matchmaking_heartbeat()         FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_player_stats()                  FROM authenticated;

-- matchmake_player has two overloads
REVOKE EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text)             FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.matchmake_player(text, text, text, numeric, text, text)       FROM authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Revoke anon EXECUTE from internal-only / cron RPCs
-- ═══════════════════════════════════════════════════════════════════════════

-- These are never called by the frontend directly
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_parties()       FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_party_rooms()   FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_queue_entries()   FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_players(text, text, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_party_code()           FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_game_stats()             FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_matchmaking_heartbeat()  FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_player_stats()           FROM anon;
