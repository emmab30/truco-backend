import { Game, Player, Hand, Card, Team, GamePhase, ActionType, Combination, Suit, ChinchonState } from "@/game/chinchon/types";
import { CHINCHON_CONFIG, CHINCHON_VALUES, VALUES_CHINCHON } from "@/game/chinchon/constants";
import { generateId } from "@/shared/utils/common";
import { generateStableCombinationId } from "@/game/chinchon/utils";

// ============================================================================
// CHINCHÓN GAME LOGIC
// ============================================================================

// ============================================================================
// GAME CREATION AND INITIALIZATION
// ============================================================================

export function createGame(maxScore: number = 100): Game {
    const gameId = generateId();

    return {
        id: gameId,
        phase: GamePhase.WAITING,
        players: [],
        currentHand: null,
        gameConfig: { ...CHINCHON_CONFIG, maxScore },
        teamScores: [0, 0],
        winner: null,
        history: [],
    };
}

export function addPlayer(game: Game, playerId: string, playerName: string, team: Team): Game {
    const existingPlayer = game.players.find((p) => p.id === playerId);
    if (existingPlayer) {
        return game; // Player already exists
    }

    const newPlayer: Player = {
        id: playerId,
        name: playerName,
        team,
        position: game.players.length,
        cards: [],
        isDealer: false,
        isActive: true,
        score: 0,
        totalScore: 0,
        isEliminated: false,
        availableActions: [],
    };

    return {
        ...game,
        players: [...game.players, newPlayer],
    };
}

export function startGame(game: Game): Game {
    if (game.players.length < 2) {
        return game; // Need at least 2 players
    }

    const updatedGame = dealNewHand(game);
    return updatedGame;
}

// ============================================================================
// HAND AND ROUND MANAGEMENT
// ============================================================================

export function dealNewHand(game: Game): Game {
    const deck = createShuffledDeck();
    const players = game.players.map((player) => ({
        ...player,
        cards: [],
        isActive: true,
        availableActions: [],
    }));

    // Deal 7 cards to each player
    players.forEach((player) => {
        for (let i = 0; i < CHINCHON_CONFIG.cardsPerPlayer; i++) {
            const card = deck.pop();
            if (card) {
                (player.cards as Card[]).push(card);
            }
        }
    });

    // Create discard pile with one card
    const discardCard = deck.pop();
    const discardPile: (Card | undefined)[] = discardCard ? [discardCard] : [];

    const newHand: Hand = {
        number: (game.currentHand?.number || 0) + 1,
        dealer: players[0]?.id || "", // First player is dealer
        currentPlayerId: players[0]?.id || "",
        rounds: [],
        currentRound: 0,
        winner: null,
        points: 0,
        chinchonState: {
            isActive: true,
            currentPlayerId: players[0]?.id || "",
            deck,
            discardPile,
            roundScores: new Map(),
            combinations: new Map(),
            roundNumber: 1,
            isRoundComplete: false,
            hasDrawnCard: false, // Player hasn't drawn a card yet
            isRoundClosed: false,
            roundWinner: undefined,
            playersReadyForNextRound: new Set(),
        },
    };

    // Set available actions for current player
    const currentPlayer = players.find((p) => p.id === newHand.currentPlayerId);
    if (currentPlayer) {
        currentPlayer.availableActions = getAvailableActions(game, currentPlayer.id) as unknown as never[];
    }

    // Detect initial combinations for all players
    players.forEach((player) => {
        const combinations = findCombinations(player.cards as Card[]);
        newHand.chinchonState.combinations.set(player.id, combinations);
    });

    return {
        ...game,
        players,
        currentHand: newHand,
        phase: GamePhase.PLAYING,
    };
}

// ============================================================================
// CARD ACTIONS
// ============================================================================

