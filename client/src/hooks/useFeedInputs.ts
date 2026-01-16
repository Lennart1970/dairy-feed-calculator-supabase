/**
 * useFeedInputs Hook
 * 
 * Centralizes feed input state management for the dairy feed calculator.
 * Extracted from CalculatorForm.tsx for better maintainability and testability.
 * 
 * Responsibilities:
 * - Manage feed input state (amounts and DS percentages)
 * - Sync external roughage feeds with internal state
 * - Handle concentrate feed inputs (lifted state pattern)
 * - Initialize default rations based on profile
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { FeedInput } from '@/lib/calculator';

// Types
export type FeedInputState = Record<string, FeedInput>;

export interface ExternalRoughageFeed {
  id: string;
  name: string;
  displayName: string;
  vem: number;
  dve: number;
  oeb: number;
  dsPercent: number;
  amount: number;
}

export interface FeedFromDatabase {
  name: string;
  displayName: string;
  defaultDsPercent: number;
  [key: string]: unknown;
}

export interface UseFeedInputsParams {
  feedsData: FeedFromDatabase[] | undefined;
  externalRoughageFeeds?: ExternalRoughageFeed[];
  externalConcentrateFeedInputs?: FeedInputState;
  onConcentrateFeedInputsChange?: (inputs: FeedInputState) => void;
  standardRations: Record<string, Record<string, number>>;
  defaultProfileName?: string;
}

export interface UseFeedInputsResult {
  feedInputs: FeedInputState;
  setFeedInputs: (updater: FeedInputState | ((prev: FeedInputState) => FeedInputState)) => void;
  handleFeedAmountChange: (feedName: string, value: string) => void;
  handleDsPercentChange: (feedName: string, value: string) => void;
  initializeForProfile: (profileName: string) => void;
  hasInitialized: boolean;
}

// Concentrate feed names (feeds that go through the automaat)
const CONCENTRATE_FEED_NAMES = [
  'bierborstel', 
  'gerstmeel', 
  'raapzaadschroot', 
  'stalbrok', 
  'startbrok',
  'sojaschroot',
  'tarwe',
  'krachtvoer',
];

/**
 * Check if a feed is a concentrate (vs roughage)
 */
export function isConcentrateFeed(feedName: string): boolean {
  return CONCENTRATE_FEED_NAMES.includes(feedName.toLowerCase());
}

/**
 * Main feed inputs hook
 */
