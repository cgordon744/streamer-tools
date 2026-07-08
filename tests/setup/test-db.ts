// Connection strings for the system-test database. Defaults target the
// docker-compose Postgres on port 5433; override via env for CI.
export const ADMIN_DATABASE_URL =
  process.env.TEST_ADMIN_DATABASE_URL ??
  "postgres://streamer:streamer@localhost:5433/streamer_tools";

export const TEST_DATABASE_NAME = "streamer_tools_test";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  `postgres://streamer:streamer@localhost:5433/${TEST_DATABASE_NAME}`;
