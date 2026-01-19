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
