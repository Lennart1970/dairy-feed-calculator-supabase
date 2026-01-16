/**
 * useCalculation Hook
 * 
 * Centralizes all calculation logic for the dairy feed calculator.
 * Extracted from CalculatorForm.tsx for better maintainability and testability.
 * 
 * Responsibilities:
 * - Calculate dynamic requirements (VEM, DVE) based on animal profile
 * - Calculate roughage supply
 * - Calculate total supply
 * - Calculate full ration results
 */

import { useMemo } from 'react';
import { 
  calculateRation, 
  calculateTotalSupply, 
  calculateFcm, 
  type CalculationResult, 
  type FeedData, 
  type FeedInput, 
  type AnimalProfileData 
} from '@/lib/calculator';
import { 
  calculateDynamicRequirements, 
  type DynamicRequirementInputs,
  type DynamicRequirements 
} from '@/lib/dynamicRequirements';

// Types
export interface AnimalProfile {
  id: number;
  name: string;
  description: string | null;
  notes: string | null;
  weightKg: number;
  vemTarget: number;
  dveTargetGrams: number;
  maxBdsKg: number;
  parity: number | null;
  daysInMilk: number | null;
  daysPregnant: number | null;
}

export interface MprData {
  milkProduction: number;
  fatPercent: number;
  proteinPercent: number;
  ureum: number;
}

export interface VocParams {
  parity: number;
  daysInMilk: number;
  daysPregnant: number;
  weightKg: number;
}

export interface FeedInputState {
  [feedName: string]: FeedInput;
}

export interface UseCalculationParams {
  selectedProfile: AnimalProfile | null;
  feedsData: FeedData[] | undefined;
  feedInputs: FeedInputState;
  isGrazing: boolean;
  mprData: MprData | null | undefined;
  vocParams: VocParams;
}

export interface UseCalculationResult {
  dynamicRequirements: DynamicRequirements | null;
  roughageSupply: ReturnType<typeof calculateTotalSupply> | null;
  totalSupply: ReturnType<typeof calculateTotalSupply> | null;
  calculationResult: CalculationResult | null;
}

/**
 * Helper function to convert database feed to FeedData with proper types
 */
export function toFeedData(feed: { 
  name: string; 
  displayName: string; 
  vemPerUnit: number; 
  dvePerUnit: number; 
  oebPerUnit: number; 
  caPerUnit: number; 
  pPerUnit: number; 
  defaultDsPercent: number; 
  basis: string;
  swPerKgDs: string | number;
  vwPerKgDs?: string | number | null;
}): FeedData {
  return {
    ...feed,
    swPerKgDs: typeof feed.swPerKgDs === 'string' ? parseFloat(feed.swPerKgDs) : feed.swPerKgDs,
    vwPerKgDs: feed.vwPerKgDs ? (typeof feed.vwPerKgDs === 'string' ? parseFloat(feed.vwPerKgDs) : feed.vwPerKgDs) : undefined,
  };
}

/**
 * Check if a feed is roughage based on its name
 */
export function isRoughageFeed(feedName: string): boolean {
  return feedName.includes("gras") || feedName.includes("mais") || feedName.includes("kuil");
}

/**
 * Main calculation hook
 */
