import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Swords,
  Gamepad2,
  ShieldCheck,
  Trophy,
  Wallet,
  Twitter,
  Sparkles,
  Target,
  Users,
  Zap,
  Medal,
  Layers,
  Joystick,
  BarChart2,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { truncateAddress } from '../lib/wallet';

const STEPS = [
  {
    icon: Gamepad2,
    title: 'Choose a game',
    desc: 'Chess, Connect 4, Tic-Tac-Toe, Rock Paper Scissors, Reaction and more.',
  },
  {
    icon: Swords,
    title: 'Pick a mode',
    desc: 'Classic for friendly duels, Competitive to lock a wager and play for the pot.',
  },
  {
    icon: ShieldCheck,
    title: 'Lock your stake',
    desc: 'Competitive mode escrows both stakes on Base before the match starts.',
  },
  {
    icon: Trophy,
    title: 'Winner gets paid',
    desc: 'Settlement is instant. Skill decides. The winner collects.',
  },
];

const X_URL = 'https://x.com/duelchain';
const BANKR_CHART_URL = '#';

const COMMUNITY_TAGS = [
  { icon: Zap, label: 'On-chain duels' },
  { icon: Medal, label: 'Ranked seasons' },
  { icon: Layers, label: 'Base network' },
  { icon: Joystick, label: 'Mini-game drops' },
];

