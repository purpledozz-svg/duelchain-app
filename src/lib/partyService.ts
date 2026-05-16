import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type GameType = 'chess' | 'connect-four' | 'tic-tac-toe' | 'tictactoe' | 'rps' | 'stop-it' | 'flappy-duel' | 'stop-at-10' | 'hot-potato';
export type RoomMode = 'party' | 'matchmaking';
export type RoomStatus = 'waiting' | 'active' | 'finished' | 'expired';

export type OnchainStatus = 'none' | 'waiting_p1' | 'waiting_p2' | 'funded' | 'settled' | 'refunded';

export interface PartyRoom {
  id: string;
  code: string;
  mode: RoomMode;
  game: GameType;
  status: RoomStatus;
  created_at: string;
  expires_at: string;
  p1_id: string;
  p2_id: string | null;
  p1_connected: boolean;
  p2_connected: boolean;
  game_state: any;
  turn: 'p1' | 'p2';
  result: {
    type: 'win' | 'draw' | 'resign';
    winner?: 'p1' | 'p2';
  } | null;
  rematch_status: 'none' | 'requested' | 'accepted' | 'declined';
  rematch_p1_accepted: boolean;
  rematch_p2_accepted: boolean;
  rematch_count: number;
  // Escrow / on-chain fields (null for classic mode)
  duel_id: string | null;
  duel_escrow_address: string | null; // adresse du DuelEscrow déployé par la factory
  p1_wallet: string | null;
  p2_wallet: string | null;
  currency: 'ETH' | 'USDC' | null;
  stake_usd: number | null;
  stake_token_amount: string | null;
  p1_deposit_tx: string | null;
  p2_deposit_tx: string | null;
  p1_deposited: boolean;
  p2_deposited: boolean;
  onchain_status: OnchainStatus;
  payout_tx: string | null;
  winner_wallet: string | null;
  fee_amount: string | null;
  winner_payout: string | null;
}

export interface MatchmakingEntry {
  id: string;
  player_id: string;
  game: GameType;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
}

export interface QueueCount {
  game_id: GameType;
  player_count: number;
}

export interface MatchResult {
  match_id: string;
  match_code: string;
  player1_id: string;
  player2_id: string;
}

