/**
 * Two-Tier PMR System Implementation
 * 
 * Based on CVB 2025 Standards and Dutch professional feed advisor practice.
 * 
 * The Three-Step Workflow:
 * 1. Lab Reports: Get "Echte Waarde" (True Value) from actual lab analysis
 * 2. Base Mix: Mix roughage for Safe Base Level (Maintenance + 20-24 kg milk)
 * 3. Gap Analysis: Calculate concentrate top-up per herd group with substitution
 * 
 * Critical Constraint: Substitution (Verdringing)
 * - For every 1 kg of concentrate fed, the cow eats 0.45 kg LESS roughage
 * - Must verify SW ≥ 1.0 after substitution to prevent acidosis
 */

// CVB 2025 Constants
export const CVB_CONSTANTS = {
  VEM_PER_KG_MILK: 442,           // VEM needed per kg FPCM
  VEM_MAINTENANCE_FACTOR: 42.4,   // VEM per kg^0.75 body weight
  DVE_PER_KG_MILK: 1.5,           // g DVE per g milk protein
  DVE_MAINTENANCE_BASE: 54,       // Base DVE for maintenance
  DVE_MAINTENANCE_FACTOR: 0.1,    // Additional DVE per kg body weight
  SUBSTITUTION_RATE: 0.45,        // kg roughage displaced per kg concentrate
  MIN_SW_THRESHOLD: 1.0,          // Minimum SW per kg DS (acidosis threshold)
  SAFE_SW_THRESHOLD: 1.2,         // Recommended SW per kg DS (safety margin)
  DEFAULT_ROUGHAGE_INTAKE: 15,    // Default kg DS roughage intake
};

export interface BaseRationDensity {
  vemPerKgDs: number;
  dvePerKgDs: number;
  oebPerKgDs: number;
  swPerKgDs: number;
  vwPerKgDs: number;
}

export interface GroupRequirements {
  vemPerCow: number;
  dvePerCow: number;
  oebPerCow: number;
}

export interface ConcentrateDensity {
  vem: number;      // VEM per kg DS
  dve: number;      // g DVE per kg DS
  sw: number;       // SW per kg DS (usually 0 for concentrate)
  pricePerTon: number;  // € per ton DS
}

// Default concentrate (Productiebrok)
export const DEFAULT_CONCENTRATE: ConcentrateDensity = {
  vem: 1000,
  dve: 100,
  sw: 0,
  pricePerTon: 350,
};

/**
 * Calculate the milk support level of a base ration
 * This is the "Safe Base Level" - typically Maintenance + 20-24 kg milk
 */
export function calculateBaseMilkSupport(
  baseRationDensity: BaseRationDensity,
  roughageIntakeKgDs: number = CVB_CONSTANTS.DEFAULT_ROUGHAGE_INTAKE,
  cowWeightKg: number = 650
): {
  totalVem: number;
  totalDve: number;
  totalSw: number;
  maintenanceVem: number;
  maintenanceDve: number;
  productionVem: number;
  productionDve: number;
  milkSupportKg: number;
  swPerKgDs: number;
  isSwSafe: boolean;
  swStatus: 'safe' | 'warning' | 'danger';
} {
  // Calculate total nutrients from base ration
  const totalVem = baseRationDensity.vemPerKgDs * roughageIntakeKgDs;
  const totalDve = baseRationDensity.dvePerKgDs * roughageIntakeKgDs;
  const totalSw = baseRationDensity.swPerKgDs * roughageIntakeKgDs;
  
  // Calculate maintenance requirements
  const maintenanceVem = CVB_CONSTANTS.VEM_MAINTENANCE_FACTOR * Math.pow(cowWeightKg, 0.75);
  const maintenanceDve = CVB_CONSTANTS.DVE_MAINTENANCE_BASE + (CVB_CONSTANTS.DVE_MAINTENANCE_FACTOR * cowWeightKg);
  
  // Calculate production nutrients (what's left after maintenance)
  const productionVem = Math.max(0, totalVem - maintenanceVem);
  const productionDve = Math.max(0, totalDve - maintenanceDve);
  
  // Calculate milk support (based on VEM, which is usually limiting)
  const milkSupportKg = productionVem / CVB_CONSTANTS.VEM_PER_KG_MILK;
  
  // Calculate SW per kg DS
  const swPerKgDs = totalSw / roughageIntakeKgDs;
  
  // Determine SW safety status
  let swStatus: 'safe' | 'warning' | 'danger' = 'safe';
  if (swPerKgDs < CVB_CONSTANTS.MIN_SW_THRESHOLD) {
    swStatus = 'danger';
  } else if (swPerKgDs < CVB_CONSTANTS.SAFE_SW_THRESHOLD) {
    swStatus = 'warning';
  }
  
  return {
    totalVem: Math.round(totalVem),
    totalDve: Math.round(totalDve),
    totalSw: Math.round(totalSw * 10) / 10,
    maintenanceVem: Math.round(maintenanceVem),
    maintenanceDve: Math.round(maintenanceDve),
    productionVem: Math.round(productionVem),
    productionDve: Math.round(productionDve),
    milkSupportKg: Math.round(milkSupportKg * 10) / 10,
    swPerKgDs: Math.round(swPerKgDs * 100) / 100,
    isSwSafe: swPerKgDs >= CVB_CONSTANTS.MIN_SW_THRESHOLD,
    swStatus,
  };
}

