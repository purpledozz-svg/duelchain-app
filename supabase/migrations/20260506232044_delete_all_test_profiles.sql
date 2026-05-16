/*
  # Delete all test / seed profiles for clean launch

  ## Changes
  - Removes all existing rows from the `friendships` table (cascade-safe order)
  - Removes all existing rows from the `players` table

  ## Reason
  All existing profiles were created during development testing. No real user data
  exists yet. This migration resets the app to a blank-slate state so that usernames
  that were blocked by test accounts (Purple, RAF, Malou, etc.) become available again.

  ## Safety
  - party_rooms rows reference player UUIDs loosely; removing players does not break them.
  - No wallet funds are affected — this is Classic mode profile data only.
*/

DELETE FROM friendships;
DELETE FROM players;
