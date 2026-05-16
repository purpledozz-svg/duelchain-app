/*
  # Fix avatars storage bucket policies

  ## Problem
  1. SELECT policy "Avatars are publicly readable" uses USING (bucket_id = 'avatars'),
     which allows any client to LIST all objects in the bucket (not just read by URL).
     Public buckets don't need an explicit SELECT policy for direct URL access — the
     bucket being public already handles that. The policy only adds listing capability.

  2. INSERT/UPDATE/DELETE policies are fully open (anyone can upload/modify/delete
     any file in the bucket). They should be scoped to the player's own folder.

  ## Upload path convention
  Files are uploaded as: {players.id}/avatar
  (players.id is a UUID; confirmed in Profile.tsx line 691)

  ## Changes
  - DROP "Avatars are publicly readable" — public bucket handles URL reads natively;
    no SELECT policy needed, removing it prevents directory listing
  - DROP the open INSERT/UPDATE/DELETE policies
  - Re-create INSERT/UPDATE/DELETE scoped to the current player's folder
    using the session GUC app.current_wallet → players.id sub-select
*/

-- Drop existing open policies
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload avatars"     ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars"     ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars"     ON storage.objects;

-- INSERT — player can only upload into their own folder ({player_uuid}/*)
CREATE POLICY "Players can upload their own avatar"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE (
      (
        SELECT id::text FROM public.players
        WHERE (
          current_setting('app.current_wallet', true) <> ''
          AND wallet_address = current_setting('app.current_wallet', true)
        ) OR (
          current_setting('app.player_id', true) <> ''
          AND player_id = current_setting('app.player_id', true)
        )
        LIMIT 1
      ) || '/%'
    )
  );

-- UPDATE — player can only overwrite their own avatar
CREATE POLICY "Players can update their own avatar"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE (
      (
        SELECT id::text FROM public.players
        WHERE (
          current_setting('app.current_wallet', true) <> ''
          AND wallet_address = current_setting('app.current_wallet', true)
        ) OR (
          current_setting('app.player_id', true) <> ''
          AND player_id = current_setting('app.player_id', true)
        )
        LIMIT 1
      ) || '/%'
    )
  );

-- DELETE — player can only remove their own avatar
CREATE POLICY "Players can delete their own avatar"
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE (
      (
        SELECT id::text FROM public.players
        WHERE (
          current_setting('app.current_wallet', true) <> ''
          AND wallet_address = current_setting('app.current_wallet', true)
        ) OR (
          current_setting('app.player_id', true) <> ''
          AND player_id = current_setting('app.player_id', true)
        )
        LIMIT 1
      ) || '/%'
    )
  );
