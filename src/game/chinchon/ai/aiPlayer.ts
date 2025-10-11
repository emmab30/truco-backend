// ============================================================================
// CHINCHÓN AI PLAYER
// Sistema de inteligencia artificial para el juego de Chinchón
// ============================================================================

import { Game, Card, Combination, ChinchonState, ActionType } from "@/game/chinchon/types";
import { findCombinations } from "@/game/chinchon/logic/gameLogic";

export type AIDifficulty = "easy" | "medium" | "hard";

export interface AIAction {
    type: "draw" | "discard" | "cut" | "close";
    cardId?: string;
    fromDiscardPile?: boolean;
    priority: number;
    reason: string;
}

export class ChinchonAI {
    private difficulty: AIDifficulty;
    private playerId: string;

    constructor(difficulty: AIDifficulty = "medium", playerId: string) {
        this.difficulty = difficulty;
        this.playerId = playerId;
    }

    /**
     * Decide la próxima acción del bot
     */
    makeDecision(game: Game): AIAction | null {
        if (!game.currentHand?.chinchonState) {
            return null;
        }

        const player = game.players.find((p) => p.id === this.playerId);
        if (!player) {
            return null;
        }

        const chinchonState = game.currentHand.chinchonState;
        const combinations = chinchonState.combinations.get(this.playerId) || [];
        const hasDrawnCard = chinchonState.hasDrawnCard;
        // Si ya robó carta, debe descartar primero
        if (hasDrawnCard && player.cards.length > 7) {
            // Usar availableActions si están disponibles
            if (player.availableActions && player.availableActions.length > 0) {
                return this.decideFromAvailableActions(game, chinchonState, player.availableActions, combinations);
            }

            // Fallback: descartar normalmente
            const uncombinedCards = this.getUncombinedCards(player.cards, combinations);
            if (uncombinedCards.length > 0) {
                return this.decideDiscardAction(uncombinedCards, combinations);
            }

            // Si no hay cartas sin combinar, algo está mal
            return {
                type: "discard",
                cardId: player.cards[0]?.id || "",
                priority: 1,
                reason: "Error: descartando primera carta disponible",
            };
        }

        // Usar availableActions si están disponibles
        if (player.availableActions && player.availableActions.length > 0) {
            return this.decideFromAvailableActions(game, chinchonState, player.availableActions, combinations);
        }

        // Fallback: Si no ha robado carta, debe robar
        if (!hasDrawnCard) {
            return this.decideDrawAction(game, chinchonState);
        }

        // Si ya robó, puede descartar, cortar o cerrar
        const playAction = this.decidePlayAction(game, chinchonState, combinations);
        if (playAction) {
            return playAction;
        }

        // Fallback final: si no puede decidir nada, descartar la primera carta
        const currentPlayer = game.players.find((p) => p.id === this.playerId);
        if (currentPlayer && currentPlayer.cards.length > 0) {
            return {
                type: "discard",
                cardId: currentPlayer.cards[0].id,
                priority: 1,
                reason: "Fallback final: descarte de emergencia",
            };
        }

        // Último recurso: robar del mazo
        return {
            type: "draw",
            fromDiscardPile: false,
            priority: 1,
            reason: "Último recurso: robar del mazo",
        };
    }

    /**
     * Decide acción basada en availableActions
     */
    private decideFromAvailableActions(game: Game, chinchonState: any, availableActions: any[], combinations: Combination[]): AIAction | null {
        const player = game.players.find((p) => p.id === this.playerId);
        if (!player) return null;

        // Prioridad: cortar para ganar > cerrar ronda para ganar
        const cutAction = availableActions.find((a) => a.type === ActionType.CUT_WITH_CARD);
        if (cutAction) {
            return {
                type: "cut",
                cardId: cutAction.cardId,
                priority: 4,
                reason: `Cortar para ganar: ${cutAction.label}`,
            };
        }

        const closeAction = availableActions.find((a) => a.type === ActionType.CLOSE_ROUND);
        if (closeAction) {
            return {
                type: "close",
                priority: 3,
                reason: "Cerrar ronda para ganar",
            };
        }

        // Si no puede ganar, descartar normalmente
        return this.decideDiscardFromAvailableActions(game, chinchonState, combinations);
    }

