import type { Board, WinningCells } from '../../../hooks/useConnectFour';

interface ConnectFourBoardProps {
  board: Board;
  currentPlayer: 'P1' | 'P2';
  onColumnClick: (col: number) => void;
  winningCells: WinningCells;
  disabled: boolean;
}

export default function ConnectFourBoard({
  board,
  currentPlayer,
  onColumnClick,
  winningCells,
  disabled
}: ConnectFourBoardProps) {
  const isWinningCell = (row: number, col: number) => {
    return winningCells.some(cell => cell.row === row && cell.col === col);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-2 bg-[#0D1117] p-4 rounded-xl">
        {board.map((row, rowIndex) => (
          row.map((cell, colIndex) => {
            const isWinning = isWinningCell(rowIndex, colIndex);
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => !disabled && onColumnClick(colIndex)}
                disabled={disabled}
                className={`
                  w-16 h-16 rounded-full transition-all duration-300
                  ${cell === null ? 'bg-[#1C2128]' : ''}
                  ${cell === 'P1' ? 'bg-gradient-to-br from-[#F0B429] to-[#D4A017] shadow-lg' : ''}
                  ${cell === 'P2' ? 'bg-gradient-to-br from-[#58A6FF] to-[#3B82F6] shadow-lg' : ''}
                  ${isWinning ? 'animate-pulse ring-4 ring-white shadow-2xl scale-110' : ''}
                  ${!disabled && cell === null ? 'hover:bg-[#2A2E36] cursor-pointer' : ''}
                  ${disabled ? 'cursor-not-allowed' : ''}
                `}
                style={{
                  boxShadow: isWinning
                    ? '0 0 30px rgba(255, 255, 255, 0.8)'
                    : cell === 'P1'
                    ? '0 4px 20px rgba(240, 180, 41, 0.4)'
                    : cell === 'P2'
                    ? '0 4px 20px rgba(88, 166, 255, 0.4)'
                    : 'none'
                }}
              />
            );
          })
        ))}
      </div>

      {!disabled && (
        <div className="grid grid-cols-7 gap-2 px-4">
          {Array.from({ length: 7 }).map((_, col) => (
            <button
              key={col}
              onClick={() => onColumnClick(col)}
              className="h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center text-sm font-medium"
              style={{
                color: currentPlayer === 'P1' ? '#F0B429' : '#58A6FF'
              }}
            >
              ↓
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
