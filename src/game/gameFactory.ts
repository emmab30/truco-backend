import { Game } from "@/game/truco/types";
import { createGame as createTrucoGame } from "./truco";
import { GameType } from "@/shared/constants";

// Game type definitions - now using enum from constants

// Game factory interface
export interface GameFactory {
    createGame(maxScore?: number): Game;
    getGameType(): GameType;
    getMaxPlayers(): number;
    getMinPlayers(): number;
    getDefaultMaxScore(): number;
    getGameRules(): string[];
}

// Truco game factory
export class TrucoGameFactory implements GameFactory {
    getGameType(): GameType {
        return GameType.TRUCO;
    }

    getMaxPlayers(): number {
        return 6; // Truco can be played with 2, 4, or 6 players
    }

    getMinPlayers(): number {
        return 2;
    }

    getDefaultMaxScore(): number {
        return 15;
    }

    getGameRules(): string[] {
        return [
            'Juego por equipos (2 equipos siempre)',
            'Puede jugarse de 2 (1v1), 4 (2v2) o 6 (3v3) jugadores',
            'Objetivo: llegar a 15 o 30 puntos',
            'Envido: apuesta por la mejor combinación de cartas del mismo palo',
            'Truco: apuesta por ganar la mano con cartas más altas',
            'Flor: cuando tienes 3 cartas del mismo palo'
        ];
    }

    createGame(maxScore: number = 15): Game {
        return createTrucoGame(maxScore);
    }
}

// Chinchon game factory (placeholder for future implementation)
export class ChinchonGameFactory implements GameFactory {
    getGameType(): GameType {
        return GameType.CHINCHON;
    }

    getMaxPlayers(): number {
        return 6;
    }

    getMinPlayers(): number {
        return 2;
    }

    getDefaultMaxScore(): number {
        return 100; // Chinchon typically uses 100 points
    }

    getGameRules(): string[] {
        return [
            'Objetivo: ser el primero en quedarse sin cartas',
            'Forma escaleras (3+ cartas consecutivas del mismo palo)',
            'Forma grupos (3+ cartas del mismo valor)',
            'Descarta una carta al final de cada turno',
            'El juego termina cuando alguien se queda sin cartas'
        ];
    }

    createGame(maxScore: number = 100): Game {
        // For now, return a basic game structure
        // This will be implemented when we add Chinchon logic
        return {
            id: `chinchon-${Date.now()}`,
            phase: 'waiting' as any,
            players: [],
            currentHand: null,
            gameConfig: {
                maxPlayers: 6,
                maxScore: maxScore,
                cardsPerPlayer: 7,
                maxRoundsPerHand: 1,
                roundsToWinHand: 1,
            },
            teamScores: [0, 0],
            winner: null,
            history: [],
        };
    }
}

// Game factory registry
const gameFactories: Map<GameType, GameFactory> = new Map([
    [GameType.TRUCO, new TrucoGameFactory()],
    [GameType.CHINCHON, new ChinchonGameFactory()],
]);

// Factory function to create games
export function createGameByType(gameType: GameType, maxScore?: number): Game {
    const factory = gameFactories.get(gameType);
    if (!factory) {
        throw new Error(`Unknown game type: ${gameType}`);
    }
    
    const finalMaxScore = maxScore || factory.getDefaultMaxScore();

    return factory.createGame(finalMaxScore);
}

// Get game factory by type
export function getGameFactory(gameType: GameType): GameFactory {
    const factory = gameFactories.get(gameType);
    if (!factory) {
        throw new Error(`Unknown game type: ${gameType}`);
    }
    return factory;
}

// Get all available game types
export function getAvailableGameTypes(): GameType[] {
    return Array.from(gameFactories.keys());
}

// Validate game type
export function isValidGameType(gameType: string): gameType is GameType {
    return gameFactories.has(gameType as GameType);
}
