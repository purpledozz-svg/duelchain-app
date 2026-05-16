const PLAYER_ID_KEY = 'duelchain_player_id';

export function getPlayerId(): string {
  let playerId = localStorage.getItem(PLAYER_ID_KEY);

  if (!playerId) {
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
    playerId = `player-${uuid}`;
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }

  return playerId;
}

export function clearPlayerId(): void {
  localStorage.removeItem(PLAYER_ID_KEY);
}
