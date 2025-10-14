// ============================================================================
// TRUCO-SPECIFIC TYPES
// ============================================================================

export interface Card {
    id: string;
    suit: Suit;
    value: number;
    displayValue: string;
    trucoValue: number;
    envidoValue: number;
}

export interface Player {
    id: string;
    name: string;
    team: Team;
    position: number;
    cards: Card[];
    isDealer: boolean;
    isMano: boolean;
    isActive: boolean;
    score: number;
    points: number;
    envidoScore: number;
    hasPlayedCard: boolean;
    wentToMazo: boolean;
    availableActions?: Action[];
    photo?: string;
}

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
    responses: Map<string, EnvidoResponse>;
    playedLevels: EnvidoCall[];
    envidoCount: number; // Contador de cuántos "Envido" se han cantado (máximo 2)
    winner?: Team;
    callerPoints?: number;
    responderPoints?: number;
    callerMessage?: string;
    responderMessage?: string;
}

export interface TrucoState {
    isActive: boolean;
    currentCall: TrucoCall | null;
    currentCaller: string | null;
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

export interface Game {
    id: string;
    phase: GamePhase;
    players: Player[];
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
}

// ============================================================================
// TRUCO ACTION AND MESSAGE TYPES
// ============================================================================

export interface Action {
    type: ActionType;
    label: string;
    priority: number;
    color?: string;
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

// ============================================================================
// TRUCO RESPONSE TYPES
// ============================================================================

export interface RoomResponse {
    id: string;
    name: string;
    maxPlayers: number;
    players: Player[];
    isActive: boolean;
    createdAt: Date;
    game: Game;
    isPrivate: boolean;
    maxScore: number;
    gameType: string;
}

export interface GameResponse {
    id: string;
    phase: GamePhase;
    players: Player[];
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
export type TeamString = "team1" | "team2";

export interface RoundWins {
    [playerId: string]: number;
}

export interface TeamWins {
    team1: number;
    team2: number;
    pardas: number;
}

// ============================================================================
// TRUCO WEBSOCKET EVENT TYPES
// ============================================================================

export interface WebSocketEvents {
    // Client to Server
    REGISTER_PLAYER: { playerId: string };
    CREATE_ROOM: any; // Will be imported from generic types
    JOIN_ROOM: any; // Will be imported from generic types
    LEAVE_ROOM: {};
    START_GAME: {};
    DEAL_NEW_HAND: {};
    PLAY_CARD: PlayCardRequest;
    CALL_ENVIDO: CallEnvidoRequest;
    RESPOND_ENVIDO: RespondEnvidoRequest;
    CALL_TRUCO: CallTrucoRequest;
    RESPOND_TRUCO: RespondTrucoRequest;
    GO_TO_MAZO: {};
    GET_ROOMS: {};

    // Server to Client
    PLAYER_REGISTERED: { playerId: string };
    ROOM_CREATED: { room: RoomResponse; game: GameResponse };
    ROOM_JOINED: { room: RoomResponse; game: GameResponse };
    PLAYER_JOINED: { player: Player; game: GameResponse };
    PLAYER_LEFT: { playerId: string; game: GameResponse };
    GAME_STARTED: { room: RoomResponse; game: GameResponse };
    CARD_PLAYED: { playerId: string; cardId: string; game: GameResponse };
    ENVIDO_CALLED: { playerId: string; call: EnvidoCall; game: GameResponse };
    ENVIDO_RESPONDED: { playerId: string; response: EnvidoResponse; game: GameResponse };
    TRUCO_CALLED: { playerId: string; call: TrucoCall; game: GameResponse };
    TRUCO_RESPONDED: { playerId: string; response: TrucoResponse; game: GameResponse };
    WENT_TO_MAZO: { playerId: string; game: GameResponse };
    HAND_END: { winner: { name: string; team: Team; points: number }; game: GameResponse };
    NEW_HAND_DEALT: { game: GameResponse };
    NEW_ROUND_DEALT: { game: GameResponse };
    ROOM_LIST_UPDATED: { rooms: RoomResponse[] };
    ERROR: { message: string };
}