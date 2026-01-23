
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
 * In a production environment like Railway, we might not have 
 * drizzle-kit push access easily, so we can run a simple check/init.
 */
export async function initializeDatabase() {
  try {
    console.log("Initializing database connection...");
    // Simple query to test connection
    await db.execute(sql`SELECT 1`);
    console.log("Database connection successful.");
    
    // On Railway, if tables are missing, we might need to notify or handle.
    // The most reliable way is for the user to run db:push, but we can try to 
    // provide a hint in logs if it fails.
  } catch (err: any) {
    if (err.message?.includes('relation "rounds" does not exist')) {
      console.error("CRITICAL: Database tables are missing. Please run 'npm run db:push' or ensure the database is synchronized.");
    }
    console.error("Database initialization failed:", err);
  }
}