export function useFeedInputs({
  feedsData,
  externalRoughageFeeds,
  externalConcentrateFeedInputs,
  onConcentrateFeedInputsChange,
  standardRations,
  defaultProfileName,
}: UseFeedInputsParams): UseFeedInputsResult {
  
  // Internal state for roughage feeds
  const [internalFeedInputs, setInternalFeedInputs] = useState<FeedInputState>({});
  
  // Track if initial feed inputs have been set
  const hasInitializedFeedInputs = useRef(false);
  
  // Track previous external roughage feeds to avoid unnecessary updates
  const prevExternalRoughageFeedsRef = useRef<ExternalRoughageFeed[] | undefined>(undefined);

  // Merge external concentrate inputs with internal roughage inputs
  const feedInputs = useMemo(() => {
    if (externalConcentrateFeedInputs) {
      return { ...internalFeedInputs, ...externalConcentrateFeedInputs };
    }
    return internalFeedInputs;
  }, [internalFeedInputs, externalConcentrateFeedInputs]);

  // Wrapper to update feed inputs - routes concentrate feeds to parent, roughage to internal
  const setFeedInputs = useCallback((updater: FeedInputState | ((prev: FeedInputState) => FeedInputState)) => {
    if (typeof updater === 'function') {
      setInternalFeedInputs(prev => {
        const mergedPrev = { ...prev, ...externalConcentrateFeedInputs };
        const newState = updater(mergedPrev);
        
        // Separate concentrate and roughage inputs
        const concentrateInputs: FeedInputState = {};
        const roughageInputs: FeedInputState = {};
        
        for (const [key, value] of Object.entries(newState)) {
          if (isConcentrateFeed(key)) {
            concentrateInputs[key] = value;
          } else {
            roughageInputs[key] = value;
          }
        }
        
        // Notify parent about concentrate changes
        if (onConcentrateFeedInputsChange && Object.keys(concentrateInputs).length > 0) {
          onConcentrateFeedInputsChange(concentrateInputs);
        }
        
        return roughageInputs;
      });
    } else {
      // Direct state update
      const concentrateInputs: FeedInputState = {};
      const roughageInputs: FeedInputState = {};
      
      for (const [key, value] of Object.entries(updater)) {
        if (isConcentrateFeed(key)) {
          concentrateInputs[key] = value;
        } else {
          roughageInputs[key] = value;
        }
      }
      
      setInternalFeedInputs(roughageInputs);
      
      if (onConcentrateFeedInputsChange && Object.keys(concentrateInputs).length > 0) {
        onConcentrateFeedInputsChange(concentrateInputs);
      }
    }
  }, [externalConcentrateFeedInputs, onConcentrateFeedInputsChange]);

  // Initialize feed inputs for a specific profile
  const initializeForProfile = useCallback((profileName: string) => {
    if (!feedsData) return;
    
    const standardRation = standardRations[profileName];
    const newInputs: FeedInputState = {};
    
    for (const feed of feedsData) {
      // Check if external roughage feeds are provided and this is a roughage feed
      const externalFeed = externalRoughageFeeds?.find(ef => ef.name === feed.name);
      if (externalFeed) {
        newInputs[feed.name] = {
          amountKg: externalFeed.amount,
          dsPercent: externalFeed.dsPercent,
        };
      } else {
        const standardAmount = standardRation?.[feed.name] || 0;
        newInputs[feed.name] = {
          amountKg: standardAmount,
          dsPercent: feed.defaultDsPercent,
        };
      }
    }
    
    setFeedInputs(newInputs);
  }, [feedsData, externalRoughageFeeds, standardRations, setFeedInputs]);

  // Initialize on first load
  useEffect(() => {
    if (feedsData && !hasInitializedFeedInputs.current && defaultProfileName) {
      hasInitializedFeedInputs.current = true;
      initializeForProfile(defaultProfileName);
    }
  }, [feedsData, defaultProfileName, initializeForProfile]);

  // Sync external roughage feed changes to feedInputs
  useEffect(() => {
    if (!externalRoughageFeeds || !feedsData || !hasInitializedFeedInputs.current) return;
    
    // Only update if external roughage feeds have actually changed
    const prevFeeds = prevExternalRoughageFeedsRef.current;
    const feedsChanged = !prevFeeds || 
      prevFeeds.length !== externalRoughageFeeds.length ||
      externalRoughageFeeds.some((feed, i) => 
        !prevFeeds[i] || 
        feed.amount !== prevFeeds[i].amount || 
        feed.dsPercent !== prevFeeds[i].dsPercent
      );
    
    if (!feedsChanged) return;
    
    prevExternalRoughageFeedsRef.current = externalRoughageFeeds;
    
    // Update internal feed inputs directly for roughage feeds
    setInternalFeedInputs(prev => {
      const updated = { ...prev };
      for (const externalFeed of externalRoughageFeeds) {
        updated[externalFeed.name] = {
          amountKg: externalFeed.amount,
          dsPercent: externalFeed.dsPercent,
        };
      }
      return updated;
    });
  }, [externalRoughageFeeds, feedsData]);

  // Handle feed amount change
  const handleFeedAmountChange = useCallback((feedName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFeedInputs(prev => ({
      ...prev,
      [feedName]: { ...prev[feedName], amountKg: numValue },
    }));
  }, [setFeedInputs]);

  // Handle DS percent change
  const handleDsPercentChange = useCallback((feedName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFeedInputs(prev => ({
      ...prev,
      [feedName]: { ...prev[feedName], dsPercent: Math.min(100, Math.max(0, numValue)) },
    }));
  }, [setFeedInputs]);

  return {
    feedInputs,
    setFeedInputs,
    handleFeedAmountChange,
    handleDsPercentChange,
    initializeForProfile,
    hasInitialized: hasInitializedFeedInputs.current,
  };
}