export function drawCard(game: Game, playerId: string, fromDiscardPile: boolean): Game {
    if (!game.currentHand || !game.currentHand.chinchonState) {
        return game;
    }

    const player = game.players.find((p) => p.id === playerId);
    if (!player || player.id !== game.currentHand.chinchonState.currentPlayerId) {
        return game; // Not player's turn
    }

    let chinchonState = game.currentHand.chinchonState;

    // If player already drew a card this turn, they cannot draw another
    if (chinchonState.hasDrawnCard) {
        return game; // Player already drew a card, must discard
    }

    console.log("🎴 Alzó una carta");
    console.log(`📊 Deck size ANTES: ${chinchonState.deck.length}`);
    console.log(`📊 Discard pile size ANTES: ${chinchonState.discardPile.length}`);
    console.log(`📊 Trying to draw from: ${fromDiscardPile ? "DISCARD PILE" : "DECK"}`);

    let drawnCard: Card | null = null;

    if (fromDiscardPile && chinchonState.discardPile.length > 0) {
        // Draw from discard pile
        drawnCard = chinchonState.discardPile.pop() || null;
    } else {
        // If deck is empty or has only 1 card left, recycle discard pile first
        if (chinchonState.deck.length <= 1 && chinchonState.discardPile.length > 1) {
            chinchonState = recycleDiscardPile(chinchonState);
        }

        if (chinchonState.deck.length > 0) {
            drawnCard = chinchonState.deck.pop() || null;
        }
    }

    if (!drawnCard) {
        console.log("❌ Failed to draw card - no cards available");
        return game; // No cards available
    }

    // Add card to player's hand
    const updatedPlayers = game.players.map((p) => (p.id === playerId ? { ...p, cards: [...p.cards, drawnCard] } : p));

    // Mark that player has drawn a card and must discard
    const updatedChinchonState = {
        ...chinchonState,
        deck: chinchonState.deck,
        discardPile: chinchonState.discardPile,
        hasDrawnCard: true, // Player must now discard a card
    };

    // Detect combinations for the player who drew the card
    const currentPlayer = updatedPlayers.find((p) => p.id === playerId);
    if (currentPlayer) {
        const combinations = findCombinations(currentPlayer.cards as Card[]);
        updatedChinchonState.combinations.set(playerId, combinations);
    }

    // Build the updated game state
    const updatedGame = {
        ...game,
        players: updatedPlayers,
        currentHand: {
            ...game.currentHand,
            chinchonState: updatedChinchonState,
        },
    };

    // Update available actions for current player using the UPDATED game state
    if (currentPlayer) {
        currentPlayer.availableActions = getAvailableActions(updatedGame, playerId);
    }

    return updatedGame;
}

