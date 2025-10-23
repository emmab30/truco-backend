import { Router } from "express";
import prisma from "@/config/prisma";
import { formatPlayerName } from "@/shared/utils";

const router = Router();

router.get("/", async (_, res) => {
    try {
        // 1. Número de juegos en las últimas 24 horas
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const gamesCount = await prisma.playedGame.count({
            where: {
                createdAt: {
                    gte: last24Hours,
                },
            },
        });

        // 2. Número de jugadores totales (usuarios únicos que han jugado)
        const totalPlayers = await prisma.user.count();

        // 3. Jugador con más partidas ganadas en las últimas 24 horas
        const topWinner = await prisma.playedGame.groupBy({
            by: ["userId"],
            where: {
                createdAt: {
                    gte: last24Hours,
                },
                status: "win",
            },
            _count: {
                userId: true,
            },
            orderBy: {
                _count: {
                    userId: "desc",
                },
            },
            take: 1,
        });

        // Si quieres obtener la info completa del usuario ganador:
        let topWinnerWithUser = null;
        if (topWinner.length > 0) {
            const winnerData = topWinner[0];
            const user = await prisma.user.findUnique({
                where: { id: winnerData?.userId || "" },
                select: {
                    id: true,
                    name: true,
                    picture: true,
                },
            });

            topWinnerWithUser = {
                user: {
                    id: user?.id || "",
                    name: formatPlayerName(user?.name || ""),
                    picture: user?.picture || "",
                },
                wins: winnerData?._count.userId || 0,
            };
        }

        return res.json({
            success: true,
            data: {
                numberOfPlayers: totalPlayers,
                totalGames: gamesCount,
                topWinner: topWinnerWithUser,
            },
        });
    } catch (error) {
        console.error("Error getting stats:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

export default router;
