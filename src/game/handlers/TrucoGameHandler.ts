import { WebSocketMessage } from "@/shared/types";
import { WEBSOCKET_MESSAGE_TYPES, GAME_DELAY_NEW_HAND, GameType } from "@/shared/constants";
import { AbstractGameHandler } from "./BaseGameHandler";
import { TrucoGameService } from "@/services/trucoGameService";
import { RoomService } from "@/services/roomService";
import { TrucoAIService } from "@/game/truco/ai/aiService";

/**
 * Truco Game Handler
 * Handles all Truco-specific WebSocket events
 */
export class TrucoGameHandler extends AbstractGameHandler {
    private aiService: TrucoAIService;
    private aiTurnLocks: Map<string, boolean> = new Map(); // Lock per room to prevent concurrent AI executions

    constructor(
        private trucoGameService: TrucoGameService,
        private roomService: RoomService,
        private wsService: any // WebSocketService instance
    ) {
        super();
        this.aiService = new TrucoAIService();
        // Inject AI service into the game service for convenience methods
        this.trucoGameService.setAIService(this.aiService);
    }

    getGameType(): string {
        return GameType.TRUCO;
    }

    getSupportedMessageTypes(): string[] {
        return [
            WEBSOCKET_MESSAGE_TYPES.START_GAME,
            WEBSOCKET_MESSAGE_TYPES.DEAL_NEW_HAND,
            WEBSOCKET_MESSAGE_TYPES.PLAY_CARD,
            WEBSOCKET_MESSAGE_TYPES.CALL_ENVIDO,
            WEBSOCKET_MESSAGE_TYPES.RESPOND_ENVIDO,
            WEBSOCKET_MESSAGE_TYPES.CALL_TRUCO,
            WEBSOCKET_MESSAGE_TYPES.RESPOND_TRUCO,
            WEBSOCKET_MESSAGE_TYPES.GO_TO_MAZO,
            WEBSOCKET_MESSAGE_TYPES.SEND_TEAM_MESSAGE,
        ];
    }

    handleMessage(ws: any, message: WebSocketMessage, roomId?: string, playerId?: string): void {
        const { type, data } = message;

        if (!roomId || !playerId) {
            this.sendError(ws, "Room ID and Player ID are required for game actions");
            return;
        }

        try {
            switch (type) {
                case WEBSOCKET_MESSAGE_TYPES.START_GAME:
                    this.handleStartGame(playerId, roomId);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.DEAL_NEW_HAND:
                    this.handleDealNewHand(playerId, roomId);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.PLAY_CARD:
                    this.handlePlayCard(playerId, roomId, data);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.CALL_ENVIDO:
                    this.handleCallEnvido(playerId, roomId, data);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.RESPOND_ENVIDO:
                    this.handleRespondEnvido(playerId, roomId, data);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.CALL_TRUCO:
                    this.handleCallTruco(playerId, roomId, data);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.RESPOND_TRUCO:
                    this.handleRespondTruco(playerId, roomId, data);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.GO_TO_MAZO:
                    this.handleGoToMazo(playerId, roomId);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.SEND_TEAM_MESSAGE:
                    this.handleSendTeamMessage(playerId, roomId, data);
                    break;

                default:
                    this.sendError(ws, `Unsupported message type: ${type}`);
            }
        } catch (error) {
            console.error(`Error handling Truco message ${type}:`, error);
            this.sendError(ws, "Internal server error");
        }
    }

    // ============================================================================
    // TRUCO-SPECIFIC HANDLERS
    // ============================================================================

