import { Router } from "express";
import { TrucoGameService } from "@/services/trucoGameService";
import { ChinchonGameService } from "@/services/chinchonGameService";
import { RoomService } from "@/services/roomService";
import authRoutes from "@/routes/auth";
// import { optionalAuth } from "../middleware/auth";

export function createApiRoutes(trucoGameService: TrucoGameService, _chinchonGameService: ChinchonGameService, roomService: RoomService) {
    const router = Router();

// ============================================================================
// AUTH ROUTES
// ============================================================================
router.use("/auth", authRoutes);

// ============================================================================
// ROOMS ROUTES
// ============================================================================

/**
 * GET /api/rooms/:id
 * Get room details by ID (excluding password)
 */
router.get("/rooms/:id", (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Room ID is required"
            });
        }

        console.log(`Rooms`, roomService.getAllRooms());
        const room = roomService.getRoom(id);
        
        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Room not found"
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
            players: room.game?.players?.map((player: any) => ({
                id: player.id,
                name: player.name,
                photo: player.photo,
                team: player.team,
                points: player.points
            })) || []
        };

        return res.json({
            success: true,
            data: roomResponse
        });
    } catch (error) {
        console.error("Error getting room:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
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
    const response = {
        success: true,
        data: {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            rooms: roomService.getAllRooms().length,
            games: trucoGameService.getAllGames().length,
        },
    };
    res.json(response);
});

    return router;
}
