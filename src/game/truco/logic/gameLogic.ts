// ============================================================================
// TRUCO GAME LOGIC
// Core game logic for the Truco card game
// ============================================================================

import { Game, Player, Hand, Round, Card, Team, GamePhase, EnvidoCall, TrucoCall, EnvidoResponse, TrucoResponse } from "@/game/truco/types";
import { POINTS, TRUCO_GAME_CONFIG } from "@/game/truco/constants";
import { createCardFromString, createShuffledDeck, getHandWinnerName, determineRoundWinner, determineHandWinner } from "@/game/truco/utils";
import { generateId } from "@/shared/utils/common";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate points for a hand based on truco level accepted
 * @param rounds - Array of rounds in the hand
 * @returns Points to award to the winner
 */
function calculateHandPoints(currentHand: Hand): number {
    // Check if truco was accepted in this hand
    console.log(`🎲 calculateHandPoints: accepted=${currentHand.trucoState?.accepted}, currentCall=${currentHand.trucoState?.currentCall}`);
    
    if (currentHand.trucoState?.accepted) {
        const trucoCall = currentHand.trucoState.currentCall;
        if (trucoCall === TrucoCall.TRUCO) {
            console.log(`🎲 Returning TRUCO points: ${POINTS.TRUCO_ACCEPTED}`);
            return POINTS.TRUCO_ACCEPTED; // 2 puntos
        }
        else if (trucoCall === TrucoCall.RETRUCO) {
            console.log(`🎲 Returning RETRUCO points: ${POINTS.RETRUCO_ACCEPTED}`);
            return POINTS.RETRUCO_ACCEPTED; // 3 puntos
        }
        else if (trucoCall === TrucoCall.VALE_CUATRO) {
            console.log(`🎲 Returning VALE_CUATRO points: ${POINTS.VALE_CUATRO_ACCEPTED}`);
            return POINTS.VALE_CUATRO_ACCEPTED; // 4 puntos
        }
    }

    // No truco was accepted, standard hand win
    console.log(`🎲 Returning standard hand win: ${POINTS.HAND_WIN}`);
    return POINTS.HAND_WIN; // 1 punto
}

/**
 * Check if the hand already has a determined winner
 * @param rounds - Array of completed rounds
 * @param players - Array of players
 * @returns True if hand has a winner, false otherwise
 */
function isHandComplete(rounds: Round[], players: Player[]): boolean {
    if (rounds.length === 0) return false;

    // Contar victorias por equipo
    let team1Wins = 0;
    let team2Wins = 0;
    let pardas = 0;

    rounds.forEach((round) => {
        if (round.winner) {
            const winnerPlayer = players.find((p) => p.id === round.winner);
            if (winnerPlayer) {
                if (winnerPlayer.team === 0) {
                    team1Wins++;
                } else {
                    team2Wins++;
                }
            }
        } else {
            pardas++;
        }
    });

    // Reglas para determinar si la mano está completa:
    
    // 1. Si un equipo ganó 2 rondas, la mano está completa
    if (team1Wins >= 2 || team2Wins >= 2) return true;

    // 2. Si un equipo ganó 1 ronda y la otra empató (1-0 con parda), la mano está completa
    if (rounds.length >= 2) {
        if ((team1Wins === 1 && team2Wins === 0 && pardas === 1) ||
            (team2Wins === 1 && team1Wins === 0 && pardas === 1)) {
            return true;
        }
    }

    // 3. Si ya se jugaron 3 rondas, la mano está completa
    if (rounds.length >= 3) return true;

    return false;
}

/**
 * Calculate Envido points for a player's cards
 * @param cards - Player's cards
 * @returns Envido points
 */
