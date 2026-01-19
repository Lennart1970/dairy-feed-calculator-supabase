-- Migration: Add CVB 2025 Holstein Friesian Default Herd Groups
-- Date: 2026-01-19
-- Purpose: Provide research-backed default group templates for 100-cow herd

-- Insert default herd groups for Farm ID 1
-- Based on CVB 2025 standards for Holstein Friesian cattle

-- 1. Dry Cows (15 cows, -60 to 0 DIM)
INSERT INTO herd_groups (
  farm_id, name, cow_count, life_stage, avg_parity, avg_weight_kg, 
  avg_days_in_milk, avg_days_pregnant, grazing_type, 
  avg_milk_yield_kg, avg_fat_percent, avg_protein_percent, 
  is_active, sort_order
) VALUES (
  1, 'Droogstaand', 15, 'dry', '2.5', '725', 
  0, 240, 'none', 
  '0', '0', '0', 
  true, 1
) ON CONFLICT DO NOTHING;

-- 2. High Production / Fresh Cows (28 cows, 0-100 DIM)
INSERT INTO herd_groups (
  farm_id, name, cow_count, life_stage, avg_parity, avg_weight_kg, 
  avg_days_in_milk, avg_days_pregnant, grazing_type, 
  avg_milk_yield_kg, avg_fat_percent, avg_protein_percent, 
  is_active, sort_order
) VALUES (
  1, 'Hoogproductief (Vers)', 28, 'lactating', '2.0', '645', 
  50, 0, 'none', 
  '41', '4.20', '3.40', 
  true, 2
) ON CONFLICT DO NOTHING;

-- 3. Mid Production (28 cows, 100-200 DIM)
INSERT INTO herd_groups (
  farm_id, name, cow_count, life_stage, avg_parity, avg_weight_kg, 
  avg_days_in_milk, avg_days_pregnant, grazing_type, 
  avg_milk_yield_kg, avg_fat_percent, avg_protein_percent, 
  is_active, sort_order
) VALUES (
  1, 'Midproductief', 28, 'lactating', '2.5', '675', 
  150, 90, 'none', 
  '32.5', '4.40', '3.55', 
  true, 3
) ON CONFLICT DO NOTHING;

-- 4. Low Production / Late Lactation (29 cows, >200 DIM)
INSERT INTO herd_groups (
  farm_id, name, cow_count, life_stage, avg_parity, avg_weight_kg, 
  avg_days_in_milk, avg_days_pregnant, grazing_type, 
  avg_milk_yield_kg, avg_fat_percent, avg_protein_percent, 
  is_active, sort_order
) VALUES (
  1, 'Laagproductief (Laat)', 29, 'lactating', '3.0', '700', 
  250, 180, 'none', 
  '22', '4.60', '3.70', 
  true, 4
) ON CONFLICT DO NOTHING;

-- Update farm herd size to match total (15 + 28 + 28 + 29 = 100)
UPDATE farms 
SET herd_size = 100 
WHERE id = 1;

COMMENT ON TABLE herd_groups IS 'Default groups based on CVB 2025 standards for Holstein Friesian 100-cow herd';
