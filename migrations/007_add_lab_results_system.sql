-- ============================================
-- Migration 007: Lab Results System
-- Add tables and fields for lab-verified feeds
-- ============================================

-- Create lab_results table
CREATE TABLE IF NOT EXISTS lab_results (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  
  -- Lab report metadata
  report_file_url TEXT,
  report_file_name TEXT,
  lab_name TEXT,
  analysis_date DATE,
  upload_date TIMESTAMP DEFAULT NOW(),
  
  -- Parsed feed data
  product_name TEXT NOT NULL,
  product_type TEXT,
  
  -- Core nutritional values (per kg DS)
  vem INTEGER NOT NULL,
  dve INTEGER NOT NULL,
  oeb INTEGER NOT NULL,
  ds_percent DECIMAL(5,2) NOT NULL,
  sw DECIMAL(4,2) NOT NULL,
  
  -- Optional values
  raw_protein INTEGER,
  raw_fiber INTEGER,
  sugar INTEGER,
  starch INTEGER,
  
  -- Quality indicators
  quality_score VARCHAR(20),
  quality_notes TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lab_results_farm ON lab_results(farm_id);
CREATE INDEX idx_lab_results_active ON lab_results(is_active);

-- Enhance feeds table with source tracking
ALTER TABLE feeds
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'cvb_table',
ADD COLUMN IF NOT EXISTS lab_result_id INTEGER REFERENCES lab_results(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_farm_specific BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_feeds_source_type ON feeds(source_type);
CREATE INDEX IF NOT EXISTS idx_feeds_lab_result ON feeds(lab_result_id);

-- Quality assessment function
CREATE OR REPLACE FUNCTION assess_feed_quality(
  p_vem INTEGER,
  p_dve INTEGER,
  p_oeb INTEGER,
  p_product_name TEXT
) RETURNS VARCHAR(20) AS $$
BEGIN
  -- Grass silage quality (VEM-based)
  IF p_product_name ILIKE '%gras%' THEN
    IF p_vem >= 940 THEN RETURN 'excellent';
    ELSIF p_vem >= 900 THEN RETURN 'good';
    ELSIF p_vem >= 860 THEN RETURN 'average';
    ELSE RETURN 'poor';
    END IF;
  END IF;
  
  -- Maize silage quality (VEM + OEB)
  IF p_product_name ILIKE '%maïs%' OR p_product_name ILIKE '%mais%' THEN
    IF p_vem >= 1000 AND p_oeb > -30 THEN RETURN 'excellent';
    ELSIF p_vem >= 970 AND p_oeb > -40 THEN RETURN 'good';
    ELSIF p_vem >= 940 THEN RETURN 'average';
    ELSE RETURN 'poor';
    END IF;
  END IF;
  
  -- Default
  RETURN 'unknown';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE lab_results IS 'Stores parsed lab report data for farm-specific feed analysis';
COMMENT ON COLUMN feeds.source_type IS 'Source of feed data: cvb_table, lab_verified, or user_input';
COMMENT ON COLUMN feeds.is_farm_specific IS 'Whether this feed is specific to a farm (lab-verified) or generic (CVB table)';