export function discardCard(game: Game, playerId: string, cardId: string): Game {
    if (!game.currentHand || !game.currentHand.chinchonState) {
        return game;
    }

    const player = game.players.find((p) => p.id === playerId);
    if (!player || player.id !== game.currentHand.chinchonState.currentPlayerId) {
        return game; // Not player's turn
    }

    const chinchonState = game.currentHand.chinchonState;

    // Player can only discard if they have drawn a card (have 8 cards)
    if (!chinchonState.hasDrawnCard) {
        return game; // Player hasn't drawn a card yet
    }

    const cardIndex = player.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
        return game; // Card not found
    }

    const discardedCard = player.cards[cardIndex];

    // Remove card from player's hand
    const updatedPlayers = game.players.map((p) => (p.id === playerId ? { ...p, cards: p.cards.filter((c) => c.id !== cardId) } : p));

    // Add card to discard pile
    const updatedChinchonState = {
        ...game.currentHand.chinchonState,
        discardPile: [...game.currentHand.chinchonState.discardPile, discardedCard],
        hasDrawnCard: false, // Reset for next player
    };

    // Move to next player
    const nextPlayerId = getNextPlayer(game.players, playerId);
    updatedChinchonState.currentPlayerId = nextPlayerId;

    // Update available actions for next player
    const nextPlayer = updatedPlayers.find((p) => p.id === nextPlayerId);
    if (nextPlayer) {
        nextPlayer.availableActions = getAvailableActions(game, nextPlayerId);
    }

    // Clear actions for current player
    const currentPlayer = updatedPlayers.find((p) => p.id === playerId);
    if (currentPlayer) {
        currentPlayer.availableActions = [];
    }

    // Detect combinations for the player who discarded the card
    if (currentPlayer) {
        console.log("🎯 discardCard - currentPlayer after discard:", {
            playerId: currentPlayer.id,
            cardsLeft: currentPlayer.cards.length,
            cards: currentPlayer.cards.map((c) => c.id),
        });

        const combinations = findCombinations(currentPlayer.cards as Card[]);
        updatedChinchonState.combinations.set(playerId, combinations);

        // Check if player has 2+ combinations and no uncombined cards (automatic win)
        const combinedCardIds = new Set(combinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));
        const uncombinedCards = currentPlayer.cards.filter((card: any) => !combinedCardIds.has(card.id));

        if (combinations.length >= 2 && uncombinedCards.length === 0) {
            // Player wins automatically with -10 points
            console.log("🎯 Automatic win in discardCard - setting isRoundClosed = true");
            updatedChinchonState.isRoundClosed = true;
            updatedChinchonState.roundWinner = playerId;

            // Calculate points for the losing player (sum of uncombined cards)
            const losingPlayer = updatedPlayers.find((p) => p.id !== playerId);
            let losingPlayerPoints = 0;

            if (losingPlayer) {
                const losingPlayerCombinations = updatedChinchonState.combinations.get(losingPlayer.id) || [];
                const losingPlayerCombinedCardIds = new Set(losingPlayerCombinations.flatMap((c) => c.cards.map((card) => card.id)));
                const losingPlayerUncombinedCards = losingPlayer.cards.filter((card) => !losingPlayerCombinedCardIds.has(card.id));
                losingPlayerPoints = losingPlayerUncombinedCards.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);
            }

            // Update round scores for both players
            updatedChinchonState.roundScores.set(playerId, -10); // Winner gets -10 points
            updatedChinchonState.roundScores.set(losingPlayer?.id || "", losingPlayerPoints); // Loser gets sum of uncombined cards

            // Update both players' total scores
            const updatedPlayersWithScore = updatedPlayers.map((p) => {
                if (p.id === playerId) {
                    // Winner gets -10 points
                    const newScore = (p.totalScore || 0) - 10;
                    console.log(`🎯 Winner ${p.name} score: ${p.totalScore || 0} → ${newScore}`);
                    return {
                        ...p,
                        totalScore: newScore,
                    };
                } else if (p.id === losingPlayer?.id) {
                    // Loser gets sum of uncombined cards
                    const newScore = (p.totalScore || 0) + losingPlayerPoints;
                    console.log(`🎯 Loser ${p.name} score: ${p.totalScore || 0} → ${newScore} (+${losingPlayerPoints})`);
                    return {
                        ...p,
                        totalScore: newScore,
                    };
                }
                return p;
            });

            console.log("🎯 Automatic win - RETURNING GAME WITH isRoundClosed = true");
            console.log(
                "🎯 Updated players with scores:",
                updatedPlayersWithScore.map((p) => `${p.name}: ${p.totalScore}`)
            );
            return {
                ...game,
                players: updatedPlayersWithScore,
                currentHand: {
                    ...game.currentHand,
                    chinchonState: updatedChinchonState,
                },
            };
        }

        // Check if player has no cards left (normal win condition) - PRIORITY OVER COMBINATIONS
        if (currentPlayer.cards.length === 0) {
            console.log("🎯 Normal win in discardCard - player has no cards left, setting isRoundClosed = true");
            updatedChinchonState.isRoundClosed = true;
            updatedChinchonState.roundWinner = playerId;

            // Calculate points for the losing player (sum of uncombined cards)
            const losingPlayer = updatedPlayers.find((p) => p.id !== playerId);
            let losingPlayerPoints = 0;

            if (losingPlayer) {
                const losingPlayerCombinations = updatedChinchonState.combinations.get(losingPlayer.id) || [];
                const losingPlayerCombinedCardIds = new Set(losingPlayerCombinations.flatMap((c) => c.cards.map((card) => card.id)));
                const losingPlayerUncombinedCards = losingPlayer.cards.filter((card) => !losingPlayerCombinedCardIds.has(card.id));
                losingPlayerPoints = losingPlayerUncombinedCards.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);
            }

            // Update round scores for both players
            updatedChinchonState.roundScores.set(playerId, -10); // Winner gets -10 points
            updatedChinchonState.roundScores.set(losingPlayer?.id || "", losingPlayerPoints); // Loser gets sum of uncombined cards

            // Update both players' total scores
            const updatedPlayersWithScore = updatedPlayers.map((p) => {
                if (p.id === playerId) {
                    // Winner gets -10 points
                    const newScore = (p.totalScore || 0) - 10;
                    console.log(`🎯 Winner ${p.name} score: ${p.totalScore || 0} → ${newScore}`);
                    return {
                        ...p,
                        totalScore: newScore,
                    };
                } else {
                    // Loser gets sum of uncombined cards
                    const newScore = (p.totalScore || 0) + losingPlayerPoints;
                    console.log(`🎯 Loser ${p.name} score: ${p.totalScore || 0} → ${newScore} (+${losingPlayerPoints})`);
                    return {
                        ...p,
                        totalScore: newScore,
                    };
                }
            });

            console.log("🎯 Normal win - RETURNING GAME WITH isRoundClosed = true");
            console.log(
                "🎯 Updated players with scores:",
                updatedPlayersWithScore.map((p) => `${p.name}: ${p.totalScore}`)
            );
            return {
                ...game,
                players: updatedPlayersWithScore,
                currentHand: {
                    ...game.currentHand,
                    chinchonState: updatedChinchonState,
                },
            };
        }
    }

    return {
        ...game,
        players: updatedPlayers,
        currentHand: {
            ...game.currentHand,
            chinchonState: updatedChinchonState,
        },
    };
}

