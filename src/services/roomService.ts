import { Room } from "../types";
import { RoomResponse, Team } from "../game/truco/types";
import { TrucoGameService } from "./trucoGameService";
import { generateId } from "../utils";
import { getGameFactory, isValidGameType } from "../game/gameFactory";
import { GameType } from "../constants";

/**
 * Room Service
 * Handles all room-related operations
 */
export class RoomService {
    private rooms: Map<string, Room> = new Map();
    private playerRooms: Map<string, string> = new Map(); // playerId -> roomId

    constructor(private trucoGameService: TrucoGameService) {}

    /**
     * Create a new room
     * @param roomName - Room name
     * @param playerName - Player name
     * @param playerId - Player ID
     * @param maxPlayers - Maximum players
     * @param isPrivate - Whether the room is private
     * @param password - Password for private rooms
     * @param maxScore - Maximum score for the game
     * @param gameType - Type of game ('truco', 'chinchon', etc.)
     * @returns Created room
     */
    createRoom(roomName: string, playerName: string, playerId: string, maxPlayers: number = 2, isPrivate: boolean = false, password?: string, maxScore?: number, gameType: string = GameType.TRUCO): Room {
        // Validate game type
        if (!isValidGameType(gameType)) {
            throw new Error(`Invalid game type: ${gameType}`);
        }

        const roomId = generateId();
        const factory = getGameFactory(gameType as any);
        
        // Use factory to get appropriate max players and score
        const finalMaxPlayers = Math.min(maxPlayers, factory.getMaxPlayers());
        const finalMaxScore = maxScore || factory.getDefaultMaxScore();
        
        const game = this.trucoGameService.createGame(finalMaxScore, gameType);

        // Add the creator as the first player
        const updatedGame = this.trucoGameService.addPlayerToGame(game.id, playerId, playerName, Team.TEAM_1);

        const room: Room = {
            id: roomId,
            name: roomName,
            game: updatedGame,
            maxPlayers: finalMaxPlayers,
            isActive: false,
            connections: new Map(),
            createdAt: new Date(),
            isPrivate,
            ...(isPrivate && password && { password }),
            maxScore: finalMaxScore,
            gameType,
        };

        this.rooms.set(roomId, room);
        this.playerRooms.set(playerId, roomId);

        // Log room creation
        console.log(`🏠 Room created: "${roomName}" | Game: ${gameType} | Players: ${finalMaxPlayers} | Score: ${finalMaxScore} | ${isPrivate ? 'Private' : 'Public'}`);

        return room;
    }

    /**
     * Join a room
     * @param roomId - Room ID
     * @param playerName - Player name
     * @param playerId - Player ID
     * @param password - Password for private rooms
     * @returns Room or null if failed
     */
    joinRoom(roomId: string, playerName: string, playerId: string, password?: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room || room.game.players.length >= room.maxPlayers) {
            return null;
        }

        // Check password for private rooms
        if (room.isPrivate && room.password && room.password !== password) {
            return null;
        }

        // Add player to game
        const team = room.game.players.length % 2;
        const updatedGame = this.trucoGameService.addPlayerToGame(room.game.id, playerId, playerName, team);

        room.game = updatedGame;
        this.playerRooms.set(playerId, roomId);

