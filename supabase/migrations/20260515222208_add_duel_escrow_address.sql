
/*
  # Add duel_escrow_address to party_rooms
  Stores the deployed DuelEscrow contract address for competitive matches.
*/
ALTER TABLE party_rooms
  ADD COLUMN IF NOT EXISTS duel_escrow_address TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_party_rooms_duel_escrow_address
  ON party_rooms (duel_escrow_address)
  WHERE duel_escrow_address IS NOT NULL;

COMMENT ON COLUMN party_rooms.duel_escrow_address IS
  'Adresse du contrat DuelEscrow déployé par DuelFactory pour cette partie compétitive.';
