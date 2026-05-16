import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AwardRpPayload {
  matchCode: string;
  winnerPlayerId: string | null; // players.id UUID, null = draw
  loserPlayerId: string | null;  // players.id UUID, null = draw
  p1PlayerId: string;
  p2PlayerId: string;
  isDraw: boolean;
}

type RankTier =
  | "Iron" | "Bronze" | "Silver" | "Gold" | "Platinum"
  | "Diamond" | "Obsidian" | "Mythic" | "Legendary" | "Sovereign";

interface TierConfig {
  tier: RankTier;
  minRp: number;
  maxRp: number;
}

const TIER_CONFIGS: TierConfig[] = [
  { tier: "Iron",       minRp: 0,    maxRp: 299 },
  { tier: "Bronze",     minRp: 300,  maxRp: 699 },
  { tier: "Silver",     minRp: 700,  maxRp: 1199 },
  { tier: "Gold",       minRp: 1200, maxRp: 1799 },
  { tier: "Platinum",   minRp: 1800, maxRp: 2499 },
  { tier: "Diamond",    minRp: 2500, maxRp: 3299 },
  { tier: "Obsidian",   minRp: 3300, maxRp: 4199 },
  { tier: "Mythic",     minRp: 4200, maxRp: 5199 },
  { tier: "Legendary",  minRp: 5200, maxRp: 6499 },
  { tier: "Sovereign",  minRp: 6500, maxRp: 999999 },
];

function getTierIdx(rp: number): number {
  const idx = TIER_CONFIGS.findIndex((c) => rp >= c.minRp && rp <= c.maxRp);
  return idx === -1 ? TIER_CONFIGS.length - 1 : idx;
}

function calcDelta(
  outcome: "win" | "loss",
  myRp: number,
  opponentRp: number,
  winStreak: number
): { delta: number; reason: string; streakBonus: number } {
  const myIdx = getTierIdx(myRp);
  const oppIdx = getTierIdx(opponentRp);
  const tierDiff = oppIdx - myIdx;

  let base = 0;
  let reason = "";

  if (outcome === "win") {
    if (tierDiff === 0) { base = 22; reason = "Win vs same rank"; }
    else if (tierDiff > 0) { base = Math.min(35, 28 + tierDiff * 2); reason = `Win vs higher rank`; }
    else { base = Math.max(12, 18 + tierDiff * 2); reason = "Win vs lower rank"; }
  } else {
    if (tierDiff === 0) { base = -14; reason = "Loss vs same rank"; }
    else if (tierDiff > 0) { base = Math.max(-12, -8 - tierDiff); reason = "Loss vs higher rank"; }
    else { base = Math.min(-20, -20 + tierDiff * 2); reason = "Loss vs lower rank"; }
  }

  let streakBonus = 0;
  if (outcome === "win") {
    const newStreak = winStreak + 1;
    if (newStreak >= 10) streakBonus = 8;
    else if (newStreak >= 5) streakBonus = 5;
    else if (newStreak >= 3) streakBonus = 3;
  }

  return { delta: base + streakBonus, reason, streakBonus };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: AwardRpPayload = await req.json();
    const { matchCode, winnerPlayerId, loserPlayerId, p1PlayerId, p2PlayerId, isDraw } = body;

    if (!matchCode || !p1PlayerId || !p2PlayerId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check match hasn't already been awarded RP
    const { data: existing } = await supabase
      .from("rank_history")
      .select("id")
      .eq("match_code", matchCode)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch both players
    const { data: players, error: fetchErr } = await supabase
      .from("players")
      .select("id, player_id, rp, win_streak, peak_rp, competitive_wins, competitive_losses")
      .in("player_id", [p1PlayerId, p2PlayerId]);

    if (fetchErr || !players || players.length < 2) {
      return new Response(JSON.stringify({ error: "Players not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p1 = players.find((p) => p.player_id === p1PlayerId);
    const p2 = players.find((p) => p.player_id === p2PlayerId);

    if (!p1 || !p2) {
      return new Response(JSON.stringify({ error: "One or both players not found", p1PlayerId, p2PlayerId, found: players.map(p => p.player_id) }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isDraw) {
      // Draws: no RP change for either player, just record it
      const historyRows = [
        { player_id: p1.id, match_code: matchCode, rp_before: p1.rp, rp_after: p1.rp, rp_delta: 0, reason: "Draw — no RP change" },
        { player_id: p2.id, match_code: matchCode, rp_before: p2.rp, rp_after: p2.rp, rp_delta: 0, reason: "Draw — no RP change" },
      ];
      await supabase.from("rank_history").insert(historyRows);
      return new Response(JSON.stringify({ ok: true, draw: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!winnerPlayerId || !loserPlayerId) {
      return new Response(JSON.stringify({ error: "Non-draw match must have winner/loser" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine winner/loser player rows
    const winner = players.find((p) => p.id === winnerPlayerId);
    const loser = players.find((p) => p.id === loserPlayerId);

    if (!winner || !loser) {
      return new Response(JSON.stringify({ error: "Winner/loser mapping failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const winnerDelta = calcDelta("win", winner.rp, loser.rp, winner.win_streak);
    const loserDelta = calcDelta("loss", loser.rp, winner.rp, 0);

    const winnerNewRp = Math.max(0, winner.rp + winnerDelta.delta);
    const loserNewRp = Math.max(0, loser.rp + loserDelta.delta);
    const winnerNewPeakRp = Math.max(winner.peak_rp, winnerNewRp);
    const winnerNewStreak = winner.win_streak + 1;

    // Update winner
    await supabase.from("players").update({
      rp: winnerNewRp,
      peak_rp: winnerNewPeakRp,
      win_streak: winnerNewStreak,
      competitive_wins: (winner.competitive_wins ?? 0) + 1,
    }).eq("id", winner.id);

    // Update loser
    await supabase.from("players").update({
      rp: loserNewRp,
      win_streak: 0,
      competitive_losses: (loser.competitive_losses ?? 0) + 1,
    }).eq("id", loser.id);

    // Record history for both
    const streakStr = winnerDelta.streakBonus > 0 ? ` (+${winnerDelta.streakBonus} streak bonus)` : "";
    await supabase.from("rank_history").insert([
      {
        player_id: winner.id,
        match_code: matchCode,
        rp_before: winner.rp,
        rp_after: winnerNewRp,
        rp_delta: winnerDelta.delta,
        reason: winnerDelta.reason + streakStr,
      },
      {
        player_id: loser.id,
        match_code: matchCode,
        rp_before: loser.rp,
        rp_after: loserNewRp,
        rp_delta: loserDelta.delta,
        reason: loserDelta.reason,
      },
    ]);

    return new Response(JSON.stringify({
      ok: true,
      winner: { id: winner.id, rpBefore: winner.rp, rpAfter: winnerNewRp, delta: winnerDelta.delta },
      loser: { id: loser.id, rpBefore: loser.rp, rpAfter: loserNewRp, delta: loserDelta.delta },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[award-rp]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
