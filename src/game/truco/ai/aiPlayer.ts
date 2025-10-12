// ============================================================================
// TRUCO AI PLAYER
// Sistema de inteligencia artificial para el juego de Truco
// ============================================================================

import { Game, Card, Player, EnvidoCall, TrucoCall } from "@/game/truco/types";
import { POINTS } from "@/game/truco/constants";

export type AIDifficulty = "hard";

export interface AIAction {
    type: "play" | "envido" | "truco" | "respond" | "mazo";
    cardId?: string;
    envidoCall?: EnvidoCall;
    trucoCall?: TrucoCall;
    response?: "quiero" | "no-quiero";
    priority: number;
    reason: string;
}

export class TrucoAI {
    private playerId: string;

    constructor(playerId: string) {
        this.playerId = playerId;
    }

    /**
     * Decide la próxima acción del bot
     */
    makeDecision(game: Game): AIAction | null {
        if (!game.currentHand) {
            return null;
        }

        const player = game.players.find((p) => p.id === this.playerId);
        if (!player) {
            return null;
        }

        // Si el jugador fue al mazo, no puede hacer nada
        if (player.wentToMazo) {
            return null;
        }

        const currentHand = game.currentHand;
        const currentRound = currentHand.rounds[currentHand.currentRound];

        if (!currentRound) {
            return null;
        }

        // Verificar si hay que responder a envido
        if (game.phase === "envido" && currentHand.envidoState?.currentCaller !== this.playerId) {
            return this.decideEnvidoResponse(game, player);
        }

        // Verificar si hay que responder a truco
        if (game.phase === "truco" && currentHand.trucoState?.currentCaller !== this.playerId) {
            // En primera ronda, considerar cantar envido en lugar de responder al truco
            const isFirstRound = currentRound.number === 1;
            const envidoWasResolved = currentHand.envidoState?.winner !== undefined;
            
            if (isFirstRound && !envidoWasResolved) {
                const envidoPoints = this.calculateEnvidoPoints(player.cards);
                const shouldCallEnvido = this.shouldCallEnvidoOverTruco(envidoPoints, player);
                
                if (shouldCallEnvido) {
                    const envidoCall = this.chooseEnvidoCall(envidoPoints, player, game.players.find(p => p.id !== this.playerId)!);
                    console.log(`🤖 IA ${this.playerId} - 🎯 CANTAR ENVIDO EN VEZ DE RESPONDER TRUCO: ${envidoCall} (tengo ${envidoPoints})`);
                    return {
                        type: "envido",
                        envidoCall,
                        priority: 2,
                        reason: `Envido tiene prioridad: ${envidoCall} con ${envidoPoints} puntos`,
                    };
                }
            }
            
            return this.decideTrucoResponse(game, player);
        }

        // Verificar si es el turno del jugador
        if (currentHand.currentPlayerId !== this.playerId) {
            return null;
        }

        // Si ya jugó una carta en esta ronda, no puede hacer nada más
        if (player.hasPlayedCard) {
            return null;
        }

        // Usar estrategia avanzada
        return this.hardStrategy(game, player, currentRound);
    }

    /**
     * Estrategia avanzada - Juega de forma óptima con análisis profundo
     */
    private hardStrategy(game: Game, player: Player, currentRound: any): AIAction {
        const currentHand = game.currentHand!;
        const opponent = game.players.find((p) => p.id !== this.playerId)!;

        console.log(`🤖 IA ${this.playerId} - Analizando situación`);

        // Evaluar si ir al mazo con análisis profundo
        if (this.shouldGoToMazo(game, player, currentRound)) {
            console.log(`🤖 IA ${this.playerId} - ❌ IR AL MAZO: Situación desfavorable`);
            return {
                type: "mazo",
                priority: 1,
                reason: "Análisis profundo: situación muy desfavorable",
            };
        }

        // Cantar envido estratégicamente en primera ronda
        const envidoWasResolved = currentHand.envidoState?.winner !== undefined;
        if (currentRound.number === 1 && currentRound.cardsPlayed.length === 0 && !currentHand.envidoState?.isActive && !currentHand.trucoState?.isActive && !envidoWasResolved) {
            const envidoPoints = this.calculateEnvidoPoints(player.cards);
            const shouldCallEnvido = this.shouldCallEnvido(envidoPoints, player, opponent);

            if (shouldCallEnvido) {
                const envidoCall = this.chooseEnvidoCall(envidoPoints, player, opponent);
                console.log(`🤖 IA ${this.playerId} - 🎯 CANTAR ENVIDO: ${envidoCall} (tengo ${envidoPoints})`);
                return {
                    type: "envido",
                    envidoCall,
                    priority: 2,
                    reason: `Estrategia de envido: ${envidoCall} con ${envidoPoints} puntos`,
                };
            }
        }

        // Cantar truco estratégicamente
        if (!currentHand.trucoState?.isActive && !currentHand.trucoState?.accepted) {
            if (this.shouldCallTruco(game, player, currentRound)) {
                console.log(`🤖 IA ${this.playerId} - 🔥 CANTAR TRUCO: Ventaja estratégica`);
                return {
                    type: "truco",
                    trucoCall: TrucoCall.TRUCO,
                    priority: 3,
                    reason: "Análisis estratégico: momento óptimo para truco",
                };
            }
        }

        // Decidir qué carta jugar con análisis avanzado
        const cardToPlay = this.decideCardToPlay(game, player, currentRound);
        console.log(`🤖 IA ${this.playerId} - 🃏 JUGANDO: ${cardToPlay.displayValue} (valor: ${cardToPlay.trucoValue})`);
        return {
            type: "play",
            cardId: cardToPlay.id,
            priority: 1,
            reason: `Estrategia óptima: ${cardToPlay.displayValue}`,
        };
    }

