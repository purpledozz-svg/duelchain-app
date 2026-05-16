export interface GameConfig {
  id: string;
  name: string;
  enabled: boolean;
  multiplayer: boolean;
  competitive: boolean;
  classic: boolean;
  comingSoon: boolean;
  routeSlug: string;
}

export const GAME_CONFIGS: GameConfig[] = [
  {
    id: 'chess',
    name: 'Chess',
    enabled: true,
    multiplayer: true,
    competitive: true,
    classic: true,
    comingSoon: false,
    routeSlug: 'chess',
  },
  {
    id: 'connect-four',
    name: 'Connect 4',
    enabled: true,
    multiplayer: true,
    competitive: true,
    classic: true,
    comingSoon: false,
    routeSlug: 'connect-four',
  },
  {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    enabled: true,
    multiplayer: true,
    competitive: true,
    classic: true,
    comingSoon: false,
    routeSlug: 'tictactoe',
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    enabled: false,
    multiplayer: false,
    competitive: false,
    classic: false,
    comingSoon: true,
    routeSlug: 'rps',
  },
  {
    id: 'reaction',
    name: 'Reaction',
    enabled: false,
    multiplayer: false,
    competitive: false,
    classic: false,
    comingSoon: true,
    routeSlug: 'reaction',
  },
];

/** Games that can be selected in Classic matchmaking */
export const CLASSIC_GAMES = GAME_CONFIGS.filter((g) => g.enabled && g.classic);

/** Games eligible for Competitive random draw */
export const COMPETITIVE_GAMES = GAME_CONFIGS.filter((g) => g.enabled && g.competitive);

/** IDs of competitive games, used in SQL and frontend validation */
export const COMPETITIVE_GAME_IDS = COMPETITIVE_GAMES.map((g) => g.id);

/** All enabled multiplayer game IDs — anything not in this list is blocked */
export const ENABLED_MULTIPLAYER_IDS = GAME_CONFIGS.filter((g) => g.enabled && g.multiplayer).map((g) => g.id);

export function getGameConfig(id: string): GameConfig | undefined {
  return GAME_CONFIGS.find((g) => g.id === id);
}

export function isGameEnabled(id: string): boolean {
  return GAME_CONFIGS.some((g) => g.id === id && g.enabled);
}

export function isGameComingSoon(id: string): boolean {
  return GAME_CONFIGS.some((g) => g.id === id && g.comingSoon);
}
