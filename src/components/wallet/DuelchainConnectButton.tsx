import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, Wallet, AlertTriangle } from 'lucide-react';

interface DuelchainConnectButtonProps {
  compact?: boolean;
}

export function DuelchainConnectButton({ compact = false }: DuelchainConnectButtonProps) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        // When not yet mounted, show a placeholder button that still triggers connect on click.
        // This avoids the invisible/unclickable state caused by pointerEvents:none.
        if (!mounted) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-sm text-white font-semibold tracking-wider transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Wallet size={15} strokeWidth={1.8} />
              <span>Connect</span>
            </button>
          );
        }

        const connected = account && chain;

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-sm text-white font-semibold tracking-wider transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background:
                  'linear-gradient(135deg, rgba(176,38,255,0.28), rgba(255,38,122,0.22), rgba(255,64,64,0.16))',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow:
                  '0 0 22px rgba(176,38,255,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Wallet size={15} strokeWidth={1.8} />
              <span>Connect</span>
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading text-sm text-white font-semibold tracking-wider transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(255,64,64,0.3), rgba(255,38,122,0.2))',
                border: '1px solid rgba(255,64,64,0.5)',
                boxShadow: '0 0 18px rgba(255,64,64,0.35)',
              }}
            >
              <AlertTriangle size={14} />
              <span>Switch to Base</span>
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {!compact && (
              <button
                onClick={openChainModal}
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-xs text-white/80 transition-all hover:text-white"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#38F5B3] shadow-[0_0_8px_rgba(56,245,179,0.8)]" />
                {chain.name}
              </button>
            )}
            <button
              onClick={openAccountModal}
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-mono text-sm text-white"
              style={{
                background:
                  'linear-gradient(135deg, rgba(176,38,255,0.18), rgba(255,38,122,0.12))',
                border: '1px solid rgba(255,38,122,0.35)',
                boxShadow: '0 0 18px rgba(176,38,255,0.25)',
              }}
            >
              <div className="w-2 h-2 rounded-full bg-[#FF267A] flex-shrink-0 shadow-[0_0_8px_rgba(255,38,122,0.8)]" />
              <span>{account.displayName}</span>
              {account.displayBalance && !compact && (
                <span className="text-white/50">· {account.displayBalance}</span>
              )}
              <ChevronDown size={14} className="text-white/60" />
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