    /**
     * Decide qué carta jugar
     */
    private decideCardToPlay(_game: Game, player: Player, currentRound: any): Card {
        const cardsPlayed = currentRound.cardsPlayed;

        // Si es el primero en jugar
        if (cardsPlayed.length === 0) {
            return this.chooseFirstCard(player.cards, currentRound.number);
        }

        // Si es el segundo en jugar, responder a la carta del oponente
        const opponentCard = cardsPlayed[0]?.card;
        if (opponentCard) {
            return this.chooseResponseCard(player.cards, opponentCard);
        }

        // Fallback: carta más baja
        return this.getLowestCard(player.cards);
    }

    /**
     * Elige la primera carta a jugar
     */
    private chooseFirstCard(cards: Card[], roundNumber: number): Card {
        // Estrategia avanzada
        if (roundNumber === 1) {
            // Primera ronda: jugar carta media-baja para tantear
            const sortedCards = [...cards].sort((a, b) => a.trucoValue - b.trucoValue);
            return sortedCards[0]!;
        } else if (roundNumber === 2) {
            // Segunda ronda: jugar carta más fuerte
            return this.getHighestCard(cards);
        } else {
            // Tercera ronda: jugar lo que quede
            return cards[0]!;
        }
    }

    /**
     * Elige una carta en respuesta a la del oponente
     */
    private chooseResponseCard(cards: Card[], opponentCard: Card): Card {
        const sortedCards = [...cards].sort((a, b) => b.trucoValue - a.trucoValue);
        const winningCards = sortedCards.filter((c) => c.trucoValue > opponentCard.trucoValue);

        if (winningCards.length > 0) {
            // Si puede ganar, jugar la carta más baja que gane
            return winningCards[winningCards.length - 1]!;
        } else {
            // Si no puede ganar, jugar la más baja para conservar buenas cartas
            return sortedCards[sortedCards.length - 1]!;
        }
    }

    /**
     * Decide si responder a envido
     */
    private decideEnvidoResponse(game: Game, player: Player): AIAction {
        const currentHand = game.currentHand!;
        const envidoState = currentHand.envidoState!;
        const myEnvidoPoints = this.calculateEnvidoPoints(player.cards);

        console.log(`🤖 IA ${this.playerId} - Responder a ENVIDO: Tengo ${myEnvidoPoints} puntos`);

        // Análisis profundo
        const pointsAtStake = this.calculateEnvidoPointsAtStake(envidoState);
        const shouldAccept = this.shouldAcceptEnvido(myEnvidoPoints, pointsAtStake, player);

        console.log(`🤖 IA ${this.playerId} - ${shouldAccept ? "✅ QUIERO" : "❌ NO QUIERO"} (${myEnvidoPoints} pts, en juego: ${pointsAtStake})`);

        return {
            type: "respond",
            response: shouldAccept ? "quiero" : "no-quiero",
            priority: 1,
            reason: `Análisis: ${myEnvidoPoints} puntos, en juego: ${pointsAtStake}`,
        };
    }

    /**
     * Decide si responder a truco
     */
    private decideTrucoResponse(game: Game, player: Player): AIAction {
        const currentHand = game.currentHand!;
        const trucoState = currentHand.trucoState!;
        const currentRound = currentHand.rounds[currentHand.currentRound]!;

        console.log(`🤖 IA ${this.playerId} - Responder a TRUCO: ${trucoState.currentCall}`);

        // Análisis profundo
        const shouldAccept = this.shouldAcceptTruco(game, player, currentRound);

        console.log(`🤖 IA ${this.playerId} - ${shouldAccept ? "✅ QUIERO TRUCO" : "❌ NO QUIERO TRUCO"}`);

        return {
            type: "respond",
            response: shouldAccept ? "quiero" : "no-quiero",
            priority: 1,
            reason: shouldAccept ? "Análisis favorable" : "Análisis desfavorable",
        };
    }

