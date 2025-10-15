// ============================================================================
// CHINCHÓN-SPECIFIC TYPES
// ============================================================================

import { BaseCard, BaseGame, BasePlayer } from "./index";

// ============================================================================
// CHINCHÓN CARD & PLAYER EXTENSIONS
// ============================================================================

export interface Card extends BaseCard {
    displayValue: string;
    chinchonValue: number; // Value for Chinchón scoring
}

export interface ChinchonPlayer extends BasePlayer {
    position: number;
    cards: any[];
    combinations: Combination[];
    isDealer: boolean;
    isActive: boolean;
    score: number;
    totalScore: number; // Accumulated score across rounds
    isEliminated: boolean;
    availableActions?: any[];
}

// Legacy alias for backwards compatibility
export type Player = ChinchonPlayer;

export interface PlayedCard {
    card: Card;
    playerId: string;
    playerName: string;
}

export interface Combination {
    id: string;
    type: "sequence" | "group";
    cards: Card[];
    isValid: boolean;
    points: number; // Points this combination is worth
}

export interface ChinchonState {
    isActive: boolean;
    currentPlayerId: string;
    deck: Card[];
    discardPile: (Card | undefined)[];
    roundScores: Map<string, number>;
    combinations: Map<string, Combination[]>; // Player ID -> their combinations
    roundNumber: number;
    winner?: string;
    isRoundComplete: boolean;
    hasDrawnCard: boolean; // Track if current player has drawn a card and must discard
    isRoundClosed: boolean; // Track if round is closed
    roundWinner?: string | undefined; // Track who won the round
    playersReadyForNextRound: Set<string>; // Track which players are ready for next round
}

export interface Round {
    number: number;
    phase: GamePhase;
    cardsPlayed: PlayedCard[];
    winner: string | null;
    scores: Map<string, number>;
}

export interface Hand {
    number: number;
    dealer: string;
    currentPlayerId: string;
    rounds: Round[];
    currentRound: number;
    winner: Team | null;
    points: number;
    chinchonState: ChinchonState;
}

// ============================================================================
// CHINCHÓN GAME METADATA
// ============================================================================

export interface ChinchonMetadata {
    phase: GamePhase;
    players: ChinchonPlayer[];
    iaMode?: boolean;
    currentHand: Hand | null;
    gameConfig: GameConfig;
    teamScores: [number, number];
    winner: Team | null;
    history: GameHistory[];
}

// ============================================================================
// CHINCHÓN GAME (extends BaseGame)
// ============================================================================

export interface ChinchonGame extends BaseGame<ChinchonMetadata> {
    // BaseGame provides: id, players (BasePlayer[]), maxScore, maxPlayers, metadata
}

// Legacy interface for backwards compatibility in game logic
export interface Game {
    id: string;
    phase: GamePhase;
    players: ChinchonPlayer[];
    iaMode?: boolean;
    currentHand: Hand | null;
    gameConfig: GameConfig;
    teamScores: [number, number];
    winner: Team | null;
    history: GameHistory[];
}

// ============================================================================
// CHINCHÓN ENUMS
// ============================================================================

export enum GamePhase {
    WAITING = "waiting",
    DEALING = "dealing",
    PLAYING = "playing",
    ROUND_END = "roundEnd",
    HAND_END = "handEnd",
    GAME_END = "gameEnd",
}

export enum Team {
    TEAM_1 = 0,
    TEAM_2 = 1,
}

export enum Suit {
    OROS = "oros",
    COPAS = "copas",
    ESPADAS = "espadas",
    BASTOS = "bastos",
}

export enum ActionType {
    DRAW_FROM_DECK = "drawFromDeck",
    DRAW_FROM_DISCARD = "drawFromDiscard",
    DISCARD_CARD = "discardCard",
    CLOSE_ROUND = "closeRound",
    CUT_WITH_CARD = "cutWithCard",
    SHOW_COMBINATIONS = "showCombinations",
}

// ============================================================================
// CHINCHÓN ACTION AND MESSAGE TYPES
// ============================================================================

export interface Action {
    type: ActionType;
    label: string;
    priority: number;
    color?: string;
    cardId?: string;
    points?: number;
}

export interface GameHistory {
    id: string;
    timestamp: Date;
    action: string;
    playerId: string;
    details: any;
}

// ============================================================================
// CHINCHÓN CONFIGURATION TYPES
// ============================================================================

export interface GameConfig {
    maxPlayers: number;
    maxScore: number; // Points to eliminate a player
    cardsPerPlayer: number; // 7 for Chinchón
    maxRoundsPerHand: number;
    roundsToWinHand: number;
}

// ============================================================================
// CHINCHÓN API TYPES
// ============================================================================

export interface DrawCardRequest {
    fromDiscardPile: boolean;
}

export interface DiscardCardRequest {
    cardId: string;
}

export interface ShowCombinationsRequest {
    combinations: Combination[];
}

// ============================================================================
// CHINCHÓN RESPONSE TYPES
// ============================================================================

// Legacy - deprecated, use Room from shared types instead
export interface RoomResponse {
    id: string;
    name: string;
    maxPlayers: number;
    players: ChinchonPlayer[];
    isActive: boolean;
    createdAt: Date;
    game: Game;
    isPrivate: boolean;
    maxScore: number;
    gameType: string;
}

// Legacy - deprecated, use ChinchonGame instead
export interface GameResponse {
    id: string;
    phase: GamePhase;
    players: ChinchonPlayer[];
    currentHand: Hand | null;
    teamScores: [number, number];
    winner: Team | null;
}

// ============================================================================
// CHINCHÓN UTILITY TYPES
// ============================================================================

export type CardString = `${number}-${Suit}`;

export interface RoundWins {
    [playerId: string]: number;
}

export interface TeamWins {
    team1: number;
    team2: number;
    pardas: number;
}

// ============================================================================
// CHINCHÓN-SPECIFIC WEBSOCKET EVENT TYPES
// ============================================================================

export interface ChinchonWebSocketEvents {
    // Client to Server - Chinchón-specific
    START_GAME: {};
    DRAW_CARD: DrawCardRequest;
    DISCARD_CARD: DiscardCardRequest;
    CLOSE_ROUND: {};
    CUT_WITH_CARD: { cardId: string };
    SHOW_COMBINATIONS: ShowCombinationsRequest;
    START_NEXT_ROUND: {};

    // Server to Client - Chinchón-specific
    // Note: Room events use base Room type from shared/types
    // Game updates use GAME_UPDATE from shared/types with ChinchonGame
    GAME_STARTED: {};
    CARD_DRAWN: { playerId: string; fromDiscardPile: boolean };
    CARD_DISCARDED: { playerId: string; cardId: string };
    ROUND_CLOSED: { winnerId: string; scores: Map<string, number> };
    COMBINATIONS_SHOWN: { playerId: string; combinations: Combination[] };
}
