// ============================================================================
// EL MENTIROSO - TYPE DEFINITIONS
// Type definitions for the card game "El Mentiroso" (The Liar)
// ============================================================================

import { BaseCard, BasePlayer, BaseGame, GameHistory } from "@/shared/types";
import { Suit, GamePhase } from "@/game/shared/types";

// Re-export commonly used types
export { Suit, GamePhase };

// ============================================================================
// CARD AND PLAYER TYPES
// ============================================================================

export interface Card extends BaseCard {
    displayValue: string; // Human-readable value (e.g., "Sota", "Rey")
}

export interface MentirosoPlayer extends BasePlayer {
    position: number;
    cards: Card[];
    isActive: boolean;
    cardCount: number; // Used to show card count without revealing actual cards to other players
}

// ============================================================================
// GAME STATE TYPES
// ============================================================================

/**
 * Represents a group of cards played by a player in a single turn
 */
export interface PlayedCardsGroup {
    playerId: string;
    playerName: string;
    cards: Card[]; // The actual cards played (hidden from other players)
    claimedValue: number; // The value the player claims the cards are
    timestamp: number;
}

/**
 * Game state specific to El Mentiroso
 */
export interface MentirosoState {
    currentPlayerId: string;
    playedCardsStack: PlayedCardsGroup[]; // Stack of all played card groups
    lastPlayedGroup: PlayedCardsGroup | null; // Most recent play
    currentClaimedValue: number | null; // Current value that must be matched or exceeded
    canChallenge: boolean; // Whether a challenge is currently possible
    challengerId: string | null; // ID of the player who made the challenge
    isRevealing: boolean; // Whether cards are being revealed after a challenge
    revealedCards: Card[] | null; // Cards revealed after a challenge
    wasLying: boolean | null; // Result of the challenge
    roundNumber: number;
}

export interface Hand {
    number: number;
    startingPlayerId: string;
    currentPlayerId: string;
    mentirosoState: MentirosoState;
}

// ============================================================================
// GAME METADATA AND MAIN GAME INTERFACE
// ============================================================================

export interface GameConfig {
    maxPlayers: number;
    minPlayers: number;
    cardsPerDeck: number;
}

export interface MentirosoMetadata {
    phase: GamePhase;
    players: MentirosoPlayer[];
    currentHand: Hand | null;
    gameConfig: GameConfig;
    winner: string | null;
    history: GameHistory[];
}

/**
 * Main game interface extending BaseGame
 */
export interface MentirosoGame extends BaseGame<MentirosoMetadata> {
    // BaseGame provides: id, players (BasePlayer[]), maxScore, maxPlayers, metadata
}

/**
 * Internal game representation used by game logic
 */
export interface Game {
    id: string;
    phase: GamePhase;
    players: MentirosoPlayer[];
    currentHand: Hand | null;
    gameConfig: GameConfig;
    winner: string | null;
    history: GameHistory[];
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export enum ActionType {
    PLAY_CARDS = "playCards",
    CHALLENGE = "challenge",
}

export interface Action {
    type: ActionType;
    label: string;
    priority: number;
    color?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface PlayCardsRequest {
    cardIds: string[];
    claimedValue: number; // The value the player claims the cards are
}

export interface ChallengeRequest {
    // Empty - challenge always targets the last player who played cards
}

export interface GameResponse {
    id: string;
    phase: GamePhase;
    players: MentirosoPlayer[];
    currentHand: Hand | null;
    winner: string | null;
}

export interface RoomResponse {
    id: string;
    name: string;
    maxPlayers: number;
    players: MentirosoPlayer[];
    isActive: boolean;
    createdAt: Date;
    game: Game;
    isPrivate: boolean;
    gameType: string;
}

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

export interface MentirosoWebSocketEvents {
    // Client to Server
    START_GAME: {};
    PLAY_CARDS: PlayCardsRequest;
    CHALLENGE: ChallengeRequest;
    CONTINUE_AFTER_CHALLENGE: {}; // Continue after viewing challenge result

    // Server to Client
    GAME_STARTED: {};
    CARDS_PLAYED: {
        playerId: string;
        cardCount: number;
        claimedValue: number;
    };
    CHALLENGE_MADE: {
        challengerId: string;
        targetPlayerId: string;
    };
    CHALLENGE_RESULT: {
        wasLying: boolean;
        revealedCards: Card[];
        challengerId: string;
        targetPlayerId: string;
        penalizedPlayerId: string;
    };
    PLAYER_WON: {
        playerId: string;
        playerName: string;
    };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CardString = `${number}-${Suit}`;
