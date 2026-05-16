import { useStore } from '../../store/useStore';

interface CurrencyDisplayProps {
  amount: number;
  currency: 'ETH' | 'BTC' | 'USDC';
  showSymbol?: boolean;
  showUSD?: boolean;
  className?: string;
}

export const CurrencyDisplay = ({
  amount,
  currency,
  showSymbol = true,
  showUSD = true,
  className = ''
}: CurrencyDisplayProps) => {
  const { prices, isPriceLive } = useStore();

  const symbols = {
    ETH: 'Ξ',
    BTC: '₿',
    USDC: '$'
  };

  const decimals = currency === 'USDC' ? 2 : 4;
  const usdValue = amount * prices[currency];

  return (
    <span className={`font-mono ${className}`}>
      {showSymbol && `${symbols[currency]} `}
      {amount.toFixed(decimals)} {currency}
      {showUSD && (
        <>
          {' '}
          <span className="text-text-secondary">
            (${usdValue.toFixed(2)})
          </span>
          {isPriceLive && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full ml-2 animate-pulse" title="Live prices" />
          )}
        </>
      )}
    </span>
  );
};

interface CurrencySelectorProps {
  selected: 'ETH' | 'BTC' | 'USDC';
  onChange: (currency: 'ETH' | 'BTC' | 'USDC') => void;
  balances?: {
    ETH: number;
    BTC: number;
    USDC: number;
  };
}

export const CurrencySelector = ({ selected, onChange, balances }: CurrencySelectorProps) => {
  const { prices } = useStore();

  const currencies = [
    { symbol: 'Ξ', name: 'ETH', color: '#627EEA' },
    { symbol: '₿', name: 'BTC', color: '#F7931A' },
    { symbol: '$', name: 'USDC', color: '#2775CA' }
  ] as const;

  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as 'ETH' | 'BTC' | 'USDC')}
        className="appearance-none bg-secondary border border-border rounded px-4 py-2 pr-10 text-text-primary font-mono cursor-pointer hover:border-accent transition-colors"
      >
        {currencies.map(({ symbol, name }) => (
          <option key={name} value={name}>
            {symbol} {name} - ${prices[name].toFixed(2)}
            {balances && ` (Balance: ${balances[name].toFixed(4)})`}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
        ▼
      </div>
    </div>
  );
};
