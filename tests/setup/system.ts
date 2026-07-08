import { afterAll } from "vitest";

import { TEST_DATABASE_URL } from "./test-db";

// Point the app's db client at the test database before any service module
// creates the pool (getDb reads DATABASE_URL lazily on first call).
process.env.DATABASE_URL = TEST_DATABASE_URL;

afterAll(async () => {
  const { closeDb } = await import("@/db/client");
  await closeDb();
});
