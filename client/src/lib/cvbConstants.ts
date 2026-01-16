/**
 * CVB 2025 Constants - Single Source of Truth
 * 
 * All nutritional calculation constants based on CVB (Centraal Veevoederbureau) 2025 standards.
 * This file is the ONLY place where these values should be defined.
 * 
 * References:
 * - CVB Veevoedertabel 2025
 * - CVB Documentation Report 79 - Actualisatie Energiebehoefte Melkkoeien
 * - CVB Documentation Report 80 - Eiwitbehoefte Melkkoeien
 */

// ============================================
// VEM (Voeder Eenheid Melk) Requirements
// ============================================

/**
 * VEM maintenance requirement coefficient for lactating cows
 * Formula: VEM_onderhoud = VEM_MAINTENANCE_LACTATING × BW^0.75
 * Source: CVB 2025, Table 3.1
 */
export const VEM_MAINTENANCE_LACTATING = 53.0;

/**
 * VEM maintenance requirement coefficient for dry cows
 * Formula: VEM_onderhoud = VEM_MAINTENANCE_DRY × BW^0.75
 * Source: CVB 2025, Table 3.1
 */
export const VEM_MAINTENANCE_DRY = 42.4;

/**
 * VEM requirement per kg FPCM (Fat and Protein Corrected Milk)
 * Formula: VEM_productie = VEM_PER_KG_FPCM × FPCM
 * Source: CVB 2025, Table 3.2
 */
export const VEM_PER_KG_FPCM = 390;

/**
 * VEM requirement for pregnancy (late gestation)
 * Per day during last 100 days of pregnancy
 * Source: CVB 2025, Table 3.3
 */
export const VEM_PREGNANCY_LATE = 450;

/**
 * VEM requirement for growth (young animals)
 * Per kg body weight gain
 * Source: CVB 2025, Table 3.4
 */
export const VEM_PER_KG_GROWTH = 3100;

/**
 * VEM requirement for grazing activity
 * Additional VEM per day when grazing
 * Source: CVB 2025, Table 3.5
 */
export const VEM_GRAZING_ACTIVITY = 500;

// ============================================
// DVE (Darm Verteerbaar Eiwit) Requirements
// ============================================

/**
 * DVE maintenance requirement - base constant
 * Formula: DVE_onderhoud = DVE_MAINTENANCE_BASE + DVE_MAINTENANCE_PER_KG_BW × BW
 * Source: CVB 2025, Table 4.1
 */
export const DVE_MAINTENANCE_BASE = 54;

/**
 * DVE maintenance requirement - per kg body weight
 * Source: CVB 2025, Table 4.1
 */
export const DVE_MAINTENANCE_PER_KG_BW = 0.1;

/**
 * DVE production requirement - linear coefficient
 * Formula: DVE_productie = DVE_PRODUCTION_LINEAR × ProteinYield + DVE_PRODUCTION_QUADRATIC × ProteinYield²
 * Source: CVB 2025, Table 4.2
 */
export const DVE_PRODUCTION_LINEAR = 1.396;

/**
 * DVE production requirement - quadratic coefficient
 * Source: CVB 2025, Table 4.2
 */
export const DVE_PRODUCTION_QUADRATIC = 0.000195;

/**
 * DVE requirement for pregnancy (late gestation)
 * Per day during last 100 days of pregnancy
 * Source: CVB 2025, Table 4.3
 */
export const DVE_PREGNANCY_LATE = 150;

/**
 * DVE requirement for growth (young animals)
 * Per kg body weight gain
 * Source: CVB 2025, Table 4.4
 */
export const DVE_PER_KG_GROWTH = 300;

// ============================================
// FPCM Calculation Constants
// ============================================

/**
 * Standard fat percentage for FPCM calculation
 * Source: CVB 2025
 */
export const STANDARD_FAT_PERCENT = 4.0;

/**
 * Standard protein percentage for FPCM calculation
 * Source: CVB 2025
 */
export const STANDARD_PROTEIN_PERCENT = 3.3;

/**
 * FPCM formula coefficients
 * FPCM = milk × (0.337 + 0.116 × fat% + 0.06 × protein%)
 * Source: CVB 2025
 */
export const FPCM_BASE_COEFFICIENT = 0.337;
export const FPCM_FAT_COEFFICIENT = 0.116;
export const FPCM_PROTEIN_COEFFICIENT = 0.06;

