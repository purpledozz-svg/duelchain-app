-- Ajoute la colonne duel_escrow_address à party_rooms
-- Stocke l'adresse du DuelEscrow déployé par la factory pour chaque partie compétitive.

ALTER TABLE party_rooms
  ADD COLUMN IF NOT EXISTS duel_escrow_address TEXT DEFAULT NULL;

-- Index pour accès rapide par adresse escrow (utile pour le backend)
CREATE INDEX IF NOT EXISTS idx_party_rooms_duel_escrow_address
  ON party_rooms (duel_escrow_address)
  WHERE duel_escrow_address IS NOT NULL;

COMMENT ON COLUMN party_rooms.duel_escrow_address IS
  'Adresse du contrat DuelEscrow déployé par DuelFactory pour cette partie compétitive.';
