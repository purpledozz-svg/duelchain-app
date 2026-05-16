import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Gamepad2,
  TrendingUp,
  Clock,
  UserPlus,
  Users,
  Search,
  ArrowLeft,
  Check,
  Loader2,
  UserCheck,
  LogOut,
  Trash2,
  Wallet,
  ChevronRight,
  AlertTriangle,
  X,
  DollarSign,
  Swords,
  KeyRound,
  Eye,
  EyeOff,
  Camera,
  Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { profileService, validatePassword } from '../lib/profileService';
import { useStore } from '../store/useStore';
import { Player, Friendship, MatchWithPlayers } from '../types';
import { RankCard, RankChip } from '../components/ui/RankBadge';
import { PlayerAvatar } from '../components/ui/PlayerAvatar';

// ── helpers ───────────────────────────────────────────────────────────────────

function winRate(wins: number, total: number) {
  if (!total) return '0%';
  return `${((wins / total) * 100).toFixed(0)}%`;
}


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const GAME_NAMES: Record<string, string> = {
  chess: 'Chess',
  'connect-four': 'Connect Four',
  tictactoe: 'Tic-Tac-Toe',
  rps: 'Rock Paper Scissors',
  reaction: 'Reaction',
  'flappy-duel': 'Flappy Duel',
  'stop-at-10': 'Stop at 10',
  'hot-potato': 'Hot Potato',
};

// ── Glass panel ───────────────────────────────────────────────────────────────

