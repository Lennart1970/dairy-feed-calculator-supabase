import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InsertUser } from "../drizzle/schema";
import { ENV } from './_core/env';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dctxqqfjwzlyqtdwyidm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdHhxcWZqd3pseXF0ZHd5aWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTM2MjksImV4cCI6MjA4NDA2OTYyOX0.tzEYxCHOZ0Q7wu5Qgj1BC76ObEYTMOxC3b2oY8GMMPk';

let _supabase: SupabaseClient | null = null;

// Get Supabase client
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Database] Connected to Supabase');
  }
  return _supabase;
}

// ============================================
// Types
// ============================================

export interface User {
  id: number;
  open_id: string;
  openId?: string; // alias for compatibility
  name: string | null;
  email: string | null;
  login_method: string | null;
  loginMethod?: string | null; // alias for compatibility
  role: string;
  last_signed_in: string;
  lastSignedIn?: Date; // alias for compatibility
  created_at: string;
}

export interface AnimalProfile {
  id: number;
  name: string;
  description: string | null;
  notes: string | null;
  weight_kg: number;
  vem_target: number;
  dve_target_grams: number;
  max_bds_kg: string;
  parity: number | null;
  days_in_milk: number | null;
  days_pregnant: number | null;
  created_at: string;
}

export interface Feed {
  id: number;
  name: string;
  display_name: string;
  basis: string;
  vem_per_unit: number;
  dve_per_unit: number;
  oeb_per_unit: number;
  ca_per_unit: string;
  p_per_unit: string;
  default_ds_percent: number;
  sw_per_kg_ds: string;
  vw_per_kg_ds: string | null;
  category: string | null;
  subcategory: string | null;
  price_per_ton: string | null;
  price_updated_at: string | null;
  is_active: boolean;
  sort_order: number | null;
  source: string | null;
  created_at: string;
}

export interface ProfileDefaultRation {
  id: number;
  profile_id: number;
  feed_id: number;
  default_amount: string;
  created_at: string;
}

export interface Farm {
  id: number;
  name: string;
  milk_price_per_kg: number;
  young_stock_junior_count: number;
  young_stock_senior_count: number;
  hectares_maize: number;
  hectares_grass: number;
  yield_maize_ton_ds_ha: number;
  yield_grass_ton_ds_ha: number;
  quality_level: 'topkwaliteit' | 'gemiddeld' | 'sober';
  created_at?: string;
  updated_at?: string;
}


// ============================================
// User Queries
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const supabase = getSupabase();

  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('open_id', user.openId)
      .single();

    const now = new Date().toISOString();

    if (existingUser) {
      // Update existing user
      const updateData: Record<string, unknown> = {
        last_signed_in: user.lastSignedIn?.toISOString() || now,
      };
      if (user.name !== undefined) updateData.name = user.name;
      if (user.email !== undefined) updateData.email = user.email;
      if (user.loginMethod !== undefined) updateData.login_method = user.loginMethod;
      if (user.role !== undefined) updateData.role = user.role;

      await supabase
        .from('users')
        .update(updateData)
        .eq('open_id', user.openId);
    } else {
      // Insert new user
      await supabase.from('users').insert({
        open_id: user.openId,
        name: user.name || null,
        email: user.email || null,
        login_method: user.loginMethod || null,
        role: user.role || (user.openId === ENV.ownerOpenId ? 'admin' : 'user'),
        last_signed_in: user.lastSignedIn?.toISOString() || now,
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('open_id', openId)
      .single();

    if (error || !data) {
      return undefined;
    }

    // Map to expected format
    return {
      ...data,
      openId: data.open_id,
      loginMethod: data.login_method,
      lastSignedIn: new Date(data.last_signed_in),
    };
  } catch (error) {
    console.error("[Database] Failed to get user:", error);
    return undefined;
  }
}

// ============================================
// Animal Profiles Queries
// ============================================

export async function getAllAnimalProfiles(): Promise<AnimalProfile[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('animal_profiles')
      .select('*')
      .order('id');

    if (error) {
      console.error("[Database] Failed to get animal profiles:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get animal profiles:", error);
    return [];
  }
}

export async function getAnimalProfileById(id: number): Promise<AnimalProfile | undefined> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('animal_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return undefined;
    }

    return data;
  } catch (error) {
    console.error("[Database] Failed to get animal profile:", error);
    return undefined;
  }
}

// ============================================
// Feeds Queries
// ============================================

export async function getAllFeeds(): Promise<Feed[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .order('id');

    if (error) {
      console.error("[Database] Failed to get feeds:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get feeds:", error);
    return [];
  }
}

export async function getFeedById(id: number): Promise<Feed | undefined> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return undefined;
    }

    return data;
  } catch (error) {
    console.error("[Database] Failed to get feed:", error);
    return undefined;
  }
}

export async function getFeedByName(name: string): Promise<Feed | undefined> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !data) {
      return undefined;
    }

    return data;
  } catch (error) {
    console.error("[Database] Failed to get feed:", error);
    return undefined;
  }
}

