import { BaseGameHandler } from "@/game/handlers/BaseGameHandler";

/**
 * Registry for managing game-specific handlers
 * Centralizes the management of different game types and their handlers
 */
export class GameHandlerRegistry {
    private handlers: Map<string, BaseGameHandler> = new Map();

    /**
     * Register a game handler
     * @param gameType - Type of game (e.g., 'truco', 'chinchon')
     * @param handler - Game handler instance
     */
    registerHandler(gameType: string, handler: BaseGameHandler): void {
        this.handlers.set(gameType, handler);
        // Handler registered for game type: ${gameType}
    }

    /**
     * Get a game handler by game type
     * @param gameType - Type of game
     * @returns Game handler or undefined if not found
     */
    getHandler(gameType: string): BaseGameHandler | undefined {
        return this.handlers.get(gameType);
    }

    /**
     * Check if a handler exists for a game type
     * @param gameType - Type of game
     * @returns True if handler exists
     */
    hasHandler(gameType: string): boolean {
        return this.handlers.has(gameType);
    }

    /**
     * Get all registered game types
     * @returns Array of game types
     */
    getRegisteredGameTypes(): string[] {
        return Array.from(this.handlers.keys());
    }

    /**
     * Get handler that can process a specific message type
     * @param messageType - WebSocket message type
     * @param gameType - Optional game type to check first
     * @returns Handler that can process the message or undefined
     */
    getHandlerForMessage(messageType: string, gameType?: string): BaseGameHandler | undefined {
        // If gameType is specified, check that handler first
        if (gameType) {
            const handler = this.getHandler(gameType);
            if (handler && (handler as any).canHandle(messageType)) {
                return handler;
            }
        }

        // Otherwise, search through all handlers
        for (const handler of this.handlers.values()) {
            if ((handler as any).canHandle(messageType)) {
                return handler;
            }
        }

        return undefined;
    }

    /**
     * Unregister a game handler
     * @param gameType - Type of game
     */
    unregisterHandler(gameType: string): void {
        if (this.handlers.delete(gameType)) {
            // Handler unregistered for game type: ${gameType}
        }
    }

    /**
     * Clear all handlers
     */
    clear(): void {
        this.handlers.clear();
        // All game handlers cleared
    }

    /**
     * Get handler count
     * @returns Number of registered handlers
     */
    getHandlerCount(): number {
        return this.handlers.size;
    }
}