export function cutWithCard(game: Game, playerId: string, cardId: string): Game {
    if (!game.currentHand || !game.currentHand.chinchonState) return game;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return game;

    // Find the card to cut with
    const cardToCut = player.cards.find((card) => card.id === cardId);
    if (!cardToCut) return game;

    // Get player's combinations to determine scoring
    const combinations = game.currentHand.chinchonState.combinations.get(playerId) || [];

    let cuttingPoints: number;

    // Check if player has 2 combinations of 3 cards each and cutting with card < 5
    const hasTwoCombinationsOfThree = combinations.length === 2 && combinations.every((combo) => combo.cards.length === 3);
    if (hasTwoCombinationsOfThree && (cardToCut.chinchonValue || 0) < 5) {
        // Find the remaining card (not in combinations and not the cutting card)
        const combinedCardIds = new Set(combinations.flatMap((c) => c.cards.map((card) => card.id)));
        const remainingCard = player.cards.find((card) => !combinedCardIds.has(card.id) && card.id !== cardId);

        // Score the value of the remaining card
        cuttingPoints = remainingCard ? remainingCard.chinchonValue || 0 : 0;
        console.log(`🎯 Cutting with card < 5, remaining card value: ${cuttingPoints}`);
    } else {
        console.log("🎯 No cutting points");
        // Standard cutting with 2 combinations = -10 points
        cuttingPoints = -10;
    }

    // Calculate points for the losing player (sum of uncombined cards)
    const losingPlayer = game.players.find((p) => p.id !== playerId);
    let losingPlayerPoints = 0;

    if (losingPlayer) {
        const losingPlayerCombinations = game.currentHand.chinchonState.combinations.get(losingPlayer.id) || [];
        const losingPlayerCombinedCardIds = new Set(losingPlayerCombinations.flatMap((c) => c.cards.map((card) => card.id)));
        const losingPlayerUncombinedCards = losingPlayer.cards.filter((card) => !losingPlayerCombinedCardIds.has(card.id));
        losingPlayerPoints = losingPlayerUncombinedCards.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);
    }

    // Update round scores for both players
    const updatedRoundScores = new Map(game.currentHand.chinchonState.roundScores);
    updatedRoundScores.set(playerId, cuttingPoints); // Winner gets positive points
    updatedRoundScores.set(losingPlayer?.id || "", losingPlayerPoints); // Loser gets sum of uncombined cards

    const updatedChinchonState = {
        ...game.currentHand.chinchonState,
        roundScores: updatedRoundScores,
        isRoundClosed: true,
        roundWinner: playerId,
    };

    console.log("🎯 cutWithCard - setting isRoundClosed = true");
    console.log(`🎯 Cutting points: ${cuttingPoints}, Losing player points: ${losingPlayerPoints}`);

    // Update both players' total scores and remove cutting card from winner's hand
    const updatedPlayers = game.players.map((p) => {
        if (p.id === playerId) {
            // Winner gets positive points AND remove the cutting card
            const newScore = (p.totalScore || 0) + cuttingPoints;
            console.log(`🎯 Cutter ${p.name} score: ${p.totalScore || 0} → ${newScore} (+${cuttingPoints})`);
            return {
                ...p,
                cards: p.cards.filter((c) => c.id !== cardId), // Remove the cutting card
                totalScore: newScore,
            };
        } else if (p.id === losingPlayer?.id) {
            // Loser gets sum of uncombined cards
            const newScore = (p.totalScore || 0) + losingPlayerPoints;
            console.log(`🎯 Loser ${p.name} score: ${p.totalScore || 0} → ${newScore} (+${losingPlayerPoints})`);
            return {
                ...p,
                totalScore: newScore,
            };
        }
        return p;
    });

    console.log(
        "🎯 Updated players with scores:",
        updatedPlayers.map((p) => `${p.name}: ${p.totalScore}`)
    );

    return {
        ...game,
        players: updatedPlayers,
        currentHand: {
            ...game.currentHand,
            chinchonState: updatedChinchonState,
        },
    };
}

