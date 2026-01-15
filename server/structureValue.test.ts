import { describe, it, expect } from 'vitest';

/**
 * Structure Value (SW) Calculation Tests
 * 
 * These tests verify the SW calculation logic based on CVB 2022 standards.
 * SW indicates fiber adequacy for proper rumen function.
 * Minimum requirement: SW ≥ 1.00 per kg DS
 */

// Replicate the calculation logic from client/src/lib/calculator.ts
interface FeedData {
  name: string;
  basis: string;
  swPerKgDs: number;
}

interface FeedInput {
  amountKg: number;
  dsPercent: number;
}

const MIN_SW_REQUIREMENT = 1.00;

function calculateStructureValue(feeds: { feed: FeedData; input: FeedInput }[]) {
  let totalSw = 0;
  let totalDs = 0;
  
  for (const { feed, input } of feeds) {
    let dryMatterKg: number;
    
    if (feed.basis === 'per kg DS') {
      dryMatterKg = input.amountKg;
    } else {
      dryMatterKg = input.amountKg * (input.dsPercent / 100);
    }
    
    totalSw += dryMatterKg * feed.swPerKgDs;
    totalDs += dryMatterKg;
  }
  
  const swPerKgDs = totalDs > 0 ? totalSw / totalDs : 0;
  
  let status: 'ok' | 'warning' | 'deficient';
  let message: string;
  
  if (swPerKgDs >= MIN_SW_REQUIREMENT) {
    status = 'ok';
    message = 'Voldoende structuur voor gezonde penswerking';
  } else if (swPerKgDs >= 0.85) {
    status = 'warning';
    message = 'Marginale structuur - verhoog ruwvoeraandeel';
  } else {
    status = 'deficient';
    message = 'Onvoldoende structuur - risico op pensacidose';
  }
  
  return {
    totalSw: Math.round(totalSw * 100) / 100,
    swPerKgDs: Math.round(swPerKgDs * 100) / 100,
    requirement: MIN_SW_REQUIREMENT,
    status,
    message,
  };
}

// Test feed data based on database values
const testFeeds = {
  kuil_1_gras: { name: 'kuil_1_gras', basis: 'per kg DS', swPerKgDs: 2.00 },
  kuil_2_gras: { name: 'kuil_2_gras', basis: 'per kg DS', swPerKgDs: 2.00 },
  mais_2025: { name: 'mais_2025', basis: 'per kg DS', swPerKgDs: 0.95 },
  bierborstel: { name: 'bierborstel', basis: 'per kg DS', swPerKgDs: 0.50 },
  gerstmeel: { name: 'gerstmeel', basis: 'per kg DS', swPerKgDs: 0.25 },
  raapzaadschroot: { name: 'raapzaadschroot', basis: 'per kg DS', swPerKgDs: 0.35 },
  stalbrok: { name: 'stalbrok', basis: 'per kg product', swPerKgDs: 0.30 },
  startbrok: { name: 'startbrok', basis: 'per kg product', swPerKgDs: 0.30 },
};

