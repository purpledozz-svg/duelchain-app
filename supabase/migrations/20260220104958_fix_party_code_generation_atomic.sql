/*
  # Fix Party Code Generation - Atomic Creation

  ## Overview
  Implements atomic, collision-safe party room creation with retry logic
  at the database level to eliminate race conditions.

  ## Changes

  ### 1. Improved generate_party_code function
  - Uses charset without confusing characters (O/0, I/1)
  - Returns guaranteed unique code with built-in collision check
  - Efficient retry logic

  ### 2. New create_party_room function
  - Atomically generates code and creates room in single transaction
  - Retries up to 10 times on unique violations
  - Returns both code and room data
  - Eliminates client-side race conditions

  ## Security
  - Maintains existing RLS policies
  - All operations within single transaction

  ## Notes
  - Unique constraint already exists on party_rooms.code
  - Function handles all edge cases (collisions, retries, errors)
*/

-- Drop old function if exists
DROP FUNCTION IF EXISTS generate_party_code();

-- Improved code generation function
CREATE OR REPLACE FUNCTION generate_party_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  characters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes O, I, 0, 1
  result text := '';
  i integer;
  code_exists boolean;
  max_attempts integer := 100;
  attempt integer := 0;
BEGIN
  LOOP
    result := '';
    
    -- Generate 6-character code
    FOR i IN 1..6 LOOP
      result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM party_rooms WHERE code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN result;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Atomic party room creation function
CREATE OR REPLACE FUNCTION create_party_room(
  p_game text,
  p_player_id text
)
RETURNS TABLE (
  id uuid,
  code text,
  mode text,
  game text,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  p1_id text,
  p2_id text,
  p1_connected boolean,
  p2_connected boolean,
  game_state jsonb,
  turn text,
  result jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
  v_game_state jsonb;
  max_retries integer := 10;
  retry_count integer := 0;
BEGIN
  -- Get initial game state
  v_game_state := initialize_game_state(p_game);
  
  LOOP
    -- Generate unique code
    v_code := generate_party_code();
    
    BEGIN
      -- Try to insert room
      RETURN QUERY
      INSERT INTO party_rooms (
        code,
        mode,
        game,
        status,
        p1_id,
        p1_connected,
        game_state,
        turn
      ) VALUES (
        v_code,
        'party',
        p_game,
        'waiting',
        p_player_id,
        true,
        v_game_state,
        'p1'
      )
      RETURNING 
        party_rooms.id,
        party_rooms.code,
        party_rooms.mode,
        party_rooms.game,
        party_rooms.status,
        party_rooms.created_at,
        party_rooms.expires_at,
        party_rooms.p1_id,
        party_rooms.p2_id,
        party_rooms.p1_connected,
        party_rooms.p2_connected,
        party_rooms.game_state,
        party_rooms.turn,
        party_rooms.result;
      
      -- If we got here, insert succeeded
      RETURN;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Code collision, retry
        retry_count := retry_count + 1;
        
        IF retry_count >= max_retries THEN
          RAISE EXCEPTION 'Failed to create party room after % retries due to code collisions', max_retries;
        END IF;
        
        -- Continue to next iteration
    END;
  END LOOP;
END;
$$;

-- Function to clean up expired rooms (optional but recommended)
CREATE OR REPLACE FUNCTION cleanup_expired_party_rooms()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM party_rooms
  WHERE status = 'waiting'
    AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION create_party_room(text, text) IS 
'Atomically creates a party room with guaranteed unique code. Retries up to 10 times on collisions.';

COMMENT ON FUNCTION cleanup_expired_party_rooms() IS 
'Deletes expired party rooms in waiting status. Should be called periodically.';
