import {
  Game,
  Team,
  GameResponse,
  EnvidoCall,
  TrucoCall,
  EnvidoResponse,
  TrucoResponse,
  addPlayer,
  startGame,
  dealNewHand,
  dealNewRound,
  playCard,
  callEnvido,
  respondEnvido,
  callTruco,
  respondTruco,
  goToMazo,
  getAvailableActions
} from '@/game/truco';
import { GameType } from '@/shared/constants';
import { BaseGameService } from './baseGameService';
import { TrucoAIService } from '@/game/truco/ai/aiService';

/**
 * Truco Game Service
 * Handles all Truco-specific game operations
 */
export class TrucoGameService extends BaseGameService {
  private aiService: TrucoAIService | null = null;

  getGameType(): string {
    return GameType.TRUCO;
  }

  /**
   * Set AI service instance (injected from handler)
   */
  setAIService(aiService: TrucoAIService): void {
    this.aiService = aiService;
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
   * Add an AI player to a game
   * This is a convenience method that creates an AI player and adds it to the game
   * The AI always plays at hard difficulty level
   */
  addAIPlayerToGame(gameId: string, team?: Team): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (!this.aiService) {
      throw new Error("AI Service not initialized. Call setAIService first.");
    }

    // Create AI player using the AI service (always hard difficulty)
    const aiPlayer = this.aiService.createAIPlayer(game);

    // Override team if specified
    const finalTeam = team !== undefined ? team : aiPlayer.team;

    // Add AI player to game
    const updatedGame = addPlayer(game, aiPlayer.id, aiPlayer.name, finalTeam);
    this.updateGame(updatedGame);

    console.log(`🤖 Added AI player ${aiPlayer.name} (${aiPlayer.id}) to game ${gameId} on team ${finalTeam}`);
    return updatedGame;
  }

  /**
   * Add multiple AI players to a game for team play
   * @param gameId - Game ID
   * @param totalPlayers - Total number of players (2 or 4)
   * @returns Updated game object
   */
  addAIPlayersForTeamPlay(gameId: string, totalPlayers: number): Game {
    let game = this.getGame(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (totalPlayers !== 2 && totalPlayers !== 4) {
      throw new Error("Truco AI mode supports only 2 or 4 players");
    }

    // For 2 players: human (Team 1) vs AI (Team 2)
    if (totalPlayers === 2) {
      game = this.addAIPlayerToGame(gameId, Team.TEAM_2);
    } 
    // For 4 players: 
    // Position 0: Human (Team 1)
    // Position 1: AI (Team 2)
    // Position 2: AI (Team 1) - Partner of human
    // Position 3: AI (Team 2)
    else if (totalPlayers === 4) {
      // Add first AI opponent (Team 2)
      game = this.addAIPlayerToGame(gameId, Team.TEAM_2);
      
      // Add AI partner (Team 1)
      game = this.addAIPlayerToGame(gameId, Team.TEAM_1);
      
      // Add second AI opponent (Team 2)
      game = this.addAIPlayerToGame(gameId, Team.TEAM_2);
    }

    console.log(`🤖 Added ${totalPlayers - 1} AI players for ${totalPlayers}-player game`);
    return game;
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

    const playersWithActions = game.players.map((player: any) => ({
      ...player,
      availableActions: getAvailableActions(game, player.id)
    }));

    return {
      id: game.id,
      phase: game.phase,
      players: playersWithActions,
      currentHand: game.currentHand,
      teamScores: game.teamScores,
      winner: game.winner,
      maxScore: game.gameConfig.maxScore,
      maxPlayers: game.gameConfig.maxPlayers
    };
  }

}
