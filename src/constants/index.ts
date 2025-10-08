import { ServerConfig } from '../types';
import { Suit, GameConfig } from '../game/truco/types';
import { EnvidoCall, TrucoCall, EnvidoResponse, TrucoResponse, ActionType } from '../game/truco/types';
export { GameType, SUPPORTED_GAME_TYPES, isValidGameType } from './gameTypes';

// ============================================================================
// CARD VALUES
// ============================================================================

export const TRUCO_VALUES: Record<string, number> = {
  '1-espadas': 14,  // As de Espadas (highest)
  '1-bastos': 13,   // As de Bastos
  '7-espadas': 12,  // 7 de Espadas
  '7-oros': 11,     // 7 de Oros
  '3-oros': 10,     // Tres (any suit)
  '3-copas': 10,
  '3-espadas': 10,
  '3-bastos': 10,
  '2-oros': 9,      // Dos (any suit)
  '2-copas': 9,
  '2-espadas': 9,
  '2-bastos': 9,
  '1-copas': 8,     // Ases falsos
  '1-oros': 8,
  '12-oros': 7,     // Rey
  '12-copas': 7,
  '12-espadas': 7,
  '12-bastos': 7,
  '11-oros': 6,     // Caballo
  '11-copas': 6,
  '11-espadas': 6,
  '11-bastos': 6,
  '10-oros': 5,     // Sota
  '10-copas': 5,
  '10-espadas': 5,
  '10-bastos': 5,
  '7-copas': 4,     // 7 de copas/bastos
  '7-bastos': 4,
  '6-oros': 3,      // Seis
  '6-copas': 3,
  '6-espadas': 3,
  '6-bastos': 3,
  '5-oros': 2,      // Cinco
  '5-copas': 2,
  '5-espadas': 2,
  '5-bastos': 2,
  '4-oros': 1,      // Cuatro (lowest)
  '4-copas': 1,
  '4-espadas': 1,
  '4-bastos': 1
};

export const ENVIDO_VALUES: Record<string, number> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '10': 0, '11': 0, '12': 0 // Figures are 0
};

export const DISPLAY_VALUES: Record<string, string> = {
  '1': 'A',
  '10': 'S',
  '11': 'C',
  '12': 'R'
};

// ============================================================================
// GAME CONSTANTS
// ============================================================================

