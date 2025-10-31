// ============================================================================
// EL MENTIROSO - GAME LOGIC
// Core game logic for "El Mentiroso" (The Liar)
// ============================================================================

import { Game, MentirosoPlayer, Hand, Card, GamePhase, ActionType, Action, MentirosoState, PlayedCardsGroup } from "@/shared/types/mentiroso";
import { MENTIROSO_CONFIG, VALUES_MENTIROSO, DISPLAY_VALUES } from "@/game/mentiroso/constants";
import { Suit } from "@/game/shared/types";
import { generateId } from "@/shared/utils/common";

// ============================================================================
// GAME CREATION AND INITIALIZATION
// ============================================================================

/**
 * Creates a new Mentiroso game instance
 */
export function createGame(): Game {
    return {
        id: generateId(),
        phase: GamePhase.WAITING,
        players: [],
        currentHand: null,
        gameConfig: { ...MENTIROSO_CONFIG },
        winner: null,
        history: [],
    };
}

/**
 * Adds a player to the game
 * Returns the game unchanged if player already exists or game is full
 */
export function addPlayer(game: Game, playerId: string, playerName: string, photo?: string): Game {
    // Check if player already exists
    if (game.players.some((p) => p.id === playerId)) {
        return game;
    }

    // Check if game is full
    if (game.players.length >= MENTIROSO_CONFIG.maxPlayers) {
        console.warn(`Game is full (max ${MENTIROSO_CONFIG.maxPlayers} players)`);
        return game;
    }

    const newPlayer: MentirosoPlayer = {
        id: playerId,
        name: playerName,
        team: 0, // No teams in Mentiroso
        points: 0,
        position: game.players.length,
        cards: [],
        isActive: true,
        cardCount: 0,
        ...(photo && { photo }),
    };

    return {
        ...game,
        players: [...game.players, newPlayer],
    };
}

/**
 * Starts the game by dealing the first hand
 */
export function startGame(game: Game): Game {
    if (game.players.length < MENTIROSO_CONFIG.minPlayers) {
        console.error(`Need at least ${MENTIROSO_CONFIG.minPlayers} players to start`);
        return game;
    }

    return dealNewHand(game);
}

// ============================================================================
// HAND MANAGEMENT
// ============================================================================

/**
 * Deals a new hand to all players
 * Distributes all cards from a shuffled deck evenly among players
 */
export function dealNewHand(game: Game): Game {
    const deck = createShuffledDeck();
    const players = [...game.players];
    const cardsPerPlayer = Math.floor(deck.length / players.length);

    // Distribute cards evenly to each player
    players.forEach((player, index) => {
        const startIndex = index * cardsPerPlayer;
        const playerCards = deck.slice(startIndex, startIndex + cardsPerPlayer);
        player.cards = playerCards;
        player.cardCount = playerCards.length;
        player.isActive = true;
    });

    // Distribute any remaining cards one by one
    const remainingCards = deck.length % players.length;
    for (let i = 0; i < remainingCards; i++) {
        const player = players[i];
        const card = deck[cardsPerPlayer * players.length + i];
        if (player && card) {
            player.cards.push(card);
            player.cardCount++;
        }
    }

    // First player starts
    const startingPlayerId = players[0]?.id || "";

    const newHand: Hand = {
        number: (game.currentHand?.number || 0) + 1,
        startingPlayerId,
        currentPlayerId: startingPlayerId,
        mentirosoState: createInitialMentirosoState(startingPlayerId),
    };

    return {
        ...game,
        players,
        currentHand: newHand,
        phase: GamePhase.PLAYING,
    };
}

/**
 * Creates the initial state for a new round
 */
function createInitialMentirosoState(startingPlayerId: string): MentirosoState {
    return {
        currentPlayerId: startingPlayerId,
        playedCardsStack: [],
        lastPlayedGroup: null,
        currentClaimedValue: null,
        canChallenge: false,
        challengerId: null,
        isRevealing: false,
        revealedCards: null,
        wasLying: null,
        roundNumber: 1,
    };
}

// ============================================================================
// DECK CREATION
// ============================================================================

/**
 * Creates and shuffles a Spanish deck
 * Uses Fisher-Yates algorithm for shuffling
 */
