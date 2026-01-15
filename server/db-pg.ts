import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, animalProfiles, feeds, User, InsertUser, AnimalProfile, Feed } from "../drizzle/schema-pg";

let _db: ReturnType<typeof drizzle> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

// Supabase connection - use pooler for serverless
const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

// Lazily create the drizzle instance
export async function getDb() {
  if (!_db && SUPABASE_URL) {
    try {
      _sql = postgres(SUPABASE_URL, { 
        ssl: 'require',
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10
      });
      _db = drizzle(_sql);
      console.log("[Database] Connected to Supabase PostgreSQL");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================
// User Authentication Queries
// ============================================

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot authenticate: database not available");
    return null;
  }

  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    // Simple password check (in production, use bcrypt)
    if (user.passwordHash === password) {
      // Update last signed in
      await db.update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));
      return user;
    }
    return null;
  } catch (error) {
    console.error("[Database] Authentication error:", error);
    return null;
  }
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Animal Profiles Queries
// ============================================

export async function getAllAnimalProfiles(): Promise<AnimalProfile[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get animal profiles: database not available");
    return [];
  }
  return db.select().from(animalProfiles);
}

export async function getAnimalProfileById(id: number): Promise<AnimalProfile | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get animal profile: database not available");
    return undefined;
  }
  const result = await db.select()
    .from(animalProfiles)
    .where(eq(animalProfiles.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAnimalProfile(profile: Omit<AnimalProfile, 'id' | 'createdAt'>): Promise<AnimalProfile | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create animal profile: database not available");
    return null;
  }
  
  const result = await db.insert(animalProfiles)
    .values(profile)
    .returning();
  
  return result.length > 0 ? result[0] : null;
}

export async function updateAnimalProfile(id: number, profile: Partial<AnimalProfile>): Promise<AnimalProfile | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update animal profile: database not available");
    return null;
  }
  
  const result = await db.update(animalProfiles)
    .set(profile)
    .where(eq(animalProfiles.id, id))
    .returning();
  
  return result.length > 0 ? result[0] : null;
}

export async function deleteAnimalProfile(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete animal profile: database not available");
    return false;
  }
  
  const result = await db.delete(animalProfiles)
    .where(eq(animalProfiles.id, id))
    .returning();
  
  return result.length > 0;
}

// ============================================
// Feeds Queries
// ============================================

export async function getAllFeeds(): Promise<Feed[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get feeds: database not available");
    return [];
  }
  return db.select().from(feeds);
}

export async function getFeedById(id: number): Promise<Feed | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get feed: database not available");
    return undefined;
  }
  const result = await db.select()
    .from(feeds)
    .where(eq(feeds.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFeedByName(name: string): Promise<Feed | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get feed: database not available");
    return undefined;
  }
  const result = await db.select()
    .from(feeds)
    .where(eq(feeds.name, name))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createFeed(feed: Omit<Feed, 'id' | 'createdAt'>): Promise<Feed | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create feed: database not available");
    return null;
  }
  
  const result = await db.insert(feeds)
    .values(feed)
    .returning();
  
  return result.length > 0 ? result[0] : null;
}

export async function updateFeed(id: number, feed: Partial<Feed>): Promise<Feed | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update feed: database not available");
    return null;
  }
  
  const result = await db.update(feeds)
    .set(feed)
    .where(eq(feeds.id, id))
    .returning();
  
  return result.length > 0 ? result[0] : null;
}

export async function deleteFeed(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete feed: database not available");
    return false;
  }
  
  const result = await db.delete(feeds)
    .where(eq(feeds.id, id))
    .returning();
  
  return result.length > 0;
}