function Panel({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── FriendButton ──────────────────────────────────────────────────────────────

function FriendButton({
  friendship,
  iAmRequester,
  myId,
  theirId,
  onAction,
}: {
  friendship: Friendship | null;
  iAmRequester: boolean;
  myId: string;
  theirId: string;
  onAction: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const { addToast } = useStore();

  const handleAdd = async () => {
    setBusy(true);
    const { error } = await profileService.sendFriendRequest(myId, theirId);
    if (error) addToast('error', error);
    else { addToast('success', 'Friend request sent!'); onAction(); }
    setBusy(false);
  };

  const handleAccept = async () => {
    if (!friendship) return;
    setBusy(true);
    const { error } = await profileService.acceptFriendRequest(friendship.id, myId);
    if (error) addToast('error', error);
    else { addToast('success', 'Friend request accepted!'); onAction(); }
    setBusy(false);
  };

  if (!friendship) {
    return (
      <button
        onClick={handleAdd}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-semibold text-sm tracking-wider text-white transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, rgba(176,38,255,0.3), rgba(255,38,122,0.22))',
          border: '1px solid rgba(255,38,122,0.45)',
          boxShadow: '0 0 22px rgba(176,38,255,0.25)',
        }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        Add Friend
      </button>
    );
  }

  if (friendship.status === 'accepted') {
    return (
      <span
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-semibold text-sm tracking-wider"
        style={{
          background: 'rgba(56,245,179,0.08)',
          border: '1px solid rgba(56,245,179,0.3)',
          color: '#38F5B3',
        }}
      >
        <UserCheck size={14} />
        Friends
      </span>
    );
  }

  if (friendship.status === 'pending' && iAmRequester) {
    return (
      <span
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-semibold text-sm tracking-wider text-white/50"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
      >
        <Clock size={14} />
        Request Sent
      </span>
    );
  }

  return (
    <button
      onClick={handleAccept}
      disabled={busy}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-semibold text-sm tracking-wider text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
      style={{
        background: 'linear-gradient(135deg, rgba(56,245,179,0.25), rgba(56,245,179,0.12))',
        border: '1px solid rgba(56,245,179,0.4)',
        boxShadow: '0 0 20px rgba(56,245,179,0.18)',
      }}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      Accept Request
    </button>
  );
}

// ── PlayerSearch ──────────────────────────────────────────────────────────────

function PlayerSearch({ myId }: { myId: string | null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const found = await profileService.searchPlayers(query);
      setResults(found.filter((p) => p.id !== myId));
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, myId]);

  return (
    <div>
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
          placeholder="Search by username…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl font-mono text-sm text-white placeholder-white/20 outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          maxLength={16}
        />
        {searching && (
          <Loader2 size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {query.length >= 2 && !searching && results.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-white/30 font-mono py-2 px-1"
          >
            No player found.
          </motion.p>
        )}
        {results.map((p) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Link
              to={`/profile/${p.username}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <PlayerAvatar username={p.username} avatarUrl={p.avatar_url} size={32} shape="circle" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-white text-sm truncate">{p.username}</p>
                <p className="text-[11px] text-white/35 font-mono">{p.total_games || 0} games</p>
              </div>
              <ChevronRight size={13} className="text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>

      {!query && (
        <p className="text-[11px] text-white/25 font-mono leading-relaxed">
          Type a username to search across all players.
        </p>
      )}
    </div>
  );
}

// ── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({
  open,
  username,
  onClose,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  username: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

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

  const confirmed = typed === username;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />
          <div
            className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
            style={{ zIndex: 9999 }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-2xl overflow-hidden my-auto"
              style={{
                background: 'rgba(8,4,10,0.98)',
                border: '1px solid rgba(255,64,64,0.35)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 40px rgba(255,64,64,0.12)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,64,64,0.7), transparent)' }}
              />
              <div className="p-7">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'rgba(255,64,64,0.15)',
                        border: '1px solid rgba(255,64,64,0.3)',
                      }}
                    >
                      <AlertTriangle size={18} className="text-[#FF4040]" />
                    </div>
                    <div>
                      <h2 className="font-heading font-bold text-white text-lg leading-tight">
                        Delete your DUELCHAIN profile?
                      </h2>
                    </div>
                  </div>
                  <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1 ml-4 flex-shrink-0">
                    <X size={17} />
                  </button>
                </div>

                <p className="text-sm text-white/50 font-mono mb-6 leading-relaxed">
                  This will remove your profile, friends, and match history. This action cannot be undone.
                </p>

                <label className="block text-[10px] font-heading uppercase tracking-[0.25em] text-white/40 mb-2">
                  Type <span className="text-[#FF4040]">{username}</span> to confirm
                </label>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={username}
                  className="w-full px-4 py-3 rounded-xl font-mono text-white placeholder-white/20 text-sm outline-none transition-all mb-5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: confirmed ? '1px solid rgba(255,64,64,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-heading font-semibold text-sm text-white/60 hover:text-white transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={!confirmed || isDeleting}
                    className="flex-1 py-3 rounded-xl font-heading font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: confirmed ? 'rgba(255,64,64,0.25)' : 'rgba(255,64,64,0.08)',
                      border: '1px solid rgba(255,64,64,0.4)',
                    }}
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, duration: 0.35 }}
    >
      <Panel
        className="p-5 relative overflow-hidden"
        style={accent ? { border: '1px solid rgba(255,38,122,0.2)', background: 'rgba(176,38,255,0.06)' } : {}}
      >
        {accent && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(176,38,255,0.12), transparent 70%)' }}
          />
        )}
        <div className="flex items-start justify-between mb-3 relative">
          <p className="text-[10px] font-heading uppercase tracking-[0.22em] text-white/40">{label}</p>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: accent ? 'rgba(176,38,255,0.2)' : 'rgba(255,255,255,0.05)',
              border: accent ? '1px solid rgba(176,38,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Icon size={13} className={accent ? 'text-[#B026FF]' : 'text-white/40'} strokeWidth={1.8} />
          </div>
        </div>
        <p
          className="font-heading font-bold text-2xl relative"
          style={accent ? { background: 'linear-gradient(135deg, #B026FF, #FF267A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: 'white' }}
        >
          {value}
        </p>
      </Panel>
    </motion.div>
  );
}

// ── ChangePasswordRow ─────────────────────────────────────────────────────────

function PwInput({
  label, value, onChange, show, onToggle, disabled, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; disabled?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-heading uppercase tracking-[0.2em] text-white/35 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          disabled={disabled}
          className="w-full pl-3 pr-9 py-2.5 rounded-xl font-mono text-sm text-white placeholder-white/20 outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
        >
          {show ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      </div>
    </div>
  );
}

function ChangePasswordRow({ playerId }: { playerId: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showC, setShowC] = useState(false);
  const [showN, setShowN] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const { addToast } = useStore();

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setError(''); setSuccess(false); };
  const toggle = () => { setOpen((v) => !v); if (open) reset(); };

  const handleSave = async () => {
    if (!current) { setError('Current password is required.'); return; }
    const nextErr = validatePassword(next);
    if (nextErr) { setError(nextErr); return; }
    if (next !== confirm) { setError('New passwords do not match.'); return; }
    setBusy(true);
    setError('');
    const { error: err } = await profileService.changePassword(playerId, current, next);
    if (err) { setError(err); } else {
      setSuccess(true);
      addToast('success', 'Password updated.');
      setTimeout(() => { setOpen(false); reset(); }, 1400);
    }
    setBusy(false);
  };

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-heading transition-all text-left group"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      >
        <KeyRound size={15} className="text-white/45 group-hover:text-white/70 transition-colors flex-shrink-0" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          <p className="text-white/80 font-semibold">Change password</p>
          <p className="text-[11px] text-white/30 font-mono">Update your login password</p>
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }} className="text-white/25 flex-shrink-0">
          <ChevronRight size={14} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mt-2 p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <PwInput label="Current password" value={current} onChange={setCurrent} show={showC} onToggle={() => setShowC((v) => !v)} disabled={busy || success} />
              <PwInput label="New password" value={next} onChange={setNext} show={showN} onToggle={() => setShowN((v) => !v)} disabled={busy || success} placeholder="Min. 4 characters" />
              <PwInput label="Confirm new password" value={confirm} onChange={setConfirm} show={showCf} onToggle={() => setShowCf((v) => !v)} disabled={busy || success} />

              <AnimatePresence>
                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] text-[#FF4040] font-mono">{error}</motion.p>}
                {success && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] text-[#38F5B3] font-mono">Password updated successfully.</motion.p>}
              </AnimatePresence>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={toggle}
                  className="flex-1 py-2 rounded-lg font-heading text-xs text-white/45 hover:text-white/70 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={busy || success}
                  className="flex-1 py-2 rounded-lg font-heading font-semibold text-xs text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{
                    background: success ? 'rgba(56,245,179,0.2)' : 'linear-gradient(135deg, rgba(176,38,255,0.45), rgba(255,38,122,0.35))',
                    border: success ? '1px solid rgba(56,245,179,0.3)' : '1px solid rgba(176,38,255,0.3)',
                  }}
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : success ? <Check size={12} /> : null}
                  {success ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────

export const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { currentPlayer, setCurrentPlayer, addToast } = useStore();

  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [friends, setFriends] = useState<Player[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Array<Friendship & { senderProfile: Player | null }>>([]);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [iAmRequester, setIAmRequester] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = !!currentPlayer && !!player && currentPlayer.id === player.id;

  const reload = useCallback(async () => {
    if (!player) return;
    if (!isOwnProfile && currentPlayer) {
      const { friendship: f, iAmRequester: r } = await profileService.getFriendshipStatus(
        currentPlayer.id,
        player.id
      );
      setFriendship(f);
      setIAmRequester(r);
    }
    if (isOwnProfile) {
      const [f, incoming] = await Promise.all([
        profileService.getFriendsWithProfiles(player.id),
        profileService.getIncomingRequestsWithProfiles(player.id),
      ]);
      setFriends(f);
      setPendingRequests(incoming);
    }
  }, [player, isOwnProfile, currentPlayer]);

  useEffect(() => {
    if (!username) { navigate('/home'); return; }

    const load = async () => {
      setLoading(true);
      const p = await profileService.getProfileByUsername(username);
      if (!p) { navigate('/home'); return; }
      setPlayer(p);

      const { data: matchData } = await supabase.rpc('get_profile_match_history', {
        p_player_uuid: p.id,
      });

      setMatches((matchData ?? []) as MatchWithPlayers[]);
      setLoading(false);
    };

    load();
  }, [username, navigate]);

  useEffect(() => { reload(); }, [reload]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      addToast('error', 'Only PNG, JPG, and WebP images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('error', 'Image must be smaller than 2MB.');
      return;
    }

    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !player) return;
    setAvatarUploading(true);
    try {
      // Always use the same fixed path so the public URL never changes per user
      const path = `${player.id}/avatar`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

      if (uploadErr) throw uploadErr;

      // Get the clean, stable public URL (no timestamp — that goes in the DB)
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const cleanUrl = urlData.publicUrl;
      // Cache-bust only for the in-session display (not persisted)
      const displayUrl = `${cleanUrl}?v=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from('players')
        .update({ avatar_url: cleanUrl })
        .eq('id', player.id);

      if (updateErr) throw updateErr;

      // Re-fetch the full player from DB to get a fresh, complete object
      const refreshed = await profileService.getProfileByUsername(player.username);
      const finalPlayer = refreshed
        ? { ...refreshed, avatar_url: displayUrl } // use cache-busted URL for immediate display
        : { ...player, avatar_url: displayUrl };

      setPlayer(finalPlayer);
      if (isOwnProfile) setCurrentPlayer(finalPlayer);
      setAvatarPreview(null);
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      addToast('success', 'Avatar updated!');
    } catch (err) {
      addToast('error', 'Failed to upload avatar. Please try again.');
      console.error('[avatar upload]', err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarCancel = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarRemove = async () => {
    if (!player) return;
    setAvatarRemoving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ avatar_url: null })
        .eq('id', player.id);
      if (error) throw error;

      // Also remove the file from storage so the old URL is truly gone
      await supabase.storage.from('avatars').remove([`${player.id}/avatar`]);

      const refreshed = await profileService.getProfileByUsername(player.username);
      const updated = refreshed ?? { ...player, avatar_url: null };
      setPlayer(updated);
      if (isOwnProfile) setCurrentPlayer(updated);
      addToast('success', 'Avatar removed.');
    } catch {
      addToast('error', 'Failed to remove avatar.');
    } finally {
      setAvatarRemoving(false);
    }
  };

  const handleSignOut = () => {
    setCurrentPlayer(null);
    addToast('success', 'Signed out successfully.');
    navigate('/home');
  };

  const handleDeleteConfirm = async () => {
    if (!player) return;
    setIsDeleting(true);
    const { error } = await profileService.deleteProfile(player.id);
    if (error) {
      addToast('error', error);
      setIsDeleting(false);
      return;
    }
    setCurrentPlayer(null);
    setShowDeleteModal(false);
    addToast('success', 'Your profile has been deleted.');
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050609] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin" />
      </div>
    );
  }

  if (!player) return null;

  const totalGames = player.total_games || 0;
  const totalWins = player.total_wins || 0;
  const totalLosses = (player as any).total_losses || 0;
  const earned = player.total_earned_usd || 0;
  const playerRp = player.rp ?? 0;
  const peakRp = player.peak_rp ?? 0;

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 relative overflow-hidden">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            'radial-gradient(ellipse at 15% 0%, rgba(176,38,255,0.18), transparent 50%), radial-gradient(ellipse at 85% 5%, rgba(255,38,122,0.12), transparent 50%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          to="/lobby"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-mono mb-8"
        >
          <ArrowLeft size={15} />
          Back to Lobby
        </Link>

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Panel
            className="p-7 sm:p-9 relative overflow-hidden"
            style={{ border: '1px solid rgba(176,38,255,0.18)' }}
          >
            {/* Glow blobs */}
            <div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(176,38,255,0.18), transparent 70%)', filter: 'blur(40px)' }}
            />
            <div
              className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,38,122,0.1), transparent 70%)', filter: 'blur(40px)' }}
            />
            {/* Top accent line */}
            <div
              className="absolute inset-x-0 top-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(176,38,255,0.6), rgba(255,38,122,0.5), transparent)' }}
            />

            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-7">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {/* Hidden file input */}
                {isOwnProfile && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                )}

                {/* Preview or current avatar */}
                <div
                  className="relative"
                  style={{
                    boxShadow: '0 0 0 3px rgba(176,38,255,0.2), 0 0 40px rgba(176,38,255,0.25)',
                    borderRadius: '16px',
                  }}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-24 h-24 object-cover"
                      style={{ borderRadius: '16px' }}
                    />
                  ) : (
                    <PlayerAvatar
                      username={player.username}
                      avatarUrl={player.avatar_url}
                      size={96}
                      shape="square"
                    />
                  )}

                  {/* Camera overlay button for own profile */}
                  {isOwnProfile && !avatarPreview && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
                      title="Change avatar"
                    >
                      <Camera size={20} className="text-white" />
                    </button>
                  )}
                </div>

                {/* Own-profile indicator */}
                {isOwnProfile && !avatarPreview && (
                  <div
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(56,245,179,0.9)',
                      border: '2px solid #050609',
                      boxShadow: '0 0 10px rgba(56,245,179,0.5)',
                    }}
                    title="Your profile"
                  >
                    <Check size={11} className="text-black" strokeWidth={3} />
                  </div>
                )}

                {/* Preview action buttons */}
                {isOwnProfile && avatarPreview && (
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2 whitespace-nowrap">
                    <button
                      onClick={handleAvatarUpload}
                      disabled={avatarUploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-heading font-semibold text-white transition-all disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, rgba(176,38,255,0.6), rgba(255,38,122,0.5))',
                        border: '1px solid rgba(176,38,255,0.4)',
                        boxShadow: '0 4px 16px rgba(176,38,255,0.3)',
                      }}
                    >
                      {avatarUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                      Save
                    </button>
                    <button
                      onClick={handleAvatarCancel}
                      disabled={avatarUploading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-heading text-white/50 hover:text-white transition-colors disabled:opacity-50"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <X size={11} />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Name / meta */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="text-[10px] font-heading tracking-[0.35em] uppercase mb-1"
                  style={{ color: '#FF267A' }}>
                  {isOwnProfile ? 'Your Profile' : 'Player'}
                </p>
                <h1 className="font-heading font-bold text-3xl md:text-4xl text-white tracking-tight mb-2 truncate">
                  {player.username}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <RankChip rp={playerRp} />
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/40">
                    <Clock size={11} strokeWidth={1.8} />
                    Member since {formatDate(player.created_at)}
                  </span>
                  {(player as any).wallet_address && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono"
                      style={{
                        background: 'rgba(176,38,255,0.1)',
                        border: '1px solid rgba(176,38,255,0.25)',
                        color: '#B026FF',
                      }}
                    >
                      <Wallet size={10} />
                      Wallet linked
                    </span>
                  )}
                  {player.bio && (
                    <span className="text-[12px] text-white/50 font-mono">{player.bio}</span>
                  )}
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {!isOwnProfile && currentPlayer && (
                  <FriendButton
                    friendship={friendship}
                    iAmRequester={iAmRequester}
                    myId={currentPlayer.id}
                    theirId={player.id}
                    onAction={reload}
                  />
                )}
                {isOwnProfile && (
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading text-sm text-white/60 hover:text-white transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <LogOut size={14} strokeWidth={1.8} />
                    Sign out
                  </button>
                )}
              </div>
            </div>
          </Panel>
        </motion.div>

        {/* ── Stats row ── */}
        <div className="mb-2">
          <p className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/30 mb-3">
            Performance
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Games" value={totalGames} icon={Gamepad2} delay={0} />
          <StatCard label="Wins" value={totalWins} icon={Trophy} delay={0.06} />
          <StatCard label="Win Rate" value={winRate(totalWins, totalGames)} icon={TrendingUp} delay={0.12} />
          <StatCard label="Earned" value={`$${earned.toFixed(0)}`} icon={DollarSign} accent delay={0.18} />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Match history — col 1-2 */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/30">
              Match History
            </p>

            {matches.length === 0 ? (
              <Panel className="py-16 flex flex-col items-center justify-center text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <Swords size={22} className="text-white/20" strokeWidth={1.5} />
                </div>
                <p className="font-heading font-semibold text-white/30 text-sm mb-1">No matches played yet</p>
                <p className="text-[12px] text-white/20 font-mono mb-5">
                  {isOwnProfile ? 'Your match history will appear here.' : 'This player has no recorded matches yet.'}
                </p>
                {isOwnProfile && (
                  <Link
                    to="/lobby"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-semibold text-sm text-white transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(176,38,255,0.25), rgba(255,38,122,0.18))',
                      border: '1px solid rgba(176,38,255,0.3)',
                    }}
                  >
                    <Gamepad2 size={14} />
                    Enter Lobby
                  </Link>
                )}
              </Panel>
            ) : (
              <div className="space-y-2.5">
                {matches.map((m: any, i) => {
                  const isP1 = m.p1_id === player.id;
                  const won = m.result?.winner === (isP1 ? 'p1' : 'p2');
                  const resultLabel = m.result ? (won ? 'WIN' : 'LOSS') : 'IN PROGRESS';
                  const resultColor = m.result ? (won ? '#38F5B3' : '#FF4040') : 'rgba(255,255,255,0.35)';

                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Panel
                        className="px-5 py-4 flex items-center justify-between gap-4"
                        style={{
                          border: m.result
                            ? `1px solid ${won ? 'rgba(56,245,179,0.15)' : 'rgba(255,64,64,0.15)'}`
                            : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: m.result
                                ? won ? 'rgba(56,245,179,0.1)' : 'rgba(255,64,64,0.1)'
                                : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${resultColor}30`,
                            }}
                          >
                            <Gamepad2 size={14} style={{ color: resultColor }} strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-semibold text-white text-sm truncate">
                              {GAME_NAMES[m.game] ?? m.game ?? 'Duel'}
                            </p>
                            <p className="text-[11px] font-mono text-white/30 mt-0.5">
                              {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span
                          className="font-heading font-bold text-[11px] px-3 py-1.5 rounded-lg flex-shrink-0 tracking-widest"
                          style={{
                            background: `${resultColor}18`,
                            color: resultColor,
                            border: `1px solid ${resultColor}35`,
                          }}
                        >
                          {resultLabel}
                        </span>
                      </Panel>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Rank card */}
            <div>
              <p className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/30 mb-3">
                Ranked Standing
              </p>
              <RankCard rp={playerRp} peakRp={peakRp > playerRp ? peakRp : undefined} />
              {((player.competitive_wins ?? 0) + (player.competitive_losses ?? 0)) > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Panel className="p-3 text-center">
                    <p className="text-[9px] font-heading uppercase tracking-[0.2em] text-white/35 mb-1">Comp Wins</p>
                    <p className="font-heading font-bold text-lg" style={{ color: '#38F5B3' }}>{player.competitive_wins ?? 0}</p>
                  </Panel>
                  <Panel className="p-3 text-center">
                    <p className="text-[9px] font-heading uppercase tracking-[0.2em] text-white/35 mb-1">Comp Losses</p>
                    <p className="font-heading font-bold text-lg text-white/70">{player.competitive_losses ?? 0}</p>
                  </Panel>
                </div>
              )}
            </div>

            {/* Friend Requests — own profile only */}
            {isOwnProfile && (
              <div>
                <p className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/30 mb-3">
                  Friend Requests
                </p>
                <Panel className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <UserPlus size={13} strokeWidth={1.8} className="text-[#FF267A]" />
                    <span className="font-heading font-semibold text-white text-sm uppercase tracking-[0.18em]">
                      Incoming
                    </span>
                    {pendingRequests.length > 0 && (
                      <span
                        className="ml-auto text-[11px] font-mono px-2 py-0.5 rounded-md"
                        style={{
                          background: 'rgba(255,38,122,0.15)',
                          color: '#FF267A',
                          border: '1px solid rgba(255,38,122,0.25)',
                        }}
                      >
                        {pendingRequests.length}
                      </span>
                    )}
                  </div>

                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-3">
                      <p className="text-[12px] text-white/25 font-mono">No pending requests.</p>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {pendingRequests.map((req) => {
                        const sender = req.senderProfile;
                        return (
                          <li
                            key={req.id}
                            className="flex items-center gap-3 px-2.5 py-2 rounded-xl"
                            style={{
                              background: 'rgba(176,38,255,0.06)',
                              border: '1px solid rgba(176,38,255,0.14)',
                            }}
                          >
                            {sender ? (
                              <Link to={`/profile/${sender.username}`} className="flex-shrink-0">
                                <PlayerAvatar username={sender.username} avatarUrl={sender.avatar_url} size={32} shape="circle" />
                              </Link>
                            ) : (
                              <div
                                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-heading font-bold text-white/60"
                                style={{ background: 'rgba(255,255,255,0.08)' }}
                              >
                                ?
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              {sender ? (
                                <Link to={`/profile/${sender.username}`}>
                                  <p className="font-heading font-semibold text-white text-sm truncate hover:text-[#4DEBFF] transition-colors">
                                    {sender.username}
                                  </p>
                                </Link>
                              ) : (
                                <p className="font-mono text-[11px] text-white/40 truncate">{req.requester_id.slice(0, 8)}…</p>
                              )}
                              {sender && (
                                <p className="text-[10px] text-white/30 font-mono">{sender.total_games || 0} games</p>
                              )}
                            </div>
                            {/* Accept */}
                            <button
                              onClick={async () => {
                                const { error } = await profileService.acceptFriendRequest(req.id, currentPlayer!.id);
                                if (error) addToast('error', error);
                                else { addToast('success', `Now friends with ${sender?.username ?? 'player'}!`); reload(); }
                              }}
                              title="Accept"
                              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95"
                              style={{
                                background: 'rgba(56,245,179,0.12)',
                                border: '1px solid rgba(56,245,179,0.3)',
                                color: '#38F5B3',
                                boxShadow: '0 0 14px rgba(56,245,179,0.15)',
                              }}
                            >
                              <Check size={13} strokeWidth={2.5} />
                            </button>
                            {/* Reject */}
                            <button
                              onClick={async () => {
                                const { error } = await profileService.rejectFriendRequest(req.requester_id, currentPlayer!.id);
                                if (error) addToast('error', error);
                                else { addToast('info', 'Request dismissed.'); reload(); }
                              }}
                              title="Reject"
                              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95"
                              style={{
                                background: 'rgba(255,95,143,0.10)',
                                border: '1px solid rgba(255,95,143,0.28)',
                                color: '#FF5F8F',
                                boxShadow: '0 0 14px rgba(255,95,143,0.12)',
                              }}
                            >
                              <X size={13} strokeWidth={2.5} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              </div>
            )}

            {/* Friends — own profile only */}
            {isOwnProfile && (
              <div>
                <p className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/30 mb-3">
                  Friends
                </p>
                <Panel className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={13} strokeWidth={1.8} className="text-[#FF267A]" />
                    <span className="font-heading font-semibold text-white text-sm uppercase tracking-[0.18em]">
                      Friends
                    </span>
                    <span
                      className="ml-auto text-[11px] font-mono px-2 py-0.5 rounded-md"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.4)',
                      }}
                    >
                      {friends.length}
                    </span>
                  </div>

                  {friends.length === 0 ? (
                    <div className="text-center py-4">
                      <Users size={22} className="mx-auto mb-2 text-white/15" />
                      <p className="text-[12px] text-white/30 font-mono leading-relaxed">
                        No friends yet.
                        <br />
                        Search players below to add your first friend.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {friends.map((f) => (
                        <li key={f.id}>
                          <Link
                            to={`/profile/${f.username}`}
                            className="flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors group"
                            style={{ background: 'transparent' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <PlayerAvatar username={f.username} avatarUrl={f.avatar_url} size={32} shape="circle" />
                            <div className="flex-1 min-w-0">
                              <p className="font-heading font-semibold text-white text-sm truncate">{f.username}</p>
                              <p className="text-[10px] text-white/30 font-mono">{f.total_games || 0} games</p>
                            </div>
                            <ChevronRight size={12} className="text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            )}

            {/* Find Players */}
            {(isOwnProfile || currentPlayer) && (
              <div>
                <p className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/30 mb-3">
                  Find Players
                </p>
                <Panel className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Search size={13} strokeWidth={1.8} className="text-[#FF267A]" />
                    <span className="font-heading font-semibold text-white text-sm uppercase tracking-[0.18em]">
                      Search
                    </span>
                  </div>
                  <PlayerSearch myId={currentPlayer?.id ?? null} />
                </Panel>
              </div>
            )}

            {/* Account — own profile only */}
            {isOwnProfile && (
              <div>
                <p className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/30 mb-3">
                  Account
                </p>
                <Panel
                  className="p-5 overflow-hidden relative"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2 mb-5">
                    <span className="font-heading font-semibold text-white text-sm uppercase tracking-[0.18em]">
                      Settings
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Avatar controls */}
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-heading transition-all text-left group"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      >
                        <Camera size={15} className="text-white/45 group-hover:text-white/70 transition-colors flex-shrink-0" strokeWidth={1.8} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 font-semibold">Change avatar</p>
                          <p className="text-[11px] text-white/30 font-mono">PNG, JPG, WebP · max 2MB</p>
                        </div>
                      </button>
                      {player.avatar_url && (
                        <button
                          onClick={handleAvatarRemove}
                          disabled={avatarRemoving}
                          className="w-full mt-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-heading transition-all text-left group disabled:opacity-50"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,64,64,0.07)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        >
                          {avatarRemoving ? (
                            <Loader2 size={14} className="animate-spin text-white/30" />
                          ) : (
                            <X size={14} className="text-white/30 group-hover:text-[#FF4040]/70 transition-colors flex-shrink-0" strokeWidth={2} />
                          )}
                          <p className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors font-mono">Remove avatar</p>
                        </button>
                      )}
                    </div>

                    <ChangePasswordRow playerId={player.id} />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-heading transition-all text-left group"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    >
                      <LogOut size={15} className="text-white/45 group-hover:text-white/70 transition-colors" strokeWidth={1.8} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 font-semibold">Sign out</p>
                        <p className="text-[11px] text-white/30 font-mono">
                          Returns you to lobby as guest
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-heading transition-all text-left group"
                      style={{
                        background: 'rgba(255,64,64,0.04)',
                        border: '1px solid rgba(255,64,64,0.15)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,64,64,0.09)';
                        e.currentTarget.style.border = '1px solid rgba(255,64,64,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,64,64,0.04)';
                        e.currentTarget.style.border = '1px solid rgba(255,64,64,0.15)';
                      }}
                    >
                      <Trash2 size={15} className="text-[#FF4040]/60 group-hover:text-[#FF4040] transition-colors flex-shrink-0" strokeWidth={1.8} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[#FF4040]/80 group-hover:text-[#FF4040] transition-colors font-semibold">
                          Delete account
                        </p>
                        <p className="text-[11px] text-[#FF4040]/35 font-mono">
                          Permanently removes your profile
                        </p>
                      </div>
                    </button>
                  </div>
                </Panel>
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        open={showDeleteModal}
        username={player.username}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};