export const SUITS: Suit[] = [Suit.OROS, Suit.COPAS, Suit.ESPADAS, Suit.BASTOS];
export const VALUES: number[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export const ENVIDO_CALLS: Record<string, EnvidoCall> = {
  ENVIDO: EnvidoCall.ENVIDO,
  REAL_ENVIDO: EnvidoCall.REAL_ENVIDO,
  FALTA_ENVIDO: EnvidoCall.FALTA_ENVIDO
};

export const TRUCO_CALLS: Record<string, TrucoCall> = {
  TRUCO: TrucoCall.TRUCO,
  RETRUCO: TrucoCall.RETRUCO,
  VALE_CUATRO: TrucoCall.VALE_CUATRO
};

export const ENVIDO_RESPONSES: Record<string, EnvidoResponse> = {
  QUIERO: EnvidoResponse.QUIERO,
  NO_QUIERO: EnvidoResponse.NO_QUIERO
};

export const TRUCO_RESPONSES: Record<string, TrucoResponse> = {
  QUIERO: TrucoResponse.QUIERO,
  NO_QUIERO: TrucoResponse.NO_QUIERO,
  RETRUCO: TrucoResponse.RETRUCO,
  VALE_CUATRO: TrucoResponse.VALE_CUATRO
};

// ============================================================================
// POINTS SYSTEM
// ============================================================================

export const POINTS = {
  // Envido points
  ENVIDO_ACCEPTED: 2,
  ENVIDO_REJECTED: 1,
  REAL_ENVIDO_ACCEPTED: 3,
  REAL_ENVIDO_REJECTED: 1,
  FALTA_ENVIDO_ACCEPTED: 30, // Or points needed to reach 30
  FALTA_ENVIDO_REJECTED: 1,
  
  // Truco points (when accepted)
  TRUCO_ACCEPTED: 2,
  RETRUCO_ACCEPTED: 3,
  VALE_CUATRO_ACCEPTED: 4,
  
  // Truco points (when rejected)
  TRUCO_REJECTED: 1,
  RETRUCO_REJECTED: 2,
  VALE_CUATRO_REJECTED: 3,
  
  // Mazo points
  MAZO_FIRST_ROUND: 2,
  MAZO_OTHER_ROUNDS: 1,
  
  // Hand win points
  HAND_WIN: 1
} as const;

// ============================================================================
// ACTION PRIORITIES
// ============================================================================

export const ACTION_PRIORITIES: Record<ActionType, number> = {
  [ActionType.ENVIDO]: 1,
  [ActionType.REAL_ENVIDO]: 2,
  [ActionType.FALTA_ENVIDO]: 3,
  [ActionType.TRUCO]: 4,
  [ActionType.RETRUCO]: 5,
  [ActionType.VALE_CUATRO]: 6,
  [ActionType.QUIERO]: 1,
  [ActionType.NO_QUIERO]: 2,
  [ActionType.GO_TO_MAZO]: 999
};

// ============================================================================
// CONFIGURATION
// ============================================================================

export const GAME_CONFIG: GameConfig = {
  maxPlayers: 2,
  maxScore: 30,
  cardsPerPlayer: 3,
  maxRoundsPerHand: 3,
  roundsToWinHand: 2
};

export const SERVER_CONFIG: ServerConfig = {
  port: parseInt(process.env['PORT'] || '3001', 10),
  host: process.env['HOST'] || 'localhost',
  corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3001'
};

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

export const WEBSOCKET_MESSAGE_TYPES = {
  // Client to Server
  REGISTER_PLAYER: 'REGISTER_PLAYER',
  CREATE_ROOM: 'CREATE_ROOM',
  JOIN_ROOM: 'JOIN_ROOM',
  JOIN_ROOM_BY_ID: 'JOIN_ROOM_BY_ID',
  GET_ROOM_INFO: 'GET_ROOM_INFO',
  LEAVE_ROOM: 'LEAVE_ROOM',
  START_GAME: 'START_GAME',
  DEAL_NEW_HAND: 'DEAL_NEW_HAND',
  PLAY_CARD: 'PLAY_CARD',
  CALL_ENVIDO: 'CALL_ENVIDO',
  RESPOND_ENVIDO: 'RESPOND_ENVIDO',
  CALL_TRUCO: 'CALL_TRUCO',
  RESPOND_TRUCO: 'RESPOND_TRUCO',
  GO_TO_MAZO: 'GO_TO_MAZO',
  GET_ROOMS: 'GET_ROOMS',

  // Server to Client
  PLAYER_REGISTERED: 'PLAYER_REGISTERED',
  ROOM_CREATED: 'ROOM_CREATED',
  ROOM_JOINED: 'ROOM_JOINED',
  ROOM_INFO: 'ROOM_INFO',
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_LEFT: 'PLAYER_LEFT',
  PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED',
  GAME_STARTED: 'GAME_STARTED',
  CARD_PLAYED: 'CARD_PLAYED',
  ENVIDO_CALLED: 'ENVIDO_CALLED',
  ENVIDO_RESPONDED: 'ENVIDO_RESPONDED',
  TRUCO_CALLED: 'TRUCO_CALLED',
  TRUCO_RESPONDED: 'TRUCO_RESPONDED',
  WENT_TO_MAZO: 'WENT_TO_MAZO',
  HAND_END: 'HAND_END',
  NEW_HAND_DEALT: 'NEW_HAND_DEALT',
  NEW_ROUND_DEALT: 'NEW_ROUND_DEALT',
  
  // Chinchón-specific messages
  DRAW_CARD: 'DRAW_CARD',
  DISCARD_CARD: 'DISCARD_CARD',
  CLOSE_ROUND: 'CLOSE_ROUND',
  SHOW_COMBINATIONS: 'SHOW_COMBINATIONS',
  CARD_DRAWN: 'CARD_DRAWN',
  CARD_DISCARDED: 'CARD_DISCARDED',
  ROUND_CLOSED: 'ROUND_CLOSED',
  COMBINATIONS_SHOWN: 'COMBINATIONS_SHOWN',
  
  ROOM_LIST_UPDATED: 'ROOM_LIST_UPDATED',
  SPEECH_BUBBLE: 'SPEECH_BUBBLE',
  ERROR: 'ERROR'
} as const;

// ============================================================================
// CARD TYPE DESCRIPTIONS
// ============================================================================

export const CARD_TYPE_DESCRIPTIONS = {
  HIGHEST: 'As de Espadas (Carta más alta)',
  HIGH: 'As de Bastos',
  HIGH_7: '7 de Espadas',
  HIGH_7_OROS: '7 de Oros',
  HIGH_3: 'Tres (Carta alta)',
  MEDIUM: 'Carta media',
  LOW: 'Carta baja'
} as const;

export const GAME_DELAY_NEW_HAND = 5000; // 5 seconds