    /**
     * Decide de dónde robar carta
     */
    private decideDrawAction(game: Game, chinchonState: ChinchonState): AIAction {
        const discardPile = chinchonState.discardPile;
        const visibleCard = discardPile[discardPile.length - 1];

        if (!visibleCard) {
            return {
                type: "draw",
                fromDiscardPile: false,
                priority: 1,
                reason: "No hay carta visible en descarte",
            };
        }

        // Estrategia basada en dificultad
        switch (this.difficulty) {
            case "easy":
                return this.easyDrawStrategy(visibleCard);
            case "medium":
                return this.mediumDrawStrategy(visibleCard, chinchonState);
            case "hard":
                return this.hardDrawStrategy(visibleCard, chinchonState, game);
            default:
                return this.mediumDrawStrategy(visibleCard, chinchonState);
        }
    }

    /**
     * Decide qué acción tomar después de robar
     */
    private decidePlayAction(game: Game, _chinchonState: ChinchonState, combinations: Combination[]): AIAction {
        const player = game.players.find((p) => p.id === this.playerId)!;
        const combinedCardIds = new Set(combinations.flatMap((c) => c.cards.map((card) => card.id)));
        const uncombinedCards = player.cards.filter((card) => !combinedCardIds.has(card.id));

        // Verificar si puede ganar
        const winAction = this.checkWinConditions(combinations, uncombinedCards);
        if (winAction) {
            return winAction;
        }

        // Verificar si puede cortar
        const cutAction = this.checkCutConditions(combinations, uncombinedCards);
        if (cutAction) {
            return cutAction;
        }

        // Decidir qué carta descartar
        return this.decideDiscardAction(uncombinedCards, combinations);
    }

    /**
     * Estrategia fácil para robar
     */
    private easyDrawStrategy(_visibleCard: Card): AIAction {
        // 70% probabilidad de robar del mazo
        const shouldDrawFromDeck = Math.random() < 0.7;

        return {
            type: "draw",
            fromDiscardPile: !shouldDrawFromDeck,
            priority: 1,
            reason: shouldDrawFromDeck ? "Estrategia fácil: robar del mazo" : "Estrategia fácil: robar del descarte",
        };
    }

    /**
     * Estrategia media para robar
     */
    private mediumDrawStrategy(visibleCard: Card, _chinchonState: ChinchonState): AIAction {
        const cardValue = visibleCard.chinchonValue || 0;

        // Si la carta visible es baja (1-4), es más probable que la tome
        if (cardValue <= 4) {
            return {
                type: "draw",
                fromDiscardPile: true,
                priority: 1,
                reason: `Carta baja visible (${cardValue}), la tomo`,
            };
        }

        // Si es alta (8-10), es menos probable
        if (cardValue >= 8) {
            return {
                type: "draw",
                fromDiscardPile: false,
                priority: 1,
                reason: `Carta alta visible (${cardValue}), robo del mazo`,
            };
        }

        // Para cartas medias (5-7), decisión basada en probabilidad
        const probability = cardValue <= 6 ? 0.6 : 0.3; // Más probable si es 5-6
        const shouldDrawFromDiscard = Math.random() < probability;

        return {
            type: "draw",
            fromDiscardPile: shouldDrawFromDiscard,
            priority: 1,
            reason: `Carta media visible (${cardValue}), probabilidad: ${(probability * 100).toFixed(0)}%`,
        };
    }

