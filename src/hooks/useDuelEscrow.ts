/**
 * useDuelEscrow — hook wagmi pour nos contrats DuelEscrow/DuelFactory déployés.
 *
 * Flow :
 *  1. Le backend (Supabase Edge Function) appelle factory.createDuel(p1, p2, stake)
 *     → retourne l'adresse du DuelEscrow → stockée dans party_rooms.duel_escrow_address
 *  2. P1 et P2 appellent tous les deux deposit() sur ce DuelEscrow
 *  3. Le backend appelle factory.resolveDuel(escrowAddr, winner) en fin de partie
 */
import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { type Address } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { DUEL_ESCROW_ABI, BASE_CHAIN_ID } from '../lib/duelEscrow';

export type DepositStep =
  | 'idle'
  | 'locking_stake'
  | 'waiting_stake_confirm'
  | 'stake_locked'
  | 'waiting_opponent'
  | 'both_locked'
  | 'error';

export interface DuelEscrowState {
  step: DepositStep;
  error: string | null;
  txHash: string | null;
}

export function useDuelEscrow() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });
  const { data: walletClient } = useWalletClient({ chainId: BASE_CHAIN_ID });
  const { switchChain } = useSwitchChain();

  const [state, setState] = useState<DuelEscrowState>({
    step: 'idle',
    error: null,
    txHash: null,
  });

  const isOnCorrectChain = chainId === BASE_CHAIN_ID;

  const set = useCallback((partial: Partial<DuelEscrowState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const ensureChain = useCallback(async (): Promise<boolean> => {
    if (isOnCorrectChain) return true;
    try {
      switchChain({ chainId: BASE_CHAIN_ID });
      return true;
    } catch {
      set({ step: 'error', error: 'Veuillez passer sur Base Sepolia.' });
      return false;
    }
  }, [isOnCorrectChain, switchChain, set]);

  /**
   * Dépose la mise dans le DuelEscrow de la partie.
   * Appelé par P1 ET P2 — même fonction, même contrat.
   *
   * @param escrowAddress  Adresse du DuelEscrow créé par le backend pour cette partie
   * @param stakeWei       Mise en wei (doit correspondre exactement au montant attendu)
   */
  const deposit = useCallback(async (
    escrowAddress: Address,
    stakeWei: bigint,
  ): Promise<string> => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet non connecté');
    }
    if (!escrowAddress || escrowAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error("L'adresse du contrat de duel est invalide. Attends que le backend crée la partie.");
    }
    if (!await ensureChain()) throw new Error('Mauvais réseau');

    set({ step: 'locking_stake' });

    const tx = await walletClient.writeContract({
      address: escrowAddress,
      abi: DUEL_ESCROW_ABI,
      functionName: 'deposit',
      value: stakeWei,
      account: address,
      chain: baseSepolia,
    });

    set({ step: 'waiting_stake_confirm', txHash: tx });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    set({ step: 'stake_locked', txHash: tx });

    return tx;
  }, [address, walletClient, publicClient, ensureChain, set]);

  const resetState = useCallback(() => {
    setState({ step: 'idle', error: null, txHash: null });
  }, []);

  return {
    state,
    isOnBase: isOnCorrectChain,
    walletAddress: address,
    deposit,
    resetState,
    setError: (msg: string) => set({ step: 'error', error: msg }),
  };
}
