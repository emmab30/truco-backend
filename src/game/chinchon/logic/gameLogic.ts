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

    // Determine who starts this round (rotate dealer)
    const currentHandNumber = (game.currentHand?.number || 0) + 1;
    const dealerIndex = (currentHandNumber - 1) % players.length;
    const startingPlayerIndex = game?.iaMode ? 0 : dealerIndex; // Dealer starts unless IA mode is enabled

    const newHand: Hand = {
        number: currentHandNumber,
        dealer: players[dealerIndex]?.id || "",
        currentPlayerId: players[startingPlayerIndex]?.id || "",
        rounds: [],
        currentRound: 0,
        winner: null,
        points: 0,
        chinchonState: {
            isActive: true,
            currentPlayerId: players[startingPlayerIndex]?.id || "",
            deck,
            discardPile,
            roundScores: new Map(),
            combinations: new Map(),
            roundNumber: 1,
            isRoundComplete: false,
            hasDrawnCard: false,
            isRoundClosed: false,
            roundWinner: undefined,
            playersReadyForNextRound: new Set(),
        },
    };

    // Detect initial combinations for all players
    players.forEach((player) => {
        const combinations = findCombinations(player.cards as Card[]);
        newHand.chinchonState.combinations.set(player.id, combinations);
    });

    // Set available actions for current player (empty at start, must draw first)
    const currentPlayer = players.find((p) => p.id === newHand.currentPlayerId);
    if (currentPlayer) {
        currentPlayer.availableActions = [];
    }

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

    // Get current player after discard
    const currentPlayerAfterDiscard = updatedPlayers.find((p) => p.id === playerId);

    // Check win conditions after discarding
    const winResult = checkWinConditionsAfterDiscard(updatedChinchonState, currentPlayerAfterDiscard!, updatedPlayers);

    if (winResult.hasWon) {
        console.log("🎯 WIN DETECTED:", winResult.winType);

        // Update chinchon state with win
        Object.assign(updatedChinchonState, {
            isRoundClosed: true,
            roundWinner: playerId,
            roundScores: winResult.roundScores,
        });

        // Update players with new scores
        const finalPlayers = updatedPlayers.map((p) => {
            const scoreChange = winResult.roundScores.get(p.id) || 0;
            return {
                ...p,
                totalScore: (p.totalScore || 0) + scoreChange,
            };
        });

        console.log(
            "🎯 Final scores:",
            finalPlayers.map((p) => `${p.name}: ${p.totalScore}`)
        );

        return {
            ...game,
            players: finalPlayers,
            currentHand: {
                ...game.currentHand,
                chinchonState: updatedChinchonState,
            },
        };
    }

    // No win, move to next player
    const nextPlayerId = getNextPlayer(game.players, playerId);
    updatedChinchonState.currentPlayerId = nextPlayerId;

    // Update available actions for next player (empty until they draw)
    const nextPlayer = updatedPlayers.find((p) => p.id === nextPlayerId);
    if (nextPlayer) {
        nextPlayer.availableActions = [];
    }

    // Clear actions for current player
    if (currentPlayerAfterDiscard) {
        currentPlayerAfterDiscard.availableActions = [];
    }

    // Update combinations for the player who discarded
    if (currentPlayerAfterDiscard) {
        const combinations = findCombinations(currentPlayerAfterDiscard.cards as Card[]);
        updatedChinchonState.combinations.set(playerId, combinations);
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

// ============================================================================
// WIN CONDITIONS CHECK (CENTRALIZED)
// ============================================================================

interface WinResult {
    hasWon: boolean;
    winType?: "chinchon" | "close_7" | "close_6";
    roundScores: Map<string, number>;
}

function checkWinConditionsAfterDiscard(chinchonState: ChinchonState, currentPlayer: Player, allPlayers: Player[]): WinResult {
    const playerId = currentPlayer.id;
    const combinations = chinchonState.combinations.get(playerId) || [];
    const combinedCardIds = new Set(combinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));
    const uncombinedCards = currentPlayer.cards.filter((card: any) => !combinedCardIds.has(card.id));

    console.log("🔍 Checking win conditions:", {
        playerId: currentPlayer.name,
        cardsCount: currentPlayer.cards.length,
        combinationsCount: combinations.length,
        uncombinedCount: uncombinedCards.length,
        combinations: combinations.map((c: any) => ({
            type: c.type,
            count: c.cards.length,
        })),
    });

    // PRIORITY 1: Check for CHINCHÓN (7-card sequence of same suit)
    const chinchonCombo = combinations.find((c: any) => c.type === "sequence" && c.cards.length === 7);

    if (chinchonCombo) {
        console.log("🎯 CHINCHÓN DETECTED! 7-card sequence of same suit");
        const losingPlayer = allPlayers.find((p) => p.id !== playerId);
        const losingPlayerScore = calculateLosingPlayerScore(chinchonState, losingPlayer!);

        const roundScores = new Map<string, number>();
        roundScores.set(playerId, -10); // Winner gets -10
        roundScores.set(losingPlayer!.id, losingPlayerScore);

        return {
            hasWon: true,
            winType: "chinchon",
            roundScores,
        };
    }

    // PRIORITY 2: Check for closing with 7 cards combined (3+4)
    if (combinations.length >= 2 && uncombinedCards.length === 0 && currentPlayer.cards.length === 7) {
        const totalCombinedCards = combinations.reduce((sum: number, c: any) => sum + c.cards.length, 0);

        // Must be exactly 7 cards in combinations (e.g., 3+4)
        if (totalCombinedCards === 7) {
            console.log("🎯 CLOSE WITH 7 CARDS! All cards combined");
            const losingPlayer = allPlayers.find((p) => p.id !== playerId);
            const losingPlayerScore = calculateLosingPlayerScore(chinchonState, losingPlayer!);

            const roundScores = new Map<string, number>();
            roundScores.set(playerId, -10); // Winner gets -10
            roundScores.set(losingPlayer!.id, losingPlayerScore);

            return {
                hasWon: true,
                winType: "close_7",
                roundScores,
            };
        }
    }

    // No win condition met
    return {
        hasWon: false,
        roundScores: new Map(),
    };
}

