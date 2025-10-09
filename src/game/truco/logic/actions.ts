// ============================================================================
// TRUCO ACTIONS
// Available actions logic for Truco game
// ============================================================================

import { Game, Action, GamePhase, ActionType, EnvidoCall, TrucoCall, TrucoResponse } from "@/game/truco/types";
import { ACTION_PRIORITIES } from "@/game/truco/constants";

/**
 * Determine available actions for a player
 * @param game - Game object
 * @param playerId - Player ID
 * @returns Array of available actions
 */
export function getAvailableActions(game: Game, playerId: string): Action[] {
    const actions: Action[] = [];
    const currentPlayer = game.players.find((p) => p.id === playerId);

    if (!currentPlayer || !currentPlayer.isActive) {
        return actions;
    }

    // Check if it's the player's turn (only for playing phase)
    const isPlayerTurn = game.currentHand?.currentPlayerId === playerId;

    // In envido/truco phases, both players can respond, so skip turn check
    if (game.phase === GamePhase.PLAYING && !isPlayerTurn) {
        return actions;
    }

  // Get current round info
  const currentHand = game.currentHand;
  if (!currentHand) return actions;
  
  const currentRound = currentHand.rounds[currentHand.currentRound];
  if (!currentRound) return actions;
  
    const trucoState = currentHand.trucoState;
    const envidoState = currentHand.envidoState;

    // Check game phase and available actions
    if (game.phase === GamePhase.PLAYING) {
        // Can always go to mazo (always last, red color)
        actions.push({
            type: ActionType.GO_TO_MAZO,
            label: "Ir al Mazo",
            priority: ACTION_PRIORITIES[ActionType.GO_TO_MAZO],
            color: "red",
        });

        // Check if player hasn't played a card yet
        if (!currentPlayer.hasPlayedCard) {
            // Envido calls (only in first round, before first card, and before truco)
            const isFirstRound = currentRound.number === 1;
            const envidoDisabled = envidoState?.winner !== undefined; // Disabled if envido was resolved
            const trucoWasCalled = trucoState?.isActive || trucoState?.accepted; // Disabled if truco was called

            if (isFirstRound && !trucoWasCalled && !envidoDisabled) {
                if (!envidoState?.isActive) {
                    // No envido active, can call any envido
                    actions.push({
                        type: ActionType.ENVIDO,
                        label: "Envido",
                        priority: ACTION_PRIORITIES[ActionType.ENVIDO],
                    });
                    actions.push({
                        type: ActionType.REAL_ENVIDO,
                        label: "Real Envido",
                        priority: ACTION_PRIORITIES[ActionType.REAL_ENVIDO],
                    });
                    actions.push({
                        type: ActionType.FALTA_ENVIDO,
                        label: "Falta Envido",
                        priority: ACTION_PRIORITIES[ActionType.FALTA_ENVIDO],
                    });
                } else if (envidoState.isActive && envidoState.currentCaller !== playerId) {
                    // Envido is active and it's not my call, can respond or raise
                    actions.push({
                        type: ActionType.QUIERO,
                        label: "Quiero",
                        priority: ACTION_PRIORITIES[ActionType.QUIERO],
                    });
                    actions.push({
                        type: ActionType.NO_QUIERO,
                        label: "No Quiero",
                        priority: ACTION_PRIORITIES[ActionType.NO_QUIERO],
                    });
                    
                    // Can raise based on current call
                    const currentCall = envidoState.currentCall;
                    
                    if (currentCall === EnvidoCall.ENVIDO) {
                        // Can equal with Envido or raise
                        actions.push({
                            type: ActionType.ENVIDO,
                            label: "Envido",
                            priority: ACTION_PRIORITIES[ActionType.ENVIDO],
                        });
                        actions.push({
                            type: ActionType.REAL_ENVIDO,
                            label: "Real Envido",
                            priority: ACTION_PRIORITIES[ActionType.REAL_ENVIDO],
                        });
                        actions.push({
                            type: ActionType.FALTA_ENVIDO,
                            label: "Falta Envido",
                            priority: ACTION_PRIORITIES[ActionType.FALTA_ENVIDO],
                        });
                    } else if (currentCall === EnvidoCall.REAL_ENVIDO) {
                        // Can equal with Real Envido or raise to Falta Envido
                        actions.push({
                            type: ActionType.REAL_ENVIDO,
                            label: "Real Envido",
                            priority: ACTION_PRIORITIES[ActionType.REAL_ENVIDO],
                        });
                        actions.push({
                            type: ActionType.FALTA_ENVIDO,
                            label: "Falta Envido",
                            priority: ACTION_PRIORITIES[ActionType.FALTA_ENVIDO],
                        });
                    } else if (currentCall === EnvidoCall.FALTA_ENVIDO) {
                        // Can only equal with Falta Envido
                        actions.push({
                            type: ActionType.FALTA_ENVIDO,
                            label: "Falta Envido",
                            priority: ACTION_PRIORITIES[ActionType.FALTA_ENVIDO],
                        });
                    }
                }
            }

            // Truco calls logic
            if (!trucoState?.isActive && !trucoState?.accepted) {
                // No truco called yet, can call truco
                actions.push({
                    type: ActionType.TRUCO,
                    label: "Truco",
                    priority: ACTION_PRIORITIES[ActionType.TRUCO],
                });
            } else if (trucoState?.isActive) {
                // Truco is active (waiting for response), only the team that didn't call truco can respond/raise
                if (trucoState.currentCaller !== playerId) {
                    const trucoCall = trucoState.currentCall;
                    if (trucoCall === TrucoCall.TRUCO) {
                        actions.push({
                            type: ActionType.RETRUCO,
                            label: "Retruco",
                            priority: ACTION_PRIORITIES[ActionType.RETRUCO],
                        });
                    } else if (trucoCall === TrucoCall.RETRUCO) {
                        actions.push({
                            type: ActionType.VALE_CUATRO,
                            label: "Vale Cuatro",
                            priority: ACTION_PRIORITIES[ActionType.VALE_CUATRO],
                        });
                    }
                }
            } else if (trucoState?.accepted) {
                // Truco was accepted, only the team that RESPONDED can escalate in their turn
                // Find who was the last to respond with "quiero"
                const lastResponder = Array.from(trucoState.responses.entries())
                    .filter(([_, response]) => response === TrucoResponse.QUIERO)
                    .pop()?.[0];

                // Only the last responder can escalate
                if (lastResponder === playerId) {
                    const trucoCall = trucoState.currentCall;
                    if (trucoCall === TrucoCall.TRUCO) {
                        actions.push({
                            type: ActionType.RETRUCO,
                            label: "Retruco",
                            priority: ACTION_PRIORITIES[ActionType.RETRUCO],
                        });
                    } else if (trucoCall === TrucoCall.RETRUCO) {
                        actions.push({
                            type: ActionType.VALE_CUATRO,
                            label: "Vale Cuatro",
                            priority: ACTION_PRIORITIES[ActionType.VALE_CUATRO],
                        });
                    }
                }
            }
        }
    } else if (game.phase === GamePhase.ENVIDO) {
        // Only the player who didn't make the last call can respond
        if (envidoState?.currentCaller !== playerId) {
            actions.push({
                type: ActionType.QUIERO,
                label: "Quiero",
                priority: ACTION_PRIORITIES[ActionType.QUIERO],
            });
            actions.push({
                type: ActionType.NO_QUIERO,
                label: "No Quiero",
                priority: ACTION_PRIORITIES[ActionType.NO_QUIERO],
            });

            // Can raise envido if appropriate
            const currentCall = envidoState?.currentCall;
            const originalCaller = envidoState?.originalCaller || envidoState?.currentCaller;
            
            // Only the original caller can raise, others can only respond
            if (playerId === originalCaller) {
                // Original caller can raise
                if (currentCall === EnvidoCall.ENVIDO) {
                    actions.push({
                        type: ActionType.REAL_ENVIDO,
                        label: "Real Envido",
                        priority: ACTION_PRIORITIES[ActionType.REAL_ENVIDO],
                    });
                    actions.push({
                        type: ActionType.FALTA_ENVIDO,
                        label: "Falta Envido",
                        priority: ACTION_PRIORITIES[ActionType.FALTA_ENVIDO],
                    });
                } else if (currentCall === EnvidoCall.REAL_ENVIDO) {
                    actions.push({
                        type: ActionType.FALTA_ENVIDO,
                        label: "Falta Envido",
                        priority: ACTION_PRIORITIES[ActionType.FALTA_ENVIDO],
                    });
                }
            } else {
                // Non-original caller can equal or raise
                if (currentCall === EnvidoCall.ENVIDO) {
                    actions.push({
                        type: ActionType.ENVIDO,
                        label: "Envido",
                        priority: ACTION_PRIORITIES[ActionType.ENVIDO],
                    });
                    actions.push({
                        type: ActionType.REAL_ENVIDO,
                        label: "Real Envido",
                        priority: ACTION_PRIORITIES[ActionType.REAL_ENVIDO],
                    });
                    actions.push({
                        type: ActionType.FALTA_ENVIDO,
                        label: "Falta Envido",
                        priority: ACTION_PRIORITIES[ActionType.FALTA_ENVIDO],
                    });
                } else if (currentCall === EnvidoCall.REAL_ENVIDO) {
                    actions.push({
                        type: ActionType.REAL_ENVIDO,
                        label: "Real Envido",
                        priority: ACTION_PRIORITIES[ActionType.REAL_ENVIDO],
                    });
                    actions.push({
                        type: ActionType.FALTA_ENVIDO,
                        label: "Falta Envido",
                        priority: ACTION_PRIORITIES[ActionType.FALTA_ENVIDO],
                    });
                } else if (currentCall === EnvidoCall.FALTA_ENVIDO) {
                    actions.push({
                        type: ActionType.FALTA_ENVIDO,
                        label: "Falta Envido",
                        priority: ACTION_PRIORITIES[ActionType.FALTA_ENVIDO],
                    });
                }
            }
        }
    } else if (game.phase === GamePhase.TRUCO) {
        // Only the player who didn't call truco can respond
        if (trucoState?.currentCaller !== playerId) {
            actions.push({
                type: ActionType.QUIERO,
                label: "Quiero",
                priority: ACTION_PRIORITIES[ActionType.QUIERO],
            });
            actions.push({
                type: ActionType.NO_QUIERO,
                label: "No Quiero",
                priority: ACTION_PRIORITIES[ActionType.NO_QUIERO],
            });

            // Can raise truco if appropriate
            if (trucoState?.currentCall === TrucoCall.TRUCO) {
                actions.push({
                    type: ActionType.RETRUCO,
                    label: "Retruco",
                    priority: ACTION_PRIORITIES[ActionType.RETRUCO],
                });
            }
            if (trucoState?.currentCall === TrucoCall.RETRUCO) {
                actions.push({
                    type: ActionType.VALE_CUATRO,
                    label: "Vale Cuatro",
                    priority: ACTION_PRIORITIES[ActionType.VALE_CUATRO],
                });
            }
        }
    }

    // Sort actions by priority (lower number = higher priority)
    actions.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    return actions;
}

