# Architecture

A YouTube sponsorship deal tracker. MVP is single-user, but the structure assumes growth into a multi-user product with integrations, notifications, and billing.

## Stack and versions

- Next.js 16.2 (App Router) + React 19 + TypeScript 5.9
- Tailwind CSS v4 + shadcn/ui (new-york style, neutral base)
- Drizzle ORM 0.45 + Postgres (Neon in prod, Docker Postgres locally)
- Auth.js (next-auth) v5 beta
- pnpm, ESLint 9 (flat config from create-next-app), Prettier + tailwind plugin
- CI: GitHub Actions — lint, format check, typecheck, build

## Judgment calls (one-line rationales)

- **`pg` driver via `drizzle-orm/node-postgres` instead of `@neondatabase/serverless`** — one code path that works identically against local Docker Postgres and Neon over TCP; swapping to the Neon serverless driver later is a one-file change in `src/db/client.ts`.
- **JWT sessions, no DB session adapter** — Auth.js Credentials provider doesn't support database sessions anyway, and JWT keeps auth stateless; a DB adapter can be added when OAuth providers arrive.
- **Server actions as the API layer (not route handlers)** — actions in `src/modules/*/actions.ts` are thin, validated wrappers over service functions; a future public REST/webhook API adds route handlers that call the _same_ service functions, so nothing gets rewritten.
- **Statuses/content types live in `src/config/deals.ts` and are stored as Postgres enums** — single source of truth in code; DB enums give integrity, and adding a value is one migration.
- **Seed script for the single user instead of hardcoded credentials** — the users table is real from day one, so multi-user later is "add signup," not "add users."
- **Port 5433 for local Postgres** — avoids colliding with any system Postgres on 5432.
- **shadcn set up manually (components.json + globals.css)** — the CLI's `init` is interactive-only in this version; `add` works fine non-interactively once config exists.

## Layout (chassis-aligned 2026-07-13, per docs/CHASSIS_SPEC.md §2)

```
src/
  app/                    # routes only — thin, no business logic
    (auth)/login/         # public
    (app)/                # authenticated shell: dashboard, sponsors, deals
  domains/                # one folder per portfolio tool
    tracker/              #   schema.ts (drizzle), queries.ts (all DB access),
                          #   actions.ts (server actions), validation.ts (zod),
                          #   types.ts (public type surface), components/
  core/                   # the chassis — shared by every domain
    auth/                 # Auth.js config, session helpers, users schema, password hashing
    db/                   # drizzle client, aggregated schema, seed
    config/               # config-driven enums (deal stages, content types)
  components/             # genuinely shared UI only (shadcn under ui/, theme, dialogs)
  lib/                    # pure generic utils
```

Boundary rules (CHASSIS_SPEC §2): domains import only from `/core` and `/lib`;
cross-domain access goes through the other domain's exported `queries.ts`/`actions.ts`;
routes compose domain components and call domain actions. One deliberate exception:
`core/db/schema.ts` aggregates every schema file for drizzle-kit.

## Multi-tenancy readiness

Every domain table carries `user_id` (FK to `users`) and every service function takes the acting user's id as its first argument — queries are always scoped, never global. Today there's one user; adding more means adding signup, not migrating data. When teams/accounts arrive, `user_id` generalizes to an `account_id` with a join table — the scoping pattern in services stays the same.

## Domain boundaries

- Sponsors and deals are one tool — they live together in `domains/tracker`. A second tool becomes a sibling under `domains/`, importing tracker data only via tracker's exported `queries.ts`.
- Auth lives in `core/auth` + root `auth.ts`; domain queries receive a user id, they never call `auth()` themselves — so a future API-token or webhook caller can invoke the same functions.
- Tracker-specific UI lives in `domains/tracker/components/`; `src/components/` holds only tool-agnostic UI.
