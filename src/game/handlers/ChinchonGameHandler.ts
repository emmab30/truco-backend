import { WebSocketMessage } from "@/shared/types";
import { WEBSOCKET_MESSAGE_TYPES, GameType } from "@/shared/constants";
import { AbstractGameHandler } from "./BaseGameHandler";
import { ChinchonGameService } from "@/services/chinchonGameService";
import { RoomService } from "@/services/roomService";
import { ChinchonAIService } from "@/game/chinchon/ai/aiService";

/**
 * Chinchón Game Handler
 * Handles all Chinchón-specific WebSocket events
 */
export class ChinchonGameHandler extends AbstractGameHandler {
    private aiService: ChinchonAIService;
    private aiTurnLocks: Map<string, boolean> = new Map(); // Lock per room to prevent concurrent AI executions

    constructor(
        private chinchonGameService: ChinchonGameService,
        private roomService: RoomService,
        private wsService: any // WebSocketService instance
    ) {
        super();
        this.aiService = new ChinchonAIService();
        // Inject AI service into the game service for convenience methods
        this.chinchonGameService.setAIService(this.aiService);
    }

    getGameType(): string {
        return GameType.CHINCHON;
    }

    getSupportedMessageTypes(): string[] {
        return [
            WEBSOCKET_MESSAGE_TYPES.START_GAME,
            WEBSOCKET_MESSAGE_TYPES.DRAW_CARD,
            WEBSOCKET_MESSAGE_TYPES.DISCARD_CARD,
            WEBSOCKET_MESSAGE_TYPES.CLOSE_ROUND,
            WEBSOCKET_MESSAGE_TYPES.CUT_WITH_CARD,
            WEBSOCKET_MESSAGE_TYPES.SHOW_COMBINATIONS,
            WEBSOCKET_MESSAGE_TYPES.START_NEXT_ROUND,
        ];
    }

