import { useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';

interface MoveHistoryProps {
  moves: string[];
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || ''
    });
  }

  return (
    <div className="bg-white/5 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <ScrollText className="w-5 h-5 text-[#F0B429]" />
        <h3 className="font-semibold">Move History</h3>
      </div>

      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto space-y-1 pr-2 custom-scrollbar"
      >
        {movePairs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No moves yet</div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.number}
              className="grid grid-cols-[40px_1fr_1fr] gap-2 py-1 px-2 rounded hover:bg-white/5 text-sm"
            >
              <div className="text-gray-500 font-mono">{pair.number}.</div>
              <div className="font-mono text-white">{pair.white}</div>
              <div className="font-mono text-gray-300">{pair.black}</div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(240, 180, 41, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(240, 180, 41, 0.7);
        }
      `}</style>
    </div>
  );
}
