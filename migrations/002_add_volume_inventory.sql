-- Migration: Add volume-based inventory fields
-- Date: 2026-01-19
-- Purpose: Enable farmers to input silo dimensions and auto-calculate stock

-- Add volume and density fields to inventory_tracking
ALTER TABLE inventory_tracking 
ADD COLUMN IF NOT EXISTS storage_type VARCHAR(50) DEFAULT 'bunker_silo',
ADD COLUMN IF NOT EXISTS volume_m3 DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS density_kg_m3 DECIMAL(6,2) DEFAULT 240.00,
ADD COLUMN IF NOT EXISTS silo_length_m DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS silo_width_m DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS silo_height_m DECIMAL(6,2);

-- Add comments for documentation
COMMENT ON COLUMN inventory_tracking.storage_type IS 'Type of storage: bunker_silo, upright_silo, bale, or other';
COMMENT ON COLUMN inventory_tracking.volume_m3 IS 'Total volume in cubic meters (calculated from dimensions)';
COMMENT ON COLUMN inventory_tracking.density_kg_m3 IS 'Density in kg/m³ (default: 240 for grass, 250 for maize)';
COMMENT ON COLUMN inventory_tracking.silo_length_m IS 'Silo length in meters';
COMMENT ON COLUMN inventory_tracking.silo_width_m IS 'Silo width in meters';
COMMENT ON COLUMN inventory_tracking.silo_height_m IS 'Silo height/depth in meters';