// ============================================
// VOC (Voeropnamecapaciteit) Constants
// ============================================

/**
 * VOC base capacity for mature cows
 * Source: CVB 2025, Table 5.1
 */
export const VOC_BASE_MATURE = 12.0;

/**
 * VOC increase per kg milk production
 * Source: CVB 2025, Table 5.1
 */
export const VOC_PER_KG_MILK = 0.32;

/**
 * VOC reduction factor for first lactation heifers
 * Source: CVB 2025, Table 5.2
 */
export const VOC_HEIFER_FACTOR = 0.85;

/**
 * VOC reduction during early lactation (first 60 days)
 * Source: CVB 2025, Table 5.3
 */
export const VOC_EARLY_LACTATION_REDUCTION = 0.90;

// ============================================
// Structure Value (SW) Thresholds
// ============================================

/**
 * Minimum structure value per kg dry matter for healthy rumen function
 * Source: CVB 2025, Table 6.1
 */
export const SW_MINIMUM_PER_KG_DS = 0.9;

/**
 * Optimal structure value per kg dry matter
 * Source: CVB 2025, Table 6.1
 */
export const SW_OPTIMAL_PER_KG_DS = 1.0;

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate metabolic body weight (BW^0.75)
 */
export function calculateMetabolicWeight(bodyWeightKg: number): number {
  return Math.pow(bodyWeightKg, 0.75);
}

/**
 * Calculate FPCM from milk yield, fat%, and protein%
 */
export function calculateFPCM(
  milkKg: number,
  fatPercent: number,
  proteinPercent: number
): number {
  return milkKg * (FPCM_BASE_COEFFICIENT + FPCM_FAT_COEFFICIENT * fatPercent + FPCM_PROTEIN_COEFFICIENT * proteinPercent);
}

/**
 * Calculate VEM maintenance requirement
 */
export function calculateVemMaintenance(bodyWeightKg: number, isLactating: boolean = true): number {
  const coefficient = isLactating ? VEM_MAINTENANCE_LACTATING : VEM_MAINTENANCE_DRY;
  return coefficient * calculateMetabolicWeight(bodyWeightKg);
}

/**
 * Calculate VEM production requirement
 */
export function calculateVemProduction(fpcmKg: number): number {
  return VEM_PER_KG_FPCM * fpcmKg;
}

/**
 * Calculate DVE maintenance requirement
 */
export function calculateDveMaintenance(bodyWeightKg: number): number {
  return DVE_MAINTENANCE_BASE + DVE_MAINTENANCE_PER_KG_BW * bodyWeightKg;
}

/**
 * Calculate DVE production requirement
 */
export function calculateDveProduction(proteinYieldGrams: number): number {
  return DVE_PRODUCTION_LINEAR * proteinYieldGrams + DVE_PRODUCTION_QUADRATIC * Math.pow(proteinYieldGrams, 2);
}

// ============================================
// Grouped Export for Convenience
// ============================================

export const CVB_CONSTANTS = {
  // VEM
  VEM_MAINTENANCE_LACTATING,
  VEM_MAINTENANCE_DRY,
  VEM_PER_KG_FPCM,
  VEM_PREGNANCY_LATE,
  VEM_PER_KG_GROWTH,
  VEM_GRAZING_ACTIVITY,
  
  // DVE
  DVE_MAINTENANCE_BASE,
  DVE_MAINTENANCE_PER_KG_BW,
  DVE_PRODUCTION_LINEAR,
  DVE_PRODUCTION_QUADRATIC,
  DVE_PREGNANCY_LATE,
  DVE_PER_KG_GROWTH,
  
  // FPCM
  STANDARD_FAT_PERCENT,
  STANDARD_PROTEIN_PERCENT,
  FPCM_BASE_COEFFICIENT,
  FPCM_FAT_COEFFICIENT,
  FPCM_PROTEIN_COEFFICIENT,
  
  // VOC
  VOC_BASE_MATURE,
  VOC_PER_KG_MILK,
  VOC_HEIFER_FACTOR,
  VOC_EARLY_LACTATION_REDUCTION,
  
  // SW
  SW_MINIMUM_PER_KG_DS,
  SW_OPTIMAL_PER_KG_DS,
} as const;
