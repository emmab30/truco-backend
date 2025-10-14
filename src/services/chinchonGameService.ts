import { Game, Team, GameResponse, addPlayer, startGame, dealNewHand, drawCard, discardCard, closeRound, cutWithCard, calculatePlayerScore } from "@/game/chinchon";
import { GameType } from "@/shared/constants";
import { BaseGameService } from "./baseGameService";
import { ChinchonAIService, AIDifficulty } from "@/game/chinchon/ai/aiService";

/**
 * Chinchón Game Service
 * Handles all Chinchón-specific game operations
 */
export class ChinchonGameService extends BaseGameService {
    private aiService: ChinchonAIService | null = null;

    getGameType(): string {
        return GameType.CHINCHON;
    }

    /**
     * Set AI service instance (injected from handler)
     */
    setAIService(aiService: ChinchonAIService): void {
        this.aiService = aiService;
    }

    /**
     * Add a player to a game
     */
    addPlayerToGame(gameId: string, playerId: string, playerName: string, team: Team): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = addPlayer(game, playerId, playerName, team);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Add an AI player to a game
     * This is a convenience method that creates an AI player and adds it to the game
     */
    addAIPlayerToGame(gameId: string, difficulty: AIDifficulty = "medium"): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        if (!this.aiService) {
            throw new Error("AI Service not initialized. Call setAIService first.");
        }

        // Create AI player using the AI service
        const aiPlayer = this.aiService.createAIPlayer(game, difficulty);

        // Add AI player to game
        const updatedGame = addPlayer(game, aiPlayer.id, aiPlayer.name, aiPlayer.team);
        updatedGame.iaMode = true;
        this.updateGame(updatedGame);

