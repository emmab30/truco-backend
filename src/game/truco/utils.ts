// ============================================================================
// TRUCO UTILITIES
// Funciones utilitarias específicas del juego de Truco
// ============================================================================

import { Card, CardString, Player, Round, PlayedCard, TeamString, RoundWins, TeamWins } from "./types";
import { TRUCO_VALUES, ENVIDO_VALUES } from "./constants";
import { DISPLAY_VALUES } from "../shared/constants";
import { generateId } from "../../shared/utils/common";

/**
 * Create a card from a card string (e.g., "1-espadas")
 * @param cardString - Card string in format "value-suit"
 * @returns Card object
 */
export function createCardFromString(cardString: CardString): Card {
    const [valueStr, suit] = cardString.split("-") as [string, string];
    const value = parseInt(valueStr, 10);

    return {
        id: generateId(),
        suit: suit as any,
        value: value,
        displayValue: DISPLAY_VALUES[valueStr] || valueStr,
        trucoValue: TRUCO_VALUES[cardString] || 0,
        envidoValue: ENVIDO_VALUES[valueStr] || 0,
    };
}

/**
 * Create a shuffled deck of cards for Truco
 * @returns Array of card strings
 */
export function createShuffledDeck(): CardString[] {
    const suits = ["oros", "copas", "espadas", "bastos"];
    const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

    const deck: CardString[] = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push(`${value}-${suit}` as CardString);
        }
    }

    // Shuffle using Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i];
        if (temp && deck[j]) {
            deck[i] = deck[j];
            deck[j] = temp;
        }
    }

    return deck;
}

/**
 * Get card type description based on its Truco value
 * @param card - Card to describe
 * @returns Description string
 */
export function getCardTypeDescription(card: Card): string {
    if (card.trucoValue >= 14) return "As de Espadas (Carta más alta)";
    if (card.trucoValue >= 13) return "As de Bastos";
    if (card.trucoValue >= 12) return "7 de Espadas";
    if (card.trucoValue >= 11) return "7 de Oros";
    if (card.trucoValue >= 10) return "Tres (Carta alta)";
    if (card.trucoValue >= 5) return "Carta media";
    return "Carta baja";
}

/**
 * Get the winner name from a team string
 * @param handWinner - Team winner string
 * @param players - Array of players
 * @returns Winner player name
 */
export function getHandWinnerName(handWinner: TeamString, players: Player[]): string {
    if (handWinner === "team1") {
        const team1Player = players.find((p) => p.team === 0);
        return team1Player ? team1Player.name : "Equipo 1";
    } else {
        const team2Player = players.find((p) => p.team === 1);
        return team2Player ? team2Player.name : "Equipo 2";
    }
}

/**
 * Count round wins for each team
 * @param rounds - Array of rounds
 * @param _players - Array of players
 * @returns Round wins count
 */
export function countRoundWins(rounds: Round[], _players: Player[]): RoundWins {
    const wins: RoundWins = {};

    rounds.forEach((round) => {
        if (round.winner) {
            wins[round.winner] = (wins[round.winner] || 0) + 1;
        }
    });

    return wins;
}

/**
 * Determine the winner of a round based on cards played
 * @param cardsPlayed - Cards played in the round
 * @returns Winner player ID or null if tie
 */
export function determineRoundWinner(cardsPlayed: PlayedCard[]): string | null {
    if (cardsPlayed.length < 2) {
        return null;
    }

    let highestCard = cardsPlayed[0];
    let isTie = false;

    for (let i = 1; i < cardsPlayed.length; i++) {
        const currentCard = cardsPlayed[i];
        if (!currentCard || !highestCard) continue;

        if (currentCard.card.trucoValue > highestCard.card.trucoValue) {
            highestCard = currentCard;
            isTie = false;
        } else if (currentCard.card.trucoValue === highestCard.card.trucoValue) {
            isTie = true;
        }
    }

    return isTie ? null : highestCard?.playerId || null;
}

/**
 * Determine the winner of a hand based on round results
 * @param rounds - Array of rounds
 * @param players - Array of players
 * @returns Winner team string
 */
export function determineHandWinner(rounds: Round[], players: Player[]): TeamString {
    const teamWins: TeamWins = {
        team1: 0,
        team2: 0,
        pardas: 0,
    };

    // Count wins per team
    rounds.forEach((round) => {
        if (round.winner) {
            const winnerPlayer = players.find((p) => p.id === round.winner);
            if (winnerPlayer) {
                if (winnerPlayer.team === 0) {
                    teamWins.team1++;
                } else {
                    teamWins.team2++;
                }
            }
        } else {
            teamWins.pardas++;
        }
    });

    // Determine winner with Truco rules
    if (teamWins.team1 >= 2) return "team1";
    if (teamWins.team2 >= 2) return "team2";

    // Special cases with pardas
    if (teamWins.team1 === 1 && teamWins.team2 === 1) {
        // 1-1-1: parda in third round
        if (teamWins.pardas === 1 && rounds.length === 3) {
            // Check who won first round
            const firstRoundWinner = rounds[0]?.winner;
            if (firstRoundWinner) {
                const firstWinnerPlayer = players.find((p) => p.id === firstRoundWinner);
                return firstWinnerPlayer?.team === 0 ? "team1" : "team2";
            }
        }
        return "team1"; // Default to team1 in case of complex tie
    }

    // If only pardas or 1 win + pardas
    if (teamWins.team1 === 1 && teamWins.team2 === 0) return "team1";
    if (teamWins.team2 === 1 && teamWins.team1 === 0) return "team2";

    // Default (shouldn't happen in normal game flow)
    return "team1";
}

/**
 * Validate if a string is a valid card string
 * @param cardString - String to validate
 * @returns True if valid card string
 */
export function isValidCardString(cardString: string): cardString is CardString {
    const parts = cardString.split("-");
    if (parts.length !== 2) return false;

    const [valueStr, suit] = parts;
    const value = parseInt(valueStr || "", 10);
    const validValues = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
    const validSuits = ["oros", "copas", "espadas", "bastos"];

    return validValues.includes(value) && validSuits.includes(suit || "");
}