        return room;
    }

    /**
     * Join a room by ID when player already exists (for reconnection)
     * @param roomId - Room ID
     * @param playerId - Player ID
     * @param password - Optional password for private rooms
     * @returns Room if successful, null otherwise
     */
    joinRoomById(roomId: string, playerId: string, password?: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) {
            return null;
        }

        // Check if room has a game
        if (!room.game) {
            return null;
        }

        // Check if player is already in this room
        const existingPlayer = room.game.players.find((p: any) => p.id === playerId);
        if (existingPlayer) {
            // Player is already in the room, just update mapping
            this.playerRooms.set(playerId, roomId);
            console.log(`🔄 Player reconnected to room: ${roomId}`);
            return room;
        }

        // Player is not in the room, check if we can add them
        if (room.game.players.length >= room.maxPlayers) {
            return null;
        }

        // Check password for private rooms
        if (room.isPrivate && room.password && room.password !== password) {
            return null;
        }

        // Add player to the room
        const playerName = `Player-${playerId.slice(-6)}`; // Generate a name from player ID
        const team = room.game.players.length % 2;
        const updatedGame = this.trucoGameService.addPlayerToGame(room.game.id, playerId, playerName, team);

        room.game = updatedGame;
        this.playerRooms.set(playerId, roomId);

        console.log(`👥 Player joined room: ${roomId} | Players: ${room.game.players.length}/${room.maxPlayers}`);
        return room;
    }

    /**
     * Leave a room
     * @param playerId - Player ID
     * @returns True if successful
     */
    leaveRoom(playerId: string): boolean {
        const roomId = this.playerRooms.get(playerId);
        if (!roomId) return false;

        const room = this.rooms.get(roomId);
        if (!room) return false;

         // Check if this will be the last player leaving OR if there will be only 1 player left (can't play alone)
         const willBeEmpty = room.connections.size <= 1;
         const willHaveOnlyOnePlayer = room.connections.size === 2;

        // Remove player from room connections
        room.connections.delete(playerId);
        this.playerRooms.delete(playerId);

        // Remove player from game
        const updatedGame = {
            ...room.game,
            players: room.game.players.filter((p: any) => p.id !== playerId),
        };
        room.game = updatedGame;

         // If room is now empty OR has only one player left (can't play alone), delete it
         if (willBeEmpty || willHaveOnlyOnePlayer) {
             console.log(`🗑️ Room deleted: ${roomId} (insufficient players)`);
             this.rooms.delete(roomId);
             this.trucoGameService.deleteGame(room.game.id);
         }

        return true;
    }

    /**
     * Get room by ID
     * @param roomId - Room ID
     * @returns Room or null
     */
    getRoom(roomId: string): Room | null {
        return this.rooms.get(roomId) || null;
    }


    /**
     * Get all rooms
     * @returns Array of room responses
     */
    getAllRooms(): RoomResponse[] {
        return Array.from(this.rooms.values()).map((room) => this.roomToResponse(room));
    }

    /**
     * Get room by player ID
     * @param playerId - Player ID
     * @returns Room or null
     */
    getRoomByPlayer(playerId: string): Room | null {
        console.log(`📊 Active rooms: ${this.rooms.size} | Connected players: ${this.playerRooms.size}`);
        const roomId = this.playerRooms.get(playerId);
        if (!roomId) return null;
        return this.getRoom(roomId);
    }

    /**
     * Add WebSocket connection to room
     * @param roomId - Room ID
     * @param playerId - Player ID
     * @param ws - WebSocket connection
     */
    addConnection(roomId: string, playerId: string, ws: any): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.connections.set(playerId, ws);
        }
    }

    /**
     * Remove WebSocket connection from room
     * @param roomId - Room ID
     * @param playerId - Player ID
     */
    removeConnection(roomId: string, playerId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.connections.delete(playerId);
        }
    }

    /**
     * Get all connections in a room
     * @param roomId - Room ID
     * @returns Map of player connections
     */
    getRoomConnections(roomId: string): Map<string, any> {
        const room = this.rooms.get(roomId);
        return room ? room.connections : new Map();
    }

    /**
     * Update room game
     * @param roomId - Room ID
     * @param game - Updated game
     */
    updateRoomGame(roomId: string, game: any): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.game = game;
        }
    }

    /**
     * Set room as active
     * @param roomId - Room ID
     * @param isActive - Active status
     */
    setRoomActive(roomId: string, isActive: boolean): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.isActive = isActive;
        }
    }

    /**
     * Convert room to response format
     * @param room - Room object
     * @returns Room response
     */
    private roomToResponse(room: Room): RoomResponse {
        return {
            id: room.id,
            name: room.name,
            maxPlayers: room.maxPlayers,
            players: room.game.players,
            isActive: room.isActive,
            createdAt: room.createdAt,
            game: room.game,
            isPrivate: room.isPrivate,
            maxScore: room.maxScore,
            gameType: room.gameType,
        };
    }
}
