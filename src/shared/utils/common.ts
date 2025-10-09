// ============================================================================
// COMMON UTILITIES
// Funciones utilitarias genéricas compartidas por toda la aplicación
// ============================================================================

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        if (temp !== undefined && shuffled[j] !== undefined) {
            shuffled[i] = shuffled[j] as T;
            shuffled[j] = temp;
        }
    }
    return shuffled;
}

/**
 * Get a random element from an array
 * @param array - Array to get element from
 * @returns Random element or undefined if array is empty
 */
export function getRandomElement<T>(array: T[]): T | undefined {
    if (array.length === 0) {
        return undefined;
    }
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

/**
 * Generate a unique ID
 * @param length - Length of the ID (default 13)
 * @returns Generated ID
 */
export function generateId(length: number = 13): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

/**
 * Capitalize first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Validate player ID format
 * @param playerId - Player ID to validate
 * @returns True if valid
 */
export function isValidPlayerId(playerId: string): boolean {
    return typeof playerId === "string" && playerId.length > 0 && playerId.length <= 100;
}

/**
 * Validate room ID format
 * @param roomId - Room ID to validate
 * @returns True if valid
 */
export function isValidRoomId(roomId: string): boolean {
    return typeof roomId === "string" && roomId.length > 0 && roomId.length <= 100;
}