    /**
     * Estrategia difícil para robar
     */
    private hardDrawStrategy(visibleCard: Card, chinchonState: ChinchonState, game: Game): AIAction {
        const player = game.players.find((p) => p.id === this.playerId)!;
        const combinations = chinchonState.combinations.get(this.playerId) || [];

        // Simular qué pasaría si toma la carta visible
        const simulatedCards = [...player.cards, visibleCard];
        const simulatedCombinations = this.findCombinations(simulatedCards);
        const simulatedUsefulness = this.calculateCardUsefulness(visibleCard, simulatedCards, simulatedCombinations);

        console.log(
            `🤖 IA ${this.playerId} - Evaluando ${visibleCard.displayValue} de ${visibleCard.suit}: utilidad=${simulatedUsefulness.toFixed(1)}, combos=${combinations.length}→${
                simulatedCombinations.length
            }`
        );

        // Solo tomar si realmente mejora las combinaciones Y es útil
        if (simulatedUsefulness > 3 && simulatedCombinations.length > combinations.length) {
            console.log(`🤖 IA ${this.playerId} - ✅ TOMANDO CARTA: Mejora combinaciones significativamente`);
            return {
                type: "draw",
                fromDiscardPile: true,
                priority: 1,
                reason: `Carta mejora combinaciones (utilidad: ${simulatedUsefulness.toFixed(1)})`,
            };
        }

        // Si la carta es muy inútil, rechazarla
        if (simulatedUsefulness < -1) {
            console.log(`🤖 IA ${this.playerId} - ❌ RECHAZANDO CARTA: Muy inútil (utilidad: ${simulatedUsefulness.toFixed(2)})`);
            return {
                type: "draw",
                fromDiscardPile: false,
                priority: 1,
                reason: `Carta muy inútil (utilidad: ${simulatedUsefulness.toFixed(1)}), robando del mazo`,
            };
        }

        // Solo tomar cartas bajas si realmente le sirven
        const cardValue = visibleCard.chinchonValue || 0;
        if (cardValue <= 3) {
            // Verificar si ya tiene cartas similares que podrían formar combinaciones
            const similarCards = player.cards.filter(
                (card) => card.value === visibleCard.value || (Math.abs(card.value - visibleCard.value) === 1 && card.suit === visibleCard.suit)
            );

            // Solo tomar si tiene al menos 2 cartas similares (para formar secuencia de 3)
            if (similarCards.length >= 2) {
                console.log(`🤖 IA ${this.playerId} - ✅ TOMANDO CARTA: Carta baja útil para secuencia (${cardValue} puntos, ${similarCards.length} cartas similares)`);
                return {
                    type: "draw",
                    fromDiscardPile: true,
                    priority: 1,
                    reason: `Carta baja útil para secuencia (${cardValue} puntos)`,
                };
            } else {
                console.log(
                    `🤖 IA ${this.playerId} - ❌ RECHAZANDO CARTA: Carta baja pero no suficiente apoyo (${cardValue} puntos, solo ${similarCards.length} cartas similares)`
                );
                return {
                    type: "draw",
                    fromDiscardPile: false,
                    priority: 1,
                    reason: `Carta baja sin suficiente apoyo, robando del mazo`,
                };
            }
        }

        // Si la carta es moderadamente útil (utilidad > 1), tomarla
        if (simulatedUsefulness > 1) {
            console.log(`🤖 IA ${this.playerId} - ✅ TOMANDO CARTA: Moderadamente útil (utilidad: ${simulatedUsefulness.toFixed(2)})`);
            return {
                type: "draw",
                fromDiscardPile: true,
                priority: 1,
                reason: `Carta moderadamente útil (utilidad: ${simulatedUsefulness.toFixed(1)})`,
            };
        }

        // Si es alta (8+ puntos) y no es útil, robar del mazo
        if (cardValue >= 8) {
            console.log(`🤖 IA ${this.playerId} - ❌ RECHAZANDO CARTA: Alta y no útil (${cardValue} puntos)`);
            return {
                type: "draw",
                fromDiscardPile: false,
                priority: 1,
                reason: `Carta alta no útil (${cardValue}), robo del mazo`,
            };
        }

        // Si la utilidad simulada es muy baja (negativa), rechazar la carta
        if (simulatedUsefulness < -1) {
            console.log(`🤖 IA ${this.playerId} - ❌ RECHAZANDO CARTA: Muy inútil (utilidad: ${simulatedUsefulness.toFixed(2)})`);
            return {
                type: "draw",
                fromDiscardPile: false,
                priority: 1,
                reason: `Carta muy inútil (utilidad: ${simulatedUsefulness.toFixed(1)}), robando del mazo`,
            };
        }

        // Para cartas medias (4-7), evaluar probabilidad de ser útil
        const probability = this.calculateCardProbability(visibleCard, player.cards, combinations);
        const shouldTake = probability > 0.3; // 30% de probabilidad de ser útil

        console.log(`🤖 IA ${this.playerId} - Carta media (${cardValue}): probabilidad útil ${(probability * 100).toFixed(0)}% - ${shouldTake ? "TOMANDO" : "RECHAZANDO"}`);

        return {
            type: "draw",
            fromDiscardPile: shouldTake,
            priority: 1,
            reason: `Carta media (${cardValue}), probabilidad útil: ${(probability * 100).toFixed(0)}%`,
        };
    }

