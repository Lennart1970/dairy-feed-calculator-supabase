# Farm Management System - Technical Implementation Plan

## Executive Summary

This document outlines the plan to evolve the current **individual cow calculator** into a comprehensive **Farm Management System** (Bedrijfsmanagement Systeem) that handles:

1. **Herd-level calculations** (not just single cow)
2. **Inventory management** (roughage position, silo tracking)
3. **Logistics & ordering** (loading lists, order advice)
4. **Economic optimization** (voersaldo, cost tracking)

Based on CVB 2025 standards and Dutch feed industry specifications.

---

## Current State vs. Target State

| Feature | Current | Target |
|---------|---------|--------|
| Calculation unit | Single cow | Herd groups + individual cows |
| Animal profiles | 5 fixed profiles | Dynamic per-cow profiles |
| Feed inventory | None | Full pit/silo tracking |
| Ordering | None | Automated order advice |
| Logistics | None | Loading lists (Laadlijst) |
| Economics | None | Voersaldo per cow/day |
| Multi-breed | Holstein only | HF, Jersey, MRIJ |

---

## System Architecture

### 4-Step Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FARM MANAGEMENT SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: DEMAND          STEP 2: SUPPLY         STEP 3: OPTIMIZE    │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐     │
│  │ Animal       │       │ Roughage     │       │ Gap Analysis │     │
│  │ Profiles     │──────▶│ Inventory    │──────▶│ + Concentr.  │     │
│  │ (Vee-eis)    │       │ (Ruwvoer)    │       │ (Optimalisatie)│   │
│  └──────────────┘       └──────────────┘       └──────────────┘     │
│         │                      │                      │              │
│         ▼                      ▼                      ▼              │
│  • Breed selection      • Lab analysis         • Substitution       │
│  • Life stage           • Pit inventory        • Traffic lights     │
│  • Production targets   • Quality data         • Safety limits      │
│  • Physiological status • Mix ratios           • Final ration       │
│                                                                      │
│                         STEP 4: EXECUTE                              │
│                    ┌──────────────────────┐                         │
│                    │ Logistics & Orders   │                         │
│                    │ (Uitvoering)         │                         │
│                    └──────────────────────┘                         │
│                              │                                       │
│                              ▼                                       │
│                    • Loading list (Laadlijst)                       │
│                    • Order advice (Besteladvies)                    │
│                    • Inventory countdown                            │
│                    • Voersaldo calculation                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema Enhancement

### New Tables Required

#### 1.1 `farms` - Farm Master Data
```sql
CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_user_id UUID REFERENCES auth.users(id),
    location VARCHAR(200),
    herd_size INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.2 `breed_constants` - Breed-Specific Modifiers
```sql
CREATE TABLE breed_constants (
    id SERIAL PRIMARY KEY,
    breed_name VARCHAR(50) NOT NULL,  -- 'Holstein-Friesian', 'Jersey', 'MRIJ'
    breed_code VARCHAR(10) NOT NULL,  -- 'HF', 'JER', 'MRIJ'
    
    -- Maintenance Energy Modifier (CVB Source 22)
    -- Holstein = 1.0, Jersey = 1.15 (Higher metabolic rate)
    maintenance_factor DECIMAL(4,3) DEFAULT 1.000,
    
    -- Intake Capacity Modifier (CVB Source 22)
    -- Holstein = 1.0, Jersey = 1.25 (eats more per kg BW), MRIJ = 0.95
    voc_factor DECIMAL(4,3) DEFAULT 1.000,
    
    -- Default Body Weight (kg)
    default_weight_kg INT DEFAULT 675,
    
    -- Default milk composition
    default_fat_percent DECIMAL(4,2) DEFAULT 4.40,
    default_protein_percent DECIMAL(4,2) DEFAULT 3.50,
    
    is_active BOOLEAN DEFAULT true
);