export function useCalculation({
  selectedProfile,
  feedsData,
  feedInputs,
  isGrazing,
  mprData,
  vocParams,
}: UseCalculationParams): UseCalculationResult {
  
  // Calculate dynamic requirements based on parity/DIM/pregnancy
  // For Holstein-Fries profile, use defaults if no MPR data
  const dynamicRequirements = useMemo(() => {
    if (!selectedProfile) return null;
    
    // Check if this is the HF profile (dynamic requirements only for HF)
    const isHolsteinFries = selectedProfile.name.includes('Holstein-Fries');
    if (!isHolsteinFries) return null;
    
    // Use MPR data if available, otherwise use profile defaults
    let fpcm: number;
    if (mprData && mprData.milkProduction > 0) {
      fpcm = calculateFcm(mprData);
    } else {
      // Extract milk production from profile name (e.g., "41kg melk" -> 41)
      const milkMatch = selectedProfile.name.match(/(\d+)kg\s*melk/i);
      const defaultMilk = milkMatch ? parseInt(milkMatch[1]) : 41;
      // Use standard HF fat/protein percentages
      const defaultFat = 4.60;
      const defaultProtein = 3.75;
      // Calculate FPCM with defaults
      fpcm = defaultMilk * (0.337 + 0.116 * defaultFat + 0.06 * defaultProtein);
    }
    
    const inputs: DynamicRequirementInputs = {
      weightKg: vocParams.weightKg,
      parity: vocParams.parity,
      daysInMilk: vocParams.daysInMilk,
      daysPregnant: vocParams.daysPregnant,
      fpcm,
      isGrazing,
    };
    
    return calculateDynamicRequirements(inputs);
  }, [selectedProfile, mprData, vocParams, isGrazing]);

  // Separate feeds by category
  const { roughageFeeds, concentrateFeeds } = useMemo(() => {
    if (!feedsData) return { roughageFeeds: [], concentrateFeeds: [] };
    
    const roughage: FeedData[] = [];
    const concentrate: FeedData[] = [];
    
    for (const feed of feedsData) {
      if (isRoughageFeed(feed.name)) {
        roughage.push(toFeedData(feed));
      } else {
        concentrate.push(toFeedData(feed));
      }
    }
    
    return { roughageFeeds: roughage, concentrateFeeds: concentrate };
  }, [feedsData]);

  // Calculate roughage-only supply for gap analysis
  const roughageSupply = useMemo(() => {
    if (!roughageFeeds.length) return null;
    
    const roughageFeedInputs: { feed: FeedData; input: FeedInput }[] = [];
    for (const feed of roughageFeeds) {
      const input = feedInputs[feed.name];
      if (input && input.amountKg > 0) {
        roughageFeedInputs.push({ feed, input });
      }
    }
    
    if (roughageFeedInputs.length === 0) return null;
    return calculateTotalSupply(roughageFeedInputs, isGrazing);
  }, [roughageFeeds, feedInputs, isGrazing]);

  // Calculate total supply for gap visualization
  const totalSupply = useMemo(() => {
    if (!feedsData || Object.keys(feedInputs).length === 0) return null;
    
    const allFeedInputs: { feed: FeedData; input: FeedInput }[] = [];
    for (const feed of feedsData) {
      const input = feedInputs[feed.name];
      if (input && input.amountKg > 0) {
        allFeedInputs.push({ feed: toFeedData(feed), input });
      }
    }
    
    if (allFeedInputs.length === 0) return null;
    return calculateTotalSupply(allFeedInputs, isGrazing);
  }, [feedsData, feedInputs, isGrazing]);

  // Calculate full ration
  const calculationResult = useMemo(() => {
    if (!selectedProfile || !feedsData || Object.keys(feedInputs).length === 0) {
      return null;
    }

    const feeds: { feed: FeedData; input: FeedInput }[] = [];
    for (const feed of feedsData) {
      const input = feedInputs[feed.name];
      if (input && input.amountKg > 0) {
        feeds.push({ feed: toFeedData(feed), input });
      }
    }

    if (feeds.length === 0) {
      return null;
    }

    return calculateRation(
      selectedProfile as AnimalProfileData, 
      feeds, 
      isGrazing, 
      mprData,
      { 
        parity: vocParams.parity, 
        daysInMilk: vocParams.daysInMilk, 
        daysPregnant: vocParams.daysPregnant 
      }
    );
  }, [selectedProfile, feedsData, feedInputs, isGrazing, mprData, vocParams]);

  return {
    dynamicRequirements,
    roughageSupply,
    totalSupply,
    calculationResult,
  };
}

/**
 * Calculate FCM-based VEM requirement when MPR data is available
 * Uses CVB 2025 formula
 */
export function calculateVemRequirementFromMpr(
  mpr: { milkProduction: number; fatPercent: number; proteinPercent: number },
  weightKg: number = 700
): number {
  const fpcm = calculateFcm(mpr);
  const metabolicWeight = Math.pow(weightKg, 0.75);
  const maintenance = 53.0 * metabolicWeight;
  const production = 390 * fpcm;
  return maintenance + production;
}

/**
 * Calculate FCM-based DVE requirement when MPR data is available
 * Uses CVB 2025 formula
 */
export function calculateDveRequirementFromMpr(
  mpr: { milkProduction: number; proteinPercent: number },
  weightKg: number = 700
): number {
  const proteinYieldGrams = mpr.milkProduction * mpr.proteinPercent * 10;
  const maintenance = 54 + 0.1 * weightKg;
  const production = 1.396 * proteinYieldGrams + 0.000195 * Math.pow(proteinYieldGrams, 2);
  return maintenance + production;
}
