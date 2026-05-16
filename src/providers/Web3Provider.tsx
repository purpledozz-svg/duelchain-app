import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, Theme } from '@rainbow-me/rainbowkit';
import merge from 'lodash.merge';
import { config } from '../lib/wagmi';

const queryClient = new QueryClient();

const duelchainTheme: Theme = merge(
  darkTheme({
    accentColor: '#FF267A',
    accentColorForeground: '#FFFFFF',
    borderRadius: 'large',
    overlayBlur: 'large',
  }),
  {
    colors: {
      modalBackground: 'rgba(12, 10, 18, 0.96)',
      modalBorder: 'rgba(255, 38, 122, 0.28)',
      modalText: '#FFFFFF',
      modalTextSecondary: 'rgba(255, 255, 255, 0.6)',
      modalBackdrop: 'rgba(5, 6, 9, 0.85)',
      profileAction: 'rgba(255, 255, 255, 0.04)',
      profileActionHover: 'rgba(255, 38, 122, 0.12)',
      connectButtonBackground: 'rgba(18, 14, 26, 0.9)',
      connectButtonInnerBackground: 'rgba(255, 255, 255, 0.04)',
      menuItemBackground: 'rgba(255, 255, 255, 0.03)',
      generalBorder: 'rgba(255, 255, 255, 0.08)',
      generalBorderDim: 'rgba(255, 255, 255, 0.04)',
      selectedOptionBorder: 'rgba(255, 38, 122, 0.5)',
    },
    shadows: {
      dialog: '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(255, 38, 122, 0.18)',
      profileDetailsAction: '0 0 14px rgba(255, 38, 122, 0.2)',
      selectedOption: '0 0 18px rgba(255, 38, 122, 0.35)',
      selectedWallet: '0 0 22px rgba(255, 38, 122, 0.3)',
      walletLogo: '0 0 10px rgba(0, 0, 0, 0.4)',
    },
  } as Partial<Theme>
);

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={duelchainTheme} modalSize="compact" initialChain={8453}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
