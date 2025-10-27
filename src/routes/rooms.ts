import { Router } from "express";
import { authenticateToken, AuthenticatedRequest } from "@/middleware/auth";
import { RoomService } from "@/services/roomService";

export default function roomRoutes(roomService: RoomService) {
    const router = Router();

    /**
     * GET /api/rooms/:id
     * Get room details by ID (excluding password)
     */
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

    /*
    POST /api/rooms
    Create a new room with the given parameters
    */
    router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: any) => {
        try {
            const userId = req.user?.uid;
            const { name, maxPlayers, isPrivate, password, maxScore, gameType, hasAI, aiDifficulty } = req.body;

            // Validaciones
            if (!name || !maxPlayers) {
                return res.status(400).json({
                    success: false,
                    error: "Name and maxPlayers are required",
                });
            }

            if (isPrivate && !password) {
                return res.status(400).json({
                    success: false,
                    error: "Password is required for private rooms",
                });
            }

            // Crear la sala usando el servicio
            const room = await roomService.createRoomHTTP({
                roomName: name,
                playerName: req.user?.name,
                playerId: req.user?.uid,
                playerPhoto: req.user?.picture,
                maxPlayers,
                isPrivate: isPrivate || false,
                password: isPrivate ? password : undefined,
                maxScore: maxScore || 15,
                gameType: gameType || "classic",
                hasAI: hasAI || false,
                aiDifficulty: aiDifficulty || "medium",
                creatorId: userId,
            });

            // Generar el string de conexión WebSocket
            // Formato: ws://tu-dominio/ws?roomId=xxx&token=xxx
            const protocol = process.env["NODE_ENV"] === "production" ? "wss" : "ws";
            const host = req.get("host") || "localhost:3000";
            const token = req.headers.authorization?.split(" ")[1]; // Obtener el token del header

            const wsConnectionString = `${protocol}://${host}/ws?roomId=${room.id}&token=${token}`;

            return res.status(201).json({
                success: true,
                message: "Room created successfully",
                data: {
                    roomId: room.id,
                    wsConnectionString,
                    room: {
                        id: room.id,
                        name: room.name,
                        maxPlayers: room.maxPlayers,
                        isPrivate: room.isPrivate,
                        maxScore: room.maxScore,
                        gameType: room.gameType,
                        hasAI: room.hasAI,
                        aiDifficulty: room.aiDifficulty,
                    },
                },
            });
        } catch (error) {
            console.error("Error creating room:", error);
            return res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    });

    /*
    POST /api/rooms/:id/join
    Join a room by ID
    */
    /**
     * POST /api/rooms/:id/join
     * Join a room by ID and get wsUrl
     */
    router.post("/:id/join", authenticateToken, async (req: AuthenticatedRequest, res: any) => {
        try {
            const { id } = req.params;
            const { password } = req.body;
            const userId = req.user?.uid;
            const userName = req.user?.name || req.user?.email || "Player";
            const userPhoto = req.user?.picture || null;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: "Unauthorized",
                });
            }

            // Verificar que la sala existe
            const room = roomService.getRoom(id as string);
            if (!room) {
                return res.status(404).json({
                    success: false,
                    error: "Room not found",
                });
            }

            // Verificar si el jugador ya está en la sala
            const existingPlayer = room.game.players.find((p: any) => p.id === userId);

            if (!existingPlayer) {
                // Verificar si la sala está llena
                const currentPlayers = room.game.players.length;
                if (currentPlayers >= room.maxPlayers) {
                    return res.status(400).json({
                        success: false,
                        error: "Room is full",
                    });
                }

                // Verificar password si es sala privada
                if (room.isPrivate && room.password !== password) {
                    return res.status(403).json({
                        success: false,
                        error: "Invalid password",
                    });
                }

                // Agregar jugador a la sala
                const joinedRoom = roomService.joinRoom(id as string, userName, userId, password as string, userPhoto);
                if (!joinedRoom) {
                    return res.status(400).json({
                        success: false,
                        error: "Failed to join room",
                    });
                }
            }

            // Generar wsUrl
            const protocol = process.env["NODE_ENV"] === "production" ? "wss" : "ws";
            const host = req.get("host") || "localhost:3000";
            const token = req.headers.authorization?.split(" ")[1];

            const wsUrl = `${protocol}://${host}/ws?roomId=${room.id}&token=${token}`;

            return res.status(200).json({
                success: true,
                message: existingPlayer ? "Reconnecting to room" : "Ready to join room",
                data: {
                    roomId: room.id,
                    wsUrl,
                    room: {
                        id: room.id,
                        name: room.name,
                        maxPlayers: room.maxPlayers,
                        currentPlayers: room.game.players.length,
                        maxScore: room.maxScore,
                        gameType: room.gameType,
                        players: room.game.players.map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            photo: p.photo,
                            team: p.team,
                        })),
                    },
                },
            });
        } catch (error) {
            console.error("Error joining room:", error);
            return res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    });

    return router;
}
