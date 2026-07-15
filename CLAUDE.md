@AGENTS.md

## Session start — get oriented before substantive work

This repo is the wedge tool of a shared-chassis creator-tools portfolio. Before any non-trivial work, read these in order — they explain why the code is shaped the way it is and the rules any change must follow:

1. `docs/PORTFOLIO_THESIS.md` — the business model and the **freeze-not-delete** policy (underperforming tools/features are frozen, never removed from users).
2. `docs/CHASSIS_SPEC.md` — the engineering contract: `/domains` + `/core` layout, import boundary rules, schema conventions, config-driven enums.
3. `spec/tracker-spec.md` — this tool's scope and its exported data contract.
4. `BUILD_LOG.md` — decisions and open items: `NEEDS INPUT` is at the top; session entries append newest-last. Add a dated entry each session.

Anything touching `/core`, the boundary rules, or the stack table needs a `BUILD_LOG.md` entry with reasoning **first**.

Before calling work done: run the full CI matrix locally — `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build`, plus `pnpm test` — and after pushing, watch the GitHub Actions run to green (a green Vercel deploy is **not** the same signal — it skips `format:check`). New features ship with their tests in the same commit.

Tip: run `/prime` at the start of a session to have me read all of the above and report the current state before touching anything.
