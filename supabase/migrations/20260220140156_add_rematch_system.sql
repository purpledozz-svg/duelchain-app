/*
  # Add Rematch System

  1. Schema Changes
    - Add rematch fields to `party_rooms` table:
      - `rematch_status` (text): "none" | "requested" | "accepted" | "declined"
      - `rematch_p1_accepted` (boolean): Whether p1 accepted rematch
      - `rematch_p2_accepted` (boolean): Whether p2 accepted rematch
      - `rematch_count` (integer): Track number of rematches for turn order

  2. Purpose
    - Enable rematch functionality after games finish
    - Track which players have accepted rematch
    - Alternate starting players for fairness
*/

-- Add rematch columns to party_rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'party_rooms' AND column_name = 'rematch_status'
  ) THEN
    ALTER TABLE party_rooms ADD COLUMN rematch_status text DEFAULT 'none';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'party_rooms' AND column_name = 'rematch_p1_accepted'
  ) THEN
    ALTER TABLE party_rooms ADD COLUMN rematch_p1_accepted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'party_rooms' AND column_name = 'rematch_p2_accepted'
  ) THEN
    ALTER TABLE party_rooms ADD COLUMN rematch_p2_accepted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'party_rooms' AND column_name = 'rematch_count'
  ) THEN
    ALTER TABLE party_rooms ADD COLUMN rematch_count integer DEFAULT 0;
  END IF;
END $$;