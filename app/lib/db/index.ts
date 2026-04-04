/**
 * Oply Database Client — Drizzle ORM + PostgreSQL
 * 
 * Singleton pattern ensures a single connection pool in development
 * (avoiding hot-reload connection leaks in Next.js).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and configure your PostgreSQL connection string."
  );
}

// Prevent multiple instances in development due to hot reload
const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof postgres> | undefined;
};

const conn = globalForDb.conn ?? postgres(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });
export type Database = typeof db;
