import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulatePlayer(playerNum, game) {
  const playerId = `test-player-${playerNum}-${Date.now()}`;

  console.log(`\n👤 Player ${playerNum} (${playerId})`);
  console.log(`   Joining ${game} queue...`);

  // Join queue
  const { error: joinError } = await supabase
    .from('matchmaking_queue')
    .insert({
      player_id: playerId,
      game,
      last_seen_at: new Date().toISOString(),
    });

  if (joinError) {
    console.error(`   ❌ Failed to join:`, joinError.message);
    return null;
  }

  console.log(`   ✅ Joined queue`);

  // Subscribe to matches
  return new Promise((resolve) => {
    const channel = supabase
      .channel(`match-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'party_rooms',
          filter: `p1_id=eq.${playerId}`,
        },
        (payload) => {
          if (payload.new.mode === 'matchmaking') {
            console.log(`   🎉 Player ${playerNum} MATCHED as P1! Code: ${payload.new.code}`);
            supabase.removeChannel(channel);
            resolve({ player: playerNum, role: 'p1', code: payload.new.code, match: payload.new });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'party_rooms',
          filter: `p2_id=eq.${playerId}`,
        },
        (payload) => {
          if (payload.new.mode === 'matchmaking') {
            console.log(`   🎉 Player ${playerNum} MATCHED as P2! Code: ${payload.new.code}`);
            supabase.removeChannel(channel);
            resolve({ player: playerNum, role: 'p2', code: payload.new.code, match: payload.new });
          }
        }
      )
      .subscribe();

    // Simulate heartbeat
    const heartbeatInterval = setInterval(async () => {
      await supabase.rpc('update_queue_heartbeat', { p_player_id: playerId });
    }, 10000);

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(heartbeatInterval);
      console.log(`   ⏰ Player ${playerNum} timed out (no match found)`);
      supabase.removeChannel(channel);
      resolve(null);
    }, 30000);
  });
}

async function testSequentialMatching() {
  console.log('\n🧪 TEST 1: Sequential Matching (2 players)');
  console.log('==========================================');

  const game = 'chess';

  // Start both players
  const [result1, result2] = await Promise.all([
    simulatePlayer(1, game),
    simulatePlayer(2, game),
  ]);

  // Try to trigger matching
  console.log('\n🔄 Triggering match...');
  const { data: matchData } = await supabase
    .rpc('match_players', { game_type: game })
    .maybeSingle();

  if (matchData) {
    console.log('✅ Match created:', matchData);
  }

  // Wait for results
  await new Promise(r => setTimeout(r, 3000));

  if (result1 && result2) {
    console.log('\n✅ TEST 1 PASSED: Both players matched');
    return true;
  } else {
    console.log('\n❌ TEST 1 FAILED: Players did not match');
    return false;
  }
}

async function testQueueCounts() {
  console.log('\n🧪 TEST 2: Queue Counts');
  console.log('=======================');

  const game = 'connect-four';
  const playerId1 = `test-queue-1-${Date.now()}`;
  const playerId2 = `test-queue-2-${Date.now()}`;

  // Add 2 players
  await supabase.from('matchmaking_queue').insert([
    { player_id: playerId1, game, last_seen_at: new Date().toISOString() },
    { player_id: playerId2, game, last_seen_at: new Date().toISOString() },
  ]);

  // Get counts
  const { data: counts } = await supabase.rpc('get_queue_counts');

  console.log('Queue counts:', counts);

  const connectFourCount = counts?.find(c => c.game_id === game)?.player_count || 0;

  // Cleanup
  await supabase.from('matchmaking_queue').delete().in('player_id', [playerId1, playerId2]);

  if (connectFourCount >= 2) {
    console.log('✅ TEST 2 PASSED: Queue counts working');
    return true;
  } else {
    console.log(`❌ TEST 2 FAILED: Expected >= 2, got ${connectFourCount}`);
    return false;
  }
}

async function testCleanup() {
  console.log('\n🧪 TEST 3: Stale Entry Cleanup');
  console.log('================================');

  const game = 'tic-tac-toe';
  const playerId = `test-stale-${Date.now()}`;

  // Add player with old timestamp (40 seconds ago)
  const oldTimestamp = new Date(Date.now() - 40000).toISOString();
  await supabase.from('matchmaking_queue').insert({
    player_id: playerId,
    game,
    last_seen_at: oldTimestamp,
  });

  console.log('Added stale entry (40s old)');

  // Run cleanup
  const { data: deletedCount } = await supabase.rpc('cleanup_stale_queue_entries');

  console.log(`Deleted ${deletedCount} stale entries`);

  // Verify removed
  const { data: checkData } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();

  if (!checkData) {
    console.log('✅ TEST 3 PASSED: Stale entry cleaned up');
    return true;
  } else {
    console.log('❌ TEST 3 FAILED: Stale entry still exists');
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');

  // Remove all test entries
  await supabase.from('matchmaking_queue').delete().like('player_id', 'test-%');
  await supabase.from('party_rooms').delete().like('p1_id', 'test-%');

  console.log('✅ Cleanup complete');
}

// Run tests
(async () => {
  console.log('🚀 MATCHMAKING SYSTEM TESTS');
  console.log('============================\n');

  const results = [];

  try {
    // Test 1: Sequential matching (disabled for now as it requires real-time)
    // results.push(await testSequentialMatching());

    // Test 2: Queue counts
    results.push(await testQueueCounts());

    // Test 3: Cleanup
    results.push(await testCleanup());

    await cleanup();

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('\n📊 RESULTS');
    console.log('==========');
    console.log(`Passed: ${passed}/${total}`);

    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED!');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED');
      process.exit(1);
    }

  } catch (err) {
    console.error('💥 Test error:', err);
    await cleanup();
    process.exit(1);
  }
})();
