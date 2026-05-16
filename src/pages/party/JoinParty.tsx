import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { partyService } from '../../lib/partyService';

export default function JoinParty() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledCode = searchParams.get('code') || '';

  const [code, setCode] = useState(prefilledCode.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a 6-character party code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const party = await partyService.joinParty(code, playerId);
      navigate(`/party/${party.code}/game`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join party';

      if (message.includes('not found')) {
        setError('Party code not found. Please check the code and try again.');
      } else if (message.includes('full')) {
        setError('This party is already full. Only 2 players allowed.');
      } else if (message.includes('expired') || message.includes('started')) {
        setError('This party has expired or already started.');
      } else {
        setError(message);
      }

      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(value);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-md mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/lobby')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lobby
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#F0B429]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[#F0B429]" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Join a Party</h1>
            <p className="text-gray-400">Enter the 6-character code from your friend</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-2">
                Party Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="ABC123"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-center text-2xl font-mono tracking-wider uppercase focus:outline-none focus:border-[#F0B429] transition-colors"
                maxLength={6}
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                {code.length}/6 characters
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Joining...
                </div>
              ) : (
                'Join Party'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              Make sure you have the correct code from your friend.
              The code is case-insensitive and expires after 10 minutes.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
