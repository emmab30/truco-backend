// ============================================================================
// SHARED TYPES
// Tipos compartidos entre diferentes partes de la aplicación
// ============================================================================

import { GameType } from "@/constants/gameTypes";
export { GameType };

// ============================================================================
// BASE GAME COMPONENTS
// ============================================================================

export interface BasePlayer {
    id: string;
    name: string;
    photo?: string;
    team: number;
    points: number;
}

export interface BaseGame<TMetadata = any> {
    id: string;
    players: BasePlayer[];
    maxScore: number;
    maxPlayers: number;
    metadata: TMetadata;
}

export interface BaseCard {
    id: string;
    suit: Suit;
    value: CardValue | number;
}

export type Suit = "oros" | "copas" | "espadas" | "bastos";
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12 | number;

// ============================================================================
// ROOM
// ============================================================================

export interface Room {
    id: string;
    name: string;
    maxPlayers: number;
    isActive: boolean;
    connections: Map<string, WebSocket>;
    createdAt: Date;
    isPrivate: boolean;
    password?: string;
    maxScore: number;
    gameType: GameType;
    hasAI?: boolean;
    aiDifficulty?: "easy" | "medium" | "hard";
    players?: Array<{
        id: string;
        name: string;
        photo?: string;
        team: number;
        points: number;
    }>;

    // Internal game state (server-side only, not sent to clients)
    // Clients receive game updates via GAME_UPDATE event with BaseGame structure
    game?: any;
}

// ============================================================================
// GAME HISTORY
// ============================================================================

export interface GameHistory {
    id: string;
    timestamp: Date;
    action: string;
    playerId: string;
    details: any;
}

// ============================================================================
// SERVER TYPES
// ============================================================================

export interface ServerConfig {
    port: number;
    host: string;
    corsOrigin: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateRoomRequest {
    roomName: string;
    playerName: string;
    playerId: string;
    maxPlayers?: number;
    isPrivate?: boolean;
    password?: string;
    maxScore?: number;
    gameType?: GameType;
    hasAI?: boolean;
    aiDifficulty?: "easy" | "medium" | "hard";
}

export interface JoinRoomRequest {
    playerName: string;
    playerId: string;
    password?: string;
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export interface WebSocketMessage {
    type: string;
    data?: any;
    roomId?: string;
    playerId?: string;
}
export interface WebSocketEvents {
    // Generic room events (Client to Server)
    REGISTER_PLAYER: { playerId: string };
    CREATE_ROOM: CreateRoomRequest;
    JOIN_ROOM: JoinRoomRequest;
    LEAVE_ROOM: {};
    GET_ROOMS: {};

    // Generic server responses (Server to Client)
    PLAYER_REGISTERED: { playerId: string };
    ROOM_CREATED: { room: Room };
    ROOM_JOINED: { room: Room };
    PLAYER_JOINED: { player: BasePlayer; room: Room };
    PLAYER_LEFT: { playerId: string; room: Room };
    ROOM_LIST_UPDATED: { rooms: Room[] };
    ERROR: { message: string };

    // Game updates (Server to Client)
    GAME_UPDATE: { game: BaseGame };

    // Game-specific events will be defined in game-specific type files
    [key: string]: any;
}

// ============================================================================
// GAME-SPECIFIC TYPE EXPORTS
// ============================================================================

export * as TrucoTypes from "./truco";
export * as ChinchonTypes from "./chinchon";
