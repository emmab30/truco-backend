// ============================================================================
// SHARED GAME CONSTANTS
// Constantes compartidas entre juegos de cartas españolas
// ============================================================================

import { Suit } from "@/game/shared/types";

/**
 * Spanish card suits
 */
export const SUITS: Suit[] = [Suit.OROS, Suit.COPAS, Suit.ESPADAS, Suit.BASTOS];

/**
 * Standard Spanish card values (40-card deck)
 * Values: 1, 2, 3, 4, 5, 6, 7, 10 (Sota), 11 (Caballo), 12 (Rey)
 */
export const CARD_VALUES: number[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

/**
 * Display values for special cards
 */
export const DISPLAY_VALUES: Record<string, string> = {
    "1": "A",    // As
    "10": "S",   // Sota
    "11": "C",   // Caballo
    "12": "R",   // Rey
};

