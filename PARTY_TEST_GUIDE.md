# Party System Testing Guide

## Quick Start

### Prerequisites
- Build completed: `npm run build`
- Preview running: `npm run preview`
- Two browser windows (or one normal + one incognito)

## Test Scenario 1: Basic Flow

### Step 1: Create Party (Browser A)
1. Open `http://localhost:4173`
2. Click "ENTER THE LOBBY"
3. Scroll down to "Multiplayer Party Mode"
4. Click "Create Party" on Chess card
5. ✅ Verify: Party code appears (6 characters, e.g., ABC123)
6. ✅ Verify: "Waiting for opponent..." message shows
7. ✅ Verify: Copy code and copy link buttons work
8. Keep this window open

### Step 2: Join Party (Browser B)
1. Open new incognito window: `http://localhost:4173`
2. Click "ENTER THE LOBBY"
3. Scroll to "Multiplayer Party Mode"
4. Click "Join Party"
5. Enter the code from Browser A
6. Click "Join Party"
7. ✅ Verify: No errors

### Step 3: Game Start (Both Browsers)
8. ✅ Browser A: "Opponent joined!" message appears
9. ✅ Both: 3-2-1 countdown appears
10. ✅ Both: Redirected to game page
11. ✅ Browser A: Shows "You are playing as White"
12. ✅ Browser B: Shows "You are playing as Black"
13. ✅ Both: Party code displayed at top

## Test Scenario 2: Gameplay

### Move 1: White (Browser A)
1. Browser A: Drag pawn from e2 to e4
2. ✅ Move executes
3. ✅ Turn changes to "Black's turn"
4. ✅ Browser B: Move appears instantly
5. ✅ Browser B: Turn shows "Black's turn (You)"
6. ✅ Both: Move appears in history: "1. e4"

### Move 2: Black (Browser B)
1. Browser B: Drag pawn from e7 to e5
2. ✅ Move executes
3. ✅ Turn changes to "White's turn"
4. ✅ Browser A: Move appears instantly
5. ✅ Both: Move history shows "1. e4 e5"

