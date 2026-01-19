/**
 * Dairy Feed Calculator - Pure Calculation Functions
 * Based on 2025 Dutch Ruminant Nutrition Standards (CVB)
 */

import { calculateVOC, validateIntake } from './voc';
import { calculateSubstitutionEffect, type SubstitutionResult } from './substitution';
import {
  VEM_MAINTENANCE_LACTATING,
  VEM_PER_KG_FPCM,
  VEM_GRAZING_ACTIVITY,
  DVE_MAINTENANCE_BASE,
  DVE_MAINTENANCE_PER_KG_BW,
  DVE_PRODUCTION_LINEAR,
  DVE_PRODUCTION_QUADRATIC,
  calculateMetabolicWeight,
  // Threshold constants
  COVERAGE_WARNING,
  COVERAGE_FULL,
  COVERAGE_EXCESS,
  OEB_WARNING_THRESHOLD,
  OEB_MINIMUM,
  SW_WARNING_THRESHOLD,
} from './cvbConstants';

export interface FeedData {
  name: string;
  displayName: string;
  vemPerUnit: number;
  dvePerUnit: number;
  oebPerUnit: number;
  caPerUnit: number;
  pPerUnit: number;
  defaultDsPercent: number;
  basis: string;
  swPerKgDs: number; // Structure Value per kg DS
  vwPerKgDs?: number; // Verzadigingswaarde (Filling Value) per kg DS
  category?: string | null; // Feed category (roughage, concentrate, byproduct, mineral)
}

export interface FeedInput {
  amountKg: number;
  dsPercent: number;
}

export interface AnimalProfileData {
  id: number;
  name: string;
  description: string | null;
  notes: string | null;
  weightKg: number;
  vemTarget: number;
  dveTargetGrams: number;
  maxBdsKg: number;
}

export interface NutrientSupply {
  dryMatterKg: number;
  vem: number;
  dveGrams: number;
  oebGrams: number;
  caGrams: number;
  pGrams: number;
}

export interface StructureValueResult {
  totalSw: number;           // Total SW from all feeds
  swPerKgDs: number;         // Weighted average SW per kg DS
  requirement: number;       // Minimum SW requirement (1.00)
  status: 'ok' | 'warning' | 'deficient';
  message: string;
}

export interface NutrientBalance {
  parameter: string;
  requirement: number;
  supply: number;
  balance: number;
  status: 'ok' | 'warning' | 'deficient';
  unit: string;
}

export interface VOCResult {
  vocCapacity: number;          // VOC capacity in kg DS/day
  totalVW: number;              // Total VW (filling value) from all feeds
  saturationPercent: number;    // VW / VOC × 100
  status: 'ok' | 'warning' | 'exceeded';
  message: string;
}

export interface CalculationResult {
  totalSupply: NutrientSupply;
  balances: NutrientBalance[];
  performancePrediction: string;
  isTargetMet: boolean;
  structureValue?: StructureValueResult;
  vocResult?: VOCResult;
  substitutionResult?: SubstitutionResult;
}

// Grazing surcharge constant - using centralized CVB constant
// Note: VEM_GRAZING_ACTIVITY from cvbConstants is 500 (daily activity)
// The 1175 value includes additional grazing-related energy needs
export const GRAZING_SURCHARGE_VEM = VEM_GRAZING_ACTIVITY + 675; // Activity + extra grazing needs

// Minimum Structure Value requirement for dairy cattle (CVB 2022)
export const MIN_SW_REQUIREMENT = 1.00;

/**
 * Calculate nutrient supply from a single feed
 */
export function calculateFeedSupply(
  feed: FeedData,
  input: FeedInput
): NutrientSupply {
  // For "per kg DS" feeds: input.amountKg IS the dry matter amount directly
  // For "per kg product" feeds: input.amountKg is fresh weight, need to convert for DS tracking
  
  let dryMatterKg: number;
  let nutrientMultiplier: number;
  
  if (feed.basis === 'per kg DS') {
    // User enters kg DS directly - this IS the dry matter and nutrient multiplier
    dryMatterKg = input.amountKg;
    nutrientMultiplier = input.amountKg;
  } else {
    // User enters kg product - convert to DS for intake tracking
    // CVB 2025: ALL nutritional values (VEM, DVE, OEB) are expressed per kg DS
    // So we must always multiply by kg DS, not kg product
    dryMatterKg = input.amountKg * (input.dsPercent / 100);
    nutrientMultiplier = dryMatterKg; // FIXED: Use kg DS for nutrient calculations (CVB 2025)
  }
  
  return {
    dryMatterKg,
    vem: nutrientMultiplier * feed.vemPerUnit,
    dveGrams: nutrientMultiplier * feed.dvePerUnit,
    oebGrams: nutrientMultiplier * feed.oebPerUnit,
    caGrams: nutrientMultiplier * feed.caPerUnit,
    pGrams: nutrientMultiplier * feed.pPerUnit,
  };
}

