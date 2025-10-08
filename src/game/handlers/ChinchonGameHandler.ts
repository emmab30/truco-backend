import { WebSocketMessage } from "../../types";
import { WEBSOCKET_MESSAGE_TYPES, GameType } from "../../constants";
import { AbstractGameHandler } from "./BaseGameHandler";
import { ChinchonGameService } from "../../services/chinchonGameService";
import { RoomService } from "../../services/roomService";

/**
 * Chinchón Game Handler
 * Handles all Chinchón-specific WebSocket events
 */
export class ChinchonGameHandler extends AbstractGameHandler {
    constructor(
        private chinchonGameService: ChinchonGameService,
        private roomService: RoomService,
        private wsService: any // WebSocketService instance
    ) {
        super();
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
            WEBSOCKET_MESSAGE_TYPES.SHOW_COMBINATIONS,
            WEBSOCKET_MESSAGE_TYPES.REORDER_CARDS,
        ];
    }

    handleMessage(ws: any, message: WebSocketMessage, roomId: string, playerId: string): void {
        const { type, data } = message;

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
            case WEBSOCKET_MESSAGE_TYPES.SHOW_COMBINATIONS:
                this.handleShowCombinations(ws, roomId, playerId, data);
                break;
            case WEBSOCKET_MESSAGE_TYPES.REORDER_CARDS:
                this.handleReorderCards(ws, roomId, playerId, data);
                break;
            default:
                console.log(`Unhandled Chinchón message type: ${type}`);
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
                        game: gameResponse 
                    },
                });

                const source = fromDiscardPile ? "del descarte" : "del mazo";
                this.sendSpeechBubble(roomId, playerId, `Robó una carta ${source}`, "Sistema", 0);
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
                const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

                this.wsService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.CARD_DISCARDED,
                    data: { 
                        playerId, 
                        cardId, 
                        game: gameResponse 
                    },
                });

                this.sendSpeechBubble(roomId, playerId, "Descartó una carta", "Sistema", 0);
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

            this.chinchonGameService.closeRound(room.game.id, playerId);
            const gameResponse = this.chinchonGameService.getGameWithActions(room.game.id);

            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.ROUND_CLOSED,
                data: { 
                    playerId, 
                    game: gameResponse 
                },
            });

            this.sendSpeechBubble(roomId, playerId, "¡Cerró la ronda!", "Sistema", 2);
        } catch (error) {
            console.error("Error closing round:", error);
            this.wsService.sendError(ws, "Failed to close round");
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
                    game: gameResponse 
                },
            });

            this.sendSpeechBubble(roomId, playerId, "Mostró sus combinaciones", "Sistema", 1);
        } catch (error) {
            console.error("Error showing combinations:", error);
            this.wsService.sendError(ws, "Failed to show combinations");
        }
    }

    /**
     * Handle reordering cards
     */
    private handleReorderCards(ws: any, roomId: string, playerId: string, data: any): void {
        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.wsService.sendError(ws, "Room not found");
                return;
            }

            const { newOrder } = data;
            if (!newOrder || !Array.isArray(newOrder)) {
                this.wsService.sendError(ws, "Invalid card order");
                return;
            }

            // Update the player's cards order in the game
            const game = this.chinchonGameService.getGame(room.game.id);
            if (!game) {
                this.wsService.sendError(ws, "Game not found");
                return;
            }

            // Find the player and update their cards order
            const playerIndex = game.players.findIndex((p: any) => p.id === playerId);
            if (playerIndex === -1) {
                this.wsService.sendError(ws, "Player not found");
                return;
            }

            // Update the player's cards with the new order
            game.players[playerIndex].cards = newOrder;
            this.chinchonGameService.updateGame(game);

            // Broadcast the updated game state to all players in the room
            const gameResponse = this.chinchonGameService.getGameResponse(room.game.id);
            this.wsService.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.CARDS_REORDERED,
                data: {
                    playerId,
                    game: gameResponse,
                },
            });
        } catch (error: any) {
            console.error(`Error reordering cards in room ${roomId} for player ${playerId}:`, error.message);
            this.wsService.sendError(ws, `Error reordering cards: ${error.message}`);
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
}