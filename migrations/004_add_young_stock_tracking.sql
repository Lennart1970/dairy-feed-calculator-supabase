-- Migration: Add Young Stock Tracking to Farms
-- Date: 2026-01-19
-- Purpose: Enable tracking of young stock (Jongvee) for roughage demand calculations

-- Add young stock fields to farms table
ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS young_stock_junior_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS young_stock_senior_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN farms.young_stock_junior_count IS 'Count of young stock < 1 year old (Jongvee < 1 jaar). Used for roughage demand: 5 kg DS/day per animal.';
COMMENT ON COLUMN farms.young_stock_senior_count IS 'Count of young stock > 1 year old (Jongvee > 1 jaar). Used for roughage demand: 8 kg DS/day per animal.';

-- Set typical values for Farm ID 1 (based on 100-cow herd)
-- Rule of thumb: ~35% of herd size for young stock replacement
UPDATE farms 
SET young_stock_junior_count = 35,
    young_stock_senior_count = 35
WHERE id = 1;
