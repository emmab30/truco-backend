import { WebSocketMessage } from "@/shared/types";
import { WEBSOCKET_MESSAGE_TYPES, GameType } from "@/shared/constants";
import { TrucoGameService } from "./trucoGameService";
import { ChinchonGameService } from "./chinchonGameService";
import { RoomService } from "./roomService";
import { GameHandlerRegistry } from "@/game/handlers/GameHandlerRegistry";
import { TrucoGameHandler } from "@/game/handlers/TrucoGameHandler";
import { ChinchonGameHandler } from "@/game/handlers/ChinchonGameHandler";

/**
 * WebSocket Service
 * Handles all WebSocket communication and delegates game-specific events to appropriate handlers
 */
export class WebSocketService {
    private playerConnections: Map<string, any> = new Map(); // playerId -> WebSocket
    private gameHandlerRegistry: GameHandlerRegistry;

    constructor(private trucoGameService: TrucoGameService, private chinchonGameService: ChinchonGameService, private roomService: RoomService) {
        // chinchonGameService is used indirectly through the ChinchonGameHandler
        // Initialize game handler registry
        this.gameHandlerRegistry = new GameHandlerRegistry();

        // Register Truco game handler
        const trucoHandler = new TrucoGameHandler(trucoGameService, roomService, this);
        this.gameHandlerRegistry.registerHandler(GameType.TRUCO, trucoHandler);

        // Register Chinchón game handler
        const chinchonHandler = new ChinchonGameHandler(this.chinchonGameService, roomService, this);
        this.gameHandlerRegistry.registerHandler(GameType.CHINCHON, chinchonHandler);
    }

    /**
     * Get the appropriate game service based on game type
     */
    private getGameService(gameType: string): any {
        switch (gameType) {
            case GameType.TRUCO:
                return this.trucoGameService;
            case GameType.CHINCHON:
                return this.chinchonGameService;
            default:
                return this.trucoGameService; // Default to Truco
        }
    }

    /**
     * Handle incoming WebSocket message
     * @param ws - WebSocket connection
     * @param message - Message object
     */
    handleMessage(ws: any, message: WebSocketMessage): void {
        const { type, roomId, playerId } = message;

        console.log(`🔍 Processing message: ${type} for player: ${playerId} in room: ${roomId}`);

        // Register the WebSocket connection
        if (playerId) {
            // Check if this player already has a connection (reconnection case)
            const existingConnection = this.playerConnections.get(playerId);
            if (existingConnection && existingConnection !== ws) {
                console.log(`🔄 Player reconnecting: ${playerId}`);
                console.log(`🔄 Old connection state: ${existingConnection.readyState}`);
                console.log(`🔄 New connection state: ${ws.readyState}`);
                // Close the old connection
                if (existingConnection.readyState === 1) {
                    existingConnection.close();
                }
            }

            this.playerConnections.set(playerId, ws);
            if (roomId) {
                this.roomService.addConnection(roomId, playerId, ws);
                console.log(`🔗 Added connection for player ${playerId} to room ${roomId}`);
            }
        }

        try {
            // Handle room-related events
            if (this.isRoomEvent(type)) {
                console.log(`🏠 Handling room event: ${type}`);
                this.handleRoomEvent(ws, message, roomId, playerId);
            } else {
                console.log(`🎮 Handling game event: ${type}`);
                this.handleGameEvent(ws, message, roomId, playerId);
            }
        } catch (error) {
            console.error("❌ Error handling WebSocket message:", error);
            console.error("❌ Message details:", { type, roomId, playerId, data: message.data });
            this.sendError(ws, "Internal server error");
        }
    }

    // ============================================================================
    // EVENT CLASSIFICATION
    // ============================================================================

    /**
     * Check if a message type is a room-related event
     */
    private isRoomEvent(messageType: string): boolean {
        const roomEvents = [
            WEBSOCKET_MESSAGE_TYPES.REGISTER_PLAYER,
            WEBSOCKET_MESSAGE_TYPES.CREATE_ROOM,
            WEBSOCKET_MESSAGE_TYPES.JOIN_ROOM,
            WEBSOCKET_MESSAGE_TYPES.JOIN_ROOM_BY_ID,
            WEBSOCKET_MESSAGE_TYPES.GET_ROOM_INFO,
            WEBSOCKET_MESSAGE_TYPES.LEAVE_ROOM,
            WEBSOCKET_MESSAGE_TYPES.GET_ROOMS,
        ];
        return roomEvents.includes(messageType as any);
    }

