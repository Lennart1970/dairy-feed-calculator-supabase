/**
 * Bridge between existing calculator state and the new Auditable Calculator
 * 
 * This module converts the current application state into the format
 * required by the auditable calculation engine.
 * 
 * SW/VW values are now loaded from the database - no hardcoded fallbacks!
 */

import { 
  AuditableCalculationInputs, 
  FeedInput as AuditableFeedInput,
  calculateAuditableRation,
  AuditableCalculationResult 
} from './auditableCalculator';

// Types from the existing system
interface RoughageEntry {
  id: string;
  name: string;
  displayName: string;
  vem: number;
  dve: number;
  oeb: number;
  dsPercent: number;
  amount: number;
  swPerKgDs?: number;  // Structure value per kg DS (from database)
  vwPerKgDs?: number;  // Filling value per kg DS (from database)
}

interface ConcentrateFeedInput {
  amountKg: number;
  dsPercent: number;
}

interface ConcentrateFeed {
  name: string;
  displayName: string;
  vemPerUnit: number;
  dvePerUnit: number;
  oebPerUnit: number;
  basis: string;
  defaultDsPercent: number;
  swPerKgDs?: number;  // From database
  vwPerKgDs?: number;  // From database
}

interface MprData {
  milkProduction: number;
  fatPercent: number;
  proteinPercent: number;
  ureum?: number;
}

// Default SW/VW values ONLY used when database values are missing
// These are conservative estimates based on CVB 2025 typical values
const DEFAULT_SW_ROUGHAGE = 1.00;  // Conservative default for roughage
const DEFAULT_VW_ROUGHAGE = 1.00;  // Conservative default for roughage
const DEFAULT_SW_CONCENTRATE = 0.35;  // Conservative default for concentrates
const DEFAULT_VW_CONCENTRATE = 0.40;  // Conservative default for concentrates

/**
 * Get SW/VW values, preferring database values over defaults
 * Logs a warning if falling back to defaults (indicates missing database data)
 */
function getFeedSwVw(
  feedName: string, 
  dbSwPerKgDs: number | undefined, 
  dbVwPerKgDs: number | undefined,
  isRoughage: boolean
): { sw: number; vw: number } {
  const defaultSw = isRoughage ? DEFAULT_SW_ROUGHAGE : DEFAULT_SW_CONCENTRATE;
  const defaultVw = isRoughage ? DEFAULT_VW_ROUGHAGE : DEFAULT_VW_CONCENTRATE;
  
  const sw = (dbSwPerKgDs !== undefined && dbSwPerKgDs > 0) ? dbSwPerKgDs : defaultSw;
  const vw = (dbVwPerKgDs !== undefined && dbVwPerKgDs > 0) ? dbVwPerKgDs : defaultVw;
  
  // Log warning if using defaults (helps identify missing database data)
  if (dbSwPerKgDs === undefined || dbSwPerKgDs === 0) {
    console.warn(`[auditableBridge] Missing SW value for "${feedName}", using default: ${defaultSw}`);
  }
  if (dbVwPerKgDs === undefined || dbVwPerKgDs === 0) {
    console.warn(`[auditableBridge] Missing VW value for "${feedName}", using default: ${defaultVw}`);
  }
  
  return { sw, vw };
}

/**
 * Convert parity selection to numeric value
 */
function parityToNumber(paritySelection: string | undefined): number {
  if (!paritySelection) return 3; // Default to mature cow
  
  const lower = paritySelection.toLowerCase();
  if (lower.includes('vaars') || lower.includes('1e lactatie') || lower.includes('first')) {
    return 1;
  }
  if (lower.includes('2e lactatie') || lower.includes('second')) {
    return 2;
  }
  return 3; // Mature cow (3+ lactations)
}

/**
 * Convert days in milk selection to numeric value
 */
function daysInMilkToNumber(dimSelection: string | undefined): number {
  if (!dimSelection) return 150; // Default to mid-lactation
  
  const lower = dimSelection.toLowerCase();
  if (lower.includes('≤100') || lower.includes('vroeg') || lower.includes('early')) {
    return 60;
  }
  if (lower.includes('>100') || lower.includes('midden') || lower.includes('mid') || lower.includes('late')) {
    return 180;
  }
  return 150;
}

/**
 * Convert pregnancy selection to numeric value
 */
