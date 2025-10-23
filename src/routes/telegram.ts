import { Router } from "express";
import axios from "axios";

const router = Router();

/**
 * POST /api/telegram/prepared-message
 * Create a prepared message for Telegram sharing
 */
router.post("/prepared-message", async (req, res) => {
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

export default router;
