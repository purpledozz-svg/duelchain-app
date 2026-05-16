/*
  # Harden function search paths

  1. Purpose
    - All listed public functions are configured with a fixed `search_path` to
      eliminate the "Function Search Path Mutable" security lint. A mutable
      search_path would allow a caller with CREATE privileges on a schema in
      their search path to shadow objects referenced inside the function body.

  2. Change
    - Runs `ALTER FUNCTION ... SET search_path = public, pg_catalog` on every
      function flagged by the Supabase linter. This is a non-destructive
      metadata change. No function body or signature is modified.

  3. Safety notes
    - No data is touched.
    - Functions keep their existing behavior; only their resolved schema
      lookup order becomes deterministic.
    - `IF EXISTS` guards ensure the migration is idempotent and safe to rerun.
*/

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'cleanup_expired_parties',
        'request_rematch',
        'initialize_game_state',
        'accept_rematch',
        'decline_rematch',
        'cleanup_expired_party_rooms',
        'match_players',
        'create_party_room',
        'generate_party_code',
        'update_matchmaking_heartbeat',
        'cleanup_stale_queue_entries',
        'get_queue_counts',
        'update_queue_heartbeat',
        'update_player_stats',
        'update_game_stats'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog',
      r.schema_name, r.func_name, r.args
    );
  END LOOP;
END $$;