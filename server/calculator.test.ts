import { describe, expect, it } from "vitest";

// Import the calculation functions - we'll test the logic directly
// Since the calculator is client-side, we'll replicate the core logic for testing

// Constants from the calculator
const GRAZING_SURCHARGE_VEM = 1175;

// Test data matching the seeded database
const testFeeds = {
  grassSilage: {
    name: "grass_silage",
    displayName: "Grass Silage (Graskuil)",
    basis: "per kg DS",
    vemPerUnit: 908,
    dvePerUnit: 80,
    oebPerUnit: 19,
    caPerUnit: 5.0,
    pPerUnit: 4.0,
    defaultDsPercent: 45,
  },
  maizeSilage: {
    name: "maize_silage",
    displayName: "Maize Silage (Snijmais)",
    basis: "per kg DS",
    vemPerUnit: 916,
    dvePerUnit: 51,
    oebPerUnit: -38,
    caPerUnit: 1.6,
    pPerUnit: 2.0,
    defaultDsPercent: 32,
  },
  standardPellets: {
    name: "standard_pellets",
    displayName: "Standard Pellets (Standaardbrok)",
    basis: "per kg product",
    vemPerUnit: 940,
    dvePerUnit: 90,
    oebPerUnit: 0,
    caPerUnit: 8.0,
    pPerUnit: 5.0,
    defaultDsPercent: 88,
  },
};

const testProfiles = {
  heifer: {
    id: 1,
    name: "12-Month Heifer",
    description: "Growing heifer targeting 860g/day growth",
    notes: "Standard youngstock profile based on CVB 2025",
    weightKg: 329,
    vemTarget: 6110,
    dveTargetGrams: 355,
    maxBdsKg: 7.9,
  },
  lactatingAdult: {
    id: 2,
    name: "Lactating Adult (30kg milk)",
    description: "High-producing cow at 30kg milk/day",
    notes: "Includes 10% movement surcharge",
    weightKg: 675,
    vemTarget: 18945,
    dveTargetGrams: 1742,
    maxBdsKg: 23.0,
  },
};

// Calculation functions (replicated from client-side for testing)
interface FeedData {
  basis: string;
  vemPerUnit: number;
  dvePerUnit: number;
  oebPerUnit: number;
  caPerUnit: number;
  pPerUnit: number;
}

interface FeedInput {
  amountKg: number;
  dsPercent: number;
}

interface NutrientSupply {
  dryMatterKg: number;
  vem: number;
  dveGrams: number;
  oebGrams: number;
  caGrams: number;
  pGrams: number;
}

function calculateFeedSupply(feed: FeedData, input: FeedInput): NutrientSupply {
  let dryMatterKg: number;
  let nutrientMultiplier: number;

  if (feed.basis === "per kg DS") {
    dryMatterKg = input.amountKg * (input.dsPercent / 100);
    nutrientMultiplier = dryMatterKg;
  } else {
    dryMatterKg = input.amountKg * (input.dsPercent / 100);
    nutrientMultiplier = input.amountKg;
  }

  return {
    dryMatterKg,
    vem: nutrientMultiplier * feed.vemPerUnit,
    dveGrams: nutrientMultiplier * feed.dvePerUnit,
    oebGrams: nutrientMultiplier * feed.oebPerUnit,
    caGrams: nutrientMultiplier * feed.caPerUnit,
    pGrams: nutrientMultiplier * feed.pPerUnit,
  };
}

function calculateTotalSupply(
  feeds: { feed: FeedData; input: FeedInput }[],
  isGrazing: boolean
): NutrientSupply {
  const total: NutrientSupply = {
    dryMatterKg: 0,
    vem: 0,
    dveGrams: 0,
    oebGrams: 0,
    caGrams: 0,
    pGrams: 0,
  };

  for (const { feed, input } of feeds) {
    const supply = calculateFeedSupply(feed, input);
    total.dryMatterKg += supply.dryMatterKg;
    total.vem += supply.vem;
    total.dveGrams += supply.dveGrams;
    total.oebGrams += supply.oebGrams;
    total.caGrams += supply.caGrams;
    total.pGrams += supply.pGrams;
  }

  if (isGrazing) {
    total.vem += GRAZING_SURCHARGE_VEM;
  }

  return total;
}

