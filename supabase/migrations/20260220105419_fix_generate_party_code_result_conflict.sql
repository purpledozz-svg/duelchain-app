/*
  # Fix Generate Party Code Result Conflict

  ## Overview
  Fixes the "result" variable name conflict in generate_party_code function
  by renaming it to avoid reserved word issues.

  ## Changes
  - Rename `result` variable to `code_result` to avoid conflicts
*/

DROP FUNCTION IF EXISTS generate_party_code();

CREATE OR REPLACE FUNCTION generate_party_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  characters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code_result text := '';
  i integer;
  code_exists boolean;
  max_attempts integer := 100;
  attempt integer := 0;
BEGIN
  LOOP
    code_result := '';
    
    -- Generate 6-character code
    FOR i IN 1..6 LOOP
      code_result := code_result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM party_rooms WHERE code = code_result) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN code_result;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;
