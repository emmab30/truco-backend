// ============================================================================
// TRUCO-SPECIFIC TYPES
// ============================================================================

import { BaseCard, BaseGame, BasePlayer } from './index';

// ============================================================================
// TRUCO CARD & PLAYER EXTENSIONS
// ============================================================================

export interface Card extends BaseCard {
    displayValue: string;
    trucoValue: number;
    envidoValue: number;
}

export interface TrucoPlayer extends BasePlayer {
    position: number;
    cards: Card[];
    isDealer: boolean;
    isMano: boolean;
    isActive: boolean;
    score: number;
    envidoScore: number;
    hasPlayedCard: boolean;
    wentToMazo: boolean;
    availableActions?: Action[];
}

// Legacy alias for backwards compatibility
export type Player = TrucoPlayer;

export interface PlayedCard {
    card: Card;
    playerId: string;
    playerName: string;
}

export interface EnvidoState {
    isActive: boolean;
    currentCall: EnvidoCall | null;
    currentCaller: string | null;
    originalCaller: string | null;
    nextResponder: string | null; // Quien debe responder al Envido
    responses: Map<string, EnvidoResponse>;
    playedLevels: EnvidoCall[];
    envidoCount: number; // Contador de cuántos "Envido" se han cantado (máximo 2)
    winner?: Team;
    
    // Para el canto de puntos de envido en orden
    pointsAnnounced?: Map<string, number>; // Puntos anunciados por cada jugador
    announcementOrder?: string[]; // Orden en el que los jugadores deben cantar (mano primero)
    currentAnnouncer?: string | null; // Jugador que debe anunciar puntos ahora
    highestPoints?: number; // Puntos más altos anunciados hasta ahora
    highestPointsPlayer?: string | null; // Jugador con los puntos más altos
    
    callerPoints?: number;
    responderPoints?: number;
    callerMessage?: string;
    responderMessage?: string;
}

export interface TrucoState {
    isActive: boolean;
    currentCall: TrucoCall | null;
    currentCaller: string | null;
    originalCaller: string | null; // Quien cantó el Truco original (para escaladas)
    nextResponder: string | null; // Quien debe responder al Truco/Retruco/Vale Cuatro
    responses: Map<string, TrucoResponse>;
    accepted?: boolean;
    winner?: Team;
}

export interface Round {
    number: number;
    phase: GamePhase;
    cardsPlayed: PlayedCard[];
    winner: string | null;
}

export interface Hand {
    number: number;
    dealer: string;
    mano: string;
    currentPlayerId: string;
    rounds: Round[];
    currentRound: number;
    winner: Team | null;
    points: number;
    envidoState: EnvidoState;
    trucoState: TrucoState;
    playerOriginalCards: Map<string, Card[]>; // Cartas originales de cada jugador para calcular envido
}

// ============================================================================
// TRUCO GAME METADATA
// ============================================================================

export interface TrucoMetadata {
    phase: GamePhase;
    players: TrucoPlayer[];
    currentHand: Hand | null;
    gameConfig: GameConfig;
    teamScores: [number, number];
    winner: Team | null;
    history: GameHistory[];
}

// ============================================================================
// TRUCO GAME (extends BaseGame)
// ============================================================================

export interface TrucoGame extends BaseGame<TrucoMetadata> {
    // BaseGame provides: id, players (BasePlayer[]), maxScore, maxPlayers, metadata
}

// Legacy interface for backwards compatibility in game logic
export interface Game {
    id: string;
    phase: GamePhase;
    players: TrucoPlayer[];
    currentHand: Hand | null;
    gameConfig: GameConfig;
    teamScores: [number, number];
    winner: Team | null;
    history: GameHistory[];
}

// ============================================================================
// TRUCO ENUMS
// ============================================================================

