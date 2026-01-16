# Code Review Report: Dairy Feed Calculator

**Date:** January 16, 2026  
**Scope:** Scalability, maintainability, and code quality assessment

---

## Executive Summary

The codebase has grown organically and contains several patterns that will constrain scalability. The main issues are:
1. **Hardcoded feed names** scattered across 8+ files
2. **Duplicate CVB constants** defined in 3 different files
3. **Large monolithic components** (CalculatorForm.tsx is 995 lines)
4. **Mixed state management** between parent and child components
5. **No centralized configuration** for feed categories and default values

---

## 🔴 Critical Issues

### 1. Hardcoded Feed Names (High Priority)

Feed names like `kuil_1_gras`, `stalbrok`, `bierborstel` are hardcoded in **8 files**:

| File | Occurrences | Purpose |
|------|-------------|---------|
| `Home.tsx` | 12 | Default values, filtering |
| `CalculatorForm.tsx` | 35 | Profile defaults, filtering, display |
| `ConcentrateFeedSection.tsx` | 6 | Filtering for display |
| `ExpertReport.tsx` | 8 | Feed source mapping |
| `StandardRations.tsx` | 30 | Preset ration definitions |
| `auditableBridge.ts` | 11 | SW/VW default values |
| `MprValidation.tsx` | 1 | Recommendation text |
| `GapAnalysisVisualization.tsx` | 1 | Recommendation text |

**Impact:** Adding a new feed requires changes in 8+ files.

**Recommendation:** Create a centralized `feedConfig.ts`:
```typescript
// client/src/config/feedConfig.ts
export const FEED_CATEGORIES = {
  roughage: ['kuil_1_gras', 'kuil_2_gras', 'mais_2025'],
  byproducts: ['bierborstel', 'gerstmeel', 'raapzaadschroot'],
  compounds: ['stalbrok', 'startbrok'],
} as const;

export const FEED_DEFAULTS: Record<string, FeedDefaults> = {
  kuil_1_gras: { sw: 1.05, vw: 1.10, dsPercent: 41, defaultAmount: 5.3 },
  // ... etc
};
```

---

### 2. Duplicate CVB Constants (High Priority)

The same CVB 2025 constants are defined in **3 files**:

| Constant | calculator.ts | dynamicRequirements.ts | auditableCalculator.ts |
|----------|--------------|----------------------|----------------------|
| VEM_MAINTENANCE (53.0) | ✅ inline | ✅ const | ✅ object |
| VEM_PRODUCTION (390) | ✅ inline | ✅ const | ✅ object |
| DVE coefficients | ✅ inline | ✅ const | ✅ object |
| FPCM formula | ✅ inline | ❌ | ✅ object |

**Impact:** Updating a CVB coefficient requires changes in 3 places. Risk of inconsistency.

**Recommendation:** Create a single source of truth:
```typescript
// client/src/config/cvbConstants.ts
export const CVB_2025 = {
  vem: {
    maintenanceLactating: 53.0,
    maintenanceDry: 52.2,
    perKgFpcm: 390,
    grazingSurcharge: 0.30,
    growthParity1: 625,
    growthParity2: 325,
  },
  dve: {
    maintenanceBase: 54,
    maintenancePerKgLw: 0.1,
    productionLinear: 1.396,
    productionQuadratic: 0.000195,
    growthParity1: 64,
    growthParity2: 37,
    pregnancySurcharge: 255,
  },
  voc: {
    alpha0: 8.743,
    alpha1: 3.563,
    rhoAlpha: 1.140,
    beta: 0.3156,
    rhoBeta: 0.05889,
    delta220: 0.05529,
    toKgDs: 2.0,
  },
  fpcm: {
    fatCoef: 0.116,
    proteinCoef: 0.06,
    constant: 0.337,
  },
  sw: {
    minimum: 1.00,
  },
} as const;
```

---

### 3. Large Monolithic Components (Medium Priority)

| Component | Lines | Responsibility Count |
|-----------|-------|---------------------|
| CalculatorForm.tsx | 995 | 8+ (profile selection, feed inputs, calculations, display, state sync) |
| Home.tsx | 781 | 7+ (page navigation, state management, all sections) |
| auditableCalculator.ts | 1161 | 5+ (all calculation functions, step generation, report generation) |
| ExpertReport.tsx | 639 | 4+ (data transformation, table rendering, PDF generation) |

**Impact:** Difficult to test, maintain, and extend. High cognitive load.

**Recommendation:** Split into smaller, focused modules:

```
CalculatorForm.tsx (995 lines) → 
  ├── hooks/useCalculation.ts (calculation logic)
  ├── hooks/useFeedInputs.ts (state management)
  ├── components/ProfileSelector.tsx
  ├── components/FeedInputSection.tsx
  └── components/CalculationResults.tsx
```

---

## 🟡 Medium Priority Issues

### 4. Mixed State Management

Feed state is managed in multiple places:
- `Home.tsx`: `roughageFeeds`, `concentrateFeedInputs`
- `CalculatorForm.tsx`: `internalFeedInputs`, merged `feedInputs`
- Props drilling: `externalRoughageFeeds`, `externalConcentrateFeedInputs`