// ============================================
// Profile Default Rations Queries
// ============================================

export async function getDefaultRationsForProfile(profileId: number): Promise<ProfileDefaultRation[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('profile_default_rations')
      .select('*')
      .eq('profile_id', profileId)
      .order('id');

    if (error) {
      console.error("[Database] Failed to get default rations:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get default rations:", error);
    return [];
  }
}

export async function getActiveFeeds(): Promise<Feed[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');

    if (error) {
      console.error("[Database] Failed to get active feeds:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get active feeds:", error);
    return [];
  }
}

export async function getFeedsByCategory(category: string): Promise<Feed[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');

    if (error) {
      console.error("[Database] Failed to get feeds by category:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get feeds by category:", error);
    return [];
  }
}


// ============================================
// Feed Update Functions
// ============================================

export async function updateFeedPrice(feedId: number, pricePerTon: number): Promise<boolean> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('feeds')
      .update({ 
        price_per_ton: pricePerTon,
        // Note: price_updated_at would be updated here if the column exists
      })
      .eq('id', feedId);

    if (error) {
      console.error("[Database] Failed to update feed price:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to update feed price:", error);
    return false;
  }
}


// ============================================
// Farm Management Types
// ============================================

export interface Farm {
  id: number;
  name: string;
  owner_user_id: string | null;
  herd_size: number;
  milk_price_per_kg: string;
  created_at: string;
  updated_at: string;
}

export interface HerdGroup {
  id: number;
  farm_id: number;
  name: string;
  cow_count: number;
  life_stage: string;
  avg_parity: string;
  avg_weight_kg: string;
  avg_days_in_milk: number;
  avg_days_pregnant: number;
  grazing_type: string;
  avg_milk_yield_kg: string;
  avg_fat_percent: string;
  avg_protein_percent: string;
  fpcm_daily: string | null;
  vem_target: number | null;
  dve_target: number | null;
  voc_limit: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  farm_id: number;
  feed_id: number;
  current_stock_kg: string;
  silo_capacity_kg: string | null;
  minimum_stock_kg: string;
  daily_usage_rate_kg: string;
  last_delivery_date: string | null;
  last_delivery_kg: string | null;
  storage_type: string | null;
  volume_m3: string | null;
  density_kg_m3: string | null;
  silo_length_m: string | null;
  silo_width_m: string | null;
  silo_height_m: string | null;
  updated_at: string;
  // Joined feed data
  feed?: Feed;
}

export interface GroupRation {
  id: number;
  group_id: number;
  feed_id: number;
  amount_kg_ds: string;
  feeding_method: string;
  load_order: number;
  created_at: string;
  updated_at: string;
  // Joined feed data
  feed?: Feed;
}

// ============================================
// Farm Queries
// ============================================

export async function getFarm(farmId: number = 1): Promise<Farm | undefined> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();

    if (error || !data) {
      return undefined;
    }

    return data;
  } catch (error) {
    console.error("[Database] Failed to get farm:", error);
    return undefined;
  }
}

export async function updateFarm(farmId: number, updates: Partial<Farm>): Promise<boolean> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('farms')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', farmId);

    if (error) {
      console.error("[Database] Failed to update farm:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to update farm:", error);
    return false;
  }
}

// ============================================
// Herd Group Queries
// ============================================

export async function getHerdGroups(farmId: number = 1): Promise<HerdGroup[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('herd_groups')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');

    if (error) {
      console.error("[Database] Failed to get herd groups:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get herd groups:", error);
    return [];
  }
}

export async function getHerdGroupById(groupId: number): Promise<HerdGroup | undefined> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('herd_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error || !data) {
      return undefined;
    }

    return data;
  } catch (error) {
    console.error("[Database] Failed to get herd group:", error);
    return undefined;
  }
}

export async function createHerdGroup(group: Omit<HerdGroup, 'id' | 'created_at' | 'updated_at'>): Promise<HerdGroup | undefined> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('herd_groups')
      .insert(group)
      .select()
      .single();

    if (error) {
      console.error("[Database] Failed to create herd group:", error);
      return undefined;
    }

    return data;
  } catch (error) {
    console.error("[Database] Failed to create herd group:", error);
    return undefined;
  }
}

export async function updateHerdGroup(groupId: number, updates: Partial<HerdGroup>): Promise<boolean> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('herd_groups')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupId);

    if (error) {
      console.error("[Database] Failed to update herd group:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to update herd group:", error);
    return false;
  }
}

export async function deleteHerdGroup(groupId: number): Promise<boolean> {
  const supabase = getSupabase();

  try {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('herd_groups')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', groupId);

    if (error) {
      console.error("[Database] Failed to delete herd group:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to delete herd group:", error);
    return false;
  }
}

// ============================================
// Inventory Queries
// ============================================

export async function getInventory(farmId: number = 1): Promise<InventoryItem[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('inventory_tracking')
      .select(`
        *,
        feed:feeds(*)
      `)
      .eq('farm_id', farmId)
      .order('id');

    if (error) {
      console.error("[Database] Failed to get inventory:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get inventory:", error);
    return [];
  }
}

export async function updateInventoryStock(farmId: number, feedId: number, currentStockKg: number): Promise<boolean> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('inventory_tracking')
      .update({
        current_stock_kg: currentStockKg,
        updated_at: new Date().toISOString(),
      })
      .eq('farm_id', farmId)
      .eq('feed_id', feedId);

    if (error) {
      console.error("[Database] Failed to update inventory stock:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to update inventory stock:", error);
    return false;
  }
}

