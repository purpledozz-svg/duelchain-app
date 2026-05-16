interface Prices {
  ETH: number;
  BTC: number;
  USDC: number;
}

class PriceService {
  private prices: Prices = { ETH: 0, BTC: 0, USDC: 1.0 };
  private listeners: Set<(prices: Prices) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private isLive = false;

  async start() {
    await this.fetchPrices();
    this.updateInterval = setInterval(() => this.fetchPrices(), 30000);
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async fetchPrices() {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,usd-coin&vs_currencies=usd'
      );
      const data = await response.json();

      this.prices = {
        BTC: data.bitcoin?.usd || this.prices.BTC,
        ETH: data.ethereum?.usd || this.prices.ETH,
        USDC: 1.0,
      };

      this.isLive = true;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      this.isLive = false;
    }
  }

  getPrices(): Prices {
    return { ...this.prices };
  }

  isLiveFeed(): boolean {
    return this.isLive;
  }

  subscribe(callback: (prices: Prices) => void) {
    this.listeners.add(callback);
    callback(this.prices);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.prices));
  }

  formatAmount(amount: number, currency: 'ETH' | 'BTC' | 'USDC'): string {
    const symbol = currency === 'ETH' ? 'Ξ' : currency === 'BTC' ? '₿' : '$';
    const decimals = currency === 'USDC' ? 2 : 4;
    return `${symbol} ${amount.toFixed(decimals)} ${currency}`;
  }

  formatWithUSD(amount: number, currency: 'ETH' | 'BTC' | 'USDC'): string {
    const usdValue = amount * this.prices[currency];
    const symbol = currency === 'ETH' ? 'Ξ' : currency === 'BTC' ? '₿' : '$';
    const decimals = currency === 'USDC' ? 2 : 4;
    return `${symbol} ${amount.toFixed(decimals)} ${currency}  ($${usdValue.toFixed(2)})`;
  }

  toUSD(amount: number, currency: 'ETH' | 'BTC' | 'USDC'): number {
    return amount * this.prices[currency];
  }
}

export const priceService = new PriceService();
