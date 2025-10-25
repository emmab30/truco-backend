import { addPlayer, startGame, dealNewHand, dealNewRound, playCard, callEnvido, respondEnvido, callTruco, respondTruco, goToMazo, getAvailableActions } from "@/game/truco";
import { Game, Team, TrucoGame, EnvidoCall, TrucoCall, EnvidoResponse, TrucoResponse, GamePhase } from "@/shared/types/truco";
import { GameType } from "@/shared/constants";
import { BaseGameService } from "./baseGameService";
import { TrucoAIService } from "@/game/truco/ai/aiService";
import prisma from "@/config/prisma";

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
     * @param photo - Player photo URL (optional)
     * @returns Updated game object
     */
    addPlayerToGame(gameId: string, playerId: string, playerName: string, team: Team = Team.TEAM_1, photo?: string): Game {
        const game = this.getGame(gameId);
        if (!game) {
            throw new Error("Game not found");
        }

        const updatedGame = addPlayer(game, playerId, playerName, team, photo);
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
            throw new Error("Game not found");
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
            throw new Error("Game not found");
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
            throw new Error("Game not found");
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
            throw new Error("Game not found");
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
            throw new Error("Game not found");
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
            throw new Error("Game not found");
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
            throw new Error("Game not found");
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
            throw new Error("Game not found");
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
            throw new Error("Game not found");
        }

        const updatedGame = goToMazo(game, playerId);
        this.updateGame(updatedGame);
        return updatedGame;
    }

    /**
     * Get game update in BaseGame format for client
     * @param gameId - Game ID
     * @returns BaseGame with TrucoMetadata
     */
    getGameUpdate(gameId: string): TrucoGame {
        const game = this.getGame(gameId) as Game;
        if (!game) {
            throw new Error("Game not found");
        }

        const playersWithActions = game.players.map((player: any) => ({
            ...player,
            availableActions: getAvailableActions(game, player.id),
            status: this.getPlayerStatus(player.id), // Add player status
        }));

        // Change phase in case the game is ended
        if (this.isEndedGame(game)) game.phase = GamePhase.GAME_END;

        // Transform to BaseGame format
        return {
            id: game.id,
            players: game.players.map((p: any) => ({
                id: p.id,
                name: p.name,
                photo: p.photo,
                team: p.team,
                points: p.points,
                status: this.getPlayerStatus(p.id),
            })),
            maxScore: game.gameConfig.maxScore,
            maxPlayers: game.gameConfig.maxPlayers,
            metadata: {
                phase: game.phase,
                players: playersWithActions,
                currentHand: game.currentHand,
                gameConfig: game.gameConfig,
                teamScores: game.teamScores,
                winner: game.winner,
                history: game.history,
            },
        };
    }

    isEndedGame(game: Game): boolean {
        if (game?.phase === GamePhase.GAME_END) return true;

        const maxScore = game.gameConfig.maxScore;

        // In team games, the score is the sum of the scores of the two teams
        const isTeamGame = game.players.length === 4;

        let team1Score: number;
        let team2Score: number;

        if (isTeamGame) {
            // In team games, the score is the sum of the scores of the two teams
            team1Score = game.players.find((p) => p.team === Team.TEAM_1)?.points ?? 0;
            team2Score = game.players.find((p) => p.team === Team.TEAM_2)?.points ?? 0;
        } else {
            // In 2-player games, the score is the sum of the scores of the two players
            team1Score = game.players.filter((p) => p.team === Team.TEAM_1).reduce((sum, p) => sum + p.points, 0);
            team2Score = game.players.filter((p) => p.team === Team.TEAM_2).reduce((sum, p) => sum + p.points, 0);
        }

        if (team1Score >= maxScore || team2Score >= maxScore) {
            const winningTeam = team1Score >= maxScore ? Team.TEAM_1 : Team.TEAM_2;

            const winnerUserIds = game.players.filter((p) => p.team === winningTeam).map((p) => p.id);
            const loserUserIds = game.players.filter((p) => p.team !== winningTeam).map((p) => p.id);

            console.log(`🏆 Game Over! Winners (Team ${winningTeam + 1}):`, winnerUserIds, "Losers:", loserUserIds);

            prisma.playedGame
                .createMany({
                    data: winnerUserIds
                        .filter((uid) => !uid?.includes("ia_"))
                        .map((uid) => ({
                            userId: uid,
                            type: GameType.TRUCO,
                            status: "win",
                        }))
                        .concat(
                            loserUserIds
                                .filter((uid) => !uid?.includes("ia_"))
                                .map((uid) => ({
                                    userId: uid,
                                    type: GameType.TRUCO,
                                    status: "lost",
                                }))
                        ),
                })
                .then(() => {
                    console.log(`🏆 Created played games for winners and losers`);
                })
                .catch((error: any) => {
                    console.error(`🚨 Error creating played games for winners and losers: ${error}`);
                });

            return true;
        }

        return false;
    }
}