export async function recordDelivery(
  farmId: number, 
  feedId: number, 
  deliveryKg: number,
  deliveryDate: string = new Date().toISOString().split('T')[0]
): Promise<boolean> {
  const supabase = getSupabase();

  try {
    // First get current stock
    const { data: current } = await supabase
      .from('inventory_tracking')
      .select('current_stock_kg')
      .eq('farm_id', farmId)
      .eq('feed_id', feedId)
      .single();

    const currentStock = current ? parseFloat(current.current_stock_kg) : 0;
    const newStock = currentStock + deliveryKg;

    const { error } = await supabase
      .from('inventory_tracking')
      .update({
        current_stock_kg: newStock,
        last_delivery_date: deliveryDate,
        last_delivery_kg: deliveryKg,
        updated_at: new Date().toISOString(),
      })
      .eq('farm_id', farmId)
      .eq('feed_id', feedId);

    if (error) {
      console.error("[Database] Failed to record delivery:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to record delivery:", error);
    return false;
  }
}

export async function updateDailyUsageRate(farmId: number, feedId: number, dailyUsageKg: number): Promise<boolean> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('inventory_tracking')
      .update({
        daily_usage_rate_kg: dailyUsageKg,
        updated_at: new Date().toISOString(),
      })
      .eq('farm_id', farmId)
      .eq('feed_id', feedId);

    if (error) {
      console.error("[Database] Failed to update daily usage rate:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to update daily usage rate:", error);
    return false;
  }
}

// ============================================
// Group Ration Queries
// ============================================

export async function getGroupRation(groupId: number): Promise<GroupRation[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('group_rations')
      .select(`
        *,
        feed:feeds(*)
      `)
      .eq('group_id', groupId)
      .order('load_order')
      .order('id');

    if (error) {
      console.error("[Database] Failed to get group ration:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get group ration:", error);
    return [];
  }
}

export async function saveGroupRation(groupId: number, rations: Array<{ feed_id: number; amount_kg_ds: number; feeding_method?: string; load_order?: number }>): Promise<boolean> {
  const supabase = getSupabase();

  try {
    // Delete existing rations for this group
    await supabase
      .from('group_rations')
      .delete()
      .eq('group_id', groupId);

    // Insert new rations
    if (rations.length > 0) {
      const { error } = await supabase
        .from('group_rations')
        .insert(
          rations.map((r, index) => ({
            group_id: groupId,
            feed_id: r.feed_id,
            amount_kg_ds: r.amount_kg_ds,
            feeding_method: r.feeding_method || 'mixer',
            load_order: r.load_order ?? index,
          }))
        );

      if (error) {
        console.error("[Database] Failed to save group ration:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to save group ration:", error);
    return false;
  }
}

// ============================================
// Aggregation Queries
// ============================================

export async function calculateFarmDailyUsage(farmId: number = 1): Promise<Map<number, number>> {
  const supabase = getSupabase();
  const usageMap = new Map<number, number>();

  try {
    // Get all active groups with their rations
    const { data: groups } = await supabase
      .from('herd_groups')
      .select('id, cow_count')
      .eq('farm_id', farmId)
      .eq('is_active', true);

    if (!groups) return usageMap;

    for (const group of groups) {
      const { data: rations } = await supabase
        .from('group_rations')
        .select('feed_id, amount_kg_ds')
        .eq('group_id', group.id);

      if (rations) {
        for (const ration of rations) {
          const dailyUsage = parseFloat(ration.amount_kg_ds) * group.cow_count;
          const currentUsage = usageMap.get(ration.feed_id) || 0;
          usageMap.set(ration.feed_id, currentUsage + dailyUsage);
        }
      }
    }

    return usageMap;
  } catch (error) {
    console.error("[Database] Failed to calculate farm daily usage:", error);
    return usageMap;
  }
}

// ============================================
// Base Ration Functions
// ============================================

export interface BaseRation {
  id: number;
  farm_id: number;
  name: string;
  description: string | null;
  target_milk_kg: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BaseRationFeed {
  id: number;
  base_ration_id: number;
  feed_id: number;
  percentage: number | null;
  amount_kg_ds: number | null;
  load_order: number | null;
  created_at: string;
  feed?: Feed;
}

export interface BaseRationWithFeeds extends BaseRation {
  feeds: BaseRationFeed[];
}

/**
 * Get all base rations for a farm
 */
export async function getBaseRations(farmId: number = 1): Promise<BaseRation[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('base_rations')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("[Database] Failed to get base rations:", error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get base rations:", error);
    return [];
  }
}

/**
 * Get a single base ration with its feeds
 */
export async function getBaseRationById(rationId: number): Promise<BaseRationWithFeeds | undefined> {
  const supabase = getSupabase();
  try {
    // Get the base ration
    const { data: ration, error: rationError } = await supabase
      .from('base_rations')
      .select('*')
      .eq('id', rationId)
      .single();
    
    if (rationError || !ration) {
      console.error("[Database] Failed to get base ration:", rationError);
      return undefined;
    }

    // Get the feeds in this ration
    const { data: feeds, error: feedsError } = await supabase
      .from('base_ration_feeds')
      .select(`
        *,
        feed:feeds(*)
      `)
      .eq('base_ration_id', rationId)
      .order('load_order');
    
    if (feedsError) {
      console.error("[Database] Failed to get base ration feeds:", feedsError);
      return { ...ration, feeds: [] };
    }

    return { ...ration, feeds: feeds || [] };
  } catch (error) {
    console.error("[Database] Failed to get base ration by id:", error);
    return undefined;
  }
}

/**
 * Create a new base ration
 */
export async function createBaseRation(
  ration: Omit<BaseRation, 'id' | 'created_at' | 'updated_at'>
): Promise<BaseRation | undefined> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('base_rations')
      .insert(ration)
      .select()
      .single();
    
    if (error) {
      console.error("[Database] Failed to create base ration:", error);
      return undefined;
    }
    return data;
  } catch (error) {
    console.error("[Database] Failed to create base ration:", error);
    return undefined;
  }
}

/**
 * Update a base ration
 */
export async function updateBaseRation(
  rationId: number,
  updates: Partial<BaseRation>
): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from('base_rations')
      .update(updates)
      .eq('id', rationId);
    
    if (error) {
      console.error("[Database] Failed to update base ration:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to update base ration:", error);
    return false;
  }
}

