import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

import {
  ADMIN_DATABASE_URL,
  TEST_DATABASE_NAME,
  TEST_DATABASE_URL,
} from "./test-db";

// Recreates the test database from scratch and applies migrations, so every
// system-test run starts from a pristine, migration-accurate schema.
export default async function setup(): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(
      `DROP DATABASE IF EXISTS ${TEST_DATABASE_NAME} WITH (FORCE)`,
    );
    await admin.query(`CREATE DATABASE ${TEST_DATABASE_NAME}`);
  } finally {
    await admin.end();
  }

  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