**Impact:** Complex data flow, difficult to debug, potential sync issues (as seen in the Voedingsbalans bug).

**Recommendation:** Use a centralized state management approach:
```typescript
// Option 1: React Context
const FeedContext = createContext<FeedState>(null);

// Option 2: Zustand store
const useFeedStore = create<FeedState>((set) => ({
  roughageFeeds: [],
  concentrateInputs: {},
  setRoughageAmount: (name, amount) => set(...),
}));
```

---

### 5. Profile-Specific Default Rations

Default ration amounts are hardcoded per profile in `CalculatorForm.tsx` (lines 92-130):

```typescript
const PROFILE_DEFAULT_RATIONS = {
  "Vaars 12 maanden": {
    "kuil_1_gras": 5.3,
    "kuil_2_gras": 2.7,
  },
  // ... 5 more profiles
};
```

**Impact:** Adding a new profile requires code changes. Not user-configurable.

**Recommendation:** Store default rations in the database:
```sql
CREATE TABLE profile_default_rations (
  profile_id UUID REFERENCES animal_profiles(id),
  feed_id UUID REFERENCES feeds(id),
  default_amount DECIMAL,
  PRIMARY KEY (profile_id, feed_id)
);
```

---

### 6. Hardcoded UI Text and Recommendations

Dutch text is scattered throughout components:
- `MprValidation.tsx`: "Eiwittekort in de pens - verhoog eiwitrijke brok..."
- `GapAnalysisVisualization.tsx`: "Pensbalans negatief - voeg eiwitrijk krachtvoer toe..."
- `voc.ts`: "Rantsoen overschrijdt de opnamecapaciteit..."

**Impact:** Cannot easily support multiple languages. Text changes require code deployment.

**Recommendation:** Create a centralized translations file:
```typescript
// client/src/i18n/nl.ts
export const nl = {
  recommendations: {
    proteinDeficit: 'Eiwittekort in de pens - verhoog eiwitrijke brok of raapzaadschroot',
    vocExceeded: 'Rantsoen overschrijdt de opnamecapaciteit',
  },
  labels: {
    dryMatter: 'Droge Stof',
    energy: 'Energie (VEM)',
  },
};
```

---

## 🟢 Low Priority Issues

### 7. Magic Numbers in Thresholds

Various threshold values are scattered in the code:
- `0.95` - 95% coverage threshold (calculator.ts:337)
- `0.85` - SW warning threshold (calculator.ts:431)
- `0.5` - VOC test tolerance (voc.ts:210)

**Recommendation:** Add to constants file:
```typescript
export const THRESHOLDS = {
  coverageMinimum: 0.95,
  swWarning: 0.85,
  swMinimum: 1.00,
  vocTestTolerance: 0.5,
};
```

---

### 8. Inconsistent Number Formatting

Different rounding approaches used:
- `round(value, 2)` - custom function
- `toLocaleString()` - browser locale
- `toFixed(2)` - string conversion

**Recommendation:** Create a unified formatting utility:
```typescript
// client/src/utils/formatters.ts
export const formatNumber = (value: number, decimals = 2, locale = 'nl-NL') => 
  value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
```

---

## Refactoring Roadmap

### Phase 1: Configuration Centralization (1-2 days)
1. Create `config/cvbConstants.ts` with all CVB 2025 values
2. Create `config/feedConfig.ts` with feed categories and defaults
3. Update all files to import from these central configs

### Phase 2: State Management (2-3 days)
1. Create a Zustand store for feed state
2. Remove props drilling for feed inputs
3. Simplify CalculatorForm.tsx

### Phase 3: Component Splitting (3-5 days)
1. Extract calculation hooks from CalculatorForm
2. Split Home.tsx into page sections
3. Create reusable feed input components

### Phase 4: Database-Driven Configuration (2-3 days)
1. Move default rations to database
2. Add feed categories table
3. Create admin UI for configuration

---

## Files to Create

```
client/src/
├── config/
│   ├── cvbConstants.ts      # All CVB 2025 coefficients
│   ├── feedConfig.ts        # Feed categories, defaults, SW/VW values
│   └── thresholds.ts        # Coverage, warning thresholds
├── hooks/
│   ├── useCalculation.ts    # Calculation logic extracted from CalculatorForm
│   ├── useFeedInputs.ts     # Feed state management
│   └── useAnimalProfile.ts  # Profile selection logic
├── stores/
│   └── feedStore.ts         # Zustand store for feed state
├── utils/
│   └── formatters.ts        # Number and date formatting
└── i18n/
    └── nl.ts                # Dutch translations
```

---

## Summary

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 High | Hardcoded feed names | 4h | High - blocks adding feeds |
| 🔴 High | Duplicate CVB constants | 2h | High - risk of inconsistency |
| 🟡 Medium | Large components | 2-3d | Medium - maintainability |
| 🟡 Medium | Mixed state management | 2d | Medium - debugging difficulty |
| 🟡 Medium | Hardcoded default rations | 1d | Medium - flexibility |
| 🟢 Low | Magic numbers | 1h | Low - readability |
| 🟢 Low | Inconsistent formatting | 1h | Low - consistency |

**Total estimated effort:** 5-7 days for full refactoring

---

*Report generated by code review on January 16, 2026*
