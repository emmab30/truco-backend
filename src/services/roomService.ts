import { Room } from "@/shared/types";
import { RoomResponse, Team } from "@/shared/types/truco";
import { TrucoGameService } from "@/services/trucoGameService";
import { ChinchonGameService } from "@/services/chinchonGameService";
import { generateId, formatPlayerName } from "@/shared/utils/common";
import { getGameFactory, isValidGameType } from "@/game/gameFactory";
import { GameType } from "@/shared/constants";
import { ChinchonAIService, AIDifficulty } from "@/game/chinchon/ai/aiService";

/**
 * Room Service
 * Handles all room-related operations
 */
export class RoomService {
    private rooms: Map<string, Room> = new Map();
    private playerRooms: Map<string, string> = new Map(); // playerId -> roomId
    private aiService: ChinchonAIService = new ChinchonAIService();

    constructor(private trucoGameService: TrucoGameService, private chinchonGameService: ChinchonGameService) {}

    /**
     * Get the appropriate game service based on game type
     */
    private getGameService(gameType: string): any {
        switch (gameType) {
            case GameType.TRUCO:
                return this.trucoGameService;
            case GameType.CHINCHON:
                return this.chinchonGameService;
            default:
                return this.trucoGameService; // Default to Truco
        }
    }

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
     * @param hasAI - Whether to include AI player
     * @param aiDifficulty - AI difficulty level
     * @param playerPhoto - Player photo URL
     * @returns Created room
     */
    createRoom(roomName: string, playerName: string, playerId: string, maxPlayers: number = 2, isPrivate: boolean = false, password?: string, maxScore?: number, gameType: string = GameType.TRUCO, hasAI: boolean = false, aiDifficulty: AIDifficulty = 'medium', playerPhoto?: string | null): Room {
        // Validate game type
        if (!isValidGameType(gameType)) {
            throw new Error(`Invalid game type: ${gameType}`);
        }

        const roomId = generateId();
        const factory = getGameFactory(gameType as any);
        
        // Use factory to get appropriate max players and score
        const finalMaxPlayers = Math.min(maxPlayers, factory.getMaxPlayers());
        const finalMaxScore = maxScore || factory.getDefaultMaxScore();
        
        // Get the appropriate game service based on game type
        const gameService = this.getGameService(gameType);
        const game = gameService.createGame(finalMaxScore, gameType);

        // Update game config with the correct maxPlayers for the room
        game.gameConfig.maxPlayers = finalMaxPlayers;
        gameService.updateGame(game);

        // Format player name for privacy (only first name + initial of last name)
        const formattedPlayerName = formatPlayerName(playerName);

        // Add the creator as the first player
        let updatedGame = gameService.addPlayerToGame(game.id, playerId, formattedPlayerName, Team.TEAM_1, playerPhoto || undefined);

        // NOTE: AI players are now added in websocketService.ts after room creation
        // This ensures all AI players use the same aiService instance as the handler

        const room: Room = {
            id: roomId,
            name: roomName,
            game: updatedGame,
            maxPlayers: finalMaxPlayers,
            isActive: false, // Will be activated in websocketService after AI players are added
            connections: new Map(),
            createdAt: new Date(),
            isPrivate,
            ...(isPrivate && password && { password }),
            maxScore: finalMaxScore,
            gameType,
            hasAI,
            aiDifficulty,
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
     * @param playerPhoto - Player photo URL
     * @returns Room or null if failed
     */
    joinRoom(roomId: string, playerName: string, playerId: string, password?: string, playerPhoto?: string | null): Room | null {
        const room = this.rooms.get(roomId);
        if (!room || room.game.players.length >= room.maxPlayers) {
            return null;
        }

        // Check password for private rooms
        if (room.isPrivate && room.password && room.password !== password) {
            return null;
        }

        // Format player name for privacy (only first name + initial of last name)
        const formattedPlayerName = formatPlayerName(playerName);

        // Add player to game
        const team = room.game.players.length % 2;
        const gameService = this.getGameService(room.gameType);
        const updatedGame = gameService.addPlayerToGame(room.game.id, playerId, formattedPlayerName, team, playerPhoto || undefined);

        room.game = updatedGame;
        this.playerRooms.set(playerId, roomId);

        return room;
    }

    /**
     * Join a room by ID when player already exists (for reconnection)
     * @param roomId - Room ID
     * @param playerId - Player ID
     * @param password - Optional password for private rooms
     * @param playerName - Player name
     * @param playerPhoto - Player photo URL
     * @returns Room if successful, null otherwise
     */
    joinRoomById(roomId: string, playerId: string, password?: string, playerName?: string, playerPhoto?: string | null): Room | null {
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
            // Player is already in the room, just update mapping and photo if needed
            this.playerRooms.set(playerId, roomId);
            // Update photo if provided and different
            if (playerPhoto && existingPlayer.photo !== playerPhoto) {
                existingPlayer.photo = playerPhoto;
                // Update the game with the modified player
                const gameService = this.getGameService(room.gameType);
                gameService.updateGame(room.game);
            }
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
        const finalPlayerName = playerName ? formatPlayerName(playerName) : `Player-${playerId.slice(-6)}`;
        const team = room.game.players.length % 2;
        const gameService = this.getGameService(room.gameType);
        const updatedGame = gameService.addPlayerToGame(room.game.id, playerId, finalPlayerName, team, playerPhoto || undefined);

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
             const gameService = this.getGameService(room.gameType);
             gameService.deleteGame(room.game.id);
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
        console.log(`This rooms?`, this.rooms);
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
     * Get AI service instance
     * @returns AI service
     */
    getAIService(): ChinchonAIService {
        return this.aiService;
    }

    /**
     * Clean up empty rooms (rooms with no active WebSocket connections)
     * This should be called periodically to free up resources
     * @returns Number of rooms cleaned up
     */
    cleanupEmptyRooms(): number {
        const roomsToDelete: string[] = [];
        const now = Date.now();
        const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

        for (const [roomId, room] of this.rooms.entries()) {
            // Check if room has any active connections
            const hasActiveConnections = room.connections.size > 0;
            const roomAge = now - room.createdAt.getTime();

            // Delete room if:
            // 1. It has no active connections
            // 2. AND it's been inactive for more than 30 minutes
            if (!hasActiveConnections && roomAge > ROOM_TIMEOUT) {
                roomsToDelete.push(roomId);
            }
        }

        // Delete the rooms
        for (const roomId of roomsToDelete) {
            const room = this.rooms.get(roomId);
            if (room) {
                console.log(`🧹 Cleaning up empty room: ${room.name} (${roomId}) - Age: ${Math.round((now - room.createdAt.getTime()) / 60000)} minutes`);
                
                // Remove all player mappings
                for (const player of room.game.players) {
                    this.playerRooms.delete(player.id);
                }
                
                // Delete the room
                this.rooms.delete(roomId);
            }
        }

        if (roomsToDelete.length > 0) {
            console.log(`🧹 Cleaned up ${roomsToDelete.length} empty room(s). Active rooms: ${this.rooms.size}`);
        }

        return roomsToDelete.length;
    }

    /**
     * Get statistics about rooms
     * @returns Room statistics
     */
    getRoomStats(): { totalRooms: number; activeRooms: number; emptyRooms: number; totalPlayers: number } {
        let activeRooms = 0;
        let emptyRooms = 0;
        let totalPlayers = 0;

        for (const room of this.rooms.values()) {
            if (room.connections.size > 0) {
                activeRooms++;
                totalPlayers += room.connections.size;
            } else {
                emptyRooms++;
            }
        }

        return {
            totalRooms: this.rooms.size,
            activeRooms,
            emptyRooms,
            totalPlayers,
        };
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