/**
 * Calculate total nutrient supply from all feeds
 */
export function calculateTotalSupply(
  feeds: { feed: FeedData; input: FeedInput }[],
  isGrazing: boolean
): NutrientSupply {
  const total: NutrientSupply = {
    dryMatterKg: 0,
    vem: 0,
    dveGrams: 0,
    oebGrams: 0,
    caGrams: 0,
    pGrams: 0,
  };
  
  for (const { feed, input } of feeds) {
    const supply = calculateFeedSupply(feed, input);
    total.dryMatterKg += supply.dryMatterKg;
    total.vem += supply.vem;
    total.dveGrams += supply.dveGrams;
    total.oebGrams += supply.oebGrams;
    total.caGrams += supply.caGrams;
    total.pGrams += supply.pGrams;
  }
  
  // Add grazing surcharge if applicable
  if (isGrazing) {
    total.vem += GRAZING_SURCHARGE_VEM;
  }
  
  return total;
}

/**
 * Determine status based on balance
 */
function getStatus(
  parameter: string,
  requirement: number,
  supply: number,
  balance: number
): 'ok' | 'warning' | 'deficient' {
  // Special handling for OEB (should be >= 0)
  // OEB_MINIMUM = 0, OEB_WARNING_THRESHOLD = -50 (from cvbConstants)
  if (parameter === 'OEB') {
    if (supply < OEB_WARNING_THRESHOLD) return 'deficient';
    if (supply < OEB_MINIMUM) return 'warning';
    return 'ok';
  }
  
  // Special handling for BDS (should not exceed max)
  if (parameter === 'Dry Matter Intake') {
    if (supply > requirement) return 'warning';
    return 'ok';
  }
  
  // For VEM, DVE, Ca, P - check if supply meets requirement
  // COVERAGE_WARNING = 90%, COVERAGE_FULL = 100%, COVERAGE_EXCESS = 110% (from cvbConstants)
  const percentOfRequirement = (supply / requirement) * 100;
  
  if (percentOfRequirement < COVERAGE_WARNING) return 'deficient';
  if (percentOfRequirement < COVERAGE_FULL) return 'warning';
  if (percentOfRequirement > COVERAGE_EXCESS) return 'warning'; // Excess
  return 'ok';
}

/**
 * Calculate mineral requirements based on animal weight
 * Scaled proportionally from the 12-month heifer baseline
 */
function calculateMineralRequirements(weightKg: number): { caGrams: number; pGrams: number } {
  const baseWeight = 329; // 12-month heifer weight
  const baseCa = 24; // Base Ca requirement for heifer
  const baseP = 18; // Base P requirement for heifer
  
  return {
    caGrams: Math.round((baseCa * (weightKg / baseWeight)) * 10) / 10,
    pGrams: Math.round((baseP * (weightKg / baseWeight)) * 10) / 10,
  };
}

/**
 * MPR Data interface for FCM-based calculations
 */
export interface MprDataForCalc {
  milkProduction: number;
  fatPercent: number;
  proteinPercent: number;
}

/**
 * Calculate FCM (Fat Corrected Milk)
 */
export function calculateFcm(mprData: MprDataForCalc): number {
  return (0.337 + 0.116 * mprData.fatPercent + 0.06 * mprData.proteinPercent) * mprData.milkProduction;
}

/**
 * Calculate VEM requirement based on MPR data and body weight
 * CVB 2025 Formula:
 * - Maintenance: VEM_MAINTENANCE_LACTATING × BW^0.75 (metabolic weight)
 * - Production: VEM_PER_KG_FPCM × FPCM
 */