    /**
     * Calcula los puntos de envido de las cartas
     */
    private calculateEnvidoPoints(cards: Card[]): number {
        // Agrupar cartas por palo
        const suitGroups: { [suit: string]: Card[] } = {};
        cards.forEach((card) => {
            if (!suitGroups[card.suit]) {
                suitGroups[card.suit] = [];
            }
            suitGroups[card.suit]!.push(card);
        });

        let maxPoints = 0;

        // Verificar cada palo
        Object.values(suitGroups).forEach((suitCards) => {
            if (suitCards.length >= 2) {
                // Obtener las dos cartas más altas de este palo
                const sortedCards = suitCards.sort((a, b) => b.envidoValue - a.envidoValue);
                const twoHighest = sortedCards.slice(0, 2);
                const points = twoHighest[0]!.envidoValue + twoHighest[1]!.envidoValue + 20;
                maxPoints = Math.max(maxPoints, points);
            }
        });

        // Si no hay dos cartas del mismo palo, tomar la más alta
        if (maxPoints === 0) {
            maxPoints = Math.max(...cards.map((card) => card.envidoValue));
        }

        return maxPoints;
    }

    /**
     * Verifica si debe ir al mazo con análisis estratégico avanzado
     */
    private shouldGoToMazo(game: Game, player: Player, _currentRound: any): boolean {
        const currentHand = game.currentHand;
        if (!currentHand) return false;

        const hasOnlyBadCards = this.hasOnlyBadCards(player.cards);
        const opponentLeading = this.isOpponentLeading(game);
        const pointsDifference = this.getPointsDifference(game, player);

        // Si hay truco activo y tengo una carta perdedora, ir al mazo
        const trucoIsActive = currentHand.trucoState?.isActive || currentHand.trucoState?.accepted;
        if (trucoIsActive) {
            const currentRound = currentHand.rounds[currentHand.currentRound];
            if (currentRound && currentRound.cardsPlayed.length > 0) {
                const opponentCard = currentRound.cardsPlayed[0]?.card;
                if (opponentCard) {
                    // Si todas mis cartas pierden contra la del oponente, ir al mazo
                    const allCardsLose = player.cards.every((c) => c.trucoValue <= opponentCard.trucoValue);
                    if (allCardsLose) {
                        console.log(`🤖 IA ${this.playerId} - Todas mis cartas pierden en truco, voy al mazo`);
                        return true;
                    }
                }
            }
        }

        // Ir al mazo si:
        // 1. Tiene cartas muy malas
        // 2. El oponente está liderando
        // 3. La diferencia de puntos es pequeña (no vale la pena arriesgar)
        return hasOnlyBadCards && opponentLeading && Math.abs(pointsDifference) < 5;
    }

    /**
     * Verifica si tiene solo cartas malas
     */
    private hasOnlyBadCards(cards: Card[]): boolean {
        return cards.every((c) => c.trucoValue <= 3);
    }

    /**
     * Verifica si el oponente está liderando
     */
    private isOpponentLeading(game: Game): boolean {
        const currentHand = game.currentHand!;
        const rounds = currentHand.rounds;

        let myWins = 0;
        let opponentWins = 0;

        rounds.forEach((round) => {
            if (round.winner === this.playerId) {
                myWins++;
            } else if (round.winner) {
                opponentWins++;
            }
        });

        return opponentWins > myWins;
    }

    /**
     * Obtiene la diferencia de puntos con el oponente
     */
    private getPointsDifference(game: Game, player: Player): number {
        const opponent = game.players.find((p) => p.id !== this.playerId);
        if (!opponent) return 0;

        return player.points - opponent.points;
    }

    /**
     * Obtiene la carta más baja
     */
    private getLowestCard(cards: Card[]): Card {
        return cards.reduce((lowest, current) => (current.trucoValue < lowest.trucoValue ? current : lowest));
    }

    /**
     * Obtiene la carta más alta
     */
    private getHighestCard(cards: Card[]): Card {
        return cards.reduce((highest, current) => (current.trucoValue > highest.trucoValue ? current : highest));
    }

