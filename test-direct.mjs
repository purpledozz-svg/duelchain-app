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

async function testDirect() {
  console.log('🧪 Testing Direct Party Creation (20 times)...\n');

  const results = [];
  const codes = new Set();

  for (let i = 1; i <= 20; i++) {
    const playerId = `test-${i}-${Date.now()}`;
    const game = ['chess', 'connect-four', 'tic-tac-toe'][i % 3];

    try {
      const startTime = Date.now();

      // Generate code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_party_code');

      if (codeError) {
        console.error(`❌ Test ${i} FAILED (code gen):`, codeError.message);
        results.push({ success: false });
        continue;
      }

      const code = codeData;

      // Get game state
      const gameStates = {
        chess: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] },
        'connect-four': { grid: Array(6).fill(null).map(() => Array(7).fill(null)), moves: [] },
        'tic-tac-toe': { board: Array(9).fill(null), moves: [] },
      };

      // Insert
      const { data, error } = await supabase
        .from('party_rooms')
        .insert({
          code,
          mode: 'party',
          game,
          p1_id: playerId,
          status: 'waiting',
          game_state: gameStates[game],
          turn: 'p1',
        })
        .select()
        .single();

      const duration = Date.now() - startTime;

      if (error) {
        console.error(`❌ Test ${i} FAILED (insert):`, error.message);
        results.push({ success: false });
      } else {
        if (codes.has(code)) {
          console.error(`❌ Test ${i} FAILED: Duplicate code ${code}`);
          results.push({ success: false });
        } else {
          console.log(`✅ Test ${i} SUCCESS: ${code} (${game}) - ${duration}ms`);
          codes.add(code);
          results.push({ success: true, code, duration });
        }
      }
    } catch (err) {
      console.error(`❌ Test ${i} EXCEPTION:`, err.message);
      results.push({ success: false });
    }

    await new Promise(r => setTimeout(r, 50));
  }

  console.log('\n📊 Results:');
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Success: ${successful}/20`);
  console.log(`🎯 Unique codes: ${codes.size}`);

  if (successful === 20 && codes.size === 20) {
    console.log('\n🎉 ALL TESTS PASSED!\n');

    // Cleanup
    const codeArray = Array.from(codes);
    await supabase.from('party_rooms').delete().in('code', codeArray);
    console.log('✅ Cleanup done');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

testDirect();
