import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import SplineHeroBackground from '../components/ui/SplineHeroBackground';
import { DuelchainLogo } from '../components/ui/DuelchainLogo';

const LaunchOverlay = ({ onDone }: { onDone: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 2800;
    let raf = 0;
    const tick = (t: number) => {
      const raw = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      setProgress(eased);
      if (raw < 1) raf = requestAnimationFrame(tick);
      else {
        setProgress(1);
        setTimeout(onDone, 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const pct = Math.floor(progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at center, rgba(139, 30, 90, 0.18), transparent 35%), linear-gradient(180deg, #050507 0%, #09060D 100%)',
      }}
    >
      <div className="relative z-10 w-full max-w-sm px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="mb-8">
            <img
              src="/LOGO_DUELCHAIN.png"
              alt="DUELCHAIN"
              className="w-24 h-24 md:w-32 md:h-32 object-contain shrink-0 block"
              style={{ filter: 'drop-shadow(0 0 34px rgba(196,45,255,0.42))' }}
            />
          </div>

          <h1
            className="font-heading font-semibold text-[28px] md:text-[32px] tracking-[0.32em] mb-10"
            style={{
              color: '#F8F5FF',
              textShadow: '0 0 24px rgba(178,54,255,0.35)',
            }}
          >
            DUELCHAIN
          </h1>

          <div className="w-full">
            <div
              className="relative h-[3px] w-full rounded-full overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  background: 'linear-gradient(90deg, #8B1E5A, #B236FF)',
                  boxShadow: '0 0 22px rgba(178,54,255,0.35)',
                }}
              />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span
                className="text-[11px] tracking-[0.24em] uppercase"
                style={{ color: '#9B90A8' }}
              >
                Loading player hub
              </span>
              <span
                className="font-mono text-[11px] tracking-widest"
                style={{ color: '#B236FF' }}
              >
                {pct}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  const onLaunch = () => {
    if (launching) return;
    setLaunching(true);
    setTimeout(() => setShowLoader(true), 320);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050609] text-white">
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: launching ? 0 : 1 }}
        transition={{ duration: 0.65, ease: 'easeInOut' }}
      >
        <SplineHeroBackground />

        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, rgba(5,6,9,0.05) 0%, rgba(5,6,9,0.55) 100%)',
          }}
        />

        <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center px-6 pointer-events-none">
          <motion.h1
            initial={{ opacity: 0, letterSpacing: '0.5em' }}
            animate={{ opacity: 1, letterSpacing: '0.08em' }}
            transition={{ duration: 1.3, delay: 0.2 }}
            className="font-heading font-bold text-[14vw] sm:text-8xl md:text-9xl leading-none text-white"
            style={{
              textShadow:
                '0 0 10px rgba(255,255,255,0.9), 0 0 30px rgba(176,38,255,0.55), 0 0 60px rgba(255,38,122,0.3)',
            }}
          >
            DUELCHAIN
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9 }}
            className="mt-6 font-heading font-medium text-xs sm:text-sm uppercase text-white"
            style={{
              letterSpacing: '0.32em',
              textShadow:
                '0 0 6px rgba(255,255,255,0.85), 0 0 18px rgba(176,38,255,0.5)',
            }}
          >
            Skill. Stakes. Sovereignty.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.3 }}
            className="mt-12 pointer-events-auto"
          >
            <button
              onClick={onLaunch}
              className="group relative px-10 py-4 rounded-xl font-heading font-semibold text-sm tracking-[0.28em] uppercase text-white overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(176,38,255,0.3), rgba(255,38,122,0.25), rgba(255,64,64,0.18))',
                border: '1px solid rgba(255,255,255,0.28)',
                boxShadow:
                  '0 10px 40px rgba(176,38,255,0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="relative z-10 flex items-center gap-3">
                Launch App
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
              <motion.span
                aria-hidden
                className="absolute inset-0"
                animate={{
                  background: [
                    'radial-gradient(circle at 20% 50%, rgba(176,38,255,0.5), transparent 60%)',
                    'radial-gradient(circle at 80% 50%, rgba(255,38,122,0.5), transparent 60%)',
                    'radial-gradient(circle at 20% 50%, rgba(176,38,255,0.5), transparent 60%)',
                  ],
                }}
                transition={{ duration: 3.5, repeat: Infinity }}
              />
            </button>
          </motion.div>
        </div>

        {/* Mask any embedded Spline chrome (e.g. PORTFOLIO label) along the bottom strip */}
        <div
          className="absolute bottom-0 left-0 right-0 z-[4] pointer-events-none"
          style={{
            height: '120px',
            background:
              'linear-gradient(180deg, rgba(5,6,9,0) 0%, rgba(5,6,9,0.85) 55%, rgba(5,6,9,1) 100%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 z-[5] pointer-events-auto"
          style={{
            width: '280px',
            height: '90px',
            background:
              'linear-gradient(45deg, rgba(5,6,9,1) 0%, rgba(5,6,9,0.98) 60%, rgba(5,6,9,0) 100%)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 z-[5] pointer-events-auto"
          style={{
            width: '280px',
            height: '90px',
            background:
              'linear-gradient(315deg, rgba(5,6,9,1) 0%, rgba(5,6,9,0.98) 60%, rgba(5,6,9,0) 100%)',
          }}
        />
      </motion.div>

      <AnimatePresence>
        {showLoader && <LaunchOverlay onDone={() => navigate('/home')} />}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
