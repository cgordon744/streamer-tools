# Build Log

## NEEDS INPUT

1. **Email sending credential (`RESEND_API_KEY` + `EMAIL_REMINDERS_ENABLED=true` in Vercel env)** — added 2026-07-13. The reminder pipeline (deliverable due in 48h, payment overdue) is built and runs on a daily Vercel cron, but no email-provider credential exists, so the sender is a console/log stub. To go live: create a Resend account + API key, set `RESEND_API_KEY` and `EMAIL_REMINDERS_ENABLED=true` in Vercel project env. No code change needed — the flag flips the sender in `src/core/email/sender.ts`. (Per session rules, no service signups were performed.)
2. **`CRON_SECRET` in Vercel env** — added 2026-07-13. The cron route refuses to run unauthenticated in production until this is set (any random string; Vercel automatically sends it as a Bearer token to cron invocations). Generate with `openssl rand -base64 32` and add to Vercel project env.
3. ~~**Neon `DATABASE_URL`**~~ — resolved 2026-07-07: migration 0000 applied and production user seeded against the user's Neon project; login credentials verified through the pooled endpoint. Local dev still uses Docker Postgres. _2026-07-13 note: no prod DB credential exists on this machine; prod migrations now run as the Vercel release step instead (see Phase 2 entry)._
4. ~~**Vercel deploy**~~ — resolved 2026-07-07: user imported the repo in the Vercel dashboard with `DATABASE_URL` (pooled Neon) + `AUTH_SECRET`. Live at https://streamer-tools-gilt.vercel.app — verified in production: unauthenticated redirect, credentials login → session, authenticated dashboard render. Deploys automatically on push to `main`.
5. ~~**GitHub remote**~~ — resolved 2026-07-07: pushed to `git@github.com:cgordon744/streamer-tools.git` (SSH). CI runs on push; repo has since been made public.

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

### 2026-07-13 — Founding decisions (pre-code, appended from portfolio kickoff)

