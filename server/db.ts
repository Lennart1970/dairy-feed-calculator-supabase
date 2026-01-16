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
