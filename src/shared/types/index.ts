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
    status?: "online" | "idle" | "offline";
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

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

// types.ts o donde tengas tus tipos
export interface UserContext {
    uid: string;
    roomId: string;
    location: 'homepage' | 'lobby' | 'game' | 'settings' | 'profile';
    timestamp: number;
}

export interface WebSocketMessage {
    type: string;
    data?: any;
    context?: UserContext; // User context
}
export interface WebSocketEvents {
    // Generic room events (Client to Server)
    LEAVE_ROOM: {};

    // Generic server responses (Server to Client)
    ROOM_CREATED: { room: Room };
    ROOM_UPDATE: { room: Room };
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
