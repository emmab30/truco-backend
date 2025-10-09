// ============================================================================
// SERVER CONFIGURATION
// Constantes de configuración del servidor
// ============================================================================

import { ServerConfig } from "@/shared/types";

export const SERVER_CONFIG: ServerConfig = {
    port: parseInt(process.env["PORT"] || "3001", 10),
    host: process.env["HOST"] || "localhost",
    corsOrigin: process.env["CORS_ORIGIN"] || "http://localhost:3001",
};

// Delays y timeouts
export const GAME_DELAY_NEW_HAND = 5000; // 5 seconds