    /**
     * Verifica condiciones de victoria
     */
    private checkWinConditions(combinations: Combination[], uncombinedCards: Card[]): AIAction | null {
        // Verificar Chinchón (7 cartas en secuencia del mismo palo)
        const chinchonCombo = combinations.find((c) => c.type === "sequence" && c.cards.length === 7);
        if (chinchonCombo) {
            return {
                type: "close",
                priority: 10,
                reason: "¡CHINCHÓN! 7 cartas en secuencia",
            };
        }

        // Verificar cierre con 7 cartas combinadas
        if (combinations.length >= 2 && uncombinedCards.length === 0) {
            const totalCombinedCards = combinations.reduce((sum, c) => sum + c.cards.length, 0);
            if (totalCombinedCards === 7) {
                return {
                    type: "close",
                    priority: 9,
                    reason: "Cierre con 7 cartas combinadas",
                };
            }
        }

        return null;
    }

    /**
     * Verifica condiciones de corte
     */
    private checkCutConditions(combinations: Combination[], uncombinedCards: Card[]): AIAction | null {
        const totalCombinedCards = combinations.reduce((sum, c) => sum + c.cards.length, 0);

        // Necesita al menos 6 cartas combinadas en 2+ combinaciones
        // Solo puede cortar si tiene exactamente 6 cartas combinadas
        if (combinations.length >= 2 && totalCombinedCards === 6) {
            // Buscar carta <5 para cortar
            const cuttingCard = uncombinedCards.find((card) => (card.chinchonValue || 0) < 5);

            if (cuttingCard) {
                console.log(`🤖 IA ${this.playerId} - Puede cortar: 6 cartas combinadas, carta para cortar: ${cuttingCard.displayValue}`);
                return {
                    type: "cut",
                    cardId: cuttingCard.id,
                    priority: 8,
                    reason: `Cortar con ${cuttingCard.displayValue} (${cuttingCard.chinchonValue} puntos)`,
                };
            }
        } else if (totalCombinedCards > 6) {
            console.log(`🤖 IA ${this.playerId} - No puede cortar: tiene ${totalCombinedCards} cartas combinadas (necesita exactamente 6)`);
        }

        return null;
    }

    /**
     * Decide qué carta descartar
     */
    private decideDiscardAction(uncombinedCards: Card[], combinations: Combination[]): AIAction {
        if (uncombinedCards.length === 0) {
            return {
                type: "close",
                priority: 7,
                reason: "Todas las cartas están combinadas",
            };
        }

        // Estrategia de descarte basada en dificultad
        let cardToDiscard: Card;

        switch (this.difficulty) {
            case "easy":
                cardToDiscard = this.easyDiscardStrategy(uncombinedCards);
                break;
            case "medium":
                cardToDiscard = this.mediumDiscardStrategy(uncombinedCards);
                break;
            case "hard":
                cardToDiscard = this.hardDiscardStrategy(uncombinedCards, combinations);
                break;
            default:
                cardToDiscard = this.mediumDiscardStrategy(uncombinedCards);
        }

        return {
            type: "discard",
            cardId: cardToDiscard.id,
            priority: 5,
            reason: `Descartar ${cardToDiscard.displayValue} (${cardToDiscard.chinchonValue} puntos)`,
        };
    }

    /**
     * Estrategia fácil para descartar
     */
    private easyDiscardStrategy(uncombinedCards: Card[]): Card {
        // Descarta la carta más alta
        return uncombinedCards.reduce((highest, current) => ((current.chinchonValue || 0) > (highest.chinchonValue || 0) ? current : highest));
    }

    /**
     * Estrategia media para descartar
     */
    private mediumDiscardStrategy(uncombinedCards: Card[]): Card {
        // Prioriza descartar cartas altas, pero considera el palo
        const sortedCards = [...uncombinedCards].sort((a, b) => (b.chinchonValue || 0) - (a.chinchonValue || 0));

        // Si hay cartas de 8+ puntos, descarta la más alta
        const highCards = sortedCards.filter((c) => (c.chinchonValue || 0) >= 8);
        if (highCards.length > 0) {
            return highCards[0]!;
        }

        // Si hay cartas de 6-7 puntos, descarta la más alta
        const mediumCards = sortedCards.filter((c) => (c.chinchonValue || 0) >= 6);
        if (mediumCards.length > 0) {
            return mediumCards[0]!;
        }

        // Si no, descarta la más alta disponible
        return sortedCards[0]!;
    }