function calculateEnvidoPoints(cards: Card[]): number {
    // Group cards by suit
    const suitGroups: { [suit: string]: Card[] } = {};
    cards.forEach((card) => {
        if (!suitGroups[card.suit]) {
            suitGroups[card.suit] = [];
        }
        suitGroups[card.suit]!.push(card);
    });

    let maxPoints = 0;

    // Check each suit group
    Object.values(suitGroups).forEach((suitCards) => {
        if (suitCards.length >= 2) {
            // Get the two highest value cards in this suit
            const sortedCards = suitCards.sort((a, b) => b.envidoValue - a.envidoValue);
            const twoHighest = sortedCards.slice(0, 2);
            const points = twoHighest[0]!.envidoValue + twoHighest[1]!.envidoValue + 20;
            maxPoints = Math.max(maxPoints, points);
        }
    });

    // If no two cards of same suit, take the highest single card
    if (maxPoints === 0) {
        maxPoints = Math.max(...cards.map((card) => card.envidoValue));
    }

    return maxPoints;
}

// ============================================================================
// GAME CREATION
// ============================================================================

/**
 * Create a new game instance
 * @returns New game object
 */
export function createGame(maxScore: number = 15): Game {
    return {
        id: generateId(),
        phase: GamePhase.WAITING,
        players: [],
        currentHand: null,
        gameConfig: {
            ...TRUCO_GAME_CONFIG,
            maxScore: maxScore,
        },
        teamScores: [0, 0],
        winner: null,
        history: [],
    };
}

/**
 * Add a player to the game
 * @param game - Game object
 * @param playerId - Player ID
 * @param playerName - Player name
 * @param team - Team number (0 or 1)
 * @returns Updated game object
 */
export function addPlayer(game: Game, playerId: string, playerName: string, team: Team = Team.TEAM_1): Game {
    const newPlayer: Player = {
        id: playerId,
        name: playerName,
        team: team,
        position: game.players.length,
        cards: [],
        isDealer: false,
        isMano: false,
        isActive: true,
        score: 0,
        points: 0,
        envidoScore: 0,
        hasPlayedCard: false,
        wentToMazo: false,
    };

    return {
        ...game,
        players: [...game.players, newPlayer],
    };
}

/**
 * Start the game (set dealer and mano)
 * @param game - Game object
 * @returns Updated game object
 */
export function startGame(game: Game): Game {
    if (game.players.length < 2) {
        throw new Error("Not enough players to start game");
    }

    // Set dealer and mano randomly
    const dealerIndex = Math.floor(Math.random() * game.players.length);
    const manoIndex = (dealerIndex + 1) % game.players.length;

    const updatedPlayers = game.players.map((player, index) => ({
        ...player,
        isDealer: index === dealerIndex,
        isMano: index === manoIndex,
    }));

    return {
        ...game,
        phase: GamePhase.DEALING,
        players: updatedPlayers,
    };
}

// ============================================================================
// HAND MANAGEMENT
// ============================================================================

/**
 * Create a new round
 * @param roundNumber - Round number
 * @returns New round object
 */
function createNewRound(roundNumber: number): Round {
    return {
        number: roundNumber,
        phase: GamePhase.PLAYING,
        cardsPlayed: [],
        winner: null,
    };
}

/**
 * Deal a new hand (new cards for all players)
 * @param game - Game object
 * @returns Updated game object
 */
export function dealNewHand(game: Game): Game {
    // Create and shuffle deck
    const deck = createShuffledDeck();

    // Deal cards to players and reset game state
    const updatedPlayers = game.players.map((player, index) => {
        const playerCards = deck.slice(index * 3, (index + 1) * 3).map(createCardFromString);
        return {
            ...player,
            cards: playerCards,
            hasPlayedCard: false, // Reset for new hand
            wentToMazo: false, // Reset for new hand
        };
    });

    // Rotate mano for new hand
    const currentManoIndex = game.players.findIndex((p) => p.isMano);
    const nextManoIndex = (currentManoIndex + 1) % game.players.length;

    const updatedPlayersWithMano = updatedPlayers.map((player, index) => ({
        ...player,
        isMano: index === nextManoIndex,
    }));

    const manoPlayer = updatedPlayersWithMano[nextManoIndex]!;

    // Create first round
    const firstRound = createNewRound(1);

    // Increment hand number
    const handNumber = game.currentHand ? game.currentHand.number + 1 : 1;

    return {
        ...game,
        phase: GamePhase.PLAYING,
        players: updatedPlayersWithMano,
        currentHand: {
            number: handNumber,
            dealer: game.players.find((p) => p.isDealer)?.id || game.players[0]?.id || '',
            mano: manoPlayer.id,
            currentPlayerId: manoPlayer.id,
            rounds: [firstRound],
            currentRound: 0,
            winner: null,
            points: 0,
            envidoState: {
                isActive: false,
                currentCall: null,
                currentCaller: null,
                originalCaller: null,
                responses: new Map(),
                playedLevels: [],
            },
            trucoState: {
                isActive: false,
                currentCall: null,
                currentCaller: null,
                responses: new Map(),
            },
        },
    };
}

