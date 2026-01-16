/**
 * Hooks Index
 * 
 * Re-exports all custom hooks for easy importing.
 */

export { 
  useCalculation, 
  toFeedData, 
  isRoughageFeed,
  calculateVemRequirementFromMpr,
  calculateDveRequirementFromMpr,
} from './useCalculation';
export type { 
  UseCalculationParams, 
  UseCalculationResult,
  AnimalProfile,
  MprData,
  VocParams,
  FeedInputState as CalculationFeedInputState,
} from './useCalculation';

export { 
  useFeedInputs, 
  isConcentrateFeed,
} from './useFeedInputs';
export type { 
  UseFeedInputsParams, 
  UseFeedInputsResult,
  ExternalRoughageFeed,
  FeedFromDatabase,
  FeedInputState,
} from './useFeedInputs';