function calculateLosingPlayerScore(chinchonState: ChinchonState, losingPlayer: Player): number {
    const losingPlayerCombinations = chinchonState.combinations.get(losingPlayer.id) || [];
    const losingPlayerCombinedCardIds = new Set(losingPlayerCombinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));
    const losingPlayerUncombinedCards = losingPlayer.cards.filter((card: any) => !losingPlayerCombinedCardIds.has(card.id));
    return losingPlayerUncombinedCards.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);
}

// ============================================================================
// CUT WITH CARD (3+3 with card <5)
// ============================================================================

export function cutWithCard(game: Game, playerId: string, cardId: string): Game {
    if (!game.currentHand || !game.currentHand.chinchonState) return game;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return game;

    // Find the card to cut with
    const cardToCut = player.cards.find((card) => card.id === cardId);
    if (!cardToCut) return game;

    // Card must be <5 to cut
    if ((cardToCut.chinchonValue || 0) >= 5) {
        console.log("❌ Cannot cut with card >= 5");
        return game;
    }

    // Get player's combinations
    const combinations = game.currentHand.chinchonState.combinations.get(playerId) || [];
    const combinedCardIds = new Set(combinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));

    // Count combined cards (excluding the cutting card)
    const combinedCards = player.cards.filter((card: any) => combinedCardIds.has(card.id) && card.id !== cardId);

    // Must have exactly 6 cards combined (typically 3+3)
    if (combinedCards.length !== 6) {
        console.log("❌ Must have exactly 6 cards combined to cut");
        return game;
    }

    console.log("🎯 Cutting with card:", cardToCut.displayValue, "value:", cardToCut.chinchonValue);

    // Calculate scores
    // The score is the sum of uncombined cards EXCLUDING the cutting card
    const uncombinedCards = player.cards.filter((card: any) => !combinedCardIds.has(card.id));
    const uncombinedCardsExcludingCuttingCard = uncombinedCards.filter((card: any) => card.id !== cardId);
    const cuttingPlayerScore = uncombinedCardsExcludingCuttingCard.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);
    
    const losingPlayer = game.players.find((p) => p.id !== playerId);
    const losingPlayerScore = calculateLosingPlayerScore(game.currentHand.chinchonState, losingPlayer!);

    const updatedRoundScores = new Map<string, number>();
    updatedRoundScores.set(playerId, cuttingPlayerScore);
    updatedRoundScores.set(losingPlayer!.id, losingPlayerScore);

    const updatedChinchonState = {
        ...game.currentHand.chinchonState,
        roundScores: updatedRoundScores,
        isRoundClosed: true,
        roundWinner: playerId,
    };

    console.log(`🎯 Cut scores - Cutter: ${cuttingPlayerScore}, Loser: ${losingPlayerScore}`);

    // Update players' scores and remove cutting card
    const updatedPlayers = game.players.map((p) => {
        if (p.id === playerId) {
            const newScore = (p.totalScore || 0) + cuttingPlayerScore;
            return {
                ...p,
                cards: p.cards.filter((c) => c.id !== cardId),
                totalScore: newScore,
            };
        } else if (p.id === losingPlayer?.id) {
            const newScore = (p.totalScore || 0) + losingPlayerScore;
            return {
                ...p,
                totalScore: newScore,
            };
        }
        return p;
    });

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
// CLOSE ROUND (Legacy - kept for compatibility)
// ============================================================================

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

    // For now, just close with current score
    const finalScore = playerScore;

    const losingPlayer = game.players.find((p) => p.id !== playerId);
    const losingPlayerScore = calculateLosingPlayerScore(game.currentHand.chinchonState, losingPlayer!);

    const updatedRoundScores = new Map(game.currentHand.chinchonState.roundScores);
    updatedRoundScores.set(playerId, finalScore);
    updatedRoundScores.set(losingPlayer?.id || "", losingPlayerScore);

    const updatedChinchonState = {
        ...game.currentHand.chinchonState,
        roundScores: updatedRoundScores,
        isRoundClosed: true,
        roundWinner: playerId,
    };

    const updatedPlayers = game.players.map((p) => {
        if (p.id === playerId) {
            const newScore = (p.totalScore || 0) + finalScore;
            return {
                ...p,
                totalScore: newScore,
            };
        } else if (p.id === losingPlayer?.id) {
            const newScore = (p.totalScore || 0) + losingPlayerScore;
            return {
                ...p,
                totalScore: newScore,
            };
        }
        return p;
    });

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

