# Dairy Ration Calculation Audit Findings

## Verdict: Critical mathematical errors and outdated biological standards

---

## 1. Critical Mathematical Errors (Supply Side)

### 1.1 Unit Confusion (Product vs. Dry Matter)
**Problem:** Nutritional values (VEM, DVE) are standardized per kg Dry Matter (DS), but the engine multiplies kg Product (As-fed) by VEM per kg DS.

**Evidence (Stalbrok):**
- Report lists: 3.2 kg DS (3.6 kg product)
- Engine calculates: 3.6 × 940 = 3,384 VEM
- **Should be:** 3.2 kg DS × 940 = 3,008 VEM

**Impact:** Energy supply from concentrates overestimated by ~12%

### 1.2 Data Integrity Failure (Ghost Variables)
**Problem:** Input amounts change midway through calculation for specific ingredients.

**Evidence (Raapzaadschroot):**
- Header lists: Hoeveelheid: 2.6 kg DS
- SW calculation uses: 2.26 × 0.1 = 0.23

**Impact:** Engine displays one quantity (2.6 kg) but uses different quantity (2.26 kg) for SW/VW calculations.

### 1.3 Summation Discrepancy
**Problem:** Total VEM (24,205.1) doesn't equal sum of visible line items.

**Impact:** Drift of >1000 VEM, possibly due to ghost variable issue or hidden feeds.

---

## 2. Biological Standard Discrepancies (Demand Side)

Engine uses pre-2022 standards instead of VEM2022 system.

| Parameter | Current Engine | CVB 2025 Standard | Impact |
|-----------|---------------|-------------------|--------|
| **Maintenance** | Fixed 5000 VEM | 53.0 × BW^0.75 (= 7218 VEM for 700kg) | Underestimates by ~30% |
| **Milk Production** | 442 VEM/kg FPCM | 390 VEM/kg FPCM | Overestimates by ~13% |
| **DVE Maintenance** | Fixed 350g | 2.75 × BW^0.75 (= 374g for 700kg) | Underestimates |

### The "Canceling Out" Effect
For high-producing cows (41kg milk), errors cancel out:
- Current: 5000 + (45 FPCM × 442) = 24,890 VEM
- Correct: 7218 + (45 FPCM × 390) = 24,768 VEM

**Risk:** Logic fails for dry cows and low producers (severe underfeeding).

---

## 3. Required Fixes

1. **Fix Feed Math:** `VEM_Supply = kg_DryMatter × VEM_per_kg_DS` (not kg Product)
2. **Fix Consistency:** Same quantity variable for VEM/DVE and SW/VW calculations
3. **Update Maintenance Formula:** Remove hardcoded 5000/350, use metabolic weight formula (BW^0.75)
4. **Update Production Formula:** Change milk energy factor from 442 to 390 VEM/kg FPCM
