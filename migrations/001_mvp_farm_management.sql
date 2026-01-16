-- MVP Farm Management System - Database Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLE 1: farms
-- Basic farm information
-- ============================================
CREATE TABLE IF NOT EXISTS farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT 'Mijn Bedrijf',
    owner_user_id UUID,
    herd_size INT DEFAULT 100,
    milk_price_per_kg DECIMAL(4,2) DEFAULT 0.42,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE 2: herd_groups
-- Cow groups for feeding management
-- ============================================
CREATE TABLE IF NOT EXISTS herd_groups (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    
    -- Group size
    cow_count INT NOT NULL DEFAULT 50,
    
    -- Average characteristics
    life_stage VARCHAR(20) DEFAULT 'lactating',
    avg_parity DECIMAL(3,1) DEFAULT 2.5,
    avg_weight_kg DECIMAL(5,1) DEFAULT 675.0,
    avg_days_in_milk INT DEFAULT 150,
    avg_days_pregnant INT DEFAULT 0,
    grazing_type VARCHAR(20) DEFAULT 'none',
    
    -- Production targets
    avg_milk_yield_kg DECIMAL(4,1) DEFAULT 30.0,
    avg_fat_percent DECIMAL(4,2) DEFAULT 4.40,
    avg_protein_percent DECIMAL(4,2) DEFAULT 3.50,
    
    -- Calculated targets (cached)
    fpcm_daily DECIMAL(5,2),
    vem_target INT,
    dve_target INT,
    voc_limit DECIMAL(5,2),
    
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE 3: inventory_tracking
-- Feed stock levels per farm
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_tracking (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    feed_id INT REFERENCES feeds(id) ON DELETE CASCADE,
    
    -- Stock levels (in kg)
    current_stock_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
    silo_capacity_kg DECIMAL(12,2),
    minimum_stock_kg DECIMAL(10,2) DEFAULT 0,
    
    -- Usage tracking
    daily_usage_rate_kg DECIMAL(8,2) DEFAULT 0,
    
    -- Delivery tracking
    last_delivery_date DATE,
    last_delivery_kg DECIMAL(10,2),
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(farm_id, feed_id)
);

-- ============================================
-- TABLE 4: group_rations
-- Feed amounts per group
-- ============================================
CREATE TABLE IF NOT EXISTS group_rations (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES herd_groups(id) ON DELETE CASCADE,
    feed_id INT REFERENCES feeds(id),
    
    -- Amount per cow per day (kg DS)
    amount_kg_ds DECIMAL(6,3) NOT NULL,
    
    -- Feeding method
    feeding_method VARCHAR(20) DEFAULT 'mixer',
    
    -- Order in loading list
    load_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(group_id, feed_id)
);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Default farm
INSERT INTO farms (name, herd_size, milk_price_per_kg)
VALUES ('Demo Melkveebedrijf', 120, 0.42)
ON CONFLICT DO NOTHING;

-- Default herd groups for farm_id = 1
INSERT INTO herd_groups (farm_id, name, cow_count, life_stage, avg_milk_yield_kg, avg_fat_percent, avg_protein_percent, avg_weight_kg, avg_days_in_milk, sort_order)
VALUES 
    (1, 'Hoogproductief', 40, 'lactating', 38.0, 4.30, 3.45, 680, 90, 1),
    (1, 'Middenproductief', 45, 'lactating', 28.0, 4.50, 3.55, 700, 180, 2),
    (1, 'Laagproductief', 25, 'lactating', 18.0, 4.70, 3.65, 720, 270, 3),
    (1, 'Droogstaand', 10, 'dry', 0, 0, 0, 750, 0, 4)
ON CONFLICT DO NOTHING;

-- Default inventory for farm_id = 1 (link to existing feeds)
INSERT INTO inventory_tracking (farm_id, feed_id, current_stock_kg, silo_capacity_kg, minimum_stock_kg)
SELECT 
    1 as farm_id,
    f.id as feed_id,
    CASE 
        WHEN f.category = 'roughage' THEN 50000
        WHEN f.category = 'byproduct' THEN 5000
        ELSE 2000
    END as current_stock_kg,
    CASE 
        WHEN f.category = 'roughage' THEN 100000
        WHEN f.category = 'byproduct' THEN 10000
        ELSE 5000
    END as silo_capacity_kg,
    CASE 
        WHEN f.category = 'roughage' THEN 10000
        WHEN f.category = 'byproduct' THEN 1000
        ELSE 500
    END as minimum_stock_kg
FROM feeds f
WHERE f.is_active = true
ON CONFLICT (farm_id, feed_id) DO NOTHING;

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_herd_groups_farm_id ON herd_groups(farm_id);
CREATE INDEX IF NOT EXISTS idx_inventory_farm_id ON inventory_tracking(farm_id);
CREATE INDEX IF NOT EXISTS idx_group_rations_group_id ON group_rations(group_id);

-- ============================================
-- Enable Row Level Security (optional, for multi-tenant)
-- ============================================
-- ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE herd_groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory_tracking ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE group_rations ENABLE ROW LEVEL SECURITY;
