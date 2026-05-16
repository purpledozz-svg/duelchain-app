# Multiplayer System Smoke Test Checklist

## Prerequisites
1. ✅ Build passes: `npm run build`
2. ✅ Preview runs: `npm run preview`
3. Open preview URL (usually http://localhost:4173)

---

## Test Environment Setup

### Browser Setup (for 2-player tests)
- **Browser A**: Normal Chrome/Firefox window
- **Browser B**: Incognito/Private window (to simulate different user)

### Debug Panel Access
- Navigate to `/debug/multiplayer` to monitor:
  - Queue entries
  - Active rooms
  - Player IDs
  - Match creations

---

## Section 1: Basic Navigation & Lobby

### Test 1.1: Home to Multiplayer Lobby
**Steps:**
1. Open preview URL
2. Click "Multiplayer" or navigate to `/multiplayer`

**Expected:**
- ✅ Lobby loads without errors
- ✅ Shows 3 mode options: "Online Matchmaking", "Create Party", "Join Party"
- ✅ No console errors

**Status:** [ ] Pass [ ] Fail

---

### Test 1.2: Mode Selection
**Steps:**
1. From multiplayer lobby, click "Online Matchmaking"

**Expected:**
- ✅ Navigates to `/multiplayer/matchmaking` or game selection
- ✅ Shows game list (Chess, Connect Four, Tic-Tac-Toe)
- ✅ All games are clickable

**Status:** [ ] Pass [ ] Fail

---

## Section 2: Online Matchmaking (Chess)

### Test 2.1: Single Player Queue Join
**Browser A Steps:**
1. Navigate to `/multiplayer`
2. Click "Online Matchmaking"
3. Select "Chess"
4. Observer player enters queue

**Expected:**
- ✅ Shows "Finding Opponent..." screen
- ✅ Queue count shows "1"
- ✅ Timer starts counting up
- ✅ Console shows: `[Matchmaking] Player XXX joined queue for chess`
- ✅ In `/debug/multiplayer`: Shows 1 entry in Chess queue

**Status:** [ ] Pass [ ] Fail

---

### Test 2.2: Two Player Match Creation
**Browser A:**
1. In queue for Chess (from Test 2.1)

**Browser B:**
1. Navigate to `/multiplayer`
2. Click "Online Matchmaking"
3. Select "Chess"

**Expected:**
- ✅ Within 3-6 seconds, BOTH browsers receive match
- ✅ BOTH browsers navigate to `/game/chess/XXXXXX` (same code)
- ✅ Console shows: `[Matchmaking] Match found via polling:` OR `Match found!`
- ✅ In `/debug/multiplayer`: Queue drops to 0, new room appears with status="active"

**Status:** [ ] Pass [ ] Fail

---

### Test 2.3: Chess Game Playability
**Browser A & B (after match):**

**Expected Initial State:**
- ✅ Both see chess board
- ✅ Browser A (White/P1) sees "White (P1)'s turn (You)"
- ✅ Browser B (Black/P2) sees "White (P1)'s turn"
- ✅ Console in Browser A: `[MultiplayerChess] Assigned role: p1`
- ✅ Console in Browser B: `[MultiplayerChess] Assigned role: p2`
- ✅ Player IDs match between matchmaking and game
- ✅ No "locked" overlay or disabled input

**Browser A (White) Move:**
1. Drag pawn e2 → e4

**Expected:**
- ✅ Piece moves successfully
- ✅ Console: `[MultiplayerChess] Move executed successfully`
- ✅ Turn changes to "Black (P2)'s turn"
- ✅ Browser B INSTANTLY sees the move (board updates)

**Browser B (Black) Move:**
1. Drag pawn e7 → e5

**Expected:**
- ✅ Piece moves successfully
- ✅ Console: `[MultiplayerChess] Move executed successfully`
- ✅ Turn changes to "White (P1)'s turn"
- ✅ Browser A INSTANTLY sees the move (board updates)

**Browser A (White) Second Move:**
1. Drag knight g1 → f3

**Expected:**
- ✅ Move succeeds
- ✅ Real-time sync to Browser B

**Status:** [ ] Pass [ ] Fail

---

## Section 3: Online Matchmaking (Connect Four)

### Test 3.1: Connect Four Match & Play
**Browser A:**
1. Navigate to `/multiplayer`
2. "Online Matchmaking" → "Connect Four"

**Browser B:**
1. Same steps

**Expected:**
- ✅ Match found within 3-6 seconds
- ✅ Both navigate to `/game/connect-four/XXXXXX`
- ✅ Board shows empty 6x7 grid
- ✅ Browser A (P1) can click column to drop piece
- ✅ Piece drops and turn changes
- ✅ Browser B sees piece appear immediately
- ✅ Browser B (P2) can drop piece
- ✅ Browser A sees it immediately

**Status:** [ ] Pass [ ] Fail

---

## Section 4: Online Matchmaking (Tic-Tac-Toe)

### Test 4.1: Tic-Tac-Toe Match & Play
**Browser A:**
1. Navigate to `/multiplayer`
2. "Online Matchmaking" → "Tic-Tac-Toe"

**Browser B:**
1. Same steps

**Expected:**
- ✅ Match found within 3-6 seconds
- ✅ Both navigate to `/game/tic-tac-toe/XXXXXX`
- ✅ Board shows empty 3x3 grid
- ✅ Browser A (P1/X) clicks cell, sees X
- ✅ Turn changes to P2
- ✅ Browser B sees X immediately
- ✅ Browser B (P2/O) clicks cell, sees O
- ✅ Browser A sees O immediately

**Status:** [ ] Pass [ ] Fail

---

## Section 5: Party System - Create Party

### Test 5.1: Create Chess Party
**Browser A:**
1. Navigate to `/multiplayer`
2. Click "Create Party"
3. Select "Chess"

**Expected:**
- ✅ Shows "Waiting for opponent..." screen
- ✅ Displays 6-character party code (e.g., "ABC123")
- ✅ Code is copyable
- ✅ Status shows "Waiting for Player 2"
- ✅ Console: `Party created successfully`
- ✅ In `/debug/multiplayer`: New room with status="waiting", mode="party"

**Status:** [ ] Pass [ ] Fail

---

### Test 5.2: Join Chess Party & Play
**Browser A:**
1. Party created (from Test 5.1), note the code

**Browser B:**
1. Navigate to `/multiplayer`
2. Click "Join Party"
3. Enter the code from Browser A
4. Click "Join"

**Expected:**
- ✅ Browser B navigates to game room
- ✅ Browser A AUTOMATICALLY proceeds to game (no button click)
- ✅ Both see chess board
- ✅ Room status changes to "active"
- ✅ Game is playable (P1 can move, P2 sees it)
- ✅ In `/debug/multiplayer`: Room status="active", both players connected

**Status:** [ ] Pass [ ] Fail

---

### Test 5.3: Create Connect Four Party
**Browser A:**
1. Navigate to `/multiplayer`
2. "Create Party" → "Connect Four"

**Browser B:**
1. "Join Party" → Enter code

**Expected:**
- ✅ Party created with code
- ✅ Browser B joins successfully
- ✅ Both in game room
- ✅ Game is playable

**Status:** [ ] Pass [ ] Fail

---

## Section 6: Error Handling & Edge Cases

### Test 6.1: Invalid Party Code
**Browser A:**
1. Navigate to `/multiplayer`
2. "Join Party"
3. Enter fake code "ZZZ999"

**Expected:**
- ✅ Shows error: "Party code not found"
- ✅ Does NOT crash
- ✅ Can try again with valid code

**Status:** [ ] Pass [ ] Fail

---

### Test 6.2: Join Full Party
**Setup:**
1. Browser A creates party
2. Browser B joins (party now full)

**Browser C:**
1. Try to join same code

**Expected:**
- ✅ Shows error: "Party already full" or "Party already started"
- ✅ Does NOT crash

**Status:** [ ] Pass [ ] Fail

---

### Test 6.3: Queue Cancel
**Browser A:**
1. Join Chess queue
2. Wait 5 seconds
3. Click "Cancel Search"

**Expected:**
- ✅ Returns to multiplayer lobby or game selection
- ✅ Console: `[Matchmaking] Player XXX left queue`
- ✅ In `/debug/multiplayer`: Queue count decreases

**Status:** [ ] Pass [ ] Fail

---

### Test 6.4: Stale Queue Cleanup
**Browser A:**
1. Join Chess queue
2. Close tab (simulate disconnect)
3. Wait 35 seconds
4. Check `/debug/multiplayer`

**Expected:**
- ✅ After 30+ seconds, stale entry is marked as stale or removed
- ✅ Will not match with new players

**Status:** [ ] Pass [ ] Fail

---

### Test 6.5: Player ID Persistence
**Browser A:**
1. Join and complete a match
2. Refresh page
3. Join another match

**Expected:**
- ✅ Player ID remains the same across refresh
- ✅ Console shows same player ID
- ✅ localStorage has 'multiplayer_player_id'

**Status:** [ ] Pass [ ] Fail

---

## Section 7: Debug Panel Validation

### Test 7.1: Debug Panel Functionality
**Steps:**
1. Navigate to `/debug/multiplayer`
2. Open Browser B in queue
3. Observe debug panel

**Expected:**
- ✅ Shows current player ID from localStorage
- ✅ Shows queue count per game
- ✅ Shows recent rooms (last 20)
- ✅ Auto-refreshes every 3 seconds
- ✅ "Clear" button removes player ID
- ✅ Shows "Your Active Rooms" count

**Status:** [ ] Pass [ ] Fail

---

## Section 8: Local Single-Player Mode

### Test 8.1: Chess Works Locally
**Steps:**
1. Navigate to `/games/chess`

**Expected:**
- ✅ Loads chess board
- ✅ Can play moves against self
- ✅ No multiplayer features visible
- ✅ Works without network

**Status:** [ ] Pass [ ] Fail

---

### Test 8.2: All Games Load Locally
**Steps:**
1. Visit each game:
   - `/games/chess`
   - `/games/connect-four`
   - `/games/tictactoe`
   - `/games/rps`
   - `/games/reaction`

**Expected:**
- ✅ All pages load without errors
- ✅ All are playable (even if just single-player)

**Status:** [ ] Pass [ ] Fail

---

## Section 9: Performance & Reliability

### Test 9.1: Match Speed
**Timing Test:**
1. Browser A joins queue
2. Browser B joins queue
3. Measure time to match

**Expected:**
- ✅ Match found in ≤ 6 seconds
- ✅ Consistent across multiple tests

**Status:** [ ] Pass [ ] Fail

---

### Test 9.2: Move Latency
**Steps:**
1. In active match, make move
2. Observe time until opponent sees it

**Expected:**
- ✅ Move appears on opponent screen in < 500ms
- ✅ No lag or stuttering

**Status:** [ ] Pass [ ] Fail

---

### Test 9.3: No Memory Leaks
**Steps:**
1. Join and leave 5 matches
2. Check browser memory (DevTools)

**Expected:**
- ✅ Memory usage stable
- ✅ No runaway intervals
- ✅ Channels properly unsubscribed

**Status:** [ ] Pass [ ] Fail

---

## Section 10: Console Cleanliness

### Test 10.1: No Critical Errors
**Steps:**
1. Complete any full flow (matchmaking → game → moves)
2. Check console

**Expected:**
- ✅ No red errors
- ✅ No unhandled promise rejections
- ✅ No 404s or failed network requests
- ✅ Debug logs are informational only

**Status:** [ ] Pass [ ] Fail

---

## Final Acceptance Criteria

### All Tests Must Pass:
- [ ] Section 1: Navigation & Lobby (2 tests)
- [ ] Section 2: Online Chess (3 tests)
- [ ] Section 3: Online Connect Four (1 test)
- [ ] Section 4: Online Tic-Tac-Toe (1 test)
- [ ] Section 5: Party System (3 tests)
- [ ] Section 6: Error Handling (5 tests)
- [ ] Section 7: Debug Panel (1 test)
- [ ] Section 8: Local Mode (2 tests)
- [ ] Section 9: Performance (3 tests)
- [ ] Section 10: Console (1 test)

**TOTAL: 22 Tests**

---

## Summary Results

| Section | Tests | Pass | Fail |
|---------|-------|------|------|
| Navigation | 2 | __ | __ |
| Chess Matchmaking | 3 | __ | __ |
| Connect Four | 1 | __ | __ |
| Tic-Tac-Toe | 1 | __ | __ |
| Party System | 3 | __ | __ |
| Error Handling | 5 | __ | __ |
| Debug Panel | 1 | __ | __ |
| Local Mode | 2 | __ | __ |
| Performance | 3 | __ | __ |
| Console | 1 | __ | __ |
| **TOTAL** | **22** | **__** | **__** |

---

## Notes & Issues Found

(Document any issues or unexpected behavior here)

```
Issue 1:
- Description:
- Severity: [Critical/High/Medium/Low]
- Reproduce:
- Fix:

Issue 2:
- ...
```

---

## Sign-Off

**Tested By:** _________________
**Date:** _________________
**Build Version:** _________________
**Status:** [ ] PASS [ ] FAIL [ ] CONDITIONAL PASS

**Notes:**
