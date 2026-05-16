/*
  # Add full profile system

  ## Summary
  Extends the players table with username_lower (case-insensitive uniqueness),
  player_id (anonymous device identity), and adds a friendships table.

  ## Notes
  - Duplicate lowercase usernames are resolved before adding unique constraint
    (appending a suffix to keep the older row's username intact)
  - friendships uses text IDs matching players.id (uuid stored as text)
*/

-- ─── players: username_lower ──────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'username_lower'
  ) THEN
    ALTER TABLE players ADD COLUMN username_lower text;
  END IF;
END $$;

-- Back-fill
UPDATE players SET username_lower = lower(username) WHERE username_lower IS NULL AND username IS NOT NULL;

-- Resolve duplicate lowercase usernames by appending _2, _3 … to newer rows
DO $$
DECLARE
  dup record;
  suffix_n integer;
BEGIN
  FOR dup IN
    SELECT lower(username) AS uname_lower
    FROM players
    GROUP BY lower(username)
    HAVING count(*) > 1
  LOOP
    suffix_n := 2;
    -- Skip the oldest row (keep it unchanged), rename the rest
    FOR dup IN
      SELECT id, username FROM players
      WHERE lower(username) = dup.uname_lower
      ORDER BY created_at ASC
      OFFSET 1
    LOOP
      UPDATE players
        SET username = username || '_' || suffix_n,
            username_lower = lower(username) || '_' || suffix_n
        WHERE id = dup.id;
      suffix_n := suffix_n + 1;
    END LOOP;
  END LOOP;
END $$;

-- Now safe to add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_username_lower_key'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT players_username_lower_key UNIQUE (username_lower);
  END IF;
END $$;

-- ─── players: player_id ───────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'player_id'
  ) THEN
    ALTER TABLE players ADD COLUMN player_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_player_id_key'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT players_player_id_key UNIQUE (player_id);
  END IF;
END $$;

-- ─── players: stat columns ────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'total_wins'
  ) THEN
    ALTER TABLE players ADD COLUMN total_wins integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'total_earned_usd'
  ) THEN
    ALTER TABLE players ADD COLUMN total_earned_usd numeric(18,4) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'bio'
  ) THEN
    ALTER TABLE players ADD COLUMN bio text DEFAULT '';
  END IF;
END $$;

-- ─── friendships table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  text NOT NULL,
  receiver_id   text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE (requester_id, receiver_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view friendships"
  ON friendships FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can send friend requests"
  ON friendships FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update friendships"
  ON friendships FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete friend requests"
  ON friendships FOR DELETE
  TO anon, authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO anon, authenticated;
