# CHASSIS_SPEC.md

> **Purpose:** This document defines _how_ every tool gets built. The chassis is the shared infrastructure every portfolio tool plugs into: one auth, one billing, one design system, one deployment pipeline, one schema convention. A new tool is a **domain module added to the chassis, never a new app.** This is what makes tool N+1 a one-week build instead of a one-month build, and it is what makes the cross-tool data loop physically possible.

---

## 1. Stack (fixed decisions)

| Layer     | Choice                  | Notes                                                                             |
| --------- | ----------------------- | --------------------------------------------------------------------------------- |
| Framework | Next.js 14 App Router   | Server components by default; client components only where interactivity demands  |
| Language  | TypeScript, strict mode | No `any` without a logged justification                                           |
| Styling   | Tailwind + shadcn/ui    | shadcn components are the design system baseline; see §5                          |
| ORM       | Drizzle                 | Schema as code, migrations checked in                                             |
| Database  | Neon Postgres           | Single database, schema-per-domain conventions (§3)                               |
| Auth      | Auth.js v5              | One account across all tools; YouTube OAuth as a first-class provider             |
| Payments  | Stripe (subscriptions)  | One product, one price (bundle); free tools require account but no payment method |
| Hosting   | Vercel                  | Single deployment; tools are routes, not separate deploys                         |

Stack changes are chassis-level decisions: they require a `BUILD_LOG.md` entry with reasoning and affect all tools.

## 2. Repository & Domain Structure

Single repo, single Next.js app. Tools are **domains**, isolated behind clear boundaries:

```
/src
  /app                      # routes only — thin, no business logic
    /(marketing)            # public pages, free-tool landing pages
    /(app)                  # authenticated shell: nav, layout, billing gates
      /tracker
      /media-kit
      /rates
      /invoices
  /domains
    /tracker
      schema.ts             # Drizzle tables for this domain
      queries.ts            # all DB reads/writes for this domain
      actions.ts            # server actions (the domain's internal API)
      components/           # domain-specific UI
      types.ts
    /media-kit
    /...
  /core                     # the chassis itself
    /auth
    /billing                # subscription state, entitlement checks
    /youtube                # YouTube Data API client, shared by all domains
    /design                 # tokens, shared components beyond shadcn
    /db                     # Drizzle client, migration tooling
    /config                 # config-driven enums (§4)
  /lib                      # pure utilities only
```

**Boundary rules:**

1. A domain may import from `/core` and `/lib`. A domain may **not** import from another domain's internals.
2. Cross-domain data access goes through the other domain's exported `queries.ts`/`actions.ts` interface only. (Example: media-kit reads verified sponsors via `tracker`'s exported query, never via raw table access.)
3. Routes contain no business logic — they compose domain components and call domain actions.

These rules exist so that killing/freezing a tool is a folder-level operation, and so Claude Code sessions can work on one domain with confidence nothing else breaks.

## 3. Data & Multi-Tenancy Conventions

- **Every domain table carries `userId`** (and is indexed on it). The schema is multi-tenancy-aware from day one: if agencies/teams ever become a tier, we add an `orgId` layer without rewrites — but no org features get built now (thesis §7).
- **Naming:** tables prefixed by domain (`tracker_deals`, `mediakit_kits`, `invoice_invoices`).
- **Shared entities live in `/core` schemas:** `users`, `subscriptions`, `youtube_channels` (connected channel stats — multiple domains read this).
- **Soft deletes** (`deletedAt`) on user-facing records; creators will ask for things back.
- **The data loop is explicit:** when a domain exposes data other domains consume (deals → rates → media kit → invoices), that contract lives in the producing domain's exported queries and is documented in the tool's `TOOL_TEMPLATE.md` spec under "data it produces."

## 4. Config-Driven Enums

Statuses, deal stages, categories, template lists, etc. are defined in `/core/config` as typed config objects — **not** hardcoded string unions scattered through components, and **not** DB enum types (painful migrations). Reasoning: tools evolve weekly; adding a deal stage or media-kit template must be a config edit, not a schema migration plus find-and-replace.

## 5. Design System

- shadcn/ui + a small token layer in `/core/design` (brand colors, spacing, typography).
- **Every tool must look like the same product.** A user moving from tracker to media kit should feel zero seam — the bundle pricing story depends on the portfolio feeling like one product, not a grab bag.
- Outward-facing artifacts (media kits, invoices, rate cards) carry consistent, tasteful branding — they are the distribution channel (thesis §5). Branding on artifacts must be professional enough that a creator is proud to send it to a brand.

## 6. Auth, Entitlements & Free Tools

- One account, all tools. Free tools require sign-in (we want the account relationship) but never a payment method.
- Entitlement checks live in `/core/billing` as a single `hasAccess(user, feature)` helper. Domains never inspect Stripe state directly.
- **Cold-start rule enforcement (thesis §5):** free-tool code paths must function with zero rows in any paid domain's tables. Bundle-data enhancements are additive branches, never requirements. Treat this as a test case for every free tool.

## 7. Deployment, Environments & Ops

- `main` → production on Vercel. Preview deployments per PR.
- Migrations run via Drizzle Kit as a release step; never hand-edited SQL in prod.
- Feature flags: simple config-driven flags in `/core/config` (no third-party service yet). New tools launch behind a flag, flipped when the tool's spec is met.
- Error tracking + basic analytics wired at the chassis level so every new tool gets activation/retention instrumentation **for free** — kill criteria (thesis §6) depend on this existing from day one of each tool.

## 8. Claude Code Session Protocol

- Read `PORTFOLIO_THESIS.md`, this file, and the relevant tool's `TOOL_TEMPLATE.md` spec at session start.
- Architectural latitude is granted **within** a domain; anything touching `/core`, boundary rules, or the stack table requires a `BUILD_LOG.md` entry with reasoning before implementation.
- Every session appends a dated summary of decisions made to `BUILD_LOG.md`.
- Prefer boring, uniform patterns across domains over clever, novel ones — uniformity is what keeps week-long builds honest, because each new tool copies the shape of the last.
