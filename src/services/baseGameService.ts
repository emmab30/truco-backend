import { Game } from "../game/truco/types";
import { createGameByType } from "../game/gameFactory";

/**
 * Base Game Service
 * Handles common game operations that are shared across all game types
 */
export abstract class BaseGameService {
    protected games: Map<string, Game> = new Map();

    /**
     * Create a new game
     * @param maxScore - Maximum score for the game
     * @param gameType - Type of game ('truco', 'chinchon', etc.)
     * @returns New game object
     */
    createGame(maxScore: number = 15, gameType: string = 'truco'): Game {
        const game = createGameByType(gameType as any, maxScore);
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
     * Delete a game
     * @param gameId - Game ID
     */
    deleteGame(gameId: string): void {
        this.games.delete(gameId);
    }

    /**
     * Get all games
     * @returns Array of all games
     */
    getAllGames(): Game[] {
        return Array.from(this.games.values());
    }

    /**
     * Get the game type this service handles
     */
    abstract getGameType(): string;
}