export function recycleDiscardPile(chinchonState: ChinchonState): ChinchonState {
    console.log("♻️ === STARTING RECYCLE PROCESS ===");
    console.log(`♻️ Current deck size: ${chinchonState.deck.length}`);
    console.log(`♻️ Current discard pile size: ${chinchonState.discardPile.length}`);

    const visibleCard = chinchonState.discardPile[chinchonState.discardPile.length - 1];
    console.log(`♻️ Visible card to keep: ${visibleCard?.displayValue} of ${visibleCard?.suit}`);

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

    const newDeck = [...chinchonState.deck, ...cardsToRecycle];
    console.log(`♻️ New deck size after adding recycled cards: ${newDeck.length}`);

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

    // Only check for actions if player has drawn a card (has 8 cards)
    if (!chinchonState.hasDrawnCard) {
        return actions;
    }

    // Get combinations
    const combinations = chinchonState.combinations.get(playerId) || [];
    const combinedCardIds = new Set(combinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));
    const uncombinedCards = player.cards.filter((card: any) => !combinedCardIds.has(card.id));

    // Check for cutting opportunities
    // Player has 8 cards after drawing
    // Can cut if: has 6+ cards combined in at least 2 combinations, and has uncombined cards <5
    const totalCombinedCards = combinations.reduce((sum: number, c: any) => sum + c.cards.length, 0);

    // Allow cutting if player has at least 6 cards combined in 2+ combinations
    if (combinations.length >= 2 && totalCombinedCards >= 6) {
        // Offer to cut with any uncombined card that is <5
        uncombinedCards.forEach((card: any) => {
            if (card.chinchonValue < 5) {
                actions.push({
                    type: ActionType.CUT_WITH_CARD,
                    label: `¡Cortar con ${card.displayValue}!`,
                    priority: 4,
                    cardId: card.id,
                    points: card.chinchonValue || 0,
                });
            }
        });
    }

    console.log("🎮 Available actions:", actions);

    return actions;
}

export function calculatePlayerScore(player: Player, combinations: Combination[]): number {
    const combinedCardIds = new Set(combinations.flatMap((c: any) => c.cards.map((card: any) => card.id)));
    const uncombinedCards = player.cards.filter((card: any) => !combinedCardIds.has(card.id));
    return uncombinedCards.reduce((sum: number, card: any) => sum + (card.chinchonValue || 0), 0);
}
