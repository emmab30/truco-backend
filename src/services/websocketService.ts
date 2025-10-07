// WebSocketServer is not used in this file
import { WebSocketMessage } from "../types";
import { GAME_DELAY_NEW_HAND, WEBSOCKET_MESSAGE_TYPES } from "../constants";
import { GameService } from "./gameService";
import { RoomService } from "./roomService";
// getAvailableActions is not used in this file

/**
 * WebSocket Service
 * Handles all WebSocket communication
 */
export class WebSocketService {
    private playerConnections: Map<string, any> = new Map(); // playerId -> WebSocket

    constructor(private gameService: GameService, private roomService: RoomService) {}

    /**
     * Handle incoming WebSocket message
     * @param ws - WebSocket connection
     * @param message - Message object
     */
    handleMessage(ws: any, message: WebSocketMessage): void {
        const { type, data, roomId, playerId } = message;

        // Register the WebSocket connection
        if (playerId) {
            // Check if this player already has a connection (reconnection case)
            const existingConnection = this.playerConnections.get(playerId);
            if (existingConnection && existingConnection !== ws) {
                console.log("Player reconnecting with same ID:", playerId);
                // Close the old connection
                if (existingConnection.readyState === 1) {
                    existingConnection.close();
                }
            }

            this.playerConnections.set(playerId, ws);
            if (roomId) {
                this.roomService.addConnection(roomId, playerId, ws);
            }
        }

        try {
            switch (type) {
                case WEBSOCKET_MESSAGE_TYPES.REGISTER_PLAYER:
                    this.handleRegisterPlayer(ws, data);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.CREATE_ROOM:
                    this.handleCreateRoom(ws, data);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.JOIN_ROOM:
                    this.handleJoinRoom(ws, data, roomId);
                    break;

                case WEBSOCKET_MESSAGE_TYPES.LEAVE_ROOM:
                    this.handleLeaveRoom(ws, playerId, roomId);
                    break;

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

                case WEBSOCKET_MESSAGE_TYPES.GET_ROOMS:
                    this.handleGetRooms(ws, playerId);
                    break;

                default:
                    this.sendError(ws, "Unknown message type");
            }
        } catch (error) {
            console.error("Error handling WebSocket message:", error);
            this.sendError(ws, "Internal server error");
        }
    }

    /**
     * Handle WebSocket disconnection
     * @param ws - WebSocket connection
     */
    handleDisconnect(ws: any): void {
        // Find player by WebSocket connection
        for (const [playerId, connection] of this.playerConnections.entries()) {
            if (connection === ws) {
                console.log("Player disconnected:", playerId);
                this.playerConnections.delete(playerId);

                // Get the room the player was in before removing them
                const room = this.roomService.getRoomByPlayer(playerId);
                if (room) {
                    const player = room.game.players.find((p) => p.id === playerId);
                    const playerName = player?.name || "Jugador desconocido";
                    const roomId = room.id;
                    const wasGameActive = room.isActive && room.game.players.length >= 2;
                    const willHaveOnlyOnePlayer = room.connections.size === 2;
                    const willBeEmpty = room.connections.size <= 1;

                    // Send disconnect notification to remaining players BEFORE removing the room
                    if (room.game.players.length > 1 && !playerId.startsWith("temp-") && (willHaveOnlyOnePlayer || willBeEmpty)) {
                        const disconnectMessage = wasGameActive ? `${playerName} abandonó el juego` : `${playerName} se desconectó de la sala`;

                        this.broadcastToRoom(roomId, {
                            type: WEBSOCKET_MESSAGE_TYPES.PLAYER_DISCONNECTED,
                            data: {
                                playerId,
                                playerName,
                                message: disconnectMessage,
                                game: this.gameService.getGameWithActions(room.game.id),
                            },
                        });
                    }

                    // Remove player from room (this will delete the room if it becomes empty or has only one player)
                    this.roomService.leaveRoom(playerId);

                    // Update room list for everyone
                    const allRooms = this.roomService.getAllRooms();
                    console.log("Broadcasting updated room list:", allRooms.length, "rooms");
                    this.broadcastToAll({
                        type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                        data: { rooms: allRooms },
                    });
                }
                break;
            }
        }
    }

    // ============================================================================
    // MESSAGE HANDLERS
    // ============================================================================

    private handleRegisterPlayer(ws: any, data: any): void {
        const { playerId } = data;
        this.sendMessage(ws, {
            type: WEBSOCKET_MESSAGE_TYPES.PLAYER_REGISTERED,
            data: { playerId },
        });
    }

    private handleCreateRoom(ws: any, data: any): void {
        const { roomName, playerName, playerId, maxPlayers = 2 } = data;

        try {
            const room = this.roomService.createRoom(roomName, playerName, playerId, maxPlayers);

            // Store player connection
            this.playerConnections.set(playerId, ws);
            this.roomService.addConnection(room.id, playerId, ws);

            this.sendMessage(ws, {
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_CREATED,
                data: {
                    room: this.roomToResponse(room),
                    game: this.gameService.getGameWithActions(room.game.id),
                },
            });

            this.broadcastToAll({
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                data: { rooms: this.roomService.getAllRooms() },
            });
        } catch (error) {
            this.sendError(ws, "Error creating room");
        }
    }