    /**
     * Calcula los puntos en juego del envido
     */
    private calculateEnvidoPointsAtStake(envidoState: any): number {
        let points = 0;
        const playedLevels = envidoState.playedLevels || [];

        playedLevels.forEach((level: EnvidoCall) => {
            if (level === EnvidoCall.ENVIDO) {
                points += POINTS.ENVIDO_ACCEPTED;
            } else if (level === EnvidoCall.REAL_ENVIDO) {
                points += POINTS.REAL_ENVIDO_ACCEPTED;
            } else if (level === EnvidoCall.FALTA_ENVIDO) {
                points += POINTS.FALTA_ENVIDO_ACCEPTED;
            }
        });

        return points || 2; // Default: 2 puntos
    }

    /**
     * Decide si debe aceptar el envido
     */
    private shouldAcceptEnvido(myPoints: number, _pointsAtStake: number, _player: Player): boolean {
        // Si tengo más de 30, casi siempre acepto
        if (myPoints >= 30) return true;

        // Si tengo menos de 20, casi siempre rechazo
        if (myPoints < 20) return Math.random() < 0.2;

        // Entre 20 y 30: depende de la situación
        const riskTolerance = 0.5 + (myPoints - 20) / 20; // 0.5 a 1.0
        return Math.random() < riskTolerance;
    }

    /**
     * Decide si debe cantar envido
     */
    private shouldCallEnvido(myPoints: number, _player: Player, _opponent: Player): boolean {
        // Si tengo más de 30 puntos, siempre canto
        if (myPoints >= 30) return true;

        // Si tengo entre 27-29, 80% de probabilidad
        if (myPoints >= 27) return Math.random() < 0.8;

        // Si tengo entre 24-26, 50% de probabilidad
        if (myPoints >= 24) return Math.random() < 0.5;

        // Menos de 24: no canto
        return false;
    }

    /**
     * Decide si debe cantar envido cuando el oponente cantó truco
     */
    private shouldCallEnvidoOverTruco(myPoints: number, _player: Player): boolean {
        // Si tengo muy buenos puntos de envido, vale la pena cancelar el truco
        if (myPoints >= 31) return true;

        // Si tengo buenos puntos, 70% de probabilidad
        if (myPoints >= 28) return Math.random() < 0.7;

        // Si tengo puntos decentes, 40% de probabilidad
        if (myPoints >= 25) return Math.random() < 0.4;

        // Menos de 25: no canto envido, respondo al truco normalmente
        return false;
    }

    /**
     * Elige qué tipo de envido cantar
     */
    private chooseEnvidoCall(myPoints: number, _player: Player, _opponent: Player): EnvidoCall {
        // Si tengo 33 o más, canto Falta Envido
        if (myPoints >= 33) return EnvidoCall.FALTA_ENVIDO;

        // Si tengo 30-32, canto Real Envido
        if (myPoints >= 30) return EnvidoCall.REAL_ENVIDO;

        // Sino, Envido normal
        return EnvidoCall.ENVIDO;
    }

    /**
     * Decide si debe aceptar el truco
     */
    private shouldAcceptTruco(game: Game, player: Player, _currentRound: any): boolean {
        const cardsValue = player.cards.reduce((sum, card) => sum + card.trucoValue, 0);
        const averageValue = cardsValue / player.cards.length;

        // Si tiene promedio alto, aceptar
        if (averageValue >= 8) return true;

        // Si tiene al menos una carta muy buena, aceptar
        if (player.cards.some((c) => c.trucoValue >= 12)) return true;

        // Si está ganando en rondas, aceptar
        if (!this.isOpponentLeading(game)) return true;

        // En otros casos, 30% de probabilidad
        return Math.random() < 0.3;
    }

    /**
     * Decide si debe cantar truco con estrategia avanzada
     */
    private shouldCallTruco(game: Game, player: Player, _currentRound: any): boolean {
        const hasVeryGoodCard = player.cards.some((c) => c.trucoValue >= 12);
        const isWinning = !this.isOpponentLeading(game);

        // Puede usar bluff: si tiene al menos una carta buena (>= 10) y está ganando
        const hasGoodCard = player.cards.some((c) => c.trucoValue >= 10);
        const shouldBluff = Math.random() < 0.3; // 30% de probabilidad de bluff

        return (hasVeryGoodCard && isWinning) || (hasGoodCard && isWinning && shouldBluff);
    }

    /**
     * Obtiene el nombre del bot
     */
    getAIName(): string {
        const names = ["IA Experta", "Bot Maestro", "IA Avanzada"];
        return names[Math.floor(Math.random() * names.length)]!;
    }

    /**
     * Obtiene un mensaje de "pensamiento" del bot
     */
    getThinkingMessage(_action: AIAction): string {
        const messages = ["⚡ Análisis profundo...", "🔍 Evaluando probabilidades...", "🎲 Calculando mejor movimiento..."];
        return messages[Math.floor(Math.random() * messages.length)]!;
    }
}

