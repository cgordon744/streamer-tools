# Build Log

## NEEDS INPUT

1. **Neon `DATABASE_URL`** — no Neon credentials on this machine. Developing against local Docker Postgres (`docker compose up -d`). To go live: create a Neon project, put the pooled connection string in Vercel env vars, run migrations against it.
2. **Vercel deploy** — no Vercel CLI/token on this machine. To deploy: `npm i -g vercel && vercel login`, then `vercel link` in this repo and `vercel --prod` (or connect the GitHub repo in the Vercel dashboard). Env vars needed: `DATABASE_URL`, `AUTH_SECRET`.
3. **GitHub remote** — repo is local-only (no `gh` CLI, no token). CI workflow is committed and will run once a GitHub remote is added and pushed.

## Log

### 2026-07-06 — Session start, scaffold

- **What:** Confirmed re-prioritization with user (SaaS un-tabled per explicit decision). Initialized git repo in `C:\src\repos\streamer-tools`. Scaffolded Next.js 16.2 (App Router, TS, Tailwind v4, ESLint, src dir) with pnpm. Added Drizzle + pg, Auth.js v5 beta, zod, bcryptjs, Prettier, drizzle-kit. Set up shadcn/ui manually (interactive-only init CLI) and added 12 base components. Wrote CI workflow (lint, format, typecheck, build), docker-compose for local Postgres, `.env.example`, ARCHITECTURE.md.
- **Why:** Skeleton-first per brief §2/§4 — tooling and CI from the start, not later.
- **Next:** Drizzle schema (users/sponsors/deals, all user_id-scoped), local DB up, migrations.

### 2026-07-06 — Schema + auth

- **What:** Drizzle schema in per-module files (`modules/auth|sponsors|deals/schema.ts`, aggregated in `db/schema.ts`): users, sponsors, deals — every domain table `user_id`-scoped with FK + index. Deal statuses/content types as Postgres enums derived from `src/config/deals.ts`. Money stored as integer cents. Migration 0000 generated. Auth.js v5: split config (edge-safe `modules/auth/config.ts` for proxy.ts middleware, full config with Credentials provider in `src/auth.ts`), bcrypt password verify against users table, JWT sessions with `session.user.id`, login page, authenticated `(app)` layout with nav + sign-out, `requireUserId()` as the single session→userId entry point. Seed script reads SEED_USER_* env vars. Build green.
- **Why:** Multi-tenancy readiness (§4): scoping and the user table are real from day one; services take userId as an argument instead of reading the session, so future non-browser callers reuse them.
- **Next:** Local Postgres up (Docker Desktop was not running; started it), run migration + seed, verify login end-to-end, then Sponsors CRUD.