/**
 * Deal a new round within the same hand
 * @param game - Game object
 * @returns Updated game object
 */
export function dealNewRound(game: Game): Game {
    const manoPlayer = game.players.find((p) => p.isMano) || game.players[0]!;

    // Find who starts the new round
    const lastRound = game.currentHand!.rounds[game.currentHand!.rounds.length - 1]!;
    let startingPlayerId = manoPlayer.id; // Default to mano

    if (lastRound && lastRound.winner) {
        // Winner of last round starts the new round
        startingPlayerId = lastRound.winner;
    } else if (lastRound && lastRound.cardsPlayed.length > 0) {
        // In case of tie, the player who started the round begins the next round
        startingPlayerId = lastRound.cardsPlayed[0]?.playerId || '';
    }

    // Reset hasPlayedCard for all players
    const updatedPlayers = game.players.map((p) => ({ ...p, hasPlayedCard: false }));

    // Create new round
    const newRoundNumber = game.currentHand!.rounds.length + 1;
    const newRoundIndex = game.currentHand!.rounds.length;
    const newRound = createNewRound(newRoundNumber);

    // Update the current hand with the new round
    const updatedHand: Hand = {
        ...game.currentHand!,
        rounds: [...game.currentHand!.rounds, newRound],
        currentRound: newRoundIndex,
        currentPlayerId: startingPlayerId,
    };

    return {
        ...game,
        players: updatedPlayers,
        currentHand: updatedHand,
    };
}

// ============================================================================
// CARD PLAYING
// ============================================================================

/**
 * Play a card
 * @param game - Game object
 * @param playerId - Player ID
 * @param cardId - Card ID
 * @returns Updated game object
 */
