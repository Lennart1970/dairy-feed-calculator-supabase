/**
 * VOC (Voeropnamecapaciteit) Calculation Library
 * Based on CVB 2007/2025 Standards
 * 
 * VOC represents the maximum dry matter intake capacity of a dairy cow
 * measured in VW (Verzadigingswaarde) units or kg DS (dry matter).
 * 
 * Formula: VOC = {[α₀ + α₁ × (1 - e^(-ρα × a))] × [1 - β × e^(-ρβ × d)]} × (1 - δ₂₂₀ × (g/220)²)
 * 
 * Where:
 * - a = (Parity - 1) + (DIM / 365)  [lactation age]
 * - d = Days in Milk
 * - g = Days Pregnant
 */

// Official CVB coefficients
const ALPHA_0 = 8.743;   // Base intake capacity (heifer)
const ALPHA_1 = 3.563;   // Additional capacity for mature cow
const RHO_ALPHA = 1.140; // Maturity growth speed
const BETA = 0.3156;     // Post-calving appetite dip factor
const RHO_BETA = 0.05889; // Appetite recovery speed
const DELTA_220 = 0.05529; // Pregnancy reduction coefficient

export interface VOCInput {
  parity: number;          // Lactation number (1 = first lactation, 2+ = mature)
  daysInMilk: number;      // Days since calving (0-365+)
  daysPregnant: number;    // Days pregnant (0-283)
}

export interface VOCResult {
  voc: number;             // VOC capacity in VW units
  vocKgDs: number;         // VOC capacity in kg DS (approximate)
  lactationAge: number;    // Calculated lactation age (a)
  maturityFactor: number;  // Maturity component of formula
  lactationFactor: number; // Lactation stage component
  pregnancyFactor: number; // Pregnancy component
  breakdown: {
    base: number;          // α₀ component
    maturity: number;      // α₁ × (1 - e^(-ρα × a)) component
    lactationDip: number;  // 1 - β × e^(-ρβ × d) component
    pregnancyReduction: number; // 1 - δ₂₂₀ × (g/220)² component
  };
}

/**
 * Calculate VOC (Voeropnamecapaciteit) using CVB 2007/2025 formula
 * 
 * @param input - Parity, days in milk, and days pregnant
 * @returns VOC result with capacity and breakdown
 * 
 * @example
 * // High-producing mature cow, mid-lactation
 * const result = calculateVOC({ parity: 3, daysInMilk: 100, daysPregnant: 0 });
 * console.log(result.voc); // ~12.0 VW units
 * 
 * @example
 * // First-lactation heifer, early lactation
 * const result = calculateVOC({ parity: 1, daysInMilk: 30, daysPregnant: 0 });
 * console.log(result.voc); // ~8.5 VW units
 */
export function calculateVOC(input: VOCInput): VOCResult {
  const { parity, daysInMilk, daysPregnant } = input;
  
  // Calculate lactation age: a = (Parity - 1) + (DIM / 365)
  const lactationAge = (parity - 1) + (daysInMilk / 365);
  
  // Component 1: Maturity effect
  // [α₀ + α₁ × (1 - e^(-ρα × a))]
  const maturityAddition = ALPHA_1 * (1 - Math.exp(-RHO_ALPHA * lactationAge));
  const maturityComponent = ALPHA_0 + maturityAddition;
  
  // Component 2: Lactation stage effect (post-calving dip)
  // [1 - β × e^(-ρβ × d)]
  const lactationDip = BETA * Math.exp(-RHO_BETA * daysInMilk);
  const lactationComponent = 1 - lactationDip;
  
  // Component 3: Pregnancy effect
  // [1 - δ₂₂₀ × (g/220)²]
  const pregnancyRatio = daysPregnant / 220;
  const pregnancyReduction = DELTA_220 * Math.pow(pregnancyRatio, 2);
  const pregnancyComponent = 1 - pregnancyReduction;
  
  // Final VOC calculation
  const voc = maturityComponent * lactationComponent * pregnancyComponent;
  
  // Convert to kg DS (approximate: 1 VW ≈ 2.0-2.2 kg DS for typical roughage)
  // For mixed rations, use 2.0 as conversion factor
  const vocKgDs = voc * 2.0;
  
  return {
    voc: Number(voc.toFixed(2)),
    vocKgDs: Number(vocKgDs.toFixed(1)),
    lactationAge: Number(lactationAge.toFixed(2)),
    maturityFactor: Number(maturityComponent.toFixed(2)),
    lactationFactor: Number(lactationComponent.toFixed(2)),
    pregnancyFactor: Number(pregnancyComponent.toFixed(2)),
    breakdown: {
      base: Number(ALPHA_0.toFixed(2)),
      maturity: Number(maturityAddition.toFixed(2)),
      lactationDip: Number(lactationDip.toFixed(4)),
      pregnancyReduction: Number(pregnancyReduction.toFixed(4))
    }
  };
}

