// ============================================================================
// EL MENTIROSO - CONSTANTS
// Game configuration and rules for "El Mentiroso" (The Liar)
// ============================================================================

import { GameConfig } from "@/shared/types/mentiroso";

// ============================================================================
// GAME CONFIGURATION
// ============================================================================

export const MENTIROSO_CONFIG: GameConfig = {
    maxPlayers: 6,
    minPlayers: 3,
    cardsPerDeck: 48, // Full Spanish deck (baraja española)
};

// ============================================================================
// DECK CONFIGURATION
// ============================================================================

// Spanish deck suits
export const SUITS_MENTIROSO = ["oros", "copas", "espadas", "bastos"] as const;

// Spanish deck values (without 8s and 9s)
export const VALUES_MENTIROSO = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;

// ============================================================================
// GAME RULES
// ============================================================================

export const GAME_RULES = {
    // Players can play 1 to 4 cards of the same value
    MIN_CARDS_TO_PLAY: 1,
    MAX_CARDS_TO_PLAY: 4,
} as const;

// ============================================================================
// DISPLAY VALUES
// ============================================================================

// Human-readable card names
export const DISPLAY_VALUES: Record<number, string> = {
    1: "1",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    10: "Sota", // Jack
    11: "Caballo", // Knight
    12: "Rey", // King
};
