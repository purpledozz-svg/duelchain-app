export function formatEth(value: number): string {
  return value.toFixed(4);
}

export function formatCurrency(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}