export function calculateVemRequirementFromMpr(
  mprData: MprDataForCalc, 
  weightKg: number = 700,
  vocParams?: { parity: number; daysInMilk: number; daysPregnant: number }
): number {
  const fpcm = calculateFcm(mprData);
  const metabolicWeight = calculateMetabolicWeight(weightKg);
  const maintenanceVem = VEM_MAINTENANCE_LACTATING * metabolicWeight;
  const productionVem = VEM_PER_KG_FPCM * fpcm;
  
  // Add pregnancy and growth surcharges if VOC params provided
  let pregnancySurcharge = 0;
  let growthSurcharge = 0;
  
  if (vocParams) {
    // Pregnancy surcharge (exponential after day 190)
    if (vocParams.daysPregnant > 190) {
      if (vocParams.daysPregnant > 250) pregnancySurcharge = 3000;
      else if (vocParams.daysPregnant > 220) pregnancySurcharge = 2000;
      else pregnancySurcharge = 1000;
    }
    
    // Growth surcharge (jeugdgroei for young cows)
    if (vocParams.parity === 1) growthSurcharge = 630;
    else if (vocParams.parity === 2) growthSurcharge = 330;
  }
  
  return maintenanceVem + productionVem + pregnancySurcharge + growthSurcharge;
}

/**
 * Calculate DVE requirement based on MPR data and body weight
 * CVB 2025 Formula:
 * - Maintenance: DVE_MAINTENANCE_BASE + (DVE_MAINTENANCE_PER_KG_BW × BW)
 * - Production: DVE_PRODUCTION_LINEAR × ProteinYield + DVE_PRODUCTION_QUADRATIC × ProteinYield²
 */
export function calculateDveRequirementFromMpr(mprData: MprDataForCalc, weightKg: number = 700): number {
  const proteinYield = mprData.milkProduction * mprData.proteinPercent * 10;
  const maintenanceDve = DVE_MAINTENANCE_BASE + (DVE_MAINTENANCE_PER_KG_BW * weightKg);
  const productionDve = (DVE_PRODUCTION_LINEAR * proteinYield) + (DVE_PRODUCTION_QUADRATIC * Math.pow(proteinYield, 2));
  return maintenanceDve + productionDve;
}

/**
 * Calculate full nutrient balance
 */
export function calculateNutrientBalance(
  profile: AnimalProfileData,
  supply: NutrientSupply,
  isGrazing: boolean,
  mprData?: MprDataForCalc | null,
  vocParams?: { parity: number; daysInMilk: number; daysPregnant: number }
): NutrientBalance[] {
  const mineralReqs = calculateMineralRequirements(profile.weightKg);
  
  // Use FCM-based requirements if MPR data is available, otherwise use profile defaults
  // CVB 2025: Requirements are calculated dynamically based on body weight and production
  const totalVemRequirement = mprData 
    ? Math.round(calculateVemRequirementFromMpr(mprData, profile.weightKg, vocParams))
    : profile.vemTarget + (isGrazing ? GRAZING_SURCHARGE_VEM : 0);
  
  const totalDveRequirement = mprData
    ? Math.round(calculateDveRequirementFromMpr(mprData, profile.weightKg))
    : profile.dveTargetGrams;
  
  const balances: NutrientBalance[] = [
    {
      parameter: 'Dry Matter Intake',
      requirement: profile.maxBdsKg,
      supply: Math.round(supply.dryMatterKg * 100) / 100,
      balance: Math.round((supply.dryMatterKg - profile.maxBdsKg) * 100) / 100,
      status: 'ok',
      unit: 'kg DS',
    },
    {
      parameter: 'Energy (VEM)',
      requirement: totalVemRequirement,
      supply: Math.round(supply.vem),
      balance: Math.round(supply.vem - totalVemRequirement),
      status: 'ok',
      unit: 'VEM',
    },
    {
      parameter: 'Protein (DVE)',
      requirement: totalDveRequirement,
      supply: Math.round(supply.dveGrams),
      balance: Math.round(supply.dveGrams - totalDveRequirement),
      status: 'ok',
      unit: 'g',
    },
    {
      parameter: 'OEB',
      requirement: 0,
      supply: Math.round(supply.oebGrams),
      balance: Math.round(supply.oebGrams),
      status: 'ok',
      unit: 'g',
    },
    {
      parameter: 'Calcium (Ca)',
      requirement: mineralReqs.caGrams,
      supply: Math.round(supply.caGrams * 10) / 10,
      balance: Math.round((supply.caGrams - mineralReqs.caGrams) * 10) / 10,
      status: 'ok',
      unit: 'g',
    },
    {
      parameter: 'Phosphorus (P)',
      requirement: mineralReqs.pGrams,
      supply: Math.round(supply.pGrams * 10) / 10,
      balance: Math.round((supply.pGrams - mineralReqs.pGrams) * 10) / 10,
      status: 'ok',
      unit: 'g',
    },
  ];
  
  // Calculate status for each balance
  for (const b of balances) {
    b.status = getStatus(b.parameter, b.requirement, b.supply, b.balance);
  }
  
  return balances;
}

