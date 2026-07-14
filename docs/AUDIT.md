# Chassis Conformance Audit — 2026-07-13

Codebase (as of `090107a`) mapped against `CHASSIS_SPEC.md`. Verdicts: **Conformant / Drifted / Missing**.

The MVP predates the chassis spec; drift below is expected, not a defect. The good news: the original build's instincts (thin routes, module layer, userId scoping, config file for statuses) mean alignment is mostly *moving and renaming*, not rewriting.

## 1. Folder structure vs. domain-module layout (CHASSIS §2) — **Drifted**

| Check | Verdict | Note |
|---|---|---|
| Routes thin, no business logic | **Conformant** | Pages fetch via service functions and compose components; all writes go through server actions in the module layer. |
| Business logic in a domain layer | **Conformant** | `src/modules/{sponsors,deals}` each have `schema.ts` / `service.ts` (≈ chassis `queries.ts`) / `actions.ts` / `validation.ts` — same shape, different names. |
| Layout matches `/domains` + `/core` | **Drifted** | Everything is a flat sibling under `src/modules`; no separation between chassis code (auth, db, config) and tool code (sponsors, deals). `sponsors` + `deals` are one tool — they belong together in `/domains/tracker`. |
| `(marketing)` route group | **Missing** | No public pages exist. Not needed until the first free tool; noted for completeness. |
| Would a second tool slot in cleanly? | **Blocked by two things** | (a) no `/core` for it to share; (b) tracker-specific UI lives in the shared `src/components/` folder (see §2 below). |

## 2. Import boundaries — **Drifted**

- **Violation (structural):** tracker-specific components — `pipeline-board`, `deals-table`, `deal-form-dialog`, `deal-row-actions`, `deal-status-badge`, `stat-cards` — live in shared `src/components/` and import `modules/deals` internals. A second domain would inherit tracker internals via "shared" UI. Fix: move them to `domains/tracker/components/`.
- `deals` imports `sponsors`' service and schema directly. Cross-*module* today, but both are the same tool — internal once merged into `/domains/tracker`.
- Routes import module services/actions directly — this is the intended interface (chassis rule 2), fine.
- No mechanical enforcement (lint rule) of boundaries. Acceptable at one domain; worth adding when domain #2 lands.

## 3. Schema conventions (CHASSIS §3) — **Drifted**

| Check | Verdict | Note |
|---|---|---|
| `userId` on every domain table, indexed | **Conformant** | Both `deals` and `sponsors`: FK + index, every service query scoped. Services take `userId` as an argument — better than spec asks. |
| Domain-prefixed table names | **Drifted** | `deals`, `sponsors` → need `tracker_deals`, `tracker_sponsors` (rename migration, non-destructive). |
| Soft deletes (`deletedAt`) | **Missing** | Hard deletes with FK cascade everywhere. |
| Shared entities in `/core` schemas | **Drifted** | `users` lives in `modules/auth` — right idea, moves to `/core/auth`. No `subscriptions` / `youtube_channels` tables yet (not needed until Stripe / YouTube OAuth). |

## 4. Config-driven enums (CHASSIS §4) — **Drifted**

- `src/config/deals.ts` is a genuine single source of truth (values + labels + badge styling) — the config half is **Conformant**.
- But values are persisted as **Postgres enum types** (`deal_status`, `content_type`), which §4 explicitly rules out: adding a stage is currently a schema migration. Fix: migrate columns to `text`, validation stays in zod/config.
- **Stage-list gap vs. `spec/tracker-spec.md` §6:** current stages are `pitched → negotiating → signed → delivered → paid`; spec wants `Lead → Negotiating → Contract Signed → Content Delivered → Invoiced → Paid (+ Dead)`. Missing: `invoiced`, `dead`. Plan: remap values and add the two new stages in the same enum→text migration.

## 5. Auth & entitlements (CHASSIS §6) — **Conformant / Missing**

- Auth.js v5 (beta.31) as specced: JWT sessions, credentials provider, edge-safe split config for proxy middleware, `requireUserId()` as the single session→userId entry point. **Conformant.** (YouTube OAuth provider not yet present — future work, out of this session's scope.)
- Entitlements: **Missing.** No `hasAccess` concept anywhere; nothing inspects billing state (there is no billing state). Phase 2 stubs it.

## 6. Instrumentation (CHASSIS §7) — **Missing**

No event tracking, no error tracking, no analytics of any kind. Per tracker spec §8, activation/retention instrumentation is a launch blocker (kill criteria depend on it). Phase 2 adds the minimal internal events table + `trackEvent()`.

## 7. Deployment health — **Conformant** (smoke-tested 2026-07-13, pre-change)

- `tsc --noEmit` ✓ · `eslint` ✓ · unit + component tests 51/51 ✓ · `next build` ✓
- Migrations: single migration `0000`, journal clean, applied to both local and Neon prod.
- Live: https://streamer-tools-gilt.vercel.app serves the login page; full login → dashboard flow was verified in production 2026-07-07 (BUILD_LOG). Auto-deploys from `main`.

## 8. Stack table (CHASSIS §1) — one deviation, in the repo's favor

Repo runs **Next.js 16.2** (+ React 19, Tailwind v4); chassis table says Next.js 14. The scaffold decision is logged (BUILD_LOG 2026-07-06), the app is built, tested, and deployed on 16, and Next 16's breaking changes (e.g. `proxy.ts` middleware) are already absorbed. Downgrading would be pure risk for zero benefit. **Recommendation: update CHASSIS_SPEC §1 to Next.js 16 App Router** — logged as a chassis-level decision in BUILD_LOG per §1's own rule. Everything else in the stack table matches.

## Conclusion — alignment plan sanity check

Nothing found changes the Phase 2/3 plan. Order of operations: restructure folders (no schema change) → enum→text + stage remap migration → table renames + soft deletes → entitlement stub → events table. Each step is a separate commit that builds and deploys.
