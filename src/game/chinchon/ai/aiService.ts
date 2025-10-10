// ============================================================================
// CHINCHÓN AI SERVICE
// Servicio para manejar las acciones de la IA en el juego de Chinchón
// ============================================================================

import { Game, Player } from "@/game/chinchon/types";
import { ChinchonAI, AIAction } from "./aiPlayer";
import { 
    drawCard, 
    discardCard, 
    cutWithCard, 
    closeRound 
} from "@/game/chinchon/logic/gameLogic";

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export class ChinchonAIService {
    private aiPlayers: Map<string, ChinchonAI> = new Map();

    /**
     * Crea un jugador IA y lo agrega al juego
     */
    createAIPlayer(game: Game, difficulty: AIDifficulty = 'medium'): Player {
        const aiId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const ai = new ChinchonAI(difficulty, aiId);
        
        this.aiPlayers.set(aiId, ai);

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
        };

        return aiPlayer;
    }

    /**
     * Ejecuta la acción de la IA
     */
    async executeAIAction(game: Game, playerId: string): Promise<Game> {
        console.log(`🤖 executeAIAction: ${playerId}`);
        
        const ai = this.aiPlayers.get(playerId);
        if (!ai) {
            console.log(`❌ IA no encontrada para jugador ${playerId}`);
            return game;
        }

        // Simular tiempo de "pensamiento" de la IA
        const thinkingTime = this.getThinkingTime(ai);
        console.log(`🤖 Tiempo de pensamiento: ${thinkingTime}ms`);
        await this.delay(thinkingTime);

        const action = ai.makeDecision(game);
        if (!action) {
            console.log(`❌ IA ${playerId} no pudo decidir acción`);
            return game;
        }

        console.log(`🤖 IA ${playerId} decide: ${action.reason} (${action.type})`);
        console.log(`🤖 Estado del juego en makeDecision:`, {
            currentPlayer: game.currentHand?.chinchonState?.currentPlayerId,
            hasDrawnCard: game.currentHand?.chinchonState?.hasDrawnCard,
            playerCards: game.players.find(p => p.id === playerId)?.cards?.length || 0
        });

        try {
            switch (action.type) {
                case 'draw':
                    console.log(`🤖 Ejecutando draw action: fromDiscardPile=${action.fromDiscardPile}`);
                    return await this.handleDrawAction(game, playerId, action);
                case 'discard':
                    console.log(`🤖 Ejecutando discard action: cardId=${action.cardId}`);
                    return await this.handleDiscardAction(game, playerId, action);
                case 'cut':
                    console.log(`🤖 Ejecutando cut action: cardId=${action.cardId}`);
                    return await this.handleCutAction(game, playerId, action);
                case 'close':
                    console.log(`🤖 Ejecutando close action`);
                    return await this.handleCloseAction(game, playerId);
                default:
                    console.log(`❌ Tipo de acción no reconocido: ${action.type}`);
                    return game;
            }
        } catch (error) {
            console.error(`❌ Error ejecutando acción de IA:`, error);
            return game;
        }
    }

    /**
     * Maneja la acción de robar carta
     */
    private async handleDrawAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        console.log(`🤖 handleDrawAction: playerId=${playerId}, fromDiscardPile=${action.fromDiscardPile}`);
        const result = drawCard(game, playerId, action.fromDiscardPile || false);
        console.log(`🤖 drawCard result:`, {
            success: result !== game,
            playerCards: result.players.find(p => p.id === playerId)?.cards?.length || 0,
            hasDrawnCard: result.currentHand?.chinchonState?.hasDrawnCard
        });
        return result;
    }

    /**
     * Maneja la acción de descartar carta
     */
    private async handleDiscardAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        if (!action.cardId) {
            console.log(`❌ ID de carta no especificado para descarte`);
            return game;
        }
        return discardCard(game, playerId, action.cardId);
    }

    /**
     * Maneja la acción de cortar con carta
     */
    private async handleCutAction(game: Game, playerId: string, action: AIAction): Promise<Game> {
        if (!action.cardId) {
            console.log(`❌ ID de carta no especificado para corte`);
            return game;
        }
        
        const result = cutWithCard(game, playerId, action.cardId);
        
        // Si el corte falló, verificar si es porque no puede cortar
        if (result === game) {
            console.log(`🤖 Corte falló, la IA debe descartar en su lugar`);
            // La IA debe descartar una carta en lugar de cortar
            const player = game.players.find(p => p.id === playerId);
            if (player && player.cards.length > 0) {
                // Descarte la primera carta no combinada
                const uncombinedCards = this.getUncombinedCards(player.cards, game.currentHand?.chinchonState?.combinations?.get(playerId) || []);
                if (uncombinedCards.length > 0) {
                    console.log(`🤖 Descarte de emergencia: ${uncombinedCards[0].displayValue}`);
                    return discardCard(game, playerId, uncombinedCards[0].id);
                }
            }
        }
        
        return result;
    }

    /**
     * Maneja la acción de cerrar ronda
     */
    private async handleCloseAction(game: Game, playerId: string): Promise<Game> {
        console.log(`🤖 IA ${playerId} cerrando ronda...`);
        const result = closeRound(game, playerId);
        console.log(`🤖 Resultado de cerrar ronda:`, {
            isRoundClosed: result.currentHand?.chinchonState?.isRoundClosed,
            roundWinner: result.currentHand?.chinchonState?.roundWinner,
            winner: result.winner
        });
        return result;
    }

    /**
     * Obtiene el tiempo de "pensamiento" basado en la dificultad
     */
    private getThinkingTime(ai: ChinchonAI): number {
        const baseTime = 50; // 0.05 segundos base (súper rápido)
        const randomVariation = Math.random() * 100; // 0-0.1 segundos adicional
        
        switch (ai.getAIName().includes('Fácil') ? 'easy' : 
                ai.getAIName().includes('Medio') ? 'medium' : 'hard') {
            case 'easy':
                return baseTime + randomVariation;
            case 'medium':
                return baseTime + 50 + randomVariation; // +0.05s adicional
            case 'hard':
                return baseTime + 100 + randomVariation; // +0.1s adicional
            default:
                return baseTime + randomVariation;
        }
    }

    /**
     * Delay utility
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Verifica si un jugador es IA
     */
    isAIPlayer(playerId: string): boolean {
        return this.aiPlayers.has(playerId);
    }

    /**
     * Obtiene la IA de un jugador
     */
    getAI(playerId: string): ChinchonAI | undefined {
        return this.aiPlayers.get(playerId);
    }

    /**
     * Remueve un jugador IA
     */
    removeAIPlayer(playerId: string): void {
        this.aiPlayers.delete(playerId);
    }

    /**
     * Obtiene el mensaje de pensamiento de la IA
     */
    getAIThinkingMessage(playerId: string): string {
        const ai = this.aiPlayers.get(playerId);
        if (!ai) return "🤔 Pensando...";
        
        return ai.getThinkingMessage({ type: 'draw', priority: 1, reason: 'Pensando...' });
    }

    /**
     * Limpia todas las IAs
     */
    clearAllAI(): void {
        this.aiPlayers.clear();
    }

    /**
     * Obtiene las cartas no combinadas de un jugador
     */
    private getUncombinedCards(playerCards: any[], combinations: any[]): any[] {
        const combinedCardIds = new Set();
        combinations.forEach(combo => {
            combo.cards.forEach((card: any) => combinedCardIds.add(card.id));
        });
        
        return playerCards.filter(card => !combinedCardIds.has(card.id));
    }
}
