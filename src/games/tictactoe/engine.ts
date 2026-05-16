export type Cell = 'X' | 'O' | null;
export type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];
export type GameStatus = 'playing' | 'win' | 'draw';

export const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
] as const;

export function createBoard(): Board {
  return [null, null, null, null, null, null, null, null, null];
}

export function checkWin(board: Board, symbol: 'X' | 'O'): number[] | null {
  for (const line of WIN_LINES) {
    if (line.every(i => board[i] === symbol)) return [...line];
  }
  return null;
}

export function isDraw(board: Board): boolean {
  return board.every(c => c !== null);
}

export function getStatus(board: Board, lastMover: 'X' | 'O'): { status: GameStatus; winLine: number[] | null } {
  const winLine = checkWin(board, lastMover);
  if (winLine) return { status: 'win', winLine };
  if (isDraw(board)) return { status: 'draw', winLine: null };
  return { status: 'playing', winLine: null };
}

export function applyMove(board: Board, index: number, symbol: 'X' | 'O'): Board | null {
  if (board[index] !== null) return null;
  const next = [...board] as Board;
  next[index] = symbol;
  return next;
}

// Simple AI: win > block > center > corner > random
export function getAiMove(board: Board, aiSymbol: 'O', humanSymbol: 'X'): number {
  const empty = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0);

  // Win if possible
  for (const i of empty) {
    const b = applyMove(board, i, aiSymbol)!;
    if (checkWin(b, aiSymbol)) return i;
  }
  // Block human win
  for (const i of empty) {
    const b = applyMove(board, i, humanSymbol)!;
    if (checkWin(b, humanSymbol)) return i;
  }
  // Center
  if (board[4] === null) return 4;
  // Corners
  for (const c of [0, 2, 6, 8]) {
    if (board[c] === null) return c;
  }
  return empty[0];
}
