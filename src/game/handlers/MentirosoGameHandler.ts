// ============================================================================
// MENTIROSO GAME HANDLER
// Handles all El Mentiroso-specific WebSocket events
// ============================================================================

import { WebSocketMessage } from "@/shared/types";
import { WEBSOCKET_MESSAGE_TYPES, GameType } from "@/shared/constants";
import { AbstractGameHandler } from "./BaseGameHandler";
import { MentirosoGameService } from "@/services/mentirosoGameService";
import { RoomService } from "@/services/roomService";

/**
 * El Mentiroso Game Handler
 * Handles all Mentiroso-specific WebSocket events
 */
export class MentirosoGameHandler extends AbstractGameHandler {
    constructor(
        private mentirosoGameService: MentirosoGameService,
        private roomService: RoomService,
        private wsService: any // WebSocketService instance
    ) {
        super();
    }

    getGameType(): string {
        return GameType.MENTIROSO;
    }

    getSupportedMessageTypes(): string[] {
        return [WEBSOCKET_MESSAGE_TYPES.START_GAME, WEBSOCKET_MESSAGE_TYPES.PLAY_CARDS, WEBSOCKET_MESSAGE_TYPES.CHALLENGE, WEBSOCKET_MESSAGE_TYPES.CONTINUE_AFTER_CHALLENGE];
    }

    handleMessage(ws: any, message: WebSocketMessage, roomId: string, playerId: string): void {
        const { type, data } = message;

        console.log(`🎮 Mentiroso handler processing: ${type} for player ${playerId} in room ${roomId}`);

        try {
            switch (type) {
                case WEBSOCKET_MESSAGE_TYPES.START_GAME:
                    this.handleStartGame(ws, roomId, playerId);
                    break;
                case WEBSOCKET_MESSAGE_TYPES.PLAY_CARDS:
                    this.handlePlayCards(ws, roomId, playerId, data);
                    break;
                case WEBSOCKET_MESSAGE_TYPES.CHALLENGE:
                    this.handleChallenge(ws, roomId, playerId);
                    break;
                case WEBSOCKET_MESSAGE_TYPES.CONTINUE_AFTER_CHALLENGE:
                    this.handleContinueAfterChallenge(ws, roomId, playerId);
                    break;
                default:
                    console.log(`❓ Unhandled Mentiroso message type: ${type}`);
            }
        } catch (error) {
            console.error(`❌ Error in Mentiroso handler for ${type}:`, error);
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

            this.mentirosoGameService.startGame(room.game.id);

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.GAME_STARTED,
                data: { room, game: this.mentirosoGameService.getGameUpdate(room.game.id) },
            });