export function playCard(game: Game, playerId: string, cardId: string): Game {
    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
        throw new Error("Player not found");
    }

    if (player.cards.length === 0) {
        throw new Error("No cards to play");
    }

    // Find the card being played
    const playedCard = player.cards.find((card) => card.id === cardId);
    if (!playedCard) {
        throw new Error("Card not found in player hand");
    }

    // Check if player has already played a card in current round
    const currentRound = game.currentHand!.rounds[game.currentHand!.currentRound];
    if (!currentRound) {
        throw new Error("Current round not found");
    }
    
    const hasPlayedInCurrentRound = currentRound.cardsPlayed?.some((cp) => cp.playerId === playerId);

    if (hasPlayedInCurrentRound) {
        throw new Error("Player has already played a card in this round");
    }

    // Remove the card from player's hand
    const updatedPlayers = game.players.map((p) => (p.id === playerId ? { ...p, cards: p.cards.filter((card) => card.id !== cardId), hasPlayedCard: true } : p));

    // Add the played card to the current round
    const updatedRound: Round = {
        ...currentRound,
        cardsPlayed: [
            ...(currentRound.cardsPlayed || []),
            {
                card: playedCard,
                playerId: playerId,
                playerName: player.name,
            },
        ],
    };

    // Update rounds array
    const updatedRounds = [...game.currentHand!.rounds];
    updatedRounds[game.currentHand!.currentRound] = updatedRound;

    // Check if round is complete
    const activePlayers = updatedPlayers.filter((p) => p.isActive && !p.wentToMazo);
    const roundComplete = updatedRound.cardsPlayed.length >= activePlayers.length;

    let nextPlayerId = playerId;
    let nextRound = game.currentHand!.currentRound;
    let gamePhase = game.phase;

    if (roundComplete) {
        // Round is complete, determine winner
        const roundWinner = determineRoundWinner(updatedRound.cardsPlayed);
        updatedRound.winner = roundWinner;

        if (roundWinner) {
            const winnerPlayer = updatedPlayers.find((p) => p.id === roundWinner);
            console.log(`🏆 Round ${game.currentHand!.currentRound + 1} won by: ${winnerPlayer?.name}`);
        } else {
            console.log(`🤝 Round ${game.currentHand!.currentRound + 1} tied`);
        }

        // Check if hand is complete using the new logic
        if (isHandComplete(updatedRounds, updatedPlayers)) {
            // Hand is complete
            const handWinnerString = determineHandWinner(updatedRounds, updatedPlayers);
            const handWinner = handWinnerString === "team1" ? Team.TEAM_1 : Team.TEAM_2;
            gamePhase = GamePhase.HAND_END;
            nextPlayerId = game.players[0]?.id || '';
            const handWinnerName = getHandWinnerName(handWinnerString, updatedPlayers);

            // Calculate points based on truco level accepted
            const pointsToAdd = calculateHandPoints({
                ...game.currentHand!,
                rounds: updatedRounds,
            });
            const winningTeam = handWinner;

            const finalPlayers = updatedPlayers.map((player) => (player.team === winningTeam ? { ...player, points: player.points + pointsToAdd } : player));

            console.log(`🎉 Hand completed! #${game.currentHand!.number} | Winner: ${handWinnerName} | Points: +${pointsToAdd}`);

            return {
                ...game,
                phase: gamePhase,
                players: finalPlayers,
                currentHand: {
                    ...game.currentHand!,
                    rounds: updatedRounds,
                    currentRound: nextRound,
                    currentPlayerId: nextPlayerId || game.players[0]?.id || '',
                    winner: handWinner,
                    points: pointsToAdd,
                },
            };
        } else {
            // Move to next round
            const newRoundGame = dealNewRound({
                ...game,
                players: updatedPlayers,
                currentHand: {
                    ...game.currentHand!,
                    rounds: updatedRounds,
                },
            });

            return newRoundGame;
        }
    } else {
        // Round not complete, move to next player
        const playersWhoHaventPlayed = activePlayers.filter((p) => !updatedRound.cardsPlayed.some((cp) => cp.playerId === p.id));

        if (playersWhoHaventPlayed.length > 0) {
            const currentPlayerIndex = updatedPlayers.findIndex((p) => p.id === playerId);
            let nextPlayerIndex = (currentPlayerIndex + 1) % updatedPlayers.length;

            // Find next player who hasn't played
            while (updatedRound.cardsPlayed.some((cp) => cp.playerId === updatedPlayers[nextPlayerIndex]?.id)) {
                nextPlayerIndex = (nextPlayerIndex + 1) % updatedPlayers.length;
            }

            nextPlayerId = updatedPlayers[nextPlayerIndex]?.id || '';
        } else {
            nextPlayerId = game.players[0]?.id || '';
        }
    }

    return {
        ...game,
        phase: gamePhase,
        players: updatedPlayers,
        currentHand: {
            ...game.currentHand!,
            rounds: updatedRounds,
            currentRound: nextRound,
            currentPlayerId: nextPlayerId || game.players[0]?.id || '',
        },
    };
}

// ============================================================================
// ENVIDO LOGIC
// ============================================================================

/**
 * Call Envido
 * @param game - Game object
 * @param playerId - Player ID
 * @param call - Envido call type
 * @returns Updated game object
 */
