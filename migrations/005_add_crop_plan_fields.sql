-- Migration: Add Crop Plan Fields for Mode B (Harvest Prediction)
-- Date: 2026-01-19
-- Purpose: Enable farmers to predict roughage deficits before harvest

-- Add crop plan fields to farms table
ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS hectares_maize DECIMAL(5,2) DEFAULT 8.0,
ADD COLUMN IF NOT EXISTS hectares_grass DECIMAL(5,2) DEFAULT 32.0,
ADD COLUMN IF NOT EXISTS yield_maize_ton_ds_ha DECIMAL(5,2) DEFAULT 12.0,
ADD COLUMN IF NOT EXISTS yield_grass_ton_ds_ha DECIMAL(5,2) DEFAULT 11.0,
ADD COLUMN IF NOT EXISTS quality_level VARCHAR(20) DEFAULT 'topkwaliteit';

-- Add comments for documentation
COMMENT ON COLUMN farms.hectares_maize IS 'Hectares of maize for silage production (Bouwplan) [Source 229]';
COMMENT ON COLUMN farms.hectares_grass IS 'Hectares of grass for silage production (Bouwplan) [Source 228]';
COMMENT ON COLUMN farms.yield_maize_ton_ds_ha IS 'Expected maize yield in tons DS per hectare [Source 229: 12.0 for high-intensity]';
COMMENT ON COLUMN farms.yield_grass_ton_ds_ha IS 'Expected grass yield in tons DS per hectare [Source 228: 11.0 for intensive mowing]';
COMMENT ON COLUMN farms.quality_level IS 'Quality assumption for harvest forecast: topkwaliteit, gemiddeld, sober [CVB 2025]';

-- Set default values for Farm ID 1 (100-cow high-tech scenario)
UPDATE farms 
SET hectares_maize = 8.0,
    hectares_grass = 32.0,
    yield_maize_ton_ds_ha = 12.0,
    yield_grass_ton_ds_ha = 11.0,
    quality_level = 'topkwaliteit'
WHERE id = 1;