            this.sendSpeechBubble(roomId, playerId, "¡El juego ha comenzado!", "Sistema", 1);
        } catch (error) {
            console.error("Error starting Mentiroso game:", error);
            this.wsService.sendError(ws, "Failed to start game");
        }
    }

    /**
     * Handle play cards
     */
    private handlePlayCards(ws: any, roomId: string, playerId: string, data: any): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            const { cardIds, claimedValue } = data;

            console.log("📥 Received play cards data:", { cardIds, claimedValue, type: typeof claimedValue });

            if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
                this.wsService.sendError(ws, "Invalid card IDs");
                return;
            }

            // Parse claimed value (may come as string or number)
            const parsedClaimedValue = typeof claimedValue === "string" ? parseInt(claimedValue, 10) : claimedValue;

            console.log("🔢 Parsed claimed value:", parsedClaimedValue, "type:", typeof parsedClaimedValue);

            if (typeof parsedClaimedValue !== "number" || isNaN(parsedClaimedValue)) {
                this.wsService.sendError(ws, `Invalid claimed value: ${claimedValue}`);
                return;
            }

            const result = this.mentirosoGameService.playCards(room.game.id, playerId, cardIds, parsedClaimedValue);

            if (result) {
                // Update the room's game state with the result
                room.game = result;

                this.wsService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.CARDS_PLAYED,
                    data: {
                        playerId,
                        cardCount: cardIds.length,
                        claimedValue: parsedClaimedValue,
                        game: this.mentirosoGameService.getGameUpdate(room.game.id),
                    },
                });

                const player = result.players.find((p) => p.id === playerId);
                const playerName = player?.name || "Jugador";
                const valueNames: { [key: number]: string } = {
                    1: "Ases",
                    2: "Doses",
                    3: "Treses",
                    4: "Cuatros",
                    5: "Cincos",
                    6: "Seises",
                    7: "Sietes",
                    10: "Sotas",
                    11: "Caballos",
                    12: "Reyes",
                };
                const valueName = valueNames[parsedClaimedValue] || `${parsedClaimedValue}s`;

                this.sendSpeechBubble(roomId, playerId, `Tiró ${cardIds.length} ${valueName}`, playerName, 0);

                // Check if player won
                if (result.winner === playerId) {
                    this.wsService.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.PLAYER_WON,
                        data: {
                            playerId,
                            playerName,
                            game: this.mentirosoGameService.getGameUpdate(room.game.id),
                        },
                    });

                    this.sendSpeechBubble(roomId, playerId, `¡${playerName} ganó el juego!`, "Sistema", 3);
                }
            } else {
                this.wsService.sendError(ws, "No se puede jugar estas cartas en este momento");
            }
        } catch (error) {
            console.error("Error playing cards:", error);
            this.wsService.sendError(ws, "Failed to play cards");
        }
    }

    /**
     * Handle challenge
     */
    private handleChallenge(ws: any, roomId: string, playerId: string): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            const result = this.mentirosoGameService.challenge(room.game.id, playerId);

            if (result) {
                // Update the room's game state with the result
                room.game = result;

                const mentirosoState = result.currentHand?.mentirosoState;
                if (!mentirosoState) {
                    return;
                }

                const challenger = result.players.find((p) => p.id === playerId);
                const targetPlayer = result.players.find((p) => p.id === mentirosoState.lastPlayedGroup?.playerId);
                const challengerName = challenger?.name || "Jugador";
                const targetPlayerName = targetPlayer?.name || "Jugador";

                this.wsService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.CHALLENGE_MADE,
                    data: {
                        challengerId: playerId,
                        targetPlayerId: mentirosoState.lastPlayedGroup?.playerId,
                        game: this.mentirosoGameService.getGameUpdate(room.game.id),
                    },
                });

                this.sendSpeechBubble(roomId, playerId, `${challengerName} desafió a ${targetPlayerName}`, "Sistema", 2);

                // After a short delay, broadcast the challenge result
                setTimeout(() => {
                    const wasLying = mentirosoState.wasLying;
                    const revealedCards = mentirosoState.revealedCards || [];
                    const penalizedPlayerId = wasLying ? mentirosoState.lastPlayedGroup?.playerId : playerId;

                    this.wsService.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.CHALLENGE_RESULT,
                        data: {
                            wasLying,
                            revealedCards,
                            challengerId: playerId,
                            targetPlayerId: mentirosoState.lastPlayedGroup?.playerId,
                            penalizedPlayerId,
                            game: this.mentirosoGameService.getGameUpdate(room.game.id),
                        },
                    });

                    if (wasLying) {
                        this.sendSpeechBubble(roomId, playerId, `¡${targetPlayerName} mentía! Recibe las cartas.`, "Sistema", 2);
                    } else {
                        this.sendSpeechBubble(roomId, playerId, `${targetPlayerName} decía la verdad. ${challengerName} recibe las cartas.`, "Sistema", 2);
                    }
                }, 1000);
            } else {
                this.wsService.sendError(ws, "No se puede desafiar en este momento");
            }
        } catch (error) {
            console.error("Error challenging:", error);
            this.wsService.sendError(ws, "Failed to challenge");
        }
    }

    /**
     * Handle continue after challenge
     */
    private handleContinueAfterChallenge(ws: any, roomId: string, _playerId: string): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            const result = this.mentirosoGameService.continueAfterChallenge(room.game.id);

            if (result) {
                // Update the room's game state with the result
                room.game = result;

                this.wsService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.GAME_UPDATE,
                    data: {
                        game: this.mentirosoGameService.getGameUpdate(room.game.id),
                    },
                });

                this.sendSpeechBubble(roomId, "system", "¡Nueva ronda!", "Sistema", 1);
            } else {
                this.wsService.sendError(ws, "No se puede continuar en este momento");
            }
        } catch (error) {
            console.error("Error continuing after challenge:", error);
            this.wsService.sendError(ws, "Failed to continue");
        }
    }

    /**
     * Send speech bubble specific to Mentiroso game
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
}
