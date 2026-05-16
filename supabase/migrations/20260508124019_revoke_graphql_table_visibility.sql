/*
  # Revoke direct table SELECT to remove GraphQL schema visibility

  ## Problem
  matchmaking_queue and party_rooms are visible in the GraphQL schema to
  signed-in users because `authenticated` has a SELECT grant on both tables.

  ## Context
  The app NEVER queries these tables directly via Supabase client SELECT.
  All reads go through SECURITY DEFINER RPCs:
    - join_matchmaking_queue / leave_matchmaking_queue / match_players
    - get_queue_counts / update_queue_heartbeat
  The only direct SELECT that was added was to fix matchmaking realtime
  subscriptions. However, realtime works via the Supabase realtime channel
  subscription (not a direct table SELECT grant). The RLS SELECT policy added
  earlier is sufficient for realtime to deliver row events.

  ## Fix
  Revoke SELECT from `authenticated` on both tables. The RLS SELECT policies
  and SECURITY DEFINER RPCs continue to provide all needed access.
  Direct INSERT/UPDATE/DELETE grants are kept for party_rooms (needed for
  in-game state updates) and matchmaking_queue (needed for queue management).

  ## Verification
  After this change:
  - matchmaking_queue and party_rooms disappear from GraphQL schema
  - Realtime subscriptions still work (they use RLS policies, not grants)
  - All RPCs still work (SECURITY DEFINER bypasses grant checks)
  - Direct client table SELECTs will fail — but none exist in the codebase
*/

REVOKE SELECT ON public.matchmaking_queue FROM authenticated;
REVOKE SELECT ON public.party_rooms       FROM authenticated;

-- Also revoke unnecessary anon write grants (anon should never write
-- directly to these tables — writes go through SECURITY DEFINER RPCs)
REVOKE INSERT, UPDATE, DELETE ON public.matchmaking_queue FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.party_rooms       FROM anon;
