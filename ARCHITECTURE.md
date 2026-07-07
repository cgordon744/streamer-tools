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

## Layout

```
src/
  app/                    # routes only — thin, no business logic
    (auth)/login/         # public
    (app)/                # authenticated shell: dashboard, sponsors, deals
  modules/                # domain layer — the real API surface
    sponsors/             #   schema (drizzle), service (queries), actions (server actions), validation (zod)
    deals/
    auth/                 # session helpers, password hashing
  db/                     # drizzle client, migrations config, seed
  config/                 # deal statuses, content types — single source of truth
  components/             # shared UI (shadcn under ui/)
  lib/                    # generic utils
```

## Multi-tenancy readiness

Every domain table carries `user_id` (FK to `users`) and every service function takes the acting user's id as its first argument — queries are always scoped, never global. Today there's one user; adding more means adding signup, not migrating data. When teams/accounts arrive, `user_id` generalizes to an `account_id` with a join table — the scoping pattern in services stays the same.

## Domain boundaries

- `modules/sponsors` and `modules/deals` never import from each other's internals — deals reference sponsors only through the FK and the sponsors service interface.
- Auth lives in `modules/auth` + root `auth.ts`; domain services receive a user id, they never call `auth()` themselves — so a future API-token or webhook caller can invoke the same services.
- A future `modules/notifications` subscribes to domain events at the action layer; deal logic won't change.
