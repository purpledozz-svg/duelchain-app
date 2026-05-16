/*
  # Fix Ambiguous Result Column

  ## Overview
  Fixes the ambiguous column reference error in create_party_room function
  by fully qualifying all column names with table name.

  ## Changes
  - Update create_party_room function with proper table-qualified column names
*/

-- Drop and recreate the function with proper column qualification
DROP FUNCTION IF EXISTS create_party_room(text, text);

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
  v_room party_rooms%ROWTYPE;
BEGIN
  -- Get initial game state
  v_game_state := initialize_game_state(p_game);
  
  LOOP
    -- Generate unique code
    v_code := generate_party_code();
    
    BEGIN
      -- Try to insert room
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
      RETURNING * INTO v_room;
      
      -- Return the room data
      RETURN QUERY SELECT 
        v_room.id,
        v_room.code,
        v_room.mode,
        v_room.game,
        v_room.status,
        v_room.created_at,
        v_room.expires_at,
        v_room.p1_id,
        v_room.p2_id,
        v_room.p1_connected,
        v_room.p2_connected,
        v_room.game_state,
        v_room.turn,
        v_room.result;
      
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
