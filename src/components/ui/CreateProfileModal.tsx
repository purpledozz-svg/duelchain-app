import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Check, Loader2, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { profileService, validateUsername, validatePassword } from '../../lib/profileService';
import { getPlayerId } from '../../lib/playerId';
import { Player } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (player: Player) => void;
  walletAddress?: string | null;
  defaultTab?: 'create' | 'signin';
}

// ── Shared password input with show/hide toggle ───────────────────────────────

function PwField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-heading uppercase tracking-[0.25em] text-white/40 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          maxLength={32}
          disabled={disabled}
          autoFocus={autoFocus}
          className="w-full px-4 py-3 rounded-xl font-mono text-white placeholder-white/20 text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.045)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Create Account tab ────────────────────────────────────────────────────────

function CreateTab({
  onCreated,
  walletAddress,
  onClose,
}: {
  onCreated: (player: Player) => void;
  walletAddress?: string | null;
  onClose: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string; confirm?: string; general?: string }>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const { addToast } = useStore();

  const validate = () => {
    const e: typeof errors = {};
    const uErr = validateUsername(username);
    if (uErr) e.username = uErr;
    const pErr = validatePassword(password);
    if (pErr) e.password = pErr;
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (password !== confirm) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setBusy(true);
    setErrors({});

    const { player, error } = await profileService.createProfile(
      username, getPlayerId(), password, walletAddress
    );

    if (error) {
      const lower = error.toLowerCase();
      if (lower.includes('username') || lower.includes('taken')) setErrors({ username: error });
      else if (lower.includes('password')) setErrors({ password: error });
      else setErrors({ general: error });
      setBusy(false);
      return;
    }

    setSuccess(true);
    addToast('success', `Welcome to DUELCHAIN, ${player!.username}!`);
    setTimeout(() => { onCreated(player!); onClose(); }, 900);
    setBusy(false);
  };

  return (
    <div>
      {/* Username */}
      <div className="mb-4">
        <label className="block text-[10px] font-heading uppercase tracking-[0.25em] text-white/40 mb-1.5">
          Username
        </label>
        <div className="relative">
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setErrors((v) => ({ ...v, username: undefined })); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="e.g. DuelKing"
            maxLength={16}
            disabled={busy || success}
            autoFocus
            className="w-full px-4 py-3 rounded-xl font-mono text-white placeholder-white/20 text-sm outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.045)',
              border: errors.username ? '1px solid rgba(255,64,64,0.55)' : '1px solid rgba(255,255,255,0.09)',
            }}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-mono pointer-events-none"
            style={{ color: username.length > 14 ? 'rgba(255,159,67,0.8)' : 'rgba(255,255,255,0.22)' }}>
            {username.length}/16
          </span>
        </div>
        {errors.username && <p className="text-[11px] text-[#FF4040] mt-1.5 font-mono">{errors.username}</p>}
        {!errors.username && <p className="text-[11px] text-white/25 font-mono mt-1.5">Letters and numbers only · 3–16 characters</p>}
      </div>

      <PwField
        label="Password"
        value={password}
        onChange={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
        placeholder="Min. 4 characters"
        disabled={busy || success}
      />
      {errors.password && <p className="text-[11px] text-[#FF4040] -mt-3 mb-4 font-mono">{errors.password}</p>}

      <PwField
        label="Confirm Password"
        value={confirm}
        onChange={(v) => { setConfirm(v); setErrors((e) => ({ ...e, confirm: undefined })); }}
        placeholder="Repeat your password"
        disabled={busy || success}
      />
      {errors.confirm && <p className="text-[11px] text-[#FF4040] -mt-3 mb-4 font-mono">{errors.confirm}</p>}

      {errors.general && <p className="text-[11px] text-[#FF4040] mb-4 font-mono">{errors.general}</p>}

      <button
        onClick={handleSubmit}
        disabled={busy || success || username.length < 3 || password.length < 4}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-heading font-semibold text-sm tracking-[0.2em] uppercase text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        style={{
          background: success
            ? 'rgba(56,245,179,0.25)'
            : 'linear-gradient(135deg, #B026FF 0%, #FF267A 60%, #FF4040 100%)',
          boxShadow: success ? '0 8px 28px rgba(56,245,179,0.2)' : '0 8px 28px rgba(176,38,255,0.4)',
        }}
      >
        {success ? <><Check size={15} /> Profile created!</>
          : busy ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
            : <><UserPlus size={15} /> Create Account</>}
      </button>
      <p className="text-center text-[11px] text-white/20 font-mono mt-3">No wallet required for Classic mode</p>
    </div>
  );
}

