// ============================================================================
// WEBSOCKET MESSAGE TYPES
// Constantes compartidas para todos los juegos
// ============================================================================

export const WEBSOCKET_MESSAGE_TYPES = {
    // ========== Client to Server - ROOM MANAGEMENT ==========
    JOIN_ROOM_BY_ID: "JOIN_ROOM_BY_ID",
    LEAVE_ROOM: "LEAVE_ROOM",

    // ========== Server to Client - ROOM MANAGEMENT ==========
    ROOM_UPDATE: "ROOM_UPDATE",
    PLAYER_DISCONNECTED: "PLAYER_DISCONNECTED",

    // ========== Client to Server - TRUCO SPECIFIC ==========
    START_GAME: "START_GAME",
    DEAL_NEW_HAND: "DEAL_NEW_HAND",
    PLAY_CARD: "PLAY_CARD",
    CALL_ENVIDO: "CALL_ENVIDO",
    RESPOND_ENVIDO: "RESPOND_ENVIDO",
    CALL_TRUCO: "CALL_TRUCO",
    RESPOND_TRUCO: "RESPOND_TRUCO",
    GO_TO_MAZO: "GO_TO_MAZO",
    SEND_TEAM_MESSAGE: "SEND_TEAM_MESSAGE",
    SEND_TEAM_SIGN: "SEND_TEAM_SIGN",
    SEND_EMOJI_REACTION: "SEND_EMOJI_REACTION",

    // ========== Server to Client - TRUCO SPECIFIC ==========
    GAME_STARTED: "GAME_STARTED",
    CARD_PLAYED: "CARD_PLAYED",
    WENT_TO_MAZO: "WENT_TO_MAZO",
    HAND_END: "HAND_END",

    // ========== Client to Server - CHINCHÓN SPECIFIC ==========
    DRAW_CARD: "DRAW_CARD",
    DISCARD_CARD: "DISCARD_CARD",
    CLOSE_ROUND: "CLOSE_ROUND",
    CUT_WITH_CARD: "CUT_WITH_CARD",
    SHOW_COMBINATIONS: "SHOW_COMBINATIONS",
    START_NEXT_ROUND: "START_NEXT_ROUND",

    // ========== Server to Client - CHINCHÓN SPECIFIC ==========
    CARD_DRAWN: "CARD_DRAWN",
    CARD_DISCARDED: "CARD_DISCARDED",
    ROUND_CLOSED: "ROUND_CLOSED",
    COMBINATIONS_SHOWN: "COMBINATIONS_SHOWN",
    GAME_UPDATE: "GAME_UPDATE",

    // ========== Common Messages ==========
    SPEECH_BUBBLE: "SPEECH_BUBBLE",
    TEAM_MESSAGE: "TEAM_MESSAGE",
    TEAM_SIGN: "TEAM_SIGN",
    EMOJI_REACTION: "EMOJI_REACTION",
    ERROR: "ERROR",
} as const;
