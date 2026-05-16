# Matchmaking Quick Start Guide

## How to Test Multiplayer Matchmaking

### Requirements
- 2+ browser windows (use incognito/private windows)
- Deployed site or local dev server

### Step-by-Step Test

#### Option 1: Two Players (Chess)

**Window 1:**
1. Open site in browser
2. Click "Multiplayer"
3. Select "Chess"
4. Wait on matchmaking screen
5. Observe: "Players in queue: 1"

**Window 2 (Incognito):**
1. Open site in incognito
2. Click "Multiplayer"
3. Select "Chess"
4. Wait on matchmaking screen

**Expected Result:**
- Within 3-6 seconds, both windows navigate to game
- Match code is the same (e.g., "ABC123")
- Player 1 sees their turn first
- Player 2 waits for Player 1's move

#### Option 2: Four Players (Multiple Games)

**Windows 1 & 2:** Chess
**Windows 3 & 4:** Connect Four

**Expected Result:**
- Windows 1+2 match together (Chess game)
- Windows 3+4 match together (Connect Four game)
- No cross-game matching

#### Option 3: Cancel Test

**Window 1:**
1. Click "Multiplayer" → Chess
2. Wait 5 seconds
3. Click "Cancel Search"
4. Should return to multiplayer menu

**Window 2:**
1. Click "Multiplayer" → Chess
2. Should see "Players in queue: 1" (only Window 2)

### What to Watch For

#### ✅ Success Indicators
- Queue count updates every 3 seconds
- Timer counts up (0:00, 0:01, 0:02...)
- Match happens within 3-6 seconds of 2nd player joining
- Both players navigate to same game code
- Console shows `[Matchmaking] Match found!`

#### ❌ Failure Indicators
- Queue count stays at 1 forever
- No match after 30+ seconds with 2 players
- Console errors
- Players navigate to different game codes

### Console Debug Info

Open browser DevTools (F12) → Console to see:

```
[Matchmaking] Starting for player: player-1708123456789-abc123
[Matchmaking] Player player-xxx joined queue for chess
[Matchmaking] Heartbeat sent
[Matchmaking] Match created for chess: {match_id: "...", match_code: "ABC123", ...}
[Matchmaking] Match found! {code: "ABC123", ...}
```

### Manual Database Check

If testing locally with database access:

```sql
-- Check queue
SELECT * FROM matchmaking_queue;

-- Check recent matches
SELECT * FROM party_rooms WHERE mode = 'matchmaking' ORDER BY created_at DESC LIMIT 10;

-- Get queue counts
SELECT * FROM get_queue_counts();

-- Cleanup stale entries
SELECT cleanup_stale_queue_entries();
```

### Troubleshooting

**Problem:** Players not matching

**Solutions:**
1. Check console for errors
2. Verify both are selecting same game
3. Wait at least 6 seconds (2 match cycles)
4. Refresh both windows and try again
5. Check database connection
6. Verify `match_players` function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'match_players';
   ```

**Problem:** Stale queue entries

**Solution:**
Run cleanup manually:
```sql
SELECT cleanup_stale_queue_entries();
```

Or wait 30 seconds for auto-cleanup.

**Problem:** Queue count wrong

**Solution:**
```sql
-- Manual count
SELECT game, COUNT(*) FROM matchmaking_queue
WHERE last_seen_at >= now() - interval '30 seconds'
GROUP BY game;
```

### Production Testing

After deploying:

1. Share deployed URL with 2+ friends
2. Have them both click Multiplayer → Chess simultaneously
3. Should match within seconds
4. Play a few moves to verify game state sync

### Performance Benchmarks

- **Match Latency:** 3-6 seconds (based on 3s polling)
- **Heartbeat Frequency:** Every 10 seconds
- **Queue Update Frequency:** Every 3 seconds
- **Auto-Cleanup:** 30 seconds after last heartbeat
- **Max Wait Time:** ~30 seconds (if no opponent)

### Expected Behavior Summary

| Scenario | Expected |
|----------|----------|
| 2 players, same game | Match in 3-6s |
| 1 player waiting | Shows "Players in queue: 1" |
| Player cancels | Removed immediately |
| Player closes tab | Removed in 30s |
| 4 players, same game | 2 matches created |
| Different games | No match |
| Stale entries | Auto-cleanup after 30s |

---

## That's It!

The matchmaking system is fully operational. Just open 2+ browser windows, select the same game, and watch them match automatically.

For detailed technical documentation, see `MULTIPLAYER_MATCHMAKING.md`.
