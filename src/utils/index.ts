import { Card, Player, PlayedCard, Round, Team, TeamString, RoundWins, TeamWins, CardString, Suit } from "../types";
import { TRUCO_VALUES, ENVIDO_VALUES, DISPLAY_VALUES, SUITS, VALUES, CARD_TYPE_DESCRIPTIONS } from "../constants";

// ============================================================================
// CARD UTILITIES
// ============================================================================

/**
 * Create a card object from a string representation
 * @param cardString - Card in format "value-suit" (e.g., "1-espadas")
 * @returns Card object with all necessary properties
 */
export function createCardFromString(cardString: CardString): Card {
    const parts = cardString.split("-");
    if (parts.length !== 2) {
        throw new Error("Invalid card string format");
    }

    const [value, suit] = parts as [string, Suit];
    const cardValue = parseInt(value, 10);

    // Get display value
    const displayValue = DISPLAY_VALUES[value] || value;

    // Get truco value (higher = better)
    const trucoValue = TRUCO_VALUES[cardString] || 1;

    // Get envido value (0-7, figures are 0)
    const envidoValue = ENVIDO_VALUES[value] || 0;

    return {
        id: cardString,
        suit: suit,
        value: cardValue,
        displayValue: displayValue,
        trucoValue: trucoValue,
        envidoValue: envidoValue,
    };
}

/**
 * Create a shuffled deck of cards
 * @returns Array of card strings
 */
export function createShuffledDeck(): CardString[] {
    const deck: CardString[] = [];

    for (const suit of SUITS) {
        for (const value of VALUES) {
            const cardString = `${value}-${suit}` as CardString;
            deck.push(cardString);
        }
    }

    // Shuffle the deck using Fisher-Yates algorithm
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i]!;
        deck[i] = deck[j]!;
        deck[j] = temp;
    }

    return deck;
}

/**
 * Get card type description for display
 * @param card - Card object
 * @returns Description of the card type
 */
export function getCardTypeDescription(card: Card): string {
    if (card.trucoValue >= 10) {
        if (card.trucoValue === 14) return CARD_TYPE_DESCRIPTIONS.HIGHEST;
        if (card.trucoValue === 13) return CARD_TYPE_DESCRIPTIONS.HIGH;
        if (card.trucoValue === 12) return CARD_TYPE_DESCRIPTIONS.HIGH_7;
        if (card.trucoValue === 11) return CARD_TYPE_DESCRIPTIONS.HIGH_7_OROS;
        if (card.trucoValue === 10) return CARD_TYPE_DESCRIPTIONS.HIGH_3;
    }
    if (card.trucoValue >= 7) return CARD_TYPE_DESCRIPTIONS.MEDIUM;
    return CARD_TYPE_DESCRIPTIONS.LOW;
}

// ============================================================================
// GAME UTILITIES
// ============================================================================

/**
 * Get hand winner name for display
 * @param handWinner - Winner team ('team1' or 'team2')
 * @param players - Array of player objects
 * @returns Formatted winner name
 */
export function getHandWinnerName(handWinner: TeamString, players: Player[]): string {
    if (handWinner === "team1") {
        const team1Players = players
            .filter((p) => p.team === Team.TEAM_1)
            .map((p) => p.name)
            .join(" y ");
        return `Equipo 1 (${team1Players})`;
    } else {
        const team2Players = players
            .filter((p) => p.team === Team.TEAM_2)
            .map((p) => p.name)
            .join(" y ");
        return `Equipo 2 (${team2Players})`;
    }
}

/**
 * Count round wins per player
 * @param rounds - Array of round objects
 * @param players - Array of player objects
 * @returns Array of win counts per player
 */
export function countRoundWins(rounds: Round[], players: Player[]): RoundWins {
    const wins: RoundWins = {};

    // Initialize all players with 0 wins
    players.forEach((player) => {
        wins[player.id] = 0;
    });

    rounds.forEach((round) => {
        if (round.winner) {
            wins[round.winner]!++;
        }
    });

    return wins;
}

/**
 * Determine the winner of a round based on played cards
 * @param cardsPlayed - Array of played card objects
 * @returns Winner player ID or null for tie
 */
export function determineRoundWinner(cardsPlayed: PlayedCard[]): string | null {
    if (cardsPlayed.length === 0) return null;

    let winner = cardsPlayed[0];
    let isTie = false;

    for (let i = 1; i < cardsPlayed.length; i++) {
        if (cardsPlayed[i]!.card.trucoValue > winner!.card.trucoValue) {
            winner = cardsPlayed[i];
            isTie = false;
        } else if (cardsPlayed[i]!.card.trucoValue === winner!.card.trucoValue) {
            isTie = true;
        }
    }

    return isTie ? null : winner!.playerId;
}

