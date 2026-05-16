import { base, baseSepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  walletConnectWallet,
  injectedWallet,
  rabbyWallet,
  rainbowWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';

const projectId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || '';

export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

const walletList = projectId
  ? [metaMaskWallet, rabbyWallet, rainbowWallet, coinbaseWallet, walletConnectWallet, injectedWallet]
  : [metaMaskWallet, rabbyWallet, rainbowWallet, coinbaseWallet, injectedWallet];

export const config = getDefaultConfig({
  appName: 'DUELCHAIN',
  appDescription: 'Peer-to-peer skill gaming with crypto stakes on Base',
  appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://duelchain.app',
  projectId: projectId || 'duelchain-placeholder',
  chains: [base, baseSepolia],
  wallets: [
    {
      groupName: 'Recommended',
      wallets: walletList,
    },
  ],
  ssr: false,
});