        console.log(`🤖 Added AI player ${aiPlayer.name} (${aiPlayer.id}) to game ${gameId}`);
        return updatedGame;
    }

    /**
     * Add multiple AI players for a multi-player Chinchón game
     * For Chinchón: maxPlayers can be 2-6, we add (maxPlayers - 1) AI players
     * since the human player is already in the game
     */
    addAIPlayersForMultiplayer(gameId: string, maxPlayers: number = 2, difficulty: AIDifficulty = "medium"): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        console.log(`🔍 AI Service status:`, this.aiService ? 'initialized' : 'NOT INITIALIZED');
        
        if (!this.aiService) {
            throw new Error("AI Service not initialized. Call setAIService first.");
        }

        // Calculate how many AI players we need (total - 1 human player)
        const numAIPlayers = Math.max(1, Math.min(5, maxPlayers - 1)); // Ensure at least 1, max 5 AI players

        console.log(`🤖 Adding ${numAIPlayers} AI player(s) for ${maxPlayers}-player Chinchón game with difficulty: ${difficulty}`);

        let updatedGame = game;
        for (let i = 0; i < numAIPlayers; i++) {
            // Create AI player using the AI service
            const aiPlayer = this.aiService.createAIPlayer(updatedGame, difficulty);
            console.log(`🤖 Created AI player ${i + 1}/${numAIPlayers}: ${aiPlayer.name} (${aiPlayer.id})`);

            // Add AI player to game
            updatedGame = addPlayer(updatedGame, aiPlayer.id, aiPlayer.name, Team.TEAM_1);
            console.log(`✅ Added AI player ${i + 1}/${numAIPlayers} to game: ${aiPlayer.name} (${aiPlayer.id})`);
        }

        updatedGame.iaMode = true;
        this.updateGame(updatedGame);

        console.log(`🤖 Successfully added ${numAIPlayers} AI players to game ${gameId}`);
        console.log(`📊 Current aiService has ${(this.aiService as any).aiPlayers?.size || 0} registered AI players`);
        return updatedGame;
    }

    /**
     * Start a game
     */
    startGame(gameId: string): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = startGame(game);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Deal a new hand
     */
    dealNewHand(gameId: string): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = dealNewHand(game);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Draw a card from deck or discard pile
     */
    drawCard(gameId: string, playerId: string, fromDiscardPile: boolean): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = drawCard(game, playerId, fromDiscardPile);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Discard a card
     */
    discardCard(gameId: string, playerId: string, cardId: string): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = discardCard(game, playerId, cardId);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Close the current round
     */
    closeRound(gameId: string, playerId: string): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = closeRound(game, playerId);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Cut with a specific card (when player has 2+ combinations)
     */
    cutWithCard(gameId: string, playerId: string, cardId: string): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = cutWithCard(game, playerId, cardId);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Show combinations for a player
     */
    showCombinations(gameId: string, playerId: string, combinations: any[]): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        if (!game.currentHand || !game.currentHand.chinchonState) {
            return game;
        }

        // Update combinations for the player
        const updatedChinchonState = {
            ...game.currentHand.chinchonState,
            combinations: new Map(game.currentHand.chinchonState.combinations.set(playerId, combinations)),
        };

        const updatedGame = {
            ...game,
            currentHand: {
                ...game.currentHand,
                chinchonState: updatedChinchonState,
            },
        };

        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Get available actions for a player
     */
    getAvailableActions(gameId: string, playerId: string): any[] {
        const game = this.getGame(gameId);
        if (!game) {
            return [];
        }

        const player = game.players.find((p: any) => p.id === playerId);
        if (!player) {
            return [];
        }

        return player.availableActions || [];
    }

    /**
     * Get game response for client
     */
    getGameResponse(gameId: string): GameResponse | null {
        const game = this.getGame(gameId);
        if (!game) {
            return null;
        }

        return {
            id: game.id,
            phase: game.phase,
            players: game.players,
            currentHand: game.currentHand,
            teamScores: game.teamScores,
            winner: game.winner,
        };
    }

    /**
     * Get player combinations
     */
    getPlayerCombinations(gameId: string, playerId: string): any[] {
        const game = this.getGame(gameId);
        if (!game || !game.currentHand || !game.currentHand.chinchonState) {
            return [];
        }

        return game.currentHand.chinchonState.combinations.get(playerId) || [];
    }

    /**
     * Calculate player score
     */
    getPlayerScore(gameId: string, playerId: string): number {
        const game = this.getGame(gameId);
        if (!game) {
            return 0;
        }

        const player = game.players.find((p: any) => p.id === playerId);
        if (!player) {
            return 0;
        }

        const combinations = this.getPlayerCombinations(gameId, playerId);
        return calculatePlayerScore(player, combinations);
    }

    /**
     * Check if player can close round
     */
    canCloseRound(gameId: string, playerId: string): boolean {
        const game = this.getGame(gameId);
        if (!game || !game.currentHand || !game.currentHand.chinchonState) {
            return false;
        }

        const player = game.players.find((p: any) => p.id === playerId);
        if (!player) {
            return false;
        }

        const combinations = game.currentHand.chinchonState.combinations.get(playerId) || [];
        const combinedCardIds = new Set(combinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));
        const uncombinedCards = player.cards.filter((card: any) => !combinedCardIds.has(card.id));

        return uncombinedCards.length <= 1;
    }

    /**
     * Get current player
     */
    getCurrentPlayer(gameId: string): any {
        const game = this.getGame(gameId);
        if (!game || !game.currentHand || !game.currentHand.chinchonState) {
            return null;
        }

        return game.players.find((p: any) => p.id === game.currentHand!.chinchonState.currentPlayerId);
    }

    /**
     * Check if it's player's turn
     */
    isPlayerTurn(gameId: string, playerId: string): boolean {
        const game = this.getGame(gameId);
        if (!game || !game.currentHand || !game.currentHand.chinchonState) {
            return false;
        }

        return game.currentHand.chinchonState.currentPlayerId === playerId;
    }

    /**
     * Get game with actions for all players
     */
    getGameWithActions(gameId: string): any {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const playersWithActions = game.players.map((player: any) => {
            const combinations = game.currentHand?.chinchonState?.combinations?.get(player.id) || [];
            const mappedPlayer = {
                ...player,
                points: player.totalScore || 0, // Normalize points field for frontend compatibility
                availableActions: this.getAvailableActions(gameId, player.id),
                combinations: combinations,
            };
            console.log(`📊 Mapping player ${player.name}: totalScore=${player.totalScore} → points=${mappedPlayer.points}`);
            return mappedPlayer;
        });

        // Serialize the chinchonState for WebSocket transmission
        const serializedChinchonState = game.currentHand?.chinchonState
            ? {
                  ...game.currentHand.chinchonState,
                  combinations: game.currentHand.chinchonState.combinations ? Object.fromEntries(game.currentHand.chinchonState.combinations) : {},
                  roundScores: game.currentHand.chinchonState.roundScores ? Object.fromEntries(game.currentHand.chinchonState.roundScores) : {},
                  playersReadyForNextRound: game.currentHand.chinchonState.playersReadyForNextRound ? Array.from(game.currentHand.chinchonState.playersReadyForNextRound) : [],
              }
            : undefined;

        return {
            id: game.id,
            phase: game.phase,
            players: playersWithActions,
            currentPlayerId: game.currentHand?.chinchonState?.currentPlayerId, // Add for easy frontend access
            currentHand: {
                ...game.currentHand,
                chinchonState: serializedChinchonState,
                currentPlayerId: game.currentHand?.chinchonState?.currentPlayerId, // Also add at hand level
            },
            teamScores: game.teamScores,
            winner: game.winner,
        };
    }
}
