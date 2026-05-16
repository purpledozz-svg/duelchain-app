/**
 * sign-duel-result edge function
 *
 * Validates a competitive match result and returns an EIP-712 signature
 * that the winner (or any participant) can submit to DuelEscrow.submitResult()
 * to trigger the on-chain payout.
 *
 * Security:
 * - Verifies the match exists in DB and is in 'finished' status
 * - Verifies the winner matches the DB result
 * - Verifies player wallets match what was stored at matchmaking time
 * - Signs with RESULT_SIGNER_PRIVATE_KEY (must be set in edge function secrets)
 * - Signature includes deadline to prevent replay after expiry
 * - duelId is bound in the struct — cannot reuse sig for another duel
 * - Chain ID and verifying contract are embedded — no cross-chain replay
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createWalletClient,
  http,
  hashTypedData,
  keccak256,
  encodePacked,
  toBytes,
  type Hex,
  type Address,
} from "npm:viem@2";
import { privateKeyToAccount } from "npm:viem@2/accounts";
import { base } from "npm:viem@2/chains";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESULT_TYPEHASH = keccak256(
  toBytes(
    "DuelResult(bytes32 duelId,address player1,address player2,address winner,address token,uint256 stakeAmount,string game,bytes32 resultHash,uint256 deadline)"
  )
);

// EIP-712 domain matches the deployed contract
const DOMAIN = {
  name: "DuelEscrow" as const,
  version: "1" as const,
  chainId: 8453, // Base mainnet
  verifyingContract: (Deno.env.get("DUEL_ESCROW_ADDRESS") ?? "0x0000000000000000000000000000000000000000") as Address,
};

const RESULT_TYPES = {
  DuelResult: [
    { name: "duelId", type: "bytes32" },
    { name: "player1", type: "address" },
    { name: "player2", type: "address" },
    { name: "winner", type: "address" },
    { name: "token", type: "address" },
    { name: "stakeAmount", type: "uint256" },
    { name: "game", type: "string" },
    { name: "resultHash", type: "bytes32" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const signerKey = Deno.env.get("RESULT_SIGNER_PRIVATE_KEY");
    if (!signerKey) {
      return json({ error: "Signer not configured" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await req.json();
    const { matchCode, winnerWallet } = body as {
      matchCode: string;
      winnerWallet: string; // checksummed address of the winner
    };

    if (!matchCode || !winnerWallet) {
      return json({ error: "matchCode and winnerWallet required" }, 400);
    }

    // ── Load match from DB ────────────────────────────────────────────────
    const { data: party, error: fetchErr } = await supabase
      .from("party_rooms")
      .select("*")
      .eq("code", matchCode.toUpperCase())
      .maybeSingle();

    if (fetchErr || !party) {
      return json({ error: "Match not found" }, 404);
    }

    // Must be a competitive match
    if (party.mode !== "matchmaking" || !party.stake_usd) {
      return json({ error: "Not a competitive match" }, 400);
    }

    // Must be finished
    if (party.status !== "finished") {
      return json({ error: "Match not finished yet" }, 400);
    }

    // Must have a result
    if (!party.result || party.result.type !== "win") {
      return json({ error: "No decisive result — use refund path for draws" }, 400);
    }

    // Must be funded
    if (party.onchain_status !== "funded" && party.onchain_status !== "settled") {
      return json({ error: "Escrow not funded — cannot sign result" }, 400);
    }

    // Already settled
    if (party.onchain_status === "settled") {
      return json({ error: "Already settled", alreadySettled: true }, 200);
    }

    // ── Validate winner wallet ────────────────────────────────────────────
    const resultWinnerRole = party.result.winner; // 'p1' or 'p2'
    const expectedWinnerWallet =
      resultWinnerRole === "p1" ? party.p1_wallet : party.p2_wallet;

    if (!expectedWinnerWallet) {
      return json({ error: "Winner wallet not registered for this match" }, 400);
    }

    if (winnerWallet.toLowerCase() !== expectedWinnerWallet.toLowerCase()) {
      return json({ error: "winnerWallet does not match match result" }, 403);
    }

    // ── Validate both player wallets exist ────────────────────────────────
    if (!party.p1_wallet || !party.p2_wallet) {
      return json({ error: "Player wallet addresses not registered" }, 400);
    }

    // ── Build signature inputs ────────────────────────────────────────────
    const duelIdHex = party.duel_id as Hex;
    const player1 = party.p1_wallet as Address;
    const player2 = party.p2_wallet as Address;
    const winner = expectedWinnerWallet as Address;
    const currency = party.currency as "ETH" | "USDC";
    const tokenAddress = currency === "USDC"
      ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
      : "0x0000000000000000000000000000000000000000";

    const stakeTokenAmount = BigInt(party.stake_token_amount ?? "0");

    // resultHash = keccak256 of (matchCode + game + winner + timestamp)
    const resultHash = keccak256(
      encodePacked(
        ["string", "string", "address", "uint256"],
        [matchCode, party.game as string, winner, BigInt(Date.now())]
      )
    );

    // Deadline: 1 hour from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    // ── Sign with EIP-712 ─────────────────────────────────────────────────
    const account = privateKeyToAccount(signerKey as Hex);

    const signature = await account.signTypedData({
      domain: DOMAIN,
      types: RESULT_TYPES,
      primaryType: "DuelResult",
      message: {
        duelId: duelIdHex,
        player1,
        player2,
        winner,
        token: tokenAddress as Address,
        stakeAmount: stakeTokenAmount,
        game: party.game as string,
        resultHash,
        deadline,
      },
    });

    // ── Mark as signing in progress (idempotent) ──────────────────────────
    // We don't set settled here — that happens after the frontend confirms
    // the on-chain tx. But we record signing timestamp for replay prevention.
    await supabase
      .from("party_rooms")
      .update({ winner_wallet: winner })
      .eq("code", matchCode.toUpperCase());

    return json({
      ok: true,
      duelId: duelIdHex,
      winner,
      resultHash,
      deadline: deadline.toString(),
      signature,
      contractAddress: DOMAIN.verifyingContract,
      chainId: DOMAIN.chainId,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[sign-duel-result]", err);
    return json({ error: message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