/**
 * Generate performance prediction message
 */
export function getPerformancePrediction(
  profile: AnimalProfileData,
  balances: NutrientBalance[]
): { message: string; isTargetMet: boolean } {
  const vemBalance = balances.find(b => b.parameter === 'Energy (VEM)');
  const dveBalance = balances.find(b => b.parameter === 'Protein (DVE)');
  const bdsBalance = balances.find(b => b.parameter === 'Dry Matter Intake');
  
  // Check if VEM supply meets at least 95% of requirement
  const isVemMet = vemBalance && vemBalance.supply >= vemBalance.requirement * 0.95;
  // Check if DVE supply meets at least 95% of requirement  
  const isDveMet = dveBalance && dveBalance.supply >= dveBalance.requirement * 0.95;
  // Note: BDS (dry matter intake) exceeding limit is a warning but doesn't prevent target being met
  // The main performance targets are VEM and DVE
  
  const isTargetMet = isVemMet && isDveMet;
  
  if (profile.name === 'Vaars 12 maanden') {
    if (isTargetMet) {
      return {
        message: '✅ Dit rantsoen ondersteunt de doelgroei van 860g/dag',
        isTargetMet: true,
      };
    }
    return {
      message: '⚠️ Dit rantsoen bereikt mogelijk niet de doelgroei van 860g/dag. Controleer de voedingstekorten.',
      isTargetMet: false,
    };
  }
  
  if (profile.name === 'Droge koe 9e maand') {
    if (isTargetMet) {
      return {
        message: '✅ Dit rantsoen bereidt de koe adequaat voor op het afkalven',
        isTargetMet: true,
      };
    }
    return {
      message: '⚠️ Dit rantsoen bereidt de koe mogelijk niet adequaat voor op het afkalven. Controleer de voedingstekorten.',
      isTargetMet: false,
    };
  }
  
  // Hoogproductieve koe (41kg melk)
  if (profile.name === 'Hoogproductieve koe (41kg melk)') {
    if (isTargetMet) {
      return {
        message: '✅ Dit rantsoen ondersteunt de doelproductie van 41kg melk/dag (FCM 44.9kg)',
        isTargetMet: true,
      };
    }
    return {
      message: '⚠️ Dit rantsoen bereikt mogelijk niet de 41kg/dag melkproductie. Controleer de voedingstekorten.',
      isTargetMet: false,
    };
  }
  
  // Overige melkkoeien (30kg melk)
  if (isTargetMet) {
    return {
      message: '✅ Dit rantsoen ondersteunt de doelproductie van 30kg melk/dag',
      isTargetMet: true,
    };
  }
  return {
    message: '⚠️ Dit rantsoen bereikt mogelijk niet de 30kg/dag melkproductie. Controleer de voedingstekorten.',
    isTargetMet: false,
  };
}

/**
 * Calculate Structure Value (Structuurwaarde) for the ration
 * SW indicates fiber adequacy for proper rumen function
 */
export function calculateStructureValue(
  feeds: { feed: FeedData; input: FeedInput }[]
): StructureValueResult {
  let totalSw = 0;
  let totalDs = 0;
  
  for (const { feed, input } of feeds) {
    let dryMatterKg: number;
    
    if (feed.basis === 'per kg DS') {
      dryMatterKg = input.amountKg;
    } else {
      dryMatterKg = input.amountKg * (input.dsPercent / 100);
    }
    
    // SW is always per kg DS
    totalSw += dryMatterKg * feed.swPerKgDs;
    totalDs += dryMatterKg;
  }
  
  const swPerKgDs = totalDs > 0 ? totalSw / totalDs : 0;
  
  // Determine status based on CVB guidelines
  let status: 'ok' | 'warning' | 'deficient';
  let message: string;
  
  if (swPerKgDs >= MIN_SW_REQUIREMENT) {
    status = 'ok';
    message = 'Voldoende structuur voor gezonde penswerking';
  } else if (swPerKgDs >= SW_WARNING_THRESHOLD) {
    status = 'warning';
    message = 'Marginale structuur - verhoog ruwvoeraandeel';
  } else {
    status = 'deficient';
    message = 'Onvoldoende structuur - risico op pensacidose';
  }
  
  return {
    totalSw: Math.round(totalSw * 100) / 100,
    swPerKgDs: Math.round(swPerKgDs * 100) / 100,
    requirement: MIN_SW_REQUIREMENT,
    status,
    message,
  };
}

