/**
 * Supabase Edge Function : create-duel-escrow
 *
 * Appelée par le frontend (P1) juste après que matchmake_player retourne "matched".
 * Déploie un DuelEscrow via DuelFactory sur Base Sepolia et stocke l'adresse dans Supabase.
 *
 * Secrets requis (Dashboard → Project Settings → Edge Functions → Secrets) :
 *   DEPLOYER_PRIVATE_KEY   — clé privée du wallet owner de DuelFactory (sans 0x)
 *   SUPABASE_URL           — auto-injecté par Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injecté par Supabase
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createWalletClient, createPublicClient, http, parseEther, type Address } from 'npm:viem';
import { privateKeyToAccount } from 'npm:viem/accounts';
import { baseSepolia } from 'npm:viem/chains';

// ─── Config ───────────────────────────────────────────────────────────────────

const DUEL_FACTORY_ADDRESS = '0xe90E0e1dC6285C0A2Da8F0a95949C4372a5477C5' as Address;
const BASE_SEPOLIA_RPC     = 'https://sepolia.base.org';

const DUEL_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createDuel',
    inputs: [
      { name: 'player1', type: 'address' },
      { name: 'player2', type: 'address' },
      { name: 'stake',   type: 'uint256' },
    ],
    outputs: [{ name: 'duel', type: 'address' }],
    stateMutability: 'nonpayable',
  },
] as const;

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { party_code, eth_price_usd } = await req.json() as {
      party_code: string;
      eth_price_usd: number;
    };

    if (!party_code) {
      return errorResponse('party_code is required', 400);
    }

    // ── Client Supabase admin ────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Récupérer la party room ──────────────────────────────────────────────
    const { data: party, error: fetchError } = await supabase
      .from('party_rooms')
      .select('*')
      .eq('code', party_code.toUpperCase())
      .single();

    if (fetchError || !party) {
      return errorResponse('Party room not found', 404);
    }

    // Idempotence : si l'escrow existe déjà, on retourne directement l'adresse
    if (party.duel_escrow_address) {
      return jsonResponse({ duel_escrow_address: party.duel_escrow_address });
    }

    // Vérifications
    if (!party.p1_wallet || !party.p2_wallet) {
      return errorResponse('Both player wallets are required', 400);
    }
    if (!party.stake_usd || party.stake_usd <= 0) {
      return errorResponse('Invalid stake amount', 400);
    }

    // ── Convertir stake USD → wei ────────────────────────────────────────────
    const ethPrice = eth_price_usd ?? 3000;
    const stakeEth = party.stake_usd / ethPrice;
    const stakeWei = parseEther(stakeEth.toFixed(18));

    // ── Signer avec la clé du deployer ──────────────────────────────────────
    const rawKey = Deno.env.get('DEPLOYER_PRIVATE_KEY');
    if (!rawKey) {
      return errorResponse('DEPLOYER_PRIVATE_KEY not configured', 500);
    }
    const privateKey = (rawKey.startsWith('0x') ? rawKey : '0x' + rawKey) as `0x${string}`;
    const account = privateKeyToAccount(privateKey);

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(BASE_SEPOLIA_RPC),
    });

    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(BASE_SEPOLIA_RPC),
    });

    // ── Appel factory.createDuel(p1, p2, stake) ──────────────────────────────
    console.log(`[create-duel-escrow] Creating duel for party ${party_code}`);
    console.log(`  P1: ${party.p1_wallet}`);
    console.log(`  P2: ${party.p2_wallet}`);
    console.log(`  Stake: ${stakeWei} wei (${stakeEth.toFixed(6)} ETH)`);

    const txHash = await walletClient.writeContract({
      address: DUEL_FACTORY_ADDRESS,
      abi: DUEL_FACTORY_ABI,
      functionName: 'createDuel',
      args: [
        party.p1_wallet as Address,
        party.p2_wallet as Address,
        stakeWei,
      ],
    });

    console.log(`[create-duel-escrow] Tx sent: ${txHash}`);

    // ── Attendre la confirmation et récupérer l'adresse du DuelEscrow ────────
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // L'adresse du DuelEscrow est dans les logs (event DuelCreated)
    const DUEL_CREATED_TOPIC = '0x' + 'DuelCreated'.padStart(64, '0');

    // Récupérer l'adresse depuis l'event DuelCreated
    // topic[1] = duelContract (indexed)
    let escrowAddress: string | null = null;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === DUEL_FACTORY_ADDRESS.toLowerCase()) {
        // topics[1] = duelContract address (indexed, padded à 32 bytes)
        if (log.topics[1]) {
          escrowAddress = '0x' + log.topics[1].slice(26); // retire le padding 0x + 24 zeros
          break;
        }
      }
    }

    if (!escrowAddress) {
      return errorResponse('Could not extract DuelEscrow address from receipt', 500);
    }

    console.log(`[create-duel-escrow] DuelEscrow deployed at: ${escrowAddress}`);

    // ── Mettre à jour Supabase ────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('party_rooms')
      .update({
        duel_escrow_address: escrowAddress,
        onchain_status: 'waiting_p1',
      })
      .eq('code', party_code.toUpperCase());

    if (updateError) {
      console.error('[create-duel-escrow] DB update error:', updateError);
      return errorResponse('Failed to update party room', 500);
    }

    return jsonResponse({ duel_escrow_address: escrowAddress });

  } catch (err) {
    console.error('[create-duel-escrow] Unexpected error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}