**Context:** Portfolio model adopted (Creator Ops Portfolio) after evaluating three business models enabled by AI-speed development. Test case: YouTube sponsor tracker as wedge tool. (These decisions predate this repo's code; appended today as the portfolio docs landed in `docs/`.)

**Decisions:**

1. **Business model: portfolio of small tools, one buyer, one bundle.** Alternatives considered: segment-of-one custom SaaS (rejected: requires sales conversations, slower feedback), velocity-flywheel single product (rejected for now: depends heavily on existing audience). Portfolio chosen because individual tool risk is smallest and the demo-test filter matches available distribution channels.
2. **Selection filter: the 60-second demo test**, audience = working creators, never aspiring founders. See `docs/PORTFOLIO_THESIS.md` §3, §7.
3. **Pricing: single bundle, $20–30/mo, no per-tool pricing.** Reasoning in thesis §4 (churn decision points, umbrella effect, data-loop adoption).
4. **Free tier by the artifact rule:** outward-traveling artifacts free, private workflow paid. Cold-start rule adopted: free tools must deliver full value from public/user-entered data on first use; bundle data enhances, never gates. Prompted by the media-kit cold-start question — resolved via YouTube API channel stats + manual fields. Thesis §5.
5. **Kill discipline: pre-committed thresholds per tool, 60-day window, freeze as default outcome.** Thesis §6.
6. **Chassis stack locked:** Next.js 14 App Router, TypeScript strict, Tailwind + shadcn, Drizzle, Neon Postgres, Auth.js v5, Stripe, Vercel. Single repo, domain-module architecture with import boundary rules. `docs/CHASSIS_SPEC.md`.
7. **Target buyer definition:** solo creators, ~10K–500K subs as proxy, deal activity (1–10/quarter) as true qualifier. Open question logged (thesis §8) on formalizing by deal volume.

**Next actions:**
- [x] Write the tracker spec (wedge tool) — `spec/tracker-spec.md`
- [x] Chassis scaffold — superseded: the tracker MVP was built first (sessions above); the 2026-07-13 session aligns it to the chassis instead

### 2026-07-13 — Chassis audit (Phase 1)

- **What:** Audited the MVP against `docs/CHASSIS_SPEC.md` → `docs/AUDIT.md`. Headline: structure and instincts are chassis-shaped (thin routes, module layer, userId scoping everywhere, config file for statuses) but drifted on layout (`modules/*` flat vs `/domains/tracker` + `/core`), tracker UI in shared `components/`, unprefixed table names, no soft deletes, statuses persisted as Postgres enums (chassis §4 forbids), no entitlements, no instrumentation. Deployment health verified pre-change: typecheck/lint/build green, 51/51 unit+component tests, live app serving.
- **Chassis-level decision (stack table):** the repo runs **Next.js 16.2**, not the 14 in CHASSIS_SPEC §1. Scaffold choice was logged 2026-07-06; app is built, tested, and deployed on 16. Downgrading is pure risk; **treating Next 16 as the chassis standard** — CHASSIS_SPEC §1 should read "Next.js 16 App Router". Per §1's own rule, this entry is that decision's log.
- **Touched /core or boundaries?** No (audit only).
- **Next:** Phase 2 alignment — restructure, enum→text migration (+ stage remap to spec §6 list), table renames, soft deletes, `hasAccess` stub, events table.

### 2026-07-13 — Chassis alignment (Phase 2)

- **What:** Four commits, each deployed green: (1) restructure into `/domains/tracker` + `/core` — sponsors+deals merged into one tracker domain (they're one tool), tracker UI out of shared `components/`; (2) DB enums → text columns with stage remap to the spec §6 list (`lead / negotiating / contract_signed / content_delivered / invoiced / paid / dead`), `tracker_*` table renames (indexes + FK constraints renamed to match), soft deletes everywhere; (3) `hasAccess(user, feature)` stub in `/core/billing` wired into all tracker pages; (4) internal `events` table + `trackEvent()` wired to signup / deal_created / deal_stage_changed / daily-throttled active heartbeat.
- **Touched /core or boundaries?** Yes — created `/core` itself. Two logged exceptions/decisions: (a) `core/db/schema.ts` aggregates domain schemas for drizzle-kit — the one place core sees domains, commented as such; (b) **migrations now run as the Vercel release step** (`vercel.json` buildCommand `pnpm db:migrate && pnpm build`, per CHASSIS §7) because no prod DB credential exists on this machine — the deploy's env has `DATABASE_URL`. Verified working: the Phase-2 push migrated Neon (renames + enum drop + remap) and deployed successfully on the first try.
- **Tooling note:** drizzle-kit's rename detection requires a TTY, so migration `0002` (renames + soft deletes) is hand-written SQL + hand-built snapshot; parity proven by `db:generate` reporting no drift and the system suite rebuilding a fresh DB through the whole chain (19/19 green).
- **Data note:** prod deal rows' status values were remapped in-place (`pitched→lead`, `signed→contract_signed`, `delivered→content_delivered`) — non-destructive, reversible.
- **Next:** Phase 3 — payment tracking + overdue (hero), dashboard strip, deliverables checklist, exported data contract, reminder cron.

### 2026-07-13 — Tracker spec §6 delta (Phase 3)

- **What (migration 0004 + one feature commit, then cron commit):**
  - **Payment tracking + overdue (hero):** `payment_status` (`not_invoiced / invoiced / paid`, config-driven text) on deals, backfilled from stage. Overdue is always *computed* (`paymentDueDate` past + not paid + not dead), never stored — `domains/tracker/payments.ts` holds the pure logic, mirrored in SQL for stats. Kanban cards get a red `Overdue Nd · $X` banner + red border; deals table gets a Payment column; deal form gets a payment select.
  - **Decision — stage vs. payment are two axes, synced forward-only:** the spec's stage list contains Invoiced/Paid *and* asks for a separate payment status. Resolution: stage = where the work is, payment = where the money is; dragging a deal to the Invoiced/Paid stage advances payment status (never backward — dragging a paid deal back does not un-pay it), while the form edits payment directly. Covered by a system test.
  - **Dashboard strip** replaced the old KPI cards, same visual pattern: active deals · $ in flight · overdue payments (goes red, spec's alert) · next deliverable (nearest upcoming across deal dates *and* open checklist items).
  - **Deliverables checklist:** `tracker_deliverables` (userId-scoped, soft-delete) + details dialog (click a kanban card): stage/payment badges, dates, notes, checklist with add/check/delete and due-date urgency colors. Card shows a `n/m` checklist chip.
  - **Exported data contract (spec §5):** `getVerifiedSponsors` / `getDealHistory` / `getPayableDeals` in tracker's `queries.ts`, each doc-commented with its consuming future domain (media kit / rates / invoices).
  - **Reminder cron:** `vercel.json` cron (daily 14:00 UTC) → `/api/cron/reminders` (excluded from session auth; `CRON_SECRET` Bearer check, refuses unauthenticated prod runs). Logic in `domains/tracker/reminders.ts` is stateless/idempotent-per-day: deliverable reminder fires when due date is exactly 2 days out; overdue-payment reminder on day 1 past due then weekly — no sent-log table needed. Sender behind `core/email/sender.ts` interface: Resend implementation ready but gated by `EMAIL_REMINDERS_ENABLED` flag + `RESEND_API_KEY`; console stub otherwise. **See NEEDS INPUT #1–2.**
- **Touched /core or boundaries?** Yes: `/core/email` (sender interface) and `/core/config/flags.ts` (feature flags, chassis §7) added; payment-status enums joined `/core/config/deals.ts`; proxy matcher now excludes `api/cron`.
- **Scope note:** committed as one feature commit rather than four — the changes share `queries.ts`/`schema.ts`/board files, and splitting would have produced intermediate states needing their own verification. Cron is separate.

## End-of-session summary (2026-07-14, chassis-alignment + spec-delta session)

**Done and verified:**
- **Phase 1 (audit):** `docs/AUDIT.md` — MVP mapped against CHASSIS_SPEC; committed before any change.
- **Phase 2 (align):** `/domains/tracker` + `/core` layout with boundary rules; DB enums → config-driven text with stage remap to the spec list (7 stages incl. Invoiced/Dead); `tracker_*` table prefixes; soft deletes everywhere; `hasAccess()` entitlement stub gating all tracker pages; internal `events` instrumentation (signup / deal_created / deal_stage_changed / daily active heartbeat).
- **Phase 3 (extend):** payment status + computed overdue detection with red kanban banner + strip alert (the hero); spec dashboard strip (active · in flight · overdue · next deliverable); per-deal deliverables checklist with due dates in a card-click details dialog; exported data contract (`getVerifiedSponsors` / `getDealHistory` / `getPayableDeals`); daily reminder cron with stubbed sender behind a provider interface + feature flag.
- **Quality gates:** typecheck, lint, 52 unit/component + 21 system tests green; every flow exercised in a driven browser locally (overdue banner, strip alert, checklist add/toggle, stage-move payment sync, cron stub email, event rows in DB).

**Live:** all five migrations applied to Neon via the new migrate-on-deploy release step; both deploys (Phase 2, Phase 3) succeeded first try; login page + cron guard verified in prod. **Not verified in prod:** the authenticated UI walkthrough — the prod password differs from local dev, so one manual login-and-look by the founder is wanted (the deployed code/schema are exactly what was verified locally).

**Broken:** nothing known. The reminder cron in prod intentionally returns 503 until `CRON_SECRET` is set (NEEDS INPUT #2).

**Next session:** 1) resolve NEEDS INPUT #1–2 (Resend key + flag, CRON_SECRET) to turn on real reminder emails; 2) founder walkthrough of the live app; 3) record the 60-second demo (spec §2) and consider the launch checklist; 4) parked ideas: deal title field, sponsor detail page, pagination, restore-deleted UI (soft deletes make it possible), boundary-enforcing lint rule when domain #2 lands.
