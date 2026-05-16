import { supabase } from './supabase';
import { Player, Friendship } from '../types';

// ── Validation ────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-zA-Z0-9]{3,16}$/;

export function validateUsername(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return 'Username is required.';
  const s = raw.trim();
  if (s.length < 3) return 'Username must be at least 3 characters.';
  if (s.length > 16) return 'Username must be 16 characters or less.';
  if (!USERNAME_RE.test(s)) return 'Username must use 3\u201316 letters and numbers only.';
  return null;
}

export function validatePassword(pw: string): string | null {
  if (!pw || pw.length === 0) return 'Password is required.';
  if (pw.length < 4) return 'Password must be at least 4 characters.';
  if (pw.length > 32) return 'Password must be 32 characters or less.';
  return null;
}

// ── Password hashing (SHA-256 via Web Crypto) ─────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Service ───────────────────────────────────────────────────────────────────

export const profileService = {
  async createProfile(
    username: string,
    playerId: string,
    password: string,
    walletAddress?: string | null
  ): Promise<{ player: Player | null; error: string | null }> {
    const usernameErr = validateUsername(username);
    if (usernameErr) return { player: null, error: usernameErr };

    const passwordErr = validatePassword(password);
    if (passwordErr) return { player: null, error: passwordErr };

    const trimmed = username.trim();
    const lower = trimmed.toLowerCase();
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase.rpc('create_player_profile', {
      p_username: trimmed,
      p_username_lower: lower,
      p_player_id: playerId,
      p_password_hash: passwordHash,
      p_wallet_address: walletAddress ?? '',
      p_bio: '',
    });

    if (error) {
      console.error('[profileService] create_player_profile error:', error.code, error.message);
      if (error.message?.includes('USERNAME_TAKEN') || error.code === '23505') {
        return { player: null, error: 'This username is already taken.' };
      }
      return { player: null, error: `Failed to create profile: ${error.message}` };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { player: null, error: 'Profile creation returned no data.' };

    return { player: row as Player, error: null };
  },

  async signIn(
    username: string,
    password: string
  ): Promise<{ player: Player | null; error: string | null }> {
    const { data, error } = await supabase.rpc('get_player_by_username', {
      p_username: username.trim(),
    });

    if (error || !data || data.length === 0) return { player: null, error: 'Invalid username or password.' };

    const player = data[0] as Player & { password_hash?: string };

    if (player.password_hash) {
      const inputHash = await hashPassword(password);
      if (inputHash !== player.password_hash) {
        return { player: null, error: 'Invalid username or password.' };
      }
    }

    return { player: player as Player, error: null };
  },

  async changePassword(
    playerId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ error: string | null }> {
    // Need password_hash — still accessible via INSERT/UPDATE grants on players;
    // use get_my_profile RPC which returns full row including password_hash
    const { data, error } = await supabase.rpc('get_my_profile');

    if (error || !data || data.length === 0) return { error: 'Could not verify current password.' };

    // Find the right row by id
    const row = (data as Array<Player & { password_hash?: string }>).find((r) => r.id === playerId);
    if (!row) return { error: 'Could not verify current password.' };

    if (row.password_hash) {
      const currentHash = await hashPassword(currentPassword);
      if (currentHash !== row.password_hash) {
        return { error: 'Current password is incorrect.' };
      }
    }

    const newErr = validatePassword(newPassword);
    if (newErr) return { error: newErr };

    const newHash = await hashPassword(newPassword);
    const { error: updateErr } = await supabase
      .from('players')
      .update({ password_hash: newHash })
      .eq('id', playerId);

    if (updateErr) return { error: 'Failed to update password.' };
    return { error: null };
  },

  async getProfileByPlayerId(playerId: string): Promise<Player | null> {
    const { data } = await supabase.rpc('get_player_by_player_id', {
      p_device_id: playerId,
    });
    return data && data.length > 0 ? (data[0] as Player) : null;
  },

  async getProfileByUsername(username: string): Promise<Player | null> {
    const { data } = await supabase.rpc('get_player_by_username', {
      p_username: username,
    });
    return data && data.length > 0 ? (data[0] as Player) : null;
  },

  async searchPlayers(query: string, limit = 10): Promise<Player[]> {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!q) return [];

    const { data } = await supabase.rpc('search_players', {
      p_query: q,
      p_limit: limit,
    });

    return (data ?? []) as Player[];
  },

  // ── Friends ───────────────────────────────────────────────────────────────

  async sendFriendRequest(
    requesterId: string,
    receiverId: string
  ): Promise<{ error: string | null }> {
    console.debug('[friends] sendFriendRequest', { requesterId, receiverId });
    const { data, error } = await supabase.rpc('send_friend_request', {
      p_requester_id: requesterId,
      p_receiver_id: receiverId,
    });

    if (error) {
      console.error('[friends] send_friend_request error:', error.code, error.message, error.details);
      return { error: `Failed to send friend request: ${error.message}` };
    }

    console.debug('[friends] send_friend_request result:', data);
    if (data === 'self') return { error: 'You cannot add yourself.' };
    if (data === 'already_friends') return { error: 'Already friends.' };
    if (data === 'duplicate') return { error: 'Friend request already sent.' };
    return { error: null };
  },

  async acceptFriendRequest(friendshipId: string, acceptorId: string): Promise<{ error: string | null }> {
    console.debug('[friends] acceptFriendRequest', { friendshipId, acceptorId });
    const { data, error } = await supabase.rpc('accept_friend_request', {
      p_friendship_id: friendshipId,
      p_acceptor_id: acceptorId,
    });

    if (error) {
      console.error('[friends] accept_friend_request error:', error.code, error.message, error.details);
      return { error: `Failed to accept request: ${error.message}` };
    }

    console.debug('[friends] accept_friend_request result:', data);
    if (data === 'not_found') return { error: 'Friend request not found.' };
    if (data === 'unauthorized') return { error: 'You are not the receiver of this request.' };
    return { error: null };
  },

  async removeFriend(playerAId: string, playerBId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_friend', {
      p_player_a_id: playerAId,
      p_player_b_id: playerBId,
    });
    if (error) console.error('[friends] remove_friend error:', error.code, error.message);
  },

  async rejectFriendRequest(requesterId: string, receiverId: string): Promise<{ error: string | null }> {
    console.debug('[friends] rejectFriendRequest', { requesterId, receiverId });
    const { error } = await supabase.rpc('remove_friend', {
      p_player_a_id: requesterId,
      p_player_b_id: receiverId,
    });
    if (error) {
      console.error('[friends] rejectFriendRequest error:', error.code, error.message);
      return { error: `Failed to reject request: ${error.message}` };
    }
    return { error: null };
  },

  async getFriendships(playerId: string): Promise<Friendship[]> {
    const { data, error } = await supabase.rpc('get_my_friendships', {
      p_player_id: playerId,
    });
    if (error) console.error('[friends] get_my_friendships error:', error.code, error.message);
    return (data ?? []) as Friendship[];
  },

  async getPendingRequests(playerId: string): Promise<Friendship[]> {
    console.debug('[friends] getPendingRequests for player:', playerId);
    const { data, error } = await supabase.rpc('get_pending_requests', {
      p_player_id: playerId,
    });
    if (error) console.error('[friends] get_pending_requests error:', error.code, error.message);
    console.debug('[friends] pending requests result:', data);
    return (data ?? []) as Friendship[];
  },

  async getFriendshipStatus(
    myId: string,
    theirId: string
  ): Promise<{ friendship: Friendship | null; iAmRequester: boolean }> {
    const { data, error } = await supabase.rpc('get_friendship_status', {
      p_my_id: myId,
      p_their_id: theirId,
    });
    if (error) console.error('[friends] get_friendship_status error:', error.code, error.message);

    if (!data || data.length === 0) return { friendship: null, iAmRequester: false };
    const f = data[0] as Friendship;
    return { friendship: f, iAmRequester: f.requester_id === myId };
  },

  async getFriendsWithProfiles(playerId: string): Promise<Player[]> {
    const friendships = await this.getFriendships(playerId);
    if (friendships.length === 0) return [];

    // requester_id / receiver_id are stored as text (UUID strings) — pass as text[]
    const friendIds: string[] = friendships.map((f) =>
      f.requester_id === playerId ? f.receiver_id : f.requester_id
    );

    const { data, error } = await supabase.rpc('get_friend_profiles', {
      p_ids: friendIds,
    });
    if (error) console.error('[friends] get_friend_profiles error:', error.code, error.message);

    return (data ?? []) as Player[];
  },

  async getIncomingRequestsWithProfiles(
    playerId: string
  ): Promise<Array<Friendship & { senderProfile: Player | null }>> {
    const pending = await this.getPendingRequests(playerId);
    if (pending.length === 0) return [];

    const senderIds: string[] = pending.map((r) => r.requester_id);
    const { data: profiles, error } = await supabase.rpc('get_friend_profiles', {
      p_ids: senderIds,
    });
    if (error) console.error('[friends] get_friend_profiles (incoming) error:', error.code, error.message);

    const profileMap = new Map<string, Player>(
      ((profiles ?? []) as Player[]).map((p: Player) => [p.id as unknown as string, p])
    );

    return pending.map((r) => ({
      ...r,
      senderProfile: profileMap.get(r.requester_id) ?? null,
    }));
  },

  async deleteProfile(playerId: string): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc('delete_my_profile', {
      p_player_id: playerId,
    });

    if (error) {
      console.error('[profileService] delete_my_profile error:', error.message);
      return { error: 'Failed to delete profile.' };
    }

    return { error: null };
  },
};
