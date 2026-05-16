import { create } from 'zustand';
import { Player } from '../types';
import { Toast, ToastType } from '../components/ui/Toast';

const PLAYER_STORAGE_KEY = 'duelchain_current_player';

function loadStoredPlayer(): Player | null {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Player) : null;
  } catch {
    return null;
  }
}

function savePlayer(player: Player | null) {
  try {
    if (player) localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
    else localStorage.removeItem(PLAYER_STORAGE_KEY);
  } catch {}
}

interface AppState {
  currentPlayer: Player | null;
  walletAddress: string | null;
  isConnecting: boolean;
  toasts: Toast[];
  prices: { ETH: number; BTC: number; USDC: number };
  isPriceLive: boolean;

  setCurrentPlayer: (player: Player | null) => void;
  setWalletAddress: (address: string | null) => void;
  setIsConnecting: (connecting: boolean) => void;
  disconnect: () => void;
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  setPrices: (prices: { ETH: number; BTC: number; USDC: number }) => void;
  setIsPriceLive: (isLive: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  currentPlayer: loadStoredPlayer(),
  walletAddress: null,
  isConnecting: false,
  toasts: [],
  prices: { ETH: 0, BTC: 0, USDC: 1.0 },
  isPriceLive: false,

  setCurrentPlayer: (player) => { savePlayer(player); set({ currentPlayer: player }); },
  setWalletAddress: (address) => set({ walletAddress: address }),
  setIsConnecting: (connecting) => set({ isConnecting: connecting }),
  disconnect: () => { savePlayer(null); set({ currentPlayer: null, walletAddress: null }); },

  addToast: (type, message, duration) => set((state) => ({
    toasts: [...state.toasts, { id: Date.now().toString(), type, message, duration }]
  })),

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  setPrices: (prices) => set({ prices }),
  setIsPriceLive: (isLive) => set({ isPriceLive: isLive }),
}));
