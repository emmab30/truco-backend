import { WebSocketMessage } from "@/shared/types";

/**
 * Base interface for game-specific WebSocket handlers
 * Each game type (truco, chinchon, etc.) will implement this interface
 */
export interface BaseGameHandler {
    /**
     * Get the game type this handler manages
     */
    getGameType(): string;

    /**
     * Handle WebSocket messages specific to this game type
     * @param ws - WebSocket connection
     * @param message - WebSocket message
     * @param roomId - Room ID
     * @param playerId - Player ID
     */
    handleMessage(ws: any, message: WebSocketMessage, roomId?: string, playerId?: string): void;

    /**
     * Get list of message types this handler can process
     */
    getSupportedMessageTypes(): string[];
}

/**
 * Abstract base class for game handlers with common functionality
 */
export abstract class AbstractGameHandler implements BaseGameHandler {
    abstract getGameType(): string;
    abstract handleMessage(ws: any, message: WebSocketMessage, roomId?: string, playerId?: string): void;
    abstract getSupportedMessageTypes(): string[];

    /**
     * Check if this handler can process the given message type
     */
    canHandle(messageType: string): boolean {
        return this.getSupportedMessageTypes().includes(messageType);
    }

    /**
     * Send a message through WebSocket
     */
    protected sendMessage(ws: any, message: any): void {
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send error message
     */
    protected sendError(ws: any, message: string): void {
        this.sendMessage(ws, {
            type: "ERROR",
            data: { message },
        });
    }
}