    handleMessage(ws: any, message: WebSocketMessage, roomId: string, playerId: string): void {
        const { type, data } = message;

        console.log(`🎮 Chinchón handler processing: ${type} for player ${playerId} in room ${roomId}`);

        try {
            switch (type) {
                case WEBSOCKET_MESSAGE_TYPES.START_GAME:
                    this.handleStartGame(ws, roomId, playerId);
                    break;
                case WEBSOCKET_MESSAGE_TYPES.DRAW_CARD:
                    this.handleDrawCard(ws, roomId, playerId, data);
                    break;
                case WEBSOCKET_MESSAGE_TYPES.DISCARD_CARD:
                    this.handleDiscardCard(ws, roomId, playerId, data);
                    break;
                case WEBSOCKET_MESSAGE_TYPES.CLOSE_ROUND:
                    this.handleCloseRound(ws, roomId, playerId);
                    break;
                case WEBSOCKET_MESSAGE_TYPES.CUT_WITH_CARD:
                    this.handleCutWithCard(ws, roomId, playerId, data);
                    break;
                case WEBSOCKET_MESSAGE_TYPES.START_NEXT_ROUND:
                    this.handleStartNextRound(ws, roomId, playerId, data);
                    break;
                case WEBSOCKET_MESSAGE_TYPES.SHOW_COMBINATIONS:
                    this.handleShowCombinations(ws, roomId, playerId, data);
                    break;
                default:
                    console.log(`❓ Unhandled Chinchón message type: ${type}`);
            }
        } catch (error) {
            console.error(`❌ Error in Chinchón handler for ${type}:`, error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            this.wsService.sendError(ws, `Error processing ${type}: ${errorMessage}`);
        }
    }

    /**
     * Handle start game
     */
    private handleStartGame(ws: any, roomId: string, playerId: string): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            this.chinchonGameService.startGame(room.game.id);
            const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.GAME_STARTED,
                data: { room, game: gameResponse },
            });

            this.sendSpeechBubble(roomId, playerId, "¡El juego ha comenzado!", "Sistema", 1);

            // Check if AI should play first
            this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
        } catch (error) {
            console.error("Error starting Chinchón game:", error);
            this.wsService.sendError(ws, "Failed to start game");
        }
    }

    /**
     * Handle draw card
     */
    private handleDrawCard(ws: any, roomId: string, playerId: string, data: any): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            const { fromDiscardPile } = data;
            const result = this.chinchonGameService.drawCard(room.game.id, playerId, fromDiscardPile);

            // Only send success message if the action was actually successful
            if (result) {
                const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

                this.wsService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.CARD_DRAWN,
                    data: {
                        playerId,
                        fromDiscardPile,
                        game: gameResponse,
                    },
                });

                const source = fromDiscardPile ? "del descarte" : "del mazo";
                // Send speech bubble to OTHER players only, not to the player who drew the card
                this.sendSpeechBubbleToOthers(roomId, playerId, `Robó una carta ${source}`, "Sistema", 0);

                // Note: After drawing, it's still the same player's turn (they need to discard)
                // So we don't call processAITurnIfNeeded here
            } else {
                // Send error message if the action failed
                this.wsService.sendError(ws, "No se puede robar carta en este momento");
            }
        } catch (error) {
            console.error("Error drawing card:", error);
            this.wsService.sendError(ws, "Failed to draw card");
        }
    }

    /**
     * Handle discard card
     */
    private handleDiscardCard(ws: any, roomId: string, playerId: string, data: any): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            const { cardId } = data;
            const result = this.chinchonGameService.discardCard(room.game.id, playerId, cardId);

            // Only send success message if the action was actually successful
            if (result) {
                // Update the room's game state with the result
                room.game = result;
                const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

                this.wsService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.CARD_DISCARDED,
                    data: {
                        playerId,
                        cardId,
                        game: gameResponse,
                    },
                });

                // Send speech bubble to OTHER players only, not to the player who discarded
                this.sendSpeechBubbleToOthers(roomId, playerId, "Descartó una carta", "Sistema", 0);

                // Check if the round was closed by this discard (winning condition)
                if (result.currentHand?.chinchonState?.isRoundClosed) {
                    console.log("🎯 Round closed after discard - preparing AI for next round");
                    // Round ended - prepare AI for next round
                    setTimeout(() => this.handleAIReadyForNextRound(roomId), 100);
                } else {
                    // After discarding, turn passes to next player - check if it's AI
                    // Don't await to avoid blocking the response
                    this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
                }
            } else {
                // Send error message if the action failed
                this.wsService.sendError(ws, "No se puede descartar esta carta en este momento");
            }
        } catch (error) {
            console.error("Error discarding card:", error);
            this.wsService.sendError(ws, "Failed to discard card");
        }
    }

    /**
     * Handle close round
     */
    private handleCloseRound(ws: any, roomId: string, playerId: string): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            const result = this.chinchonGameService.closeRound(room.game.id, playerId);
            if (result) {
                // Update the room's game state with the result
                room.game = result;
            }
            const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.ROUND_CLOSED,
                data: {
                    playerId,
                    game: gameResponse,
                },
            });

            this.sendSpeechBubble(roomId, playerId, "¡Cerró la ronda!", "Sistema", 2);

            // Round ended - prepare AI for next round
            setTimeout(() => this.handleAIReadyForNextRound(roomId), 100);
        } catch (error) {
            console.error("Error closing round:", error);
            this.wsService.sendError(ws, "Failed to close round");
        }
    }

    /**
     * Handle cut with card
     */
    private handleCutWithCard(ws: any, roomId: string, playerId: string, data: any): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            const { cardId } = data;
            const result = this.chinchonGameService.cutWithCard(room.game.id, playerId, cardId);

            if (result) {
                // Update the room's game state with the result
                room.game = result;
                const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

                this.wsService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.ROUND_CLOSED,
                    data: {
                        playerId,
                        cardId,
                        game: gameResponse,
                    },
                });

                this.sendSpeechBubble(roomId, playerId, "¡Cortó y ganó!", "Sistema", 3);

                // Round ended - prepare AI for next round
                setTimeout(() => this.handleAIReadyForNextRound(roomId), 100);
            } else {
                this.wsService.sendError(ws, "No se puede cortar con esta carta");
            }
        } catch (error) {
            console.error("Error cutting with card:", error);
            this.wsService.sendError(ws, "Failed to cut with card");
        }
    }

    /**
     * Handle show combinations
     */
    private handleShowCombinations(ws: any, roomId: string, playerId: string, data: any): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            const { combinations } = data;
            this.chinchonGameService.showCombinations(room.game.id, playerId, combinations);
            const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.COMBINATIONS_SHOWN,
                data: {
                    playerId,
                    combinations,
                    game: gameResponse,
                },
            });

            this.sendSpeechBubble(roomId, playerId, "Mostró sus combinaciones", "Sistema", 1);
        } catch (error) {
            console.error("Error showing combinations:", error);
            this.wsService.sendError(ws, "Failed to show combinations");
        }
    }

    /**
     * Send speech bubble specific to Chinchón game
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
     * Send speech bubble to all players EXCEPT the specified player
     */
    private sendSpeechBubbleToOthers(roomId: string, excludePlayerId: string, message: string, playerName: string, priority: number = 0): void {
        // Use the new broadcastToRoomExcept method
        this.wsService.broadcastToRoomExcept(roomId, excludePlayerId, {
            type: WEBSOCKET_MESSAGE_TYPES.SPEECH_BUBBLE,
            data: {
                playerId: excludePlayerId, // Keep original playerId so recipients know who performed the action
                message,
                playerName,
                priority,
            },
        });
    }

    private handleStartNextRound(ws: any, roomId: string, playerId: string, _data: any): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            // Check if the round is actually closed
            if (!room.game.currentHand?.chinchonState?.isRoundClosed) {
                console.log("❌ Round is not closed yet, rejecting START_NEXT_ROUND");
                this.wsService.sendError(ws, "Round is not closed yet");
                return;
            }

            console.log(`🎴 Starting next round for player ${playerId}`);

            // Add player to ready list
            const chinchonState = room.game.currentHand.chinchonState;
            if (!chinchonState.playersReadyForNextRound) {
                chinchonState.playersReadyForNextRound = new Set();
            }

            chinchonState.playersReadyForNextRound.add(playerId);

            // Convert Set to Array for serialization
            const playersReadyArray = Array.from(chinchonState.playersReadyForNextRound);
            console.log("🎴 Players ready for next round:", playersReadyArray);

            // Check if all players are ready
            const allPlayersReady = room.game.players.every((player: any) => chinchonState.playersReadyForNextRound.has(player.id));

            console.log(`🎴 All players ready: ${allPlayersReady}`);

            if (allPlayersReady) {
                // All players are ready, start a new round
                const newGame = this.chinchonGameService.startGame(room.game.id);
                if (newGame) {
                    const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

                    // Broadcast the new game state to all players
                    this.wsService.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.GAME_UPDATE,
                        data: {
                            game: gameResponse,
                        },
                    });

                    this.sendSpeechBubble(roomId, playerId, "¡Nueva ronda iniciada!", "Sistema", 3);

                    // After starting a new round, check if AI should play
                    this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
                } else {
                    this.wsService.sendError(ws, "Could not start new round");
                }
            } else {
                // Not all players are ready yet, broadcast the updated state
                const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

                this.wsService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.GAME_UPDATE,
                    data: {
                        game: gameResponse,
                    },
                });

                const readyCount = chinchonState.playersReadyForNextRound.size;
                const totalPlayers = room.game.players.length;
                this.sendSpeechBubble(roomId, playerId, `${readyCount}/${totalPlayers} jugadores listos para la siguiente ronda`, "Sistema", 2);
            }
        } catch (error) {
            console.error("Error starting next round:", error);
            this.wsService.sendError(ws, "Error starting next round");
        }
    }

    // ============================================================================
    // AI INTEGRATION (isolated from multiplayer logic)
    // ============================================================================

    /**
     * Get AI service instance (for external use, e.g., creating AI players)
     */
    getAIService(): ChinchonAIService {
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
        if (!room || !room.game.currentHand?.chinchonState) {
            console.log(`❌ processAITurnIfNeeded: No room or chinchon state`);
            return;
        }

        const currentPlayerId = room.game.currentHand.chinchonState.currentPlayerId;
        console.log(
            `🔍 processAITurnIfNeeded: currentPlayerId=${currentPlayerId}, isAI=${this.isAIPlayer(currentPlayerId)}, isRoundClosed=${
                room.game.currentHand.chinchonState.isRoundClosed
            }`
        );

        // Only process if current player is AI and round is not closed
        if (!this.isAIPlayer(currentPlayerId) || room.game.currentHand.chinchonState.isRoundClosed) {
            console.log(`⏭️ Skipping AI turn (not AI player or round closed)`);
            return;
        }

        // Acquire lock
        this.aiTurnLocks.set(roomId, true);
        console.log(`🔒 Acquired AI lock for room ${roomId}`);

        console.log(`🤖 AI turn detected for player ${currentPlayerId}`);

        try {
            // Get fresh game state before executing AI action
            const freshGame = this.chinchonGameService.getGame(room.game.id);
            if (!freshGame) {
                console.log(`❌ Could not get fresh game state`);
                return;
            }

            console.log(`🎮 Executing AI action for ${currentPlayerId}...`);

            // Get AI player info for speech bubbles
            const aiPlayer = freshGame.players.find((p: any) => p.id === currentPlayerId);
            const aiPlayerName = aiPlayer?.name || "IA";

            // Capture discard pile length BEFORE executing action (since it gets mutated)
            const discardPileLengthBefore = freshGame.currentHand?.chinchonState?.discardPile?.length || 0;

            // Execute AI action
            let updatedGame = await this.aiService.executeAIAction(freshGame, currentPlayerId);

            console.log(`✅ AI action completed, updating game state...`);

            // Determine what action was performed by comparing game states
            const didDraw = updatedGame.currentHand?.chinchonState?.hasDrawnCard && !freshGame.currentHand?.chinchonState?.hasDrawnCard;

            // Update the game state
            room.game = updatedGame;
            this.chinchonGameService.updateGame(updatedGame);

            // Get fresh game state with actions
            const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

            // Broadcast the updated game state
            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.GAME_UPDATE,
                data: {
                    game: gameResponse,
                },
            });

            // Send appropriate speech bubble based on action
            if (didDraw) {
                // Check if drew from discard pile (discard pile decreased from before)
                const discardPileLengthAfter = updatedGame.currentHand?.chinchonState?.discardPile?.length || 0;
                const fromDiscardPile = discardPileLengthBefore > discardPileLengthAfter;
                console.log(`Discard pile before: ${discardPileLengthBefore}, after: ${discardPileLengthAfter}, from discard: ${fromDiscardPile}`);
                if(fromDiscardPile) {
                    this.sendSpeechBubble(roomId, currentPlayerId, `Robó una carta del descarte`, aiPlayerName, 0);
                }
            }

            // Refresh room state after broadcast
            const refreshedRoom = this.roomService.getRoom(roomId);
            if (!refreshedRoom) {
                console.log(`❌ Room disappeared after AI action`);
                return;
            }

            // Get the most up-to-date game state to check what to do next
            const latestGame = this.chinchonGameService.getGame(room.game.id);
            if (!latestGame) return;

            const latestChinchonState = latestGame.currentHand?.chinchonState;
            if (!latestChinchonState) return;

            console.log(
                `📊 After AI action: hasDrawnCard=${latestChinchonState.hasDrawnCard}, currentPlayer=${latestChinchonState.currentPlayerId}, isRoundClosed=${latestChinchonState.isRoundClosed}`
            );

            // If the round is still active and it's still AI's turn (they drew a card),
            // process their next action (discard/cut/close)
            if (!latestChinchonState.isRoundClosed && latestChinchonState.currentPlayerId === currentPlayerId && latestChinchonState.hasDrawnCard) {
                console.log(`🤖 AI needs to complete their turn (discard/cut/close)`);
                // Small delay before next action
                setTimeout(() => {
                    this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn continuation:", err));
                }, 800);
            } else if (!latestChinchonState.isRoundClosed) {
                // Check if next player is also AI
                console.log(`🔄 Turn complete, checking if next player is AI...`);
                setTimeout(() => {
                    this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error checking next AI turn:", err));
                }, 1000);
            } else {
                // Round ended, check if AI should auto-ready for next round
                console.log(`🤖 Round ended, preparing AI for next round`);
                setTimeout(() => this.handleAIReadyForNextRound(roomId), 100);
            }
        } catch (error) {
            console.error(`❌ Error processing AI turn:`, error);
        } finally {
            // Release lock
            this.aiTurnLocks.delete(roomId);
            console.log(`🔓 Released AI lock for room ${roomId}`);
        }
    }

    /**
     * Automatically mark AI players as ready for next round
     */
    private handleAIReadyForNextRound(roomId: string): void {
        const room = this.roomService.getRoom(roomId);
        if (!room || !room.game.currentHand?.chinchonState?.isRoundClosed) {
            return;
        }

        const chinchonState = room.game.currentHand.chinchonState;
        if (!chinchonState.playersReadyForNextRound) {
            chinchonState.playersReadyForNextRound = new Set();
        }

        // Mark all AI players as ready
        room.game.players.forEach((player: any) => {
            if (this.isAIPlayer(player.id)) {
                chinchonState.playersReadyForNextRound.add(player.id);
            }
        });

        // Check if all players are ready now
        const allPlayersReady = room.game.players.every((player: any) => chinchonState.playersReadyForNextRound.has(player.id));

        if (allPlayersReady) {
            console.log(`🤖 All players (including AI) are ready, starting next round`);
            // Start new round
            setTimeout(() => {
                const newGame = this.chinchonGameService.startGame(room.game.id);
                if (newGame) {
                    const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

                    this.wsService.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.GAME_UPDATE,
                        data: {
                            game: gameResponse,
                        },
                    });

                    this.sendSpeechBubble(roomId, "system", "¡Nueva ronda iniciada!", "Sistema", 3);

                    // Check if AI should play first in the new round
                    this.processAITurnIfNeeded(roomId).catch((err) => console.error("Error in AI turn:", err));
                }
            }, 1000);
        } else {
            // Broadcast updated state
            const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);
            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.GAME_UPDATE,
                data: {
                    game: gameResponse,
                },
            });
        }
    }
}