// ── Sign In tab ───────────────────────────────────────────────────────────────

function SignInTab({
  onSignedIn,
  onClose,
}: {
  onSignedIn: (player: Player) => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const { addToast } = useStore();

  const handleSubmit = async () => {
    if (!username.trim()) { setError('Username is required.'); return; }
    if (!password) { setError('Password is required.'); return; }
    setBusy(true);
    setError('');

    const { player, error: err } = await profileService.signIn(username.trim(), password);
    if (err) { setError(err); setBusy(false); return; }

    setSuccess(true);
    addToast('success', `Welcome back, ${player!.username}!`);
    setTimeout(() => { onSignedIn(player!); onClose(); }, 700);
    setBusy(false);
  };

  return (
    <div onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}>
      <div className="mb-4">
        <label className="block text-[10px] font-heading uppercase tracking-[0.25em] text-white/40 mb-1.5">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setError(''); }}
          placeholder="Your username"
          maxLength={16}
          disabled={busy || success}
          autoFocus
          className="w-full px-4 py-3 rounded-xl font-mono text-white placeholder-white/20 text-sm outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.09)' }}
        />
      </div>

      <PwField
        label="Password"
        value={password}
        onChange={(v) => { setPassword(v); setError(''); }}
        disabled={busy || success}
      />

      {error && <p className="text-[11px] text-[#FF4040] -mt-3 mb-4 font-mono">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={busy || success || !username.trim() || !password}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-heading font-semibold text-sm tracking-[0.2em] uppercase text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        style={{
          background: success
            ? 'rgba(56,245,179,0.25)'
            : 'linear-gradient(135deg, #B026FF 0%, #FF267A 60%, #FF4040 100%)',
          boxShadow: success ? '0 8px 28px rgba(56,245,179,0.2)' : '0 8px 28px rgba(176,38,255,0.4)',
        }}
      >
        {success ? <><Check size={15} /> Signed in!</>
          : busy ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
            : <><LogIn size={15} /> Sign In</>}
      </button>
    </div>
  );
}

// ── AccountModal (exported as CreateProfileModal for compatibility) ────────────

export function CreateProfileModal({ open, onClose, onCreated, walletAddress, defaultTab = 'create' }: Props) {
  const [tab, setTab] = useState<'create' | 'signin'>(defaultTab);

  useEffect(() => { if (open) setTab(defaultTab); }, [open, defaultTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />

          {/* Centering shell */}
          <div
            className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
            style={{ zIndex: 9999 }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            {/* Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-2xl overflow-hidden my-auto"
              style={{
                background: 'rgba(8, 6, 14, 0.97)',
                border: '1px solid rgba(176,38,255,0.3)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(176,38,255,0.12)',
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top glow line */}
              <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(176,38,255,0.65), rgba(255,38,122,0.65), transparent)' }}
              />

              <div className="p-7">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(176,38,255,0.28), rgba(255,38,122,0.18))',
                        border: '1px solid rgba(176,38,255,0.35)',
                      }}
                    >
                      <User size={16} className="text-white" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 className="font-heading font-bold text-white text-lg leading-tight">
                        {tab === 'create' ? 'Create Account' : 'Sign In'}
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/30 hover:text-white/80 transition-colors p-1 ml-4 flex-shrink-0"
                    aria-label="Close"
                  >
                    <X size={17} />
                  </button>
                </div>

                {/* Tabs */}
                <div
                  className="flex rounded-xl p-1 mb-6"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {(['create', 'signin'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className="flex-1 py-2 rounded-lg font-heading font-semibold text-xs uppercase tracking-[0.18em] transition-all"
                      style={
                        tab === t
                          ? { background: 'linear-gradient(135deg, rgba(176,38,255,0.35), rgba(255,38,122,0.25))', border: '1px solid rgba(176,38,255,0.3)', color: 'white' }
                          : { color: 'rgba(255,255,255,0.38)', border: '1px solid transparent' }
                      }
                    >
                      {t === 'create' ? 'Create Account' : 'Sign In'}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  {tab === 'create' ? (
                    <motion.div key="create" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                      <CreateTab onCreated={onCreated} walletAddress={walletAddress} onClose={onClose} />
                    </motion.div>
                  ) : (
                    <motion.div key="signin" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                      <SignInTab onSignedIn={onCreated} onClose={onClose} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
