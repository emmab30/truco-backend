// ============================================================================
// TRUCO CONSTANTS
// Constantes específicas del juego de Truco
// ============================================================================

import { Suit, EnvidoCall, TrucoCall, ActionType, GameConfig } from "@/shared/types/truco";

// ============================================================================
// CARD VALUES - TRUCO
// ============================================================================

export const TRUCO_VALUES: Record<string, number> = {
    "1-espadas": 14, // As de Espadas (highest)
    "1-bastos": 13, // As de Bastos
    "7-espadas": 12, // 7 de Espadas
    "7-oros": 11, // 7 de Oros
    "3-oros": 10, // Tres (any suit)
    "3-copas": 10,
    "3-espadas": 10,
    "3-bastos": 10,
    "2-oros": 9, // Dos (any suit)
    "2-copas": 9,
    "2-espadas": 9,
    "2-bastos": 9,
    "1-copas": 8, // Ases falsos
    "1-oros": 8,
    "12-oros": 7, // Rey
    "12-copas": 7,
    "12-espadas": 7,
    "12-bastos": 7,
    "11-oros": 6, // Caballo
    "11-copas": 6,
    "11-espadas": 6,
    "11-bastos": 6,
    "10-oros": 5, // Sota
    "10-copas": 5,
    "10-espadas": 5,
    "10-bastos": 5,
    "7-copas": 4, // 7 de copas/bastos
    "7-bastos": 4,
    "6-oros": 3, // Seis
    "6-copas": 3,
    "6-espadas": 3,
    "6-bastos": 3,
    "5-oros": 2, // Cinco
    "5-copas": 2,
    "5-espadas": 2,
    "5-bastos": 2,
    "4-oros": 1, // Cuatro (lowest)
    "4-copas": 1,
    "4-espadas": 1,
    "4-bastos": 1,
};

export const ENVIDO_VALUES: Record<string, number> = {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "10": 0,
    "11": 0,
    "12": 0, // Figures are 0
};

// ============================================================================
// GAME CONSTANTS - TRUCO
// ============================================================================

export const SUITS_TRUCO: Suit[] = [Suit.OROS, Suit.COPAS, Suit.ESPADAS, Suit.BASTOS];
export const VALUES_TRUCO: number[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export const ENVIDO_CALLS: Record<string, EnvidoCall> = {
    ENVIDO: EnvidoCall.ENVIDO,
    REAL_ENVIDO: EnvidoCall.REAL_ENVIDO,
    FALTA_ENVIDO: EnvidoCall.FALTA_ENVIDO,
};

export const TRUCO_CALLS: Record<string, TrucoCall> = {
    TRUCO: TrucoCall.TRUCO,
    RETRUCO: TrucoCall.RETRUCO,
    VALE_CUATRO: TrucoCall.VALE_CUATRO,
};

// ============================================================================
// POINTS SYSTEM - TRUCO
// ============================================================================

export const POINTS = {
    // Envido points
    ENVIDO_ACCEPTED: 2,
    ENVIDO_REJECTED: 1,
    REAL_ENVIDO_ACCEPTED: 3,
    REAL_ENVIDO_REJECTED: 1,
    FALTA_ENVIDO_ACCEPTED: 30, // Or points needed to reach 30
    FALTA_ENVIDO_REJECTED: 1,

    // Truco points (when accepted)
    TRUCO_ACCEPTED: 2,
    RETRUCO_ACCEPTED: 3,
    VALE_CUATRO_ACCEPTED: 4,

    // Truco points (when rejected)
    TRUCO_REJECTED: 1,
    RETRUCO_REJECTED: 2,
    VALE_CUATRO_REJECTED: 3,

    // Mazo points
    MAZO_FIRST_ROUND: 2,
    MAZO_OTHER_ROUNDS: 1,

    // Hand win points
    HAND_WIN: 1,
} as const;

// ============================================================================
// ACTION PRIORITIES - TRUCO
// ============================================================================

export const ACTION_PRIORITIES: Record<ActionType, number> = {
    [ActionType.ENVIDO]: 1,
    [ActionType.REAL_ENVIDO]: 2,
    [ActionType.FALTA_ENVIDO]: 3,
    [ActionType.TRUCO]: 4,
    [ActionType.RETRUCO]: 5,
    [ActionType.VALE_CUATRO]: 6,
    [ActionType.QUIERO]: 1,
    [ActionType.NO_QUIERO]: 2,
    [ActionType.GO_TO_MAZO]: 999,
    [ActionType.TEAM_MESSAGE]: 1000,
};

// ============================================================================
// CONFIGURATION - TRUCO
// ============================================================================

export const TRUCO_GAME_CONFIG: GameConfig = {
    maxPlayers: 6, // Can be 2, 4, or 6 players (always 2 teams)
    maxScore: 15,
    cardsPerPlayer: 3,
    maxRoundsPerHand: 3,
    roundsToWinHand: 2,
};

// ============================================================================
// CARD TYPE DESCRIPTIONS - TRUCO
// ============================================================================

export const CARD_TYPE_DESCRIPTIONS = {
    HIGHEST: "As de Espadas (Carta más alta)",
    HIGH: "As de Bastos",
    HIGH_7: "7 de Espadas",
    HIGH_7_OROS: "7 de Oros",
    HIGH_3: "Tres (Carta alta)",
    MEDIUM: "Carta media",
    LOW: "Carta baja",
} as const;

// ============================================================================
// TEAM MESSAGES - TRUCO
// ============================================================================

export interface TeamMessage {
    id: string;
    message: string;
    icon: string;
}

export const TEAM_MESSAGES: TeamMessage[] = [
    {
        id: "que-hago",
        message: "¿Que hago?",
        icon: "🤔",
    },
    {
        id: "pone",
        message: "Poné",
        icon: "💪",
    },
    {
        id: "veni",
        message: "Vení",
        icon: "👋",
    },

    // Puntos de envido
    {
        id: "buena-primera",
        message: "¡Tengo puntos!",
        icon: "🔥",
    },
    {
        id: "no-tengo-primera",
        message: "Nada de puntos",
        icon: "😔",
    },
    {
        id: "de-las-viejas",
        message: "¡Tengo de las viejas!",
        icon: "😊",
    },
    // Información sobre cartas
    {
        id: "tengo-segunda",
        message: "¡Tengo para segunda!",
        icon: "💪",
    },
    {
        id: "no-tengo-segunda",
        message: "Van solos muchachos",
        icon: "😔",
    },
    {
        id: "canta",
        message: "Cantá!",
        icon: "🎤",
    },
];
