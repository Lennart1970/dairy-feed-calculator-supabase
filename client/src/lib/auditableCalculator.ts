/**
 * Auditable Dairy Feed Calculator
 * ================================
 * 
 * This module provides crystal-clear, step-by-step calculations for dairy feed rations.
 * Every calculation includes:
 * - The formula used
 * - The source reference (CVB 2025)
 * - All input values
 * - Intermediate calculations
 * - Final result
 * 
 * Designed for auditability by feed experts.
 * 
 * References:
 * - CVB Tabellenboek Voeding Herkauwers 2025
 * - CVB Veevoedertabel 2025
 * - CVB Voedernormen Melkvee 2007/2025
 */

// ============================================================================
// TYPES - Audit Trail Structures
// ============================================================================

export interface CalculationStep {
  name: string;
  formula: string;
  inputs: Record<string, number | string>;
  calculation: string;
  result: number;
  unit: string;
  source: string;
}

export interface FeedContribution {
  feedName: string;
  displayName: string;
  amountKgDs: number;
  amountKgProduct: number;
  dsPercent: number;
  basis: string;
  vemPerUnit: number;
  dvePerUnit: number;
  oebPerUnit: number;
  swPerKgDs: number;
  vwPerKgDs: number;
  contributions: {
    vem: CalculationStep;
    dve: CalculationStep;
    oeb: CalculationStep;
    sw: CalculationStep;
    vw: CalculationStep;
  };
}

export interface RequirementBreakdown {
  vem: {
    maintenance: CalculationStep;
    production: CalculationStep;
    pregnancy: CalculationStep;
    growth: CalculationStep;
    grazing: CalculationStep;
    total: CalculationStep;
  };
  dve: {
    maintenance: CalculationStep;
    production: CalculationStep;
    pregnancy: CalculationStep;
    growth: CalculationStep;
    total: CalculationStep;
  };
  voc: {
    lactationAge: CalculationStep;
    maturityComponent: CalculationStep;
    lactationComponent: CalculationStep;
    pregnancyComponent: CalculationStep;
    vocTotal: CalculationStep;
    vocKgDs: CalculationStep;
  };
}

export interface SupplyBreakdown {
  feeds: FeedContribution[];
  totals: {
    dryMatterKg: CalculationStep;
    vem: CalculationStep;
    dve: CalculationStep;
    oeb: CalculationStep;
    sw: CalculationStep;
    swPerKgDs: CalculationStep;
    vw: CalculationStep;
  };
  grazingSurcharge?: CalculationStep;
}

export interface BalanceBreakdown {
  parameter: string;
  requirement: number;
  supply: number;
  balance: number;
  balancePercent: number;
  status: 'ok' | 'warning' | 'deficient';
  unit: string;
  calculation: CalculationStep;
}

export interface AuditableCalculationResult {
  timestamp: string;
  inputs: {
    animalProfile: {
      name: string;
      weightKg: number;
      parity: number;
      daysInMilk: number;
      daysPregnant: number;
    };
    milkProduction?: {
      kgPerDay: number;
      fatPercent: number;
      proteinPercent: number;
      fpcm: number;
    };
    isGrazing: boolean;
    feedCount: number;
  };
  requirements: RequirementBreakdown;
  supply: SupplyBreakdown;
  balances: BalanceBreakdown[];
  summary: {
    totalVemRequired: number;
    totalVemSupplied: number;
    vemBalance: number;
    vemCoverage: number;
    totalDveRequired: number;
    totalDveSupplied: number;
    dveBalance: number;
    dveCoverage: number;
    vocCapacity: number;
    vocUtilization: number;
    swPerKgDs: number;
    swStatus: string;
  };
}

// ============================================================================
// CONSTANTS - CVB 2025 Reference Values
// ============================================================================

