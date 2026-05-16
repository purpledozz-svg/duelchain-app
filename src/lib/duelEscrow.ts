/**
 * Intégration DuelChain — nos contrats déployés sur Base Sepolia (testnet)
 * et Base mainnet (prod).
 *
 * Architecture :
 *  - DuelFactory : crée un DuelEscrow par partie (appelé par le backend)
 *  - DuelEscrow  : les 2 joueurs déposent leur mise ici
 *  - DuelRegistry : registre immuable des résultats
 */
import { parseEther, parseUnits, type Address, zeroAddress } from 'viem';

// ─── Addresses ────────────────────────────────────────────────────────────────

export const CONTRACTS = {
  baseSepolia: {
    chainId: 84532,
    DuelFactory:  '0xe90E0e1dC6285C0A2Da8F0a95949C4372a5477C5' as Address,
    DuelRegistry: '0x036dfc709DE58868F5C39e04C83E82C503e6078a' as Address,
  },
  base: {
    chainId: 8453,
    DuelFactory:  (import.meta.env.VITE_DUEL_FACTORY_MAINNET  || zeroAddress) as Address,
    DuelRegistry: (import.meta.env.VITE_DUEL_REGISTRY_MAINNET || zeroAddress) as Address,
  },
} as const;

// Adresse de l'escrow créé par le backend pour cette partie (stockée dans Supabase)
// Chaque partie = un contrat DuelEscrow distinct.
export const DUEL_FACTORY_ADDRESS: Address = CONTRACTS.baseSepolia.DuelFactory;

export const BASE_CHAIN_ID  = 84532; // Base Sepolia (testnet) — passer à 8453 pour prod
export const BASE_USDC: Address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const NATIVE_ETH: Address = zeroAddress;
export const FEE_BPS = 250n;
export const BPS_DENOMINATOR = 10_000n;

// ─── DuelEscrow ABI (le contrat individuel par partie) ────────────────────────

export const DUEL_ESCROW_ABI = [
  // Dépôt de la mise — appelé par chaque joueur
  {
    type: 'function',
    name: 'deposit',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  // Lecture des infos de la partie
  {
    type: 'function',
    name: 'getInfo',
    inputs: [],
    outputs: [
      { name: 'player1',  type: 'address' },
      { name: 'player2',  type: 'address' },
      { name: 'stake',    type: 'uint256' },
      { name: 'state',    type: 'uint8'   },
      { name: 'winner',   type: 'address' },
    ],
    stateMutability: 'view',
  },
  { type: 'function', name: 'player1',      inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'player2',      inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'stake',        inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'state',        inputs: [], outputs: [{ type: 'uint8'   }], stateMutability: 'view' },
  { type: 'function', name: 'winner',       inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'balance',      inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'feeRecipient', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  {
    type: 'function',
    name: 'deposited',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  // Events
  {
    type: 'event',
    name: 'PlayerDeposited',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DuelResolved',
    inputs: [
      { name: 'winner',  type: 'address', indexed: true },
      { name: 'payout',  type: 'uint256', indexed: false },
      { name: 'fee',     type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DuelCancelled',
    inputs: [],
  },
] as const;

// ─── DuelFactory ABI (utilisé par le backend pour créer les duels) ────────────

export const DUEL_FACTORY_ABI = [
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
  {
    type: 'function',
    name: 'resolveDuel',
    inputs: [
      { name: 'duel',   type: 'address' },
      { name: 'winner', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelDuel',
    inputs: [{ name: 'duel', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  { type: 'function', name: 'minStake',       inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'maxStake',        inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getTotalDuels',  inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'paused',          inputs: [], outputs: [{ type: 'bool'    }], stateMutability: 'view' },
  {
    type: 'event',
    name: 'DuelCreated',
    inputs: [
      { name: 'duelContract', type: 'address', indexed: true },
      { name: 'player1',      type: 'address', indexed: true },
      { name: 'player2',      type: 'address', indexed: true },
      { name: 'stake',        type: 'uint256', indexed: false },
    ],
  },
] as const;

// ─── États du DuelEscrow ──────────────────────────────────────────────────────

export enum DuelStatus {
  Pending   = 0, // En attente des dépôts
  Active    = 1, // Les 2 joueurs ont déposé, partie en cours
  Resolved  = 2, // Gagnant déclaré, fonds distribués
  Cancelled = 3, // Annulé, remboursé
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function usdToEthWei(usd: number, ethPriceUsd: number): bigint {
  const eth = usd / ethPriceUsd;
  return parseEther(eth.toFixed(18));
}

export function usdToUsdcUnits(usd: number): bigint {
  return parseUnits(usd.toFixed(6), 6);
}

export function calculatePayout(stakeUsd: number): { fee: number; winnerPayout: number } {
  const pot = stakeUsd * 2;
  const fee = pot * (Number(FEE_BPS) / Number(BPS_DENOMINATOR));
  return { fee, winnerPayout: pot - fee };
}

export function duelStatusLabel(status: DuelStatus): string {
  return ['En attente', 'En cours', 'Terminé', 'Annulé'][status] ?? 'Inconnu';
}
