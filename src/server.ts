import dotenv from "dotenv";
// Load environment variables
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { SERVER_CONFIG } from "./constants";
import { WebSocketService } from "./services/websocketService";
import { GameService } from "./services/gameService";
import { RoomService } from "./services/roomService";
import { apiRoutes } from "./routes/api";

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
const gameService = new GameService();
const roomService = new RoomService(gameService);
const wsService = new WebSocketService(gameService, roomService);

// WebSocket connection handling
wss.on("connection", (ws) => {
    console.log("New WebSocket connection");

    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data.toString());
            wsService.handleMessage(ws, message);
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
            ws.send(
                JSON.stringify({
                    type: "ERROR",
                    data: { message: "Invalid message format" },
                })
            );
        }
    });

    ws.on("close", () => {
        console.log("WebSocket connection closed");
        wsService.handleDisconnect(ws);
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = SERVER_CONFIG.port;
const HOST = SERVER_CONFIG.host;

server.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`🚀 WebSocket server running on ws://${HOST}:${PORT}/ws`);
    console.log(`🚀 CORS enabled for: ${SERVER_CONFIG.corsOrigin}`);
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