    /**
     * Estrategia difícil para descartar
     */
    private hardDiscardStrategy(uncombinedCards: Card[], combinations: Combination[]): Card {
        console.log(`🤖 IA ${this.playerId} - Evaluando ${uncombinedCards.length} cartas para descartar`);

        // Analizar qué carta es menos útil para futuras combinaciones
        const cardScores = uncombinedCards.map((card) => ({
            card,
            score: this.calculateCardUsefulness(card, uncombinedCards, combinations),
            value: card.chinchonValue || 0,
        }));

        // Log simplificado de puntuaciones
        const bestCard = cardScores.reduce((best, current) => (current.score < best.score ? current : best));
        console.log(`🤖 IA ${this.playerId} - Mejor para descartar: ${bestCard.card.displayValue} de ${bestCard.card.suit} (${bestCard.score.toFixed(1)})`);

        // Ordenar por utilidad (menos útil primero) y luego por valor (más alta primero)
        cardScores.sort((a, b) => {
            if (Math.abs(a.score - b.score) < 0.5) {
                // Si la utilidad es similar, priorizar descartar la más alta
                return b.value - a.value;
            }
            return a.score - b.score;
        });

        // Si hay cartas muy inútiles (score < -2), descartar la más alta
        const veryUseless = cardScores.filter((c) => c.score < -2);
        if (veryUseless.length > 0) {
            const selectedCard = veryUseless.sort((a, b) => b.value - a.value)[0]!.card;
            console.log(`🤖 IA ${this.playerId} - 🗑️ DESCARTANDO: ${selectedCard.displayValue} de ${selectedCard.suit} (muy inútil, score: ${veryUseless[0]!.score.toFixed(2)})`);
            return selectedCard;
        }

        // Si no, descartar la menos útil
        const selectedCard = cardScores[0]!.card;
        console.log(`🤖 IA ${this.playerId} - 🗑️ DESCARTANDO: ${selectedCard.displayValue} de ${selectedCard.suit} (menos útil, score: ${cardScores[0]!.score.toFixed(2)})`);
        return selectedCard;
    }

    /**
     * Calcula qué tan útil es una carta para futuras combinaciones
     */
    private calculateCardUsefulness(card: Card, allCards: Card[], _combinations: Combination[]): number {
        let usefulness = 0;
        const reasons: string[] = [];

        // Verificar si forma secuencias
        const sameSuitCards = allCards.filter((c) => c.suit === card.suit && c.id !== card.id);
        const sortedSameSuit = sameSuitCards.sort((a, b) => a.value - b.value);

        // Buscar secuencias potenciales
        for (let i = 0; i < sortedSameSuit.length - 1; i++) {
            const current = sortedSameSuit[i];
            const next = sortedSameSuit[i + 1];

            if (current && next && (card.value === current.value + 1 || card.value === next.value - 1)) {
                usefulness += 4; // Muy útil para secuencias
                reasons.push(`+4: Forma secuencia con ${current.displayValue} y ${next.displayValue}`);
            }
        }

        // Buscar secuencias más largas (3+ cartas)
        for (let i = 0; i < sortedSameSuit.length - 2; i++) {
            const current = sortedSameSuit[i];
            const next = sortedSameSuit[i + 1];

            if (current && next && card.value === current.value + 1 && next.value === card.value + 1) {
                usefulness += 6; // Extremadamente útil para secuencias largas
                reasons.push(`+6: Forma secuencia larga con ${current.displayValue} y ${next.displayValue}`);
            }
        }

        // Verificar si forma grupos
        const sameValueCards = allCards.filter((c) => c.value === card.value && c.id !== card.id);
        if (sameValueCards.length >= 2) {
            usefulness += 3; // Útil para grupos
            reasons.push(`+3: Forma grupo con ${sameValueCards.length} cartas del mismo valor`);
        }

        // Verificar si completa grupos existentes
        if (sameValueCards.length >= 1) {
            usefulness += 2; // Útil para completar grupos
            reasons.push(`+2: Completa grupo existente`);
        }

        // Verificar si forma escaleras (secuencias de 3+ cartas)
        const potentialSequences = this.findPotentialSequences(card, allCards);
        if (potentialSequences > 0) {
            usefulness += potentialSequences * 2;
            reasons.push(`+${potentialSequences * 2}: Forma ${potentialSequences} secuencias potenciales`);
        }

        // Penalizar cartas altas
        const penalty = (card.chinchonValue || 0) * 0.3;
        usefulness -= penalty;
        if (penalty > 0) {
            reasons.push(`-${penalty.toFixed(1)}: Penalización por carta alta`);
        }

        // Bonificar cartas bajas
        if (card.chinchonValue <= 3) {
            usefulness += 1;
            reasons.push(`+1: Bonificación por carta baja`);
        }

        // Log detallado solo para cartas con utilidad significativa o muy negativa
        if (usefulness > 1 || usefulness < -1) {
            // Log simplificado
            console.log(`🤖 IA ${this.playerId} - ${card.displayValue} de ${card.suit}: ${usefulness.toFixed(1)}`);
        }

        return usefulness;
    }

