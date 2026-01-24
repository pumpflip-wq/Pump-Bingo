
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

const { Pool } = pg;

// Use DATABASE_URL_EXTERNAL if provided (for manual sync), otherwise fall back to DATABASE_URL
const connectionString = process.env.DATABASE_URL_EXTERNAL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: DATABASE_URL must be set. Did you forget to provision a database?");
  console.error("For Railway: Add a PostgreSQL database and link DATABASE_URL to your web service.");
}

const isProduction = process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT;

export const pool = new Pool({ 
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle(pool, { schema });

/**
 * Ensures the database schema is initialized and synchronized.
 * Automatically creates tables if they don't exist (for Railway deployment).
 */
export async function initializeDatabase() {
  try {
    const res = await db.execute(sql`SELECT 1`);
    console.log("Database connection successful:", res);
    
    const tablesExist = await checkTablesExist();
    if (!tablesExist) {
      console.log("Tables not found, creating schema...");
      await createTables();
      console.log("Schema creation successful.");
    } else {
      console.log("Database tables already exist.");
      // Run migrations for any new tables that might be missing
      await runMigrations();
    }
  } catch (err: any) {
    console.error("Database initialization failed:", err);
    // Log more details about the error
    if (err.message) console.error("Error message:", err.message);
    if (err.code) console.error("Error code:", err.code);
    throw err;
  }
}

async function checkTablesExist(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1 FROM rounds LIMIT 1`);
    return true;
  } catch (err: any) {
    if (err.code === '42P01') { // relation does not exist
      return false;
    }
    throw err;
  }
}

async function runMigrations() {
  // Ensure payment_queue table exists (added after initial schema)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_queue (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount BIGINT NOT NULL,
      tx_signature TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("Migrations complete.");
}

async function createTables() {
  // Create users table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      balance BIGINT NOT NULL DEFAULT 10000,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create rounds table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rounds (
      id SERIAL PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'OPEN',
      start_time TIMESTAMP,
      price BIGINT NOT NULL DEFAULT 100,
      prize_pool BIGINT NOT NULL DEFAULT 0,
      winner_id INTEGER,
      server_seed TEXT NOT NULL,
      public_hash TEXT NOT NULL,
      drawn_numbers INTEGER[] DEFAULT '{}',
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      spl_mint TEXT,
      fee_percentage INTEGER DEFAULT 10,
      payout_signature TEXT
    )
  `);

  // Migration for existing tables: ensure columns exist
  await db.execute(sql`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS payout_signature TEXT`);
  await db.execute(sql`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS spl_mint TEXT`);
  await db.execute(sql`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS fee_percentage INTEGER DEFAULT 10`);
  
  try {
    await db.execute(sql`ALTER TABLE participants ADD COLUMN IF NOT EXISTS final_win_prob INTEGER`);
  } catch (e) {
    console.log("Column final_win_prob might already exist or table is being created");
  }

  // Create payment_queue table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_queue (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount BIGINT NOT NULL,
      tx_signature TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create participants table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      round_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      card JSONB NOT NULL,
      has_bingo BOOLEAN DEFAULT FALSE,
      final_win_prob INTEGER,
      joined_at TIMESTAMP DEFAULT NOW(),
      tx_signature TEXT
    )
  `);

  // Force column existence
  await db.execute(sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='participants' AND column_name='final_win_prob') THEN ALTER TABLE participants ADD COLUMN final_win_prob integer; END IF; END $$;`);

  // Create transactions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount BIGINT NOT NULL,
      type TEXT NOT NULL,
      round_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}
