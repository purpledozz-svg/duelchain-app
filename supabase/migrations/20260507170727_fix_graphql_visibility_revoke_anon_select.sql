/*
  # Fix GraphQL schema visibility — revoke broad anon/authenticated SELECT grants

  ## Problem
  Several tables are visible in the GraphQL schema because `anon` and `authenticated`
  roles have SELECT grants on them (even when RLS restricts rows, the schema itself
  is discoverable). The security scanner flagged these tables:
    friendships, game_stats, matches, matchmaking_queue, monthly_prizes,
    party_rooms, players, rank_history

  ## Strategy
  - `players`: keep public SELECT (needed for leaderboard, profile search, connect-wallet lookup)
  - `game_stats`: keep public SELECT (leaderboard per-game stats)
  - `monthly_prizes`: keep public SELECT (display prize info publicly)
  - `matches`: keep public SELECT (match history is public)
  - `matchmaking_queue`: revoke anon SELECT; keep authenticated SELECT (queue visibility)
  - `party_rooms`: revoke anon SELECT; keep authenticated SELECT (party join flow)
  - `friendships`: revoke anon SELECT; keep authenticated SELECT (friend system)
  - `rank_history`: revoke anon SELECT; keep authenticated SELECT (rank charts)

  ## Also drop the always-true SELECT policies that were left on some tables
  and replace with properly scoped ones where needed after grant changes.
*/

-- ── matchmaking_queue ─────────────────────────────────────────────────────────
-- Revoke anon SELECT; only authenticated sessions need to read the queue
REVOKE SELECT ON public.matchmaking_queue FROM anon;

DROP POLICY IF EXISTS "Anyone can read queue" ON public.matchmaking_queue;

CREATE POLICY "Authenticated players can read queue"
  ON public.matchmaking_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- ── party_rooms ───────────────────────────────────────────────────────────────
-- Revoke anon SELECT; party join requires a player identity anyway
REVOKE SELECT ON public.party_rooms FROM anon;

DROP POLICY IF EXISTS "Anyone can read parties" ON public.party_rooms;

CREATE POLICY "Authenticated players can read party rooms"
  ON public.party_rooms
  FOR SELECT
  TO authenticated
  USING (true);

-- ── friendships ───────────────────────────────────────────────────────────────
-- Revoke anon SELECT entirely; friendship data is personal
REVOKE SELECT ON public.friendships FROM anon;
-- The "Players can view their own friendships" policy already scopes rows

-- ── rank_history ──────────────────────────────────────────────────────────────
-- Revoke anon SELECT; rank history is for logged-in profile views
REVOKE SELECT ON public.rank_history FROM anon;

DROP POLICY IF EXISTS "Public rank history read" ON public.rank_history;

CREATE POLICY "Authenticated users can read rank history"
  ON public.rank_history
  FOR SELECT
  TO authenticated
  USING (true);

-- ── Tighten excess privileges on rank_history (had full TRIGGER/TRUNCATE/etc) ─
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON public.rank_history FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON public.rank_history FROM authenticated;

-- ── Tighten excess privileges on friendships ──────────────────────────────────
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.friendships FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.friendships FROM authenticated;
