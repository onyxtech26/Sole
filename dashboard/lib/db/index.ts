import { drizzle as postgresDrizzle } from "drizzle-orm/postgres-js";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";
import * as fs from "fs";
import * as path from "path";

const connectionString = process.env.DATABASE_URL;

async function initializePglite(pglite: PGlite) {
  try {
    const res = await pglite.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admins'
      );
    `);
    
    const exists = (res.rows[0] as any)?.exists;
    if (!exists) {
      console.log("Initializing local PGlite database...");
      
      const schemaPath = path.join(process.cwd(), "supabase", "01_schema.sql");
      const seedPath = path.join(process.cwd(), "supabase", "02_seed.sql");
      
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        await pglite.exec(schemaSql);
        console.log("Schema applied successfully.");
      } else {
        console.warn("Schema file not found at", schemaPath);
      }
      
      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, "utf-8");
        await pglite.exec(seedSql);
        console.log("Seed data loaded successfully.");
      } else {
        console.warn("Seed file not found at", seedPath);
      }
      
      console.log("PGlite database initialized.");
    }
  } catch (error) {
    console.error("Failed to initialize PGlite:", error);
  }
}

let db: any;

if (connectionString) {
  const globalForDb = globalThis as unknown as { _pg?: ReturnType<typeof postgres> };
  const client = globalForDb._pg ?? postgres(connectionString, { prepare: false });
  if (process.env.NODE_ENV !== "production") globalForDb._pg = client;
  db = postgresDrizzle(client, { schema });
} else {
  const globalForPglite = globalThis as unknown as { _pglite?: PGlite; _db?: any };
  if (!globalForPglite._pglite) {
    const dataDir = path.join(process.cwd(), "tmp", "pgdata");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const pglite = new PGlite(dataDir);
    globalForPglite._pglite = pglite;
    globalForPglite._db = pgliteDrizzle(pglite, { schema });
    void initializePglite(pglite);
  }
  db = globalForPglite._db;
}

export { db };
export type DB = typeof db;

