/**
 * Substitution Logic (Verdringing) Module
 * Based on CVB 2025 - Concentrate Displacement of Roughage
 * 
 * Biological Reality:
 * When concentrate intake increases, cows voluntarily reduce roughage intake.
 * This is because concentrates are more energy-dense and filling per kg DS.
 * 
 * CVB 2025 Rule:
 * For every 1 kg concentrate added → 0.4 to 0.5 kg roughage intake reduction
 * 
 * Sources:
 * - CVB Report 235: Substitution Effects in Dairy Cattle
 * - CVB Report 531: Concentrate-Roughage Interactions
 */

/**
 * Substitution rate constants
 * Range: 0.4 to 0.5 kg roughage displaced per kg concentrate
 */
export const SUBSTITUTION_RATE_LOW = 0.4;   // Conservative estimate
export const SUBSTITUTION_RATE_MID = 0.45;  // Average
export const SUBSTITUTION_RATE_HIGH = 0.5;  // Maximum displacement

/**
 * Calculate roughage displacement due to concentrate intake
 * 
 * @param concentrateKgDs - Total concentrate intake in kg DS
 * @param substitutionRate - Displacement rate (0.4-0.5)
 * @returns Roughage displacement in kg DS
 * 
 * Formula:
 * Displacement = Concentrate_kg_DS × Substitution_Rate
 * 
 * Example:
 * - 6 kg concentrate → 6 × 0.45 = 2.7 kg roughage displaced
 * - Cow eats 2.7 kg less roughage than she would without concentrate
 */
export function calculateRoughageDisplacement(
  concentrateKgDs: number,
  substitutionRate: number = SUBSTITUTION_RATE_MID
): number {
  if (concentrateKgDs <= 0) return 0;
  if (substitutionRate < 0 || substitutionRate > 1) {
    throw new Error(`Invalid substitution rate: ${substitutionRate}. Must be between 0 and 1.`);
  }
  
  return concentrateKgDs * substitutionRate;
}

/**
 * Calculate adjusted roughage intake after displacement
 * 
 * @param maxRoughageIntake - Maximum voluntary roughage intake (kg DS)
 * @param concentrateKgDs - Concentrate intake (kg DS)
 * @param substitutionRate - Displacement rate (0.4-0.5)
 * @returns Actual roughage intake after displacement
 * 
 * Formula:
 * Actual_Roughage = Max_Roughage - (Concentrate × Substitution_Rate)
 * 
 * Example:
 * - Max roughage capacity: 15 kg DS
 * - Concentrate: 6 kg DS
 * - Displacement: 6 × 0.45 = 2.7 kg
 * - Actual roughage: 15 - 2.7 = 12.3 kg DS
 */
export function calculateAdjustedRoughageIntake(
  maxRoughageIntake: number,
  concentrateKgDs: number,
  substitutionRate: number = SUBSTITUTION_RATE_MID
): number {
  const displacement = calculateRoughageDisplacement(concentrateKgDs, substitutionRate);
  const adjustedIntake = maxRoughageIntake - displacement;
  
  // Cannot go below zero
  return Math.max(0, adjustedIntake);
}

/**
 * Calculate substitution effect for a complete ration
 * Returns both the displacement amount and adjusted intake
 * 
 * @param feeds - Array of feeds with category and kg DS
 * @param maxRoughageIntake - Maximum voluntary roughage intake
 * @param substitutionRate - Displacement rate (0.4-0.5)
 * @returns Substitution analysis
 */
export interface SubstitutionResult {
  concentrateKgDs: number;      // Total concentrate intake
  roughageKgDs: number;          // Actual roughage in ration
  maxRoughageIntake: number;     // Maximum possible roughage
  displacement: number;           // Roughage displaced by concentrate
  adjustedRoughageIntake: number; // Actual roughage after displacement
  substitutionRate: number;       // Rate used
  isOverfeeding: boolean;         // True if roughage exceeds adjusted max
  message: string;                // Human-readable explanation
}

