// Aggregated schema for drizzle-kit and the db client.
// Table definitions live with their owning module (core or domain).
// Deliberate exception to "core never sees domains": migration tooling
// must aggregate every table; nothing else in /core imports domain code.

export * from "@/core/auth/schema";
export * from "@/domains/tracker/schema";
