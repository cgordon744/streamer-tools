# Build Log

## NEEDS INPUT

1. ~~**Neon `DATABASE_URL`**~~ — resolved 2026-07-07: migration 0000 applied and production user seeded against the user's Neon project; login credentials verified through the pooled endpoint. Local dev still uses Docker Postgres.
2. ~~**Vercel deploy**~~ — resolved 2026-07-07: user imported the repo in the Vercel dashboard with `DATABASE_URL` (pooled Neon) + `AUTH_SECRET`. Live at https://streamer-tools-gilt.vercel.app — verified in production: unauthenticated redirect, credentials login → session, authenticated dashboard render. Deploys automatically on push to `main`.

3. ~~**GitHub remote**~~ — resolved 2026-07-07: pushed to `git@github.com:cgordon744/streamer-tools.git` (SSH). CI runs on push; repo has since been made public.

_(No open items — MVP definition of done met.)_

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

### 2026-07-07 — Login redirect fix, production deploy, dashboard redesign

- **Login redirect bug** (see amended note above): fixed, regression-tested, deployed.
- **Production**: live at https://streamer-tools-gilt.vercel.app, full auth + dashboard flow verified against the deployed site. Neon migrated + seeded; auto-deploy on push to `main`.
- **Dashboard redesign** (user-requested scope expansion pre-launch): researched modern dashboard patterns (Appsmith/Stripe/Linear: sidebar + KPI cards + card grid), CRM pipeline UX (kanban beats tables for 20–100 deals; keep table as detail view), and creator habits (top YouTuber Notion templates are all status boards — the kanban mental model is native to this audience). Shipped: sidebar app shell (top bar on mobile), 4-card KPI strip (pipeline value / awaiting payment / paid / due-this-week, one SQL aggregate in `getDealStats`), 5-column pipeline board with drag-and-drop _and_ per-card "Move to" menu (touch/keyboard fallback), optimistic updates, per-column counts + dollar totals, due-date chips (amber ≤7 days, red overdue). Full filterable table moved to `/deals`. No new dependencies (native HTML5 DnD). Board verified in driven browser: moves persist both directions, KPIs correct against seed data.
- **Remaining ideas parked**: deal title field, sponsor detail page, pagination, overdue emphasis on the board's column headers.

### 2026-07-07 — Sidebar: icon fix, collapsible + resizable

- **What:** Swapped the Dashboard nav icon from lucide `Kanban` (reads as a sideways/rotated glyph) to `LayoutDashboard`. Made the sidebar collapsible to a 64px icon rail (toggle button, labels hide via `group-data-[state=collapsed]` CSS so server-rendered children need no context) and drag-resizable (200–340px, right-edge handle, double-click resets to 240). Both persist in cookies read by the server layout — correct width/state on first paint, no flash. Mobile keeps the full-width top bar via `max-md:w-full!` overriding the inline width.
- **Verified:** collapse/expand + label hiding, cookie persistence across reload, drag resize (240→300 persisted), double-click reset, mobile top bar unaffected.
- **Note:** the local preview browser's renderer freezes CSS transitions and animations (also causes its screenshot timeouts and a zero-size initial viewport) — width changes had to be verified with transitions disabled. Real browsers are unaffected; worth remembering when driving this preview tool.
