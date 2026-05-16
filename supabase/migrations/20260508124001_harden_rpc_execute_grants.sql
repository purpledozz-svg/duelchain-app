/*
  # Harden SECURITY DEFINER function EXECUTE grants

  ## Problem
  All SECURITY DEFINER RPCs are executable by the `anon` role. Some of these
  functions are sensitive (delete profile, friendship management, match-making
  actions) and should only be callable by authenticated players or in specific
  contexts.

  ## Decision per function

  ### Keep anon EXECUTE (legitimately needed before sign-in):
  - check_username_taken     — needed during profile creation
  - create_player_profile    — creates the profile (device-ID-based, pre-auth)
  - get_player_by_player_id  — app loads profile on startup using local device ID
  - get_player_by_username   — public profile lookup
  - get_player_by_wallet     — wallet-based login lookup
  - get_queue_counts         — lobby shows queue count before login
  - search_players           — public player search
  - join_matchmaking_queue   — matchmaking works without Supabase auth
  - leave_matchmaking_queue  — matchmaking works without Supabase auth
  - match_players            — polling match check (device-auth app)
  - update_queue_heartbeat   — keeps queue row alive (device-auth app)

  ### Revoke anon EXECUTE (require authenticated):
  - check_friendship_exists  — requires knowing both player IDs (social feature)
  - delete_my_profile        — destructive, must be authenticated
  - get_friend_profiles      — social feature, authenticated only
  - get_friendship_status    — social feature, authenticated only
  - get_my_friendships       — social feature, authenticated only
  - get_my_profile           — reads own private profile row
  - get_pending_requests     — social feature, authenticated only
  - get_player_ids_by_device — bulk lookup of device IDs (internal use)
  - get_profile_match_history — private match history

  ## Notes
  - This is a device-ID-authenticated app (no Supabase Auth JWT for most users).
    The "anon" role is used for all unauthenticated Supabase client calls, which
    includes the matchmaking and profile-creation flows. Revoking too aggressively
    would break the app.
  - Functions that process device/player IDs passed as arguments need anon access
    because the app is not JWT-authenticated.
  - Functions exposing aggregated/already-public data are fine for anon.
*/

-- ── Revoke anon EXECUTE from sensitive social/private functions ───────────────

REVOKE EXECUTE ON FUNCTION public.check_friendship_exists(text, text)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_my_profile(uuid)                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_friend_profiles(uuid[])               FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_friendship_status(text, text)         FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_friendships(text)                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_profile()                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_requests(text)                FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_player_ids_by_device(text[])          FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_profile_match_history(uuid)           FROM anon;

-- ── Ensure authenticated retains EXECUTE on all functions ────────────────────
-- (Some may have already been granted via PUBLIC; this is explicit belt-and-suspenders)

GRANT EXECUTE ON FUNCTION public.check_friendship_exists(text, text)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_taken(text)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_player_profile(text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_profile(uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(uuid[])               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friendship_status(text, text)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_friendships(text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile()                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_requests(text)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_by_player_id(text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_by_username(text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_by_wallet(text)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_ids_by_device(text[])          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_match_history(uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_counts()                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_matchmaking_queue(text,text,text,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_matchmaking_queue(text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_players(text,text,numeric,text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_players(text, integer)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_queue_heartbeat(text)              TO authenticated;
