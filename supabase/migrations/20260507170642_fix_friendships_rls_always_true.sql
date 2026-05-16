/*
  # Fix friendships RLS — replace always-true policies

  ## Problem
  Three policies used USING (true) / WITH CHECK (true), allowing any
  visitor to insert, update, or delete any friendship row. The SELECT
  policy also had no ownership restriction.

  ## Identity model
  The app does NOT use Supabase auth. Identity is established by setting
  app.current_wallet (wallet_address) or app.player_id (device UUID string)
  as session-level GUC values. friendships.requester_id / receiver_id store
  the players.id (UUID) cast as text.

  ## Changes
  - Drop all four existing broad policies
  - Re-create SELECT, INSERT, UPDATE, DELETE with proper ownership checks
    by resolving the current wallet/player_id to a players.id and comparing
    against requester_id / receiver_id (cast to uuid for the join)

  ## New policies
  1. SELECT  — only parties to the friendship can read it
  2. INSERT  — requester_id must resolve to the current player's id
  3. UPDATE  — receiver_id must resolve to the current player (they respond)
  4. DELETE  — either party can remove
*/

-- Drop existing open policies
DROP POLICY IF EXISTS "Anyone can delete friend requests"  ON public.friendships;
DROP POLICY IF EXISTS "Anyone can send friend requests"    ON public.friendships;
DROP POLICY IF EXISTS "Anyone can update friendships"      ON public.friendships;
DROP POLICY IF EXISTS "Anyone can view friendships"        ON public.friendships;

-- Helper: resolve current session to a player id (uuid)
-- Used inline in each policy via sub-select

-- 1. SELECT — only involved parties
CREATE POLICY "Players can view their own friendships"
  ON public.friendships
  FOR SELECT
  TO anon, authenticated
  USING (
    requester_id::uuid IN (
      SELECT id FROM public.players
      WHERE (
        current_setting('app.current_wallet', true) <> ''
        AND wallet_address = current_setting('app.current_wallet', true)
      ) OR (
        current_setting('app.player_id', true) <> ''
        AND player_id = current_setting('app.player_id', true)
      )
    )
    OR
    receiver_id::uuid IN (
      SELECT id FROM public.players
      WHERE (
        current_setting('app.current_wallet', true) <> ''
        AND wallet_address = current_setting('app.current_wallet', true)
      ) OR (
        current_setting('app.player_id', true) <> ''
        AND player_id = current_setting('app.player_id', true)
      )
    )
  );

-- 2. INSERT — requester must be the current player
CREATE POLICY "Players can send friend requests as themselves"
  ON public.friendships
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    requester_id::uuid IN (
      SELECT id FROM public.players
      WHERE (
        current_setting('app.current_wallet', true) <> ''
        AND wallet_address = current_setting('app.current_wallet', true)
      ) OR (
        current_setting('app.player_id', true) <> ''
        AND player_id = current_setting('app.player_id', true)
      )
    )
  );

-- 3. UPDATE — only the receiver can accept/modify a request
CREATE POLICY "Players can update friendships they received"
  ON public.friendships
  FOR UPDATE
  TO anon, authenticated
  USING (
    receiver_id::uuid IN (
      SELECT id FROM public.players
      WHERE (
        current_setting('app.current_wallet', true) <> ''
        AND wallet_address = current_setting('app.current_wallet', true)
      ) OR (
        current_setting('app.player_id', true) <> ''
        AND player_id = current_setting('app.player_id', true)
      )
    )
  )
  WITH CHECK (
    receiver_id::uuid IN (
      SELECT id FROM public.players
      WHERE (
        current_setting('app.current_wallet', true) <> ''
        AND wallet_address = current_setting('app.current_wallet', true)
      ) OR (
        current_setting('app.player_id', true) <> ''
        AND player_id = current_setting('app.player_id', true)
      )
    )
  );

-- 4. DELETE — either party can remove the friendship
CREATE POLICY "Players can delete their own friendships"
  ON public.friendships
  FOR DELETE
  TO anon, authenticated
  USING (
    requester_id::uuid IN (
      SELECT id FROM public.players
      WHERE (
        current_setting('app.current_wallet', true) <> ''
        AND wallet_address = current_setting('app.current_wallet', true)
      ) OR (
        current_setting('app.player_id', true) <> ''
        AND player_id = current_setting('app.player_id', true)
      )
    )
    OR
    receiver_id::uuid IN (
      SELECT id FROM public.players
      WHERE (
        current_setting('app.current_wallet', true) <> ''
        AND wallet_address = current_setting('app.current_wallet', true)
      ) OR (
        current_setting('app.player_id', true) <> ''
        AND player_id = current_setting('app.player_id', true)
      )
    )
  );
