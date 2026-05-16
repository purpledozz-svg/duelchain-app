import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface JoinRoomInputProps {
  onJoin: (code: string) => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function JoinRoomInput({
  onJoin,
  onBack,
  isLoading = false,
  error = null
}: JoinRoomInputProps) {
  const [code, setCode] = useState('');

  const handleCodeChange = (value: string) => {
    const uppercased = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (uppercased.length <= 6) {
      setCode(uppercased);
      if (uppercased.length === 6) {
        onJoin(uppercased);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      onJoin(code);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>

      <Card className="p-8">
        <h2 className="text-2xl font-bold text-center mb-2">Join Private Game</h2>
        <p className="text-gray-400 text-center mb-6">
          Enter the 6-character game code
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="ABC123"
            className="w-full bg-white/5 border-2 border-white/10 rounded-lg px-6 py-4 text-center text-3xl font-bold tracking-widest focus:outline-none focus:border-[#F0B429] mb-4 uppercase"
            maxLength={6}
            autoFocus
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="text-sm text-gray-400 text-center mb-6">
            {code.length}/6 characters
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={code.length !== 6 || isLoading}
          >
            {isLoading ? 'Joining...' : 'Join Game'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-gray-400">
            Ask your friend for their game code. Once you enter it, you'll see their bet and can set yours.
          </p>
        </div>
      </Card>
    </div>
  );
}