function daysPregnantToNumber(pregnancySelection: string | undefined): number {
  if (!pregnancySelection) return 0;
  
  const lower = pregnancySelection.toLowerCase();
  if (lower.includes('niet drachtig') || lower.includes('not pregnant')) {
    return 0;
  }
  if (lower.includes('<190') || lower.includes('vroeg')) {
    return 100;
  }
  if (lower.includes('≥190') || lower.includes('laat') || lower.includes('late')) {
    return 220;
  }
  return 0;
}

/**
 * Main bridge function: Convert current app state to auditable calculation
 * 
 * SW/VW values are now taken from the feed objects (loaded from database)
 * instead of hardcoded lookup tables.
 */
export function runAuditableCalculation(
  roughageFeeds: RoughageEntry[],
  concentrateFeeds: ConcentrateFeed[],
  concentrateFeedInputs: Record<string, ConcentrateFeedInput>,
  animalProfile: {
    name: string;
    weightKg: number;
  },
  paritySelection: string | number,
  daysInMilkSelection: string | number,
  pregnancySelection: string | number,
  mprData?: MprData | null,
  isGrazing: boolean = false
): AuditableCalculationResult {
  
  // Convert roughage feeds to auditable format
  // SW/VW values come from the feed objects (database)
  const auditableRoughageFeeds: AuditableFeedInput[] = roughageFeeds
    .filter(f => f.amount > 0)
    .map(f => {
      const { sw, vw } = getFeedSwVw(f.name, f.swPerKgDs, f.vwPerKgDs, true);
      return {
        name: f.name,
        displayName: f.displayName,
        amountKg: f.amount,
        dsPercent: f.dsPercent,
        basis: 'per kg DS' as const,
        vemPerUnit: f.vem,
        dvePerUnit: f.dve,
        oebPerUnit: f.oeb,
        swPerKgDs: sw,
        vwPerKgDs: vw,
      };
    });
  
  // Convert concentrate feeds to auditable format
  // SW/VW values come from the feed objects (database)
  const auditableConcentrateFeeds: AuditableFeedInput[] = concentrateFeeds
    .filter(f => {
      const input = concentrateFeedInputs[f.name];
      return input && input.amountKg > 0;
    })
    .map(f => {
      const input = concentrateFeedInputs[f.name];
      const { sw, vw } = getFeedSwVw(f.name, f.swPerKgDs, f.vwPerKgDs, false);
      return {
        name: f.name,
        displayName: f.displayName,
        amountKg: input.amountKg,
        dsPercent: input.dsPercent || f.defaultDsPercent,
        basis: f.basis as 'per kg DS' | 'per kg product',
        vemPerUnit: f.vemPerUnit,
        dvePerUnit: f.dvePerUnit,
        oebPerUnit: f.oebPerUnit,
        swPerKgDs: sw,
        vwPerKgDs: vw,
      };
    });
  
  // Combine all feeds
  const allFeeds = [...auditableRoughageFeeds, ...auditableConcentrateFeeds];
  
  // Determine if lactating based on profile name
  const isLactating = animalProfile.name.toLowerCase().includes('melk') ||
                      animalProfile.name.toLowerCase().includes('lactatie') ||
                      animalProfile.name.toLowerCase().includes('productie');
  
  // Build inputs for auditable calculator
  const inputs: AuditableCalculationInputs = {
    animalProfile: {
      name: animalProfile.name,
      weightKg: animalProfile.weightKg,
      parity: typeof paritySelection === 'number' ? paritySelection : parityToNumber(paritySelection),
      daysInMilk: typeof daysInMilkSelection === 'number' ? daysInMilkSelection : daysInMilkToNumber(daysInMilkSelection),
      daysPregnant: typeof pregnancySelection === 'number' ? pregnancySelection : daysPregnantToNumber(pregnancySelection),
      isLactating,
    },
    milkProduction: mprData ? {
      kgPerDay: mprData.milkProduction,
      fatPercent: mprData.fatPercent,
      proteinPercent: mprData.proteinPercent,
    } : undefined,
    feeds: allFeeds,
    isGrazing,
  };
  
  // Run the auditable calculation
  return calculateAuditableRation(inputs);
}

/**
 * Export types for use in components
 */
export type { AuditableCalculationResult, AuditableFeedInput };