    private handleJoinRoom(ws: any, data: any, roomId?: string): void {
        if (!roomId) {
            this.sendError(ws, "Room ID required");
            return;
        }

        const { playerName, playerId } = data;

        try {
            const room = this.roomService.joinRoom(roomId, playerName, playerId);
            if (!room) {
                this.sendError(ws, "Error joining room");
                return;
            }

            // Store player connection
            this.playerConnections.set(playerId, ws);
            this.roomService.addConnection(roomId, playerId, ws);

            // Notify all players in room
            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.PLAYER_JOINED,
                data: {
                    player: { id: playerId, name: playerName },
                    game: this.gameService.getGameWithActions(room.game.id),
                },
            });

            // Send room data to joining player
            this.sendMessage(ws, {
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_JOINED,
                data: {
                    room: this.roomToResponse(room),
                    game: this.gameService.getGameWithActions(room.game.id),
                },
            });

            // Check if we have enough players to start the game
            if (room.game.players.length >= 2 && !room.isActive) {
                const startedGame = this.gameService.startGame(room.game.id);
                const gameWithHand = this.gameService.dealNewHand(startedGame.id);
                this.roomService.updateRoomGame(roomId, gameWithHand);
                this.roomService.setRoomActive(roomId, true);

                // Update room reference
                room.game = gameWithHand;
                room.isActive = true;

                this.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.GAME_STARTED,
                    data: {
                        room: this.roomToResponse(room),
                        game: this.gameService.getGameWithActions(gameWithHand.id),
                    },
                });
            }

            this.broadcastToAll({
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                data: { rooms: this.roomService.getAllRooms() },
            });
        } catch (error) {
            this.sendError(ws, "Error joining room");
        }
    }

    private handleLeaveRoom(_ws: any, playerId?: string, _roomId?: string): void {
        if (playerId) {
            this.roomService.leaveRoom(playerId);
            this.broadcastToAll({
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                data: { rooms: this.roomService.getAllRooms() },
            });
        }
    }

    private handleStartGame(_playerId?: string, roomId?: string): void {
        if (!roomId) return;

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const startedGame = this.gameService.startGame(room.game.id);
            this.roomService.updateRoomGame(roomId, startedGame);
            this.roomService.setRoomActive(roomId, true);

            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.GAME_STARTED,
                data: {
                    room: this.roomToResponse(room),
                    game: this.gameService.getGameWithActions(startedGame.id),
                },
            });
        } catch (error) {
            console.error("Error starting game:", error);
        }
    }

    private handleDealNewHand(_playerId?: string, roomId?: string): void {
        if (!roomId) return;

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const newHandGame = this.gameService.dealNewHand(room.game.id);
            this.roomService.updateRoomGame(roomId, newHandGame);

            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.NEW_HAND_DEALT,
                data: { game: this.gameService.getGameWithActions(newHandGame.id) },
            });
        } catch (error) {
            console.error("Error dealing new hand:", error);
        }
    }

    private handlePlayCard(playerId?: string, roomId?: string, data?: any): void {
        if (!roomId || !playerId || !data?.cardId) return;

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.gameService.playCard(room.game.id, playerId, data.cardId);
            this.roomService.updateRoomGame(roomId, updatedGame);

            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.CARD_PLAYED,
                data: {
                    playerId,
                    cardId: data.cardId,
                    game: this.gameService.getGameWithActions(updatedGame.id),
                },
            });

            // Handle automatic round/hand progression
            this.handleGameProgression(roomId, updatedGame);
        } catch (error) {
            console.error("Error playing card:", error);
        }
    }

    private handleCallEnvido(playerId?: string, roomId?: string, data?: any): void {
        if (!roomId || !playerId || !data?.call) return;

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.gameService.callEnvido(room.game.id, playerId, data.call);
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

            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.ENVIDO_CALLED,
                data: {
                    playerId,
                    call: data.call,
                    game: this.gameService.getGameWithActions(updatedGame.id),
                },
            });
        } catch (error) {
            console.error("Error calling envido:", error);
        }
    }

    private handleRespondEnvido(playerId?: string, roomId?: string, data?: any): void {
        if (!roomId || !playerId || !data?.response) return;

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.gameService.respondEnvido(room.game.id, playerId, data.response);
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
                // Send speech bubbles for both players
                const caller = updatedGame.players.find((p) => p.id === envidoState.currentCaller);
                const responder = updatedGame.players.find((p) => p.id === playerId);

                if (caller && responder) {
                    // Send speech bubble for caller (high priority for envido points)
                    this.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.SPEECH_BUBBLE,
                        data: {
                            playerId: caller.id,
                            message: envidoState.callerMessage,
                            playerName: caller.name,
                            priority: 10,
                        },
                    });

                    // Send speech bubble for responder (high priority for envido points)
                    this.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.SPEECH_BUBBLE,
                        data: {
                            playerId: responder.id,
                            message: envidoState.responderMessage,
                            playerName: responder.name,
                            priority: 10,
                        },
                    });
                }
            }

            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.ENVIDO_RESPONDED,
                data: {
                    playerId,
                    response: data.response,
                    game: this.gameService.getGameWithActions(updatedGame.id),
                },
            });
        } catch (error) {
            console.error("Error responding to envido:", error);
        }
    }

    private handleCallTruco(playerId?: string, roomId?: string, data?: any): void {
        if (!roomId || !playerId || !data?.call) return;

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.gameService.callTruco(room.game.id, playerId, data.call);
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

            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.TRUCO_CALLED,
                data: {
                    playerId,
                    call: data.call,
                    game: this.gameService.getGameWithActions(updatedGame.id),
                },
            });
        } catch (error) {
            console.error("Error calling truco:", error);
        }
    }

    private handleRespondTruco(playerId?: string, roomId?: string, data?: any): void {
        if (!roomId || !playerId || !data?.response) return;

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.gameService.respondTruco(room.game.id, playerId, data.response);
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

            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.TRUCO_RESPONDED,
                data: {
                    playerId,
                    response: data.response,
                    game: this.gameService.getGameWithActions(updatedGame.id),
                },
            });

            // Handle automatic hand progression if hand ended
            this.handleGameProgression(roomId, updatedGame);
        } catch (error) {
            console.error("Error responding to truco:", error);
        }
    }

    private handleGoToMazo(playerId?: string, roomId?: string): void {
        if (!roomId || !playerId) return;

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) return;

            const updatedGame = this.gameService.goToMazo(room.game.id, playerId);
            this.roomService.updateRoomGame(roomId, updatedGame);

            // Send speech bubble for going to mazo
            const player = updatedGame.players.find((p) => p.id === playerId);
            if (player) {
                this.sendSpeechBubble(roomId, playerId, "Ir al mazo", player.name, 5);
            }

            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.WENT_TO_MAZO,
                data: {
                    playerId,
                    game: this.gameService.getGameWithActions(updatedGame.id),
                },
            });

            // Handle automatic hand progression
            this.handleGameProgression(roomId, updatedGame);
        } catch (error) {
            console.error("Error going to mazo:", error);
        }
    }

    private handleGetRooms(ws: any, playerId?: string): void {
        const rooms = this.roomService.getAllRooms();

        if (playerId) {
            this.sendMessage(ws, {
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                data: { rooms },
            });
        } else {
            this.sendMessage(ws, {
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                data: { rooms },
            });
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
                this.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.HAND_END,
                    data: {
                        winner: {
                            name: winnerPlayer.name,
                            team: winnerPlayer.team,
                            points: game.currentHand?.points || 0,
                        },
                        game: this.gameService.getGameWithActions(game.id),
                    },
                });
            }

            // Deal new hand after delay
            setTimeout(() => {
                try {
                    const room = this.roomService.getRoom(roomId);
                    if (!room) return;

                    const newHandGame = this.gameService.dealNewHand(room.game.id);
                    this.roomService.updateRoomGame(roomId, newHandGame);

                    this.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.NEW_HAND_DEALT,
                        data: { game: this.gameService.getGameWithActions(newHandGame.id) },
                    });
                } catch (error) {
                    console.error("Error dealing new hand automatically:", error);
                }
            }, GAME_DELAY_NEW_HAND); // 5 seconds delay
        }
    }

    // ============================================================================
    // MESSAGE SENDING
    // ============================================================================

    private sendMessage(ws: any, message: any): void {
        if (ws.readyState === 1) {
            // WebSocket.OPEN
            ws.send(JSON.stringify(message));
        }
    }

    private sendError(ws: any, message: string): void {
        this.sendMessage(ws, {
            type: WEBSOCKET_MESSAGE_TYPES.ERROR,
            data: { message },
        });
    }

    private broadcastToRoom(roomId: string, message: any): void {
        const connections = this.roomService.getRoomConnections(roomId);
        const messageStr = JSON.stringify(message);

        connections.forEach((ws) => {
            if (ws.readyState === 1) {
                // WebSocket.OPEN
                ws.send(messageStr);
            }
        });
    }

    private sendSpeechBubble(roomId: string, playerId: string, message: string, playerName: string, priority: number = 0): void {
        this.broadcastToRoom(roomId, {
            type: WEBSOCKET_MESSAGE_TYPES.SPEECH_BUBBLE,
            data: {
                playerId,
                message,
                playerName,
                priority,
            },
        });
    }

    private broadcastToAll(message: any): void {
        const messageStr = JSON.stringify(message);

        this.playerConnections.forEach((ws) => {
            if (ws.readyState === 1) {
                // WebSocket.OPEN
                ws.send(messageStr);
            }
        });
    }

    private roomToResponse(room: any): any {
        return {
            id: room.id,
            name: room.name,
            maxPlayers: room.maxPlayers,
            players: room.game.players,
            isActive: room.isActive,
            createdAt: room.createdAt,
        };
    }
}