export interface GapAnalysisResult {
  // Base ration contribution (before substitution)
  baseRationIntakeKgDs: number;
  baseRationVem: number;
  baseRationDve: number;
  baseRationOeb: number;
  baseRationSw: number;
  
  // Milk support from base ration
  baseMilkSupportKg: number;
  
  // Group target
  targetMilkKg: number;
  
  // Gap (what's missing)
  gapMilkKg: number;
  gapVem: number;
  gapDve: number;
  gapOeb: number;
  
  // Concentrate recommendation
  concentrateKgDs: number;
  concentrateVem: number;
  concentrateDve: number;
  concentrateSw: number;
  
  // Substitution effect (CRITICAL!)
  roughageDisplacementKgDs: number;
  adjustedRoughageIntakeKgDs: number;
  adjustedRoughageVem: number;
  adjustedRoughageDve: number;
  adjustedRoughageSw: number;
  
  // Final totals (after substitution)
  finalTotalIntakeKgDs: number;
  finalTotalVem: number;
  finalTotalDve: number;
  finalTotalSw: number;
  finalSwPerKgDs: number;
  
  // SW Safety Check (CRITICAL!)
  isSwSafe: boolean;
  swStatus: 'safe' | 'warning' | 'danger';
  swDeficit: number;  // How much SW is missing to reach safe threshold
  
  // Status
  isDeficit: boolean;
  limitingNutrient: 'VEM' | 'DVE' | 'OEB' | 'none';
  
  // Recommendations
  acidosisRisk: boolean;
  acidosisWarning: string | null;
  adjustmentSuggestion: string | null;
}

/**
 * Calculate the gap between base ration supply and group requirements
 * Implements full Two-Tier PMR System with substitution and SW verification
 */