export function callEnvido(game: Game, playerId: string, call: EnvidoCall): Game {
    const currentHand = game.currentHand;
    if (!currentHand) return game;

    // Initialize envido state if it doesn't exist
    const currentEnvidoState = currentHand.envidoState || {
        isActive: false,
        currentCall: null,
        currentCaller: null,
        originalCaller: null,
        responses: new Map(),
        playedLevels: [],
    };

    // If there's already an active envido, this is a raise
    if (currentEnvidoState.isActive) {
        // Update the current call to the higher one
        const newCall = getHigherEnvidoCall(currentEnvidoState.currentCall, call);
        
        // Add the new level to played levels
        const newPlayedLevels = [...currentEnvidoState.playedLevels, newCall];

        return {
            ...game,
            phase: GamePhase.ENVIDO,
            currentHand: {
                ...currentHand,
                envidoState: {
                    ...currentEnvidoState,
                    currentCall: newCall,
                    currentCaller: playerId,
                    originalCaller: currentEnvidoState.originalCaller, // Keep original caller
                    responses: new Map(), // Reset responses for new call
                    playedLevels: newPlayedLevels,
                },
            },
        };
    }

    // New envido call
    return {
        ...game,
        phase: GamePhase.ENVIDO,
        currentHand: {
            ...currentHand,
            envidoState: {
                ...currentEnvidoState,
                isActive: true,
                currentCall: call,
                currentCaller: playerId,
                originalCaller: playerId, // Set original caller for first call
                responses: new Map(),
                playedLevels: [call], // Add first level
            },
        },
    };
}

/**
 * Get the higher envido call between two calls
 * @param currentCall - Current envido call
 * @param newCall - New envido call
 * @returns Higher envido call
 */
function getHigherEnvidoCall(currentCall: EnvidoCall | null, newCall: EnvidoCall): EnvidoCall {
    if (!currentCall) return newCall;

    const callOrder = [EnvidoCall.ENVIDO, EnvidoCall.REAL_ENVIDO, EnvidoCall.FALTA_ENVIDO];
    const currentIndex = callOrder.indexOf(currentCall);
    const newIndex = callOrder.indexOf(newCall);

    return newIndex > currentIndex ? newCall : currentCall;
}

/**
 * Respond to Envido
 * @param game - Game object
 * @param playerId - Player ID
 * @param response - Response ('quiero' or 'no-quiero')
 * @returns Updated game object
 */
