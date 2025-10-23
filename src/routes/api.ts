import { Router } from "express";
import { TrucoGameService } from "@/services/trucoGameService";
import { ChinchonGameService } from "@/services/chinchonGameService";
import { RoomService } from "@/services/roomService";
import authRoutes from "@/routes/auth";
import statsRoutes from "@/routes/stats";
import roomRoutes from "@/routes/rooms";
import telegramRoutes from "@/routes/telegram";
import healthRoutes from "@/routes/health";

export function createApiRoutes(_trucoGameService: TrucoGameService, _chinchonGameService: ChinchonGameService, roomService: RoomService) {
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
    router.use("/rooms", roomRoutes(roomService));

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
