/**
 * Enum for supported game types
 */
export enum GameType {
    TRUCO = 'truco',
    CHINCHON = 'chinchon',
    POKER = 'poker'
}

/**
 * Array of all supported game types
 */
export const SUPPORTED_GAME_TYPES = Object.values(GameType);

/**
 * Check if a string is a valid game type
 */
export function isValidGameType(gameType: string): gameType is GameType {
    return SUPPORTED_GAME_TYPES.includes(gameType as GameType);
}