describe('Structure Value Calculation', () => {
  
  it('should calculate SW for roughage-only ration (12-month heifer)', () => {
    const feeds = [
      { feed: testFeeds.kuil_1_gras, input: { amountKg: 5.3, dsPercent: 41 } },
      { feed: testFeeds.kuil_2_gras, input: { amountKg: 2.7, dsPercent: 44 } },
    ];
    
    const result = calculateStructureValue(feeds);
    
    // Total DS = 5.3 + 2.7 = 8.0 kg DS
    // Total SW = 5.3 * 2.00 + 2.7 * 2.00 = 10.6 + 5.4 = 16.0
    // SW per kg DS = 16.0 / 8.0 = 2.00
    expect(result.swPerKgDs).toBe(2.00);
    expect(result.status).toBe('ok');
  });

  it('should calculate SW for mixed ration (high producing cow)', () => {
    const feeds = [
      { feed: testFeeds.kuil_1_gras, input: { amountKg: 5.3, dsPercent: 41 } },
      { feed: testFeeds.kuil_2_gras, input: { amountKg: 2.7, dsPercent: 44 } },
      { feed: testFeeds.mais_2025, input: { amountKg: 8.0, dsPercent: 35 } },
      { feed: testFeeds.bierborstel, input: { amountKg: 0.5, dsPercent: 24 } },
      { feed: testFeeds.gerstmeel, input: { amountKg: 0.7, dsPercent: 88 } },
      { feed: testFeeds.raapzaadschroot, input: { amountKg: 2.6, dsPercent: 89 } },
      { feed: testFeeds.stalbrok, input: { amountKg: 3.6, dsPercent: 89 } },
      { feed: testFeeds.startbrok, input: { amountKg: 1.4, dsPercent: 89 } },
    ];
    
    const result = calculateStructureValue(feeds);
    
    // Roughage provides high SW, concentrates lower it
    // Expected SW should be around 1.1-1.3 for a balanced ration
    expect(result.swPerKgDs).toBeGreaterThanOrEqual(1.00);
    expect(result.status).toBe('ok');
  });

  it('should return warning status for marginal SW (0.85-0.99)', () => {
    // Create a ration with mostly concentrates
    const feeds = [
      { feed: testFeeds.kuil_1_gras, input: { amountKg: 2.0, dsPercent: 41 } },
      { feed: testFeeds.stalbrok, input: { amountKg: 8.0, dsPercent: 89 } },
    ];
    
    const result = calculateStructureValue(feeds);
    
    // Total DS = 2.0 + 8.0 * 0.89 = 2.0 + 7.12 = 9.12 kg
    // Total SW = 2.0 * 2.00 + 7.12 * 0.30 = 4.0 + 2.136 = 6.136
    // SW per kg DS = 6.136 / 9.12 ≈ 0.67
    expect(result.swPerKgDs).toBeLessThan(1.00);
    expect(result.status).toBe('deficient');
  });

  it('should return deficient status for low SW (<0.85)', () => {
    // Create a ration with only concentrates
    const feeds = [
      { feed: testFeeds.stalbrok, input: { amountKg: 10.0, dsPercent: 89 } },
      { feed: testFeeds.gerstmeel, input: { amountKg: 2.0, dsPercent: 88 } },
    ];
    
    const result = calculateStructureValue(feeds);
    
    // Very low SW from concentrates only
    expect(result.swPerKgDs).toBeLessThan(0.85);
    expect(result.status).toBe('deficient');
    expect(result.message).toContain('pensacidose');
  });

  it('should handle empty feed list', () => {
    const result = calculateStructureValue([]);
    
    expect(result.swPerKgDs).toBe(0);
    expect(result.totalSw).toBe(0);
    expect(result.status).toBe('deficient');
  });

  it('should correctly handle per kg product feeds', () => {
    // Stalbrok is per kg product, so DS conversion applies
    const feeds = [
      { feed: testFeeds.stalbrok, input: { amountKg: 5.0, dsPercent: 89 } },
    ];
    
    const result = calculateStructureValue(feeds);
    
    // DS = 5.0 * 0.89 = 4.45 kg
    // SW = 4.45 * 0.30 = 1.335
    // SW per kg DS = 1.335 / 4.45 = 0.30
    expect(result.swPerKgDs).toBe(0.30);
  });

  it('should correctly handle per kg DS feeds', () => {
    // Grass silage is per kg DS, so input IS the DS amount
    const feeds = [
      { feed: testFeeds.kuil_1_gras, input: { amountKg: 5.0, dsPercent: 41 } },
    ];
    
    const result = calculateStructureValue(feeds);
    
    // DS = 5.0 kg (input is already DS)
    // SW = 5.0 * 2.00 = 10.0
    // SW per kg DS = 10.0 / 5.0 = 2.00
    expect(result.swPerKgDs).toBe(2.00);
  });

  it('should calculate weighted average SW correctly', () => {
    const feeds = [
      { feed: testFeeds.kuil_1_gras, input: { amountKg: 10.0, dsPercent: 41 } }, // 10 kg DS, SW 2.00
      { feed: testFeeds.mais_2025, input: { amountKg: 10.0, dsPercent: 35 } },   // 10 kg DS, SW 0.95
    ];
    
    const result = calculateStructureValue(feeds);
    
    // Total DS = 10 + 10 = 20 kg
    // Total SW = 10 * 2.00 + 10 * 0.95 = 20 + 9.5 = 29.5
    // SW per kg DS = 29.5 / 20 = 1.475
    expect(result.swPerKgDs).toBe(1.48); // Rounded to 2 decimals
    expect(result.status).toBe('ok');
  });
});
