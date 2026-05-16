import { useState, useCallback } from 'react';

export type Cell = null | 'P1' | 'P2';
export type Board = Cell[][];
export type WinningCells = Array<{ row: number; col: number }>;

const ROWS = 6;
const COLS = 7;

const createEmptyBoard = (): Board => {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
};

const checkWinner = (board: Board): { winner: 'P1' | 'P2' | 'draw' | null; winningCells: WinningCells } => {
  const checkLine = (cells: Array<{ row: number; col: number }>): { winner: 'P1' | 'P2' | null; cells: WinningCells } => {
    let count = 0;
    let currentPlayer: Cell = null;
    let startIdx = 0;

    for (let i = 0; i < cells.length; i++) {
      const { row, col } = cells[i];
      const cell = board[row][col];

      if (cell && cell === currentPlayer) {
        count++;
        if (count === 4) {
          return { winner: currentPlayer, cells: cells.slice(startIdx, i + 1) };
        }
      } else {
        currentPlayer = cell;
        count = cell ? 1 : 0;
        startIdx = i;
      }
    }
    return { winner: null, cells: [] };
  };

  // Check horizontal
  for (let row = 0; row < ROWS; row++) {
    const cells = Array.from({ length: COLS }, (_, col) => ({ row, col }));
    const result = checkLine(cells);
    if (result.winner) return { winner: result.winner, winningCells: result.cells };
  }

  // Check vertical
  for (let col = 0; col < COLS; col++) {
    const cells = Array.from({ length: ROWS }, (_, row) => ({ row, col }));
    const result = checkLine(cells);
    if (result.winner) return { winner: result.winner, winningCells: result.cells };
  }

  // Check diagonal (↘)
  for (let startRow = 0; startRow <= ROWS - 4; startRow++) {
    for (let startCol = 0; startCol <= COLS - 4; startCol++) {
      const cells = Array.from({ length: Math.min(ROWS - startRow, COLS - startCol) }, (_, i) => ({
        row: startRow + i,
        col: startCol + i
      }));
      const result = checkLine(cells);
      if (result.winner) return { winner: result.winner, winningCells: result.cells };
    }
  }

  // Check diagonal (↗)
  for (let startRow = 3; startRow < ROWS; startRow++) {
    for (let startCol = 0; startCol <= COLS - 4; startCol++) {
      const cells = Array.from({ length: Math.min(startRow + 1, COLS - startCol) }, (_, i) => ({
        row: startRow - i,
        col: startCol + i
      }));
      const result = checkLine(cells);
      if (result.winner) return { winner: result.winner, winningCells: result.cells };
    }
  }

  // Check for draw
  const isFull = board.every(row => row.every(cell => cell !== null));
  if (isFull) {
    return { winner: 'draw', winningCells: [] };
  }

  return { winner: null, winningCells: [] };
};

export const useConnectFour = () => {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<'P1' | 'P2'>('P1');
  const [winner, setWinner] = useState<'P1' | 'P2' | 'draw' | null>(null);
  const [winningCells, setWinningCells] = useState<WinningCells>([]);

  const dropDisc = useCallback((col: number): boolean => {
    if (winner) return false;

    // Find lowest empty row in column
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!board[row][col]) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = currentPlayer;
        setBoard(newBoard);

        // Check for winner
        const result = checkWinner(newBoard);
        if (result.winner) {
          setWinner(result.winner);
          setWinningCells(result.winningCells);
        } else {
          setCurrentPlayer(currentPlayer === 'P1' ? 'P2' : 'P1');
        }

        return true;
      }
    }
    return false; // Column is full
  }, [board, currentPlayer, winner]);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setCurrentPlayer('P1');
    setWinner(null);
    setWinningCells([]);
  }, []);

  const setGameState = useCallback((newBoard: Board, newPlayer: 'P1' | 'P2') => {
    setBoard(newBoard);
    setCurrentPlayer(newPlayer);

    const result = checkWinner(newBoard);
    if (result.winner) {
      setWinner(result.winner);
      setWinningCells(result.winningCells);
    }
  }, []);

  return {
    board,
    currentPlayer,
    winner,
    winningCells,
    dropDisc,
    resetGame,
    setGameState
  };
};