-- Initial data
INSERT INTO breed_constants (breed_name, breed_code, maintenance_factor, voc_factor, default_weight_kg) VALUES
('Holstein-Friesian', 'HF', 1.000, 1.000, 675),
('Jersey', 'JER', 1.150, 1.250, 450),
('MRIJ/Dual Purpose', 'MRIJ', 1.000, 0.950, 625);
```

#### 1.3 `herd_groups` - Cow Groups for Feeding
```sql
CREATE TABLE herd_groups (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- e.g., 'Hoogproductief', 'Laagproductief', 'Droog'
    
    -- Group characteristics (averages)
    cow_count INT NOT NULL,
    breed_id INT REFERENCES breed_constants(id),
    life_stage VARCHAR(20) DEFAULT 'lactating',  -- 'lactating', 'dry', 'youngstock'
    avg_parity DECIMAL(3,1) DEFAULT 2.5,
    avg_weight_kg DECIMAL(5,1) DEFAULT 675.0,
    avg_days_in_milk INT DEFAULT 150,
    avg_days_pregnant INT DEFAULT 0,
    
    -- Production targets
    avg_milk_yield_kg DECIMAL(4,1),
    avg_fat_percent DECIMAL(4,2) DEFAULT 4.40,
    avg_protein_percent DECIMAL(4,2) DEFAULT 3.50,
    
    -- Grazing status
    grazing_type VARCHAR(20) DEFAULT 'none',  -- 'none', 'partial', 'full'
    
    -- Calculated targets (cached)
    fpcm_daily DECIMAL(5,2),
    vem_target INT,
    dve_target INT,
    voc_limit DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.4 `individual_cows` - Optional Individual Tracking
```sql
CREATE TABLE individual_cows (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    group_id INT REFERENCES herd_groups(id),
    
    -- Identification
    ear_tag VARCHAR(20),
    name VARCHAR(50),
    
    -- Individual characteristics
    breed_id INT REFERENCES breed_constants(id),
    birth_date DATE,
    parity INT DEFAULT 1,
    weight_kg DECIMAL(5,1),
    
    -- Current status
    calving_date DATE,
    insemination_date DATE,
    days_in_milk INT GENERATED ALWAYS AS (
        CASE WHEN calving_date IS NOT NULL 
        THEN EXTRACT(DAY FROM NOW() - calving_date)::INT 
        ELSE 0 END
    ) STORED,
    days_pregnant INT GENERATED ALWAYS AS (
        CASE WHEN insemination_date IS NOT NULL 
        THEN EXTRACT(DAY FROM NOW() - insemination_date)::INT 
        ELSE 0 END
    ) STORED,
    
    -- Production (from MPR or robot)
    current_milk_kg DECIMAL(4,1),
    current_fat_percent DECIMAL(4,2),
    current_protein_percent DECIMAL(4,2),
    
    -- Calculated individual allowance
    concentrate_allowance_kg DECIMAL(4,2),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.5 Enhanced `feeds` Table
```sql
-- Add columns to existing feeds table
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS farm_id INT REFERENCES farms(id);
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS feed_type VARCHAR(30);  -- 'roughage', 'concentrate', 'byproduct', 'mineral'
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS sub_type VARCHAR(50);   -- 'grass_silage', 'maize_silage', 'production_brok', etc.

-- Inventory fields
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS total_stock_kg DECIMAL(12,2);
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS silo_capacity_kg DECIMAL(12,2);
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS density_kg_per_m3 DECIMAL(6,2) DEFAULT 240;

-- Lab analysis fields (if not present)
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS ndf_percent DECIMAL(4,1);  -- For VW calculation
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS starch_percent DECIMAL(4,1);
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS sugar_percent DECIMAL(4,1);

-- Pricing
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP;
```

#### 1.6 `inventory_tracking` - Real-time Inventory
```sql
CREATE TABLE inventory_tracking (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    feed_id INT REFERENCES feeds(id) ON DELETE CASCADE,
    
    -- Current state
    current_stock_kg DECIMAL(12,2) NOT NULL,
    silo_capacity_kg DECIMAL(12,2),
    
    -- Usage tracking
    daily_usage_rate_kg DECIMAL(8,2),  -- From Step 3 calculation
    
    -- Predictions
    projected_empty_date DATE,
    days_remaining INT GENERATED ALWAYS AS (
        CASE WHEN daily_usage_rate_kg > 0 
        THEN (current_stock_kg / daily_usage_rate_kg)::INT 
        ELSE NULL END
    ) STORED,
    
    -- Delivery tracking
    last_delivery_date DATE,
    last_delivery_kg DECIMAL(10,2),
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(farm_id, feed_id)
);
```

#### 1.7 `rations` - Saved Ration Configurations
```sql
CREATE TABLE rations (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    group_id INT REFERENCES herd_groups(id),
    name VARCHAR(100) NOT NULL,
    
    -- Ration type
    ration_type VARCHAR(20) DEFAULT 'pmr',  -- 'pmr' (mixer), 'individual', 'tmr'
    
    -- Calculated results (cached)
    total_vem INT,
    total_dve INT,
    total_oeb INT,
    total_sw DECIMAL(5,2),
    total_ds_kg DECIMAL(5,2),
    
    -- Health indicators
    sw_per_kg_ds DECIMAL(4,2),
    vem_coverage_percent DECIMAL(5,1),
    dve_coverage_percent DECIMAL(5,1),
    
    -- Economics
    cost_per_cow_day DECIMAL(6,2),
    voersaldo_per_cow DECIMAL(6,2),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.8 `ration_feeds` - Feeds in Each Ration
```sql
CREATE TABLE ration_feeds (
    id SERIAL PRIMARY KEY,
    ration_id INT REFERENCES rations(id) ON DELETE CASCADE,
    feed_id INT REFERENCES feeds(id),
    
    -- Amounts
    amount_kg_ds DECIMAL(6,3) NOT NULL,  -- Per cow per day
    amount_kg_product DECIMAL(6,3),       -- Calculated from DS%
    
    -- Contribution (cached)
    vem_contribution INT,
    dve_contribution INT,
    oeb_contribution INT,
    sw_contribution DECIMAL(5,2),
    
    -- Feeding method
    feeding_method VARCHAR(20) DEFAULT 'mixer',  -- 'mixer', 'robot', 'box', 'grazing'
    
    -- Order in loading list
    load_order INT,
    
    UNIQUE(ration_id, feed_id)
);
```

#### 1.9 `orders` - Purchase Orders
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    
    -- Order details
    order_date DATE DEFAULT CURRENT_DATE,
    delivery_date DATE,
    supplier_name VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'ordered', 'delivered', 'cancelled'
    
    -- Totals
    total_kg DECIMAL(12,2),
    total_cost DECIMAL(10,2),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    feed_id INT REFERENCES feeds(id),
    
    quantity_kg DECIMAL(10,2) NOT NULL,
    price_per_ton DECIMAL(8,2),
    line_total DECIMAL(10,2),
    
    -- Delivery tracking
    delivered_kg DECIMAL(10,2) DEFAULT 0
);
```

---

## Phase 2: Calculation Engine Enhancements

### 2.1 Multi-Breed Support

Update `cvbConstants.ts` to support breed modifiers:

```typescript
// New breed-specific calculations
export interface BreedModifiers {
  maintenanceFactor: number;  // 1.0 for HF, 1.15 for Jersey
  vocFactor: number;          // 1.0 for HF, 1.25 for Jersey
  defaultWeight: number;
}

export const BREED_MODIFIERS: Record<string, BreedModifiers> = {
  'HF': { maintenanceFactor: 1.0, vocFactor: 1.0, defaultWeight: 675 },
  'JER': { maintenanceFactor: 1.15, vocFactor: 1.25, defaultWeight: 450 },
  'MRIJ': { maintenanceFactor: 1.0, vocFactor: 0.95, defaultWeight: 625 },
};

export function calculateVemMaintenanceWithBreed(
  bodyWeightKg: number, 
  isLactating: boolean,
  breedCode: string = 'HF'
): number {
  const baseVem = calculateVemMaintenance(bodyWeightKg, isLactating);
  const breedFactor = BREED_MODIFIERS[breedCode]?.maintenanceFactor ?? 1.0;
  return baseVem * breedFactor;
}
```

### 2.2 Substitution Effect Calculator

New module for concentrate substitution:

```typescript
// lib/substitution.ts

/**
 * Calculate roughage displacement when adding concentrates
 * CVB Source 138, 734: ~0.4-0.5 kg roughage displaced per kg concentrate
 */
export interface SubstitutionResult {
  originalRoughageIntake: number;  // kg DS
  concentrateAdded: number;        // kg DS
  displacedRoughage: number;       // kg DS
  adjustedRoughageIntake: number;  // kg DS
  totalIntake: number;             // kg DS
}

export const SUBSTITUTION_RATE = 0.45;  // kg roughage displaced per kg concentrate

export function calculateSubstitution(
  baseRoughageIntake: number,
  concentrateAmount: number,
  substitutionRate: number = SUBSTITUTION_RATE
): SubstitutionResult {
  const displacedRoughage = concentrateAmount * substitutionRate;
  const adjustedRoughageIntake = Math.max(0, baseRoughageIntake - displacedRoughage);
  
  return {
    originalRoughageIntake: baseRoughageIntake,
    concentrateAdded: concentrateAmount,
    displacedRoughage,
    adjustedRoughageIntake,
    totalIntake: adjustedRoughageIntake + concentrateAmount,
  };
}
```

### 2.3 Herd-Level Aggregation

```typescript
// lib/herdCalculator.ts

export interface HerdGroupResult {
  groupId: number;
  groupName: string;
  cowCount: number;
  
  // Per cow
  perCow: {
    vemTarget: number;
    dveTarget: number;
    vocLimit: number;
    rationDsKg: number;
    concentrateKg: number;
    costPerDay: number;
  };
  
  // Herd totals
  herdTotals: {
    totalVem: number;
    totalDve: number;
    totalDsKg: number;
    totalConcentrateKg: number;
    totalCostPerDay: number;
  };
  
  // Feed breakdown for loading list
  feedBreakdown: Array<{
    feedId: number;
    feedName: string;
    kgPerCow: number;
    totalKg: number;
    loadOrder: number;
  }>;
}

export function calculateHerdGroup(
  group: HerdGroup,
  ration: Ration,
  restvoerMargin: number = 0.05  // 5% safety margin
): HerdGroupResult {
  // Implementation
}
```

### 2.4 Inventory Forecasting

```typescript
// lib/inventoryForecaster.ts

export interface InventoryForecast {
  feedId: number;
  feedName: string;
  currentStockKg: number;
  dailyUsageKg: number;
  daysRemaining: number;
  projectedEmptyDate: Date;
  reorderPoint: number;  // Days before empty to reorder
  suggestedOrderKg: number;
}

export function forecastInventory(
  inventory: InventoryTracking,
  herdResults: HerdGroupResult[],
  reorderLeadDays: number = 7
): InventoryForecast {
  // Sum daily usage across all groups
  const dailyUsage = herdResults.reduce((sum, group) => {
    const feedUsage = group.feedBreakdown.find(f => f.feedId === inventory.feedId);
    return sum + (feedUsage?.totalKg ?? 0);
  }, 0);
  
  const daysRemaining = dailyUsage > 0 ? inventory.currentStockKg / dailyUsage : Infinity;
  const projectedEmptyDate = new Date();
  projectedEmptyDate.setDate(projectedEmptyDate.getDate() + Math.floor(daysRemaining));
  
  return {
    feedId: inventory.feedId,
    feedName: inventory.feedName,
    currentStockKg: inventory.currentStockKg,
    dailyUsageKg: dailyUsage,
    daysRemaining: Math.floor(daysRemaining),
    projectedEmptyDate,
    reorderPoint: reorderLeadDays,
    suggestedOrderKg: dailyUsage * 14,  // 2-week supply
  };
}
```

---

## Phase 3: UI Components

### 3.1 Step 1: Animal Profile (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│  STAP 1: DIERPROFIEL & BEHOEFTE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Groep Selectie ─────────────────────────────────────────┐   │
│  │  [Dropdown: Hoogproductief ▼]  [+ Nieuwe Groep]          │   │
│  │  Aantal koeien: [85]                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ A: Biologische Basis ───────────────────────────────────┐   │
│  │  Ras:        [Holstein-Friesian ▼]                        │   │
│  │  Categorie:  [Melkkoe ▼]                                  │   │
│  │  Pariteit:   [2.5] (gemiddeld)                            │   │
│  │  Gewicht:    [675] kg                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ B: Productiedoelen ─────────────────────────────────────┐   │
│  │  Melkproductie:  [32.0] kg/dag                            │   │
│  │  Vetgehalte:     [4.40] %                                 │   │
│  │  Eiwitgehalte:   [3.50] %                                 │   │
│  │  ─────────────────────────────────────                    │   │
│  │  FPCM:           34.2 kg/dag (berekend)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ C: Fysiologische Status ────────────────────────────────┐   │
│  │  Dagen in lactatie:  [150]                                │   │
│  │  Dagen drachtig:     [90]                                 │   │
│  │  Weidegang:          [Geen ▼]                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Berekende Behoefte ─────────────────────────────────────┐   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                   │   │
│  │  │  VEM    │  │  DVE    │  │  VOC    │                   │   │
│  │  │ 24,500  │  │ 2,100g  │  │ 17.5 VW │                   │   │
│  │  └─────────┘  └─────────┘  └─────────┘                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│                              [Volgende: Ruwvoer →]              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Step 2: Roughage Supply (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│  STAP 2: RUWVOERBASIS                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Kuilen & Voorraad ──────────────────────────────────────┐   │
│  │                                                           │   │
│  │  ┌─ Kuil 1: Graskuil 2025 ────────────────────────────┐  │   │
│  │  │  DS%: [42.0]  VEM: [920]  DVE: [68]  OEB: [+25]    │  │   │
│  │  │  SW: [2.85]   VW: [1.08]                            │  │   │
│  │  │  ─────────────────────────────────────────────────  │  │   │
│  │  │  Voorraad: [850] ton  │  Dagen over: 127 📊         │  │   │
│  │  │  [████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │  ┌─ Kuil 2: Maïskuil 2025 ────────────────────────────┐  │   │
│  │  │  DS%: [35.0]  VEM: [990]  DVE: [52]  OEB: [-15]    │  │   │
│  │  │  SW: [1.65]   VW: [0.85]                            │  │   │
│  │  │  ─────────────────────────────────────────────────  │  │   │
│  │  │  Voorraad: [1,200] ton  │  Dagen over: 156 📊       │  │   │
│  │  │  [████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░]   │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │  [+ Voeg Kuil Toe]  [📄 Upload Analyse PDF]              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Mengverhouding ─────────────────────────────────────────┐   │
│  │  Graskuil:  [40]%  ═══════════════░░░░░░░░░░░░░░░░░░░░░  │   │
│  │  Maïskuil:  [60]%  ═══════════════════════════░░░░░░░░░  │   │
│  │                                                           │   │
│  │  Gemiddelde Mix:                                          │   │
│  │  VEM: 962/kg DS  │  DVE: 58g/kg DS  │  OEB: +1  │  SW: 2.13│  │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Melk uit Ruwvoer ───────────────────────────────────────┐   │
│  │  Max. opname (VOC):     17.5 kg DS                        │   │
│  │  Energie beschikbaar:   16,835 VEM                        │   │
│  │  Minus onderhoud:       -5,500 VEM                        │   │
│  │  ─────────────────────────────────────────────────────    │   │
│  │  🥛 Melk uit ruwvoer:   29.1 kg                           │   │
│  │  📊 Doel (Stap 1):      32.0 kg                           │   │
│  │  ⚠️ Tekort:             2.9 kg melk                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│                    [← Terug]  [Volgende: Optimalisatie →]       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Step 3: Optimization (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│  STAP 3: OPTIMALISATIE                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Tekort Analyse ─────────────────────────────────────────┐   │
│  │  Energie (VEM):  ████████████████░░░░░░░░  -2,850 VEM    │   │
│  │  Eiwit (DVE):    ████████████████████░░░░  -180 g        │   │
│  │  OEB:            ████████████████████████  +25 g ✓       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Krachtvoer Toevoegen ───────────────────────────────────┐   │
│  │                                                           │   │
│  │  Productiebrok (1050 VEM)    [3.5] kg  ═══════════░░░░░  │   │
│  │  Raapzaadschroot (DVE+)      [0.5] kg  ══░░░░░░░░░░░░░░  │   │
│  │  Pulp (Energie)              [0.0] kg  ░░░░░░░░░░░░░░░░  │   │
│  │                                                           │   │
│  │  [+ Voeg Voermiddel Toe]                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Verdringing (Substitutie) ──────────────────────────────┐   │
│  │  ⚠️ Let op: 4.0 kg krachtvoer verdringt 1.8 kg ruwvoer   │   │
│  │                                                           │   │
│  │  Oorspronkelijk ruwvoer:  17.5 kg DS                      │   │
│  │  Na verdringing:          15.7 kg DS                      │   │
│  │  + Krachtvoer:             4.0 kg DS                      │   │
│  │  ─────────────────────────────────────────────────────    │   │
│  │  Totale opname:           19.7 kg DS                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Stoplichten (Veiligheid) ───────────────────────────────┐   │
│  │                                                           │   │
│  │  🟢 Verzadiging (VOC):   89%   [████████████████░░░░░]   │   │
│  │  🟢 Structuur (SW):      1.05  [████████████████████░░]   │   │
│  │  🟢 Pensbalans (OEB):    +45g  [████████████████████░░]   │   │
│  │                                                           │   │
│  │  ✅ Alle indicatoren veilig                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Eindresultaat ──────────────────────────────────────────┐   │
│  │  📊 Ondersteunde melkproductie:  32.0 kg ✓               │   │
│  │  💰 Voerkosten per koe/dag:      €4.85                   │   │
│  │  📈 Voersaldo:                   €8.65/koe/dag           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│                    [← Terug]  [Volgende: Uitvoering →]          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Step 4: Logistics & Execution

```
┌─────────────────────────────────────────────────────────────────┐
│  STAP 4: UITVOERING                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Laadlijst (Mixer Wagon) ────────────────────────────────┐   │
│  │                                                           │   │
│  │  Groep: Hoogproductief (85 koeien)                        │   │
│  │  Datum: 16 januari 2026                                   │   │
│  │                                                           │   │
│  │  ┌────┬────────────────────┬──────────┬──────────┬─────┐ │   │
│  │  │ #  │ Voermiddel         │ kg/koe   │ Totaal   │ ✓   │ │   │
│  │  ├────┼────────────────────┼──────────┼──────────┼─────┤ │   │
│  │  │ 1  │ Maïskuil           │ 22.0     │ 1,870 kg │ ☐   │ │   │
│  │  │ 2  │ Graskuil           │ 14.7     │ 1,250 kg │ ☐   │ │   │
│  │  │ 3  │ Raapzaadschroot    │ 0.5      │ 43 kg    │ ☐   │ │   │
│  │  │ 4  │ Mineralen          │ 0.15     │ 13 kg    │ ☐   │ │   │
│  │  └────┴────────────────────┴──────────┴──────────┴─────┘ │   │
│  │                                                           │   │
│  │  Totaal mixer: 3,176 kg (incl. 5% restvoer)              │   │
│  │                                                           │   │
│  │  [🖨️ Print Laadlijst]  [📱 Stuur naar App]               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Krachtvoerstation/Robot ────────────────────────────────┐   │
│  │                                                           │   │
│  │  Silo 1: Productiebrok                                    │   │
│  │  Dagverbruik: 298 kg  │  Voorraad: 8,500 kg              │   │
│  │  [████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░]  │   │
│  │  📅 Leeg op: 12 februari (28 dagen)                       │   │
│  │                                                           │   │
│  │  Silo 2: Eiwitbrok                                        │   │
│  │  Dagverbruik: 85 kg   │  Voorraad: 2,100 kg              │   │
│  │  [████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  │   │
│  │  📅 Leeg op: 9 februari (25 dagen)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Besteladvies ───────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  ⚠️ Bestellen binnen 7 dagen:                             │   │
│  │                                                           │   │
│  │  ┌────────────────────┬──────────┬──────────┬──────────┐ │   │
│  │  │ Product            │ Hoeveelh.│ Prijs    │ Totaal   │ │   │
│  │  ├────────────────────┼──────────┼──────────┼──────────┤ │   │
│  │  │ Productiebrok      │ 6,000 kg │ €285/ton │ €1,710   │ │   │
│  │  │ Eiwitbrok          │ 2,000 kg │ €320/ton │ €640     │ │   │
│  │  │ Mineralen (zakken) │ 500 kg   │ €1.20/kg │ €600     │ │   │
│  │  └────────────────────┴──────────┴──────────┴──────────┘ │   │
│  │                                                           │   │
│  │  Totaal bestelling: €2,950                                │   │
│  │                                                           │   │
│  │  [📧 Mail naar Leverancier]  [📄 Download Bestelbon]      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Voersaldo Overzicht ────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Melkopbrengst (32 kg × €0.42):     €13.44/koe/dag       │   │
│  │  Voerkosten totaal:                 -€4.85/koe/dag       │   │
│  │  ─────────────────────────────────────────────────────    │   │
│  │  💰 Voersaldo:                      €8.59/koe/dag        │   │
│  │                                                           │   │
│  │  Kudde (85 koeien):                 €730/dag             │   │
│  │  Maandelijks:                       €21,900              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│                    [← Terug]  [✅ Opslaan & Afsluiten]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Implementation Roadmap

### Sprint 1: Foundation (Week 1-2)
- [ ] Database schema migration (all new tables)
- [ ] Update API endpoints for new entities
- [ ] Multi-breed support in calculation engine
- [ ] Basic farm/herd group management UI

### Sprint 2: Enhanced Step 1 & 2 (Week 3-4)
- [ ] Herd group creation and management
- [ ] Enhanced animal profile with breed selection
- [ ] Roughage inventory tracking
- [ ] Lab analysis PDF upload (optional)
- [ ] Mix ratio calculator

### Sprint 3: Step 3 Optimization (Week 5-6)
- [ ] Substitution effect calculator
- [ ] Traffic light safety indicators
- [ ] Concentrate optimization
- [ ] Voersaldo calculation

### Sprint 4: Step 4 Logistics (Week 7-8)
- [ ] Loading list generator (Laadlijst)
- [ ] Inventory forecasting
- [ ] Order advice generator
- [ ] PDF export for loading list and orders

### Sprint 5: Polish & Integration (Week 9-10)
- [ ] Dashboard with farm overview
- [ ] Multi-group comparison
- [ ] Historical tracking
- [ ] Mobile-friendly loading list view
- [ ] Integration testing

---

## Technical Considerations

### Performance
- Cache calculated values (VEM target, VOC) in database
- Use database triggers for inventory countdown updates
- Implement optimistic UI updates for better UX

### Data Validation
- Validate all CVB constraints server-side
- Implement range checks based on cvbConstants.ts
- Add warnings for unusual values (not just errors)

### Audit Trail
- Log all ration changes with timestamps
- Track who made changes (user_id)
- Enable "undo" functionality for recent changes

### Security
- Row-level security (RLS) for farm data
- Only farm owners/managers can modify data
- Read-only access for advisors

---

## Dependencies on Existing Code

### Reusable Components
- `cvbConstants.ts` - All CVB constants (already centralized ✓)
- `auditableCalculator.ts` - Step-by-step calculation display
- `AuditableCalculationDisplay.tsx` - Audit trail UI

### Required Modifications
- `calculator.ts` - Add breed modifiers, substitution
- `voc.ts` - Add breed-specific VOC factors
- `dynamicRequirements.ts` - Add breed support

### New Modules Needed
- `lib/substitution.ts` - Substitution effect
- `lib/herdCalculator.ts` - Herd-level aggregation
- `lib/inventoryForecaster.ts` - Inventory predictions
- `lib/orderGenerator.ts` - Order advice logic

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Calculation accuracy | ±2% vs manual CVB calculation |
| Page load time | <2 seconds |
| Inventory forecast accuracy | ±5 days |
| User adoption | 80% of farms use Step 4 |
| Cost savings | €50/cow/year through optimization |

---

## Questions for Stakeholder Review

1. **Individual cow tracking**: Is this required for Phase 1, or can we start with group averages?
2. **MPR integration**: Should we import data from CRV/Qlip automatically?
3. **Robot integration**: Do we need direct integration with Lely/DeLaval robots?
4. **Multi-farm**: Should one user be able to manage multiple farms?
5. **Advisor access**: Should feed advisors have read-only access to farmer data?

---

*Document created: January 16, 2026*
*Based on CVB 2025 Standards and Dutch Feed Industry Specifications*
