import { Router } from "express";
import { RoomService } from "@/services/roomService";

export default function createRoomRoutes(roomService: RoomService) {
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

    return router;
}
