import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

let db: NeonHttpDatabase<typeof schema> | null = null;
let isConnected = false;
let connectionError: string | null = null;

export function initializeDatabase(): { db: NeonHttpDatabase<typeof schema> | null; isConnected: boolean; error: string | null } {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.warn('⚠️  DATABASE_URL environment variable not found. Falling back to in-memory storage.');
      connectionError = 'DATABASE_URL environment variable not set';
      return { db: null, isConnected: false, error: connectionError };
    }

    const sql = neon(databaseUrl);
    db = drizzle(sql, { schema });
    isConnected = true;
    connectionError = null;
    
    console.log('✅ PostgreSQL database connection established');
    return { db, isConnected, error: null };
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    connectionError = `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    db = null;
    isConnected = false;
    return { db: null, isConnected: false, error: connectionError };
  }
}

export function getDatabase() {
  if (!db && !connectionError) {
    return initializeDatabase();
  }
  return { db, isConnected, error: connectionError };
}

export async function testConnection(): Promise<boolean> {
  try {
    const { db } = getDatabase();
    if (!db) return false;
    
    // Simple query to test connection
    await db.select().from(schema.inventoryItems).limit(1);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}