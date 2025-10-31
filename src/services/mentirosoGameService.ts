// ============================================================================
// MENTIROSO GAME SERVICE
// Service layer for El Mentiroso game logic
// ============================================================================

import { BaseGameService } from "./baseGameService";
import { Game, MentirosoPlayer, GameResponse, MentirosoGame } from "@/shared/types/mentiroso";
import { createGame, addPlayer, startGame, dealNewHand, playCards, challenge, continueAfterChallenge, getAvailableActions } from "@/game/mentiroso/logic/gameLogic";

export class MentirosoGameService extends BaseGameService {
    getGameType(): string {
        return "mentiroso";
    }

    /**
     * Creates a new Mentiroso game
     */
    override createGame(): Game {
        const game = createGame();
        this.games.set(game.id, game);
        return game;
    }

    /**
     * Adds a player to a game
     * @throws Error if game not found
     */
    addPlayerToGame(gameId: string, playerId: string, playerName: string, photo?: string): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = addPlayer(game, playerId, playerName, photo);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Starts a game by dealing the first hand
     * @throws Error if game not found
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
     * Deals a new hand (typically after one is completed)
     * @throws Error if game not found
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
     * Plays cards face down claiming a specific value
     * @param gameId - Game ID
     * @param playerId - Player making the move
     * @param cardIds - IDs of cards being played
     * @param claimedValue - The value the player claims the cards are
     * @throws Error if game not found
     */
    playCards(gameId: string, playerId: string, cardIds: string[], claimedValue: number): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = playCards(game, playerId, cardIds, claimedValue);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Challenges the last player who played cards
     * @param gameId - Game ID
     * @param challengerId - Player making the challenge
     * @throws Error if game not found
     */
    challenge(gameId: string, challengerId: string): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = challenge(game, challengerId);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Continues the game after a challenge has been resolved
     * @throws Error if game not found
     */
    continueAfterChallenge(gameId: string): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = continueAfterChallenge(game);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Gets available actions for a player
     * @returns Array of available actions, empty if game not found
     */
    getAvailableActions(gameId: string, playerId: string): any[] {
        const game = this.getGame(gameId);
        if (!game) {
            return [];
        }

        return getAvailableActions(game, playerId);
    }

    /**
     * Gets game response formatted for client
     * @returns Game response or null if game not found
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
            winner: game.winner,
        };
    }

    /**
     * Gets the current player whose turn it is
     * @returns Player object or null if no active hand
     */
    getCurrentPlayer(gameId: string): MentirosoPlayer | null {
        const game = this.getGame(gameId);
        if (!game?.currentHand) {
            return null;
        }

        const currentPlayerId = game.currentHand.mentirosoState.currentPlayerId;
        return game.players.find((p: MentirosoPlayer) => p.id === currentPlayerId) || null;
    }

    /**
     * Checks if it's a specific player's turn
     */
    isPlayerTurn(gameId: string, playerId: string): boolean {
        const game = this.getGame(gameId);
        if (!game?.currentHand) {
            return false;
        }

        return game.currentHand.mentirosoState.currentPlayerId === playerId;
    }

    /**
     * Gets complete game state with player status (online/offline)
     * @throws Error if game not found
     */
    getGameUpdate(gameId: string): MentirosoGame {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        // Add player status and available actions to each player
        const playersWithStatusAndActions = game.players.map((player: MentirosoPlayer) => ({
            ...player,
            status: this.getPlayerStatus(player.id),
            availableActions: getAvailableActions(game, player.id),
        }));

        // Create the MentirosoGame response with BaseGame structure
        const mentirosoGame: MentirosoGame = {
            id: game.id,
            players: playersWithStatusAndActions.map((p: any) => ({
                id: p.id,
                name: p.name,
                photo: p.photo,
                team: p.team,
                points: p.points,
                status: p.status,
            })),
            maxScore: 0, // Mentiroso doesn't use maxScore (first to run out of cards wins)
            maxPlayers: game.gameConfig.maxPlayers,
            metadata: {
                phase: game.phase,
                players: playersWithStatusAndActions,
                currentHand: game.currentHand,
                gameConfig: game.gameConfig,
                winner: game.winner,
                history: game.history,
            },
        };

        return mentirosoGame;
    }
}
