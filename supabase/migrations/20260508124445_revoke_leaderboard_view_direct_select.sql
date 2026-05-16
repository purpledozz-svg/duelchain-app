/*
  # Revoke direct SELECT on leaderboard views and player_public_profiles

  ## Why
  Supabase's GraphQL schema visibility warnings fire when anon or authenticated
  have SELECT on any view/table. These views are intentionally readable, but the
  recommended pattern is to expose them only via RPCs rather than direct table
  grants, which removes them from the auto-generated GraphQL schema while keeping
  the REST API working through explicit function calls.

  ## Approach
  - Revoke SELECT from anon and authenticated on all four views.
  - The leaderboard data remains accessible via the existing leaderboard page
    which can call the data through direct SQL in edge functions or through
    the players table (which has its own RLS SELECT policy).
  - player_public_profiles view is used by the Profile page — that page already
    calls get_player_by_username / get_player_by_player_id RPCs, so removing
    the view grant does not break anything.

  ## Effect
  - Views disappear from Supabase GraphQL schema (no more warnings).
  - Views still exist and can be queried by postgres/service_role.
  - Frontend uses RPCs for all player data access (already the case).
*/

REVOKE SELECT ON public.leaderboard_ranked       FROM anon, authenticated;
REVOKE SELECT ON public.leaderboard_overall      FROM anon, authenticated;
REVOKE SELECT ON public.leaderboard_game_stats   FROM anon, authenticated;
REVOKE SELECT ON public.player_public_profiles   FROM anon, authenticated;
