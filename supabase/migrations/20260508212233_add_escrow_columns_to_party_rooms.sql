/*
  # Add escrow/on-chain tracking columns to party_rooms and matchmaking_queue

  ## Summary
  Adds fields needed to track the DuelEscrow smart contract lifecycle for
  competitive (wagered) matches. Classic mode is unaffected.

  ## New columns on party_rooms
  - duel_id (text)              — keccak256 duel ID registered on DuelEscrow
  - p1_wallet (text)            — player 1 wallet address (checksummed)
  - p2_wallet (text)            — player 2 wallet address
  - currency (text)             — 'ETH' or 'USDC'
  - stake_usd (numeric)         — USD wager amount chosen by both players
  - stake_token_amount (text)   — exact on-chain token amount (wei/units as string)
  - p1_deposit_tx (text)        — player 1 deposit transaction hash
  - p2_deposit_tx (text)        — player 2 deposit transaction hash
  - p1_deposited (boolean)      — true after p1's tx is confirmed on-chain
  - p2_deposited (boolean)      — true after p2's tx is confirmed on-chain
  - onchain_status (text)       — 'none' | 'waiting_p1' | 'waiting_p2' | 'funded' | 'settled' | 'refunded'
  - payout_tx (text)            — settlement transaction hash
  - winner_wallet (text)        — winning wallet address
  - fee_amount (text)           — fee transferred to project wallet (as string)
  - winner_payout (text)        — amount transferred to winner (as string)

  ## New columns on matchmaking_queue
  - wallet_address (text)       — player's wallet address (stored at queue-join time)

  ## Security
  - All new columns have safe defaults; no RLS changes needed.
  - Classic mode rows will have all new columns NULL/default.
*/

-- Add escrow tracking columns to party_rooms
ALTER TABLE public.party_rooms
  ADD COLUMN IF NOT EXISTS duel_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS p1_wallet text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS p2_wallet text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stake_usd numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stake_token_amount text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS p1_deposit_tx text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS p2_deposit_tx text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS p1_deposited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS p2_deposited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onchain_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payout_tx text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS winner_wallet text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fee_amount text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS winner_payout text DEFAULT NULL;

-- Add wallet column to matchmaking_queue so we can pass it to the room creator
ALTER TABLE public.matchmaking_queue
  ADD COLUMN IF NOT EXISTS wallet_address text DEFAULT NULL;

-- Index for duel_id lookups (contract events → DB sync)
CREATE INDEX IF NOT EXISTS idx_party_rooms_duel_id
  ON public.party_rooms (duel_id)
  WHERE duel_id IS NOT NULL;

-- Index for onchain_status queries (funding screens poll this)
CREATE INDEX IF NOT EXISTS idx_party_rooms_onchain_status
  ON public.party_rooms (onchain_status)
  WHERE onchain_status <> 'none';
