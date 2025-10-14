import dotenv from "dotenv";
// Load environment variables
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { SERVER_CONFIG } from "@/shared/constants";
import { WebSocketService } from "@/services/websocketService";
import { TrucoGameService } from "@/services/trucoGameService";
import { ChinchonGameService } from "@/services/chinchonGameService";
import { RoomService } from "@/services/roomService";
import { apiRoutes } from "@/routes/api";

// ============================================================================
// EXPRESS SERVER SETUP
// ============================================================================

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(
    cors({
        origin: SERVER_CONFIG.corsOrigin,
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API routes
app.use("/api", apiRoutes);

// ============================================================================
// WEBSOCKET SERVER SETUP
// ============================================================================

const wss = new WebSocketServer({
    server,
    path: "/ws",
});

// Initialize services
const trucoGameService = new TrucoGameService();
const chinchonGameService = new ChinchonGameService();
const roomService = new RoomService(trucoGameService, chinchonGameService);
const wsService = new WebSocketService(trucoGameService, chinchonGameService, roomService);

// WebSocket connection handling
wss.on("connection", (ws, req) => {
    console.log(`🔌 New WebSocket connection from ${req.socket.remoteAddress}`);
    console.log(`📊 Total connections: ${wss.clients.size}`);

    // Set up ping/pong for connection health
    let isAlive = true;
    let missedPings = 0;
    const PING_INTERVAL = 30000; // 30 seconds
    const MAX_MISSED_PINGS = 3; // Allow 3 missed pings before terminating
    
    const pingInterval = setInterval(() => {
        if (!isAlive) {
            missedPings++;
            console.log(`⚠️ Missed ping response (${missedPings}/${MAX_MISSED_PINGS})`);
            
            if (missedPings >= MAX_MISSED_PINGS) {
                console.log(`💀 Connection is dead after ${missedPings} missed pings, terminating`);
                clearInterval(pingInterval);
                ws.terminate();
                return;
            }
        } else {
            // Reset missed pings if we got a response
            if (missedPings > 0) {
                console.log(`✅ Connection recovered after ${missedPings} missed ping(s)`);
                missedPings = 0;
            }
        }

        isAlive = false;
        try {
            ws.ping();
        } catch (error) {
            console.error("❌ Error sending ping:", error);
            clearInterval(pingInterval);
        }
    }, PING_INTERVAL);

    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`📨 Received message: ${message.type} from ${message.playerId || "unknown"}`);
            wsService.handleMessage(ws, message);
        } catch (error) {
            console.error("❌ Error parsing WebSocket message:", error);
            console.error("📄 Raw data:", data.toString());
            try {
                ws.send(
                    JSON.stringify({
                        type: "ERROR",
                        data: { message: "Invalid message format" },
                    })
                );
            } catch (sendError) {
                console.error("❌ Error sending error message:", sendError);
            }
        }
    });

    ws.on("close", (code, reason) => {
        console.log(`👋 WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
        console.log(`📊 Remaining connections: ${wss.clients.size}`);
        clearInterval(pingInterval);
        wsService.handleDisconnect(ws);
    });

    ws.on("error", (error: any) => {
        console.error("❌ WebSocket error:", error);
        console.error("❌ Error details:", {
            message: error.message,
            code: error.code,
            type: error.type,
            target: error.target?.readyState,
        });
        clearInterval(pingInterval);
    });

    // Handle pong responses
    ws.on("pong", () => {
        // Only log if we had missed pings
        if (missedPings > 0 || !isAlive) {
            console.log("🏓 Pong received - connection is alive");
        }
        isAlive = true;
        missedPings = 0;
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = SERVER_CONFIG.port;
const HOST = SERVER_CONFIG.host;

server.listen(PORT, HOST, () => {
    console.log(`🚀 Server started successfully!`);
    console.log(`   📡 HTTP: http://${HOST}:${PORT}`);
    console.log(`   🔌 WebSocket: ws://${HOST}:${PORT}/ws`);
    console.log(`   🌐 CORS: ${SERVER_CONFIG.corsOrigin}`);
    
    // Start room cleanup job (runs every minute)
    const CLEANUP_INTERVAL = 1 * 60 * 1000; // 1 minute
    const cleanupInterval = setInterval(() => {
        const stats = roomService.getRoomStats();
        console.log(`🧹 Running room cleanup... Stats: ${stats.totalRooms} rooms (${stats.activeRooms} active, ${stats.emptyRooms} empty) | ${stats.totalPlayers} players`);
        const cleanedCount = roomService.cleanupEmptyRooms();
        if (cleanedCount > 0) {
            console.log(`✅ Cleanup complete: removed ${cleanedCount} empty room(s)`);
        }
    }, CLEANUP_INTERVAL);
    
    // Store cleanup interval reference for graceful shutdown
    (server as any).cleanupInterval = cleanupInterval;
    
    console.log(`   🧹 Room cleanup enabled (runs every ${CLEANUP_INTERVAL / 60000} minutes)`);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function gracefulShutdown(signal: string) {
    console.log(`${signal} received, shutting down gracefully`);
    
    // Stop cleanup interval
    if ((server as any).cleanupInterval) {
        clearInterval((server as any).cleanupInterval);
        console.log("Room cleanup interval stopped");
    }
    
    // Close WebSocket Server first
    console.log("Closing WebSocket connections...");
    wss.clients.forEach((ws) => {
        ws.close(1000, "Server shutting down");
    });
    
    // Close WebSocket Server
    wss.close(() => {
        console.log("WebSocket server closed");
        
        // Then close HTTP server
        server.close(() => {
            console.log("HTTP server closed");
            process.exit(0);
        });
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("UNHANDLED_REJECTION");
});

export { app, server, wsService };
