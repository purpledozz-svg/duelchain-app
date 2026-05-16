/*
  # Fix Security Definer Views

  ## Problem
  All four views (leaderboard_ranked, leaderboard_overall, leaderboard_game_stats,
  player_public_profiles) are defined with SECURITY DEFINER, meaning they run with
  the privileges of the view owner (postgres) rather than the calling role. This
  bypasses RLS and allows privilege escalation.

  ## Fix
  Recreate every view with SECURITY INVOKER (the PostgreSQL default for views when
  no explicit security qualifier is set). This means the calling role's own grants
  and RLS policies govern what rows they can see.

  ## GraphQL visibility
  The leaderboard views are intentionally public (accessible without signing in is
  fine for a public leaderboard). player_public_profiles however should only be
  readable by authenticated users — revoke anon SELECT.

  ## Notes
  - Views are dropped and recreated; no data is lost (views contain no data).
  - Grants are re-applied to exactly the minimum needed.
*/

-- ── Drop existing views ───────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.leaderboard_ranked;
DROP VIEW IF EXISTS public.leaderboard_overall;
DROP VIEW IF EXISTS public.leaderboard_game_stats;
DROP VIEW IF EXISTS public.player_public_profiles;

-- ── Recreate views with SECURITY INVOKER (default) ───────────────────────────

-- Public leaderboard: top 50 by RP.
-- wallet_address is intentionally excluded — unnecessary PII for a leaderboard.
CREATE VIEW public.leaderboard_ranked
  WITH (security_invoker = true)
AS
SELECT id, username, avatar_url, rp, peak_rp,
       competitive_wins, competitive_losses, total_earned_usd
FROM public.players
ORDER BY rp DESC NULLS LAST
LIMIT 50;

-- Public leaderboard: top 50 by total earnings.
CREATE VIEW public.leaderboard_overall
  WITH (security_invoker = true)
AS
SELECT id, username, avatar_url, rp,
       total_games, total_wins, total_losses, total_earned_usd
FROM public.players
ORDER BY total_earned_usd DESC NULLS LAST
LIMIT 50;

-- Game-level leaderboard stats.
CREATE VIEW public.leaderboard_game_stats
  WITH (security_invoker = true)
AS
SELECT gs.id, gs.player_id AS player_db_id, gs.game_type, gs.month,
       gs.games_played, gs.wins, gs.losses, gs.total_earned_usd AS earned_usd,
       p.username, p.avatar_url
FROM public.game_stats gs
JOIN public.players p ON p.id = gs.player_id;

-- Public player profiles — no wallet_address, no password_hash.
CREATE VIEW public.player_public_profiles
  WITH (security_invoker = true)
AS
SELECT id, username, username_lower, avatar_url, bio, rp, peak_rp, win_streak,
       competitive_wins, competitive_losses,
       total_games, total_wins, total_losses,
       total_earned_usd, created_at
FROM public.players;

-- ── Revoke all existing grants then re-grant minimally ───────────────────────

-- leaderboard views: public leaderboard — anon + authenticated may SELECT
REVOKE ALL ON public.leaderboard_ranked       FROM anon, authenticated;
REVOKE ALL ON public.leaderboard_overall      FROM anon, authenticated;
REVOKE ALL ON public.leaderboard_game_stats   FROM anon, authenticated;
REVOKE ALL ON public.player_public_profiles   FROM anon, authenticated;

GRANT SELECT ON public.leaderboard_ranked       TO anon, authenticated;
GRANT SELECT ON public.leaderboard_overall      TO anon, authenticated;
GRANT SELECT ON public.leaderboard_game_stats   TO anon, authenticated;

-- player_public_profiles: authenticated only (not truly "public" PII)
GRANT SELECT ON public.player_public_profiles TO authenticated;
