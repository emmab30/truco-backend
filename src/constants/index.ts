// ============================================================================
// DEPRECATED - Use imports from specific modules instead
// This file re-exports for backwards compatibility
// ============================================================================

// Re-export from new locations
export { GameType, SUPPORTED_GAME_TYPES, isValidGameType } from "@/constants/gameTypes";
export { WEBSOCKET_MESSAGE_TYPES } from "@/shared/constants/websocket";
export { SERVER_CONFIG, GAME_DELAY_NEW_HAND } from "@/shared/constants/server";

// Re-export Truco-specific constants
export {
    TRUCO_VALUES,
    ENVIDO_VALUES,
    POINTS,
    ACTION_PRIORITIES,
    TRUCO_GAME_CONFIG as GAME_CONFIG,
    CARD_TYPE_DESCRIPTIONS,
    SUITS_TRUCO as SUITS,
    VALUES_TRUCO as VALUES,
    ENVIDO_CALLS,
    TRUCO_CALLS,
} from "@/game/truco/constants";

// Re-export shared constants
export { DISPLAY_VALUES } from "@/game/shared/constants";