class PartyService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private matchmakingChannel: RealtimeChannel | null = null;

  async createParty(game: GameType, playerId: string): Promise<{ code: string; party: PartyRoom }> {
    const maxRetries = 10;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data: codeData, error: codeError } = await supabase
          .rpc('generate_party_code');

        if (codeError) {
          console.error('Code generation error:', codeError);
          throw new Error('Failed to generate party code');
        }

        const code = codeData as string;
        const gameState = this.getInitialGameState(game);

        const { data, error } = await supabase
          .from('party_rooms')
          .insert({
            code,
            mode: 'party',
            game,
            p1_id: playerId,
            status: 'waiting',
            game_state: gameState,
            turn: 'p1',
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
            console.log(`Code collision on attempt ${attempt + 1}, retrying...`);
            lastError = new Error('Code collision');
            continue;
          }

          console.error('Insert error:', error);
          throw new Error(`Failed to create party: ${error.message}`);
        }

        if (!data) {
          throw new Error('No data returned from party creation');
        }

        console.log(`Party created successfully on attempt ${attempt + 1}`);
        return { code, party: data as PartyRoom };

      } catch (err) {
        if (err instanceof Error && err.message === 'Code collision') {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    console.error(`Failed after ${maxRetries} attempts`);
    throw new Error(`Unable to create party after ${maxRetries} attempts. Please try again.`);
  }

  async joinParty(code: string, playerId: string): Promise<PartyRoom> {
    const upperCode = code.toUpperCase();

    const { data: party, error: fetchError } = await supabase
      .from('party_rooms')
      .select('*')
      .eq('code', upperCode)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!party) throw new Error('Party code not found');
    if (party.status !== 'waiting') throw new Error('Party already started or expired');
    if (party.p2_id) throw new Error('Party already full');

    const { data, error } = await supabase
      .from('party_rooms')
      .update({
        p2_id: playerId,
        p2_connected: true,
      })
      .eq('code', upperCode)
      .select()
      .single();

    if (error) throw error;

    return data as PartyRoom;
  }

  async launchParty(code: string): Promise<void> {
    const { error } = await supabase
      .from('party_rooms')
      .update({ status: 'active' })
      .eq('code', code.toUpperCase());

    if (error) throw error;
  }

  async getParty(code: string): Promise<PartyRoom | null> {
    const { data, error } = await supabase
      .from('party_rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (error) throw error;
    return data as PartyRoom | null;
  }

  async updateGameState(
    code: string,
    gameState: any,
    turn: 'p1' | 'p2',
    result?: PartyRoom['result']
  ): Promise<void> {
    const updateData: any = {
      game_state: gameState,
      turn,
    };

    if (result) {
      updateData.result = result;
      updateData.status = 'finished';
    }

    const { error } = await supabase
      .from('party_rooms')
      .update(updateData)
      .eq('code', code);

    if (error) throw error;
  }

  async updateChessMove(
    code: string,
    move: {
      san: string;
      from: string;
      to: string;
      captured?: string;
      color: 'w' | 'b';
    },
    newFen: string,
    oldGameState: any,
    turn: 'p1' | 'p2',
    result?: PartyRoom['result']
  ): Promise<any> {
    const now = Date.now();
    const clock = oldGameState.clock || {
      wMs: 300000,
      bMs: 300000,
      active: 'w',
      lastTickMs: now,
      incrementMs: 2000
    };

    const elapsedMs = now - clock.lastTickMs;
    const activeColor = clock.active;

    let newWMs = clock.wMs;
    let newBMs = clock.bMs;

    if (activeColor === 'w') {
      newWMs = Math.max(0, clock.wMs - elapsedMs);
      newWMs += clock.incrementMs;
    } else {
      newBMs = Math.max(0, clock.bMs - elapsedMs);
      newBMs += clock.incrementMs;
    }

    if (newWMs <= 0 || newBMs <= 0) {
      const timeoutWinner = newWMs <= 0 ? 'p2' : 'p1';
      result = { type: 'win', winner: timeoutWinner };
    }

    const capturePoints = { ...oldGameState.capturePoints } || { w: 0, b: 0 };
    const captureLog = [...(oldGameState.captureLog || [])];

    if (move.captured) {
      const pieceValues: Record<string, number> = {
        p: 1, n: 3, b: 3, r: 5, q: 10, k: 0
      };
      const points = pieceValues[move.captured.toLowerCase()] || 0;

      if (points > 0) {
        capturePoints[move.color] += points;
        captureLog.push({
          by: move.color,
          piece: move.captured,
          points,
          san: move.san,
          ts: now
        });
      }
    }

    const newGameState = {
      fen: newFen,
      moves: [...(oldGameState.moves || []), { san: move.san, from: move.from, to: move.to }],
      capturePoints,
      captureLog,
      clock: {
        wMs: newWMs,
        bMs: newBMs,
        active: move.color === 'w' ? 'b' : 'w',
        lastTickMs: now,
        incrementMs: clock.incrementMs
      }
    };

    const updateData: any = {
      game_state: newGameState,
      turn,
    };

    if (result) {
      updateData.result = result;
      updateData.status = 'finished';
    }

    const { error } = await supabase
      .from('party_rooms')
      .update(updateData)
      .eq('code', code);

    if (error) throw error;

    return newGameState;
  }

  async resignGame(code: string, player: 'p1' | 'p2'): Promise<void> {
    const winner = player === 'p1' ? 'p2' : 'p1';

    await supabase
      .from('party_rooms')
      .update({
        result: {
          type: 'resign',
          winner,
        },
        status: 'finished',
      })
      .eq('code', code);
  }

  subscribeToParty(
    code: string,
    onUpdate: (party: PartyRoom) => void
  ): () => void {
    const channelKey = `party:${code}`;

    if (this.channels.has(channelKey)) {
      const existing = this.channels.get(channelKey)!;
      supabase.removeChannel(existing);
      this.channels.delete(channelKey);
    }

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_rooms',
          filter: `code=eq.${code}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as PartyRoom);
          }
        }
      )
      .subscribe();

    this.channels.set(channelKey, channel);

    return () => {
      this.unsubscribeFromParty(code);
    };
  }

  unsubscribeFromParty(code: string): void {
    const channelKey = `party:${code}`;
    const channel = this.channels.get(channelKey);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelKey);
    }
  }

  unsubscribe(): void {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  /**
   * Atomic matchmaking: upsert into queue, find opponent, create room — all in
   * one server-side transaction. Returns the match status.
   *
   * Replaces the old joinMatchmaking + tryMatchPlayers two-step flow which had
   * a fatal parameter name mismatch (game_type vs p_game_type) and a realtime
   * race condition that prevented matches from being detected.
   */
  async matchmakePlayer(
    playerId: string,
    game: GameType,
    opts?: { mode?: 'classic' | 'competitive'; stake?: number | null; currency?: string | null; walletAddress?: string | null; ethPriceUsd?: number }
  ): Promise<{ status: 'matched'; code: string; game: string; duel_id?: string } | { status: 'waiting' } | { status: 'error'; message: string }> {
    const mode = opts?.mode ?? 'classic';
    const stake = mode === 'classic' ? null : (opts?.stake ?? null);
    const currency = mode === 'classic' ? null : (opts?.currency ?? null);
    const walletAddress = mode === 'competitive' ? (opts?.walletAddress ?? null) : null;

    const { data, error } = await supabase.rpc('matchmake_player', {
      p_player_id:      playerId,
      p_game:           game,
      p_mode:           mode,
      p_stake:          stake,
      p_currency:       currency,
      p_wallet_address: walletAddress,
    });

    if (error) {
      console.error('[Matchmaking] matchmake_player RPC error:', error);
      return { status: 'error', message: error.message };
    }

    const result = data as { status: 'matched'; code: string; game: string } | { status: 'waiting' } | { status: 'error'; message: string };

    // Quand un match compétitif est trouvé, déployer le DuelEscrow via Edge Function.
    // Seul le premier joueur qui reçoit "matched" l'appelle — la fonction est idempotente.
    if (result.status === 'matched' && mode === 'competitive' && walletAddress) {
      this.createDuelEscrow((result as { status: 'matched'; code: string }).code, opts?.ethPriceUsd ?? 3000)
        .catch((err) => console.error('[Matchmaking] createDuelEscrow failed:', err));
    }

    return result;
  }

  /**
   * Appelle la Supabase Edge Function pour déployer un DuelEscrow sur Base Sepolia.
   * Idempotente — si l'escrow existe déjà, retourne l'adresse existante.
   */
  async createDuelEscrow(partyCode: string, ethPriceUsd: number): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-duel-escrow', {
      body: { party_code: partyCode, eth_price_usd: ethPriceUsd },
    });

    if (error) throw new Error(`Edge Function error: ${error.message}`);
    if (!data?.duel_escrow_address) throw new Error('No escrow address returned');

    console.log(`[Matchmaking] DuelEscrow deployed: ${data.duel_escrow_address}`);
    return data.duel_escrow_address as string;
  }

  async leaveMatchmaking(playerId: string): Promise<void> {
    const { error } = await supabase.rpc('leave_matchmaking_queue', {
      p_player_id: playerId,
    });
    if (error) {
      // Fallback to direct delete if RPC fails
      await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);
    }
    console.log('[Matchmaking] Player left queue:', playerId);
  }

  async getQueueCounts(): Promise<QueueCount[]> {
    const { data, error } = await supabase.rpc('get_queue_counts');

    if (error) {
      console.error('[Matchmaking] Failed to get queue counts:', error);
      return [];
    }

    return (data || []) as QueueCount[];
  }

  subscribeToMatchmaking(
    _playerId: string,
    _onMatched: (room: PartyRoom) => void
  ): () => void {
    // Realtime subscriptions on party_rooms with row-level filters are unreliable
    // for anon (device-ID) sessions. Matchmaking now uses pure polling via
    // matchmakePlayer() which is atomic and handles both "I matched someone"
    // and "I was matched by someone" in a single call.
    return () => {};
  }

  async requestRematch(code: string, playerId: string): Promise<void> {
    const { data: party, error: fetchError } = await supabase
      .from('party_rooms')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!party) throw new Error('Party not found');

    const isP1 = party.p1_id === playerId;
    const isP2 = party.p2_id === playerId;

    if (!isP1 && !isP2) throw new Error('You are not in this party');

    const updateData: any = {
      rematch_status: 'requested',
    };

    if (isP1) {
      updateData.rematch_p1_accepted = true;
    } else {
      updateData.rematch_p2_accepted = true;
    }

    const { error } = await supabase
      .from('party_rooms')
      .update(updateData)
      .eq('code', code);

    if (error) throw error;

    console.log(`[Rematch] Player ${isP1 ? 'p1' : 'p2'} requested rematch`);
  }

  async acceptRematch(code: string, playerId: string): Promise<void> {
    const { data: party, error: fetchError } = await supabase
      .from('party_rooms')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!party) throw new Error('Party not found');

    const isP1 = party.p1_id === playerId;
    const isP2 = party.p2_id === playerId;

    if (!isP1 && !isP2) throw new Error('You are not in this party');

    const updateData: any = {};

    if (isP1) {
      updateData.rematch_p1_accepted = true;
    } else {
      updateData.rematch_p2_accepted = true;
    }

    const bothAccepted = (isP1 && party.rematch_p2_accepted) || (isP2 && party.rematch_p1_accepted);

    if (bothAccepted) {
      const newRematchCount = (party.rematch_count || 0) + 1;
      const newGameState = this.getInitialGameState(party.game);

      let newTurn: 'p1' | 'p2' = 'p1';
      if (party.game === 'chess') {
        newTurn = 'p1';
      } else {
        newTurn = newRematchCount % 2 === 0 ? 'p1' : 'p2';
      }

      updateData.rematch_status = 'accepted';
      updateData.rematch_count = newRematchCount;
      updateData.game_state = newGameState;
      updateData.turn = newTurn;
      updateData.result = null;
      updateData.status = 'active';
      updateData.rematch_p1_accepted = false;
      updateData.rematch_p2_accepted = false;

      console.log(`[Rematch] Starting rematch #${newRematchCount}`, {
        game: party.game,
        turn: newTurn,
      });
    } else {
      updateData.rematch_status = 'requested';
      console.log(`[Rematch] Player ${isP1 ? 'p1' : 'p2'} accepted, waiting for other player`);
    }

    const { error } = await supabase
      .from('party_rooms')
      .update(updateData)
      .eq('code', code);

    if (error) throw error;
  }

  async declineRematch(code: string): Promise<void> {
    const { error } = await supabase
      .from('party_rooms')
      .update({
        rematch_status: 'declined',
        rematch_p1_accepted: false,
        rematch_p2_accepted: false,
      })
      .eq('code', code);

    if (error) throw error;

    console.log(`[Rematch] Declined`);
  }

  private getInitialGameState(game: GameType): any {
    switch (game) {
      case 'chess':
        return {
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: [],
          capturePoints: { w: 0, b: 0 },
          captureLog: [],
          clock: {
            wMs: 300000,
            bMs: 300000,
            active: 'w',
            lastTickMs: Date.now(),
            incrementMs: 2000
          }
        };
      case 'connect-four':
        return {
          grid: Array(6).fill(null).map(() => Array(7).fill(null)),
          moves: [],
        };
      case 'tic-tac-toe':
      case 'tictactoe':
        return {
          board: Array(9).fill(null),
          moves: [],
        };
      case 'rps':
        return {
          p1_choice: null,
          p2_choice: null,
          round: 1,
          scores: { p1: 0, p2: 0 },
        };
      case 'stop-it':
        return {
          start_time: null,
          p1_time: null,
          p2_time: null,
          target_time: 5000,
        };
      case 'flappy-duel':
        return {
          status: 'countdown',
          startTimeMs: null,
          maxDurationMs: 60000,
          p1_alive: true,
          p2_alive: true,
          p1_deathMs: null,
          p2_deathMs: null,
          p1_score: 0,
          p2_score: 0,
          winner: null,
        };
      case 'stop-at-10':
        return {
          status: 'waiting',
          targetMs: 10000,
          roundStartMs: null,
          preCountdownMs: 4000,
          p1_stopMs: null,
          p2_stopMs: null,
          p1_elapsed: null,
          p2_elapsed: null,
          round: 1,
          scores: { p1: 0, p2: 0 },
          winner: null,
        };
      case 'hot-potato':
        return {
          status: 'waiting',
          players: [],
          aliveIds: [],
          holderId: null,
          roundStartMs: null,
          explosionAtMs: null,
          eliminationLog: [],
          winner: null,
        };
      default:
        return {};
    }
  }
}

export const partyService = new PartyService();