export enum GamePhase {
    WAITING = "waiting",
    DEALING = "dealing",
    PLAYING = "playing",
    ENVIDO = "envido",
    TRUCO = "truco",
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

export enum EnvidoCall {
    ENVIDO = "envido",
    REAL_ENVIDO = "real-envido",
    FALTA_ENVIDO = "falta-envido",
}

export enum TrucoCall {
    TRUCO = "truco",
    RETRUCO = "retruco",
    VALE_CUATRO = "vale-cuatro",
}

export enum EnvidoResponse {
    QUIERO = "quiero",
    NO_QUIERO = "no-quiero",
}

export enum TrucoResponse {
    QUIERO = "quiero",
    NO_QUIERO = "no-quiero",
    RETRUCO = "retruco",
    VALE_CUATRO = "vale-cuatro",
}

export enum ActionType {
    ENVIDO = "envido",
    REAL_ENVIDO = "realEnvido",
    FALTA_ENVIDO = "faltaEnvido",
    TRUCO = "truco",
    RETRUCO = "retruco",
    VALE_CUATRO = "valeCuatro",
    QUIERO = "quiero",
    NO_QUIERO = "noQuiero",
    GO_TO_MAZO = "goToMazo",
    TEAM_MESSAGE = "teamMessage",
    TEAM_SIGN = "teamSign",
}

// ============================================================================
// TRUCO ACTION AND MESSAGE TYPES
// ============================================================================

export interface Action {
    type: ActionType;
    label: string;
    priority: number;
    color?: string;
    icon?: string;
    messageId?: string; // For team messages
}

export interface GameHistory {
    id: string;
    timestamp: Date;
    action: string;
    playerId: string;
    details: any;
}

// ============================================================================
// TRUCO CONFIGURATION TYPES
// ============================================================================

export interface GameConfig {
    maxPlayers: number;
    maxScore: number;
    cardsPerPlayer: number;
    maxRoundsPerHand: number;
    roundsToWinHand: number;
}

// ============================================================================
// TRUCO API TYPES
// ============================================================================

export interface PlayCardRequest {
    cardId: string;
}

export interface CallEnvidoRequest {
    call: EnvidoCall;
}

export interface RespondEnvidoRequest {
    response: EnvidoResponse;
}

export interface CallTrucoRequest {
    call: TrucoCall;
}

export interface RespondTrucoRequest {
    response: TrucoResponse;
}

export interface SendTeamMessageRequest {
    messageId: string;
}

export interface SendTeamSignRequest {
    signId: string;
}

// ============================================================================
// TRUCO RESPONSE TYPES
// ============================================================================

// Legacy - deprecated, use Room from shared types instead
export interface RoomResponse {
    id: string;
    name: string;
    maxPlayers: number;
    players: TrucoPlayer[];
    isActive: boolean;
    createdAt: Date;
    game: Game;
    isPrivate: boolean;
    maxScore: number;
    gameType: string;
}

// Legacy - deprecated, use TrucoGame instead
export interface GameResponse {
    id: string;
    phase: GamePhase;
    players: TrucoPlayer[];
    currentHand: Hand | null;
    teamScores: [number, number];
    winner: Team | null;
    maxScore: number;
    maxPlayers?: number; // Include max players for UI display
}

// ============================================================================
// TRUCO UTILITY TYPES
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
// TRUCO-SPECIFIC WEBSOCKET EVENT TYPES
// ============================================================================

export interface TrucoWebSocketEvents {
    // Client to Server - Truco-specific
    START_GAME: {};
    DEAL_NEW_HAND: {};
    PLAY_CARD: PlayCardRequest;
    CALL_ENVIDO: CallEnvidoRequest;
    RESPOND_ENVIDO: RespondEnvidoRequest;
    CALL_TRUCO: CallTrucoRequest;
    RESPOND_TRUCO: RespondTrucoRequest;
    GO_TO_MAZO: {};
    SEND_TEAM_MESSAGE: SendTeamMessageRequest;
    SEND_TEAM_SIGN: SendTeamSignRequest;

    // Server to Client - Truco-specific
    // Note: Room events use base Room type from shared/types
    // Game updates use GAME_UPDATE from shared/types with TrucoGame
    GAME_STARTED: {};
    CARD_PLAYED: { playerId: string; cardId: string };
    ENVIDO_CALLED: { playerId: string; call: EnvidoCall };
    ENVIDO_RESPONDED: { playerId: string; response: EnvidoResponse };
    TRUCO_CALLED: { playerId: string; call: TrucoCall };
    TRUCO_RESPONDED: { playerId: string; response: TrucoResponse };
    WENT_TO_MAZO: { playerId: string };
    HAND_END: { winner: { name: string; team: Team; points: number } };
    NEW_HAND_DEALT: {};
    NEW_ROUND_DEALT: {};
    SPEECH_BUBBLE: { playerId: string; message: string };
    TEAM_MESSAGE: { playerId: string; messageId: string; message: string; icon: string };
}

