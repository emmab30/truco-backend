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
    const pingInterval = setInterval(() => {
        if (!isAlive) {
            console.log(`💀 Connection is dead, terminating`);
            clearInterval(pingInterval);
            ws.terminate();
            return;
        }

        isAlive = false;
        try {
            ws.ping();
        } catch (error) {
            console.error("❌ Error sending ping:", error);
            clearInterval(pingInterval);
        }
    }, 30000); // Ping every 30 seconds

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
        console.log("🏓 Pong received - connection is alive");
        isAlive = true;
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
});

// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully");
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
});

export { app, server, wsService };
