// ============================================================================
// SHARED GAME TYPES
// Tipos base compartidos entre diferentes juegos de cartas
// ============================================================================

/**
 * Card suits (palos) - common to all Spanish card games
 */
export enum Suit {
    OROS = "oros",
    COPAS = "copas",
    ESPADAS = "espadas",
    BASTOS = "bastos",
}

/**
 * Base card interface - can be extended by specific games
 */
export interface BaseCard {
    id: string;
    suit: Suit;
    value: number;
    displayValue: string;
}

/**
 * Base player interface - can be extended by specific games
 */
export interface BasePlayer {
    id: string;
    name: string;
    position: number;
    cards: any[];
    isActive: boolean;
}

/**
 * Game phase - can be extended by specific games
 */
export enum GamePhase {
    WAITING = "waiting",
    DEALING = "dealing",
    PLAYING = "playing",
    ROUND_END = "roundEnd",
    HAND_END = "handEnd",
    GAME_END = "gameEnd",
}

/**
 * Base game configuration
 */
export interface BaseGameConfig {
    maxPlayers: number;
    maxScore: number;
    cardsPerPlayer: number;
    maxRoundsPerHand: number;
    roundsToWinHand: number;
}

/**
 * Base game interface
 */
export interface BaseGame {
    id: string;
    phase: GamePhase;
    players: BasePlayer[];
    gameConfig: BaseGameConfig;
    winner: any | null;
    history: any[];
}