export const Home = () => {
  const { address, isConnected } = useAccount();

  return (
    <div className="relative bg-[#050609] text-white overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px] opacity-80"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(176,38,255,0.25), transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(255,38,122,0.18), transparent 55%)',
        }}
      />

      <section className="relative min-h-[calc(100vh-88px)] overflow-hidden px-6 lg:px-12">
        <div className="relative z-10 mx-auto grid max-w-[1500px] min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] items-center gap-8">

          {/* Text column */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-20 max-w-[850px] lg:-translate-y-8"
          >
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-body font-semibold uppercase tracking-[0.22em] text-white/80 mb-6"
              style={{
                background: 'linear-gradient(135deg, rgba(176,38,255,0.18), rgba(255,38,122,0.12))',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Sparkles size={12} className="text-[#FF267A]" />
              On-chain skill duels on Base
            </span>

            <h1
              className="font-heading font-bold mb-6"
              style={{ fontSize: 'clamp(48px, 5vw, 96px)', lineHeight: 0.92, letterSpacing: '-0.025em', maxWidth: 900 }}
            >
              Duels where <span className="duel-gradient">skill</span>
              <br />
              pays out instantly.
            </h1>

            <p className="text-white/65 font-body text-lg max-w-xl leading-relaxed mb-10">
              DUELCHAIN turns mini-games into real head-to-head duels. Classic for
              bragging rights. Competitive for the pot. No lobbies. No middlemen.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Link
                to="/lobby"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-heading font-semibold text-sm tracking-[0.12em] uppercase text-white"
                style={{
                  background: 'linear-gradient(135deg, #B026FF 0%, #FF267A 65%, #FF4040 100%)',
                  boxShadow: '0 10px 38px rgba(176,38,255,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                Enter Lobby
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>

              {isConnected && address ? (
                <span
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs text-white/85"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF267A] shadow-[0_0_10px_rgba(255,38,122,0.8)]" />
                  {truncateAddress(address)}
                </span>
              ) : (
                <Link
                  to="/connect"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-heading font-semibold text-sm tracking-[0.12em] uppercase text-white/90 hover:text-white transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                >
                  <Wallet size={14} />
                  Connect Wallet
                </Link>
              )}
            </div>
          </motion.div>

          {/* Joker image column — desktop only */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.18 }}
            className="relative z-10 hidden lg:flex items-center justify-end h-full pointer-events-none select-none overflow-visible"
          >
            {/* Glow orbs behind the character */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full blur-[120px]"
              style={{ width: 720, height: 720, background: 'rgba(176,38,255,0.18)' }}
            />
            <div
              className="absolute right-16 top-1/2 -translate-y-1/2 rounded-full blur-[100px]"
              style={{ width: 520, height: 520, background: 'rgba(255,38,122,0.13)' }}
            />
            <div
              className="absolute right-32 top-1/2 -translate-y-1/2 rounded-full blur-[80px]"
              style={{ width: 320, height: 320, background: 'rgba(255,64,64,0.10)' }}
            />

            {/* The joker itself */}
            <img
              src="/images/duelchain-joker.png"
              alt="DuelChain joker"
              className="relative z-10 object-contain opacity-95"
              style={{
                width: 'min(48vw, 680px)',
                maxHeight: '80vh',
                filter: 'drop-shadow(0 0 60px rgba(236,72,153,0.30)) drop-shadow(0 0 24px rgba(176,38,255,0.28))',
                WebkitMaskImage:
                  'radial-gradient(ellipse 72% 72% at 52% 46%, black 52%, rgba(0,0,0,0.82) 66%, rgba(0,0,0,0.30) 82%, transparent 100%)',
                maskImage:
                  'radial-gradient(ellipse 72% 72% at 52% 46%, black 52%, rgba(0,0,0,0.82) 66%, rgba(0,0,0,0.30) 82%, transparent 100%)',
              }}
            />

            {/* Left-edge blend: merges joker into the text column */}
            <div
              className="absolute inset-y-0 left-0 w-2/5 z-20 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, rgba(5,6,9,1) 0%, rgba(5,6,9,0.60) 40%, rgba(5,6,9,0) 100%)',
              }}
            />

            {/* Bottom-edge blend */}
            <div
              className="absolute bottom-0 left-0 right-0 h-48 z-20 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(5,6,9,0) 0%, rgba(5,6,9,0.95) 100%)',
              }}
            />
          </motion.div>
        </div>
      </section>

      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.34em] mb-3">
              How it works
            </p>
            <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight">
              From wallet to victory in four steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass-card p-6 hover:-translate-y-1 transition-transform duration-500"
              >
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(176,38,255,0.3), rgba(255,38,122,0.18))',
                      border: '1px solid rgba(255,255,255,0.14)',
                      boxShadow: '0 0 22px rgba(176,38,255,0.25)',
                    }}
                  >
                    <step.icon size={18} className="text-white" strokeWidth={1.8} />
                  </div>
                  <span className="font-heading text-3xl text-white/8 font-bold">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-heading font-semibold text-lg text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.34em] mb-3">
              Our mission
            </p>
            <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-6">
              Make skill-based duels fair, fun, and rewarding.
            </h2>
            <p className="text-white/65 leading-relaxed mb-4">
              Everyone likes winning. Few platforms actually make it matter. DUELCHAIN
              exists to put competitive mini-games back where they belong: peer-to-peer,
              transparent, and settled on-chain.
            </p>
            <p className="text-white/65 leading-relaxed">
              No RNG loot boxes. No house edge dressed as gameplay. Just two players, one
              game, one winner — and a pot that moves in seconds.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Target, label: 'Fair', value: 'Peer-to-peer duels with escrowed stakes' },
              { icon: ShieldCheck, label: 'Transparent', value: 'Every result verifiable on Base' },
              { icon: Trophy, label: 'Rewarding', value: 'Winner takes the pot instantly' },
              { icon: Users, label: 'Social', value: 'Challenge friends via shared room codes' },
            ].map((cell) => (
              <div key={cell.label} className="glass-card p-5">
                <cell.icon size={18} className="text-[#FF267A] mb-3" />
                <p className="font-heading font-semibold text-sm text-white mb-1.5">
                  {cell.label}
                </p>
                <p className="text-xs text-white/55 leading-relaxed">{cell.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-10 md:p-14 relative overflow-hidden">
            <div
              className="absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full blur-[100px] opacity-50"
              style={{ background: 'rgba(176,38,255,0.35)' }}
            />
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.34em] mb-3 relative">
              How it started
            </p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-6 relative">
              A simple idea: mini-games should mean something.
            </h2>
            <div className="space-y-4 text-white/65 leading-relaxed relative">
              <p>
                DUELCHAIN started from a frustration. Mini-games are fun, but they feel
                disposable. You beat a friend at chess, connect-four or reaction — and
                nothing remains.
              </p>
              <p>
                We wanted something in-between casual and competitive esports. A place
                where anyone can challenge anyone, settle it in a few minutes, and walk
                away with either a win or a story.
              </p>
              <p className="text-white/80">
                That's DUELCHAIN: short, skill-based duels with real stakes, real
                payouts, and real bragging rights.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.34em] mb-3">
              Community
            </p>
            <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-4">
              Follow the build
            </h2>
            <p className="text-white/55 text-sm max-w-lg leading-relaxed">
              DuelChain is being built in public. Follow updates, game drops, leaderboard
              moments, and launch announcements on X. Discord and Telegram communities are
              coming soon.
            </p>
          </motion.div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
            {/* X card */}
            <motion.a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45 }}
              className="group relative rounded-2xl p-8 overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 12px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Glow orb */}
              <div
                className="absolute -top-24 -right-16 w-56 h-56 rounded-full blur-[90px] opacity-0 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'rgba(255,38,122,0.5)' }}
              />

              <div className="relative flex items-start justify-between mb-6">
                {/* X icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,38,122,0.28), rgba(176,38,255,0.18))',
                    border: '1px solid rgba(255,38,122,0.38)',
                    boxShadow: '0 0 28px rgba(255,38,122,0.22)',
                  }}
                >
                  <Twitter size={24} className="text-white" strokeWidth={2} />
                </div>

                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-heading uppercase tracking-[0.18em] text-white/70"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF267A] animate-pulse" />
                  Live updates
                </span>
              </div>

              <p className="relative font-heading font-bold text-2xl text-white mb-1">
                X / Twitter
              </p>
              <p className="relative text-sm font-mono text-[#FF267A] mb-4">
                @duelchain
              </p>
              <p className="relative text-sm text-white/55 leading-relaxed mb-8">
                Product updates, clips, ranked drops, and launch news.
              </p>

              <div className="relative flex items-center justify-between pt-5 border-t border-white/6">
                <span className="text-xs font-heading uppercase tracking-[0.22em] text-white/60 group-hover:text-white transition-colors duration-300">
                  Follow on X
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 group-hover:shadow-[0_0_14px_rgba(255,38,122,0.5)]"
                  style={{
                    background: 'rgba(255,38,122,0.18)',
                    border: '1px solid rgba(255,38,122,0.40)',
                  }}
                >
                  <ArrowRight size={13} className="text-[#FF267A]" />
                </div>
              </div>
            </motion.a>

            {/* BankrBot coin card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="relative rounded-2xl p-8 overflow-hidden flex flex-col justify-between"
              style={{
                background:
                  'radial-gradient(circle at 15% 25%, rgba(124,58,237,0.32), transparent 50%), linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(255,94,58,0.09) 55%, rgba(8,8,14,0.55) 100%)',
                border: '1px solid rgba(124,58,237,0.40)',
                boxShadow:
                  '0 12px 48px rgba(0,0,0,0.40), 0 0 40px rgba(124,58,237,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Glow blobs */}
              <div
                className="absolute -top-16 -left-16 w-56 h-56 rounded-full blur-[90px] opacity-35 pointer-events-none"
                style={{ background: 'rgba(124,58,237,0.7)' }}
              />
              <div
                className="absolute -bottom-12 right-8 w-36 h-36 rounded-full blur-[70px] opacity-20 pointer-events-none"
                style={{ background: 'rgba(255,94,58,0.7)' }}
              />

              <div className="relative">
                {/* Top row: logo + badge */}
                <div className="flex items-center gap-3 mb-6">
                  <div
                    style={{
                      filter:
                        'drop-shadow(0 0 12px rgba(124,58,237,0.65)) drop-shadow(0 0 5px rgba(255,94,58,0.30))',
                    }}
                  >
                    <img
                      src="/partners/image.png"
                      alt="BankrBot"
                      className="object-contain"
                      style={{ width: 56, height: 56 }}
                    />
                  </div>

                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(124,58,237,0.22)',
                      border: '1px solid rgba(124,58,237,0.48)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: '#FF5E3A',
                        boxShadow: '0 0 6px rgba(255,94,58,0.85)',
                      }}
                    />
                    <span className="text-[10px] font-heading uppercase tracking-[0.24em] text-white/75">
                      BankrBot Launch
                    </span>
                  </div>
                </div>

                <p className="font-heading font-bold text-2xl text-white mb-2">
                  DUELCHAIN Coin
                </p>
                <p className="text-sm text-white/55 leading-relaxed mb-1">
                  Launching via BankrBot. Chart link coming soon.
                </p>
              </div>

              <div className="relative pt-7">
                {BANKR_CHART_URL === '#' ? (
                  <div>
                    <div
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-not-allowed select-none"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                      }}
                    >
                      <Clock size={13} className="text-white/28" />
                      <span className="text-sm font-heading text-white/32 tracking-wide">
                        Chart coming soon
                      </span>
                    </div>
                    <p className="mt-2.5 text-[11px] text-white/28 font-body">
                      Link will be added at token launch.
                    </p>
                  </div>
                ) : (
                  <a
                    href={BANKR_CHART_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-semibold text-sm tracking-[0.18em] uppercase text-white transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED 0%, #FF5E3A 100%)',
                      boxShadow:
                        '0 8px 28px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                    }}
                  >
                    <BarChart2 size={15} />
                    View Chart
                    <ExternalLink size={13} className="opacity-70 transition-transform group-hover:translate-x-0.5" />
                  </a>
                )}
              </div>
            </motion.div>

            {/* Discord card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: 0.14 }}
              className="relative rounded-2xl p-7 overflow-hidden flex flex-col justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(88,101,242,0.12) 0%, rgba(88,101,242,0.05) 100%)',
                border: '1px solid rgba(88,101,242,0.22)',
                boxShadow: '0 12px 48px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div
                className="absolute -bottom-16 -right-12 w-44 h-44 rounded-full blur-[80px] opacity-20 pointer-events-none"
                style={{ background: 'rgba(88,101,242,0.8)' }}
              />

              <div className="relative">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: 'rgba(88,101,242,0.18)',
                    border: '1px solid rgba(88,101,242,0.32)',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" fill="rgba(88,101,242,0.9)"/>
                  </svg>
                </div>

                <p className="font-heading font-bold text-xl text-white mb-2">Discord</p>
                <p className="text-sm text-white/50 leading-relaxed">
                  Serveur communautaire en préparation. Rejoignez bientôt.
                </p>
              </div>

              <div className="relative pt-6">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-not-allowed select-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Clock size={12} className="text-white/28" />
                  <span className="text-xs font-heading text-white/32 tracking-wide">En préparation</span>
                </div>
              </div>
            </motion.div>

            {/* Telegram card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: 0.20 }}
              className="relative rounded-2xl p-7 overflow-hidden flex flex-col justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(0,136,204,0.12) 0%, rgba(0,136,204,0.05) 100%)',
                border: '1px solid rgba(0,136,204,0.22)',
                boxShadow: '0 12px 48px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div
                className="absolute -bottom-16 -left-12 w-44 h-44 rounded-full blur-[80px] opacity-18 pointer-events-none"
                style={{ background: 'rgba(0,136,204,0.8)' }}
              />

              <div className="relative">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: 'rgba(0,136,204,0.16)',
                    border: '1px solid rgba(0,136,204,0.30)',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.7 8.02c-.13.58-.47.72-.95.45l-2.62-1.93-1.27 1.22c-.14.14-.26.26-.53.26l.19-2.66 4.84-4.37c.21-.19-.05-.29-.32-.1L7.9 14.47l-2.57-.8c-.56-.17-.57-.56.12-.83l10.03-3.87c.47-.17.88.11.73.83h.43z" fill="rgba(0,136,204,0.9)"/>
                  </svg>
                </div>

                <p className="font-heading font-bold text-xl text-white mb-2">Telegram</p>
                <p className="text-sm text-white/50 leading-relaxed">
                  Canal d'annonces en préparation. Disponible bientôt.
                </p>
              </div>

              <div className="relative pt-6">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-not-allowed select-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Clock size={12} className="text-white/28" />
                  <span className="text-xs font-heading text-white/32 tracking-wide">En préparation</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Tag strip */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-wrap gap-3"
          >
            {COMMUNITY_TAGS.map((tag) => (
              <div
                key={tag.label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <tag.icon size={13} className="text-white/40" strokeWidth={1.5} />
                <span className="text-xs font-heading text-white/50 tracking-wide">
                  {tag.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mb-4">
            Your move.
          </h2>
          <p className="text-white/60 mb-10 max-w-md mx-auto">
            Open the lobby, pick a game, pick a mode. Settle it.
          </p>
          <Link
            to="/lobby"
            className="inline-flex items-center gap-2 px-9 py-4 rounded-xl font-heading font-semibold text-sm tracking-[0.24em] uppercase text-white"
            style={{
              background:
                'linear-gradient(135deg, #B026FF 0%, #FF267A 65%, #FF4040 100%)',
              boxShadow:
                '0 12px 42px rgba(176,38,255,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            Enter Lobby
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
