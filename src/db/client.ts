import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// To switch to Neon's serverless driver later, swap Pool/drizzle imports here —
// nothing else in the app touches the driver.

const globalForDb = globalThis as unknown as {
  dbPool?: Pool;
};

function getPool(): Pool {
  if (!globalForDb.dbPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForDb.dbPool = new Pool({ connectionString });
  }
  return globalForDb.dbPool;
}

let cachedDb: NodePgDatabase<typeof schema> | undefined;

export function getDb(): NodePgDatabase<typeof schema> {
  if (!cachedDb) {
    cachedDb = drizzle(getPool(), { schema });
  }
  return cachedDb;
}
