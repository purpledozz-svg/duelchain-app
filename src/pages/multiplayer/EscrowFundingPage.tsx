/**
 * EscrowFundingPage — shown after competitive matchmaking finds an opponent.
 *
 * Flow:
 *  1. Load party room from DB (has duel_id, p1_wallet, p2_wallet, currency, stake_usd)
 *  2. Determine if this player is p1 or p2 by wallet address
 *  3. P1: call createDuel on DuelEscrow
 *     P2: wait for P1 to deposit (onchain_status = waiting_p2), then call joinDuel
 *  4. After both locked (onchain_status = funded), navigate to /game/:game/:code
 *
 * The game CANNOT start from this page — it only navigates once DB confirms funded.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Loader2, AlertTriangle, ArrowLeft,
  Zap, Lock, Clock
} from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useConnectModal, useChainModal } from '@rainbow-me/rainbowkit';
import { type Address } from 'viem';
import { partyService, PartyRoom } from '../../lib/partyService';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { useDuelEscrow, type DepositStep } from '../../hooks/useDuelEscrow';
import { usdToEthWei } from '../../lib/duelEscrow';
import { BASE_USDC_ADDRESS } from '../../lib/wagmi';

const GAME_NAMES: Record<string, string> = {
  chess: 'Chess',
  'connect-four': 'Connect Four',
  tictactoe: 'Tic-Tac-Toe',
  'tic-tac-toe': 'Tic-Tac-Toe',
};

const STEP_LABELS: Record<DepositStep, string> = {
  idle:                  'Ready to deposit',
  locking_stake:         'Lock stake — confirm in wallet',
  waiting_stake_confirm: 'Waiting for stake confirmation...',
  stake_locked:          'Stake locked!',
  waiting_opponent:      'Waiting for opponent deposit...',
  both_locked:           'Both stakes locked — entering arena!',
  error:                 'Transaction failed',
};

export default function EscrowFundingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const { prices } = useStore();
  const isOnBase = chainId === baseSepolia.id;

  const [party, setParty] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'p1' | 'p2' | null>(null);
  const depositStartedRef = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const { data: ethBalance } = useBalance({ address, chainId: baseSepolia.id });
  const { data: usdcBalance } = useBalance({
    address,
    token: BASE_USDC_ADDRESS,
    chainId: baseSepolia.id,
    query: { enabled: isConnected && isOnBase },
  });

  const {
    state: escrowState,
    deposit,
    setError: setEscrowError,
    resetState,
  } = useDuelEscrow();

  const ethPrice = prices?.ETH ?? 3200;

  // ── Load party room ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) return;
    const load = async () => {
      try {
        const p = await partyService.getParty(code);
        if (!p) { setPageError('Party room not found.'); return; }

        // Must be competitive
        if (p.mode !== 'matchmaking' || !p.stake_usd) {
          navigate(`/game/${p.game}/${p.code}`);
          return;
        }

        setParty(p);

        // Determine role
        if (address) {
          const addrLower = address.toLowerCase();
          if (p.p1_wallet?.toLowerCase() === addrLower) setPlayerRole('p1');
          else if (p.p2_wallet?.toLowerCase() === addrLower) setPlayerRole('p2');
        }

        // If already fully funded, go straight to game
        if (p.onchain_status === 'funded') {
          navigate(`/game/${p.game}/${p.code}`);
          return;
        }
      } catch (e) {
        setPageError(e instanceof Error ? e.message : 'Failed to load match');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [code, address, navigate]);

  // ── Subscribe to realtime updates ────────────────────────────────────────
  useEffect(() => {
    if (!party) return;

    unsubRef.current = partyService.subscribeToParty(party.code, (updated) => {
      setParty(updated);
      if (updated.onchain_status === 'funded') {
        navigate(`/game/${updated.game}/${updated.code}`);
      }
      if (updated.onchain_status === 'refunded') {
        setPageError('Match was refunded. No funds were lost.');
      }
    });

    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [party?.code, navigate]);

  // ── Resolve role when wallet connects ────────────────────────────────────
  useEffect(() => {
    if (!party || !address) return;
    const addrLower = address.toLowerCase();
    if (party.p1_wallet?.toLowerCase() === addrLower) setPlayerRole('p1');
    else if (party.p2_wallet?.toLowerCase() === addrLower) setPlayerRole('p2');
    else setPlayerRole(null);
  }, [address, party]);

  // ── Sync DB deposit status after successful tx ────────────────────────────
  const syncDepositToDb = useCallback(async (
    role: 'p1' | 'p2',
    txHash: string,
    stakeTokenAmount: string
  ) => {
    if (!party) return;

    const updateData: Record<string, unknown> = role === 'p1'
      ? {
          p1_deposit_tx: txHash,
          p1_deposited: true,
          stake_token_amount: stakeTokenAmount,
          onchain_status: 'waiting_p2',
        }
      : {
          p2_deposit_tx: txHash,
          p2_deposited: true,
          onchain_status: 'funded',
          status: 'active',
        };

    await supabase.from('party_rooms').update(updateData).eq('code', party.code);
  }, [party]);

  // ── Trigger deposit ──────────────────────────────────────────────────────
  const handleDeposit = useCallback(async () => {
    if (!party || !playerRole || !address || depositStartedRef.current) return;
    if (!isOnBase) { openChainModal?.(); return; }

    // L'adresse du DuelEscrow est créée par le backend (factory.createDuel)
    // et stockée dans party_rooms.duel_escrow_address
    const escrowAddress = (party as PartyRoom & { duel_escrow_address?: string }).duel_escrow_address as Address | undefined;
    if (!escrowAddress) {
      setEscrowError("Le contrat de duel n'est pas encore prêt. Attends quelques secondes.");
      return;
    }

    depositStartedRef.current = true;
    const stakeUsd = party.stake_usd!;
    const stakeWei = usdToEthWei(stakeUsd, ethPrice);

    try {
      // P1 et P2 appellent tous les deux deposit() sur le même DuelEscrow
      const tx = await deposit(escrowAddress, stakeWei);
      await syncDepositToDb(playerRole, tx, stakeWei.toString());
    } catch (err) {
      depositStartedRef.current = false;
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancel')) {
        setEscrowError('Transaction rejected. You can try again.');
      } else if (msg.includes('insufficient') || msg.includes('balance')) {
        setEscrowError('Insufficient balance. Please top up and try again.');
      } else {
        setEscrowError(msg);
      }
    }
  }, [party, playerRole, address, isOnBase, openChainModal, setEscrowError, deposit, syncDepositToDb, ethPrice]);

  // ── Render loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050609] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/40" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-[#050609] text-white pt-20 pb-10 px-4 flex items-center justify-center">
        <div className="max-w-md w-full glass-card p-8 text-center"
          style={{ border: '1px solid rgba(255,64,64,0.3)' }}>
          <AlertTriangle size={32} className="text-[#FF4040] mx-auto mb-4" />
          <h2 className="font-heading text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-white/55 mb-6">{pageError}</p>
          <button onClick={() => navigate('/lobby')}
            className="px-6 py-3 rounded-xl font-heading text-sm font-semibold tracking-wider text-white transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(176,38,255,0.3), rgba(255,38,122,0.22))', border: '1px solid rgba(255,38,122,0.45)' }}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!party) return null;

  const currency = party.currency ?? 'ETH';
  const stakeUsd = party.stake_usd ?? 0;
  const totalPot = stakeUsd * 2;
  const fee = totalPot * 0.025;
  const winnerPayout = totalPot - fee;
  const gameName = GAME_NAMES[party.game] ?? party.game;

  const myDeposited = playerRole === 'p1' ? party.p1_deposited : party.p2_deposited;
  const opponentDeposited = playerRole === 'p1' ? party.p2_deposited : party.p1_deposited;

  const onchainStatus = party.onchain_status;
  const p2WaitsForP1 = playerRole === 'p2' && onchainStatus === 'waiting_p1';
  const escrowAddress = (party as PartyRoom & { duel_escrow_address?: string }).duel_escrow_address;

  const balanceStr = currency === 'ETH'
    ? `${Number(ethBalance?.value ? Number(ethBalance.value) / 1e18 : 0).toFixed(4)} ETH`
    : `${Number(usdcBalance?.value ? Number(usdcBalance.value) / 1e6 : 0).toFixed(2)} USDC`;

  const stakeDisplay = currency === 'ETH'
    ? `${(stakeUsd / ethPrice).toFixed(5)} ETH`
    : `${stakeUsd.toFixed(2)} USDC`;

  const stepLabel = STEP_LABELS[escrowState.step] ?? '';

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-10 px-4 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-x-0 top-16 h-[480px]"
        style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(255,159,67,0.12), transparent 55%), radial-gradient(ellipse at 70% 10%, rgba(255,38,122,0.1), transparent 55%)' }} />

      <div className="relative max-w-lg mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/lobby')}
          className="mb-8 inline-flex items-center gap-2 text-sm font-heading text-white/55 hover:text-white transition-colors group"
        >
          <span className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:border-white/20"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={13} />
          </span>
          Back to Lobby
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card p-8 relative overflow-hidden"
        >
          {/* Ambient glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-[80px] opacity-20 pointer-events-none"
            style={{ background: '#FF9F43' }} />

          <div className="relative">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                style={{ background: 'rgba(255,159,67,0.1)', border: '1px solid rgba(255,159,67,0.3)' }}>
                <Lock size={11} className="text-[#FF9F43]" />
                <span className="text-[10px] font-heading uppercase tracking-[0.25em] text-[#FF9F43]">Lock your stake</span>
              </div>
              <h1 className="text-3xl font-heading font-bold tracking-tight mb-1">{gameName}</h1>
              <p className="text-sm text-white/50">Competitive match · Both players must lock funds before game starts</p>
            </div>

            {/* Match details */}
            <div className="rounded-xl p-5 mb-6 space-y-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50 font-mono">Your stake</span>
                <span className="font-heading font-semibold text-white">${stakeUsd} ({stakeDisplay})</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50 font-mono">Total pot</span>
                <span className="font-heading text-white">${totalPot}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50 font-mono">Platform fee (2.5%)</span>
                <span className="font-mono text-white/60">${fee.toFixed(2)}</span>
              </div>
              <div className="h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50 font-mono">Winner receives</span>
                <span className="font-heading font-bold text-[#38F5B3]">${winnerPayout.toFixed(2)}</span>
              </div>
              {isConnected && isOnBase && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50 font-mono">Your balance</span>
                  <span className="font-mono text-white/70">{balanceStr}</span>
                </div>
              )}
            </div>

            {/* Player status */}
            <div className="rounded-xl p-4 mb-6"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] font-heading uppercase tracking-[0.22em] text-white/40 mb-3">Deposit status</p>
              <div className="space-y-3">
                <DepositStatusRow
                  label="Player 1"
                  isYou={playerRole === 'p1'}
                  deposited={party.p1_deposited}
                  txHash={party.p1_deposit_tx}
                />
                <DepositStatusRow
                  label="Player 2"
                  isYou={playerRole === 'p2'}
                  deposited={party.p2_deposited}
                  txHash={party.p2_deposit_tx}
                />
              </div>
            </div>

            {/* Wallet not connected */}
            {!isConnected && (
              <button onClick={() => openConnectModal?.()}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-heading font-semibold text-sm tracking-[0.2em] uppercase text-white"
                style={{ background: 'linear-gradient(135deg, #B026FF, #FF267A)', boxShadow: '0 8px 24px rgba(176,38,255,0.4)' }}>
                <Zap size={15} /> Connect Wallet
              </button>
            )}

            {/* Wrong network */}
            {isConnected && !isOnBase && (
              <button onClick={() => openChainModal?.()}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-heading font-semibold text-sm tracking-[0.2em] uppercase text-white"
                style={{ background: 'linear-gradient(135deg, rgba(255,64,64,0.5), rgba(255,159,67,0.4))', border: '1px solid rgba(255,64,64,0.5)' }}>
                <AlertTriangle size={15} /> Switch to Base
              </button>
            )}

            {/* Wallet address not recognised (not p1 or p2) */}
            {isConnected && isOnBase && playerRole === null && (
              <div className="rounded-xl px-4 py-4 text-center"
                style={{ background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.3)' }}>
                <p className="text-[#FF6B6B] text-sm font-heading font-semibold mb-1">Wrong wallet</p>
                <p className="text-white/50 text-xs">
                  This match was created with a different wallet address.<br />
                  Switch to the wallet you used to join matchmaking.
                </p>
              </div>
            )}

            {/* Escrow not ready yet (backend n'a pas encore créé le contrat) */}
            {isConnected && isOnBase && playerRole !== null && !escrowAddress && (
              <div className="rounded-xl px-4 py-4 text-center"
                style={{ background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.3)' }}>
                <p className="text-[#FF9F43] text-sm font-heading font-semibold mb-1">Préparation du contrat...</p>
                <p className="text-white/50 text-xs">
                  Le contrat de duel est en cours de création.<br />
                  Cela prend quelques secondes après le matchmaking.
                </p>
              </div>
            )}

            {/* P2 waiting for P1 to deposit */}
            {isConnected && isOnBase && p2WaitsForP1 && (
              <div className="rounded-xl px-4 py-4 flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Loader2 size={16} className="animate-spin text-[#38F5B3] flex-shrink-0" />
                <div>
                  <p className="text-sm font-heading text-white">Waiting for opponent to deposit...</p>
                  <p className="text-[11px] text-white/40 mt-0.5">You'll be prompted once they lock their stake</p>
                </div>
              </div>
            )}

            {/* P1 waiting for P2 to deposit (after P1 already deposited) */}
            {playerRole === 'p1' && myDeposited && !opponentDeposited && (
              <div className="rounded-xl px-4 py-4 flex items-center gap-3"
                style={{ background: 'rgba(56,245,179,0.06)', border: '1px solid rgba(56,245,179,0.2)' }}>
                <Loader2 size={16} className="animate-spin text-[#38F5B3] flex-shrink-0" />
                <div>
                  <p className="text-sm font-heading text-white">Stake locked! Waiting for opponent...</p>
                  <p className="text-[11px] text-white/40 mt-0.5">Game starts once both stakes are confirmed</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {escrowState.step === 'error' && escrowState.error && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl px-4 py-3 mb-4"
                  style={{ background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.3)' }}>
                  <p className="text-[#FF6B6B] text-sm">{escrowState.error}</p>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Main deposit CTA */}
            {isConnected && isOnBase && playerRole !== null && !!escrowAddress && !myDeposited && !p2WaitsForP1 && (
              <>
                {/* Step indicator when in progress */}
                {escrowState.step !== 'idle' && escrowState.step !== 'error' && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Loader2 size={14} className="animate-spin text-[#38F5B3] flex-shrink-0" />
                    <span className="text-sm font-mono text-white/70">{stepLabel}</span>
                    {escrowState.txHash && (
                      <a
                        href={`https://basescan.org/tx/${escrowState.txHash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="ml-auto text-[10px] font-mono text-white/40 hover:text-white/80 transition-colors"
                      >
                        View tx
                      </a>
                    )}
                  </div>
                )}

                <button
                  onClick={escrowState.step === 'error' ? () => { resetState(); depositStartedRef.current = false; } : handleDeposit}
                  disabled={escrowState.step !== 'idle' && escrowState.step !== 'error'}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-heading font-semibold text-sm tracking-[0.2em] uppercase text-white transition-all disabled:opacity-60"
                  style={{
                    background: escrowState.step === 'error'
                      ? 'linear-gradient(135deg, rgba(255,64,64,0.3), rgba(255,159,67,0.2))'
                      : 'linear-gradient(135deg, #FF9F43 0%, #FF267A 100%)',
                    boxShadow: escrowState.step === 'error'
                      ? 'none'
                      : '0 8px 28px rgba(255,159,67,0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
                    border: escrowState.step === 'error' ? '1px solid rgba(255,64,64,0.4)' : 'none',
                  }}
                >
                  {escrowState.step !== 'idle' && escrowState.step !== 'error' ? (
                    <><Loader2 size={15} className="animate-spin" /> {stepLabel}</>
                  ) : escrowState.step === 'error' ? (
                    'Try Again'
                  ) : (
                    <><Lock size={15} /> Lock ${stakeUsd} {currency === 'ETH' ? 'ETH' : 'USDC'}</>
                  )}
                </button>
              </>
            )}

            {/* Both deposited — success */}
            {myDeposited && opponentDeposited && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl px-4 py-4 flex items-center gap-3"
                style={{ background: 'rgba(56,245,179,0.08)', border: '1px solid rgba(56,245,179,0.3)' }}>
                <CheckCircle size={18} className="text-[#38F5B3] flex-shrink-0" />
                <div>
                  <p className="text-sm font-heading text-white font-semibold">Both stakes locked — entering arena!</p>
                  <p className="text-[11px] text-white/40 mt-0.5">Navigating to game...</p>
                </div>
              </motion.div>
            )}

            {/* Safety footer */}
            <p className="mt-5 text-center text-[11px] font-mono text-white/30">
              Funds held by DuelEscrow on Base · 2.5% platform fee on payout
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function DepositStatusRow({
  label, isYou, deposited, txHash
}: {
  label: string;
  isYou: boolean;
  deposited: boolean;
  txHash: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: deposited ? 'rgba(56,245,179,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${deposited ? 'rgba(56,245,179,0.3)' : 'rgba(255,255,255,0.1)'}`,
        }}>
        {deposited
          ? <CheckCircle size={14} className="text-[#38F5B3]" />
          : <Clock size={12} className="text-white/30" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-heading text-white">
          {label}{isYou ? ' (You)' : ''}
        </span>
        {txHash && (
          <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="block text-[10px] font-mono text-white/35 hover:text-white/70 transition-colors truncate mt-0.5">
            {txHash.slice(0, 10)}...{txHash.slice(-6)}
          </a>
        )}
      </div>
      <span className="text-[11px] font-mono flex-shrink-0"
        style={{ color: deposited ? '#38F5B3' : 'rgba(255,255,255,0.3)' }}>
        {deposited ? 'Locked' : 'Pending'}
      </span>
    </div>
  );
}