export function calculateGap(
  baseRationDensity: BaseRationDensity | null,
  groupRequirements: GroupRequirements,
  baseRationIntakeKgDs: number = CVB_CONSTANTS.DEFAULT_ROUGHAGE_INTAKE,
  concentrateDensity: ConcentrateDensity = DEFAULT_CONCENTRATE,
  targetMilkKg: number = 0,  // 0 = calculate from requirements
  cowWeightKg: number = 650
): GapAnalysisResult {
  // If no base ration, entire requirement is a gap
  if (!baseRationDensity) {
    const concentrateNeeded = groupRequirements.vemPerCow / concentrateDensity.vem;
    return createEmptyGapResult(groupRequirements, concentrateNeeded, concentrateDensity);
  }

  // Step 1: Calculate base ration contribution
  const baseRationVem = baseRationDensity.vemPerKgDs * baseRationIntakeKgDs;
  const baseRationDve = baseRationDensity.dvePerKgDs * baseRationIntakeKgDs;
  const baseRationOeb = baseRationDensity.oebPerKgDs * baseRationIntakeKgDs;
  const baseRationSw = baseRationDensity.swPerKgDs * baseRationIntakeKgDs;
  
  // Step 2: Calculate milk support from base ration
  const maintenanceVem = CVB_CONSTANTS.VEM_MAINTENANCE_FACTOR * Math.pow(cowWeightKg, 0.75);
  const productionVem = Math.max(0, baseRationVem - maintenanceVem);
  const baseMilkSupportKg = productionVem / CVB_CONSTANTS.VEM_PER_KG_MILK;
  
  // Determine target milk (from requirements or explicit target)
  const actualTargetMilk = targetMilkKg > 0 
    ? targetMilkKg 
    : (groupRequirements.vemPerCow - maintenanceVem) / CVB_CONSTANTS.VEM_PER_KG_MILK;
  
  // Step 3: Calculate gap
  const gapMilkKg = Math.max(0, actualTargetMilk - baseMilkSupportKg);
  const gapVem = Math.max(0, groupRequirements.vemPerCow - baseRationVem);
  const gapDve = Math.max(0, groupRequirements.dvePerCow - baseRationDve);
  const gapOeb = Math.max(0, groupRequirements.oebPerCow - baseRationOeb);
  
  // Determine limiting nutrient
  let limitingNutrient: 'VEM' | 'DVE' | 'OEB' | 'none' = 'none';
  if (gapVem > 0 || gapDve > 0 || gapOeb > 0) {
    const concentrateForVem = gapVem / concentrateDensity.vem;
    const concentrateForDve = gapDve / concentrateDensity.dve;
    limitingNutrient = concentrateForVem >= concentrateForDve ? 'VEM' : 'DVE';
  }
  
  // Step 4: Calculate concentrate needed (based on limiting nutrient)
  let concentrateKgDs = 0;
  if (limitingNutrient === 'VEM') {
    concentrateKgDs = gapVem / concentrateDensity.vem;
  } else if (limitingNutrient === 'DVE') {
    concentrateKgDs = gapDve / concentrateDensity.dve;
  }
  concentrateKgDs = Math.round(concentrateKgDs * 10) / 10;
  
  // Calculate concentrate contribution
  const concentrateVem = concentrateKgDs * concentrateDensity.vem;
  const concentrateDve = concentrateKgDs * concentrateDensity.dve;
  const concentrateSw = concentrateKgDs * concentrateDensity.sw;
  
  // Step 5: Apply Substitution (CRITICAL!)
  // For every 1 kg concentrate, cow eats 0.45 kg LESS roughage
  const roughageDisplacementKgDs = concentrateKgDs * CVB_CONSTANTS.SUBSTITUTION_RATE;
  const adjustedRoughageIntakeKgDs = Math.max(0, baseRationIntakeKgDs - roughageDisplacementKgDs);
  
  // Recalculate roughage contribution after substitution
  const adjustedRoughageVem = baseRationDensity.vemPerKgDs * adjustedRoughageIntakeKgDs;
  const adjustedRoughageDve = baseRationDensity.dvePerKgDs * adjustedRoughageIntakeKgDs;
  const adjustedRoughageSw = baseRationDensity.swPerKgDs * adjustedRoughageIntakeKgDs;
  
  // Step 6: Calculate final totals (after substitution)
  const finalTotalIntakeKgDs = adjustedRoughageIntakeKgDs + concentrateKgDs;
  const finalTotalVem = adjustedRoughageVem + concentrateVem;
  const finalTotalDve = adjustedRoughageDve + concentrateDve;
  const finalTotalSw = adjustedRoughageSw + concentrateSw;
  
  // Step 7: Verify SW Safety (CRITICAL!)
  const finalSwPerKgDs = finalTotalIntakeKgDs > 0 ? finalTotalSw / finalTotalIntakeKgDs : 0;
  
  let swStatus: 'safe' | 'warning' | 'danger' = 'safe';
  let acidosisRisk = false;
  let acidosisWarning: string | null = null;
  let adjustmentSuggestion: string | null = null;
  
  if (finalSwPerKgDs < CVB_CONSTANTS.MIN_SW_THRESHOLD) {
    swStatus = 'danger';
    acidosisRisk = true;
    acidosisWarning = `ACIDOSE RISICO! SW = ${finalSwPerKgDs.toFixed(2)} (minimum: ${CVB_CONSTANTS.MIN_SW_THRESHOLD})`;
    adjustmentSuggestion = 'Verminder krachtvoer, voeg stro toe, of verhoog gras in basismix';
  } else if (finalSwPerKgDs < CVB_CONSTANTS.SAFE_SW_THRESHOLD) {
    swStatus = 'warning';
    acidosisWarning = `Let op: SW = ${finalSwPerKgDs.toFixed(2)} (aanbevolen: ≥${CVB_CONSTANTS.SAFE_SW_THRESHOLD})`;
    adjustmentSuggestion = 'Overweeg meer structuurrijk ruwvoer in basismix';
  }
  
  const swDeficit = Math.max(0, CVB_CONSTANTS.SAFE_SW_THRESHOLD - finalSwPerKgDs);
  
  return {
    // Base ration
    baseRationIntakeKgDs,
    baseRationVem: Math.round(baseRationVem),
    baseRationDve: Math.round(baseRationDve),
    baseRationOeb: Math.round(baseRationOeb),
    baseRationSw: Math.round(baseRationSw * 10) / 10,
    
    // Milk support
    baseMilkSupportKg: Math.round(baseMilkSupportKg * 10) / 10,
    targetMilkKg: Math.round(actualTargetMilk * 10) / 10,
    
    // Gap
    gapMilkKg: Math.round(gapMilkKg * 10) / 10,
    gapVem: Math.round(gapVem),
    gapDve: Math.round(gapDve),
    gapOeb: Math.round(gapOeb),
    
    // Concentrate
    concentrateKgDs,
    concentrateVem: Math.round(concentrateVem),
    concentrateDve: Math.round(concentrateDve),
    concentrateSw: Math.round(concentrateSw * 10) / 10,
    
    // Substitution
    roughageDisplacementKgDs: Math.round(roughageDisplacementKgDs * 10) / 10,
    adjustedRoughageIntakeKgDs: Math.round(adjustedRoughageIntakeKgDs * 10) / 10,
    adjustedRoughageVem: Math.round(adjustedRoughageVem),
    adjustedRoughageDve: Math.round(adjustedRoughageDve),
    adjustedRoughageSw: Math.round(adjustedRoughageSw * 10) / 10,
    
    // Final totals
    finalTotalIntakeKgDs: Math.round(finalTotalIntakeKgDs * 10) / 10,
    finalTotalVem: Math.round(finalTotalVem),
    finalTotalDve: Math.round(finalTotalDve),
    finalTotalSw: Math.round(finalTotalSw * 10) / 10,
    finalSwPerKgDs: Math.round(finalSwPerKgDs * 100) / 100,
    
    // SW Safety
    isSwSafe: finalSwPerKgDs >= CVB_CONSTANTS.MIN_SW_THRESHOLD,
    swStatus,
    swDeficit: Math.round(swDeficit * 100) / 100,
    
    // Status
    isDeficit: gapVem > 0 || gapDve > 0,
    limitingNutrient,
    
    // Recommendations
    acidosisRisk,
    acidosisWarning,
    adjustmentSuggestion,
  };
}