describe("Dairy Feed Calculator - Nutrient Calculations", () => {
  describe("calculateFeedSupply", () => {
    it("calculates grass silage supply correctly (per kg DS basis)", () => {
      const input: FeedInput = { amountKg: 10, dsPercent: 45 };
      const supply = calculateFeedSupply(testFeeds.grassSilage, input);

      // 10kg fresh × 45% DS = 4.5 kg DS
      expect(supply.dryMatterKg).toBe(4.5);
      // 4.5 kg DS × 908 VEM = 4086 VEM
      expect(supply.vem).toBe(4086);
      // 4.5 kg DS × 80g DVE = 360g DVE
      expect(supply.dveGrams).toBe(360);
      // 4.5 kg DS × 19g OEB = 85.5g OEB
      expect(supply.oebGrams).toBe(85.5);
    });

    it("calculates maize silage supply correctly", () => {
      const input: FeedInput = { amountKg: 15, dsPercent: 32 };
      const supply = calculateFeedSupply(testFeeds.maizeSilage, input);

      // 15kg fresh × 32% DS = 4.8 kg DS
      expect(supply.dryMatterKg).toBe(4.8);
      // 4.8 kg DS × 916 VEM = 4396.8 VEM
      expect(supply.vem).toBeCloseTo(4396.8, 1);
      // 4.8 kg DS × -38g OEB = -182.4g OEB (negative!)
      expect(supply.oebGrams).toBeCloseTo(-182.4, 1);
    });

    it("calculates standard pellets supply correctly (per kg product basis)", () => {
      const input: FeedInput = { amountKg: 2, dsPercent: 88 };
      const supply = calculateFeedSupply(testFeeds.standardPellets, input);

      // 2kg × 88% DS = 1.76 kg DS (for intake tracking)
      expect(supply.dryMatterKg).toBeCloseTo(1.76, 2);
      // 2kg product × 940 VEM = 1880 VEM (uses fresh weight for nutrients)
      expect(supply.vem).toBe(1880);
      // 2kg product × 90g DVE = 180g DVE
      expect(supply.dveGrams).toBe(180);
    });
  });

  describe("calculateTotalSupply", () => {
    it("sums nutrients from multiple feeds correctly", () => {
      const feeds = [
        { feed: testFeeds.grassSilage, input: { amountKg: 10, dsPercent: 45 } },
        { feed: testFeeds.maizeSilage, input: { amountKg: 5, dsPercent: 32 } },
        { feed: testFeeds.standardPellets, input: { amountKg: 1, dsPercent: 88 } },
      ];

      const total = calculateTotalSupply(feeds, false);

      // Grass: 4.5 kg DS, Maize: 1.6 kg DS, Pellets: 0.88 kg DS = 6.98 kg DS
      expect(total.dryMatterKg).toBeCloseTo(6.98, 2);

      // Grass: 4086 VEM, Maize: 1465.6 VEM, Pellets: 940 VEM = 6491.6 VEM
      expect(total.vem).toBeCloseTo(6491.6, 1);
    });

    it("adds grazing surcharge when grazing is enabled", () => {
      const feeds = [
        { feed: testFeeds.grassSilage, input: { amountKg: 10, dsPercent: 45 } },
      ];

      const withoutGrazing = calculateTotalSupply(feeds, false);
      const withGrazing = calculateTotalSupply(feeds, true);

      expect(withGrazing.vem - withoutGrazing.vem).toBe(GRAZING_SURCHARGE_VEM);
      expect(withGrazing.vem - withoutGrazing.vem).toBe(1175);
    });

    it("handles zero feed amounts correctly", () => {
      const feeds = [
        { feed: testFeeds.grassSilage, input: { amountKg: 0, dsPercent: 45 } },
        { feed: testFeeds.maizeSilage, input: { amountKg: 0, dsPercent: 32 } },
      ];

      const total = calculateTotalSupply(feeds, false);

      expect(total.dryMatterKg).toBe(0);
      expect(total.vem).toBe(0);
      expect(total.dveGrams).toBe(0);
    });
  });

  describe("Heifer ration example", () => {
    it("validates a balanced heifer ration", () => {
      // Example ration for 12-month heifer from the Excel spreadsheet
      const feeds = [
        { feed: testFeeds.grassSilage, input: { amountKg: 12, dsPercent: 45 } },
        { feed: testFeeds.maizeSilage, input: { amountKg: 5, dsPercent: 32 } },
        { feed: testFeeds.standardPellets, input: { amountKg: 1, dsPercent: 88 } },
      ];

      const total = calculateTotalSupply(feeds, false);
      const profile = testProfiles.heifer;

      // Check if ration meets requirements
      const vemBalance = total.vem - profile.vemTarget;
      const dveBalance = total.dveGrams - profile.dveTargetGrams;
      const bdsWithinLimit = total.dryMatterKg <= profile.maxBdsKg;

      // Grass: 5.4 kg DS × 908 = 4903.2 VEM
      // Maize: 1.6 kg DS × 916 = 1465.6 VEM
      // Pellets: 1 kg × 940 = 940 VEM
      // Total: 7308.8 VEM vs 6110 requirement = +1198.8 surplus
      expect(total.vem).toBeCloseTo(7308.8, 0);
      expect(vemBalance).toBeGreaterThan(0);

      // Grass: 5.4 × 80 = 432g DVE
      // Maize: 1.6 × 51 = 81.6g DVE
      // Pellets: 1 × 90 = 90g DVE
      // Total: 603.6g vs 355g requirement = +248.6g surplus
      expect(total.dveGrams).toBeCloseTo(603.6, 0);
      expect(dveBalance).toBeGreaterThan(0);

      // DS: 5.4 + 1.6 + 0.88 = 7.88 kg vs 7.9 kg max
      expect(bdsWithinLimit).toBe(true);
    });
  });
});
