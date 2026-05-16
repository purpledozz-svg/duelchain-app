import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, RotateCcw, Swords, Hammer, FileText, Scissors } from 'lucide-react';
import {
  createGameState, playRound,
  type Choice, type GameState,
} from '../../games/rps/engine';

const CHOICES: { id: Choice; label: string; beats: string; icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { id: 'rock', label: 'Rock', beats: 'Scissors', icon: Hammer },
  { id: 'paper', label: 'Paper', beats: 'Rock', icon: FileText },
  { id: 'scissors', label: 'Scissors', beats: 'Paper', icon: Scissors },
];

function choiceStyle(id: Choice): React.CSSProperties {
  if (id === 'rock') return {
    background: 'linear-gradient(135deg, rgba(255,64,64,0.2), rgba(255,64,64,0.08))',
    border: '1px solid rgba(255,64,64,0.35)',
  };
  if (id === 'paper') return {
    background: 'linear-gradient(135deg, rgba(176,38,255,0.2), rgba(176,38,255,0.08))',
    border: '1px solid rgba(176,38,255,0.35)',
  };
  return {
    background: 'linear-gradient(135deg, rgba(56,245,179,0.2), rgba(56,245,179,0.08))',
    border: '1px solid rgba(56,245,179,0.35)',
  };
}

function choiceGlow(id: Choice): string {
  if (id === 'rock') return '0 0 30px rgba(255,64,64,0.3)';
  if (id === 'paper') return '0 0 30px rgba(176,38,255,0.3)';
  return '0 0 30px rgba(56,245,179,0.3)';
}

function choiceColor(id: Choice): string {
  if (id === 'rock') return '#FF4040';
  if (id === 'paper') return '#B026FF';
  return '#38F5B3';
}

