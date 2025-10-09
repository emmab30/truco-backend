// ============================================================================
// CHINCHÓN UTILITIES
// Funciones utilitarias específicas del juego de Chinchón
// ============================================================================

import { Card, Player, Combination } from "@/game/chinchon/types";
import { CHINCHON_VALUES } from "@/game/chinchon/constants";

/**
 * Get next player in turn order
 * @param players - Array of players
 * @param currentPlayerId - Current player ID
 * @returns Next player ID
 */
export function getNextPlayer(players: Player[], currentPlayerId: string): string {
    const currentIndex = players.findIndex((p) => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex]?.id || "";
}

/**
 * Calculate player score based on uncombined cards
 * @param player - Player object
 * @param combinations - Player's combinations
 * @returns Player score
 */
export function calculatePlayerScore(player: Player, combinations: Combination[]): number {
    const combinedCardIds = new Set(combinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));
    const uncombinedCards = player.cards.filter((card: any) => !combinedCardIds.has(card.id));
    return uncombinedCards.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);
}

/**
 * Generate a stable combination ID based on the cards in the combination
 * This ensures the same combination always has the same ID, preventing re-animations
 * @param cards - Cards in the combination
 * @returns Stable combination ID
 */
export function generateStableCombinationId(cards: Card[]): string {
    // Sort cards by ID to ensure consistent ordering
    const sortedCards = [...cards].sort((a, b) => a.id.localeCompare(b.id));
    
    // Create a stable ID by joining card IDs with a separator
    const cardIds = sortedCards.map(card => card.id).join('-');
    
    // Add a prefix to distinguish from regular card IDs
    return `combo-${cardIds}`;
}

/**
 * Get Chinchón value for a card number
 * @param cardValue - Card value (1-12)
 * @returns Point value for Chinchón scoring
 */
export function getChinchonValue(cardValue: number): number {
    return CHINCHON_VALUES[cardValue] || 0;
}

/**
 * Check if cards form a valid sequence
 * @param cards - Cards to check
 * @returns True if cards form a valid sequence
 */
export function isValidSequence(cards: Card[]): boolean {
    if (cards.length < 3) return false;
    
    // All cards must be same suit
    const suit = cards[0]?.suit;
    if (!suit || !cards.every(card => card.suit === suit)) return false;
    
    // Cards must be consecutive
    const sortedCards = [...cards].sort((a, b) => a.value - b.value);
    for (let i = 1; i < sortedCards.length; i++) {
        if (sortedCards[i]!.value !== sortedCards[i - 1]!.value + 1) {
            return false;
        }
    }
    
    return true;
}

/**
 * Check if cards form a valid group
 * @param cards - Cards to check
 * @returns True if cards form a valid group
 */
export function isValidGroup(cards: Card[]): boolean {
    if (cards.length < 3) return false;
    
    // All cards must have same value
    const value = cards[0]?.value;
    return cards.every(card => card.value === value);
}

/**
 * Calculate points for a combination
 * @param cards - Cards in the combination
 * @returns Total points
 */
export function calculateCombinationPoints(cards: Card[]): number {
    return cards.reduce((sum, card) => sum + (card.chinchonValue || 0), 0);
}