    // ============================================================================
    // ROOM EVENT HANDLERS
    // ============================================================================

    /**
     * Handle room-related events
     */
    private handleRoomEvent(ws: any, message: WebSocketMessage, roomId?: string, playerId?: string): void {
        const { type, data } = message;

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

            case WEBSOCKET_MESSAGE_TYPES.JOIN_ROOM_BY_ID:
                this.handleJoinRoomById(ws, data, roomId);
                break;

            case WEBSOCKET_MESSAGE_TYPES.GET_ROOM_INFO:
                this.handleGetRoomInfo(ws, roomId);
                break;

            case WEBSOCKET_MESSAGE_TYPES.LEAVE_ROOM:
                this.handleLeaveRoom(ws, playerId, roomId);
                break;

            case WEBSOCKET_MESSAGE_TYPES.GET_ROOMS:
                this.handleGetRooms(ws, playerId);
                break;

            default:
                this.sendError(ws, "Unknown room event type");
        }
    }

    // ============================================================================
    // GAME EVENT HANDLERS
    // ============================================================================

    /**
     * Handle game-specific events by delegating to appropriate game handler
     */
    private handleGameEvent(ws: any, message: WebSocketMessage, roomId?: string, playerId?: string): void {
        if (!roomId) {
            this.sendError(ws, "Room ID is required for game events");
            return;
        }

        // Get the room to determine game type
        const room = this.roomService.getRoom(roomId);
        if (!room) {
            this.sendError(ws, "Sala no encontrada");
            return;
        }

        // Get the appropriate game handler
        const gameHandler = this.gameHandlerRegistry.getHandler(room.gameType);
        if (!gameHandler) {
            this.sendError(ws, `No handler found for game type: ${room.gameType}`);
            return;
        }

        // Delegate to the game handler
        gameHandler.handleMessage(ws, message, roomId, playerId);
    }

    /**
     * Handle WebSocket disconnection
     * @param ws - WebSocket connection
     */
    handleDisconnect(ws: any): void {
        console.log(`🔍 Handling disconnect for WebSocket connection`);

        // Find player by WebSocket connection
        for (const [playerId, connection] of this.playerConnections.entries()) {
            if (connection === ws) {
                console.log(`👋 Player disconnected: ${playerId}`);
                console.log(`🔍 Connection state before removal: ${ws.readyState}`);
                this.playerConnections.delete(playerId);

                // Get the room the player was in before removing them
                const room = this.roomService.getRoomByPlayer(playerId);
                if (room) {
                    const player = room.game.players.find((p: any) => p.id === playerId);
                    const playerName = player?.name || "Jugador desconocido";
                    const roomId = room.id;
                    const wasGameActive = room.isActive && room.game.players.length >= 2;
                    const willHaveOnlyOnePlayer = room.connections.size === 2;
                    const willBeEmpty = room.connections.size <= 1;

                    console.log(`🏠 Player was in room: ${roomId}`);
                    console.log(`🎮 Game was active: ${wasGameActive}`);
                    console.log(`👥 Room connections: ${room.connections.size}`);
                    console.log(`👥 Room players: ${room.game.players.length}`);

                    // Send disconnect notification to remaining players BEFORE removing the room
                    if (room.game.players.length > 1 && !playerId.startsWith("temp-") && (willHaveOnlyOnePlayer || willBeEmpty)) {
                        const disconnectMessage = wasGameActive ? `${playerName} abandonó el juego` : `${playerName} se desconectó de la sala`;
                        console.log(`📢 Sending disconnect notification: ${disconnectMessage}`);

                        this.broadcastToRoom(roomId, {
                            type: WEBSOCKET_MESSAGE_TYPES.PLAYER_DISCONNECTED,
                            data: {
                                playerId,
                                playerName,
                                message: disconnectMessage,
                                game: this.getGameService(room.gameType).getGameWithActions(room.game.id),
                            },
                        });
                    }

                    // Remove player from room (this will delete the room if it becomes empty or has only one player)
                    console.log(`🗑️ Removing player from room`);
                    this.roomService.leaveRoom(playerId);

                    // Update room list for everyone
                    const allRooms = this.roomService.getAllRooms();
                    console.log(`📡 Broadcasting room list: ${allRooms.length} rooms`);
                    this.broadcastToAll({
                        type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                        data: { rooms: allRooms },
                    });
                } else {
                    console.log(`⚠️ Player ${playerId} was not in any room`);
                }
                break;
            }
        }
    }

    // ============================================================================
    // ROOM MESSAGE HANDLERS
    // ============================================================================

    private handleRegisterPlayer(ws: any, data: any): void {
        const { playerId } = data;
        this.sendMessage(ws, {
            type: WEBSOCKET_MESSAGE_TYPES.PLAYER_REGISTERED,
            data: { playerId },
        });
    }

    private handleCreateRoom(ws: any, data: any): void {
        const {
            roomName,
            playerName,
            playerId,
            maxPlayers = 2,
            isPrivate = false,
            password,
            maxScore = 15,
            gameType = GameType.TRUCO,
            hasAI = false,
            aiDifficulty = "medium",
        } = data;

        try {
            const room = this.roomService.createRoom(roomName, playerName, playerId, maxPlayers, isPrivate, password, maxScore, gameType);

            // Store player connection
            this.playerConnections.set(playerId, ws);
            this.roomService.addConnection(room.id, playerId, ws);

            // Get the appropriate game service based on game type
            const gameService = this.getGameService(room.gameType);

            // If AI mode is enabled, add AI player and start game automatically
            if (hasAI && (gameType === GameType.CHINCHON || gameType === GameType.TRUCO)) {
                console.log(`🤖 Creating AI player for room ${room.id} with difficulty: ${aiDifficulty}`);

                // Add AI player to the game
                // For Truco, difficulty is always "hard", for Chinchon we pass the selected difficulty
                if (gameType === GameType.TRUCO) {
                    (gameService as any).addAIPlayerToGame(room.game.id);
                } else {
                    (gameService as any).addAIPlayerToGame(room.game.id, aiDifficulty);
                }

                // Start the game immediately
                let startedGame = gameService.startGame(room.game.id);
                
                // For Truco, we also need to deal the first hand (Chinchón does this automatically in startGame)
                if (gameType === GameType.TRUCO) {
                    startedGame = gameService.dealNewHand(startedGame.id);
                    console.log(`🎴 Dealt first hand for Truco game ${room.id}`);
                }
                
                this.roomService.updateRoomGame(room.id, startedGame);
                this.roomService.setRoomActive(room.id, true);
                room.game = startedGame;
                room.isActive = true;

                console.log(`🎮 AI game started automatically for room ${room.id}`);
            }

            this.sendMessage(ws, {
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_CREATED,
                data: {
                    room: this.roomToResponse(room),
                    game: gameService.getGameWithActions(room.game.id),
                },
            });

            this.broadcastToAll({
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                data: { rooms: this.roomService.getAllRooms() },
            });

            // If game was started with AI, trigger AI's first move if needed
            if (hasAI && (gameType === GameType.CHINCHON || gameType === GameType.TRUCO) && room.isActive) {
                const gameHandler = this.gameHandlerRegistry.getHandler(gameType);
                if (gameHandler) {
                    // Trigger AI turn check after a short delay to ensure client receives game state first
                    setTimeout(() => {
                        const currentRoom = this.roomService.getRoom(room.id);
                        if (currentRoom?.game?.currentHand) {
                            // For Chinchon, check chinchonState
                            if (gameType === GameType.CHINCHON && currentRoom.game.currentHand.chinchonState?.currentPlayerId?.startsWith("ia_")) {
                                console.log(`🤖 Triggering initial AI turn for Chinchon room ${room.id}`);
                                (gameHandler as any).processAITurnIfNeeded?.(room.id);
                            }
                            // For Truco, check currentPlayerId
                            else if (gameType === GameType.TRUCO && currentRoom.game.currentHand.currentPlayerId?.startsWith("ia_")) {
                                console.log(`🤖 Triggering initial AI turn for Truco room ${room.id}`);
                                (gameHandler as any).processAITurnIfNeeded?.(room.id);
                            }
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.log(`Error!`, error);
            this.sendError(ws, "Error creating room");
        }
    }

    private handleJoinRoom(ws: any, data: any, roomId?: string): void {
        if (!roomId) {
            this.sendError(ws, "Room ID required");
            return;
        }

        const { playerName, playerId, password } = data;

        try {
            const room = this.roomService.joinRoom(roomId, playerName, playerId, password);
            if (!room) {
                this.sendError(ws, "Error joining room (room full, not found, or incorrect password)");
                return;
            }

            // Store player connection
            this.playerConnections.set(playerId, ws);
            this.roomService.addConnection(roomId, playerId, ws);

            // Get the formatted player name from the game (already formatted for privacy)
            const joinedPlayer = room.game.players.find((p: any) => p.id === playerId);
            const formattedPlayerName = joinedPlayer?.name || playerName;

            // Notify all players in room
            this.broadcastToRoom(roomId, {
                type: WEBSOCKET_MESSAGE_TYPES.PLAYER_JOINED,
                data: {
                    player: { id: playerId, name: formattedPlayerName },
                    game: this.getGameService(room.gameType).getGameWithActions(room.game.id),
                },
            });

            // Send room data to joining player
            this.sendMessage(ws, {
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_JOINED,
                data: {
                    room: this.roomToResponse(room),
                    game: this.getGameService(room.gameType).getGameWithActions(room.game.id),
                },
            });

            // Check if we have enough players to start the game
            if (room.game.players.length >= 2 && !room.isActive) {
                const gameService = this.getGameService(room.gameType);
                const startedGame = gameService.startGame(room.game.id);
                const gameWithHand = gameService.dealNewHand(startedGame.id);
                this.roomService.updateRoomGame(roomId, gameWithHand);
                this.roomService.setRoomActive(roomId, true);

                // Update room reference
                room.game = gameWithHand;
                room.isActive = true;

                this.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.GAME_STARTED,
                    data: {
                        room: this.roomToResponse(room),
                        game: gameService.getGameWithActions(gameWithHand.id),
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

    /**
     * Handle join room by ID request (for reconnection)
     * @param ws - WebSocket connection
     * @param data - Message data
     * @param roomId - Room ID
     */
    private handleJoinRoomById(ws: any, data: any, roomId?: string): void {
        if (!roomId) {
            this.sendError(ws, "Room ID required");
            return;
        }

        const { playerId } = data;

        if (!playerId) {
            this.sendError(ws, "Player ID required");
            return;
        }

        try {
            const { password } = data;

            // Check if player is already in the room before joining
            const existingRoom = this.roomService.getRoom(roomId);
            const wasAlreadyInRoom = existingRoom?.game?.players?.some((p: any) => p.id === playerId) || false;

            const room = this.roomService.joinRoomById(roomId, playerId, password);
            if (!room) {
                this.sendError(ws, "Sala no encontrada, room is full, or invalid password");
                return;
            }

            // Store player connection
            this.playerConnections.set(playerId, ws);
            this.roomService.addConnection(roomId, playerId, ws);

            // Notify all players in room about the new player (if it's a new player)
            if (!wasAlreadyInRoom && room.game) {
                // This is a new player joining via direct link
                this.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.PLAYER_JOINED,
                    data: {
                        player: { id: playerId, name: `Player-${playerId.slice(-6)}` },
                        game: this.getGameService(room.gameType).getGameWithActions(room.game.id),
                    },
                });

                // Check if we have enough players to start the game
                if (room.game.players.length >= 2 && !room.isActive) {
                    const gameService = this.getGameService(room.gameType);
                    const startedGame = gameService.startGame(room.game.id);
                    const gameWithHand = gameService.dealNewHand(startedGame.id);
                    this.roomService.updateRoomGame(roomId, gameWithHand);
                    this.roomService.setRoomActive(roomId, true);

                    // Update room reference
                    room.game = gameWithHand;
                    room.isActive = true;

                    this.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.GAME_STARTED,
                        data: {
                            room: this.roomToResponse(room),
                            game: gameService.getGameWithActions(gameWithHand.id),
                        },
                    });
                }
            }

            // Send room data to joining player
            this.sendMessage(ws, {
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_JOINED,
                data: {
                    room: this.roomToResponse(room),
                    game: room.game ? this.getGameService(room.gameType).getGameWithActions(room.game.id) : null,
                },
            });
        } catch (error) {
            console.error("Error in handleJoinRoomById:", error);
            this.sendError(ws, "Internal server error");
        }
    }

    /**
     * Handle get room info request
     * @param ws - WebSocket connection
     * @param roomId - Room ID
     */
    private handleGetRoomInfo(ws: any, roomId?: string): void {
        if (!roomId) {
            this.sendError(ws, "Room ID required");
            return;
        }

        try {
            const room = this.roomService.getRoom(roomId);
            if (!room) {
                this.sendError(ws, "Sala no encontrada");
                return;
            }

            // Send room info (without sensitive data like password)
            this.sendMessage(ws, {
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_INFO,
                data: {
                    room: {
                        id: room.id,
                        name: room.name,
                        maxPlayers: room.maxPlayers,
                        players: room.game?.players || [],
                        isActive: room.isActive,
                        isPrivate: room.isPrivate,
                        maxScore: room.maxScore,
                        createdAt: room.createdAt,
                    },
                },
            });
        } catch (error) {
            console.error("Error in handleGetRoomInfo:", error);
            this.sendError(ws, "Internal server error");
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
    // MESSAGE SENDING
    // ============================================================================

    private sendMessage(ws: any, message: any): void {
        if (ws.readyState === 1) {
            // WebSocket.OPEN
            try {
                ws.send(JSON.stringify(message));
                console.log(`📤 Sent message: ${message.type} to connection`);
            } catch (error) {
                console.error("❌ Error sending message:", error);
                console.error("❌ Message:", message);
            }
        } else {
            console.warn(`⚠️ Cannot send message to closed connection. State: ${ws.readyState}`);
        }
    }

    private sendError(ws: any, message: string): void {
        this.sendMessage(ws, {
            type: WEBSOCKET_MESSAGE_TYPES.ERROR,
            data: { message },
        });
    }

    private broadcastToAll(message: any): void {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;
        let failedCount = 0;

        this.playerConnections.forEach((ws, playerId) => {
            if (ws.readyState === 1) {
                // WebSocket.OPEN
                try {
                    ws.send(messageStr);
                    sentCount++;
                } catch (error) {
                    console.error(`❌ Error broadcasting to player ${playerId}:`, error);
                    failedCount++;
                }
            } else {
                console.warn(`⚠️ Skipping closed connection for player ${playerId}. State: ${ws.readyState}`);
                failedCount++;
            }
        });

        console.log(`📡 Broadcast complete: ${sentCount} sent, ${failedCount} failed`);
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
    // PUBLIC METHODS FOR GAME HANDLERS
    // ============================================================================

    /**
     * Allow game handlers to broadcast to a room
     */
    public broadcastToRoom(roomId: string, message: any): void {
        const connections = this.roomService.getRoomConnections(roomId);
        const messageStr = JSON.stringify(message);
        let sentCount = 0;
        let failedCount = 0;

        console.log(`📡 Broadcasting to room ${roomId}: ${message.type} to ${connections.size} connections`);

        connections.forEach((ws, playerId) => {
            if (ws.readyState === 1) {
                // WebSocket.OPEN
                try {
                    ws.send(messageStr);
                    sentCount++;
                } catch (error) {
                    console.error(`❌ Error broadcasting to player ${playerId} in room ${roomId}:`, error);
                    failedCount++;
                }
            } else {
                console.warn(`⚠️ Skipping closed connection for player ${playerId} in room ${roomId}. State: ${ws.readyState}`);
                failedCount++;
            }
        });

        console.log(`📡 Room broadcast complete: ${sentCount} sent, ${failedCount} failed`);
    }

    /**
     * Broadcast to all players in a room EXCEPT the specified player
     */
    public broadcastToRoomExcept(roomId: string, excludePlayerId: string, message: any): void {
        const connections = this.roomService.getRoomConnections(roomId);
        const messageStr = JSON.stringify(message);
        let sentCount = 0;
        let failedCount = 0;

        console.log(`📡 Broadcasting to room ${roomId} (except ${excludePlayerId}): ${message.type} to ${connections.size - 1} connections`);

        connections.forEach((ws, playerId) => {
            if (playerId === excludePlayerId) {
                console.log(`📡 Skipping player ${playerId} (excluded)`);
                return; // Skip this player
            }

            if (ws.readyState === 1) {
                // WebSocket.OPEN
                try {
                    ws.send(messageStr);
                    sentCount++;
                } catch (error) {
                    console.error(`❌ Error broadcasting to player ${playerId} in room ${roomId}:`, error);
                    failedCount++;
                }
            } else {
                console.warn(`⚠️ Skipping closed connection for player ${playerId} in room ${roomId}. State: ${ws.readyState}`);
                failedCount++;
            }
        });

        console.log(`📡 Room broadcast complete: ${sentCount} sent, ${failedCount} failed`);
    }
}
