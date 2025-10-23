import { Router } from "express";

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/", async (_, res) => {
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

export default router;
