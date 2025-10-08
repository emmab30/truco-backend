import { Game, Team, GameResponse } from "../game/chinchon/types";
import { GameType } from "../constants";
import { addPlayer, startGame, dealNewHand, drawCard, discardCard, closeRound, calculatePlayerScore } from "../game/chinchon/gameLogic";
import { BaseGameService } from "./baseGameService";

/**
 * Chinchón Game Service
 * Handles all Chinchón-specific game operations
 */
export class ChinchonGameService extends BaseGameService {
    getGameType(): string {
        return GameType.CHINCHON;
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
            throw new Error('Game not found');
        }

        const playersWithActions = game.players.map((player: any) => ({
            ...player,
            availableActions: this.getAvailableActions(gameId, player.id)
        }));

        return {
            id: game.id,
            phase: game.phase,
            players: playersWithActions,
            currentHand: game.currentHand,
            teamScores: game.teamScores,
            winner: game.winner,
        };
    }
}