export function createShuffledDeck(): Card[] {
    const deck: Card[] = [];

    // Create all cards
    Object.values(Suit).forEach((suit) => {
        VALUES_MENTIROSO.forEach((value) => {
            deck.push({
                id: generateId(),
                suit,
                value,
                displayValue: DISPLAY_VALUES[value] || value.toString(),
            });
        });
    });

    // Shuffle using Fisher-Yates algorithm
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }

    return deck;
}

// ============================================================================
// GAME ACTIONS
// ============================================================================

/**
 * Plays cards face down on the table
 * @param game - Current game state
 * @param playerId - ID of player playing cards
 * @param cardIds - IDs of cards being played
 * @param claimedValue - The value the player claims the cards are
 */
export function playCards(game: Game, playerId: string, cardIds: string[], claimedValue: number): Game {
    // Validate game state
    if (!game.currentHand?.mentirosoState) {
        console.error("No active hand");
        return game;
    }

    const player = game.players.find((p) => p.id === playerId);
    const state = game.currentHand.mentirosoState;

    if (!player) {
        console.error("Player not found");
        return game;
    }

    // Validate it's player's turn
    if (state.currentPlayerId !== playerId) {
        console.error("Not player's turn");
        return game;
    }

    // Can't play while revealing cards
    if (state.isRevealing) {
        console.error("Cannot play while revealing cards");
        return game;
    }

    // Validate cards belong to player
    const cardsToPlay = cardIds.map((id) => player.cards.find((c) => c.id === id)).filter((c): c is Card => c !== undefined);

    if (cardsToPlay.length !== cardIds.length) {
        console.error("Some cards not found in player's hand");
        return game;
    }

    // Validate number of cards
    if (cardsToPlay.length < 1 || cardsToPlay.length > 4) {
        console.error("Must play between 1 and 4 cards");
        return game;
    }

    // Validate claimed value
    if (!VALUES_MENTIROSO.includes(claimedValue as any)) {
        console.error("Invalid claimed value");
        return game;
    }

    // Validate claimed value is >= current value
    if (state.currentClaimedValue !== null && claimedValue < state.currentClaimedValue) {
        console.error("Claimed value must be >= current claimed value");
        return game;
    }

    // Create played cards group
    const playedGroup: PlayedCardsGroup = {
        playerId,
        playerName: player.name,
        cards: cardsToPlay,
        claimedValue,
        timestamp: Date.now(),
    };

    // Remove cards from player's hand
    const updatedPlayers = game.players.map((p) => {
        if (p.id === playerId) {
            const remainingCards = p.cards.filter((c) => !cardIds.includes(c.id));
            return {
                ...p,
                cards: remainingCards,
                cardCount: remainingCards.length,
            };
        }
        return p;
    });

    // Check if player won (no cards left)
    const winner = updatedPlayers.find((p) => p.id === playerId && p.cardCount === 0);
    if (winner) {
        console.log(`🎉 Player ${winner.name} won!`);
        return {
            ...game,
            players: updatedPlayers,
            currentHand: {
                ...game.currentHand,
                mentirosoState: {
                    ...state,
                    playedCardsStack: [...state.playedCardsStack, playedGroup],
                    lastPlayedGroup: playedGroup,
                    currentClaimedValue: claimedValue,
                    canChallenge: false,
                },
            },
            phase: GamePhase.GAME_END,
            winner: playerId,
        };
    }

    // Update game state
    const nextPlayerId = getNextPlayerId(game.players, playerId);

    return {
        ...game,
        players: updatedPlayers,
        currentHand: {
            ...game.currentHand,
            currentPlayerId: nextPlayerId,
            mentirosoState: {
                ...state,
                currentPlayerId: nextPlayerId,
                playedCardsStack: [...state.playedCardsStack, playedGroup],
                lastPlayedGroup: playedGroup,
                currentClaimedValue: claimedValue,
                canChallenge: true,
            },
        },
    };
}

/**
 * Challenges the last player who played cards
 * @param game - Current game state
 * @param challengerId - ID of player making the challenge
 */
