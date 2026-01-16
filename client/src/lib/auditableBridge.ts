/**
 * Bridge between existing calculator state and the new Auditable Calculator
 * 
 * This module converts the current application state into the format
 * required by the auditable calculation engine.
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
  sw?: number;  // Structure value per kg DS
  vw?: number;  // Filling value per kg DS
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
  swPerKgDs?: number;
  vwPerKgDs?: number;
}

interface MprData {
  milkProduction: number;
  fatPercent: number;
  proteinPercent: number;
  ureum?: number;
}

interface AnimalProfile {
  name: string;
  weightKg: number;
  parity: number;
  daysInMilk: number;
  daysPregnant: number;
}

// Default SW and VW values for common feed types (CVB 2022/2025)
const DEFAULT_FEED_VALUES: Record<string, { sw: number; vw: number }> = {
  // Roughage
  'kuil_1_gras': { sw: 1.05, vw: 1.10 },
  'kuil_2_gras': { sw: 1.05, vw: 1.10 },
  'mais_2025': { sw: 0.75, vw: 0.85 },
  'gras_silage': { sw: 1.05, vw: 1.10 },
  'mais_silage': { sw: 0.75, vw: 0.85 },
  'hooi': { sw: 1.20, vw: 1.30 },
  
  // Concentrates (values from CVB Veevoedertabel 2025 / database)
  'bierborstel': { sw: 0.15, vw: 0.45 },
  'gerstmeel': { sw: 0.50, vw: 0.40 },
  'raapzaadschroot': { sw: 0.40, vw: 0.32 },
  'stalbrok': { sw: 0.45, vw: 0.38 },
  'startbrok': { sw: 0.40, vw: 0.35 },
  
  // Defaults
  'roughage': { sw: 1.00, vw: 1.00 },
  'concentrate': { sw: 0.10, vw: 0.40 },
};

function getFeedValues(feedName: string, isRoughage: boolean): { sw: number; vw: number } {
  const lowerName = feedName.toLowerCase();
  
  // Check for exact match
  if (DEFAULT_FEED_VALUES[lowerName]) {
    return DEFAULT_FEED_VALUES[lowerName];
  }
  
  // Check for partial matches
  if (lowerName.includes('gras') || lowerName.includes('grass')) {
    return DEFAULT_FEED_VALUES['gras_silage'];
  }
  if (lowerName.includes('mais') || lowerName.includes('maize') || lowerName.includes('corn')) {
    return DEFAULT_FEED_VALUES['mais_silage'];
  }
  if (lowerName.includes('hooi') || lowerName.includes('hay')) {
    return DEFAULT_FEED_VALUES['hooi'];
  }
  
  // Return defaults based on feed type
  return isRoughage ? DEFAULT_FEED_VALUES['roughage'] : DEFAULT_FEED_VALUES['concentrate'];
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
 */
export function runAuditableCalculation(
  roughageFeeds: RoughageEntry[],
  concentrateFeeds: ConcentrateFeed[],
  concentrateFeedInputs: Record<string, ConcentrateFeedInput>,
  animalProfile: {
    name: string;
    weightKg: number;
  },
  paritySelection?: string,
  daysInMilkSelection?: string,
  pregnancySelection?: string,
  mprData?: MprData | null,
  isGrazing: boolean = false
): AuditableCalculationResult {
  
  // Convert roughage feeds to auditable format
  const auditableRoughageFeeds: AuditableFeedInput[] = roughageFeeds
    .filter(f => f.amount > 0)
    .map(f => {
      const { sw, vw } = getFeedValues(f.name, true);
      return {
        name: f.name,
        displayName: f.displayName,
        amountKg: f.amount,
        dsPercent: f.dsPercent,
        basis: 'per kg DS' as const,
        vemPerUnit: f.vem,
        dvePerUnit: f.dve,
        oebPerUnit: f.oeb,
        swPerKgDs: f.sw || sw,
        vwPerKgDs: f.vw || vw,
      };
    });
  
  // Convert concentrate feeds to auditable format
  const auditableConcentrateFeeds: AuditableFeedInput[] = concentrateFeeds
    .filter(f => {
      const input = concentrateFeedInputs[f.name];
      return input && input.amountKg > 0;
    })
    .map(f => {
      const input = concentrateFeedInputs[f.name];
      const { sw, vw } = getFeedValues(f.name, false);
      return {
        name: f.name,
        displayName: f.displayName,
        amountKg: input.amountKg,
        dsPercent: input.dsPercent || f.defaultDsPercent,
        basis: f.basis as 'per kg DS' | 'per kg product',
        vemPerUnit: f.vemPerUnit,
        dvePerUnit: f.dvePerUnit,
        oebPerUnit: f.oebPerUnit,
        swPerKgDs: f.swPerKgDs || sw,
        vwPerKgDs: f.vwPerKgDs || vw,
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
      parity: parityToNumber(paritySelection),
      daysInMilk: daysInMilkToNumber(daysInMilkSelection),
      daysPregnant: daysPregnantToNumber(pregnancySelection),
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