/**
 * Determine the winner of a hand based on round results and Truco parda rules
 * @param rounds - Array of round objects
 * @param players - Array of player objects
 * @returns Winner team ('team1' or 'team2')
 */
export function determineHandWinner(rounds: Round[], players: Player[]): TeamString {
    // Count wins per team
    const teamWins: TeamWins = {
        team1: 0,
        team2: 0,
        pardas: 0,
    };

    rounds.forEach((round) => {
        if (round.winner) {
            // Find which team the winner belongs to
            const winnerPlayer = players.find((p) => p.id === round.winner);
            if (winnerPlayer) {
                if (winnerPlayer.team === Team.TEAM_1) {
                    teamWins.team1++;
                } else {
                    teamWins.team2++;
                }
            }
        } else {
            teamWins.pardas++;
        }
    });

    // TRUCO PARDA RULES:
    // 1. If someone has 2 wins → they win
    if (teamWins.team1 >= 2) return "team1";
    if (teamWins.team2 >= 2) return "team2";

    // 2. If no one has 2 wins, apply parda rules
    if (rounds.length >= 2) {
        const firstRound = rounds[0]!;
        const secondRound = rounds[1]!;

        // If first round was parda and second round has winner → second round winner wins
        if (!firstRound.winner && secondRound.winner) {
            const winnerPlayer = players.find((p) => p.id === secondRound.winner);
            return winnerPlayer?.team === Team.TEAM_1 ? "team1" : "team2";
        }

        // If second round was parda and first round has winner → first round winner wins
        if (firstRound.winner && !secondRound.winner) {
            const winnerPlayer = players.find((p) => p.id === firstRound.winner);
            return winnerPlayer?.team === Team.TEAM_1 ? "team1" : "team2";
        }
    }

    // 3. If third round was parda and first round has winner → first round winner wins
    if (rounds.length >= 3) {
        const firstRound = rounds[0]!;
        const thirdRound = rounds[2]!;

        if (firstRound.winner && !thirdRound.winner) {
            const winnerPlayer = players.find((p) => p.id === firstRound.winner);
            return winnerPlayer?.team === Team.TEAM_1 ? "team1" : "team2";
        }
    }

    // 4. If all rounds are pardas → mano wins
    if (teamWins.pardas === rounds.length) {
        const manoPlayer = players.find((p) => p.isMano);
        return manoPlayer?.team === Team.TEAM_1 ? "team1" : "team2";
    }

    // 5. Special case: 1-1-1 (each team won one round, one parda)
    // In this case, the winner is whoever won the FIRST round
    if (teamWins.team1 === 1 && teamWins.team2 === 1 && teamWins.pardas === 1) {
        const firstRound = rounds[0]!;
        if (firstRound.winner) {
            const winnerPlayer = players.find((p) => p.id === firstRound.winner);
            return winnerPlayer?.team === Team.TEAM_1 ? "team1" : "team2";
        }
    }

    // Fallback: team with more wins
    return teamWins.team1 > teamWins.team2 ? "team1" : "team2";
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate if a card string is valid
 * @param cardString - Card string to validate
 * @returns True if valid, false otherwise
 */
export function isValidCardString(cardString: string): cardString is CardString {
    const [value, suit] = cardString.split("-");
    return value !== undefined && suit !== undefined && VALUES.includes(parseInt(value, 10)) && SUITS.includes(suit as Suit);
}

/**
 * Validate if a player ID is valid
 * @param playerId - Player ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidPlayerId(playerId: string): boolean {
    return typeof playerId === "string" && playerId.length > 0;
}

/**
 * Validate if a room ID is valid
 * @param roomId - Room ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidRoomId(roomId: string): boolean {
    return typeof roomId === "string" && roomId.length > 0;
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns New shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i]!;
        shuffled[i] = shuffled[j]!;
        shuffled[j] = temp;
    }
    return shuffled;
}

/**
 * Get random element from array
 * @param array - Array to get element from
 * @returns Random element or undefined if array is empty
 */
export function getRandomElement<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Generate a random ID
 * @param length - Length of the ID (default: 13)
 * @returns Random ID string
 */
export function generateId(length: number = 13): string {
    return Math.random()
        .toString(36)
        .substring(2, 2 + length);
}

/**
 * Capitalize first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