const CVB_CONSTANTS = {
  // VEM Maintenance (CVB 2025, Table 3.1)
  VEM_MAINTENANCE_LACTATING: 53.0,    // VEM per kg metabolic weight for lactating cows
  VEM_MAINTENANCE_DRY: 52.2,          // VEM per kg metabolic weight for dry cows
  
  // VEM Production (CVB 2025, Table 3.2)
  VEM_PER_KG_FPCM: 390,               // VEM per kg Fat-Protein Corrected Milk
  
  // VEM Grazing (CVB 2025, Section 3.4)
  VEM_GRAZING_SURCHARGE_PERCENT: 0.30, // 30% surcharge for full-day grazing
  VEM_GRAZING_FIXED: 1175,             // Alternative fixed surcharge
  
  // VEM Growth (CVB 2025, Table 3.3)
  VEM_GROWTH_PARITY1: 625,            // Growth surcharge for first lactation
  VEM_GROWTH_PARITY2: 325,            // Growth surcharge for second lactation
  
  // DVE Maintenance (CVB 2025, Table 4.1)
  DVE_MAINTENANCE_BASE: 54,           // Base DVE maintenance (grams)
  DVE_MAINTENANCE_PER_KG_LW: 0.1,     // DVE per kg live weight (grams)
  
  // DVE Production (CVB 2025, Table 4.2)
  DVE_PRODUCTION_LINEAR: 1.396,       // Linear coefficient
  DVE_PRODUCTION_QUADRATIC: 0.000195, // Quadratic coefficient
  
  // DVE Growth (CVB 2025, Table 4.3)
  DVE_GROWTH_PARITY1: 64,             // Growth surcharge for first lactation (grams)
  DVE_GROWTH_PARITY2: 37,             // Growth surcharge for second lactation (grams)
  
  // DVE Pregnancy (CVB 2025, Table 4.4)
  DVE_PREGNANCY_SURCHARGE: 255,       // Late pregnancy surcharge (grams)
  
  // VOC Coefficients (CVB 2007/2025)
  VOC_ALPHA_0: 8.743,                 // Base intake capacity (heifer)
  VOC_ALPHA_1: 3.563,                 // Additional capacity for mature cow
  VOC_RHO_ALPHA: 1.140,               // Maturity growth speed
  VOC_BETA: 0.3156,                   // Post-calving appetite dip factor
  VOC_RHO_BETA: 0.05889,              // Appetite recovery speed
  VOC_DELTA_220: 0.05529,             // Pregnancy reduction coefficient
  VOC_TO_KG_DS: 2.0,                  // Conversion factor VW to kg DS
  
  // Structure Value (CVB 2022)
  SW_MINIMUM: 1.00,                   // Minimum SW per kg DS
  
  // FPCM Calculation (CVB 2025)
  FPCM_FAT_COEF: 0.116,
  FPCM_PROTEIN_COEF: 0.06,
  FPCM_CONSTANT: 0.337,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function createStep(
  name: string,
  formula: string,
  inputs: Record<string, number | string>,
  calculation: string,
  result: number,
  unit: string,
  source: string
): CalculationStep {
  return { name, formula, inputs, calculation, result: round(result), unit, source };
}

// ============================================================================
// FPCM CALCULATION
// ============================================================================

export function calculateFPCM(
  milkKg: number,
  fatPercent: number,
  proteinPercent: number
): CalculationStep {
  const fpcm = (CVB_CONSTANTS.FPCM_CONSTANT + 
                CVB_CONSTANTS.FPCM_FAT_COEF * fatPercent + 
                CVB_CONSTANTS.FPCM_PROTEIN_COEF * proteinPercent) * milkKg;
  
  return createStep(
    'FPCM (Fat-Protein Corrected Milk)',
    'FPCM = (0.337 + 0.116 × Vet% + 0.06 × Eiwit%) × Melk',
    { 
      'Melk (kg/dag)': milkKg, 
      'Vet%': fatPercent, 
      'Eiwit%': proteinPercent 
    },
    `(0.337 + 0.116 × ${fatPercent} + 0.06 × ${proteinPercent}) × ${milkKg} = ${round(fpcm)}`,
    fpcm,
    'kg FPCM/dag',
    'CVB 2025, Formule 2.1'
  );
}

// ============================================================================
// METABOLIC WEIGHT
// ============================================================================

export function calculateMetabolicWeight(weightKg: number): CalculationStep {
  const mw = Math.pow(weightKg, 0.75);
  
  return createStep(
    'Metabolisch Gewicht (MW)',
    'MW = LG^0.75',
    { 'Levend Gewicht (kg)': weightKg },
    `${weightKg}^0.75 = ${round(mw)}`,
    mw,
    'kg MW',
    'CVB 2025, Formule 3.1'
  );
}

// ============================================================================
// VEM REQUIREMENTS
// ============================================================================

export function calculateVemMaintenance(weightKg: number, isLactating: boolean): CalculationStep {
  const mw = Math.pow(weightKg, 0.75);
  const coefficient = isLactating ? CVB_CONSTANTS.VEM_MAINTENANCE_LACTATING : CVB_CONSTANTS.VEM_MAINTENANCE_DRY;
  const vem = coefficient * mw;
  
  return createStep(
    'VEM Onderhoud',
    isLactating ? 'VEM_onderhoud = 53.0 × MW' : 'VEM_onderhoud = 52.2 × MW',
    { 
      'Metabolisch Gewicht': round(mw), 
      'Coëfficiënt': coefficient 
    },
    `${coefficient} × ${round(mw)} = ${round(vem)}`,
    vem,
    'VEM',
    'CVB 2025, Tabel 3.1'
  );
}

export function calculateVemProduction(fpcm: number): CalculationStep {
  const vem = CVB_CONSTANTS.VEM_PER_KG_FPCM * fpcm;
  
  return createStep(
    'VEM Productie',
    'VEM_productie = 390 × FPCM',
    { 'FPCM (kg/dag)': round(fpcm) },
    `390 × ${round(fpcm)} = ${round(vem)}`,
    vem,
    'VEM',
    'CVB 2025, Tabel 3.2'
  );
}

export function calculateVemPregnancy(daysPregnant: number): CalculationStep {
  let vem = 0;
  let calculation = 'Niet drachtig of < 190 dagen = 0';
  
  if (daysPregnant >= 190) {
    const daysAfter190 = daysPregnant - 190;
    vem = Math.pow(daysAfter190 / 93, 2) * 2000;
    calculation = `((${daysPregnant} - 190) / 93)² × 2000 = ${round(vem)}`;
  }
  
  return createStep(
    'VEM Dracht',
    'VEM_dracht = ((dagen - 190) / 93)² × 2000 (indien > 190 dagen)',
    { 'Dagen drachtig': daysPregnant },
    calculation,
    vem,
    'VEM',
    'CVB 2025, Tabel 3.4'
  );
}

export function calculateVemGrowth(parity: number, daysInMilk: number): CalculationStep {
  let vem = 0;
  let calculation = 'Geen groeitoeslag (volwassen koe of > 100 DIM)';
  
  if (daysInMilk <= 100) {
    if (parity === 1) {
      vem = CVB_CONSTANTS.VEM_GROWTH_PARITY1;
      calculation = `Vaars (1e lactatie), DIM ≤ 100: +${vem} VEM`;
    } else if (parity === 2) {
      vem = CVB_CONSTANTS.VEM_GROWTH_PARITY2;
      calculation = `2e lactatie, DIM ≤ 100: +${vem} VEM`;
    }
  }
  
  return createStep(
    'VEM Groei',
    'VEM_groei = 625 (vaars) of 325 (2e lactatie) indien DIM ≤ 100',
    { 'Pariteit': parity, 'Dagen in Melk': daysInMilk },
    calculation,
    vem,
    'VEM',
    'CVB 2025, Tabel 3.3'
  );
}

export function calculateVemGrazing(
  vemMaintenance: number, 
  vemProduction: number, 
  isGrazing: boolean
): CalculationStep {
  let vem = 0;
  let calculation = 'Geen beweiding = 0';
  
  if (isGrazing) {
    vem = (vemMaintenance + vemProduction) * CVB_CONSTANTS.VEM_GRAZING_SURCHARGE_PERCENT;
    calculation = `30% × (${round(vemMaintenance)} + ${round(vemProduction)}) = ${round(vem)}`;
  }
  
  return createStep(
    'VEM Beweiding',
    'VEM_beweiding = 30% × (VEM_onderhoud + VEM_productie)',
    { 
      'VEM Onderhoud': round(vemMaintenance), 
      'VEM Productie': round(vemProduction),
      'Beweiding': isGrazing ? 'Ja' : 'Nee'
    },
    calculation,
    vem,
    'VEM',
    'CVB 2025, Sectie 3.4'
  );
}

// ============================================================================
// DVE REQUIREMENTS
// ============================================================================

export function calculateDveMaintenance(weightKg: number): CalculationStep {
  const dve = CVB_CONSTANTS.DVE_MAINTENANCE_BASE + (CVB_CONSTANTS.DVE_MAINTENANCE_PER_KG_LW * weightKg);
  
  return createStep(
    'DVE Onderhoud',
    'DVE_onderhoud = 54 + (0.1 × LG)',
    { 'Levend Gewicht (kg)': weightKg },
    `54 + (0.1 × ${weightKg}) = ${round(dve)}`,
    dve,
    'gram',
    'CVB 2025, Tabel 4.1'
  );
}

export function calculateDveProduction(fpcm: number, proteinPercent: number = 3.4): CalculationStep {
  const proteinYield = fpcm * proteinPercent * 10;
  const dve = (CVB_CONSTANTS.DVE_PRODUCTION_LINEAR * proteinYield) + 
              (CVB_CONSTANTS.DVE_PRODUCTION_QUADRATIC * Math.pow(proteinYield, 2));
  
  return createStep(
    'DVE Productie',
    'DVE_productie = 1.396 × EiwitOpbrengst + 0.000195 × EiwitOpbrengst²',
    { 
      'FPCM (kg/dag)': round(fpcm),
      'Eiwit%': proteinPercent,
      'EiwitOpbrengst (g/dag)': round(proteinYield)
    },
    `1.396 × ${round(proteinYield)} + 0.000195 × ${round(proteinYield)}² = ${round(dve)}`,
    dve,
    'gram',
    'CVB 2025, Tabel 4.2'
  );
}

export function calculateDvePregnancy(daysPregnant: number): CalculationStep {
  const dve = daysPregnant >= 190 ? CVB_CONSTANTS.DVE_PREGNANCY_SURCHARGE : 0;
  
  return createStep(
    'DVE Dracht',
    'DVE_dracht = 255g indien > 190 dagen drachtig',
    { 'Dagen drachtig': daysPregnant },
    daysPregnant >= 190 ? `> 190 dagen: +${dve}g` : 'Niet drachtig of < 190 dagen = 0',
    dve,
    'gram',
    'CVB 2025, Tabel 4.4'
  );
}

export function calculateDveGrowth(parity: number, daysInMilk: number): CalculationStep {
  let dve = 0;
  let calculation = 'Geen groeitoeslag (volwassen koe of > 100 DIM)';
  
  if (daysInMilk <= 100) {
    if (parity === 1) {
      dve = CVB_CONSTANTS.DVE_GROWTH_PARITY1;
      calculation = `Vaars (1e lactatie), DIM ≤ 100: +${dve}g`;
    } else if (parity === 2) {
      dve = CVB_CONSTANTS.DVE_GROWTH_PARITY2;
      calculation = `2e lactatie, DIM ≤ 100: +${dve}g`;
    }
  }
  
  return createStep(
    'DVE Groei',
    'DVE_groei = 64g (vaars) of 37g (2e lactatie) indien DIM ≤ 100',
    { 'Pariteit': parity, 'Dagen in Melk': daysInMilk },
    calculation,
    dve,
    'gram',
    'CVB 2025, Tabel 4.3'
  );
}

// ============================================================================
// VOC CALCULATION
// ============================================================================

export function calculateVOC(
  parity: number, 
  daysInMilk: number, 
  daysPregnant: number
): {
  lactationAge: CalculationStep;
  maturityComponent: CalculationStep;
  lactationComponent: CalculationStep;
  pregnancyComponent: CalculationStep;
  vocTotal: CalculationStep;
  vocKgDs: CalculationStep;
} {
  // Lactation age
  const lactationAge = (parity - 1) + (daysInMilk / 365);
  const lactationAgeStep = createStep(
    'Lactatieleftijd (a)',
    'a = (Pariteit - 1) + (DIM / 365)',
    { 'Pariteit': parity, 'Dagen in Melk': daysInMilk },
    `(${parity} - 1) + (${daysInMilk} / 365) = ${round(lactationAge)}`,
    lactationAge,
    'jaren',
    'CVB 2007, Formule 5.1'
  );
  
  // Maturity component
  const maturityAddition = CVB_CONSTANTS.VOC_ALPHA_1 * (1 - Math.exp(-CVB_CONSTANTS.VOC_RHO_ALPHA * lactationAge));
  const maturityComponent = CVB_CONSTANTS.VOC_ALPHA_0 + maturityAddition;
  const maturityStep = createStep(
    'Rijpheidscomponent',
    '[α₀ + α₁ × (1 - e^(-ρα × a))]',
    { 
      'α₀': CVB_CONSTANTS.VOC_ALPHA_0, 
      'α₁': CVB_CONSTANTS.VOC_ALPHA_1,
      'ρα': CVB_CONSTANTS.VOC_RHO_ALPHA,
      'a': round(lactationAge)
    },
    `8.743 + 3.563 × (1 - e^(-1.14 × ${round(lactationAge)})) = ${round(maturityComponent)}`,
    maturityComponent,
    'VW',
    'CVB 2007, Formule 5.2'
  );
  
  // Lactation component
  const lactationDip = CVB_CONSTANTS.VOC_BETA * Math.exp(-CVB_CONSTANTS.VOC_RHO_BETA * daysInMilk);
  const lactationComponent = 1 - lactationDip;
  const lactationStep = createStep(
    'Lactatiecomponent',
    '[1 - β × e^(-ρβ × d)]',
    { 
      'β': CVB_CONSTANTS.VOC_BETA, 
      'ρβ': CVB_CONSTANTS.VOC_RHO_BETA,
      'd (DIM)': daysInMilk
    },
    `1 - 0.3156 × e^(-0.05889 × ${daysInMilk}) = ${round(lactationComponent, 4)}`,
    lactationComponent,
    'factor',
    'CVB 2007, Formule 5.3'
  );
  
  // Pregnancy component
  const pregnancyRatio = daysPregnant / 220;
  const pregnancyReduction = CVB_CONSTANTS.VOC_DELTA_220 * Math.pow(pregnancyRatio, 2);
  const pregnancyComponent = 1 - pregnancyReduction;
  const pregnancyStep = createStep(
    'Drachtcomponent',
    '[1 - δ₂₂₀ × (g/220)²]',
    { 
      'δ₂₂₀': CVB_CONSTANTS.VOC_DELTA_220, 
      'g (dagen drachtig)': daysPregnant
    },
    `1 - 0.05529 × (${daysPregnant}/220)² = ${round(pregnancyComponent, 4)}`,
    pregnancyComponent,
    'factor',
    'CVB 2007, Formule 5.4'
  );
  
  // Total VOC
  const voc = maturityComponent * lactationComponent * pregnancyComponent;
  const vocStep = createStep(
    'VOC Totaal',
    'VOC = Rijpheid × Lactatie × Dracht',
    { 
      'Rijpheid': round(maturityComponent),
      'Lactatie': round(lactationComponent, 4),
      'Dracht': round(pregnancyComponent, 4)
    },
    `${round(maturityComponent)} × ${round(lactationComponent, 4)} × ${round(pregnancyComponent, 4)} = ${round(voc)}`,
    voc,
    'VW',
    'CVB 2007, Formule 5.5'
  );
  
  // Convert to kg DS
  const vocKgDs = voc * CVB_CONSTANTS.VOC_TO_KG_DS;
  const vocKgDsStep = createStep(
    'VOC in kg DS',
    'VOC_kgDS = VOC × 2.0',
    { 'VOC (VW)': round(voc) },
    `${round(voc)} × 2.0 = ${round(vocKgDs, 1)}`,
    vocKgDs,
    'kg DS',
    'CVB 2007, Conversie'
  );
  
  return {
    lactationAge: lactationAgeStep,
    maturityComponent: maturityStep,
    lactationComponent: lactationStep,
    pregnancyComponent: pregnancyStep,
    vocTotal: vocStep,
    vocKgDs: vocKgDsStep,
  };
}

// ============================================================================
// FEED CONTRIBUTION CALCULATION
// ============================================================================

export interface FeedInput {
  name: string;
  displayName: string;
  amountKg: number;
  dsPercent: number;
  basis: 'per kg DS' | 'per kg product';
  vemPerUnit: number;
  dvePerUnit: number;
  oebPerUnit: number;
  swPerKgDs: number;
  vwPerKgDs: number;
}

export function calculateFeedContribution(feed: FeedInput): FeedContribution {
  // Calculate dry matter
  let amountKgDs: number;
  let amountKgProduct: number;
  let nutrientMultiplier: number;
  
  if (feed.basis === 'per kg DS') {
    amountKgDs = feed.amountKg;
    amountKgProduct = feed.dsPercent > 0 ? (feed.amountKg / feed.dsPercent) * 100 : 0;
    nutrientMultiplier = feed.amountKg;
  } else {
    // User enters kg product - convert to DS
    // CVB 2025: ALL nutritional values (VEM, DVE, OEB) are expressed per kg DS
    // So we must always multiply by kg DS, not kg product
    amountKgProduct = feed.amountKg;
    amountKgDs = feed.amountKg * (feed.dsPercent / 100);
    nutrientMultiplier = amountKgDs; // FIXED: Use kg DS for nutrient calculations (CVB 2025)
  }
  
  // VEM contribution
  const vemContribution = nutrientMultiplier * feed.vemPerUnit;
  // CVB 2025: All nutritional values are per kg DS, so we always show kg DS in the formula
  const vemStep = createStep(
    `VEM van ${feed.displayName}`,
    'VEM = kg DS × VEM/kg DS',
    { 
      'kg DS': round(amountKgDs, 2),
      'VEM/kg DS': feed.vemPerUnit
    },
    `${round(amountKgDs, 2)} × ${feed.vemPerUnit} = ${round(vemContribution)}`,
    vemContribution,
    'VEM',
    'CVB Veevoedertabel 2025'
  );
  
  // DVE contribution
  const dveContribution = nutrientMultiplier * feed.dvePerUnit;
  const dveStep = createStep(
    `DVE van ${feed.displayName}`,
    'DVE = kg DS × DVE/kg DS',
    { 
      'kg DS': round(amountKgDs, 2),
      'DVE/kg DS': feed.dvePerUnit
    },
    `${round(amountKgDs, 2)} × ${feed.dvePerUnit} = ${round(dveContribution)}`,
    dveContribution,
    'gram',
    'CVB Veevoedertabel 2025'
  );
  
  // OEB contribution
  const oebContribution = nutrientMultiplier * feed.oebPerUnit;
  const oebStep = createStep(
    `OEB van ${feed.displayName}`,
    'OEB = kg DS × OEB/kg DS',
    { 
      'kg DS': round(amountKgDs, 2),
      'OEB/kg DS': feed.oebPerUnit
    },
    `${round(amountKgDs, 2)} × ${feed.oebPerUnit} = ${round(oebContribution)}`,
    oebContribution,
    'gram',
    'CVB Veevoedertabel 2025'
  );
  
  // SW contribution (always per kg DS)
  const swContribution = amountKgDs * feed.swPerKgDs;
  const swStep = createStep(
    `SW van ${feed.displayName}`,
    'SW = kg DS × SW/kg DS',
    { 
      'kg DS': round(amountKgDs, 2),
      'SW/kg DS': feed.swPerKgDs
    },
    `${round(amountKgDs, 2)} × ${feed.swPerKgDs} = ${round(swContribution, 2)}`,
    swContribution,
    'SW',
    'CVB 2022, Structuurwaarde'
  );
  
  // VW contribution (always per kg DS)
  const vwContribution = amountKgDs * feed.vwPerKgDs;
  const vwStep = createStep(
    `VW van ${feed.displayName}`,
    'VW = kg DS × VW/kg DS',
    { 
      'kg DS': round(amountKgDs, 2),
      'VW/kg DS': feed.vwPerKgDs
    },
    `${round(amountKgDs, 2)} × ${feed.vwPerKgDs} = ${round(vwContribution, 2)}`,
    vwContribution,
    'VW',
    'CVB 2007, Verzadigingswaarde'
  );
  
  return {
    feedName: feed.name,
    displayName: feed.displayName,
    amountKgDs: round(amountKgDs, 2),
    amountKgProduct: round(amountKgProduct, 1),
    dsPercent: feed.dsPercent,
    basis: feed.basis,
    vemPerUnit: feed.vemPerUnit,
    dvePerUnit: feed.dvePerUnit,
    oebPerUnit: feed.oebPerUnit,
    swPerKgDs: feed.swPerKgDs,
    vwPerKgDs: feed.vwPerKgDs,
    contributions: {
      vem: vemStep,
      dve: dveStep,
      oeb: oebStep,
      sw: swStep,
      vw: vwStep,
    },
  };
}

// ============================================================================
// MAIN AUDITABLE CALCULATION
// ============================================================================

export interface AuditableCalculationInputs {
  animalProfile: {
    name: string;
    weightKg: number;
    parity: number;
    daysInMilk: number;
    daysPregnant: number;
    isLactating: boolean;
  };
  milkProduction?: {
    kgPerDay: number;
    fatPercent: number;
    proteinPercent: number;
  };
  feeds: FeedInput[];
  isGrazing: boolean;
}

export function calculateAuditableRation(inputs: AuditableCalculationInputs): AuditableCalculationResult {
  const { animalProfile, milkProduction, feeds, isGrazing } = inputs;
  
  // Calculate FPCM if milk production data available
  let fpcm = 0;
  let fpcmStep: CalculationStep | undefined;
  if (milkProduction) {
    fpcmStep = calculateFPCM(milkProduction.kgPerDay, milkProduction.fatPercent, milkProduction.proteinPercent);
    fpcm = fpcmStep.result;
  }
  
  // ========== REQUIREMENTS ==========
  
  // VEM Requirements
  const vemMaintenance = calculateVemMaintenance(animalProfile.weightKg, animalProfile.isLactating);
  const vemProduction = calculateVemProduction(fpcm);
  const vemPregnancy = calculateVemPregnancy(animalProfile.daysPregnant);
  const vemGrowth = calculateVemGrowth(animalProfile.parity, animalProfile.daysInMilk);
  const vemGrazing = calculateVemGrazing(vemMaintenance.result, vemProduction.result, isGrazing);
  
  const totalVemRequired = vemMaintenance.result + vemProduction.result + vemPregnancy.result + vemGrowth.result + vemGrazing.result;
  const vemTotalStep = createStep(
    'VEM Totaal Behoefte',
    'VEM_totaal = Onderhoud + Productie + Dracht + Groei + Beweiding',
    {
      'Onderhoud': round(vemMaintenance.result),
      'Productie': round(vemProduction.result),
      'Dracht': round(vemPregnancy.result),
      'Groei': round(vemGrowth.result),
      'Beweiding': round(vemGrazing.result),
    },
    `${round(vemMaintenance.result)} + ${round(vemProduction.result)} + ${round(vemPregnancy.result)} + ${round(vemGrowth.result)} + ${round(vemGrazing.result)} = ${round(totalVemRequired)}`,
    totalVemRequired,
    'VEM',
    'CVB 2025, Som'
  );
  
  // DVE Requirements
  const dveMaintenance = calculateDveMaintenance(animalProfile.weightKg);
  const dveProduction = calculateDveProduction(fpcm, milkProduction?.proteinPercent || 3.4);
  const dvePregnancy = calculateDvePregnancy(animalProfile.daysPregnant);
  const dveGrowth = calculateDveGrowth(animalProfile.parity, animalProfile.daysInMilk);
  
  const totalDveRequired = dveMaintenance.result + dveProduction.result + dvePregnancy.result + dveGrowth.result;
  const dveTotalStep = createStep(
    'DVE Totaal Behoefte',
    'DVE_totaal = Onderhoud + Productie + Dracht + Groei',
    {
      'Onderhoud': round(dveMaintenance.result),
      'Productie': round(dveProduction.result),
      'Dracht': round(dvePregnancy.result),
      'Groei': round(dveGrowth.result),
    },
    `${round(dveMaintenance.result)} + ${round(dveProduction.result)} + ${round(dvePregnancy.result)} + ${round(dveGrowth.result)} = ${round(totalDveRequired)}`,
    totalDveRequired,
    'gram',
    'CVB 2025, Som'
  );
  
  // VOC
  const vocResult = calculateVOC(animalProfile.parity, animalProfile.daysInMilk, animalProfile.daysPregnant);
  
  // ========== SUPPLY ==========
  
  const feedContributions = feeds.map(calculateFeedContribution);
  
  // Calculate totals
  let totalDs = 0;
  let totalVem = 0;
  let totalDve = 0;
  let totalOeb = 0;
  let totalSw = 0;
  let totalVw = 0;
  
  for (const fc of feedContributions) {
    totalDs += fc.amountKgDs;
    totalVem += fc.contributions.vem.result;
    totalDve += fc.contributions.dve.result;
    totalOeb += fc.contributions.oeb.result;
    totalSw += fc.contributions.sw.result;
    totalVw += fc.contributions.vw.result;
  }
  
  // Add grazing surcharge to VEM if applicable
  let grazingSurchargeStep: CalculationStep | undefined;
  if (isGrazing) {
    grazingSurchargeStep = createStep(
      'Beweidingstoeslag VEM',
      'Vaste toeslag voor beweiding',
      {},
      `+1175 VEM`,
      1175,
      'VEM',
      'CVB 2025, Beweidingstoeslag'
    );
    totalVem += 1175;
  }
  
  const swPerKgDs = totalDs > 0 ? totalSw / totalDs : 0;
  
  // Create total steps
  const totalDsStep = createStep(
    'Totaal Droge Stof',
    'Som van alle voermiddelen',
    { 'Aantal voermiddelen': feeds.length },
    feedContributions.map(fc => `${fc.displayName}: ${fc.amountKgDs} kg DS`).join(' + ') + ` = ${round(totalDs, 1)}`,
    totalDs,
    'kg DS',
    'Berekening'
  );
  
  const totalVemStep = createStep(
    'Totaal VEM Aanbod',
    'Som van alle voermiddelen' + (isGrazing ? ' + beweidingstoeslag' : ''),
    {},
    `${round(totalVem)} VEM`,
    totalVem,
    'VEM',
    'Berekening'
  );
  
  const totalDveStep = createStep(
    'Totaal DVE Aanbod',
    'Som van alle voermiddelen',
    {},
    `${round(totalDve)} gram`,
    totalDve,
    'gram',
    'Berekening'
  );
  
  const totalOebStep = createStep(
    'Totaal OEB',
    'Som van alle voermiddelen',
    {},
    `${round(totalOeb)} gram`,
    totalOeb,
    'gram',
    'Berekening'
  );
  
  const totalSwStep = createStep(
    'Totaal Structuurwaarde',
    'Som van alle voermiddelen',
    {},
    `${round(totalSw, 2)} SW`,
    totalSw,
    'SW',
    'Berekening'
  );
  
  const swPerKgDsStep = createStep(
    'Structuurwaarde per kg DS',
    'SW/kg DS = Totaal SW / Totaal DS',
    { 'Totaal SW': round(totalSw, 2), 'Totaal DS': round(totalDs, 1) },
    `${round(totalSw, 2)} / ${round(totalDs, 1)} = ${round(swPerKgDs, 2)}`,
    swPerKgDs,
    'SW/kg DS',
    'Berekening'
  );
  
  const totalVwStep = createStep(
    'Totaal Verzadigingswaarde',
    'Som van alle voermiddelen',
    {},
    `${round(totalVw, 2)} VW`,
    totalVw,
    'VW',
    'Berekening'
  );
  
  // ========== BALANCES ==========
  
  const vemBalance = totalVem - totalVemRequired;
  const vemCoverage = totalVemRequired > 0 ? (totalVem / totalVemRequired) * 100 : 0;
  const vemBalanceStep = createStep(
    'VEM Balans',
    'Balans = Aanbod - Behoefte',
    { 'Aanbod': round(totalVem), 'Behoefte': round(totalVemRequired) },
    `${round(totalVem)} - ${round(totalVemRequired)} = ${round(vemBalance)}`,
    vemBalance,
    'VEM',
    'Berekening'
  );
  
  const dveBalance = totalDve - totalDveRequired;
  const dveCoverage = totalDveRequired > 0 ? (totalDve / totalDveRequired) * 100 : 0;
  const dveBalanceStep = createStep(
    'DVE Balans',
    'Balans = Aanbod - Behoefte',
    { 'Aanbod': round(totalDve), 'Behoefte': round(totalDveRequired) },
    `${round(totalDve)} - ${round(totalDveRequired)} = ${round(dveBalance)}`,
    dveBalance,
    'gram',
    'Berekening'
  );
  
  const vocUtilization = vocResult.vocKgDs.result > 0 ? (totalVw / vocResult.vocTotal.result) * 100 : 0;
  
  // Determine statuses
  const vemStatus: 'ok' | 'warning' | 'deficient' = 
    vemCoverage >= 100 ? 'ok' : vemCoverage >= 90 ? 'warning' : 'deficient';
  const dveStatus: 'ok' | 'warning' | 'deficient' = 
    dveCoverage >= 100 ? 'ok' : dveCoverage >= 90 ? 'warning' : 'deficient';
  const swStatus = swPerKgDs >= 1.0 ? 'OK' : swPerKgDs >= 0.85 ? 'Marginaal' : 'Onvoldoende';
  
  return {
    timestamp: new Date().toISOString(),
    inputs: {
      animalProfile: {
        name: animalProfile.name,
        weightKg: animalProfile.weightKg,
        parity: animalProfile.parity,
        daysInMilk: animalProfile.daysInMilk,
        daysPregnant: animalProfile.daysPregnant,
      },
      milkProduction: milkProduction ? {
        kgPerDay: milkProduction.kgPerDay,
        fatPercent: milkProduction.fatPercent,
        proteinPercent: milkProduction.proteinPercent,
        fpcm: round(fpcm, 1),
      } : undefined,
      isGrazing,
      feedCount: feeds.length,
    },
    requirements: {
      vem: {
        maintenance: vemMaintenance,
        production: vemProduction,
        pregnancy: vemPregnancy,
        growth: vemGrowth,
        grazing: vemGrazing,
        total: vemTotalStep,
      },
      dve: {
        maintenance: dveMaintenance,
        production: dveProduction,
        pregnancy: dvePregnancy,
        growth: dveGrowth,
        total: dveTotalStep,
      },
      voc: vocResult,
    },
    supply: {
      feeds: feedContributions,
      totals: {
        dryMatterKg: totalDsStep,
        vem: totalVemStep,
        dve: totalDveStep,
        oeb: totalOebStep,
        sw: totalSwStep,
        swPerKgDs: swPerKgDsStep,
        vw: totalVwStep,
      },
      grazingSurcharge: grazingSurchargeStep,
    },
    balances: [
      {
        parameter: 'Energie (VEM)',
        requirement: round(totalVemRequired),
        supply: round(totalVem),
        balance: round(vemBalance),
        balancePercent: round(vemCoverage, 1),
        status: vemStatus,
        unit: 'VEM',
        calculation: vemBalanceStep,
      },
      {
        parameter: 'Eiwit (DVE)',
        requirement: round(totalDveRequired),
        supply: round(totalDve),
        balance: round(dveBalance),
        balancePercent: round(dveCoverage, 1),
        status: dveStatus,
        unit: 'gram',
        calculation: dveBalanceStep,
      },
      {
        parameter: 'OEB',
        requirement: 0,
        supply: round(totalOeb),
        balance: round(totalOeb),
        balancePercent: totalOeb >= 0 ? 100 : 0,
        status: totalOeb >= 0 ? 'ok' : totalOeb >= -50 ? 'warning' : 'deficient',
        unit: 'gram',
        calculation: totalOebStep,
      },
    ],
    summary: {
      totalVemRequired: round(totalVemRequired),
      totalVemSupplied: round(totalVem),
      vemBalance: round(vemBalance),
      vemCoverage: round(vemCoverage, 1),
      totalDveRequired: round(totalDveRequired),
      totalDveSupplied: round(totalDve),
      dveBalance: round(dveBalance),
      dveCoverage: round(dveCoverage, 1),
      vocCapacity: round(vocResult.vocKgDs.result, 1),
      vocUtilization: round(vocUtilization, 1),
      swPerKgDs: round(swPerKgDs, 2),
      swStatus,
    },
  };
}

// ============================================================================
// EXPORT AUDIT REPORT
// ============================================================================

export function generateAuditReport(result: AuditableCalculationResult): string {
  const lines: string[] = [];
  
  lines.push('================================================================================');
  lines.push('RANTSOENBEREKENING - AUDIT RAPPORT');
  lines.push('================================================================================');
  lines.push(`Gegenereerd: ${new Date(result.timestamp).toLocaleString('nl-NL')}`);
  lines.push('');
  
  // Inputs
  lines.push('--- INVOERGEGEVENS ---');
  lines.push(`Dierprofiel: ${result.inputs.animalProfile.name}`);
  lines.push(`Gewicht: ${result.inputs.animalProfile.weightKg} kg`);
  lines.push(`Pariteit: ${result.inputs.animalProfile.parity}`);
  lines.push(`Dagen in Melk: ${result.inputs.animalProfile.daysInMilk}`);
  lines.push(`Dagen Drachtig: ${result.inputs.animalProfile.daysPregnant}`);
  lines.push(`Beweiding: ${result.inputs.isGrazing ? 'Ja' : 'Nee'}`);
  
  if (result.inputs.milkProduction) {
    lines.push('');
    lines.push('Melkproductie:');
    lines.push(`  Melk: ${result.inputs.milkProduction.kgPerDay} kg/dag`);
    lines.push(`  Vet: ${result.inputs.milkProduction.fatPercent}%`);
    lines.push(`  Eiwit: ${result.inputs.milkProduction.proteinPercent}%`);
    lines.push(`  FPCM: ${result.inputs.milkProduction.fpcm} kg/dag`);
  }
  lines.push('');
  
  // VEM Requirements
  lines.push('--- VEM BEHOEFTE (stap voor stap) ---');
  const vemReqs = result.requirements.vem;
  lines.push(`1. ${vemReqs.maintenance.name}`);
  lines.push(`   Formule: ${vemReqs.maintenance.formula}`);
  lines.push(`   Berekening: ${vemReqs.maintenance.calculation}`);
  lines.push(`   Bron: ${vemReqs.maintenance.source}`);
  lines.push('');
  lines.push(`2. ${vemReqs.production.name}`);
  lines.push(`   Formule: ${vemReqs.production.formula}`);
  lines.push(`   Berekening: ${vemReqs.production.calculation}`);
  lines.push(`   Bron: ${vemReqs.production.source}`);
  lines.push('');
  if (vemReqs.pregnancy.result > 0) {
    lines.push(`3. ${vemReqs.pregnancy.name}`);
    lines.push(`   Formule: ${vemReqs.pregnancy.formula}`);
    lines.push(`   Berekening: ${vemReqs.pregnancy.calculation}`);
    lines.push(`   Bron: ${vemReqs.pregnancy.source}`);
    lines.push('');
  }
  if (vemReqs.growth.result > 0) {
    lines.push(`4. ${vemReqs.growth.name}`);
    lines.push(`   Berekening: ${vemReqs.growth.calculation}`);
    lines.push(`   Bron: ${vemReqs.growth.source}`);
    lines.push('');
  }
  if (vemReqs.grazing.result > 0) {
    lines.push(`5. ${vemReqs.grazing.name}`);
    lines.push(`   Formule: ${vemReqs.grazing.formula}`);
    lines.push(`   Berekening: ${vemReqs.grazing.calculation}`);
    lines.push(`   Bron: ${vemReqs.grazing.source}`);
    lines.push('');
  }
  lines.push(`TOTAAL VEM BEHOEFTE: ${vemReqs.total.result} VEM`);
  lines.push('');
  
  // DVE Requirements
  lines.push('--- DVE BEHOEFTE (stap voor stap) ---');
  const dveReqs = result.requirements.dve;
  lines.push(`1. ${dveReqs.maintenance.name}`);
  lines.push(`   Formule: ${dveReqs.maintenance.formula}`);
  lines.push(`   Berekening: ${dveReqs.maintenance.calculation}`);
  lines.push(`   Bron: ${dveReqs.maintenance.source}`);
  lines.push('');
  lines.push(`2. ${dveReqs.production.name}`);
  lines.push(`   Formule: ${dveReqs.production.formula}`);
  lines.push(`   Berekening: ${dveReqs.production.calculation}`);
  lines.push(`   Bron: ${dveReqs.production.source}`);
  lines.push('');
  lines.push(`TOTAAL DVE BEHOEFTE: ${dveReqs.total.result} gram`);
  lines.push('');
  
  // VOC
  lines.push('--- VOC BEREKENING ---');
  const voc = result.requirements.voc;
  lines.push(`${voc.lactationAge.name}: ${voc.lactationAge.calculation}`);
  lines.push(`${voc.maturityComponent.name}: ${voc.maturityComponent.calculation}`);
  lines.push(`${voc.lactationComponent.name}: ${voc.lactationComponent.calculation}`);
  lines.push(`${voc.pregnancyComponent.name}: ${voc.pregnancyComponent.calculation}`);
  lines.push(`${voc.vocTotal.name}: ${voc.vocTotal.calculation}`);
  lines.push(`${voc.vocKgDs.name}: ${voc.vocKgDs.calculation}`);
  lines.push('');
  
  // Feed contributions
  lines.push('--- VOERMIDDELEN BIJDRAGE ---');
  for (const feed of result.supply.feeds) {
    lines.push(`${feed.displayName}:`);
    lines.push(`  Hoeveelheid: ${feed.amountKgDs} kg DS (${feed.amountKgProduct} kg product, ${feed.dsPercent}% DS)`);
    lines.push(`  VEM: ${feed.contributions.vem.calculation}`);
    lines.push(`  DVE: ${feed.contributions.dve.calculation}`);
    lines.push(`  OEB: ${feed.contributions.oeb.calculation}`);
    lines.push(`  SW: ${feed.contributions.sw.calculation}`);
    lines.push(`  VW: ${feed.contributions.vw.calculation}`);
    lines.push('');
  }
  
  // Totals
  lines.push('--- TOTAAL AANBOD ---');
  lines.push(`Droge Stof: ${result.supply.totals.dryMatterKg.result} kg DS`);
  lines.push(`VEM: ${result.supply.totals.vem.result} VEM`);
  lines.push(`DVE: ${result.supply.totals.dve.result} gram`);
  lines.push(`OEB: ${result.supply.totals.oeb.result} gram`);
  lines.push(`SW per kg DS: ${result.supply.totals.swPerKgDs.result} (minimum 1.00)`);
  lines.push(`VW: ${result.supply.totals.vw.result}`);
  lines.push('');
  
  // Summary
  lines.push('--- SAMENVATTING ---');
  lines.push(`VEM: ${result.summary.totalVemSupplied} / ${result.summary.totalVemRequired} = ${result.summary.vemCoverage}% dekking`);
  lines.push(`DVE: ${result.summary.totalDveSupplied} / ${result.summary.totalDveRequired} = ${result.summary.dveCoverage}% dekking`);
  lines.push(`VOC: ${result.summary.vocUtilization}% benut van ${result.summary.vocCapacity} kg DS capaciteit`);
  lines.push(`Structuurwaarde: ${result.summary.swPerKgDs} SW/kg DS - ${result.summary.swStatus}`);
  lines.push('');
  lines.push('================================================================================');
  
  return lines.join('\n');
}
