-- Migration 006: Add Base Ration System for Two-Tier PMR Workflow
-- Purpose: Enable farmers to design base rations (basisrantsoen) and assign them to herd groups
-- Date: 2026-01-19

-- ============================================================================
-- TABLE: base_rations
-- Purpose: Store base ration definitions (e.g., "Winter Mix 2026", "Summer Grazing")
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.base_rations (
  id SERIAL NOT NULL,
  farm_id INTEGER NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name CHARACTER VARYING(100) NOT NULL DEFAULT 'Basisrantsoen'::CHARACTER VARYING,
  description TEXT NULL,
  target_milk_kg NUMERIC(5, 1) NULL DEFAULT 24.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT base_rations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Index for farm lookups
CREATE INDEX IF NOT EXISTS idx_base_rations_farm_id ON public.base_rations(farm_id);

-- Index for active rations
CREATE INDEX IF NOT EXISTS idx_base_rations_active ON public.base_rations(farm_id, is_active) WHERE is_active = TRUE;

COMMENT ON TABLE public.base_rations IS 'Base ration definitions for the Two-Tier PMR system';
COMMENT ON COLUMN public.base_rations.target_milk_kg IS 'Target milk production this base ration supports (e.g., 24 kg)';
COMMENT ON COLUMN public.base_rations.is_active IS 'Whether this ration is currently in use';

-- ============================================================================
-- TABLE: base_ration_feeds
-- Purpose: Store which feeds are in each base ration and their proportions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.base_ration_feeds (
  id SERIAL NOT NULL,
  base_ration_id INTEGER NOT NULL REFERENCES public.base_rations(id) ON DELETE CASCADE,
  feed_id INTEGER NOT NULL REFERENCES public.feeds(id) ON DELETE CASCADE,
  percentage NUMERIC(5, 2) NULL,
  amount_kg_ds NUMERIC(6, 2) NULL,
  load_order INTEGER NULL DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT base_ration_feeds_pkey PRIMARY KEY (id),
  CONSTRAINT base_ration_feeds_unique UNIQUE (base_ration_id, feed_id),
  CONSTRAINT base_ration_feeds_percentage_check CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
  CONSTRAINT base_ration_feeds_amount_check CHECK (amount_kg_ds IS NULL OR amount_kg_ds >= 0),
  CONSTRAINT base_ration_feeds_either_percentage_or_amount CHECK (
    (percentage IS NOT NULL AND amount_kg_ds IS NULL) OR 
    (percentage IS NULL AND amount_kg_ds IS NOT NULL)
  )
) TABLESPACE pg_default;

-- Index for ration lookups
CREATE INDEX IF NOT EXISTS idx_base_ration_feeds_ration_id ON public.base_ration_feeds(base_ration_id);

-- Index for feed lookups
CREATE INDEX IF NOT EXISTS idx_base_ration_feeds_feed_id ON public.base_ration_feeds(feed_id);

COMMENT ON TABLE public.base_ration_feeds IS 'Feeds included in each base ration with their proportions';
COMMENT ON COLUMN public.base_ration_feeds.percentage IS 'Percentage of this feed in the mix (e.g., 60.00 for 60%)';
COMMENT ON COLUMN public.base_ration_feeds.amount_kg_ds IS 'Fixed amount in kg DS (alternative to percentage)';
COMMENT ON COLUMN public.base_ration_feeds.load_order IS 'Order to load feeds into mixer wagon';

-- ============================================================================
-- ALTER TABLE: herd_groups
-- Purpose: Link groups to base rations and store concentrate allocations
-- ============================================================================

-- Add base_ration_id column
ALTER TABLE public.herd_groups 
ADD COLUMN IF NOT EXISTS base_ration_id INTEGER NULL REFERENCES public.base_rations(id) ON DELETE SET NULL;

-- Add concentrate allocation column
ALTER TABLE public.herd_groups
ADD COLUMN IF NOT EXISTS concentrate_kg_per_cow NUMERIC(5, 2) NULL DEFAULT 0.0;

-- Add index for base ration lookups
CREATE INDEX IF NOT EXISTS idx_herd_groups_base_ration_id ON public.herd_groups(base_ration_id);

COMMENT ON COLUMN public.herd_groups.base_ration_id IS 'Base ration assigned to this group';
COMMENT ON COLUMN public.herd_groups.concentrate_kg_per_cow IS 'Concentrate allocation per cow per day (kg DS)';

-- ============================================================================
-- ALTER TABLE: group_rations
-- Purpose: Track whether feeds are part of base ration or concentrate
-- ============================================================================

-- Add feeding method column
ALTER TABLE public.group_rations
ADD COLUMN IF NOT EXISTS feeding_method CHARACTER VARYING(20) NULL DEFAULT 'wagon'::CHARACTER VARYING;

-- Add is_concentrate flag
ALTER TABLE public.group_rations
ADD COLUMN IF NOT EXISTS is_concentrate BOOLEAN NULL DEFAULT FALSE;

COMMENT ON COLUMN public.group_rations.feeding_method IS 'How this feed is delivered: wagon, robot, or manual';
COMMENT ON COLUMN public.group_rations.is_concentrate IS 'Whether this feed is concentrate (true) or roughage (false)';

-- ============================================================================
-- FUNCTION: update_base_ration_timestamp
-- Purpose: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_base_ration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for base_rations
DROP TRIGGER IF EXISTS trigger_update_base_ration_timestamp ON public.base_rations;
CREATE TRIGGER trigger_update_base_ration_timestamp
  BEFORE UPDATE ON public.base_rations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_base_ration_timestamp();

-- ============================================================================
-- SEED DATA: Example base ration (optional)
-- ============================================================================
-- Uncomment to create a default base ration for farm_id = 1

-- INSERT INTO public.base_rations (farm_id, name, description, target_milk_kg, is_active)
-- VALUES (
--   1,
--   'Winter Mix 2026',
--   'Standaard winterrantsoen: 60% graskuil, 40% maïskuil',
--   24.0,
--   TRUE
-- );

-- ============================================================================
-- GRANTS (if using RLS)
-- ============================================================================
-- Grant permissions to authenticated users (adjust as needed)

-- ALTER TABLE public.base_rations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.base_ration_feeds ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view their farm's base rations" ON public.base_rations
--   FOR SELECT USING (auth.uid() IN (SELECT owner_user_id FROM public.farms WHERE id = farm_id));

-- CREATE POLICY "Users can manage their farm's base rations" ON public.base_rations
--   FOR ALL USING (auth.uid() IN (SELECT owner_user_id FROM public.farms WHERE id = farm_id));

-- CREATE POLICY "Users can view their farm's base ration feeds" ON public.base_ration_feeds
--   FOR SELECT USING (base_ration_id IN (SELECT id FROM public.base_rations WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_user_id = auth.uid())));

-- CREATE POLICY "Users can manage their farm's base ration feeds" ON public.base_ration_feeds
--   FOR ALL USING (base_ration_id IN (SELECT id FROM public.base_rations WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_user_id = auth.uid())));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- ✅ Created base_rations table
-- ✅ Created base_ration_feeds table
-- ✅ Enhanced herd_groups with base_ration_id and concentrate_kg_per_cow
-- ✅ Enhanced group_rations with feeding_method and is_concentrate
-- ✅ Added indexes for performance
-- ✅ Added timestamp trigger
-- ✅ Added comments for documentation
