import { Router } from "express";
import { TrucoGameService } from "@/services/trucoGameService";
import { ChinchonGameService } from "@/services/chinchonGameService";
import { RoomService } from "@/services/roomService";
import { WebSocketService } from "@/services/websocketService";
import authRoutes from "@/routes/auth";
import statsRoutes from "@/routes/stats";
import roomRoutes from "@/routes/rooms";
import telegramRoutes from "@/routes/telegram";
import healthRoutes from "@/routes/health";

export function createApiRoutes(
    trucoGameService: TrucoGameService,
    chinchonGameService: ChinchonGameService,
    roomService: RoomService,
    webSocketService: WebSocketService
) {
    const router = Router();

    // ============================================================================
    // AUTH ROUTES
    // ============================================================================
    router.use("/auth", authRoutes);

    // ============================================================================
    // STATS ROUTES
    // ============================================================================
    router.use("/stats", statsRoutes);

    // ============================================================================
    // ROOMS ROUTES
    // ============================================================================
    router.use("/rooms", roomRoutes(roomService, webSocketService, trucoGameService, chinchonGameService));

    // ============================================================================
    // TELEGRAM ROUTES
    // ============================================================================
    router.use("/telegram", telegramRoutes);

    // ============================================================================
    // HEALTH ROUTES
    // ============================================================================
    router.use("/health", healthRoutes);

    return router;
}
