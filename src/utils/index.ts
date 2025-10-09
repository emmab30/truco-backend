// ============================================================================
// DEPRECATED - Use imports from specific modules instead
// This file re-exports for backwards compatibility
// ============================================================================

// Re-export common utilities
export {
    shuffleArray,
    getRandomElement,
    generateId,
    capitalize,
    isValidPlayerId,
    isValidRoomId
} from "@/shared/utils/common";

// Re-export Truco-specific utilities
export {
    createCardFromString,
    createShuffledDeck,
    getCardTypeDescription,
    getHandWinnerName,
    countRoundWins,
    determineRoundWinner,
    determineHandWinner,
    isValidCardString
} from "@/game/truco/utils";
