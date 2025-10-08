import { 
  Game, 
  Team, 
  EnvidoCall, 
  TrucoCall, 
  EnvidoResponse, 
  TrucoResponse,
  GameResponse
} from '../types';
import { 
  createGame, 
  addPlayer, 
  startGame, 
  dealNewHand, 
  dealNewRound, 
  playCard, 
  callEnvido, 
  respondEnvido, 
  callTruco, 
  respondTruco, 
  goToMazo 
} from '../game/gameLogic';
import { getAvailableActions } from '../game/actions';
// generateId is not used in this file

/**
 * Game Service
 * Handles all game-related operations
 */
export class GameService {
  private games: Map<string, Game> = new Map();

  /**
   * Create a new game
   * @param maxScore - Maximum score for the game (15 or 30)
   * @returns New game object
   */
  createGame(maxScore: number = 15): Game {
    const game = createGame(maxScore);
    this.games.set(game.id, game);
    return game;
  }

  /**
   * Get a game by ID
   * @param gameId - Game ID
   * @returns Game object or undefined
   */
  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  /**
   * Update a game
   * @param game - Updated game object
   */
  updateGame(game: Game): void {
    this.games.set(game.id, game);
  }

  /**
   * Add a player to a game
   * @param gameId - Game ID
   * @param playerId - Player ID
   * @param playerName - Player name
   * @param team - Team number
   * @returns Updated game object
   */
  addPlayerToGame(gameId: string, playerId: string, playerName: string, team: Team = Team.TEAM_1): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = addPlayer(game, playerId, playerName, team);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Start a game
   * @param gameId - Game ID
   * @returns Updated game object
   */
  startGame(gameId: string): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = startGame(game);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Deal a new hand
   * @param gameId - Game ID
   * @returns Updated game object
   */
  dealNewHand(gameId: string): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = dealNewHand(game);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Deal a new round
   * @param gameId - Game ID
   * @returns Updated game object
   */
  dealNewRound(gameId: string): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = dealNewRound(game);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Play a card
   * @param gameId - Game ID
   * @param playerId - Player ID
   * @param cardId - Card ID
   * @returns Updated game object
   */
  playCard(gameId: string, playerId: string, cardId: string): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = playCard(game, playerId, cardId);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Call Envido
   * @param gameId - Game ID
   * @param playerId - Player ID
   * @param call - Envido call type
   * @returns Updated game object
   */
  callEnvido(gameId: string, playerId: string, call: EnvidoCall): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = callEnvido(game, playerId, call);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Respond to Envido
   * @param gameId - Game ID
   * @param playerId - Player ID
   * @param response - Response
   * @returns Updated game object
   */
  respondEnvido(gameId: string, playerId: string, response: EnvidoResponse): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = respondEnvido(game, playerId, response);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Call Truco
   * @param gameId - Game ID
   * @param playerId - Player ID
   * @param call - Truco call type
   * @returns Updated game object
   */
  callTruco(gameId: string, playerId: string, call: TrucoCall): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = callTruco(game, playerId, call);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Respond to Truco
   * @param gameId - Game ID
   * @param playerId - Player ID
   * @param response - Response
   * @returns Updated game object
   */
  respondTruco(gameId: string, playerId: string, response: TrucoResponse): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = respondTruco(game, playerId, response);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Go to mazo
   * @param gameId - Game ID
   * @param playerId - Player ID
   * @returns Updated game object
   */
  goToMazo(gameId: string, playerId: string): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedGame = goToMazo(game, playerId);
    this.updateGame(updatedGame);
    return updatedGame;
  }

  /**
   * Get game with available actions for all players
   * @param gameId - Game ID
   * @returns Game response with actions
   */
  getGameWithActions(gameId: string): GameResponse {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const playersWithActions = game.players.map(player => ({
      ...player,
      availableActions: getAvailableActions(game, player.id)
    }));

    return {
      id: game.id,
      phase: game.phase,
      players: playersWithActions,
      currentHand: game.currentHand,
      teamScores: game.teamScores,
      winner: game.winner
    };
  }

  /**
   * Get all games
   * @returns Array of all games
   */
  getAllGames(): Game[] {
    return Array.from(this.games.values());
  }

  /**
   * Delete a game
   * @param gameId - Game ID
   */
  deleteGame(gameId: string): void {
    this.games.delete(gameId);
  }
}
