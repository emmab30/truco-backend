import { createGameByType } from "@/game/gameFactory";

/**
 * Base Game Service
 * Handles common game operations that are shared across all game types
 */
export abstract class BaseGameService {
    protected games: Map<string, any> = new Map();
    protected websocketService?: any; // Reference to WebSocketService for player status

    /**
     * Create a new game
     * @param maxScore - Maximum score for the game
     * @param gameType - Type of game ('truco', 'chinchon', etc.)
     * @returns New game object
     */
    createGame(maxScore: number = 15, gameType: string = 'truco'): any {
        const game = createGameByType(gameType as any, maxScore);
        this.games.set(game.id, game);
        return game;
    }

    /**
     * Get a game by ID
     * @param gameId - Game ID
     * @returns Game object or undefined
     */
    getGame(gameId: string): any | undefined {
        return this.games.get(gameId);
    }

    /**
     * Update a game
     * @param game - Updated game object
     */
    updateGame(game: any): void {
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
    getAllGames(): any[] {
        return Array.from(this.games.values());
    }

    /**
     * Set the WebSocket service reference for player status
     */
    setWebSocketService(websocketService: any): void {
        this.websocketService = websocketService;
    }

    /**
     * Get player status from WebSocket service
     */
    protected getPlayerStatus(playerId: string): "online" | "idle" | "offline" {
        if (!this.websocketService) {
            return "offline";
        }
        return this.websocketService.getPlayerStatus(playerId);
    }

    /**
     * Get game update with player status included
     */
    getGameUpdateWithStatus(gameId: string): any {
        const game = this.getGame(gameId);
        if (!game) {
            return null;
        }

        // Add status to each player
        if (game.players) {
            game.players = game.players.map((player: any) => ({
                ...player,
                status: this.getPlayerStatus(player.id)
            }));
        }

        return game;
    }

    /**
     * Get the game type this service handles
     */
    abstract getGameType(): string;
}