/**
 * Delete a base ration
 */
export async function deleteBaseRation(rationId: number): Promise<boolean> {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from('base_rations')
      .delete()
      .eq('id', rationId);
    
    if (error) {
      console.error("[Database] Failed to delete base ration:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete base ration:", error);
    return false;
  }
}

/**
 * Add or update feeds in a base ration
 */
export async function setBaseRationFeeds(
  rationId: number,
  feeds: Array<{
    feed_id: number;
    percentage?: number;
    amount_kg_ds?: number;
    load_order?: number;
  }>
): Promise<boolean> {
  const supabase = getSupabase();
  try {
    // Delete existing feeds for this ration
    await supabase
      .from('base_ration_feeds')
      .delete()
      .eq('base_ration_id', rationId);

    // Insert new feeds
    if (feeds.length > 0) {
      const { error } = await supabase
        .from('base_ration_feeds')
        .insert(
          feeds.map((f, index) => ({
            base_ration_id: rationId,
            feed_id: f.feed_id,
            percentage: f.percentage || null,
            amount_kg_ds: f.amount_kg_ds || null,
            load_order: f.load_order !== undefined ? f.load_order : index,
          }))
        );

      if (error) {
        console.error("[Database] Failed to set base ration feeds:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("[Database] Failed to set base ration feeds:", error);
    return false;
  }
}

/**
 * Calculate the nutritional density of a base ration mix
 */
export async function calculateBaseRationDensity(rationId: number): Promise<{
  vemPerKgDs: number;
  dvePerKgDs: number;
  oebPerKgDs: number;
  swPerKgDs: number;
  vwPerKgDs: number;
} | undefined> {
  try {
    const ration = await getBaseRationById(rationId);
    if (!ration || !ration.feeds || ration.feeds.length === 0) {
      return undefined;
    }

    let totalVem = 0;
    let totalDve = 0;
    let totalOeb = 0;
    let totalSw = 0;
    let totalVw = 0;
    let totalPercentage = 0;

    for (const rationFeed of ration.feeds) {
      if (!rationFeed.feed || !rationFeed.percentage) continue;

      const weight = rationFeed.percentage / 100;
      totalPercentage += rationFeed.percentage;

      totalVem += rationFeed.feed.vem_per_unit * weight;
      totalDve += rationFeed.feed.dve_per_unit * weight;
      totalOeb += rationFeed.feed.oeb_per_unit * weight;
      totalSw += (rationFeed.feed.sw_per_kg_ds || 0) * weight;
      totalVw += (rationFeed.feed.vw_per_kg_ds || 0) * weight;
    }

    // Validate percentages add up to 100%
    if (Math.abs(totalPercentage - 100) > 0.01) {
      console.warn(`[Database] Base ration ${rationId} percentages don't add up to 100%: ${totalPercentage}%`);
    }

    return {
      vemPerKgDs: Math.round(totalVem),
      dvePerKgDs: Math.round(totalDve),
      oebPerKgDs: Math.round(totalOeb),
      swPerKgDs: Math.round(totalSw * 100) / 100,
      vwPerKgDs: Math.round(totalVw * 100) / 100,
    };
  } catch (error) {
    console.error("[Database] Failed to calculate base ration density:", error);
    return undefined;
  }
}


// ============================================
// Lab Results Functions
// ============================================

export interface LabResult {
  id: number;
  farm_id: number;
  report_file_url: string | null;
  report_file_name: string | null;
  lab_name: string | null;
  analysis_date: string | null;
  upload_date: string;
  product_name: string;
  product_type: string | null;
  vem: number;
  dve: number;
  oeb: number;
  ds_percent: string;
  sw: string;
  raw_protein: number | null;
  raw_fiber: number | null;
  sugar: number | null;
  starch: number | null;
  quality_score: string | null;
  quality_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function saveLabResultAsFeed(data: {
  farm_id: number;
  product_name: string;
  product_type?: string;
  vem: number;
  dve: number;
  oeb: number;
  ds_percent: number;
  sw: number;
  raw_protein?: number;
  raw_fiber?: number;
  sugar?: number;
  starch?: number;
  report_file_url?: string;
  report_file_name?: string;
}): Promise<{ labResult: LabResult; feed: Feed } | null> {
  const supabase = getSupabase();
  
  try {
    // Step 1: Calculate quality score
    const { data: qualityData, error: qualityError } = await supabase
      .rpc('assess_feed_quality', {
        p_vem: data.vem,
        p_dve: data.dve,
        p_oeb: data.oeb,
        p_product_name: data.product_name
      });
    
    if (qualityError) {
      console.warn("[Database] Failed to assess quality, using 'unknown':", qualityError);
    }
    
    const quality_score = qualityData || 'unknown';
    
    // Step 2: Save to lab_results
    const { data: labResultData, error: labError } = await supabase
      .from('lab_results')
      .insert({
        farm_id: data.farm_id,
        product_name: data.product_name,
        product_type: data.product_type || null,
        vem: data.vem,
        dve: data.dve,
        oeb: data.oeb,
        ds_percent: data.ds_percent,
        sw: data.sw,
        raw_protein: data.raw_protein || null,
        raw_fiber: data.raw_fiber || null,
        sugar: data.sugar || null,
        starch: data.starch || null,
        quality_score,
        report_file_url: data.report_file_url || null,
        report_file_name: data.report_file_name || null,
      })
      .select()
      .single();
    
    if (labError || !labResultData) {
      console.error("[Database] Failed to save lab result:", labError);
      return null;
    }
    
    // Step 3: Create feed entry
    const { data: feedData, error: feedError } = await supabase
      .from('feeds')
      .insert({
        name: data.product_name,
        display_name: `${data.product_name} (Lab)`,
        basis: 'roughage',
        category: 'roughage',
        vem_per_unit: data.vem,
        dve_per_unit: data.dve,
        oeb_per_unit: data.oeb,
        sw_per_kg_ds: data.sw,
        default_ds_percent: data.ds_percent,
        source_type: 'lab_verified',
        lab_result_id: labResultData.id,
        is_farm_specific: true,
        is_active: true,
        ca_per_unit: '0',
        p_per_unit: '0',
        vw_per_kg_ds: null,
      })
      .select()
      .single();
    
    if (feedError || !feedData) {
      console.error("[Database] Failed to create feed:", feedError);
      return null;
    }
    
    return {
      labResult: labResultData as LabResult,
      feed: feedData as Feed
    };
  } catch (error) {
    console.error("[Database] Failed to save lab result as feed:", error);
    return null;
  }
}

export async function getLabResultsForFarm(farmId: number): Promise<LabResult[]> {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase
      .from('lab_results')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('upload_date', { ascending: false });
    
    if (error) {
      console.error("[Database] Failed to get lab results:", error);
      return [];
    }
    
    return (data || []) as LabResult[];
  } catch (error) {
    console.error("[Database] Failed to get lab results:", error);
    return [];
  }
}

export async function getLabResultById(labResultId: number): Promise<LabResult | null> {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', labResultId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as LabResult;
  } catch (error) {
    console.error("[Database] Failed to get lab result:", error);
    return null;
  }
}

export async function deleteLabResult(labResultId: number): Promise<boolean> {
  const supabase = getSupabase();
  
  try {
    const { error } = await supabase
      .from('lab_results')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', labResultId);
    
    if (error) {
      console.error("[Database] Failed to delete lab result:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete lab result:", error);
    return false;
  }
}


// ============================================
// MPR Delivery Queries
// ============================================

export interface MprDelivery {
  id: number;
  farm_id: number;
  delivery_date: string;
  delivery_time: string;
  kg_melk: string;
  ltr_melk: string;
  temp: string | null;
  vet_procent: string;
  eiwit_procent: string;
  lactose_procent: string;
  ureum: number | null;
  ber: number | null;
  vries_punt: string | null;
  zuurgraad: string | null;
  vet_eiwit_ratio: string | null;
  antibiotica: string | null;
  fosfor: number | null;
  myristinezuur_c14: string | null;
  palmitinezuur_c16: string | null;
  stearinezuur_c18: string | null;
  oliezuur_c18_1: string | null;
  kg_vet: string;
  kg_eiwit: string;
  created_at: string;
  updated_at: string;
}

export async function getMprDeliveries(farmId: number): Promise<MprDelivery[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('mpr_deliveries')
      .select('*')
      .eq('farm_id', farmId)
      .order('delivery_date', { ascending: false });

    if (error) {
      console.error("[Database] Failed to get MPR deliveries:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get MPR deliveries:", error);
    return [];
  }
}

export async function getMprDeliveriesByDateRange(
  farmId: number, 
  startDate: string, 
  endDate: string
): Promise<MprDelivery[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('mpr_deliveries')
      .select('*')
      .eq('farm_id', farmId)
      .gte('delivery_date', startDate)
      .lte('delivery_date', endDate)
      .order('delivery_date', { ascending: true });

    if (error) {
      console.error("[Database] Failed to get MPR deliveries by date range:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get MPR deliveries by date range:", error);
    return [];
  }
}

export async function getMprMonthlySummary(farmId: number): Promise<any[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('mpr_deliveries')
      .select('*')
      .eq('farm_id', farmId)
      .order('delivery_date', { ascending: true });

    if (error) {
      console.error("[Database] Failed to get MPR monthly summary:", error);
      return [];
    }

    // Group by month in JavaScript
    const months: Record<string, any[]> = {};
    for (const d of (data || [])) {
      const monthKey = d.delivery_date.substring(0, 7); // YYYY-MM
      if (!months[monthKey]) months[monthKey] = [];
      months[monthKey].push(d);
    }

    // Calculate monthly summaries
    return Object.entries(months).map(([month, deliveries]) => {
      const n = deliveries.length;
      const avgKgMelk = deliveries.reduce((s, d) => s + parseFloat(d.kg_melk), 0) / n;
      const totalKgMelk = deliveries.reduce((s, d) => s + parseFloat(d.kg_melk), 0);
      const avgVet = deliveries.reduce((s, d) => s + parseFloat(d.vet_procent), 0) / n;
      const avgEiwit = deliveries.reduce((s, d) => s + parseFloat(d.eiwit_procent), 0) / n;
      const avgLactose = deliveries.reduce((s, d) => s + parseFloat(d.lactose_procent), 0) / n;
      const avgUreum = deliveries.filter(d => d.ureum != null).reduce((s, d) => s + d.ureum, 0) / deliveries.filter(d => d.ureum != null).length;
      const totalKgVet = deliveries.reduce((s, d) => s + parseFloat(d.kg_vet), 0);
      const totalKgEiwit = deliveries.reduce((s, d) => s + parseFloat(d.kg_eiwit), 0);

      return {
        month,
        deliveryCount: n,
        avgKgMelk: Math.round(avgKgMelk),
        totalKgMelk: Math.round(totalKgMelk),
        avgVetProcent: Math.round(avgVet * 100) / 100,
        avgEiwitProcent: Math.round(avgEiwit * 100) / 100,
        avgLactoseProcent: Math.round(avgLactose * 100) / 100,
        avgUreum: Math.round(avgUreum * 10) / 10,
        totalKgVet: Math.round(totalKgVet * 10) / 10,
        totalKgEiwit: Math.round(totalKgEiwit * 10) / 10,
      };
    }).sort((a, b) => a.month.localeCompare(b.month));
  } catch (error) {
    console.error("[Database] Failed to get MPR monthly summary:", error);
    return [];
  }
}

// ============================================
// MPR Cow Records (Dieroverzicht - Individual Cow Lab Data)
// ============================================

export interface MprCowRecord {
  id: number;
  farm_id: number;
  mpr_date: string;
  diernr: number;
  levensnummer: string | null;
  naam: string | null;
  leeftijd: number | null;
  kg_melk_dag: number | null;
  vet_pct: number | null;
  eiw_pct: number | null;
  lac_pct: number | null;
  ureum: number | null;
  kgve: number | null;
  celgetal: number | null;
  cel_opm: string | null;
  status: string | null;
  lactatienr: number | null;
  kalfdatum: string | null;
  dgn_305: number | null;
  kg_melk_305: number | null;
  vet_pct_305: number | null;
  eiw_pct_305: number | null;
  kg_vet_305: number | null;
  kg_eiw_305: number | null;
  lw: number | null;
  lifetime_lft_afk: number | null;
  lifetime_lact_nr: number | null;
  lifetime_kg_melk: number | null;
  lifetime_vet_pct: number | null;
  lifetime_eiw_pct: number | null;
  lifetime_kg_vet: number | null;
  lifetime_kg_eiw: number | null;
  created_at: string;
}

// Get all MPR sessions (unique dates) for a farm
export async function getMprSessions(farmId: number): Promise<{ mpr_date: string; cow_count: number; active_count: number; dry_count: number }[]> {
  const supabase = getSupabase();
  try {
    // Paginate to handle >1000 records
    let allData: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page, error: pageError } = await supabase
        .from('mpr_cow_records')
        .select('mpr_date, status, kg_melk_dag')
        .eq('farm_id', farmId)
        .order('mpr_date', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (pageError) {
        console.error("[Database] Failed to get MPR sessions page:", pageError);
        break;
      }
      if (!page || page.length === 0) break;
      allData = allData.concat(page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }

    // Group by date
    const sessions: Record<string, { total: number; active: number; dry: number }> = {};
    for (const r of allData) {
      if (!sessions[r.mpr_date]) sessions[r.mpr_date] = { total: 0, active: 0, dry: 0 };
      sessions[r.mpr_date].total++;
      if (r.status === 'drg' || r.status === 'onm') {
        sessions[r.mpr_date].dry++;
      } else if (r.kg_melk_dag !== null) {
        sessions[r.mpr_date].active++;
      }
    }

    return Object.entries(sessions)
      .map(([date, counts]) => ({
        mpr_date: date,
        cow_count: counts.total,
        active_count: counts.active,
        dry_count: counts.dry,
      }))
      .sort((a, b) => b.mpr_date.localeCompare(a.mpr_date));
  } catch (error) {
    console.error("[Database] Failed to get MPR sessions:", error);
    return [];
  }
}

// Get all cow records for a specific MPR session
export async function getMprCowRecords(farmId: number, mprDate: string): Promise<MprCowRecord[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('mpr_cow_records')
      .select('*')
      .eq('farm_id', farmId)
      .eq('mpr_date', mprDate)
      .order('diernr', { ascending: true });

    if (error) {
      console.error("[Database] Failed to get MPR cow records:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get MPR cow records:", error);
    return [];
  }
}

// Get history for a specific cow across all sessions
export async function getMprCowHistory(farmId: number, diernr: number): Promise<MprCowRecord[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('mpr_cow_records')
      .select('*')
      .eq('farm_id', farmId)
      .eq('diernr', diernr)
      .order('mpr_date', { ascending: true });

    if (error) {
      console.error("[Database] Failed to get cow history:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Database] Failed to get cow history:", error);
    return [];
  }
}

// Get herd summary statistics per session
export async function getMprHerdSummary(farmId: number): Promise<any[]> {
  const supabase = getSupabase();
  try {
    // Fetch all records with pagination (Supabase default limit is 1000)
    let allData: MprCowRecord[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page, error: pageError } = await supabase
        .from('mpr_cow_records')
        .select('*')
        .eq('farm_id', farmId)
        .order('mpr_date', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (pageError) {
        console.error("[Database] Failed to get herd summary page:", pageError);
        break;
      }
      if (!page || page.length === 0) break;
      allData = allData.concat(page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
    const data = allData;
    const error = null;

    if (error) {
      console.error("[Database] Failed to get herd summary:", error);
      return [];
    }

    // Group by date and calculate averages
    const sessions: Record<string, MprCowRecord[]> = {};
    for (const r of (data || [])) {
      if (!sessions[r.mpr_date]) sessions[r.mpr_date] = [];
      sessions[r.mpr_date].push(r);
    }

    return Object.entries(sessions).map(([date, cows]) => {
      const active = cows.filter(c => c.kg_melk_dag !== null && c.status !== 'drg' && c.status !== 'onm');
      const dry = cows.filter(c => c.status === 'drg' || c.status === 'onm');
      
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      
      return {
        mpr_date: date,
        total_cows: cows.length,
        active_cows: active.length,
        dry_cows: dry.length,
        avg_kg_melk: avg(active.filter(c => c.kg_melk_dag).map(c => Number(c.kg_melk_dag))),
        avg_vet_pct: avg(active.filter(c => c.vet_pct).map(c => Number(c.vet_pct))),
        avg_eiw_pct: avg(active.filter(c => c.eiw_pct).map(c => Number(c.eiw_pct))),
        avg_lac_pct: avg(active.filter(c => c.lac_pct).map(c => Number(c.lac_pct))),
        avg_ureum: avg(active.filter(c => c.ureum).map(c => Number(c.ureum))),
        avg_celgetal: avg(active.filter(c => c.celgetal).map(c => Number(c.celgetal))),
        avg_lw: avg(active.filter(c => c.lw).map(c => Number(c.lw))),
        high_cel_count: active.filter(c => c.celgetal && Number(c.celgetal) > 250).length,
        vers_count: active.filter(c => c.status === 'vers').length,
      };
    }).sort((a, b) => a.mpr_date.localeCompare(b.mpr_date));
  } catch (error) {
    console.error("[Database] Failed to get herd summary:", error);
    return [];
  }
}


// Compute herd groups automatically from MPR cow records for a given session
// Groups cows by DIM (Days In Milk) into: Droogstaand, Hoogproductief, Midproductief, Laagproductief
export async function getComputedHerdGroups(farmId: number, mprDate?: string): Promise<any> {
  const supabase = getSupabase();
  try {
    // If no date specified, get the most recent session
    let targetDate = mprDate;
    if (!targetDate) {
      const sessions = await getMprSessions(farmId);
      if (sessions.length === 0) return { groups: [], mprDate: null, totalCows: 0 };
      targetDate = sessions[0].mpr_date; // Most recent
    }

    // Fetch all cow records for this session
    const cows = await getMprCowRecords(farmId, targetDate);
    if (!cows || cows.length === 0) return { groups: [], mprDate: targetDate, totalCows: 0 };

    // Parse MPR date for DIM calculation
    const mprDateObj = new Date(targetDate);

    // Helper: calculate DIM from kalfdatum
    function calcDIM(kalfdatum: string | null): number | null {
      if (!kalfdatum) return null;
      try {
        const parts = kalfdatum.split('/');
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        let year = parseInt(parts[2]);
        if (year < 100) year += 2000;
        const kalfDate = new Date(year, month - 1, day);
        const dim = Math.floor((mprDateObj.getTime() - kalfDate.getTime()) / (1000 * 60 * 60 * 24));
        return dim >= 0 ? dim : null;
      } catch {
        return null;
      }
    }

    // Helper: safe average
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    // Categorize cows
    const dryCows = cows.filter(c => c.status === 'drg' || c.status === 'onm');
    const activeCows = cows.filter(c => c.kg_melk_dag !== null && c.status !== 'drg' && c.status !== 'onm');

    // Calculate DIM for active cows
    const cowsWithDIM = activeCows.map(c => ({
      ...c,
      dim: calcDIM(c.kalfdatum),
    }));

    // Group by DIM ranges
    const hoogCows = cowsWithDIM.filter(c => c.dim !== null && c.dim < 120);
    const middenCows = cowsWithDIM.filter(c => c.dim !== null && c.dim >= 120 && c.dim < 220);
    const laagCows = cowsWithDIM.filter(c => c.dim !== null && c.dim >= 220);
    const noDimCows = cowsWithDIM.filter(c => c.dim === null);

    // Build group stats
    function buildGroupStats(name: string, groupCows: (MprCowRecord & { dim: number | null })[], lifeStage: string, defaultWeight: number) {
      const count = groupCows.length;
      if (count === 0) return { name, lifeStage, cowCount: 0, avgWeightKg: defaultWeight, avgMilkYieldKg: 0, avgFatPercent: 0, avgProteinPercent: 0, avgDaysInMilk: 0, avgCelgetal: null, avgUreum: null, avgParity: null, dimRange: null, cows: [] };

      const melkVals = groupCows.filter(c => c.kg_melk_dag !== null).map(c => Number(c.kg_melk_dag));
      const vetVals = groupCows.filter(c => c.vet_pct !== null).map(c => Number(c.vet_pct));
      const eiwVals = groupCows.filter(c => c.eiw_pct !== null).map(c => Number(c.eiw_pct));
      const celVals = groupCows.filter(c => c.celgetal !== null).map(c => Number(c.celgetal));
      const ureumVals = groupCows.filter(c => c.ureum !== null).map(c => Number(c.ureum));
      const dimVals = groupCows.filter(c => c.dim !== null).map(c => c.dim as number);
      const lactVals = groupCows.filter(c => c.lactatienr !== null && c.lactatienr < 20).map(c => Number(c.lactatienr));

      return {
        name,
        lifeStage,
        cowCount: count,
        avgWeightKg: defaultWeight, // CVB standard weight per group
        avgMilkYieldKg: avg(melkVals) ? Math.round(avg(melkVals)! * 10) / 10 : 0,
        avgFatPercent: avg(vetVals) ? Math.round(avg(vetVals)! * 100) / 100 : 0,
        avgProteinPercent: avg(eiwVals) ? Math.round(avg(eiwVals)! * 100) / 100 : 0,
        avgDaysInMilk: avg(dimVals) ? Math.round(avg(dimVals)!) : 0,
        avgCelgetal: avg(celVals) ? Math.round(avg(celVals)!) : null,
        avgUreum: avg(ureumVals) ? Math.round(avg(ureumVals)!) : null,
        avgParity: avg(lactVals) ? Math.round(avg(lactVals)! * 10) / 10 : null,
        dimRange: dimVals.length > 0 ? { min: Math.min(...dimVals), max: Math.max(...dimVals) } : null,
        highCelCount: celVals.filter(v => v > 250).length,
        versCowCount: groupCows.filter(c => c.status === 'vers').length,
        // Include individual cow diernrs for reference
        cowDiernrs: groupCows.map(c => c.diernr),
      };
    }

    const groups = [
      buildGroupStats('Droogstaand', dryCows.map(c => ({ ...c, dim: null })), 'dry', 725),
      buildGroupStats('Hoogproductief (Vers)', hoogCows, 'lactating', 650),
      buildGroupStats('Midproductief', middenCows, 'lactating', 675),
      buildGroupStats('Laagproductief (Laat)', laagCows, 'lactating', 700),
    ];

    // Add unassigned cows (no kalfdatum) info
    const unassigned = noDimCows.length;

    return {
      mprDate: targetDate,
      totalCows: cows.length,
      activeCows: activeCows.length,
      dryCows: dryCows.length,
      unassignedCows: unassigned,
      groups,
    };
  } catch (error) {
    console.error("[Database] Failed to compute herd groups:", error);
    return { groups: [], mprDate: null, totalCows: 0 };
  }
}
