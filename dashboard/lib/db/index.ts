import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy the Supabase pooler connection string into .env " +
      "(Supabase dashboard → Project Settings → Database → Connection string → Transaction pooler).",
  );
}

// Single pooled client. Supabase's transaction pooler is serverless-friendly (Vercel).
const globalForDb = globalThis as unknown as { _pg?: ReturnType<typeof postgres> };
const client = globalForDb._pg ?? postgres(connectionString, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb._pg = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