/**
 * Create empty gap result when no base ration is available
 */
function createEmptyGapResult(
  groupRequirements: GroupRequirements,
  concentrateNeeded: number,
  concentrateDensity: ConcentrateDensity
): GapAnalysisResult {
  return {
    baseRationIntakeKgDs: 0,
    baseRationVem: 0,
    baseRationDve: 0,
    baseRationOeb: 0,
    baseRationSw: 0,
    baseMilkSupportKg: 0,
    targetMilkKg: 0,
    gapMilkKg: 0,
    gapVem: groupRequirements.vemPerCow,
    gapDve: groupRequirements.dvePerCow,
    gapOeb: groupRequirements.oebPerCow,
    concentrateKgDs: Math.round(concentrateNeeded * 10) / 10,
    concentrateVem: Math.round(concentrateNeeded * concentrateDensity.vem),
    concentrateDve: Math.round(concentrateNeeded * concentrateDensity.dve),
    concentrateSw: 0,
    roughageDisplacementKgDs: 0,
    adjustedRoughageIntakeKgDs: 0,
    adjustedRoughageVem: 0,
    adjustedRoughageDve: 0,
    adjustedRoughageSw: 0,
    finalTotalIntakeKgDs: Math.round(concentrateNeeded * 10) / 10,
    finalTotalVem: Math.round(concentrateNeeded * concentrateDensity.vem),
    finalTotalDve: Math.round(concentrateNeeded * concentrateDensity.dve),
    finalTotalSw: 0,
    finalSwPerKgDs: 0,
    isSwSafe: false,
    swStatus: 'danger',
    swDeficit: CVB_CONSTANTS.SAFE_SW_THRESHOLD,
    isDeficit: true,
    limitingNutrient: 'VEM',
    acidosisRisk: true,
    acidosisWarning: 'Geen basisrantsoen! Alleen krachtvoer is niet veilig.',
    adjustmentSuggestion: 'Maak eerst een basisrantsoen met ruwvoer aan.',
  };
}

