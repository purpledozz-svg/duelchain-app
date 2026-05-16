export type Choice = 'rock' | 'paper' | 'scissors';
export type RoundResult = 'win' | 'lose' | 'draw';

export const BEATS: Record<Choice, Choice> = {
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock',
};

export function resolveRound(player: Choice, opponent: Choice): RoundResult {
  if (player === opponent) return 'draw';
  return BEATS[player] === opponent ? 'win' : 'lose';
}

export function getRandomChoice(): Choice {
  const choices: Choice[] = ['rock', 'paper', 'scissors'];
  return choices[Math.floor(Math.random() * 3)];
}

export interface RoundRecord {
  playerChoice: Choice;
  opponentChoice: Choice;
  result: RoundResult;
}

export interface GameState {
  rounds: RoundRecord[];
  playerWins: number;
  opponentWins: number;
  currentRound: number;
  status: 'playing' | 'finished';
  finalResult: 'player' | 'opponent' | 'draw' | null;
}

export const MAX_ROUNDS = 5;
export const WIN_THRESHOLD = 3;

export function createGameState(): GameState {
  return {
    rounds: [],
    playerWins: 0,
    opponentWins: 0,
    currentRound: 1,
    status: 'playing',
    finalResult: null,
  };
}

export function playRound(state: GameState, playerChoice: Choice): { state: GameState; roundResult: RoundResult } {
  if (state.status !== 'playing') return { state, roundResult: 'draw' };

  const opponentChoice = getRandomChoice();
  const result = resolveRound(playerChoice, opponentChoice);

  const newPlayerWins = state.playerWins + (result === 'win' ? 1 : 0);
  const newOpponentWins = state.opponentWins + (result === 'lose' ? 1 : 0);
  const newRound = state.currentRound + 1;

  const isFinished =
    newPlayerWins >= WIN_THRESHOLD ||
    newOpponentWins >= WIN_THRESHOLD ||
    newRound > MAX_ROUNDS;

  const finalResult: GameState['finalResult'] = isFinished
    ? newPlayerWins > newOpponentWins
      ? 'player'
      : newOpponentWins > newPlayerWins
        ? 'opponent'
        : 'draw'
    : null;

  const newState: GameState = {
    rounds: [...state.rounds, { playerChoice, opponentChoice, result }],
    playerWins: newPlayerWins,
    opponentWins: newOpponentWins,
    currentRound: newRound,
    status: isFinished ? 'finished' : 'playing',
    finalResult,
  };

  return { state: newState, roundResult: result };
}
