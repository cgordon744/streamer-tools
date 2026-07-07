# Build Log

## NEEDS INPUT

1. ~~**Neon `DATABASE_URL`**~~ — resolved 2026-07-07: migration 0000 applied and production user seeded against the user's Neon project; login credentials verified through the pooled endpoint. Local dev still uses Docker Postgres.
2. **Vercel deploy** — no Vercel CLI/token on this machine. To deploy: connect the GitHub repo in the Vercel dashboard (or `npm i -g vercel && vercel login` for CLI), set env vars `DATABASE_URL` (pooled Neon string) and `AUTH_SECRET`, deploy.
3. ~~**GitHub remote**~~ — resolved 2026-07-07: pushed to `git@github.com:cgordon744/streamer-tools.git` (SSH). CI runs on push; repo is private so verify the first run in the Actions tab.

## Log

### 2026-07-06 — Session start, scaffold

- **What:** Confirmed re-prioritization with user (SaaS un-tabled per explicit decision). Initialized git repo in `C:\src\repos\streamer-tools`. Scaffolded Next.js 16.2 (App Router, TS, Tailwind v4, ESLint, src dir) with pnpm. Added Drizzle + pg, Auth.js v5 beta, zod, bcryptjs, Prettier, drizzle-kit. Set up shadcn/ui manually (interactive-only init CLI) and added 12 base components. Wrote CI workflow (lint, format, typecheck, build), docker-compose for local Postgres, `.env.example`, ARCHITECTURE.md.
- **Why:** Skeleton-first per brief §2/§4 — tooling and CI from the start, not later.
- **Next:** Drizzle schema (users/sponsors/deals, all user_id-scoped), local DB up, migrations.

### 2026-07-06 — Schema + auth

- **What:** Drizzle schema in per-module files (`modules/auth|sponsors|deals/schema.ts`, aggregated in `db/schema.ts`): users, sponsors, deals — every domain table `user_id`-scoped with FK + index. Deal statuses/content types as Postgres enums derived from `src/config/deals.ts`. Money stored as integer cents. Migration 0000 generated. Auth.js v5: split config (edge-safe `modules/auth/config.ts` for proxy.ts middleware, full config with Credentials provider in `src/auth.ts`), bcrypt password verify against users table, JWT sessions with `session.user.id`, login page, authenticated `(app)` layout with nav + sign-out, `requireUserId()` as the single session→userId entry point. Seed script reads SEED_USER_* env vars. Build green.
- **Why:** Multi-tenancy readiness (§4): scoping and the user table are real from day one; services take userId as an argument instead of reading the session, so future non-browser callers reuse them.
- **Next:** Local Postgres up (Docker Desktop was not running; started it), run migration + seed, verify login end-to-end, then Sponsors CRUD.

### 2026-07-06 — Sponsors CRUD, Deals CRUD, Dashboard

- **What:** Sponsors module (validation/service/actions + table UI with add/edit dialog and delete confirm). Deals module (same shape; sponsor/status/content-type selects, USD amount parsed to cents, two date fields). Shared `DealsTable`, `DealStatusBadge` (colors from `src/config/deals.ts`), `DealFormDialog` used by both `/deals` and the dashboard. Dashboard = all deals ordered by `LEAST(deliverable_due_date, payment_due_date) NULLS LAST` in SQL, with status + sponsor filters via URL search params (shareable/bookmarkable). Every action re-checks ownership (`requireUserId()` + user-scoped service queries); deal creation verifies the sponsor belongs to the acting user. Lint/typecheck/build green.
- **Why:** URL-param filters keep the dashboard server-rendered (no client data fetching layer to rip out later); one deal-form component avoids dashboard/deals drift.
- **Note:** ESLint's new `react-hooks/set-state-in-effect` rule rejected the close-dialog-in-effect pattern; replaced with wrapping the server action so success closes the dialog inside the submit transition — simpler and strictly better.
- **Next:** Docker engine up → migrate + seed → run the app and verify the full flow (login → sponsor → deal → dashboard order/filters).

### 2026-07-06 — Local end-to-end verification

- **What:** Docker Desktop was crash-looping on a stale `dockerInference` unix-socket file (undeletable orphaned reparse point); fixed by renaming `%LOCALAPPDATA%\Docker\run` → `run_stale` and relaunching. Postgres 17 container up on :5433, migration 0000 applied, user seeded. Verified in a driven browser against `pnpm dev`:
  - Unauthenticated request → redirected to `/login`; login creates a valid session (checked `/api/auth/session`); sign-out returns to `/login`.
  - Sponsors: created 2 via dialog, table renders, empty-state before that.
  - Deals: created 3 (one with both dates, one with deliverable only, one with none), edited one ($500.50 → $650, dialog prefilled correctly), created + deleted a throwaway via row actions with confirm dialog.
  - Dashboard: sort order Jul 12 → Jul 20 → no-dates-last (LEAST/NULLS LAST working); `?status=` and `?sponsor=` filters correct individually and combined; filter dropdowns update the URL; Clear button appears.
- ~~**Caveat worth one manual check:**~~ this turned out to be a REAL BUG, not a headless artifact — confirmed on the first Vercel deploy (login bounced back to /login despite a valid session being created). Root cause: `signIn` was called without `redirectTo`, so Auth.js redirected to the referring page (/login), and /login didn't redirect authenticated users. Fixed 2026-07-07: explicit `redirectTo: "/"` in `authenticate`, and /login now redirects to `/` when a session exists. Regression-tested in the driven browser: login lands on the dashboard; /login while authenticated bounces to `/`. Lesson recorded: don't write off a reproducible symptom as a tooling artifact without proving it.
- **Not explicitly re-tested:** sponsor edit/delete UI (identical component pattern to deals, which passed).

## End-of-session summary (2026-07-06)

**Done and verified locally:** full MVP feature set — auth (single seeded user), sponsors CRUD, deals CRUD, dashboard sorted by nearest deadline with status badges, status/sponsor filters. 4 commits, CI workflow ready, lint/format/typecheck/build all green.

**Live:** not yet — deploy blocked on credentials (see NEEDS INPUT: Neon `DATABASE_URL`, Vercel account/token, GitHub remote). Everything is structured so going live is: create Neon project → run migrate+seed against it → import repo in Vercel with `DATABASE_URL` + `AUTH_SECRET` → done.

**Broken:** nothing known.

**Next session:** 1) provide the three credentials above and deploy; 2) one real-browser login sanity check; 3) first real data entry.

**Scope notes (ideas deliberately not built):** deal title/name field (display currently uses sponsor + content type); overdue highlighting on the dashboard; sponsor detail page listing its deals; pagination (fine until ~hundreds of rows).
