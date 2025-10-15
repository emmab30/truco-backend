// ============================================================================
// TRUCO AI SERVICE
// Service to handle the actions of the AI in the Truco game
// ============================================================================

import { Game, Player, EnvidoResponse, TrucoResponse } from "@/shared/types/truco";
import { TrucoAI, AIAction } from "./aiPlayer";
import { playCard, callEnvido, respondEnvido, callTruco, respondTruco, goToMazo } from "@/game/truco/logic/gameLogic";

export type AIDifficulty = "hard";

export class TrucoAIService {
    private aiPlayers: Map<string, TrucoAI> = new Map();
    private aiCounter: number = 0; // Counter to ensure unique IDs and names

    /**
     * Creates an IA player and adds it to the game
     */
    createAIPlayer(game: Game): Player {
        this.aiCounter++;
        const aiId = `ia_${Date.now()}_${this.aiCounter}_${Math.random().toString(36).substr(2, 9)}`;
        const ai = new TrucoAI(aiId);

        this.aiPlayers.set(aiId, ai);

        // Pass player count to get unique AI name
        const playerCount = game.players.length;

        const aiPlayer: Player = {
            id: aiId,
            name: ai.getAIName(playerCount),
            team: 1, // IA siempre en equipo 1 (will be overridden by caller)
            position: game.players.length,
            cards: [],
            isDealer: false,
            isMano: false,
            isActive: true,
            score: 0,
            points: 0,
            envidoScore: 0,
            hasPlayedCard: false,
            wentToMazo: false,
            availableActions: [],
        };

        return aiPlayer;
    }

    /**
     * Executes the action of the IA
     */
    async executeAIAction(game: Game, playerId: string, precomputedAction?: any): Promise<Game> {
        const ai = this.aiPlayers.get(playerId);
        if (!ai) {
            console.log(`❌ IA not found for player ${playerId}`);
            return game;
        }

        // Simulate thinking time of the IA
        const thinkingTime = this.getThinkingTime(ai);
        await this.delay(thinkingTime);

        // Use precomputed action if provided, otherwise compute it
        const action = precomputedAction || ai.makeDecision(game);
        if (!action) {
            console.log(`❌ IA ${playerId} cannot decide action`);
            return game;
        }

        console.log(`🤖 IA ${playerId} - Acción: ${action.type} - ${action.reason}`);

        try {
            switch (action.type) {
                case "play":
                    return await this.handlePlayAction(game, playerId, action);
                case "envido":
                    return await this.handleEnvidoAction(game, playerId, action);
                case "truco":
                    return await this.handleTrucoAction(game, playerId, action);
                case "respond":
                    return await this.handleRespondAction(game, playerId, action);
                case "mazo":
                    return await this.handleMazoAction(game, playerId);
                default:
                    console.log(`❌ Action type not recognized: ${action.type}`);
                    return game;
            }
        } catch (error) {
            console.error(`❌ Error executing IA action:`, error);
            return game;
        }
    }

    /**
     * Handles the action of playing a card
     */
    private async handlePlayAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        if (!action.cardId) {
            console.log(`❌ Card ID not specified for play action`);
            return game;
        }

        return playCard(game, playerId, action.cardId);
    }

    /**
     * Handles the action of calling envido
     */
    private async handleEnvidoAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        if (!action.envidoCall) {
            console.log(`❌ Envido call not specified`);
            return game;
        }

        return callEnvido(game, playerId, action.envidoCall);
    }

    /**
     * Handles the action of calling truco
     */
    private async handleTrucoAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        if (!action.trucoCall) {
            console.log(`❌ Truco call not specified`);
            return game;
        }

        return callTruco(game, playerId, action.trucoCall);
    }

    /**
     * Handles the action of responding to envido or truco
     */
    private async handleRespondAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        if (!action.response) {
            console.log(`❌ Response not specified`);
            return game;
        }

        const currentHand = game.currentHand;
        if (!currentHand) return game;

        // Check if responding to envido or truco
        if (game.phase === "envido") {
            const response = action.response === "quiero" ? EnvidoResponse.QUIERO : EnvidoResponse.NO_QUIERO;
            return respondEnvido(game, playerId, response);
        }

        if (game.phase === "truco") {
            const response = action.response === "quiero" ? TrucoResponse.QUIERO : TrucoResponse.NO_QUIERO;
            return respondTruco(game, playerId, response);
        }

        return game;
    }

    /**
     * Handles the action of going to mazo
     */
    private async handleMazoAction(game: Game, playerId: string): Promise<Game> {
        return goToMazo(game, playerId);
    }

    /**
     * Gets the thinking time for the AI
     */
    private getThinkingTime(_ai: TrucoAI): number {
        const baseTime = 250; // 250ms base
        const randomVariation = Math.random() * 250; // 0-250ms adicional
        return baseTime + 500 + randomVariation; // +500ms para simular pensamiento profundo
    }

    /**
     * Delay utility
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Checks if a player is an IA
     */
    isAIPlayer(playerId: string): boolean {
        return this.aiPlayers.has(playerId);
    }

    /**
     * Gets the IA of a player
     */
    getAI(playerId: string): TrucoAI | undefined {
        return this.aiPlayers.get(playerId);
    }

    /**
     * Removes an IA player
     */
    removeAIPlayer(playerId: string): void {
        this.aiPlayers.delete(playerId);
    }

    /**
     * Gets the thinking message of the IA
     */
    getAIThinkingMessage(playerId: string): string {
        const ai = this.aiPlayers.get(playerId);
        if (!ai) return "🤔 Pensando...";

        return ai.getThinkingMessage({ type: "play", priority: 1, reason: "Pensando..." });
    }

    /**
     * Clears all IAs
     */
    clearAllAI(): void {
        this.aiPlayers.clear();
    }
}
