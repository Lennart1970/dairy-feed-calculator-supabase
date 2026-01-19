/**
 * Mode B: Harvest Prediction & Crop Plan Constants
 * Based on CVB 2025, AgruniekRijnvallei Inventory Guide, Report 20
 * 
 * Sources:
 * - [336] CVB 2025 - Maize Silage Quality
 * - [121] CVB 2025 - Grass Silage Quality
 * - [228] Report 20 - Grass Yield Intensive Farming
 * - [229] Report 20 - Maize Yield Intensive Farming
 * - [46] AgruniekRijnvallei - Roughage Demand Rules
 */

// Quality Presets for Harvest Forecast
export const QUALITY_PRESETS = {
  topkwaliteit: {
    maize: {
      vem: 990,      // VEM/kg DS [Source 336]
      dve: 52,       // g/kg DS [Source 336]
      oeb: -40,      // g/kg DS (negative!) [Source 336]
      sw: 1.65,      // Structure value (low) [Source 337]
    },
    grass: {
      vem: 960,      // VEM/kg DS [Source 121]
      dve: 75,       // g/kg DS [Source 121]
      oeb: 30,       // g/kg DS [Source 30]
      sw: 2.80,      // Structure value [Source 121]
    },
  },
  gemiddeld: {
    maize: {
      vem: 950,
      dve: 48,
      oeb: -45,
      sw: 1.60,
    },
    grass: {
      vem: 920,
      dve: 70,
      oeb: 20,
      sw: 2.60,
    },
  },
  sober: {
    maize: {
      vem: 900,
      dve: 44,
      oeb: -50,
      sw: 1.50,
    },
    grass: {
      vem: 880,
      dve: 65,
      oeb: 10,
      sw: 2.40,
    },
  },
} as const;

export type QualityLevel = keyof typeof QUALITY_PRESETS;

// Roughage demand constants (kg DS/day per animal)
export const ROUGHAGE_DEMAND = {
  COW: 15,           // kg DS/day [Source 84, 85]
  YOUNG_JUNIOR: 5,   // kg DS/day (< 1 year) [Source 85]
  YOUNG_SENIOR: 8,   // kg DS/day (> 1 year) [Source 85]
} as const;

// Byproduct constants for purchase recommendations
export const BYPRODUCTS = {
  bierbostel: {
    name: 'Bierbostel (Brewers Grains)',
    dsPercent: 22,
    tonsPerLoad: 30,
    reason: 'Uw ruwvoer is laag in structuur (SW {sw}) en eiwit (OEB {oeb}). Bierbostel vult beide gaten.',
  },
  sojaschilfers: {
    name: 'Sojaschilfers (Soy Hulls)',
    dsPercent: 90,
    tonsPerLoad: 25,
    reason: 'Uw ruwvoer heeft een negatief OEB ({oeb}). Sojaschilfers zijn eiwitrijk.',
  },
  maiskuil: {
    name: 'Extra Maïskuil',
    dsPercent: 100,
    tonsPerLoad: 35,
    reason: 'Algemeen ruwvoertekort. Extra maïskuil is de meest kosteneffectieve optie.',
  },
} as const;

/**
 * Calculate annual supply from crop plan
 */
export function calculateAnnualSupply(farm: {
  hectares_maize: number;
  hectares_grass: number;
  yield_maize_ton_ds_ha: number;
  yield_grass_ton_ds_ha: number;
}): {
  maize: number;
  grass: number;
  total: number;
} {
  const maizeSupply = farm.hectares_maize * farm.yield_maize_ton_ds_ha * 1000; // kg DS
  const grassSupply = farm.hectares_grass * farm.yield_grass_ton_ds_ha * 1000; // kg DS
  
  return {
    maize: Math.round(maizeSupply),
    grass: Math.round(grassSupply),
    total: Math.round(maizeSupply + grassSupply),
  };
}

/**
 * Calculate annual demand using 15 kg rule
 */
export function calculateAnnualDemand(
  cowCount: number,
  youngJuniorCount: number,
  youngSeniorCount: number
): number {
  const cowDemand = cowCount * ROUGHAGE_DEMAND.COW * 365;
  const juniorDemand = youngJuniorCount * ROUGHAGE_DEMAND.YOUNG_JUNIOR * 365;
  const seniorDemand = youngSeniorCount * ROUGHAGE_DEMAND.YOUNG_SENIOR * 365;
  
  return Math.round(cowDemand + juniorDemand + seniorDemand);
}

/**
 * Calculate deficit and coverage percentage
 */
export function calculateDeficit(supply: number, demand: number): {
  deficit: number;
  deficitTons: number;
  percentageCovered: number;
  isShortage: boolean;
} {
  const deficit = demand - supply;
  const percentageCovered = (supply / demand) * 100;
  
  return {
    deficit: Math.round(deficit),
    deficitTons: Math.round(deficit / 1000 * 10) / 10, // Convert to tons with 1 decimal
    percentageCovered: Math.round(percentageCovered),
    isShortage: deficit > 0,
  };
}