export function respondEnvido(game: Game, playerId: string, response: EnvidoResponse): Game {
    const currentHand = game.currentHand;
    if (!currentHand) return game;

    const currentEnvidoState = currentHand.envidoState || {
        isActive: false,
        currentCall: null,
        currentCaller: null,
        originalCaller: null,
        responses: new Map(),
    };

    // Handle "no-quiero" response
    if (response === EnvidoResponse.NO_QUIERO) {
        const callerId = currentEnvidoState.currentCaller;
        const caller = game.players.find((p) => p.id === callerId);
        const callerTeam = caller?.team;

        // Determine points based on current call
        let pointsToAdd = 0;
        const currentCall = currentEnvidoState.currentCall;
        if (currentCall === EnvidoCall.ENVIDO) pointsToAdd = POINTS.ENVIDO_REJECTED;
        else if (currentCall === EnvidoCall.REAL_ENVIDO) pointsToAdd = POINTS.REAL_ENVIDO_REJECTED;
        else if (currentCall === EnvidoCall.FALTA_ENVIDO) pointsToAdd = POINTS.FALTA_ENVIDO_REJECTED;

        const updatedPlayers = game.players.map((p) => (p.team === callerTeam ? { ...p, points: p.points + pointsToAdd } : p));

        return {
            ...game,
            players: updatedPlayers,
            phase: GamePhase.PLAYING,
            currentHand: {
                ...currentHand,
                envidoState: {
                    ...currentEnvidoState,
                    isActive: false,
                    winner: callerTeam || Team.TEAM_1,
                    responses: new Map([...currentEnvidoState.responses, [playerId, response]]),
                },
            },
        };
    }

    // If response is "quiero", resolve the envido
    if (response === EnvidoResponse.QUIERO) {
        const callerId = currentEnvidoState.currentCaller;
        const caller = game.players.find((p) => p.id === callerId);
        const responder = game.players.find((p) => p.id === playerId);

        if (!caller || !responder) return game;

        // Calculate envido points for both players
        const callerPoints = calculateEnvidoPoints(caller.cards);
        const responderPoints = calculateEnvidoPoints(responder.cards);

        // Determine winner (in case of tie, mano wins)
        const callerIsMano = caller.isMano;
        const callerWins = callerPoints > responderPoints || (callerPoints === responderPoints && callerIsMano);
        const winner = callerWins ? caller : responder;
        const winnerTeam = winner.team;

        // Calculate total points based on all envido levels played
        let pointsToAdd = 0;
        const playedLevels = currentEnvidoState.playedLevels || [];
        
        // Count all envido levels that were played
        let envidoCount = 0;
        let realEnvidoCount = 0;
        let faltaEnvidoCount = 0;
        
        // Count each level type
        playedLevels.forEach(level => {
            if (level === EnvidoCall.ENVIDO) {
                envidoCount++;
            } else if (level === EnvidoCall.REAL_ENVIDO) {
                realEnvidoCount++;
            } else if (level === EnvidoCall.FALTA_ENVIDO) {
                faltaEnvidoCount++;
            }
        });
        
        // Calculate points based on counts
        if (faltaEnvidoCount > 0) {
            // For falta envido, calculate points needed to reach 30
            const loser = callerWins ? responder : caller;
            pointsToAdd = Math.min(30 - loser.points, 30);
        } else {
            // Sum all envido levels played
            pointsToAdd = (envidoCount * POINTS.ENVIDO_ACCEPTED) + (realEnvidoCount * POINTS.REAL_ENVIDO_ACCEPTED);
        }

        const updatedPlayers = game.players.map((p) => (p.team === winnerTeam ? { ...p, points: p.points + pointsToAdd } : p));

        // Mano always announces first
        const manoIsCaller = caller.isMano;
        
        let callerMessage, responderMessage;
        
        if (manoIsCaller) {
            // Mano is caller, announces first
            callerMessage = `¡Tengo ${callerPoints}!`;
            responderMessage = callerWins ? "Son buenas" : `¡${responderPoints} son mejores!`;
        } else {
            // Mano is responder, announces first
            responderMessage = `¡Tengo ${responderPoints}!`;
            callerMessage = callerWins ? `¡${callerPoints} son mejores!` : "Son buenas";
        }

        return {
            ...game,
            players: updatedPlayers,
            phase: GamePhase.PLAYING,
            currentHand: {
                ...currentHand,
                envidoState: {
                    ...currentEnvidoState,
                    isActive: false,
                    winner: winnerTeam,
                    responses: new Map([...currentEnvidoState.responses, [playerId, response]]),
                    // Store points for speech bubbles
                    callerPoints: callerPoints,
                    responderPoints: responderPoints,
                    callerMessage: callerMessage,
                    responderMessage: responderMessage,
                },
            },
        };
    }

    // Default case - just add response
    return {
        ...game,
        phase: GamePhase.ENVIDO,
        currentHand: {
            ...currentHand,
            envidoState: {
                ...currentEnvidoState,
                responses: new Map([...currentEnvidoState.responses, [playerId, response]]),
            },
        },
    };
}

// ============================================================================
// TRUCO LOGIC
// ============================================================================

/**
 * Call Truco
 * @param game - Game object
 * @param playerId - Player ID
 * @param call - Truco call type
 * @returns Updated game object
 */
export function callTruco(game: Game, playerId: string, call: TrucoCall): Game {
    const currentHand = game.currentHand;
    if (!currentHand) return game;

    const currentTrucoState = currentHand.trucoState || {
        isActive: false,
        currentCall: null,
        currentCaller: null,
        originalCaller: null,
        responses: new Map(),
    };

    // Check if this is an escalation (truco was already accepted)
    const isEscalation = currentTrucoState.accepted === true;

    console.log(`🎲 callTruco: ${call}, isEscalation: ${isEscalation}, previous accepted: ${currentTrucoState.accepted}`);

    const newTrucoState: any = {
        isActive: true,
        currentCall: call,
        currentCaller: playerId,
        responses: new Map(),
    };

    // Keep accepted flag ONLY if this is an escalation
    if (isEscalation) {
        newTrucoState.accepted = true;
    }

    return {
        ...game,
        phase: GamePhase.TRUCO,
        currentHand: {
            ...currentHand,
            trucoState: newTrucoState,
        },
    };
}