/**
 * Calculate VOC (intake capacity) result
 */
function calculateVOCResult(
  feeds: { feed: FeedData; input: FeedInput }[],
  parity?: number,
  daysInMilk?: number,
  daysPregnant?: number
): VOCResult | undefined {
  // Only calculate VOC if parameters are provided
  if (parity === undefined || daysInMilk === undefined || daysPregnant === undefined) {
    return undefined;
  }
  
  // Calculate VOC capacity
  const vocResult = calculateVOC({ parity, daysInMilk, daysPregnant });
  const vocCapacity = vocResult.vocKgDs; // Use kg DS approximation
  
  // Calculate total VW from all feeds
  let totalVW = 0;
  for (const { feed, input } of feeds) {
    if (feed.vwPerKgDs) {
      // Calculate dry matter for this feed
      const dryMatterKg = feed.basis === 'per kg DS' 
        ? input.amountKg 
        : input.amountKg * (input.dsPercent / 100);
      
      // Add VW contribution
      totalVW += dryMatterKg * feed.vwPerKgDs;
    }
  }
  
  // Calculate saturation percentage
  const saturationPercent = (totalVW / vocCapacity) * 100;
  
  // Determine status
  let status: 'ok' | 'warning' | 'exceeded';
  let message: string;
  
  if (saturationPercent > 100) {
    status = 'exceeded';
    message = `⚠️ Opnamecapaciteit overschreden! Rantsoen te verzadigend (${Math.round(saturationPercent)}%). Koe kan dit niet opnemen.`;
  } else if (saturationPercent > 95) {
    status = 'warning';
    message = `⚠️ Opnamecapaciteit bijna bereikt (${Math.round(saturationPercent)}%). Weinig ruimte voor extra voer.`;
  } else {
    status = 'ok';
    message = `✅ Opnamecapaciteit OK (${Math.round(saturationPercent)}%). Koe kan dit rantsoen goed opnemen.`;
  }
  
  return {
    vocCapacity: Math.round(vocCapacity * 10) / 10,
    totalVW: Math.round(totalVW * 10) / 10,
    saturationPercent: Math.round(saturationPercent),
    status,
    message,
  };
}

/**
 * Main calculation function
 */
export function calculateRation(
  profile: AnimalProfileData,
  feeds: { feed: FeedData; input: FeedInput }[],
  isGrazing: boolean,
  mprData?: MprDataForCalc | null,
  vocParams?: { parity: number; daysInMilk: number; daysPregnant: number }
): CalculationResult {
  const totalSupply = calculateTotalSupply(feeds, isGrazing);
  const balances = calculateNutrientBalance(profile, totalSupply, isGrazing, mprData, vocParams);
  const prediction = getPerformancePrediction(profile, balances);
  const structureValue = calculateStructureValue(feeds);
  const vocResult = vocParams 
    ? calculateVOCResult(feeds, vocParams.parity, vocParams.daysInMilk, vocParams.daysPregnant)
    : undefined;
  
  // Calculate substitution effect (concentrate displacing roughage)
  const feedsWithCategory = feeds.map(({ feed, input }) => ({
    category: feed.category ?? 'roughage',  // Default to roughage if not specified
    kgDs: feed.basis === 'per kg DS' 
      ? input.amountKg 
      : input.amountKg * (input.dsPercent / 100)
  }));
  const substitutionResult = calculateSubstitutionEffect(
    feedsWithCategory,
    profile.maxBdsKg  // Use max BDS as max roughage intake
  );
  
  return {
    totalSupply,
    balances,
    performancePrediction: prediction.message,
    isTargetMet: prediction.isTargetMet,
    structureValue,
    vocResult,
    substitutionResult,
  };
}
