/*
  # Simplify Create Party Room Function

  ## Overview
  Simplifies the function to avoid column ambiguity by directly
  returning the inserted row without complex SELECT mapping.

  ## Changes
  - Simplified return mechanism
  - Uses RETURNING * directly
*/

DROP FUNCTION IF EXISTS create_party_room(text, text);

CREATE OR REPLACE FUNCTION create_party_room(
  p_game text,
  p_player_id text
)
RETURNS party_rooms
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
  v_game_state jsonb;
  max_retries integer := 10;
  retry_count integer := 0;
  v_room party_rooms;
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
      
      -- If we got here, insert succeeded
      RETURN v_room;
      
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
