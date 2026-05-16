import { Globe, Lock } from 'lucide-react';
import { Card } from '../ui/Card';

interface ModeSelectorProps {
  onSelectOnline: () => void;
  onCreatePrivate: () => void;
  onJoinPrivate: () => void;
}

export default function ModeSelector({
  onSelectOnline,
  onCreatePrivate,
  onJoinPrivate
}: ModeSelectorProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <Card className="p-8 hover:border-[#F0B429] transition-all cursor-pointer group" onClick={onSelectOnline}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#F0B429] to-[#D4A017] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Play Online</h2>
          <p className="text-gray-400 mb-4">
            Match against random players worldwide
          </p>
          <button className="w-full bg-[#F0B429] hover:bg-[#D4A017] text-gray-900 font-semibold py-3 px-6 rounded-lg transition-all">
            Find Opponent
          </button>
        </div>
      </Card>

      <Card className="p-8 hover:border-[#58A6FF] transition-all group">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#58A6FF] to-[#3B82F6] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Private Game</h2>
          <p className="text-gray-400 mb-4">
            Play with a friend using a game code
          </p>
          <div className="space-y-2">
            <button
              onClick={onCreatePrivate}
              className="w-full bg-[#58A6FF] hover:bg-[#3B82F6] text-white font-semibold py-3 px-6 rounded-lg transition-all"
            >
              Create Game
            </button>
            <button
              onClick={onJoinPrivate}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 px-6 rounded-lg transition-all border border-white/10"
            >
              Join with Code
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
