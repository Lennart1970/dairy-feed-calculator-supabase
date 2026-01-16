/**
 * Dynamic VEM/DVE Requirement Calculator
 * Based on CVB 2025 Standards for Holstein-Friesian Dairy Cows
 * 
 * Calculates requirements dynamically based on:
 * - Parity (lactation number)
 * - Days in Milk (DIM)
 * - Days Pregnant
 * - Live Weight
 * - Milk Production (FPCM)
 */

import {
  VEM_MAINTENANCE_LACTATING,
  VEM_PER_KG_FPCM,
  DVE_MAINTENANCE_BASE,
  DVE_MAINTENANCE_PER_KG_BW,
  DVE_PRODUCTION_LINEAR,
  DVE_PRODUCTION_QUADRATIC,
  DVE_PREGNANCY_LATE,
  calculateMetabolicWeight,
} from './cvbConstants';

export interface DynamicRequirementInputs {
  weightKg: number;           // Live weight in kg
  parity: number;             // Lactation number (1 = first lactation, 2+ = mature)
  daysInMilk: number;         // Days since calving (0-305)
  daysPregnant: number;       // Days pregnant (0-283)
  fpcm: number;               // Fat and Protein Corrected Milk (kg/day)
  isGrazing: boolean;         // Whether cow is grazing
}

export interface DynamicRequirementResult {
  vemTotal: number;           // Total VEM requirement
  dveTotal: number;           // Total DVE requirement (grams)
  breakdown: {
    vem: {
      maintenance: number;
      production: number;
      pregnancy: number;
      growth: number;
      grazing: number;
    };
    dve: {
      maintenance: number;
      production: number;
      pregnancy: number;
      growth: number;
    };
  };
}

// Additional constants specific to dynamic calculations (not in base CVB constants)
const BREED_FACTOR_HF = 1.0;                    // Holstein-Friesian breed coefficient
const VEM_GRAZING_SURCHARGE_PERCENT = 0.30;     // 30% surcharge for grazing (full day)
const VEM_GROWTH_PARITY1 = 625;                 // Growth surcharge for first lactation (VEM)
const VEM_GROWTH_PARITY2 = 325;                 // Growth surcharge for second lactation (VEM)
const DVE_GROWTH_PARITY1 = 64;                  // Growth surcharge for first lactation (grams)
const DVE_GROWTH_PARITY2 = 37;                  // Growth surcharge for second lactation (grams)

/**
 * Calculate VEM maintenance requirement
 * Formula: VEM_MAINTENANCE_LACTATING × MW × BreedFactor (for lactating HF cows)
 */
function calculateVemMaintenance(weightKg: number): number {
  const mw = calculateMetabolicWeight(weightKg);
  return VEM_MAINTENANCE_LACTATING * mw * BREED_FACTOR_HF;
}

/**
 * Calculate VEM production requirement
 * Formula: VEM_PER_KG_FPCM × FPCM
 */
function calculateVemProduction(fpcm: number): number {
  return VEM_PER_KG_FPCM * fpcm;
}

/**
 * Calculate VEM pregnancy surcharge
 * Exponential curve based on days pregnant
 * Significant after ~190 days
 */
function calculateVemPregnancy(daysPregnant: number): number {
  if (daysPregnant < 190) return 0;
  
  // Exponential formula from CVB 2025
  // Approximation: increases from 0 at day 190 to ~2000 VEM at day 283
  const daysAfter190 = daysPregnant - 190;
  const pregnancyVem = Math.pow(daysAfter190 / 93, 2) * 2000;
  
  return Math.round(pregnancyVem);
}

/**
 * Calculate VEM growth surcharge
 * Only for parity 1 and 2 cows still growing
 */
function calculateVemGrowth(parity: number, daysInMilk: number): number {
  // Growth surcharge only applies in early lactation (first 100 days)
  if (daysInMilk > 100) return 0;
  
  if (parity === 1) return VEM_GROWTH_PARITY1;
  if (parity === 2) return VEM_GROWTH_PARITY2;
  
  return 0; // No growth surcharge for parity 3+
}

/**
 * Calculate VEM grazing surcharge
 * 30% of (maintenance + production) for full-day grazing
 */
function calculateVemGrazing(maintenance: number, production: number, isGrazing: boolean): number {
  if (!isGrazing) return 0;
  
  return Math.round((maintenance + production) * VEM_GRAZING_SURCHARGE_PERCENT);
}

/**
 * Calculate DVE maintenance requirement
 * Formula: DVE_MAINTENANCE_BASE + (DVE_MAINTENANCE_PER_KG_BW × LW)
 */
function calculateDveMaintenance(weightKg: number): number {
  return DVE_MAINTENANCE_BASE + (DVE_MAINTENANCE_PER_KG_BW * weightKg);
}

/**
 * Calculate DVE production requirement
 * Formula: DVE_PRODUCTION_LINEAR × ProteinYield + DVE_PRODUCTION_QUADRATIC × ProteinYield²
 * Where ProteinYield = Milk × Protein% × 10
 * 
 * Note: We use FPCM × 3.4% as approximation for protein yield
 */
