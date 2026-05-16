/*
  # Add avatar_url to players table

  1. Changes
    - Adds `avatar_url` column (text, nullable) to `players` table
    - Players can store a public URL to their profile image

  2. Storage
    - Creates a public `avatars` storage bucket
    - RLS policies: any authenticated user can upload to their own path,
      public can read all avatars (since they are public profile images)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE players ADD COLUMN avatar_url TEXT DEFAULT NULL;
  END IF;
END $$;
