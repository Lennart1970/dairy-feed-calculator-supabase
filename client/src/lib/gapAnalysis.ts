/**
 * Gap Analysis for Two-Tier PMR System
 * 
 * This module calculates the "gap" between what a base ration provides
 * and what a herd group actually needs, then recommends concentrate amounts.
 */

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

export interface GapAnalysisResult {
  // Base ration contribution
  baseRationIntakeKgDs: number;
  baseRationVem: number;
  baseRationDve: number;
  baseRationOeb: number;

  // Gap (what's missing)
  gapVem: number;
  gapDve: number;
  gapOeb: number;

  // Concentrate recommendation
  concentrateKgDs: number;
  concentrateVemPerKg: number; // Assumed concentrate density
  concentrateDvePerKg: number;

  // Substitution effect
  roughageDisplacement: number; // kg DS displaced by concentrate
  adjustedRoughageIntake: number; // After displacement

  // Status
  isDeficit: boolean;
  limitingNutrient: 'VEM' | 'DVE' | 'OEB' | 'none';
}

/**
 * Calculate the gap between base ration supply and group requirements
 */
export function calculateGap(
  baseRationDensity: BaseRationDensity | null,
  groupRequirements: GroupRequirements,
  baseRationIntakeKgDs: number = 15, // Default roughage intake
  concentrateDensity: { vem: number; dve: number } = { vem: 1000, dve: 100 } // Default concentrate
): GapAnalysisResult {
  // If no base ration, entire requirement is a gap
  if (!baseRationDensity) {
    const concentrateNeeded = groupRequirements.vemPerCow / concentrateDensity.vem;
    return {
      baseRationIntakeKgDs: 0,
      baseRationVem: 0,
      baseRationDve: 0,
      baseRationOeb: 0,
      gapVem: groupRequirements.vemPerCow,
      gapDve: groupRequirements.dvePerCow,
      gapOeb: groupRequirements.oebPerCow,
      concentrateKgDs: Math.round(concentrateNeeded * 10) / 10,
      concentrateVemPerKg: concentrateDensity.vem,
      concentrateDvePerKg: concentrateDensity.dve,
      roughageDisplacement: 0,
      adjustedRoughageIntake: 0,
      isDeficit: true,
      limitingNutrient: 'VEM',
    };
  }

  // Calculate what base ration provides
  const baseRationVem = baseRationDensity.vemPerKgDs * baseRationIntakeKgDs;
  const baseRationDve = baseRationDensity.dvePerKgDs * baseRationIntakeKgDs;
  const baseRationOeb = baseRationDensity.oebPerKgDs * baseRationIntakeKgDs;

  // Calculate gaps
  const gapVem = Math.max(0, groupRequirements.vemPerCow - baseRationVem);
  const gapDve = Math.max(0, groupRequirements.dvePerCow - baseRationDve);
  const gapOeb = Math.max(0, groupRequirements.oebPerCow - baseRationOeb);

  // Determine limiting nutrient
  let limitingNutrient: 'VEM' | 'DVE' | 'OEB' | 'none' = 'none';
  if (gapVem > 0 || gapDve > 0 || gapOeb > 0) {
    // Calculate concentrate needed for each nutrient
    const concentrateForVem = gapVem / concentrateDensity.vem;
    const concentrateForDve = gapDve / concentrateDensity.dve;
    
    // Limiting nutrient is the one requiring most concentrate
    if (concentrateForVem >= concentrateForDve) {
      limitingNutrient = 'VEM';
    } else {
      limitingNutrient = 'DVE';
    }
  }

  // Calculate concentrate recommendation (based on limiting nutrient)
  let concentrateKgDs = 0;
  if (limitingNutrient === 'VEM') {
    concentrateKgDs = gapVem / concentrateDensity.vem;
  } else if (limitingNutrient === 'DVE') {
    concentrateKgDs = gapDve / concentrateDensity.dve;
  }
  concentrateKgDs = Math.round(concentrateKgDs * 10) / 10;

  // Calculate substitution effect (CVB 2025: 1 kg concentrate → 0.45 kg roughage displaced)
  const roughageDisplacement = concentrateKgDs * 0.45;
  const adjustedRoughageIntake = Math.max(0, baseRationIntakeKgDs - roughageDisplacement);

  return {
    baseRationIntakeKgDs,
    baseRationVem: Math.round(baseRationVem),
    baseRationDve: Math.round(baseRationDve),
    baseRationOeb: Math.round(baseRationOeb),
    gapVem: Math.round(gapVem),
    gapDve: Math.round(gapDve),
    gapOeb: Math.round(gapOeb),
    concentrateKgDs,
    concentrateVemPerKg: concentrateDensity.vem,
    concentrateDvePerKg: concentrateDensity.dve,
    roughageDisplacement: Math.round(roughageDisplacement * 10) / 10,
    adjustedRoughageIntake: Math.round(adjustedRoughageIntake * 10) / 10,
    isDeficit: gapVem > 0 || gapDve > 0,
    limitingNutrient,
  };
}

/**
 * Calculate milk equivalent of a nutrient gap
 * (How many kg milk is missing due to this gap?)
 */
export function gapToMilkEquivalent(gapVem: number): number {
  const vemPerKgFPCM = 442; // CVB 2025
  return Math.round((gapVem / vemPerKgFPCM) * 10) / 10;
}

/**
 * Format gap analysis for display
 */
export function formatGapAnalysis(gap: GapAnalysisResult): {
  summary: string;
  recommendation: string;
  warning: string | null;
} {
  if (!gap.isDeficit) {
    return {
      summary: 'Basisrantsoen voldoet aan behoefte',
      recommendation: 'Geen krachtvoer nodig',
      warning: null,
    };
  }

  const milkGap = gapToMilkEquivalent(gap.gapVem);
  
  let summary = `Tekort: ${gap.gapVem} VEM, ${gap.gapDve}g DVE`;
  if (milkGap > 0) {
    summary += ` (≈ ${milkGap} kg melk)`;
  }

  const recommendation = `Advies: ${gap.concentrateKgDs} kg krachtvoer per koe`;

  let warning: string | null = null;
  if (gap.roughageDisplacement > 5) {
    warning = `Let op: ${gap.roughageDisplacement} kg ruwvoer wordt verdrongen door krachtvoer`;
  }

  return { summary, recommendation, warning };
}

/**
 * Calculate total concentrate cost for a group
 */
export function calculateConcentrateCost(
  concentrateKgDs: number,
  cowCount: number,
  pricePerTonDs: number = 350 // Default €350/ton DS
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
