
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL must be set. Did you forget to provision a database?");
  console.error("For Railway: Add a PostgreSQL database and link DATABASE_URL to your web service.");
  // process.exit(1); // Don't exit immediately to allow other services to potentially start or provide better diagnostics
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.includes("railway.app")) ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle(pool, { schema });
