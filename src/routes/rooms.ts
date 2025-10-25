import { Router } from "express";
import { RoomService } from "@/services/roomService";
import { WebSocketService } from "@/services/websocketService";
import { TrucoGameService } from "@/services/trucoGameService";
import { ChinchonGameService } from "@/services/chinchonGameService";
import { WEBSOCKET_MESSAGE_TYPES, GameType } from "@/shared/constants";

export default function createRoomRoutes(
    roomService: RoomService,
    webSocketService: WebSocketService,
    trucoGameService: TrucoGameService,
    chinchonGameService: ChinchonGameService
) {
    const router = Router();

    /**
     * Helper to get appropriate game service based on game type
     */
    const getGameService = (gameType: string) => {
        switch (gameType) {
            case GameType.TRUCO:
                return trucoGameService;
            case GameType.CHINCHON:
                return chinchonGameService;
            default:
                return trucoGameService;
        }
    };

    /**
     * Helper to convert room to response format
     */
    const roomToResponse = (room: any) => ({
        id: room.id,
        name: room.name,
        maxPlayers: room.maxPlayers,
        players: room.game.players,
        isActive: room.isActive,
        createdAt: room.createdAt,
        isPrivate: room.isPrivate,
        maxScore: room.maxScore,
        gameType: room.gameType,
    });

    // ============================================================================
    // POST /api/rooms - Create a new room
    // ============================================================================
    router.post("/", async (req, res) => {
        try {
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
                playerPhoto,
            } = req.body;

            // Validation
            if (!roomName || !playerName || !playerId) {
                return res.status(400).json({
                    success: false,
                    error: "roomName, playerName, and playerId are required",
                });
            }

            console.log(`🔵 Creating room via HTTP - Player: ${playerName} (${playerId}), Photo: ${playerPhoto || "none"}`);

            // Create room (creator is automatically added as first player)
            const room = roomService.createRoom(
                roomName,
                playerName,
                playerId,
                maxPlayers,
                isPrivate,
                password,
                maxScore,
                gameType,
                hasAI,
                aiDifficulty,
                playerPhoto
            );

            const gameService = getGameService(room.gameType);

            // If AI mode is enabled, add AI player(s) and start game automatically
            if (hasAI && (gameType === GameType.CHINCHON || gameType === GameType.TRUCO)) {
                console.log(`🤖 Creating AI player(s) for room ${room.id} with difficulty: ${aiDifficulty}, maxPlayers: ${maxPlayers}`);

                // Add AI player(s) to the game
                if (gameType === GameType.TRUCO) {
                    // For Truco, add multiple AI players based on maxPlayers (2 or 4)
                    (gameService as any).addAIPlayersForTeamPlay(room.game.id, maxPlayers);
                } else {
                    // For Chinchón, add multiple AI players based on maxPlayers (2-6)
                    (gameService as any).addAIPlayersForMultiplayer(room.game.id, maxPlayers, aiDifficulty);
                }

                // Start the game immediately
                let startedGame = gameService.startGame(room.game.id);

                // For Truco, we also need to deal the first hand (Chinchón does this automatically in startGame)
                if (gameType === GameType.TRUCO) {
                    startedGame = gameService.dealNewHand(startedGame.id);
                    console.log(`🎴 Dealt first hand for Truco game ${room.id}`);
                }

                roomService.updateRoomGame(room.id, startedGame);
                roomService.setRoomActive(room.id, true);
                room.game = startedGame;
                room.isActive = true;

                console.log(`🎮 AI game started automatically for room ${room.id} with ${maxPlayers} players`);
            }

            // Broadcast room list update to all connected WebSocket clients
            webSocketService.broadcastToAll({
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                data: { rooms: roomService.getAllRooms() },
            });

            // If game was started with AI, trigger AI's first move if needed
            if (hasAI && (gameType === GameType.CHINCHON || gameType === GameType.TRUCO) && room.isActive) {
                // Trigger AI turn check after a short delay to ensure client receives game state first
                setTimeout(() => {
                    const currentRoom = roomService.getRoom(room.id);
                    if (currentRoom?.game?.currentHand) {
                        // For Chinchon, check chinchonState
                        if (gameType === GameType.CHINCHON && currentRoom.game.currentHand.chinchonState?.currentPlayerId?.startsWith("ia_")) {
                            console.log(`🤖 Triggering initial AI turn for Chinchon room ${room.id}`);
                            // AI turn will be handled by game handler through WebSocket
                        }
                        // For Truco, check currentPlayerId
                        else if (gameType === GameType.TRUCO && currentRoom.game.currentHand.currentPlayerId?.startsWith("ia_")) {
                            console.log(`🤖 Triggering initial AI turn for Truco room ${room.id}`);
                            // AI turn will be handled by game handler through WebSocket
                        }
                    }
                }, 500);
            }

            // Return room data to creator
            return res.status(201).json({
                success: true,
                data: {
                    room: roomToResponse(room),
                    game: gameService.getGameUpdate(room.game.id),
                },
            });
        } catch (error: any) {
            console.error("❌ Error creating room:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Error creating room",
            });
        }
    });

    // ============================================================================
    // POST /api/rooms/:id/join - Join an existing room
    // ============================================================================
    router.post("/:id/join", async (req, res) => {
        try {
            const { id: roomId } = req.params;
            const { playerName, playerId, password, playerPhoto } = req.body;

            // Validation
            if (!playerName || !playerId) {
                return res.status(400).json({
                    success: false,
                    error: "playerName and playerId are required",
                });
            }

            console.log(`🔵 Joining room via HTTP - Player: ${playerName} (${playerId}), Photo: ${playerPhoto || "none"}`);

            // Check if this is a reconnection (player already in room)
            const existingRoom = roomService.getRoom(roomId);
            if (!existingRoom) {
                return res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
            }

            const wasAlreadyInRoom = existingRoom.game?.players?.some((p: any) => p.id === playerId) || false;

            // Join room (handles both new joins and reconnections)
            const room = wasAlreadyInRoom
                ? roomService.joinRoomById(roomId, playerId, password, playerName, playerPhoto)
                : roomService.joinRoom(roomId, playerName, playerId, password, playerPhoto);

            if (!room) {
                return res.status(400).json({
                    success: false,
                    error: "Error joining room (room full, not found, or incorrect password)",
                });
            }

            const gameService = getGameService(room.gameType);

            // If this is a NEW player (not reconnection), broadcast to room
            if (!wasAlreadyInRoom) {
                const joinedPlayer = room.game.players.find((p: any) => p.id === playerId);

                // Broadcast to all players in room about the new player
                webSocketService.broadcastToRoom(roomId, {
                    type: WEBSOCKET_MESSAGE_TYPES.PLAYER_JOINED,
                    data: {
                        player: joinedPlayer,
                        game: gameService.getGameUpdate(room.game.id),
                    },
                });

                // Check if we have enough players to start the game
                const shouldStart = room.game.players.length >= room.maxPlayers;

                if (shouldStart && !room.isActive) {
                    const startedGame = gameService.startGame(room.game.id);
                    const gameWithHand = gameService.dealNewHand(startedGame.id);
                    roomService.updateRoomGame(roomId, gameWithHand);
                    roomService.setRoomActive(roomId, true);

                    // Update room reference
                    room.game = gameWithHand;
                    room.isActive = true;

                    // Broadcast game started to all players in room
                    webSocketService.broadcastToRoom(roomId, {
                        type: WEBSOCKET_MESSAGE_TYPES.GAME_STARTED,
                        data: {
                            room: roomToResponse(room),
                            game: gameService.getGameUpdate(gameWithHand.id),
                        },
                    });
                }
            }

            // Broadcast room list update to all connected clients
            webSocketService.broadcastToAll({
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                data: { rooms: roomService.getAllRooms() },
            });

            // Broadcast game update to room
            webSocketService.broadcastGameUpdate(roomId);

            // Return room data to joining player
            return res.status(200).json({
                success: true,
                data: {
                    room: roomToResponse(room),
                    game: room.game ? gameService.getGameUpdate(room.game.id) : null,
                },
            });
        } catch (error: any) {
            console.error("❌ Error joining room:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Error joining room",
            });
        }
    });

    // ============================================================================
    // POST /api/rooms/:id/leave - Leave a room
    // ============================================================================
    router.post("/:id/leave", async (req, res) => {
        try {
            const { id: roomId } = req.params;
            const { playerId } = req.body;

            // Validation
            if (!playerId) {
                return res.status(400).json({
                    success: false,
                    error: "playerId is required",
                });
            }

            console.log(`👋 Player leaving room via HTTP - Player: ${playerId}, Room: ${roomId}`);

            const success = roomService.leaveRoom(playerId);

            if (!success) {
                return res.status(400).json({
                    success: false,
                    error: "Player not in room or room not found",
                });
            }

            // Broadcast room list update to all connected clients
            webSocketService.broadcastToAll({
                type: WEBSOCKET_MESSAGE_TYPES.ROOM_LIST_UPDATED,
                data: { rooms: roomService.getAllRooms() },
            });

            return res.status(200).json({
                success: true,
                message: "Left room successfully",
            });
        } catch (error: any) {
            console.error("❌ Error leaving room:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Error leaving room",
            });
        }
    });

    // ============================================================================
    // GET /api/rooms - Get all rooms
    // ============================================================================
    router.get("/", (req, res) => {
        try {
            const rooms = roomService.getAllRooms();

            return res.json({
                success: true,
                data: { rooms },
            });
        } catch (error: any) {
            console.error("❌ Error getting rooms:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Error getting rooms",
            });
        }
    });

    // ============================================================================
    // GET /api/rooms/:id - Get room details by ID
    // ============================================================================
    router.get("/:id", (req, res) => {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: "Room ID is required",
                });
            }

            const room = roomService.getRoom(id);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
            }

            // Convert room to response format (excluding password and internal data)
            const roomResponse = {
                id: room.id,
                name: room.name,
                maxPlayers: room.maxPlayers,
                isActive: room.isActive,
                createdAt: room.createdAt,
                isPrivate: room.isPrivate,
                maxScore: room.maxScore,
                gameType: room.gameType,
                hasAI: room.hasAI,
                aiDifficulty: room.aiDifficulty,
                // Include basic player info from the game state
                players:
                    room.game?.players?.map((player: any) => ({
                        id: player.id,
                        name: player.name,
                        photo: player.photo,
                        team: player.team,
                        points: player.points,
                    })) || [],
            };

            return res.json({
                success: true,
                data: roomResponse,
            });
        } catch (error) {
            console.error("Error getting room:", error);
            return res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    });

    return router;
}
