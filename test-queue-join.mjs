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

console.log('🧪 Testing Matchmaking Queue Join');
console.log('==================================\n');

async function testQueueJoin() {
  const playerId = `test-${Date.now()}`;
  const game = 'chess';

  console.log(`Testing with player: ${playerId}`);
  console.log(`Game: ${game}\n`);

  // Test 1: Insert into queue
  console.log('Test 1: Joining queue with INSERT...');
  const { error: insertError } = await supabase
    .from('matchmaking_queue')
    .insert({
      player_id: playerId,
      game,
      last_seen_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('❌ INSERT failed:', insertError);
    return false;
  }
  console.log('✅ INSERT successful\n');

  // Test 2: Try to upsert (should update existing row)
  console.log('Test 2: Rejoining queue with UPSERT...');
  const { error: upsertError } = await supabase
    .from('matchmaking_queue')
    .upsert({
      player_id: playerId,
      game,
      last_seen_at: new Date().toISOString(),
    }, {
      onConflict: 'player_id'
    });

  if (upsertError) {
    console.error('❌ UPSERT failed:', upsertError);
    await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);
    return false;
  }
  console.log('✅ UPSERT successful\n');

  // Test 3: Verify only one entry exists
  console.log('Test 3: Verifying single entry...');
  const { data: entries, error: selectError } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('player_id', playerId);

  if (selectError) {
    console.error('❌ SELECT failed:', selectError);
    await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);
    return false;
  }

  if (entries.length !== 1) {
    console.error(`❌ Expected 1 entry, found ${entries.length}`);
    await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);
    return false;
  }
  console.log('✅ Single entry verified\n');

  // Test 4: Update heartbeat
  console.log('Test 4: Updating heartbeat...');
  const { error: heartbeatError } = await supabase.rpc('update_queue_heartbeat', {
    p_player_id: playerId
  });

  if (heartbeatError) {
    console.error('❌ Heartbeat update failed:', heartbeatError);
    await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);
    return false;
  }
  console.log('✅ Heartbeat update successful\n');

  // Cleanup
  console.log('Cleaning up...');
  await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);
  console.log('✅ Cleanup complete\n');

  return true;
}

async function testMatching() {
  console.log('Test 5: Testing match creation...');

  const player1 = `test-p1-${Date.now()}`;
  const player2 = `test-p2-${Date.now()}`;
  const game = 'chess';

  // Add two players to queue
  await supabase.from('matchmaking_queue').insert([
    { player_id: player1, game, last_seen_at: new Date().toISOString() },
    { player_id: player2, game, last_seen_at: new Date().toISOString() }
  ]);

  console.log(`Added players: ${player1}, ${player2}`);

  // Try to match
  const { data: matchResult, error: matchError } = await supabase
    .rpc('match_players', { game_type: game })
    .maybeSingle();

  if (matchError) {
    console.error('❌ Match failed:', matchError);
    await supabase.from('matchmaking_queue').delete().in('player_id', [player1, player2]);
    return false;
  }

  if (!matchResult) {
    console.error('❌ No match created');
    await supabase.from('matchmaking_queue').delete().in('player_id', [player1, player2]);
    return false;
  }

  console.log('✅ Match created:', matchResult);

  // Verify queue is empty
  const { data: remainingQueue } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .in('player_id', [player1, player2]);

  if (remainingQueue && remainingQueue.length > 0) {
    console.error('❌ Players still in queue after match');
    await supabase.from('matchmaking_queue').delete().in('player_id', [player1, player2]);
    return false;
  }

  console.log('✅ Players removed from queue');

  // Cleanup match room
  await supabase.from('party_rooms').delete().eq('code', matchResult.match_code);
  console.log('✅ Cleanup complete\n');

  return true;
}

// Run tests
(async () => {
  try {
    const test1 = await testQueueJoin();
    const test2 = await testMatching();

    console.log('📊 RESULTS');
    console.log('==========');
    console.log(`Queue Join Test: ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Match Creation Test: ${test2 ? '✅ PASSED' : '❌ FAILED'}`);

    if (test1 && test2) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Matchmaking system is working correctly');
      process.exit(0);
    } else {
      console.log('\n❌ SOME TESTS FAILED');
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Test error:', err);
    process.exit(1);
  }
})();