/**
 * Calculate projected empty date
 */
export function calculateEmptyDate(supply: number, dailyDemand: number): Date {
  const daysRemaining = Math.floor(supply / dailyDemand);
  const today = new Date();
  const emptyDate = new Date(today);
  emptyDate.setDate(today.getDate() + daysRemaining);
  return emptyDate;
}

/**
 * Smart purchase recommendation based on structure and protein gaps
 */
export function recommendPurchase(
  deficit: number,
  qualityLevel: QualityLevel,
  cropPlan: { maize: number; grass: number; total: number }
): {
  product: string;
  reason: string;
  quantityTons: number;
  quantityLoads: number;
  byproductKey: keyof typeof BYPRODUCTS;
} {
  const quality = QUALITY_PRESETS[qualityLevel];
  
  // Calculate weighted averages based on crop mix
  const maizeRatio = cropPlan.maize / cropPlan.total;
  const grassRatio = cropPlan.grass / cropPlan.total;
  
  const avgStructure = (quality.maize.sw * maizeRatio) + (quality.grass.sw * grassRatio);
  const avgOEB = (quality.maize.oeb * maizeRatio) + (quality.grass.oeb * grassRatio);
  
  // Recommendation logic
  if (avgStructure < 2.0 && avgOEB < 0) {
    // Low structure AND negative OEB → Recommend Bierbostel
    const byproduct = BYPRODUCTS.bierbostel;
    const quantityTons = Math.ceil(deficit / (byproduct.dsPercent * 10));
    return {
      product: byproduct.name,
      reason: byproduct.reason
        .replace('{sw}', avgStructure.toFixed(2))
        .replace('{oeb}', avgOEB.toFixed(0)),
      quantityTons,
      quantityLoads: Math.ceil(quantityTons / byproduct.tonsPerLoad),
      byproductKey: 'bierbostel',
    };
  } else if (avgOEB < -20) {
    // Negative OEB → Recommend Soy Hulls
    const byproduct = BYPRODUCTS.sojaschilfers;
    const quantityTons = Math.ceil(deficit / (byproduct.dsPercent * 10));
    return {
      product: byproduct.name,
      reason: byproduct.reason.replace('{oeb}', avgOEB.toFixed(0)),
      quantityTons,
      quantityLoads: Math.ceil(quantityTons / byproduct.tonsPerLoad),
      byproductKey: 'sojaschilfers',
    };
  } else {
    // Default: Buy more maize
    const byproduct = BYPRODUCTS.maiskuil;
    const quantityTons = Math.ceil(deficit / 1000);
    return {
      product: byproduct.name,
      reason: byproduct.reason,
      quantityTons,
      quantityLoads: Math.ceil(quantityTons / byproduct.tonsPerLoad),
      byproductKey: 'maiskuil',
    };
  }
}

/**
 * Calculate annual VEM demand using CVB 2022 metabolic weight formula
 * This is the "True Demand" that accounts for maintenance + production
 */
export function calculateAnnualVemDemand(params: {
  groups: Array<{
    cowCount: number;
    avgWeightKg: number;
    avgMilkYieldKg: number;
    lifeStage: string;
  }>;
  youngJuniorCount: number;
  youngSeniorCount: number;
}): {
  cowsVem: number;
  youngstockVem: number;
  totalVem: number;
  breakdown: Array<{
    name: string;
    count: number;
    dailyVem: number;
    annualVem: number;
  }>;
} {
  const DAYS_IN_YEAR = 365;
  const VEM_MAINTENANCE_COEFFICIENT = 42.4; // CVB 2022 [Source 373, 784]
  const VEM_PER_KG_MILK = 442; // CVB 2025 [Source 785]
  const AVG_YOUNGSTOCK_JUNIOR_VEM = 5000; // CVB Table 1.5 [Source 773]
  const AVG_YOUNGSTOCK_SENIOR_VEM = 6500; // CVB Table 1.5 [Source 773]

  let totalCowsVem = 0;
  const breakdown = [];

  // Calculate for each herd group
  for (const group of params.groups) {
    const metabolicWeight = Math.pow(group.avgWeightKg, 0.75);
    const maintenance = VEM_MAINTENANCE_COEFFICIENT * metabolicWeight;
    
    // Production VEM (0 for dry cows)
    const production = group.lifeStage === 'dry' ? 0 : VEM_PER_KG_MILK * group.avgMilkYieldKg;
    
    const dailyVem = maintenance + production;
    const annualVem = dailyVem * group.cowCount * DAYS_IN_YEAR;
    
    totalCowsVem += annualVem;
    
    breakdown.push({
      name: group.lifeStage === 'dry' ? 'Droogstaand' : `Lactatie (${group.avgMilkYieldKg} kg)`,
      count: group.cowCount,
      dailyVem: Math.round(dailyVem),
      annualVem: Math.round(annualVem),
    });
  }

  // Youngstock
  const youngJuniorVem = params.youngJuniorCount * AVG_YOUNGSTOCK_JUNIOR_VEM * DAYS_IN_YEAR;
  const youngSeniorVem = params.youngSeniorCount * AVG_YOUNGSTOCK_SENIOR_VEM * DAYS_IN_YEAR;
  const totalYoungstockVem = youngJuniorVem + youngSeniorVem;

  if (params.youngJuniorCount > 0) {
    breakdown.push({
      name: 'Jongvee <1 jaar',
      count: params.youngJuniorCount,
      dailyVem: AVG_YOUNGSTOCK_JUNIOR_VEM,
      annualVem: Math.round(youngJuniorVem),
    });
  }

  if (params.youngSeniorCount > 0) {
    breakdown.push({
      name: 'Jongvee >1 jaar',
      count: params.youngSeniorCount,
      dailyVem: AVG_YOUNGSTOCK_SENIOR_VEM,
      annualVem: Math.round(youngSeniorVem),
    });
  }

  return {
    cowsVem: Math.round(totalCowsVem),
    youngstockVem: Math.round(totalYoungstockVem),
    totalVem: Math.round(totalCowsVem + totalYoungstockVem),
    breakdown,
  };
}