/**
 * Check if a player can perform a specific action
 * @param game - Game object
 * @param playerId - Player ID
 * @param actionType - Action type to check
 * @returns True if action is available, false otherwise
 */
export function canPerformAction(game: Game, playerId: string, actionType: ActionType): boolean {
    const availableActions = getAvailableActions(game, playerId);
    return availableActions.some((action) => action.type === actionType);
}

/**
 * Get action by type from available actions
 * @param game - Game object
 * @param playerId - Player ID
 * @param actionType - Action type to get
 * @returns Action object or undefined if not available
 */
export function getActionByType(game: Game, playerId: string, actionType: ActionType): Action | undefined {
    const availableActions = getAvailableActions(game, playerId);
    return availableActions.find((action) => action.type === actionType);
}

/**
 * Validate if an action is valid for the current game state
 * @param game - Game object
 * @param playerId - Player ID
 * @param actionType - Action type to validate
 * @returns Validation result with error message if invalid
 */
export function validateAction(game: Game, playerId: string, actionType: ActionType): { valid: boolean; error?: string } {
    const player = game.players.find((p) => p.id === playerId);

    if (!player) {
        return { valid: false, error: "Player not found" };
    }

    if (!player.isActive) {
        return { valid: false, error: "Player is not active" };
    }

    if (player.wentToMazo) {
        return { valid: false, error: "Player has gone to mazo" };
    }

    const canPerform = canPerformAction(game, playerId, actionType);
    if (!canPerform) {
        return { valid: false, error: "Action not available in current game state" };
    }

    return { valid: true };
}