export function calculateSubstitutionEffect(
  feeds: Array<{ category: string; kgDs: number }>,
  maxRoughageIntake: number,
  substitutionRate: number = SUBSTITUTION_RATE_MID
): SubstitutionResult {
  // Separate concentrate and roughage
  let concentrateKgDs = 0;
  let roughageKgDs = 0;
  
  for (const feed of feeds) {
    if (feed.category === 'concentrate') {
      concentrateKgDs += feed.kgDs;
    } else if (feed.category === 'roughage') {
      roughageKgDs += feed.kgDs;
    }
    // Byproducts are treated as intermediate (not included in substitution)
  }
  
  // Calculate displacement
  const displacement = calculateRoughageDisplacement(concentrateKgDs, substitutionRate);
  const adjustedRoughageIntake = calculateAdjustedRoughageIntake(
    maxRoughageIntake,
    concentrateKgDs,
    substitutionRate
  );
  
  // Check if overfeeding roughage
  const isOverfeeding = roughageKgDs > adjustedRoughageIntake;
  
  // Generate message
  let message: string;
  if (concentrateKgDs === 0) {
    message = 'Geen krachtvoer in rantsoen. Geen verdringing van ruwvoer.';
  } else if (isOverfeeding) {
    message = `⚠️ Te veel ruwvoer! Krachtvoer verdringt ${displacement.toFixed(1)} kg ruwvoer. Maximaal ${adjustedRoughageIntake.toFixed(1)} kg ruwvoer mogelijk.`;
  } else {
    message = `✅ Verdringing OK. Krachtvoer verdringt ${displacement.toFixed(1)} kg ruwvoer. Nog ${(adjustedRoughageIntake - roughageKgDs).toFixed(1)} kg ruwvoer ruimte.`;
  }
  
  return {
    concentrateKgDs: Number(concentrateKgDs.toFixed(2)),
    roughageKgDs: Number(roughageKgDs.toFixed(2)),
    maxRoughageIntake: Number(maxRoughageIntake.toFixed(1)),
    displacement: Number(displacement.toFixed(2)),
    adjustedRoughageIntake: Number(adjustedRoughageIntake.toFixed(2)),
    substitutionRate,
    isOverfeeding,
    message
  };
}

/**
 * Recommend optimal concentrate level to maximize roughage utilization
 * 
 * @param maxRoughageIntake - Maximum voluntary roughage intake
 * @param targetRoughageIntake - Desired roughage intake
 * @param substitutionRate - Displacement rate
 * @returns Recommended concentrate level
 * 
 * Formula (reverse):
 * Concentrate = (Max_Roughage - Target_Roughage) / Substitution_Rate
 * 
 * Example:
 * - Max roughage: 15 kg DS
 * - Target roughage: 12 kg DS
 * - Want to displace: 3 kg
 * - Concentrate needed: 3 / 0.45 = 6.67 kg DS
 */
export function recommendConcentrateLevel(
  maxRoughageIntake: number,
  targetRoughageIntake: number,
  substitutionRate: number = SUBSTITUTION_RATE_MID
): number {
  if (targetRoughageIntake >= maxRoughageIntake) return 0;
  
  const desiredDisplacement = maxRoughageIntake - targetRoughageIntake;
  const recommendedConcentrate = desiredDisplacement / substitutionRate;
  
  return Number(recommendedConcentrate.toFixed(2));
}

/**
 * Test substitution calculations
 * Useful for validation during development
 */
export function testSubstitutionLogic(): void {
  console.log('=== Substitution Logic Test ===\n');
  
  const tests = [
    { name: 'No concentrate', concentrate: 0, expected: 0 },
    { name: 'Low concentrate (3 kg)', concentrate: 3, expected: 1.35 },
    { name: 'Medium concentrate (6 kg)', concentrate: 6, expected: 2.7 },
    { name: 'High concentrate (10 kg)', concentrate: 10, expected: 4.5 },
  ];
  
  tests.forEach(test => {
    const displacement = calculateRoughageDisplacement(test.concentrate);
    const diff = Math.abs(displacement - test.expected);
    const status = diff < 0.01 ? '✓' : '✗';
    console.log(`${status} ${test.name}`);
    console.log(`   Concentrate: ${test.concentrate} kg DS`);
    console.log(`   Expected displacement: ${test.expected} kg | Calculated: ${displacement.toFixed(2)} kg`);
    console.log('');
  });
  
  // Test complete ration
  console.log('=== Complete Ration Test ===\n');
  const feeds = [
    { category: 'roughage', kgDs: 14 },
    { category: 'concentrate', kgDs: 6 },
  ];
  const result = calculateSubstitutionEffect(feeds, 15);
  console.log('Ration:', feeds);
  console.log('Result:', result);
  console.log('Message:', result.message);
}
