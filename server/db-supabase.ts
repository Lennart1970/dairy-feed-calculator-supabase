import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dctxqqfjwzlyqtdwyidm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdHhxcWZqd3pseXF0ZHd5aWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTM2MjksImV4cCI6MjA4NDA2OTYyOX0.tzEYxCHOZ0Q7wu5Qgj1BC76ObEYTMOxC3b2oY8GMMPk';

let _supabase: SupabaseClient | null = null;

// Get Supabase client
export function getSupabase(): SupabaseClient {
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
  username: string;
  password_hash: string;
  name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  last_signed_in: string;
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
  created_at: string;
}

// ============================================
// User Authentication Queries
// ============================================

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      console.log('[Database] User not found:', username);
      return null;
    }

    // Simple password check (in production, use bcrypt)
    if (data.password_hash === password) {
      // Update last signed in
      await supabase
        .from('users')
        .update({ last_signed_in: new Date().toISOString() })
        .eq('id', data.id);
      
      return data as User;
    }
    
    return null;
  } catch (error) {
    console.error('[Database] Authentication error:', error);
    return null;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.warn('[Database] Cannot get user:', error.message);
    return null;
  }

  return data as User;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    return null;
  }

  return data as User;
}

// ============================================
// Animal Profiles Queries
// ============================================

export async function getAllAnimalProfiles(): Promise<AnimalProfile[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('animal_profiles')
    .select('*')
    .order('id');

  if (error) {
    console.warn('[Database] Cannot get animal profiles:', error.message);
    return [];
  }

  return data as AnimalProfile[];
}

export async function getAnimalProfileById(id: number): Promise<AnimalProfile | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('animal_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }

  return data as AnimalProfile;
}

export async function createAnimalProfile(profile: Omit<AnimalProfile, 'id' | 'created_at'>): Promise<AnimalProfile | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('animal_profiles')
    .insert(profile)
    .select()
    .single();

  if (error) {
    console.error('[Database] Cannot create animal profile:', error.message);
    return null;
  }

  return data as AnimalProfile;
}

export async function updateAnimalProfile(id: number, profile: Partial<AnimalProfile>): Promise<AnimalProfile | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('animal_profiles')
    .update(profile)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Database] Cannot update animal profile:', error.message);
    return null;
  }

  return data as AnimalProfile;
}

export async function deleteAnimalProfile(id: number): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('animal_profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Database] Cannot delete animal profile:', error.message);
    return false;
  }

  return true;
}

// ============================================
// Feeds Queries
// ============================================

export async function getAllFeeds(): Promise<Feed[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .order('id');

  if (error) {
    console.warn('[Database] Cannot get feeds:', error.message);
    return [];
  }

  return data as Feed[];
}

export async function getFeedById(id: number): Promise<Feed | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }

  return data as Feed;
}

export async function getFeedByName(name: string): Promise<Feed | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .eq('name', name)
    .single();

  if (error) {
    return null;
  }

  return data as Feed;
}

export async function createFeed(feed: Omit<Feed, 'id' | 'created_at'>): Promise<Feed | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('feeds')
    .insert(feed)
    .select()
    .single();

  if (error) {
    console.error('[Database] Cannot create feed:', error.message);
    return null;
  }

  return data as Feed;
}

export async function updateFeed(id: number, feed: Partial<Feed>): Promise<Feed | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('feeds')
    .update(feed)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Database] Cannot update feed:', error.message);
    return null;
  }

  return data as Feed;
}

export async function deleteFeed(id: number): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('feeds')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Database] Cannot delete feed:', error.message);
    return false;
  }

  return true;
}
