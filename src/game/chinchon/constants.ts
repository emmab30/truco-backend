// ============================================================================
// CHINCHÓN CONSTANTS
// Constantes específicas del juego de Chinchón
// ============================================================================

import { GameConfig } from "./types";

// ============================================================================
// CHINCHÓN CONFIGURATION
// ============================================================================

export const CHINCHON_CONFIG: GameConfig = {
    maxPlayers: 6,
    maxScore: 100, // Points to eliminate a player
    cardsPerPlayer: 7,
    maxRoundsPerHand: 10,
    roundsToWinHand: 1,
};

// ============================================================================
// CARD VALUES - CHINCHÓN
// Card values for Chinchón scoring (figures are worth 10 points)
// ============================================================================

export const CHINCHON_VALUES: { [key: number]: number } = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    10: 10,  // Sota
    11: 10,  // Caballo
    12: 10,  // Rey
};

// ============================================================================
// SCORING - CHINCHÓN
// ============================================================================

export const CHINCHON_SCORING = {
    PERFECT_CHINCHON: -10,      // Win with all cards in combinations
    NORMAL_CLOSE: -10,           // Win by closing with 0-1 uncombined cards
    CUT_WITH_SMALL_CARD: 0,     // Cut with card < 5 (score = card value)
    ELIMINATION_THRESHOLD: 100,  // Points to be eliminated
} as const;

// ============================================================================
// COMBINATION RULES - CHINCHÓN
// ============================================================================

export const COMBINATION_RULES = {
    MIN_SEQUENCE_LENGTH: 3,      // Minimum cards in a sequence
    MIN_GROUP_LENGTH: 3,         // Minimum cards in a group
    MAX_UNCOMBINED_TO_CLOSE: 1,  // Max uncombined cards to close normally
    COMBINATIONS_TO_CUT: 2,      // Number of combinations needed to cut
} as const;

