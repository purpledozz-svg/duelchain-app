import { useState, useEffect, useRef } from 'react';
import { PartyRoom } from '../lib/partyService';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { base } from 'wagmi/chains';
import { type Hex, type Address } from 'viem';
import { DUEL_ESCROW_ABI, BASE_CHAIN_ID } from '../lib/duelEscrow';

export interface RpAwardResult {
  myDelta: number;
  myNewRp: number;
  isDraw: boolean;
  awarded: boolean;
  payoutTx?: string | null;
}

/**
 * Calls the award-rp edge function once when a competitive match ends.
 * For competitive (wagered) matches, also:
 *  1. Calls sign-duel-result to get EIP-712 signature from backend
 *  2. Submits result to DuelEscrow contract (triggers on-chain payout)
 *  3. Updates DB onchain_status to 'settled'
 * Returns the RP delta for the local player so the UI can display it.
 */
export function useAwardRp(party: PartyRoom | null, playerRole: 'p1' | 'p2' | null): RpAwardResult | null {
  const { currentPlayer, setCurrentPlayer } = useStore();
  const [result, setResult] = useState<RpAwardResult | null>(null);
  const awardedRef = useRef(false);
  const settledRef = useRef(false);

  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });
  const { data: walletClient } = useWalletClient({ chainId: BASE_CHAIN_ID });

  useEffect(() => {
    if (!party || !party.result || !playerRole || !currentPlayer) return;
    if (party.mode !== 'matchmaking') return;
    if (awardedRef.current) return;
    awardedRef.current = true;

    const run = async () => {
      try {
        const isDraw = party.result!.type === 'draw';
        const winner = party.result!.winner;

        // Determine winner/loser player_id (device IDs stored in party room)
        const winnerDeviceId = winner === 'p1' ? party.p1_id : winner === 'p2' ? party.p2_id : null;
        const loserDeviceId = winner === 'p1' ? party.p2_id : winner === 'p2' ? party.p1_id : null;

        // Look up DB UUIDs by device player_id
        let winnerDbId: string | null = null;
        let loserDbId: string | null = null;

        if (!isDraw && winnerDeviceId && loserDeviceId) {
          const { data: rows } = await supabase.rpc('get_player_ids_by_device', {
            p_device_ids: [winnerDeviceId, loserDeviceId],
          });

          if (rows && rows.length >= 2) {
            winnerDbId = rows.find((r: any) => r.player_id === winnerDeviceId)?.id ?? null;
            loserDbId = rows.find((r: any) => r.player_id === loserDeviceId)?.id ?? null;
          }
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

        // ── Award RP ─────────────────────────────────────────────────────
        const res = await fetch(`${supabaseUrl}/functions/v1/award-rp`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchCode: party.code,
            winnerPlayerId: winnerDbId,
            loserPlayerId: loserDbId,
            p1PlayerId: party.p1_id,
            p2PlayerId: party.p2_id!,
            isDraw,
          }),
        });

        const json = await res.json();

        let myDelta = 0;
        let myNewRp = currentPlayer.rp ?? 0;

        if (json.ok && !json.skipped) {
          const isWinner = !isDraw && winner === playerRole;
          const isLoser = !isDraw && winner !== playerRole;

          if (isDraw) {
            myDelta = 0;
            myNewRp = currentPlayer.rp ?? 0;
          } else if (isWinner && json.winner) {
            myDelta = json.winner.delta;
            myNewRp = json.winner.rpAfter;
          } else if (isLoser && json.loser) {
            myDelta = json.loser.delta;
            myNewRp = json.loser.rpAfter;
          }

          setCurrentPlayer({ ...currentPlayer, rp: myNewRp });
        } else if (json.skipped) {
          setResult({ myDelta: 0, myNewRp: currentPlayer.rp ?? 0, isDraw, awarded: false });
        }

        // ── On-chain settlement (competitive wagered matches only) ────────
        // Only the winner submits the result to save gas. Both players
        // could submit — contract is idempotent once resolved.
        let payoutTx: string | null = null;

        if (
          !isDraw &&
          party.stake_usd &&
          party.duel_id &&
          party.duel_escrow_address &&
          party.onchain_status === 'funded' &&
          !settledRef.current &&
          winner === playerRole &&
          address &&
          walletClient &&
          publicClient
        ) {
          settledRef.current = true;

          const winnerWallet = winner === 'p1' ? party.p1_wallet : party.p2_wallet;
          if (winnerWallet && address.toLowerCase() === winnerWallet.toLowerCase()) {
            try {
              // Get EIP-712 signature from backend
              const signRes = await fetch(`${supabaseUrl}/functions/v1/sign-duel-result`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${anonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  matchCode: party.code,
                  winnerWallet: address,
                }),
              });

              const signJson = await signRes.json();

              if (signJson.ok && signJson.signature) {
                // Submit result to contract
                const tx = await walletClient.writeContract({
                  address: party.duel_escrow_address as Address,
                  abi: DUEL_ESCROW_ABI,
                  functionName: 'submitResult',
                  args: [
                    signJson.duelId as Hex,
                    signJson.winner as Address,
                    signJson.resultHash as Hex,
                    BigInt(signJson.deadline),
                    signJson.signature as Hex,
                  ],
                  chain: base,
                  account: address,
                });

                await publicClient.waitForTransactionReceipt({ hash: tx });
                payoutTx = tx;

                // Update DB: mark as settled
                await supabase.from('party_rooms').update({
                  onchain_status: 'settled',
                  payout_tx: tx,
                  winner_wallet: address,
                }).eq('code', party.code);
              }
            } catch (err) {
              console.error('[useAwardRp] On-chain settlement failed:', err);
              // Non-fatal — RP has been awarded even if contract call fails.
              // The result can be resubmitted later.
            }
          }
        }

        setResult({ myDelta, myNewRp, isDraw, awarded: !json.skipped, payoutTx });

      } catch (err) {
        console.error('[useAwardRp]', err);
      }
    };

    run();
  }, [party?.result, party?.code, playerRole, currentPlayer?.id]);

  return result;
}