export function challenge(game: Game, challengerId: string): Game {
    if (!game.currentHand?.mentirosoState) {
        console.error("No active hand");
        return game;
    }

    const state = game.currentHand.mentirosoState;
    const lastPlay = state.lastPlayedGroup;

    if (!lastPlay) {
        console.error("No cards to challenge");
        return game;
    }

    // Protection against race conditions: reject if already revealing or challenge already in progress
    if (state.isRevealing || state.challengerId) {
        console.error("Challenge already in progress");
        return game;
    }

    if (!state.canChallenge) {
        console.error("Cannot challenge at this time");
        return game;
    }

    if (challengerId === lastPlay.playerId) {
        console.error("Cannot challenge yourself");
        return game;
    }

    // Determine if the player was lying
    const wasLying = !lastPlay.cards.every((card) => card.value === lastPlay.claimedValue);

    console.log(`🎲 Challenge: ${lastPlay.playerName} claimed ${lastPlay.claimedValue}`);
    console.log(
        `🎲 Actual cards:`,
        lastPlay.cards.map((c) => c.value)
    );
    console.log(`🎲 Was lying: ${wasLying}`);

    // Penalize the liar or the false accuser
    const penalizedPlayerId = wasLying ? lastPlay.playerId : challengerId;

    // Collect all cards from the stack
    const allStackCards = state.playedCardsStack.flatMap((group) => group.cards);

    // Give all cards to the penalized player
    const updatedPlayers = game.players.map((p) => {
        if (p.id === penalizedPlayerId) {
            const newCards = [...p.cards, ...allStackCards];
            return {
                ...p,
                cards: newCards,
                cardCount: newCards.length,
            };
        }
        return p;
    });

    return {
        ...game,
        players: updatedPlayers,
        currentHand: {
            ...game.currentHand,
            mentirosoState: {
                ...state,
                challengerId,
                isRevealing: true,
                revealedCards: lastPlay.cards,
                wasLying,
                canChallenge: false,
            },
        },
    };
}

/**
 * Continues the game after a challenge has been resolved
 */
export function continueAfterChallenge(game: Game): Game {
    if (!game.currentHand?.mentirosoState) {
        return game;
    }

    const state = game.currentHand.mentirosoState;

    if (!state.isRevealing) {
        console.error("Not in revealing state");
        return game;
    }

    // The player whose turn it was continues playing
    // (The turn continues from where it was, not from the penalized player)
    const nextPlayerId = state.currentPlayerId;

    if (!nextPlayerId) {
        console.error("Cannot determine next player");
        return game;
    }

    // Reset state for a new round but keep the turn order
    return {
        ...game,
        currentHand: {
            ...game.currentHand,
            currentPlayerId: nextPlayerId,
            mentirosoState: {
                ...createInitialMentirosoState(nextPlayerId),
                roundNumber: state.roundNumber + 1,
            },
        },
    };
}

// ============================================================================
// AVAILABLE ACTIONS
// ============================================================================

/**
 * Gets the list of available actions for a player
 */
export function getAvailableActions(game: Game, playerId: string): Action[] {
    const actions: Action[] = [];

    if (!game.currentHand?.mentirosoState) {
        return actions;
    }

    const state = game.currentHand.mentirosoState;
    const player = game.players.find((p) => p.id === playerId);

    if (!player || state.isRevealing) {
        return actions;
    }

    // Can play cards if it's their turn
    if (state.currentPlayerId === playerId) {
        actions.push({
            type: ActionType.PLAY_CARDS,
            label: "Play cards",
            priority: 1,
        });
    }

    // Can challenge if:
    // 1. There's a last played group (someone has played cards)
    // 2. The player is not the one who just played
    // 3. Not currently revealing cards
    if (state.lastPlayedGroup && state.lastPlayedGroup.playerId !== playerId && !state.isRevealing) {
        actions.push({
            type: ActionType.CHALLENGE,
            label: "¡MIENTE!",
            priority: 2,
            color: "red",
        });
    }

    return actions;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the ID of the next player in turn order
 */
export function getNextPlayerId(players: MentirosoPlayer[], currentPlayerId: string): string {
    const currentIndex = players.findIndex((p) => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex]?.id || "";
}

/**
 * Checks if a player can play cards
 */
export function canPlayCards(game: Game, playerId: string): boolean {
    if (!game.currentHand?.mentirosoState) {
        return false;
    }

    const state = game.currentHand.mentirosoState;
    return state.currentPlayerId === playerId && !state.isRevealing;
}

/**
 * Checks if a player can make a challenge
 */
export function canChallenge(game: Game, playerId: string): boolean {
    if (!game.currentHand?.mentirosoState) {
        return false;
    }

    const state = game.currentHand.mentirosoState;
    return state.canChallenge && state.lastPlayedGroup?.playerId !== playerId && !state.isRevealing;
}