/**
 * Respond to Truco
 * @param game - Game object
 * @param playerId - Player ID
 * @param response - Response
 * @returns Updated game object
 */
export function respondTruco(game: Game, playerId: string, response: TrucoResponse): Game {
    const currentHand = game.currentHand;
    if (!currentHand) return game;

    const currentTrucoState = currentHand.trucoState || {
        isActive: false,
        currentCall: null,
        currentCaller: null,
        originalCaller: null,
        responses: new Map(),
    };

    // Handle "no-quiero" response
    if (response === TrucoResponse.NO_QUIERO) {
        const callerId = currentTrucoState.currentCaller;
        const caller = game.players.find((p) => p.id === callerId);
        const callerTeam = caller?.team;
        const trucoCall = currentTrucoState.currentCall;

        let pointsToAdd = 0;
        if (trucoCall === TrucoCall.TRUCO) pointsToAdd = POINTS.TRUCO_REJECTED;
        else if (trucoCall === TrucoCall.RETRUCO) pointsToAdd = POINTS.RETRUCO_REJECTED;
        else if (trucoCall === TrucoCall.VALE_CUATRO) pointsToAdd = POINTS.VALE_CUATRO_REJECTED;

        const updatedPlayers = game.players.map((p) => (p.team === callerTeam ? { ...p, points: p.points + pointsToAdd } : p));

        return {
            ...game,
            players: updatedPlayers,
            currentHand: {
                ...currentHand,
                winner: callerTeam === Team.TEAM_1 ? Team.TEAM_1 : Team.TEAM_2,
                points: pointsToAdd,
            },
            phase: GamePhase.HAND_END,
        };
    }

    // If response is "quiero", continue with truco resolution
    if (response === TrucoResponse.QUIERO) {
        console.log(`🎲 respondTruco QUIERO: currentCall=${currentTrucoState.currentCall}, setting accepted=true`);
        
        return {
            ...game,
            phase: GamePhase.PLAYING,
            currentHand: {
                ...currentHand,
                trucoState: {
                    ...currentTrucoState,
                    isActive: false,
                    accepted: true,
                    responses: new Map([...currentTrucoState.responses, [playerId, response]]),
                },
            },
        };
    }

    // Handle escalation calls (retruco, vale-cuatro)
    if (response === TrucoResponse.RETRUCO || response === TrucoResponse.VALE_CUATRO) {
        const updatedTrucoState = {
            ...currentTrucoState,
            isActive: true,
            currentCall: response === TrucoResponse.RETRUCO ? TrucoCall.RETRUCO : TrucoCall.VALE_CUATRO,
            currentCaller: playerId,
            responses: new Map(),
        };

        return {
            ...game,
            phase: GamePhase.TRUCO,
            currentHand: {
                ...currentHand,
                trucoState: updatedTrucoState,
            },
        };
    }

    // Default case
    return {
        ...game,
        phase: GamePhase.TRUCO,
        currentHand: {
            ...currentHand,
            trucoState: {
                ...currentTrucoState,
                responses: new Map([...currentTrucoState.responses, [playerId, response]]),
            },
        },
    };
}

// ============================================================================
// MAZO LOGIC
// ============================================================================

/**
 * Go to mazo (surrender)
 * @param game - Game object
 * @param playerId - Player ID
 * @returns Updated game object
 */