/**
 * Calculate annual VEM supply from crop plan with lab quality
 * This multiplies physical volume (kg DS) by nutritional quality (VEM/kg)
 */
export function calculateAnnualVemSupply(params: {
  hectares_maize: number;
  hectares_grass: number;
  yield_maize_ton_ds_ha: number;
  yield_grass_ton_ds_ha: number;
  quality_level: QualityLevel;
  labResults?: Array<{
    feedType: 'maize' | 'grass';
    vem: number;
  }>;
}): {
  maizeVem: number;
  grassVem: number;
  totalVem: number;
  maizeKgDs: number;
  grassKgDs: number;
  maizeVemPerKg: number;
  grassVemPerKg: number;
} {
  // Physical volume (kg DS)
  const maizeKgDs = params.hectares_maize * params.yield_maize_ton_ds_ha * 1000;
  const grassKgDs = params.hectares_grass * params.yield_grass_ton_ds_ha * 1000;

  // Nutritional quality (VEM/kg) - Use lab results if available, otherwise CVB defaults
  const labMaize = params.labResults?.find(r => r.feedType === 'maize');
  const labGrass = params.labResults?.find(r => r.feedType === 'grass');

  const maizeVemPerKg = labMaize?.vem || QUALITY_PRESETS[params.quality_level].maize.vem;
  const grassVemPerKg = labGrass?.vem || QUALITY_PRESETS[params.quality_level].grass.vem;

  // Total VEM = kg DS × VEM/kg [Source 475, 477]
  const maizeVem = maizeKgDs * maizeVemPerKg;
  const grassVem = grassKgDs * grassVemPerKg;

  return {
    maizeVem: Math.round(maizeVem),
    grassVem: Math.round(grassVem),
    totalVem: Math.round(maizeVem + grassVem),
    maizeKgDs: Math.round(maizeKgDs),
    grassKgDs: Math.round(grassKgDs),
    maizeVemPerKg,
    grassVemPerKg,
  };
}

/**
 * Calculate the annual VEM gap and commercial requirements
 */
export function calculateAnnualVemGap(
  demandVem: number,
  supplyVem: number,
  concentrateVemPerKg: number = 1050
): {
  vemDeficit: number;
  selfSufficiencyPercent: number;
  concentrateKgNeeded: number;
  concentrateTonsNeeded: number;
  truckloadsNeeded: number;
  isShortage: boolean;
} {
  const vemDeficit = demandVem - supplyVem;
  const selfSufficiencyPercent = (supplyVem / demandVem) * 100;
  
  // Convert VEM deficit to concentrate kg [Source 48, 49]
  const concentrateKgNeeded = Math.max(0, vemDeficit / concentrateVemPerKg);
  const concentrateTonsNeeded = concentrateKgNeeded / 1000;
  
  // Truckloads (assuming 30 tons per truck)
  const truckloadsNeeded = Math.ceil(concentrateTonsNeeded / 30);

  return {
    vemDeficit: Math.round(vemDeficit),
    selfSufficiencyPercent: Math.round(selfSufficiencyPercent * 10) / 10,
    concentrateKgNeeded: Math.round(concentrateKgNeeded),
    concentrateTonsNeeded: Math.round(concentrateTonsNeeded * 10) / 10,
    truckloadsNeeded,
    isShortage: vemDeficit > 0,
  };
}
