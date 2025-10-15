import { Router } from "express";
import { TrucoGameService } from "@/services/trucoGameService";
import { ChinchonGameService } from "@/services/chinchonGameService";
import { RoomService } from "@/services/roomService";
import authRoutes from "@/routes/auth";
// import { optionalAuth } from "../middleware/auth";

const router = Router();

// Initialize services
const trucoGameService = new TrucoGameService();
const chinchonGameService = new ChinchonGameService();
const roomService = new RoomService(trucoGameService, chinchonGameService);

// ============================================================================
// AUTH ROUTES
// ============================================================================
router.use("/auth", authRoutes);

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

export { router as apiRoutes };
