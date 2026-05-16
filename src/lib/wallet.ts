export const truncateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const generateAvatar = (seed: string): string => {
  const colors = ['#8B5CF6', '#06B6D4', '#F97316', '#10B981', '#F59E0B', '#EF4444'];
  const index = parseInt(seed.slice(0, 8), 16) % colors.length;
  return colors[index];
};

export const formatEth = (amount: number): string => {
  return amount.toFixed(4);
};

export const calculateWinRate = (wins: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
};