/**
 * Calculate milk equivalent of a nutrient gap
 */
export function gapToMilkEquivalent(gapVem: number): number {
  return Math.round((gapVem / CVB_CONSTANTS.VEM_PER_KG_MILK) * 10) / 10;
}

/**
 * Format gap analysis for display
 */
export function formatGapAnalysis(gap: GapAnalysisResult): {
  summary: string;
  recommendation: string;
  warning: string | null;
  substitutionNote: string | null;
  swNote: string | null;
} {
  if (!gap.isDeficit) {
    return {
      summary: 'Basisrantsoen voldoet aan behoefte',
      recommendation: 'Geen krachtvoer nodig',
      warning: null,
      substitutionNote: null,
      swNote: gap.swStatus === 'safe' 
        ? `SW ${gap.finalSwPerKgDs} ✓ (veilig)` 
        : `SW ${gap.finalSwPerKgDs} ⚠️ (let op)`,
    };
  }

  const milkGap = gap.gapMilkKg;
  
  let summary = `Tekort: ${gap.gapVem} VEM, ${gap.gapDve}g DVE`;
  if (milkGap > 0) {
    summary += ` (≈ ${milkGap} kg melk)`;
  }

  const recommendation = `Advies: ${gap.concentrateKgDs} kg krachtvoer per koe`;

  let warning: string | null = null;
  if (gap.acidosisRisk) {
    warning = gap.acidosisWarning;
  }

  let substitutionNote: string | null = null;
  if (gap.roughageDisplacementKgDs > 0) {
    substitutionNote = `Verdringing: ${gap.roughageDisplacementKgDs} kg ruwvoer wordt verdrongen`;
  }

  let swNote: string | null = null;
  if (gap.swStatus === 'danger') {
    swNote = `⚠️ SW ${gap.finalSwPerKgDs} < ${CVB_CONSTANTS.MIN_SW_THRESHOLD} - ACIDOSE RISICO!`;
  } else if (gap.swStatus === 'warning') {
    swNote = `⚡ SW ${gap.finalSwPerKgDs} < ${CVB_CONSTANTS.SAFE_SW_THRESHOLD} - Let op structuur`;
  } else {
    swNote = `✓ SW ${gap.finalSwPerKgDs} - Veilig`;
  }

  return { summary, recommendation, warning, substitutionNote, swNote };
}

/**
 * Calculate total concentrate cost for a group
 */
export function calculateConcentrateCost(
  concentrateKgDs: number,
  cowCount: number,
  pricePerTonDs: number = DEFAULT_CONCENTRATE.pricePerTon
): {
  dailyCostPerCow: number;
  dailyCostTotal: number;
  monthlyCostTotal: number;
  annualCostTotal: number;
} {
  const dailyCostPerCow = (concentrateKgDs * pricePerTonDs) / 1000;
  const dailyCostTotal = dailyCostPerCow * cowCount;
  const monthlyCostTotal = dailyCostTotal * 30;
  const annualCostTotal = dailyCostTotal * 365;

  return {
    dailyCostPerCow: Math.round(dailyCostPerCow * 100) / 100,
    dailyCostTotal: Math.round(dailyCostTotal * 100) / 100,
    monthlyCostTotal: Math.round(monthlyCostTotal),
    annualCostTotal: Math.round(annualCostTotal),
  };
}

/**
 * Calculate how much straw is needed to fix SW deficit
 */
export function calculateStrawNeeded(
  swDeficit: number,
  totalIntakeKgDs: number,
  strawSwPerKgDs: number = 2.0  // Typical straw SW
): number {
  // SW needed = swDeficit × totalIntake
  // Straw provides strawSwPerKgDs per kg
  // But adding straw also increases total intake
  // Simplified: straw_kg ≈ (swDeficit × totalIntake) / (strawSwPerKgDs - swDeficit)
  if (swDeficit <= 0) return 0;
  const strawNeeded = (swDeficit * totalIntakeKgDs) / (strawSwPerKgDs - swDeficit);
  return Math.round(Math.max(0, strawNeeded) * 10) / 10;
}
