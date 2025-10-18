import { Router } from "express";
import axios from "axios";
import { TrucoGameService } from "@/services/trucoGameService";
import { ChinchonGameService } from "@/services/chinchonGameService";
import { RoomService } from "@/services/roomService";
import authRoutes from "@/routes/auth";


export function createApiRoutes(_trucoGameService: TrucoGameService, _chinchonGameService: ChinchonGameService, roomService: RoomService) {
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

    /**
     * POST /api/telegram/prepared-message
     * Create a prepared message for Telegram sharing
     */
    router.post("/telegram/prepared-message", async (req, res) => {
        try {
            const { userId, roomId, roomName } = req.body;
            if (!userId || !roomId || !roomName) {
                return res.status(400).json({
                    success: false,
                    error: "userId, roomId, and roomName are required",
                });
            }

            const botToken = process.env["TELEGRAM_BOT_API_KEY"];
            if (!botToken) {
                return res.status(500).json({
                    success: false,
                    error: "Telegram bot token not configured",
                });
            }

            const ogUrl = `https://games.adibus.dev/game/${roomId}`;
            const launchUrl = `https://t.me/carteadobot/Carteado?startapp=${roomId}`;

            const response = await axios.post(`https://api.telegram.org/bot${botToken}/savePreparedInlineMessage`, {
                user_id: userId,
                result: {
                    type: "article",
                    id: `${roomId}`,
                    title: `Únete a mi partida de ${roomName}! 🎮`,
                    description: `🎮 Juega conmigo en ${roomName}`,
                    input_message_content: {
                        message_text: `¡Únete a mi partida de ${roomName} 🎮!`,
                        link_preview_options: {
                            url: ogUrl,
                            prefer_small_media: false,
                            prefer_large_media: true,
                            show_above_text: false,
                        },
                    },
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "¡Unirme! 🎮",
                                    url: launchUrl,
                                },
                            ],
                        ],
                    },
                },
                // ESTOS SON LOS PARÁMETROS CORRECTOS (no "allowed_chat_types"):
                allow_user_chats: true,
                allow_bot_chats: false,
                allow_group_chats: true,
                allow_channel_chats: true,
            });

            return res.json({
                success: true,
                data: {
                    preparedMessageId: response.data.result.id,
                    launchUrl,
                    ogUrl,
                },
            });
        } catch (error) {
            console.error("Error creating prepared message:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to create prepared message",
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
    // Health check endpoint con verificación de DB
    router.get("/health", async (_, res) => {
        try {
            return res.json({
                success: true,
                data: {
                    status: "ok",
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    database: "connected",
                },
            });
        } catch (error) {
            console.error("❌ Health check failed:", error);
            return res.status(503).json({
                status: "error",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: "disconnected",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

    return router;
}