export function closeRound(game: Game, playerId: string): Game {
    if (!game.currentHand || !game.currentHand.chinchonState) {
        return game;
    }

    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
        return game;
    }

    // Calculate player's score (sum of uncombined cards)
    const combinations = game.currentHand.chinchonState.combinations.get(playerId) || [];
    const combinedCardIds = new Set(combinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));
    const uncombinedCards = player.cards.filter((card: any) => !combinedCardIds.has(card.id));
    const playerScore = uncombinedCards.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);

    // Check if player has 2+ combinations and no uncombined cards (automatic win)
    const hasTwoOrMoreCombinations = combinations.length >= 2;
    const hasNoUncombinedCards = uncombinedCards.length === 0;

    let finalScore = playerScore;
    let isWinner = false;

    if (hasTwoOrMoreCombinations && hasNoUncombinedCards) {
        // Player wins automatically with -10 points
        finalScore = -10;
        isWinner = true;
    } else if (uncombinedCards.length <= 1) {
        // Player can close normally
        isWinner = true;
    }

    // Calculate points for the losing player (sum of uncombined cards)
    const losingPlayer = game.players.find((p) => p.id !== playerId);
    let losingPlayerPoints = 0;

    if (losingPlayer) {
        const losingPlayerCombinations = game.currentHand.chinchonState.combinations.get(losingPlayer.id) || [];
        const losingPlayerCombinedCardIds = new Set(losingPlayerCombinations.flatMap((c) => c.cards.map((card) => card.id)));
        const losingPlayerUncombinedCards = losingPlayer.cards.filter((card) => !losingPlayerCombinedCardIds.has(card.id));
        losingPlayerPoints = losingPlayerUncombinedCards.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);
    }

    // Update round scores for both players
    const updatedRoundScores = new Map(game.currentHand.chinchonState.roundScores);
    updatedRoundScores.set(playerId, finalScore); // Winner gets their score
    updatedRoundScores.set(losingPlayer?.id || "", losingPlayerPoints); // Loser gets sum of uncombined cards

    const updatedChinchonState = {
        ...game.currentHand.chinchonState,
        roundScores: updatedRoundScores,
        isRoundClosed: true,
        roundWinner: isWinner ? playerId : undefined,
    };

    console.log("🎯 closeRound - setting isRoundClosed = true, isWinner:", isWinner);
    console.log(`🎯 Final score: ${finalScore}, Losing player points: ${losingPlayerPoints}`);

    // Update both players' total scores
    const updatedPlayers = game.players.map((p) => {
        if (p.id === playerId && isWinner) {
            // Winner gets their score
            const newScore = (p.totalScore || 0) + finalScore;
            console.log(`🎯 Closer ${p.name} score: ${p.totalScore || 0} → ${newScore} (+${finalScore})`);
            return {
                ...p,
                totalScore: newScore,
            };
        } else if (p.id === losingPlayer?.id) {
            // Loser gets sum of uncombined cards
            const newScore = (p.totalScore || 0) + losingPlayerPoints;
            console.log(`🎯 Loser ${p.name} score: ${p.totalScore || 0} → ${newScore} (+${losingPlayerPoints})`);
            return {
                ...p,
                totalScore: newScore,
            };
        }
        return p;
    });

    console.log(
        "🎯 Updated players with scores:",
        updatedPlayers.map((p) => `${p.name}: ${p.totalScore}`)
    );

    return {
        ...game,
        players: updatedPlayers,
        currentHand: {
            ...game.currentHand,
            chinchonState: updatedChinchonState,
        },
    };
}

