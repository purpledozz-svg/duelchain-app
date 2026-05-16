# Wallet Integration Guide

This guide explains how to complete the wallet connection integration using the wagmi infrastructure that's already been set up.

## Step 1: Update main.tsx

Add the WagmiConfig and QueryClient providers:

```tsx
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/wagmi';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
```

## Step 2: Update ConnectWallet Page

Replace the current implementation with wagmi hooks:

```tsx
import { useConnect, useAccount } from 'wagmi';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export const ConnectWallet = () => {
  const { connectors, connect } = useConnect();
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const { addToast, setWalletAddress } = useStore();

  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
      addToast('success', `Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      navigate('/lobby');
    }
  }, [isConnected, address]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-4xl font-bold text-center mb-8">Connect Wallet</h1>
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            className="w-full bg-secondary border border-border rounded-lg p-4 hover:border-accent transition-colors"
          >
            {connector.name}
          </button>
        ))}
      </div>
    </div>
  );
};
```

## Step 3: Update Header Component

Add wallet connection status and balance:

```tsx
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';

export const Header = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address: address,
  });

  return (
    <header className="...">
      {/* ... existing code ... */}

      {isConnected && address ? (
        <div className="flex items-center space-x-4">
          {balance && (
            <div className="text-sm font-mono">
              <CurrencyDisplay
                amount={parseFloat(balance.formatted)}
                currency="ETH"
              />
            </div>
          )}
          <button
            onClick={() => disconnect()}
            className="..."
          >
            {address.slice(0, 6)}...{address.slice(-4)}
          </button>
        </div>
      ) : (
        <Link to="/connect">
          <Button>Connect Wallet</Button>
        </Link>
      )}
    </header>
  );
};
```

## Step 4: Add SIWE Authentication (Optional but Recommended)

Install SIWE package:
```bash
npm install siwe
```

Create auth service:

```tsx
// src/lib/siweAuth.ts
import { SiweMessage } from 'siwe';
import { supabase } from './supabase';

export async function signInWithEthereum(
  address: string,
  chainId: number,
  signMessage: (message: string) => Promise<string>
) {
  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: 'Sign in to DuelChain',
    uri: window.location.origin,
    version: '1',
    chainId,
    nonce: Math.random().toString(36).substring(7),
  });

  const messageToSign = message.prepareMessage();
  const signature = await signMessage(messageToSign);

  // Verify and create session
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${address.toLowerCase()}@duelchain.local`,
    password: signature,
  });

  return { data, error };
}
```

## Step 5: Network Switching

Add network switch handler:

```tsx
import { useSwitchChain } from 'wagmi';
import { polygon } from 'wagmi/chains';

const { switchChain } = useSwitchChain();

// When user is on wrong network:
if (chain?.id !== polygon.id) {
  switchChain({ chainId: polygon.id });
}
```

## Error Handling

Common errors to handle:

```tsx
const { connect } = useConnect({
  onError(error) {
    if (error.message.includes('User rejected')) {
      addToast('warning', 'Connection cancelled. Try again.');
    } else if (error.message.includes('No provider')) {
      addToast('error', 'No wallet detected. Install MetaMask or use WalletConnect.');
    } else {
      addToast('error', 'Failed to connect wallet. Please try again.');
    }
  },
});
```

## Testing Checklist

- [ ] MetaMask connection works
- [ ] WalletConnect QR code displays
- [ ] Coinbase Wallet connection works
- [ ] Wallet balance displays in header
- [ ] Disconnect works properly
- [ ] Network switching prompts on wrong chain
- [ ] Error messages show for all failure cases
- [ ] Session persists on page reload
- [ ] User redirected to lobby after connecting

## WalletConnect Project ID

Current implementation uses a demo project ID. Get your free project ID:

1. Go to https://cloud.walletconnect.com
2. Create a free account
3. Create a new project
4. Copy the Project ID
5. Update `src/lib/wagmi.ts`:

```tsx
const projectId = 'YOUR_PROJECT_ID_HERE';
```

## Network Configuration

Current setup uses:
- Polygon (primary)
- Ethereum Mainnet
- Arbitrum

To add more networks, update `src/lib/wagmi.ts`:

```tsx
import { base, optimism } from 'wagmi/chains';

export const config = createConfig({
  chains: [polygon, mainnet, arbitrum, base, optimism],
  // ... rest of config
});
```

## Resources

- [wagmi Documentation](https://wagmi.sh)
- [WalletConnect Docs](https://docs.walletconnect.com)
- [SIWE Specification](https://docs.login.xyz)
