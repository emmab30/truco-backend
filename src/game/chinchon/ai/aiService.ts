// ============================================================================
// CHINCHÓN AI SERVICE
// Service to handle the actions of the AI in the Chinchón game
// ============================================================================

import { Game, Player } from "@/shared/types/chinchon";
import { ChinchonAI, AIAction } from "./aiPlayer";
import { drawCard, discardCard, cutWithCard, closeRound } from "@/game/chinchon/logic/gameLogic";

export type AIDifficulty = "easy" | "medium" | "hard";

export class ChinchonAIService {
    private aiPlayers: Map<string, ChinchonAI> = new Map();

    /**
     * Creates an IA player and adds it to the game
     */
    createAIPlayer(game: Game, difficulty: AIDifficulty = "medium"): Player {
        const aiId = `ia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const ai = new ChinchonAI(difficulty, aiId);

        this.aiPlayers.set(aiId, ai);
        console.log(`✅ AI Service: Registered AI player ${ai.getAIName()} with ID ${aiId}. Total AIs: ${this.aiPlayers.size}`);

        const aiPlayer: Player = {
            id: aiId,
            name: ai.getAIName(),
            team: 1, // IA siempre en equipo 1
            position: game.players.length,
            cards: [],
            isDealer: false,
            isActive: true,
            score: 0,
            totalScore: 0,
            isEliminated: false,
            availableActions: [],
            points: 0,
        };

        return aiPlayer;
    }

    /**
     * Executes the action of the IA
     */
    async executeAIAction(game: Game, playerId: string): Promise<Game> {
        const ai = this.aiPlayers.get(playerId);
        if (!ai) {
            console.log(`❌ IA not found for player ${playerId}`);
            console.log(`📋 Registered AI IDs: ${Array.from(this.aiPlayers.keys()).join(', ')}`);
            return game;
        }

        // Simulate thinking time of the IA
        const thinkingTime = this.getThinkingTime(ai);
        await this.delay(thinkingTime);

        const action = ai.makeDecision(game);
        if (!action) {
            console.log(`❌ IA ${playerId} cannot decide action`);
            return game;
        }

        try {
            switch (action.type) {
                case "draw":
                    return await this.handleDrawAction(game, playerId, action);
                case "discard":
                    return await this.handleDiscardAction(game, playerId, action);
                case "cut":
                    return await this.handleCutAction(game, playerId, action);
                case "close":
                    return await this.handleCloseAction(game, playerId);
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
     * Handles the action of drawing a card
     */
    private async handleDrawAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        const result = drawCard(game, playerId, action.fromDiscardPile || false);
        return result;
    }

    /**
     * Handles the action of discarding a card
     */
    private async handleDiscardAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        if (!action.cardId) {
            console.log(`❌ Card ID not specified for discard`);
            return game;
        }
        return discardCard(game, playerId, action.cardId);
    }

    /**
     * Handles the action of cutting with a card
     */
    private async handleCutAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        if (!action.cardId) {
            console.log(`❌ Card ID not specified for cut`);
            return game;
        }

        const result = cutWithCard(game, playerId, action.cardId);

        // If the cut failed, check if it's because it can't cut
        if (result === game) {
            // The IA must discard a card instead of cutting
            const player = game.players.find((p) => p.id === playerId);
            if (player && player.cards.length > 0) {
                // Discard the first uncombined card
                const uncombinedCards = this.getUncombinedCards(player.cards, game.currentHand?.chinchonState?.combinations?.get(playerId) || []);
                if (uncombinedCards.length > 0) {
                    return discardCard(game, playerId, uncombinedCards[0].id);
                }
            }
        }

        return result;
    }

    /**
     * Handles the action of closing the round
     */
    private async handleCloseAction(game: Game, playerId: string): Promise<Game> {
        const result = closeRound(game, playerId);
        return result;
    }

    /**
     * Gets the thinking time based on the difficulty
     */
    private getThinkingTime(ai: ChinchonAI): number {
        const baseTime = 250; // 1 segundo base
        const randomVariation = Math.random() * 250; // 0-0.5 segundos adicional

        switch (ai.getAIName().includes("Fácil") ? "easy" : ai.getAIName().includes("Medio") ? "medium" : "hard") {
            case "easy":
                return baseTime + randomVariation;
            case "medium":
                return baseTime + 300 + randomVariation; // +0.3s adicional
            case "hard":
                return baseTime + 500 + randomVariation; // +0.5s adicional
            default:
                return baseTime + randomVariation;
        }
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
    getAI(playerId: string): ChinchonAI | undefined {
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

        return ai.getThinkingMessage({ type: "draw", priority: 1, reason: "Pensando..." });
    }

    /**
     * Clears all IAs
     */
    clearAllAI(): void {
        this.aiPlayers.clear();
    }

    /**
     * Gets the uncombined cards of a player
     */
    private getUncombinedCards(playerCards: any[], combinations: any[]): any[] {
        const combinedCardIds = new Set();
        combinations.forEach((combo) => {
            combo.cards.forEach((card: any) => combinedCardIds.add(card.id));
        });

        return playerCards.filter((card) => !combinedCardIds.has(card.id));
    }
}