export const RockPaperScissors = () => {
  const navigate = useNavigate();
  const [gs, setGs] = useState<GameState>(createGameState());
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [revealPhase, setRevealPhase] = useState(false);
  const [locked, setLocked] = useState(false);

  const handleChoice = (choice: Choice) => {
    if (locked || gs.status !== 'playing') return;
    setLocked(true);
    setPendingChoice(choice);
    setRevealPhase(false);

    // Reveal after short delay
    setTimeout(() => {
      setRevealPhase(true);
      const { state: next } = playRound(gs, choice);
      setTimeout(() => {
        setGs(next);
        setPendingChoice(null);
        setRevealPhase(false);
        setLocked(false);
      }, 2200);
    }, 600);
  };

  const reset = () => {
    setGs(createGameState());
    setPendingChoice(null);
    setRevealPhase(false);
    setLocked(false);
  };

  const lastRound = gs.rounds[gs.rounds.length - 1] ?? null;

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-64 rounded-full blur-[100px] opacity-15"
          style={{ background: '#B026FF' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-64 rounded-full blur-[100px] opacity-12"
          style={{ background: '#FF267A' }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <ArrowLeft size={16} /> Back to Lobby
          </button>
          <div className="text-center">
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em]">DUELCHAIN</p>
            <h1 className="text-3xl font-heading font-bold">Rock Paper Scissors</h1>
          </div>
          <button onClick={reset}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        {/* Score strip */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <p className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/35 mb-1">You</p>
            <motion.p key={gs.playerWins} initial={{ scale: 1.6 }} animate={{ scale: 1 }}
              className="text-5xl font-heading font-black" style={{ color: '#FF267A' }}>
              {gs.playerWins}
            </motion.p>
          </div>

          {/* Round dots */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }, (_, i) => {
                const r = gs.rounds[i];
                const color = r ? (r.result === 'win' ? '#FF267A' : r.result === 'lose' ? '#38F5B3' : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.08)';
                return (
                  <motion.div key={i} initial={r ? { scale: 1.5 } : {}} animate={{ scale: 1 }}
                    className="w-3 h-3 rounded-full"
                    style={{ background: color, boxShadow: r ? `0 0 6px ${color}` : 'none' }} />
                );
              })}
            </div>
            <p className="text-xs font-mono text-white/30">Round {Math.min(gs.currentRound, 5)} / 5</p>
            <p className="text-[10px] font-mono text-white/20">First to 3 wins</p>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/35 mb-1">Opponent</p>
            <motion.p key={gs.opponentWins} initial={{ scale: 1.6 }} animate={{ scale: 1 }}
              className="text-5xl font-heading font-black" style={{ color: '#38F5B3' }}>
              {gs.opponentWins}
            </motion.p>
          </div>
        </div>

        {/* Arena */}
        <div className="rounded-2xl p-6 sm:p-8 mb-8" style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {gs.status === 'playing' && (
            <>
              {/* Choice display */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Player side */}
                <div className="flex flex-col items-center">
                  <p className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/35 mb-4">Your choice</p>
                  <div className="w-28 h-28 rounded-2xl flex items-center justify-center"
                    style={pendingChoice ? { ...choiceStyle(pendingChoice), boxShadow: choiceGlow(pendingChoice) } : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(255,255,255,0.12)',
                    }}>
                    {pendingChoice ? (() => {
                      const C = CHOICES.find(c => c.id === pendingChoice)!;
                      return <C.icon size={52} strokeWidth={1.8} style={{ color: choiceColor(pendingChoice) }} />;
                    })() : <p className="text-white/20 text-xs font-mono">Waiting…</p>}
                  </div>
                  {pendingChoice && <p className="mt-3 font-heading font-semibold text-sm" style={{ color: choiceColor(pendingChoice) }}>
                    {CHOICES.find(c => c.id === pendingChoice)!.label}
                  </p>}
                </div>

                {/* Opponent side */}
                <div className="flex flex-col items-center">
                  <p className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/35 mb-4">Opponent</p>
                  <AnimatePresence mode="wait">
                    {revealPhase && lastRound === null ? null : revealPhase && gs.rounds.length === 0 ? null : (
                      <motion.div
                        key={revealPhase ? 'revealed' : 'hidden'}
                        initial={{ rotateY: 90 }} animate={{ rotateY: 0 }}
                        className="w-28 h-28 rounded-2xl flex items-center justify-center"
                        style={revealPhase && pendingChoice ? (() => {
                          const opp = gs.rounds.length > 0
                            ? gs.rounds[gs.rounds.length - 1].opponentChoice
                            : 'rock' as Choice;
                          return { ...choiceStyle(opp), boxShadow: choiceGlow(opp) };
                        })() : {
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px dashed rgba(255,255,255,0.12)',
                        }}>
                        {revealPhase && pendingChoice ? (() => {
                          // We need to peek ahead — but the round isn't applied yet
                          // Show a loading indicator instead
                          return <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />;
                        })() : <p className="text-white/20 text-xs font-mono">Hidden…</p>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Round result banner */}
              <AnimatePresence>
                {revealPhase && lastRound && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center mb-6 py-3 rounded-xl"
                    style={{
                      background: lastRound.result === 'win'
                        ? 'rgba(255,38,122,0.1)'
                        : lastRound.result === 'lose'
                          ? 'rgba(56,245,179,0.08)'
                          : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${lastRound.result === 'win' ? 'rgba(255,38,122,0.3)' : lastRound.result === 'lose' ? 'rgba(56,245,179,0.2)' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                    <p className="font-heading font-bold text-lg">
                      {lastRound.result === 'win' ? <span style={{ color: '#FF267A' }}>Round Won!</span>
                        : lastRound.result === 'lose' ? <span style={{ color: '#38F5B3' }}>Round Lost</span>
                          : <span className="text-white/50">Draw</span>}
                    </p>
                    <p className="text-xs font-mono text-white/35 mt-1">
                      {CHOICES.find(c => c.id === lastRound.playerChoice)!.label} vs {CHOICES.find(c => c.id === lastRound.opponentChoice)!.label}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Weapon selection */}
              {!locked && (
                <div>
                  <p className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/35 text-center mb-5">
                    Select your weapon
                  </p>
                  <div className="flex justify-center gap-4">
                    {CHOICES.map(({ id, label, beats, icon: Icon }) => (
                      <motion.button
                        key={id}
                        whileHover={{ scale: 1.06, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleChoice(id)}
                        className="flex flex-col items-center gap-2 p-5 rounded-2xl transition-all"
                        style={choiceStyle(id)}
                      >
                        <Icon size={44} strokeWidth={1.8} style={{ color: choiceColor(id) }} />
                        <span className="font-heading font-semibold text-sm">{label}</span>
                        <span className="text-[10px] font-mono text-white/30">beats {beats}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {locked && !revealPhase && (
                <div className="text-center py-4">
                  <p className="text-white/40 font-mono text-sm">Locking in choice…</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Final result */}
        <AnimatePresence>
          {gs.status === 'finished' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="rounded-2xl p-10 text-center mb-8"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: gs.finalResult === 'player'
                  ? '1px solid rgba(255,38,122,0.4)'
                  : gs.finalResult === 'opponent'
                    ? '1px solid rgba(56,245,179,0.3)'
                    : '1px solid rgba(255,255,255,0.1)',
                boxShadow: gs.finalResult === 'player'
                  ? '0 0 60px rgba(255,38,122,0.12)'
                  : 'none',
              }}
            >
              {gs.finalResult === 'player' && <>
                <Trophy size={52} className="mx-auto mb-4" style={{ color: '#FF267A' }} strokeWidth={1.5} />
                <h2 className="text-5xl font-heading font-bold mb-2" style={{ color: '#FF267A' }}>Victory</h2>
                <p className="text-white/40 font-mono">You won {gs.playerWins}-{gs.opponentWins}</p>
              </>}
              {gs.finalResult === 'opponent' && <>
                <Swords size={52} className="mx-auto mb-4 text-white/30" strokeWidth={1.5} />
                <h2 className="text-5xl font-heading font-bold mb-2 text-white/50">Defeat</h2>
                <p className="text-white/40 font-mono">Opponent won {gs.opponentWins}-{gs.playerWins}</p>
              </>}
              {gs.finalResult === 'draw' && <>
                <Swords size={52} className="mx-auto mb-4 text-white/30" strokeWidth={1.5} />
                <h2 className="text-5xl font-heading font-bold mb-2 text-white/50">Draw</h2>
                <p className="text-white/40 font-mono">Both at {gs.playerWins}-{gs.opponentWins} after 5 rounds</p>
              </>}
              <div className="flex justify-center gap-4 mt-8">
                <button onClick={reset}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #B026FF, #FF267A)', boxShadow: '0 8px 24px rgba(176,38,255,0.35)' }}>
                  <RotateCcw size={14} /> Play Again
                </button>
                <button onClick={() => navigate('/lobby')}
                  className="px-7 py-3 rounded-xl font-heading font-semibold text-sm text-white/60 hover:text-white transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                  Back to Lobby
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battle history */}
        {gs.rounds.length > 0 && (
          <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/30 mb-4">Battle History</p>
            <div className="flex gap-2 flex-wrap">
              {gs.rounds.map((r, i) => {
                const PIcon = CHOICES.find(c => c.id === r.playerChoice)!.icon;
                const OIcon = CHOICES.find(c => c.id === r.opponentChoice)!.icon;
                const col = r.result === 'win' ? '#FF267A' : r.result === 'lose' ? '#38F5B3' : 'rgba(255,255,255,0.25)';
                return (
                  <div key={i} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${col}44` }}>
                    <p className="text-[9px] font-mono text-white/30">R{i + 1}</p>
                    <div className="flex items-center gap-1">
                      <PIcon size={14} style={{ color: choiceColor(r.playerChoice) }} />
                      <span className="text-[9px] text-white/20">vs</span>
                      <OIcon size={14} style={{ color: choiceColor(r.opponentChoice) }} />
                    </div>
                    <p className="text-[9px] font-heading font-bold uppercase" style={{ color: col }}>
                      {r.result}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rules */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/35 mb-3">Rules</h3>
          <ul className="text-sm font-mono text-white/45 space-y-1.5">
            <li>Best of 5 rounds. First to 3 wins takes the match.</li>
            <li>Select Rock, Paper, or Scissors. Once selected, you cannot change it.</li>
            <li>Rock beats Scissors · Scissors beats Paper · Paper beats Rock.</li>
            <li>A tie round awards no points. The match plays to 5 rounds max.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
