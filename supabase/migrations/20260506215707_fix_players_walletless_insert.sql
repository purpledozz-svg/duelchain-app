/*
  # Fix players table to allow walletless profile creation

  ## Problem
  - wallet_address column is NOT NULL, blocking Classic mode profile creation
  - INSERT RLS policy "New profile must have a wallet address" rejects rows where wallet_address is null
  - Classic mode should not require a wallet

  ## Changes
  - Make wallet_address nullable with a NULL default
  - Drop the INSERT policy that requires a non-null wallet_address
  - Add a permissive INSERT policy that allows any insert (wallet optional)
*/

-- Make wallet_address nullable
ALTER TABLE players ALTER COLUMN wallet_address DROP NOT NULL;
ALTER TABLE players ALTER COLUMN wallet_address SET DEFAULT NULL;

-- Drop the blocking INSERT policy
DROP POLICY IF EXISTS "New profile must have a wallet address" ON players;

-- Add a permissive INSERT policy (Classic profiles need no wallet)
CREATE POLICY "Anyone can create a player profile"
  ON players FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure anon role has INSERT privilege
GRANT INSERT ON public.players TO anon, authenticated;