    private handleStartGame(_playerId: string, roomId: string): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const startedGame = this.trucoGameService.startGame(room.game.id);
            this.roomService.updateRoomGame(roomId, startedGame);
            this.roomService.setRoomActive(roomId, true);

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.GAME_STARTED,
                data: {
                    room: this.roomToResponse(room),
                    game: this.trucoGameService.getGameUpdate(startedGame.id),
                },
            });

            // Check if AI should play first
            this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
        } catch (error) {
            console.error("Error starting Truco game:", error);
        }
    }

    private handleDealNewHand(_playerId: string, roomId: string): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const newHandGame = this.trucoGameService.dealNewHand(room.game.id);
            this.roomService.updateRoomGame(roomId, newHandGame);

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.NEW_HAND_DEALT,
                data: { game: this.trucoGameService.getGameUpdate(newHandGame.id) },
            });
        } catch (error) {
            console.error("Error dealing new hand:", error);
        }
    }

    private handlePlayCard(playerId: string, roomId: string, data?: any): void {
        if (!data?.cardId) {
            this.sendError(this.getPlayerConnection(playerId), "Card ID is required");
            return;
        }

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.trucoGameService.playCard(room.game.id, playerId, data.cardId);
            this.roomService.updateRoomGame(roomId, updatedGame);

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.CARD_PLAYED,
                data: {
                    playerId,
                    cardId: data.cardId,
                    game: this.trucoGameService.getGameUpdate(updatedGame.id),
                },
            });

            // Handle automatic round/hand progression
            this.handleGameProgression(roomId, updatedGame);

            // Check if AI should play next
            this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
        } catch (error) {
            console.error("Error playing card:", error);
        }
    }

    private handleCallEnvido(playerId: string, roomId: string, data?: any): void {
        if (!data?.call) {
            this.sendError(this.getPlayerConnection(playerId), "Envido call is required");
            return;
        }

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.trucoGameService.callEnvido(room.game.id, playerId, data.call);
            this.roomService.updateRoomGame(roomId, updatedGame);

            // Send speech bubble for envido call
            const player = updatedGame.players.find((p) => p.id === playerId);
            if (player) {
                const callLabels = {
                    envido: "Envido",
                    "real-envido": "Real Envido",
                    "falta-envido": "Falta Envido",
                };
                this.sendSpeechBubble(roomId, playerId, callLabels[data.call as keyof typeof callLabels] || data.call, player.name, 5);
            }

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.ENVIDO_CALLED,
                data: {
                    playerId,
                    call: data.call,
                    game: this.trucoGameService.getGameUpdate(updatedGame.id),
                },
            });

            // Check if AI should respond to envido
            this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
        } catch (error) {
            console.error("Error calling envido:", error);
        }
    }

    private handleRespondEnvido(playerId: string, roomId: string, data?: any): void {
        if (!data?.response) {
            this.sendError(this.getPlayerConnection(playerId), "Envido response is required");
            return;
        }

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.trucoGameService.respondEnvido(room.game.id, playerId, data.response);
            this.roomService.updateRoomGame(roomId, updatedGame);

            // Send speech bubble for envido response (if not quiero)
            if (data.response !== "quiero") {
                const player = updatedGame.players.find((p) => p.id === playerId);
                if (player) {
                    const responseLabels = {
                        "no-quiero": "No quiero",
                        envido: "Envido",
                        "real-envido": "Real Envido",
                        "falta-envido": "Falta Envido",
                    };
                    this.sendSpeechBubble(roomId, playerId, responseLabels[data.response as keyof typeof responseLabels] || data.response, player.name, 5);
                }
            }

            // Check if envido was resolved (quiero response)
            const envidoState = updatedGame.currentHand?.envidoState;
            const isResolved = data.response === "quiero" && envidoState?.callerMessage && envidoState?.responderMessage;

            if (isResolved) {
                const responder = updatedGame.players.find((p) => p.id === playerId);

                // Send "Quiero" first
                if (responder) {
                    this.sendSpeechBubble(roomId, playerId, "Quiero", responder.name, 5);
                }

                // Send announcements for all players in order (mano first)
                this.sendEnvidoAnnouncementsBubbles(roomId, envidoState, updatedGame);
            }

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.ENVIDO_RESPONDED,
                data: {
                    playerId,
                    response: data.response,
                    game: this.trucoGameService.getGameUpdate(updatedGame.id),
                },
            });

            // Check if AI should play next
            this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
        } catch (error) {
            console.error("Error responding to envido:", error);
        }
    }

    private handleCallTruco(playerId: string, roomId: string, data?: any): void {
        if (!data?.call) {
            this.sendError(this.getPlayerConnection(playerId), "Truco call is required");
            return;
        }

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.trucoGameService.callTruco(room.game.id, playerId, data.call);
            this.roomService.updateRoomGame(roomId, updatedGame);

            // Send speech bubble for truco call
            const player = updatedGame.players.find((p) => p.id === playerId);
            if (player) {
                const callLabels = {
                    truco: "Truco",
                    retruco: "Re Truco",
                    "vale-cuatro": "Vale Cuatro",
                };
                this.sendSpeechBubble(roomId, playerId, callLabels[data.call as keyof typeof callLabels] || data.call, player.name, 5);
            }

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.TRUCO_CALLED,
                data: {
                    playerId,
                    call: data.call,
                    game: this.trucoGameService.getGameUpdate(updatedGame.id),
                },
            });

            // Check if AI should respond to truco
            this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
        } catch (error) {
            console.error("Error calling truco:", error);
        }
    }

    private handleRespondTruco(playerId: string, roomId: string, data?: any): void {
        if (!data?.response) {
            this.sendError(this.getPlayerConnection(playerId), "Truco response is required");
            return;
        }

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.trucoGameService.respondTruco(room.game.id, playerId, data.response);
            this.roomService.updateRoomGame(roomId, updatedGame);

            // Send speech bubble for truco response
            const player = updatedGame.players.find((p) => p.id === playerId);
            if (player) {
                const responseLabels = {
                    quiero: "Quiero",
                    "no-quiero": "No quiero",
                    "quiero-retruco": "Quiero Re Truco",
                    "quiero-vale-cuatro": "Quiero Vale Cuatro",
                };
                this.sendSpeechBubble(roomId, playerId, responseLabels[data.response as keyof typeof responseLabels] || data.response, player.name, 5);
            }

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.TRUCO_RESPONDED,
                data: {
                    playerId,
                    response: data.response,
                    game: this.trucoGameService.getGameUpdate(updatedGame.id),
                },
            });

            // Handle automatic hand progression if hand ended
            this.handleGameProgression(roomId, updatedGame);

            // Check if AI should play next
            this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
        } catch (error) {
            console.error("Error responding to truco:", error);
        }
    }

    private handleGoToMazo(playerId: string, roomId: string): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.trucoGameService.goToMazo(room.game.id, playerId);
            this.roomService.updateRoomGame(roomId, updatedGame);

            // Send speech bubble for going to mazo
            const player = updatedGame.players.find((p) => p.id === playerId);
            if (player) {
                this.sendSpeechBubble(roomId, playerId, "Ir al mazo", player.name, 5);
            }

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.WENT_TO_MAZO,
                data: {
                    playerId,
                    game: this.trucoGameService.getGameUpdate(updatedGame.id),
                },
            });

            // Handle automatic hand progression
            this.handleGameProgression(roomId, updatedGame);
        } catch (error) {
            console.error("Error going to mazo:", error);
        }
    }

    private handleSendTeamMessage(playerId: string, roomId: string, data?: any): void {
        if (!data?.messageId) {
            this.sendError(this.getPlayerConnection(playerId), "Message ID is required");
            return;
        }

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const game = room.game;
            const player = game.players.find((p: any) => p.id === playerId);

            if (!player) {
                console.error("Player not found");
                return;
            }

            // Find the message definition
            const { TEAM_MESSAGES } = require("@/game/truco/constants");
            const teamMessage = TEAM_MESSAGES.find((msg: any) => msg.id === data.messageId);

            if (!teamMessage) {
                console.error("Team message not found");
                return;
            }

            // Get teammate IDs (same team as player)
            const teammateIds = game.players.filter((p: any) => p.team === player.team).map((p: any) => p.id);

            // Broadcast to teammates only
            this.wsService.broadcastToPlayerIds(roomId, teammateIds, {
                type: WEBSOCKET_MESSAGE_TYPES.SPEECH_BUBBLE,
                data: {
                    playerId: playerId,
                    playerName: player.name,
                    messageId: teamMessage.id,
                    message: `${teamMessage.icon} ${teamMessage.message}`,
                    icon: teamMessage.icon,
                },
            });
        } catch (error) {
            console.error("Error sending team message:", error);
        }
    }

    // ============================================================================
    // GAME PROGRESSION
    // ============================================================================

    private handleGameProgression(roomId: string, game: any): void {
        // Check if hand is complete and needs to deal new hand
        if (game.phase === "handEnd") {
            // Send HAND_END message immediately with winner information
            const winnerPlayer = game.players.find((p: any) => p.team === game.currentHand?.winner);
            if (winnerPlayer) {
                this.wsService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.HAND_END,
                    data: {
                        winner: {
                            name: winnerPlayer.name,
                            team: winnerPlayer.team,
                            points: game.currentHand?.points || 0,
                        },
                        game: this.trucoGameService.getGameUpdate(game.id),
                    },
                });
            }

            // Deal new hand after delay
            setTimeout(() => {
                try {
                    const room = this.roomService.getRoom(roomId);
                    if (!room) return;

                    const newHandGame = this.trucoGameService.dealNewHand(room.game.id);
                    this.roomService.updateRoomGame(roomId, newHandGame);

                    this.wsService.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.NEW_HAND_DEALT,
                        data: { game: this.trucoGameService.getGameUpdate(newHandGame.id) },
                    });

                    // Check if AI should start the new hand
                    this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
                } catch (error) {
                    console.error("Error dealing new hand automatically:", error);
                }
            }, GAME_DELAY_NEW_HAND); // 5 seconds delay
        }
    }

    private getPlayerConnection(_playerId: string): any {
        // This would need to be injected or accessed through a service
        // For now, we'll return null and handle errors differently
        return null;
    }

    private roomToResponse(room: any): any {
        return {
            id: room.id,
            name: room.name,
            maxPlayers: room.maxPlayers,
            players: room.game.players,
            isActive: room.isActive,
            createdAt: room.createdAt,
            isPrivate: room.isPrivate,
            maxScore: room.maxScore,
            gameType: room.gameType,
        };
    }

    // ============================================================================
    // TRUCO-SPECIFIC UTILITY METHODS
    // ============================================================================

    /**
     * Send speech bubble specific to Truco game
     */
    private sendSpeechBubble(roomId: string, playerId: string, message: string, playerName: string, priority: number = 0): void {
        this.wsService.broadcastToRoom(roomId, {
            type: WEBSOCKET_MESSAGE_TYPES.SPEECH_BUBBLE,
            data: {
                playerId,
                message,
                playerName,
                priority,
            },
        });
    }

    /**
     * Send envido announcement speech bubbles for all players in order
     */
    private sendEnvidoAnnouncementsBubbles(roomId: string, envidoState: any, updatedGame: any): void {
        if (!envidoState.announcementOrder || !envidoState.pointsAnnounced) {
            // Fallback to legacy 2-player mode
            return;
        }

        const announcementOrder = envidoState.announcementOrder;
        const pointsAnnounced = envidoState.pointsAnnounced;

        let currentHighest = 0;
        let delay = 1000; // Start 1 second after "Quiero"

        announcementOrder.forEach((playerId: string, index: number) => {
            const player = updatedGame.players.find((p: any) => p.id === playerId);
            if (!player) return;

            const points = pointsAnnounced.get(playerId) || 0;
            let message: string;

            if (points > currentHighest) {
                // This player has higher points, announces them
                message = index === 0 ? `¡Tengo ${points}!` : `¡${points} son mejores!`;
                currentHighest = points;
            } else {
                // This player doesn't beat current highest
                message = "Son buenas";
            }

            setTimeout(() => {
                this.sendSpeechBubble(roomId, playerId, message, player.name, 10);
            }, delay);

            delay += 1000; // 1 second between each announcement
        });
    }

    /**
     * Send speech bubble for AI actions
     */
    private sendAISpeechBubble(roomId: string, aiPlayer: any, aiDecision: any): void {
        let message = "";

        switch (aiDecision.type) {
            case "envido":
                const envidoLabels: Record<string, string> = {
                    envido: "Envido",
                    "real-envido": "Real Envido",
                    "falta-envido": "Falta Envido",
                };
                message = envidoLabels[aiDecision.envidoCall] || aiDecision.envidoCall;
                break;

            case "truco":
                const trucoLabels: Record<string, string> = {
                    truco: "Truco",
                    retruco: "Re Truco",
                    "vale-cuatro": "Vale Cuatro",
                };
                message = trucoLabels[aiDecision.trucoCall] || aiDecision.trucoCall;
                break;

            case "respond":
                const responseLabels: Record<string, string> = {
                    quiero: "Quiero",
                    "no-quiero": "No quiero",
                };
                message = responseLabels[aiDecision.response] || aiDecision.response;
                break;

            case "mazo":
                message = "Me voy al mazo";
                break;

            case "play":
                // Don't send speech bubble for playing cards
                return;

            default:
                return;
        }

        if (message) {
            this.sendSpeechBubble(roomId, aiPlayer.id, message, aiPlayer.name, 5);
        }
    }

    // ============================================================================
    // AI INTEGRATION
    // ============================================================================

    /**
     * Get AI service instance (for external use, e.g., creating AI players)
     */
    getAIService(): TrucoAIService {
        return this.aiService;
    }

    /**
     * Check if a player is AI
     */
    private isAIPlayer(playerId: string): boolean {
        return playerId.startsWith("ia_");
    }

    /**
     * Process AI turn if the current player is AI
     * This is called after every successful human action
     */
    async processAITurnIfNeeded(roomId: string): Promise<void> {
        // Check if AI is already processing for this room
        if (this.aiTurnLocks.get(roomId)) {
            console.log(`🔒 AI turn already in progress for room ${roomId}, skipping...`);
            return;
        }

        const room = this.roomService.getRoom(roomId);
        if (!room || !room.game.currentHand) {
            console.log(`❌ processAITurnIfNeeded: No room or game hand`);
            return;
        }

        const currentPlayerId = room.game.currentHand.currentPlayerId;
        const gamePhase = room.game.phase;

        console.log(`🔍 processAITurnIfNeeded: currentPlayerId=${currentPlayerId}, isAI=${this.isAIPlayer(currentPlayerId)}, phase=${gamePhase}`);

        // Don't process if game ended
        if (gamePhase === "handEnd") {
            console.log(`⏭️ Skipping AI turn (hand ended)`);
            return;
        }

        // Determine which AI player needs to act
        let aiPlayer: any = null;

        if (gamePhase === "envido" && room.game.currentHand.envidoState) {
            // For envido, find the AI that is the nextResponder
            const nextResponder = room.game.currentHand.envidoState.nextResponder;
            if (nextResponder && this.isAIPlayer(nextResponder)) {
                aiPlayer = room.game.players.find((p: any) => p.id === nextResponder);
                console.log(`🤖 Envido phase: nextResponder is ${nextResponder}, isAI: ${!!aiPlayer}`);
            }
        } else if (gamePhase === "truco" && room.game.currentHand.trucoState) {
            // For truco, find the AI that is the nextResponder
            const nextResponder = room.game.currentHand.trucoState.nextResponder;
            if (nextResponder && this.isAIPlayer(nextResponder)) {
                aiPlayer = room.game.players.find((p: any) => p.id === nextResponder);
                console.log(`🤖 Truco phase: nextResponder is ${nextResponder}, isAI: ${!!aiPlayer}`);
            }
        } else if (gamePhase === "playing") {
            // For playing phase, check if current player is AI
            const currentPlayer = room.game.players.find((p: any) => p.id === currentPlayerId);
            if (currentPlayer && this.isAIPlayer(currentPlayer.id)) {
                aiPlayer = currentPlayer;
            }
        }

        if (!aiPlayer) {
            console.log(`⏭️ Not AI's turn or AI doesn't need to respond`);
            return;
        }

        console.log(`🤖 AI ${aiPlayer.name} (${aiPlayer.id}) needs to act in phase ${gamePhase}`);

        // Acquire lock
        this.aiTurnLocks.set(roomId, true);
        console.log(`🔒 Acquired AI lock for room ${roomId}`);

        console.log(`🤖 AI turn detected for player ${aiPlayer.id}`);

        try {
            // Get fresh game state before executing AI action
            const freshGame = this.trucoGameService.getGame(room.game.id);
            if (!freshGame) {
                console.log(`❌ Could not get fresh game state`);
                return;
            }

            console.log(`🎮 Executing AI action for ${aiPlayer.id}...`);

            // Get AI decision first (before executing) to send speech bubble
            const ai = this.aiService.getAI(aiPlayer.id);
            const aiDecision = ai?.makeDecision(freshGame);

            if (!aiDecision) {
                console.log(`❌ AI could not make a decision`);
                return;
            }

            // Execute AI action with the precomputed decision
            let updatedGame = await this.aiService.executeAIAction(freshGame, aiPlayer.id, aiDecision);

            console.log(`✅ AI action completed, updating game state...`);

            // Update the game state
            room.game = updatedGame;
            this.trucoGameService.updateGame(updatedGame);

            // Send speech bubble for AI action BEFORE game update
            if (aiDecision) {
                this.sendAISpeechBubble(roomId, aiPlayer, aiDecision);
            }

            // Check if envido was resolved (AI responded "quiero") and send points speech bubbles
            if (aiDecision?.type === "respond" && aiDecision?.response === "quiero" && freshGame.phase === "envido") {
                const envidoState = updatedGame.currentHand?.envidoState;
                if (envidoState?.callerMessage && envidoState?.responderMessage) {
                    // Send announcements for all players in order (mano first)
                    this.sendEnvidoAnnouncementsBubbles(roomId, envidoState, updatedGame);
                }
            }

            // Broadcast the updated game state
            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.GAME_UPDATE,
                data: {
                    game: this.trucoGameService.getGameUpdate(room.game.id),
                },
            });

            // Send appropriate speech bubble based on game phase
            if (updatedGame.phase === "handEnd") {
                console.log(`🏁 Hand ended after AI action`);
                // Handle game progression
                setTimeout(() => {
                    this.handleGameProgression(roomId, updatedGame);
                }, 500);
            } else {
                // Check if another AI needs to play
                console.log(`🔄 Checking if next player is AI...`);
                setTimeout(() => {
                    this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error checking next AI turn:", err));
                }, 1000);
            }
        } catch (error) {
            console.error(`❌ Error processing AI turn:`, error);
        } finally {
            // Release lock
            this.aiTurnLocks.delete(roomId);
            console.log(`🔓 Released AI lock for room ${roomId}`);
        }
    }
}