/**
 * Validate if a ration's total VW is within the cow's VOC capacity
 * 
 * @param totalVW - Total VW (filling value) of the ration
 * @param voc - VOC capacity from calculateVOC()
 * @returns Validation result with status and message
 */
export interface IntakeValidation {
  isValid: boolean;
  status: 'ok' | 'warning' | 'exceeded';
  utilization: number;     // Percentage of VOC used (0-100+)
  message: string;
  recommendation?: string;
}

export function validateIntake(totalVW: number, voc: number): IntakeValidation {
  const utilization = (totalVW / voc) * 100;
  
  if (utilization <= 95) {
    return {
      isValid: true,
      status: 'ok',
      utilization: Number(utilization.toFixed(1)),
      message: 'Rantsoen is fysiek haalbaar. De koe kan deze hoeveelheid opnemen.'
    };
  } else if (utilization <= 110) {
    return {
      isValid: true,
      status: 'warning',
      utilization: Number(utilization.toFixed(1)),
      message: 'Rantsoen is aan de hoge kant. Sommige koeien kunnen moeite hebben met deze opname.',
      recommendation: 'Overweeg om hoogvullend ruwvoer te vervangen door snijmaïs of meer krachtvoer toe te voegen.'
    };
  } else {
    return {
      isValid: false,
      status: 'exceeded',
      utilization: Number(utilization.toFixed(1)),
      message: 'Rantsoen overschrijdt de opnamecapaciteit. De koe kan deze hoeveelheid niet opnemen.',
      recommendation: 'Vervang hoogvullend ruwvoer (hooi, slecht gras) door laagvullende opties (snijmaïs VW 0.80, krachtvoer VW 0.25-0.40).'
    };
  }
}

/**
 * Calculate total VW (filling value) from a list of feeds
 * 
 * @param feeds - Array of feeds with amount (kg DS) and VW per kg DS
 * @returns Total VW value
 */
export function calculateTotalVW(feeds: Array<{ amountKgDs: number; vwPerKgDs: number }>): number {
  const total = feeds.reduce((sum, feed) => sum + (feed.amountKgDs * feed.vwPerKgDs), 0);
  return Number(total.toFixed(2));
}

/**
 * Get default VW value for a feed category when explicit VW is not available
 * 
 * @param category - Feed category
 * @returns Default VW per kg DS
 */
export function getDefaultVW(category: string): number {
  const defaults: Record<string, number> = {
    'roughage': 1.00,
    'concentrate': 0.45,
    'byproduct': 0.55,
    'mineral': 0.30
  };
  return defaults[category] || 1.00;
}

/**
 * Benchmark VOC values for validation
 * Based on CVB 2025 standards
 */
export const VOC_BENCHMARKS = {
  heifer_12months: { voc: 7.9, description: 'Heifer at 12 months old' },
  heifer_firstLactation_peak: { voc: 9.5, description: 'First lactation heifer at peak (DIM 60)' },
  mature_dryPeriod: { voc: 11.5, description: 'Mature dry cow (non-pregnant)' },
  mature_peak: { voc: 12.5, description: 'Mature cow at peak lactation (DIM 60)' },
  mature_midLactation: { voc: 12.0, description: 'Mature cow mid-lactation (DIM 150)' },
  mature_lateLactation: { voc: 11.0, description: 'Mature cow late lactation (DIM 250)' },
  mature_latePregnancy: { voc: 10.5, description: 'Mature cow at 250 days pregnant' }
};

/**
 * Test VOC calculation against CVB benchmarks
 * Useful for validation during development
 */
export function testVOCCalculation(): void {
  console.log('=== VOC Calculation Test ===\n');
  
  const tests = [
    { name: 'Heifer, early lactation', input: { parity: 1, daysInMilk: 30, daysPregnant: 0 }, expected: 8.5 },
    { name: 'Heifer, peak lactation', input: { parity: 1, daysInMilk: 60, daysPregnant: 0 }, expected: 9.5 },
    { name: 'Mature cow, peak lactation', input: { parity: 3, daysInMilk: 60, daysPregnant: 0 }, expected: 12.5 },
    { name: 'Mature cow, mid lactation', input: { parity: 3, daysInMilk: 150, daysPregnant: 0 }, expected: 12.0 },
    { name: 'Mature cow, late pregnancy', input: { parity: 3, daysInMilk: 0, daysPregnant: 250 }, expected: 10.5 },
    { name: 'Dry cow, non-pregnant', input: { parity: 3, daysInMilk: 0, daysPregnant: 0 }, expected: 11.5 }
  ];
  
  tests.forEach(test => {
    const result = calculateVOC(test.input);
    const diff = Math.abs(result.voc - test.expected);
    const status = diff < 0.5 ? '✓' : '✗';
    console.log(`${status} ${test.name}`);
    console.log(`   Input: Parity ${test.input.parity}, DIM ${test.input.daysInMilk}, Pregnant ${test.input.daysPregnant}`);
    console.log(`   Expected: ${test.expected} VW | Calculated: ${result.voc} VW | Diff: ${diff.toFixed(2)}`);
    console.log('');
  });
}
