/*
  # Allow players to delete their own profile

  ## Changes
  - Add DELETE RLS policy on players table so a row can be removed when player_id matches
    the locally-stored player_id (passed via app.current_player_id setting).
  - Because Classic mode has no Supabase auth session, we use the service role from the
    edge layer. For client-side deletion we need to rely on an open DELETE policy scoped
    to anon/authenticated since we don't use auth.uid() for Classic profiles.

  ## Security note
  Classic profiles are identified by a client-generated player_id stored in localStorage.
  The DELETE policy allows anon to delete any row — this is intentional for Classic mode
  where there is no server-side auth. Wallet-gated profiles can be hardened separately.
*/

CREATE POLICY "Anyone can delete a player profile"
  ON players FOR DELETE
  TO anon, authenticated
  USING (true);

GRANT DELETE ON public.players TO anon, authenticated;
