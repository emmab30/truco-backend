// ============================================================================
// TRUCO - INDEX
// Re-exports all Truco game exports
// ============================================================================

export * from './types';
export * from './constants';
export * from './utils';
export * from './logic/gameLogic';
export * from './logic/actions';

// AI exports
export { TrucoAI } from './ai/aiPlayer';
export { TrucoAIService } from './ai/aiService';
export type { AIDifficulty, AIAction } from './ai/aiPlayer';

