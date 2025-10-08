import { Router } from "express";
import { GameService } from "../services/gameService";
import { RoomService } from "../services/roomService";
import { ApiResponse, RoomResponse, GameResponse } from "../types";
import authRoutes from "./auth";
// import { optionalAuth } from "../middleware/auth";

const router = Router();

// Initialize services
const gameService = new GameService();
const roomService = new RoomService(gameService);

// ============================================================================
// AUTH ROUTES
// ============================================================================
router.use('/auth', authRoutes);

// ============================================================================
// ROOM ROUTES
// ============================================================================

/**
 * GET /api/rooms
 * Get all available rooms
 */
router.get("/rooms", (_req, res) => {
    try {
        const rooms = roomService.getAllRooms();
        const response: ApiResponse<RoomResponse[]> = {
            success: true,
            data: rooms,
        };
        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            error: "Failed to get rooms",
        };
        res.status(500).json(response);
        return;
    }
});

/**
 * GET /api/rooms/:id
 * Get room by ID
 */
router.get("/rooms/:id", (req: any, res: any) => {
    try {
        const { id } = req.params;
        const room = roomService.getRoom(id);

        if (!room) {
            const response: ApiResponse = {
                success: false,
                error: "Room not found",
            };
            return res.status(404).json(response);
        }

        const response: ApiResponse<RoomResponse> = {
            success: true,
            data: {
                id: room.id,
                name: room.name,
                maxPlayers: room.maxPlayers,
                players: room.game.players,
                isActive: room.isActive,
                createdAt: room.createdAt,
                game: room.game,
                isPrivate: room.isPrivate,
                maxScore: room.maxScore,
                gameType: room.gameType,
            },
        };
        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            error: "Failed to get room",
        };
        res.status(500).json(response);
        return;
    }
});

/**
 * POST /api/rooms
 * Create a new room
 */
router.post("/rooms", (req: any, res: any) => {
    try {
        const { roomName, playerName, playerId, maxPlayers = 2, isPrivate = false, password, maxScore = 15 } = req.body;

        if (!roomName || !playerName || !playerId) {
            const response: ApiResponse = {
                success: false,
                error: "Missing required fields: roomName, playerName, playerId",
            };
            return res.status(400).json(response);
        }

        // Validate maxScore
        if (maxScore !== 15 && maxScore !== 30) {
            const response: ApiResponse = {
                success: false,
                error: "maxScore must be 15 or 30",
            };
            return res.status(400).json(response);
        }

        // Validate password for private rooms
        if (isPrivate && !password) {
            const response: ApiResponse = {
                success: false,
                error: "Password is required for private rooms",
            };
            return res.status(400).json(response);
        }

        const room = roomService.createRoom(roomName, playerName, playerId, maxPlayers, isPrivate, password, maxScore);

        const response: ApiResponse<RoomResponse> = {
            success: true,
            data: {
                id: room.id,
                name: room.name,
                maxPlayers: room.maxPlayers,
                players: room.game.players,
                isActive: room.isActive,
                createdAt: room.createdAt,
                game: room.game,
                isPrivate: room.isPrivate,
                maxScore: room.maxScore,
                gameType: room.gameType,
            },
        };
        res.status(201).json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            error: "Failed to create room",
        };
        res.status(500).json(response);
        return;
    }
});

/**
 * POST /api/rooms/:id/join
 * Join a room
 */
router.post("/rooms/:id/join", (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { playerName, playerId, password } = req.body;

        if (!playerName || !playerId) {
            const response: ApiResponse = {
                success: false,
                error: "Missing required fields: playerName, playerId",
            };
            return res.status(400).json(response);
        }

        const room = roomService.joinRoom(id, playerName, playerId, password);

        if (!room) {
            const response: ApiResponse = {
                success: false,
                error: "Failed to join room (room full, not found, or incorrect password)",
            };
            return res.status(400).json(response);
        }

        const response: ApiResponse<RoomResponse> = {
            success: true,
            data: {
                id: room.id,
                name: room.name,
                maxPlayers: room.maxPlayers,
                players: room.game.players,
                isActive: room.isActive,
                createdAt: room.createdAt,
                game: room.game,
                isPrivate: room.isPrivate,
                maxScore: room.maxScore,
                gameType: room.gameType,
            },
        };
        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            error: "Failed to join room",
        };
        res.status(500).json(response);
        return;
    }
});

// ============================================================================
// GAME ROUTES
// ============================================================================

/**
 * GET /api/games/:id
 * Get game by ID
 */
router.get("/games/:id", (req, res) => {
    try {
        const { id } = req.params;
        const game = gameService.getGameWithActions(id);

        const response: ApiResponse<GameResponse> = {
            success: true,
            data: game,
        };
        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            error: "Game not found",
        };
        res.status(404).json(response);
    }
});

/**
 * POST /api/games/:id/start
 * Start a game
 */
router.post("/games/:id/start", (req, res) => {
    try {
        const { id } = req.params;
        const game = gameService.startGame(id);

        const response: ApiResponse<GameResponse> = {
            success: true,
            data: gameService.getGameWithActions(game.id),
        };
        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            error: "Failed to start game",
        };
        res.status(500).json(response);
        return;
    }
});

/**
 * POST /api/games/:id/deal-hand
 * Deal a new hand
 */
router.post("/games/:id/deal-hand", (req, res) => {
    try {
        const { id } = req.params;
        const game = gameService.dealNewHand(id);

        const response: ApiResponse<GameResponse> = {
            success: true,
            data: gameService.getGameWithActions(game.id),
        };
        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            error: "Failed to deal new hand",
        };
        res.status(500).json(response);
        return;
    }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/health", (_req, res) => {
    const response: ApiResponse = {
        success: true,
        data: {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            rooms: roomService.getAllRooms().length,
            games: gameService.getAllGames().length,
        },
    };
    res.json(response);
});

export { router as apiRoutes };
