/*
  # Fix Result Column Name Conflict

  ## Overview
  Renames the result column in the return type to avoid ambiguity
  with SQL's RESULT keyword.

  ## Changes
  - Rename result to game_result in function return type
*/

DROP FUNCTION IF EXISTS create_party_room(text, text);

CREATE OR REPLACE FUNCTION create_party_room(
  p_game text,
  p_player_id text
)
RETURNS TABLE (
  room_id uuid,
  room_code text,
  room_mode text,
  room_game text,
  room_status text,
  room_created_at timestamptz,
  room_expires_at timestamptz,
  room_p1_id text,
  room_p2_id text,
  room_p1_connected boolean,
  room_p2_connected boolean,
  room_game_state jsonb,
  room_turn text,
  room_result jsonb
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
      
      -- Return the room data with explicit column mapping
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
