// ============================================================================
// SHARED TYPES
// Tipos compartidos entre diferentes partes de la aplicación
// ============================================================================

export interface WebSocketMessage {
    type: string;
    data?: any;
    roomId?: string;
    playerId?: string;
}

export interface Room {
    id: string;
    name: string;
    game: any; // Will be typed by specific game types
    maxPlayers: number;
    isActive: boolean;
    connections: Map<string, WebSocket>;
    createdAt: Date;
    isPrivate: boolean;
    password?: string;
    maxScore: number;
    gameType: string;
}

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
    gameType?: string;
}

export interface JoinRoomRequest {
    playerName: string;
    playerId: string;
    password?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export interface WebSocketEvents {
    // Generic room events
    REGISTER_PLAYER: { playerId: string };
    CREATE_ROOM: CreateRoomRequest;
    JOIN_ROOM: JoinRoomRequest;
    LEAVE_ROOM: {};
    GET_ROOMS: {};
    
    // Generic server responses
    PLAYER_REGISTERED: { playerId: string };
    ROOM_CREATED: { room: any; game: any };
    ROOM_JOINED: { room: any; game: any };
    PLAYER_JOINED: { player: any; game: any };
    PLAYER_LEFT: { playerId: string; game: any };
    ROOM_LIST_UPDATED: { rooms: any[] };
    ERROR: { message: string };
    
    // Game-specific events will be defined in game-specific type files
    [key: string]: any;
}