    /**
     * Encuentra secuencias potenciales que una carta puede formar
     */
    private findPotentialSequences(card: Card, allCards: Card[]): number {
        const sameSuitCards = allCards.filter((c) => c.suit === card.suit && c.id !== card.id);
        const sortedSameSuit = sameSuitCards.sort((a, b) => a.value - b.value);

        let sequences = 0;

        // Buscar secuencias de 3+ cartas
        for (let i = 0; i < sortedSameSuit.length - 1; i++) {
            const current = sortedSameSuit[i];
            const next = sortedSameSuit[i + 1];

            if (current && next && card.value === current.value + 1 && next.value === card.value + 1) {
                sequences++;
            }
        }

        return sequences;
    }

    /**
     * Calcula la probabilidad de que una carta sea útil
     */
    private calculateCardProbability(card: Card, playerCards: Card[], _combinations: Combination[]): number {
        const usefulness = this.calculateCardUsefulness(card, playerCards, []);

        // Normalizar la utilidad a una probabilidad (0-1)
        const normalizedUsefulness = Math.max(0, Math.min(1, (usefulness + 5) / 10));

        return normalizedUsefulness;
    }

    /**
     * Obtiene el nombre del bot basado en la dificultad
     */
    getAIName(): string {
        const names = {
            easy: ["Bot Fácil", "IA Principiante", "Bot Simple"],
            medium: ["Bot Medio", "IA Intermedia", "Bot Inteligente"],
            hard: ["Bot Difícil", "IA Experta", "Bot Maestro"],
        };

        const nameList = names[this.difficulty];
        return nameList[Math.floor(Math.random() * nameList.length)]!;
    }

    /**
     * Obtiene un mensaje de "pensamiento" del bot
     */
    getThinkingMessage(_action: AIAction): string {
        const messages = {
            easy: ["🤔 Pensando...", "🎲 Decidiendo...", "🃏 Analizando cartas..."],
            medium: ["🧠 Calculando estrategia...", "📊 Evaluando opciones...", "🎯 Planificando jugada..."],
            hard: ["⚡ Análisis profundo...", "🔍 Evaluando probabilidades...", "🎲 Calculando mejor movimiento..."],
        };

        const messageList = messages[this.difficulty];
        return messageList[Math.floor(Math.random() * messageList.length)]!;
    }

    /**
     * Decide acción de descarte basada en availableActions
     */
    private decideDiscardFromAvailableActions(game: Game, _chinchonState: any, combinations: Combination[]): AIAction | null {
        const player = game.players.find((p) => p.id === this.playerId);
        if (!player) return null;

        const uncombinedCards = this.getUncombinedCards(player.cards, combinations);

        if (uncombinedCards.length === 0) {
            return null;
        }

        // Usar la estrategia de descarte existente
        return this.decideDiscardAction(uncombinedCards, combinations);
    }

    /**
     * Obtiene las cartas no combinadas de un jugador
     */
    private getUncombinedCards(cards: Card[], combinations: Combination[]): Card[] {
        const combinedCardIds = new Set<string>();
        combinations.forEach((combo) => {
            combo.cards.forEach((card) => combinedCardIds.add(card.id));
        });

        return cards.filter((card) => !combinedCardIds.has(card.id));
    }

    /**
     * Encuentra combinaciones en un conjunto de cartas
     * Usa el algoritmo optimizado del módulo de lógica
     */
    private findCombinations(cards: Card[]): Combination[] {
        return findCombinations(cards);
    }
}