// ============================================================================
// COMBINATION LOGIC
// ============================================================================

export function findCombinations(cards: Card[]): Combination[] {
    const combinations: Combination[] = [];
    const usedCards = new Set<string>();

    // Find sequences (3+ consecutive cards of same suit)
    const suitGroups: { [suit: string]: any[] } = {};
    cards.forEach((card) => {
        if (!suitGroups[card.suit]) {
            suitGroups[card.suit] = [];
        }
        suitGroups[card.suit]?.push(card);
    });

    Object.values(suitGroups).forEach((suitCards) => {
        const sortedCards = suitCards.sort((a, b) => a.value - b.value);

        for (let i = 0; i < sortedCards.length - 2; i++) {
            const sequence: Card[] = [sortedCards[i]];
            let j = i + 1;

            while (j < sortedCards.length && sortedCards[j] && sortedCards[j - 1] && sortedCards[j].value === sortedCards[j - 1].value + 1) {
                sequence.push(sortedCards[j]);
                j++;
            }

            if (sequence.length >= 3) {
                const canUse = sequence.every((card) => !usedCards.has(card.id));
                if (canUse) {
                    sequence.forEach((card) => usedCards.add(card.id));
                    combinations.push({
                        id: generateStableCombinationId(sequence),
                        type: "sequence",
                        cards: sequence,
                        isValid: true,
                        points: sequence.reduce((sum, card) => sum + (card.chinchonValue || 0), 0),
                    });
                }
            }
        }
    });

    // Find groups (3+ cards of same value)
    const valueGroups: { [value: string]: any[] } = {};
    cards.forEach((card) => {
        if (!valueGroups[card.value.toString()]) {
            valueGroups[card.value.toString()] = [];
        }
        valueGroups[card.value.toString()]?.push(card);
    });

    Object.values(valueGroups).forEach((valueCards) => {
        if (valueCards && valueCards.length >= 3) {
            const canUse = valueCards.every((card) => !usedCards.has(card.id));
            if (canUse) {
                valueCards.forEach((card) => usedCards.add(card.id));
                combinations.push({
                    id: generateStableCombinationId(valueCards),
                    type: "group",
                    cards: valueCards,
                    isValid: true,
                    points: valueCards.reduce((sum, card) => sum + (card.chinchonValue || 0), 0),
                });
            }
        }
    });

    return combinations;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createShuffledDeck(): Card[] {
    const deck: Card[] = [];

    Object.values(Suit).forEach((suit) => {
        VALUES_CHINCHON.forEach((value) => {
            deck.push({
                id: generateId(),
                suit,
                value,
                displayValue: value.toString(),
                chinchonValue: CHINCHON_VALUES[value] || 0,
            });
        });
    });

    // Shuffle deck
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
 * Recycle discard pile back into the deck
 * Takes all cards from discard pile except the last one (visible card),
 * shuffles them, and adds them back to the deck
 */
export function recycleDiscardPile(chinchonState: ChinchonState): ChinchonState {
    console.log("♻️ === STARTING RECYCLE PROCESS ===");
    console.log(`♻️ Current deck size: ${chinchonState.deck.length}`);
    console.log(`♻️ Current discard pile size: ${chinchonState.discardPile.length}`);

    // Keep the last card visible on the discard pile
    const visibleCard = chinchonState.discardPile[chinchonState.discardPile.length - 1];
    console.log(`♻️ Visible card to keep: ${visibleCard?.displayValue} of ${visibleCard?.suit}`);

    // Take all other cards from the discard pile
    const cardsToRecycle = chinchonState.discardPile.slice(0, -1).filter((card: Card | undefined): card is Card => card !== undefined);
    console.log(`♻️ Cards to recycle: ${cardsToRecycle.length}`);

    // Shuffle the cards to recycle
    for (let i = cardsToRecycle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = cardsToRecycle[i];
        if (temp && cardsToRecycle[j]) {
            cardsToRecycle[i] = cardsToRecycle[j];
            cardsToRecycle[j] = temp;
        }
    }
    console.log(`♻️ Cards shuffled successfully`);

    // Add recycled cards to the deck
    const newDeck = [...chinchonState.deck, ...cardsToRecycle];
    console.log(`♻️ New deck size after adding recycled cards: ${newDeck.length}`);

    // Update discard pile to only contain the visible card
    const newDiscardPile = visibleCard ? [visibleCard] : [];
    console.log(`♻️ New discard pile size: ${newDiscardPile.length}`);
    console.log("♻️ === RECYCLE COMPLETE ===");

    return {
        ...chinchonState,
        deck: newDeck,
        discardPile: newDiscardPile,
    };
}

export function getNextPlayer(players: Player[], currentPlayerId: string): string {
    const currentIndex = players.findIndex((p) => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex]?.id || "";
}

export function getAvailableActions(game: Game, playerId: string): any[] {
    const actions: any[] = [];
    if (!game.currentHand || !game.currentHand.chinchonState) {
        return actions;
    }

    const chinchonState = game.currentHand.chinchonState;

    if (chinchonState.currentPlayerId !== playerId) {
        return actions; // Not player's turn
    }

    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
        return actions;
    }

    // Check for cutting opportunities
    const combinations = chinchonState.combinations.get(playerId) || [];
    const combinedCardIds = new Set(combinations.flatMap((c) => c.cards.map((card) => card.id)));
    const uncombinedCards = player.cards.filter((card) => !combinedCardIds.has(card.id));

    // The user can only cut with card less than 5
    const cardsAllowedToCut = uncombinedCards.filter((card) => card.chinchonValue < 5);

    // If player has 2+ combinations, they can cut
    if (combinations.length >= 2 && cardsAllowedToCut.length > 0) {
        // Add cutting actions for each uncombined card
        cardsAllowedToCut.forEach((card) => {
            actions.push({
                type: ActionType.CUT_WITH_CARD,
                label: `¡Cortar con ${card.displayValue}!`,
                priority: 4,
                cardId: card.id,
                points: card.chinchonValue || 0,
            });
        });
    }
    // If player has 1 or fewer uncombined cards, they can close normally
    else if (uncombinedCards.length <= 1) {
        actions.push({
            type: ActionType.CLOSE_ROUND,
            label: "Cerrar ronda",
            priority: 3,
        });
    }

    return actions;
}

export function calculatePlayerScore(player: Player, combinations: Combination[]): number {
    const combinedCardIds = new Set(combinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));
    const uncombinedCards = player.cards.filter((card: any) => !combinedCardIds.has(card.id));
    return uncombinedCards.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);
}