function calculateDveProduction(fpcm: number, proteinPercent: number = 3.4): number {
  const proteinYield = fpcm * proteinPercent * 10;
  const dveProduction = (DVE_PRODUCTION_LINEAR * proteinYield) + 
                        (DVE_PRODUCTION_QUADRATIC * Math.pow(proteinYield, 2));
  
  return Math.round(dveProduction);
}

/**
 * Calculate DVE pregnancy surcharge
 * Fixed DVE_PREGNANCY_LATE for late pregnancy (after 190 days)
 */
function calculateDvePregnancy(daysPregnant: number): number {
  if (daysPregnant < 190) return 0;
  return DVE_PREGNANCY_LATE;
}

/**
 * Calculate DVE growth surcharge
 * Only for parity 1 and 2 cows still growing
 */
function calculateDveGrowth(parity: number, daysInMilk: number): number {
  // Growth surcharge only applies in early lactation (first 100 days)
  if (daysInMilk > 100) return 0;
  
  if (parity === 1) return DVE_GROWTH_PARITY1;
  if (parity === 2) return DVE_GROWTH_PARITY2;
  
  return 0; // No growth surcharge for parity 3+
}

/**
 * Calculate complete dynamic requirements
 * Returns total VEM and DVE with detailed breakdown
 */
export function calculateDynamicRequirements(inputs: DynamicRequirementInputs): DynamicRequirementResult {
  // VEM components
  const vemMaintenance = Math.round(calculateVemMaintenance(inputs.weightKg));
  const vemProduction = Math.round(calculateVemProduction(inputs.fpcm));
  const vemPregnancy = calculateVemPregnancy(inputs.daysPregnant);
  const vemGrowth = calculateVemGrowth(inputs.parity, inputs.daysInMilk);
  const vemGrazing = calculateVemGrazing(vemMaintenance, vemProduction, inputs.isGrazing);
  
  const vemTotal = vemMaintenance + vemProduction + vemPregnancy + vemGrowth + vemGrazing;
  
  // DVE components
  const dveMaintenance = Math.round(calculateDveMaintenance(inputs.weightKg));
  const dveProduction = calculateDveProduction(inputs.fpcm);
  const dvePregnancy = calculateDvePregnancy(inputs.daysPregnant);
  const dveGrowth = calculateDveGrowth(inputs.parity, inputs.daysInMilk);
  
  const dveTotal = dveMaintenance + dveProduction + dvePregnancy + dveGrowth;
  
  return {
    vemTotal: Math.round(vemTotal),
    dveTotal: Math.round(dveTotal),
    breakdown: {
      vem: {
        maintenance: vemMaintenance,
        production: vemProduction,
        pregnancy: vemPregnancy,
        growth: vemGrowth,
        grazing: vemGrazing,
      },
      dve: {
        maintenance: dveMaintenance,
        production: dveProduction,
        pregnancy: dvePregnancy,
        growth: dveGrowth,
      },
    },
  };
}

/**
 * Get human-readable explanation of requirement components
 */
export function explainRequirements(result: DynamicRequirementResult): string[] {
  const explanations: string[] = [];
  
  // VEM breakdown
  explanations.push(`VEM Onderhoud: ${result.breakdown.vem.maintenance.toLocaleString()} (basis metabolisme)`);
  explanations.push(`VEM Productie: ${result.breakdown.vem.production.toLocaleString()} (melkproductie)`);
  
  if (result.breakdown.vem.pregnancy > 0) {
    explanations.push(`VEM Dracht: ${result.breakdown.vem.pregnancy.toLocaleString()} (late dracht)`);
  }
  
  if (result.breakdown.vem.growth > 0) {
    explanations.push(`VEM Groei: ${result.breakdown.vem.growth.toLocaleString()} (jonge koe nog in groei)`);
  }
  
  if (result.breakdown.vem.grazing > 0) {
    explanations.push(`VEM Beweiding: ${result.breakdown.vem.grazing.toLocaleString()} (beweidingstoeslag)`);
  }
  
  explanations.push(`\nTotaal VEM: ${result.vemTotal.toLocaleString()}`);
  
  // DVE breakdown
  explanations.push(`\nDVE Onderhoud: ${result.breakdown.dve.maintenance}g (basis metabolisme)`);
  explanations.push(`DVE Productie: ${result.breakdown.dve.production}g (melkproductie)`);
  
  if (result.breakdown.dve.pregnancy > 0) {
    explanations.push(`DVE Dracht: ${result.breakdown.dve.pregnancy}g (late dracht)`);
  }
  
  if (result.breakdown.dve.growth > 0) {
    explanations.push(`DVE Groei: ${result.breakdown.dve.growth}g (jonge koe nog in groei)`);
  }
  
  explanations.push(`\nTotaal DVE: ${result.dveTotal}g`);
  
  return explanations;
}
