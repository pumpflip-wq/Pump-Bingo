
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL must be set. Did you forget to provision a database?");
  console.error("For Railway: Add a PostgreSQL database and link DATABASE_URL to your web service.");
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.includes("railway.app")) ? { rejectUnauthorized: false } : false
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
    await db.execute(sql`SELECT 1`);
    
    const tablesExist = await checkTablesExist();
    if (!tablesExist) {
      await createTables();
    }
  } catch (err: any) {
    console.error("Database initialization failed:", err);
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

async function createTables() {
  // Create users table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 10000,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create rounds table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rounds (
      id SERIAL PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'OPEN',
      start_time TIMESTAMP,
      price INTEGER NOT NULL DEFAULT 100,
      prize_pool INTEGER NOT NULL DEFAULT 0,
      winner_id INTEGER,
      server_seed TEXT NOT NULL,
      public_hash TEXT NOT NULL,
      drawn_numbers INTEGER[] DEFAULT '{}',
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      spl_mint TEXT,
      fee_percentage INTEGER DEFAULT 10
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
      joined_at TIMESTAMP DEFAULT NOW(),
      tx_signature TEXT
    )
  `);

  // Create transactions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      round_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}
