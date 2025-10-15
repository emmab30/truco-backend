// ============================================================================
// CHINCHÓN - INDEX  
// Re-exports all Chinchón game exports
// ============================================================================

export * from '@/shared/types/chinchon';
export * from './constants';
export * from './logic/gameLogic';

// Explicitly re-export utils to avoid conflicts
export {
    generateStableCombinationId,
    getChinchonValue,
    isValidSequence,
    isValidGroup,
    calculateCombinationPoints
} from './utils';