export function goToMazo(game: Game, playerId: string): Game {
    const currentHand = game.currentHand;
    if (!currentHand) return game;

    const currentRound = currentHand.rounds[currentHand.currentRound];
    if (!currentRound) return game;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return game;

    // Mark player as went to mazo
    const updatedPlayers = game.players.map((p) => (p.id === playerId ? { ...p, wentToMazo: true } : p));

    // Calculate points based on current state
    let pointsToAdd = 0;
    const opponentTeam = player.team === Team.TEAM_1 ? Team.TEAM_2 : Team.TEAM_1;

    // Check if there are active calls or accepted truco
    const hasActiveEnvido = currentHand.envidoState?.isActive;
    const hasActiveTruco = currentHand.trucoState?.isActive;
    const trucoWasAccepted = currentHand.trucoState?.accepted;
    const envidoWasResolved = currentHand.envidoState?.winner !== undefined;

    console.log(`🎲 goToMazo: hasActiveTruco=${hasActiveTruco}, trucoWasAccepted=${trucoWasAccepted}, trucoCall=${currentHand.trucoState?.currentCall}`);

    if (hasActiveEnvido || hasActiveTruco) {
        // If there are active calls, it's like an abandonment
        if (hasActiveEnvido) {
            pointsToAdd += POINTS.ENVIDO_REJECTED;
        }
        if (hasActiveTruco) {
            const trucoCall = currentHand.trucoState.currentCall;
            if (trucoCall === TrucoCall.TRUCO) pointsToAdd += POINTS.TRUCO_ACCEPTED;
            else if (trucoCall === TrucoCall.RETRUCO) pointsToAdd += POINTS.RETRUCO_ACCEPTED;
            else if (trucoCall === TrucoCall.VALE_CUATRO) pointsToAdd += POINTS.VALE_CUATRO_ACCEPTED;
        }
    } else if (trucoWasAccepted) {
        // Truco was accepted and player goes to mazo - award points based on truco level
        const trucoCall = currentHand.trucoState.currentCall;
        if (trucoCall === TrucoCall.TRUCO) {
            pointsToAdd = POINTS.TRUCO_ACCEPTED;
            console.log(`🎲 goToMazo: Truco was accepted, awarding ${POINTS.TRUCO_ACCEPTED} points`);
        } else if (trucoCall === TrucoCall.RETRUCO) {
            pointsToAdd = POINTS.RETRUCO_ACCEPTED;
            console.log(`🎲 goToMazo: Retruco was accepted, awarding ${POINTS.RETRUCO_ACCEPTED} points`);
        } else if (trucoCall === TrucoCall.VALE_CUATRO) {
            pointsToAdd = POINTS.VALE_CUATRO_ACCEPTED;
            console.log(`🎲 goToMazo: Vale Cuatro was accepted, awarding ${POINTS.VALE_CUATRO_ACCEPTED} points`);
        }
    } else if (envidoWasResolved) {
        // Envido was already resolved - standard mazo rules but only 1 point
        pointsToAdd = POINTS.MAZO_OTHER_ROUNDS; // 1 point
        console.log(`🎲 goToMazo: Envido was resolved, awarding ${POINTS.MAZO_OTHER_ROUNDS} point`);
    } else {
        // No active calls - standard mazo rules
        if (currentRound.number === 1) {
            pointsToAdd = POINTS.MAZO_FIRST_ROUND;
            console.log(`🎲 goToMazo: First round mazo, awarding ${POINTS.MAZO_FIRST_ROUND} points`);
        } else {
            pointsToAdd = POINTS.MAZO_OTHER_ROUNDS;
            console.log(`🎲 goToMazo: Other round mazo, awarding ${POINTS.MAZO_OTHER_ROUNDS} point`);
        }
    }

    // Add points to opponent team
    const finalPlayers = updatedPlayers.map((p) => (p.team === opponentTeam ? { ...p, points: p.points + pointsToAdd } : p));

    return {
        ...game,
        players: finalPlayers,
        currentHand: {
            ...currentHand,
            currentPlayerId: game.players[0]?.id || '',
            winner: opponentTeam === Team.TEAM_1 ? Team.TEAM_1 : Team.TEAM_2,
            points: pointsToAdd,
        },
        phase: GamePhase.HAND_END,
    };
}