### Move 3: Invalid Move Test (Browser A)
1. Browser A: Try to move Black's piece
2. ✅ Move rejected (piece doesn't move)
3. Browser B: Try to move White's piece
4. ✅ Move rejected

### Move 4: Illegal Move Test (Browser A)
1. Browser A: Try illegal move (e.g., pawn e4 to e6)
2. ✅ Move rejected
3. ✅ Pawn stays at e4

## Test Scenario 3: Pawn Promotion

### Setup
1. Play moves until you have a pawn on 7th rank
2. Move pawn to 8th rank (e.g., e7→e8)

### Test
1. ✅ Promotion modal appears
2. ✅ Shows 4 pieces: Queen, Rook, Bishop, Knight
3. Click "Queen"
4. ✅ Modal closes
5. ✅ Pawn becomes Queen
6. ✅ Both players see promoted Queen
7. ✅ Move appears in history (e.g., "e8=Q")

## Test Scenario 4: Check & Checkmate

### Check Test
1. Play moves that put opponent in check
2. ✅ "Check!" message appears
3. ✅ Message in red with pulse animation
4. ✅ Both players see check status

### Checkmate Test (Scholar's Mate)
1. White: e2→e4
2. Black: e7→e5
3. White: Bc1→c4
4. Black: Nc6
5. White: Qd1→h5
6. Black: Nf6
7. White: Qh5→f7 (checkmate!)
8. ✅ "Checkmate! White wins!" appears
9. ✅ Both players see game over
10. ✅ Moves disabled for both

## Test Scenario 5: Resignation

### Browser A Resigns
1. Browser A: Click "Resign" button
2. ✅ Confirmation modal appears
3. ✅ Message: "Are you sure you want to resign?"
4. Click "Yes, Resign"
5. ✅ Game ends
6. ✅ "Black wins by resignation!" appears
7. ✅ Both players see result
8. ✅ Moves disabled

## Test Scenario 6: Reconnection

### Test Refresh
1. Mid-game, refresh Browser B (F5)
2. ✅ Page reloads
3. ✅ Game state restored
4. ✅ All moves in history
5. ✅ Correct turn indicator
6. ✅ Can continue playing

## Test Scenario 7: Error Cases

### Invalid Code
1. Go to Join Party
2. Enter invalid code: "XYZ999"
3. Click "Join Party"
4. ✅ Error: "Party code not found"

### Party Full
1. Browser A: Create party (code: ABC123)
2. Browser B: Join party (ABC123) - Success
3. Browser C: Try to join same party (ABC123)
4. ✅ Error: "Party already full"

### Expired Party
1. Create party
2. Wait 11 minutes (or manually expire in DB)
3. Try to join
4. ✅ Error: "Party expired"

## Test Scenario 8: Copy Functions

### Copy Code
1. Create party
2. Click "Copy Code"
3. ✅ Button changes to "Copied!"
4. Paste in text editor
5. ✅ Correct 6-char code

### Copy Link
1. Create party
2. Click "Copy Link"
3. ✅ Button changes to "Copied!"
4. Paste in new browser window
5. ✅ Opens Join Party page with code pre-filled

## Test Scenario 9: Connection Status

### Visual Indicators
1. During game, check top of page
2. ✅ Two status indicators: White & Black
3. ✅ Green WiFi icon = connected
4. ✅ Both show as connected

### Disconnect Test (Advanced)
1. Browser A: Open DevTools → Network tab
2. Throttle to "Offline"
3. ✅ White connection turns red
4. ✅ Browser B sees White disconnected
5. Restore connection
6. ✅ Reconnects automatically

## Test Scenario 10: Mobile Responsive

### Mobile View
1. Open on mobile device or resize browser to 375px
2. ✅ Lobby party cards stack vertically
3. ✅ Create/Join buttons full width
4. ✅ Party code large and readable
5. ✅ Chess board fits screen
6. ✅ Move history scrollable
7. ✅ All buttons accessible

## Expected Results Summary

### ✅ All Tests Should Pass
- [x] Party creation works
- [x] Code generation unique
- [x] Join by code works
- [x] Real-time moves sync
- [x] Turn enforcement works
- [x] Invalid moves rejected
- [x] Pawn promotion works
- [x] Check detection works
- [x] Checkmate ends game
- [x] Resignation works
- [x] Refresh preserves state
- [x] Error messages clear
- [x] Copy functions work
- [x] Connection status visible
- [x] Mobile responsive

## Performance Benchmarks

### Expected Latency
- Move sync: < 200ms (typically 50-100ms)
- Party creation: < 500ms
- Join party: < 500ms
- Page load: < 2s

### No Errors Expected
- Browser console: No errors
- Network tab: All requests 200 OK
- WebSocket: Connected and stable

## Troubleshooting

### Moves Not Syncing
1. Check browser console for errors
2. Check Network tab for WebSocket connection
3. Verify Supabase connection in `.env`
4. Check `party_rooms` table in Supabase

### Party Not Found
1. Verify code spelling
2. Check party hasn't expired (10 min)
3. Check `party_rooms` table exists
4. Check realtime publication enabled

### Page Crashes
1. Check browser console
2. Verify React version compatibility
3. Clear browser cache
4. Rebuild: `npm run build`

## Success Criteria

**All tests passed = System ready for production!**

The party system is working correctly if:
1. Two players can create/join and play
2. Moves sync in real-time (<200ms)
3. All chess rules enforced
4. Error messages are clear
5. No console errors
6. No data loss on refresh
7. Mobile experience is smooth

## Next Steps After Testing

1. **Deploy to Production**
   - Set up production Supabase instance
   - Configure environment variables
   - Deploy to hosting platform

2. **Monitor Performance**
   - Track average move latency
   - Monitor WebSocket connections
   - Check database query performance

3. **Extend to Other Games**
   - Copy party system to Connect Four
   - Adapt for Tic-Tac-Toe
   - Implement for Rock Paper Scissors

4. **Add Features**
   - User authentication
   - Game history
   - ELO ratings
   - Tournament mode
