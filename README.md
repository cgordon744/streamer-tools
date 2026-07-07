# Streamer Tools

A YouTube sponsorship deal tracker: which brands you're talking to, what's owed, what's due, what's been paid.

## Stack

Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · Drizzle ORM + Postgres (Neon in prod) · Auth.js v5 · Vercel

See [ARCHITECTURE.md](ARCHITECTURE.md) for structure and rationale, [BUILD_LOG.md](BUILD_LOG.md) for progress and open items.

## Local development

```bash
pnpm install
docker compose up -d          # local Postgres on :5433
cp .env.example .env          # fill in AUTH_SECRET + SEED_USER_*
pnpm db:migrate               # apply migrations
pnpm db:seed                  # create the login user from SEED_USER_* vars
pnpm dev
```

Log in at http://localhost:3000/login with the seeded credentials.

## Scripts

- `pnpm lint` / `pnpm typecheck` / `pnpm format` — checks (CI runs all three + build)
- `pnpm db:generate` — regenerate migrations after schema changes
- `pnpm db:studio` — Drizzle Studio against `DATABASE_URL`

## Deploy (Vercel + Neon)

1. Create a Neon project; grab the pooled connection string.
2. Import this repo in Vercel; set `DATABASE_URL` and `AUTH_SECRET` env vars.
3. Run migrations against Neon: `DATABASE_URL=<neon-url> pnpm db:migrate`, then seed: `DATABASE_URL=<neon-url> pnpm db:seed` (with `SEED_USER_*` set).
