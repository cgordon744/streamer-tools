# PORTFOLIO_THESIS.md

> **Purpose:** This document defines _what_ gets built and _why_. It is the selection filter, pricing logic, and freeze discipline for the Creator Ops Portfolio. Claude Code should read this at the start of every session. Any proposed tool or feature that conflicts with this thesis requires an explicit, logged decision in `BUILD_LOG.md` to proceed.

---

## 1. The Model

We are building a **portfolio of small, sharply focused tools** for one buyer: the solo creator monetizing through brand deals. At AI-assisted build costs (~1 week per tool MVP), no single tool needs to sustain the business — the portfolio is the product.

Core loop:

1. Ship a wedge tool (YouTube sponsor tracker).
2. Add one focused tool at a time behind the same login, brand, and billing.
3. Evaluate each tool against pre-committed criteria in a fixed window.
4. Freeze what doesn't stick (stop investing, keep it running). Double down on what does.
5. Cross-tool data compounds into the moat.

**What the speed advantage is for:** serving users better — faster fixes, tighter workflow fit, more experiments. It is _not_ for shipping volume as a vanity metric or selling the dream of shipping. Every tool must be genuinely useful to a working creator.

## 2. Target Buyer

**Solo creators actively doing brand deals.** Working definition: roughly 10K–500K subscribers, doing 1–10 deals per quarter, managing them in spreadsheets and email threads, with no manager or agency.

Reasoning:

- **Below ~10K subs:** wants sponsors but doesn't have them. Will use free tools and churn. Not a buyer.
- **Above ~500K:** has a manager or agency. The buyer becomes the agency — different product, different sales motion. Out of scope.
- **The middle band:** real revenue at stake, real pain, nobody to delegate to, and _reachable_ — active on X/Twitter and YouTube, talks publicly about workflow, trusts tools recommended by other creators.

**Definition is subscriber-based, deliberately.** (Decided 2026-07-13.) Subscriber bands are simpler for marketing and communication; deal-volume and niche nuance stays out of buyer targeting. Niche-level differences (sponsor rates, category norms) get expressed later as **"niche templates" in the media kit generator**, not in buyer qualification.

## 3. The Demo Test (Selection Filter)

Every tool must pass before it gets built:

> **A working creator, shown the tool for 60 seconds, immediately sees their own painful workflow replaced and says "I need that."**

Why 60 seconds: that is the attention span of the distribution channels this buyer lives in — a tweet with a screen recording, a YouTube short, a DM'd link. A tool that needs a 10-minute onboarding video cannot spread through the channels available to a solo founder with no sales team. **The demo test is a distribution constraint dressed as a product constraint.**

Secondary function: it forces every tool to have **one sharp, frequent, annoying job**. One-job tools are also the fastest to build and maintain with Claude Code — the filter aligns product, marketing, and build velocity simultaneously.

Examples:

- ✅ Sponsor deal tracker — passes.
- ✅ Media kit generator — everyone hates making them; sponsors ask constantly.
- ❌ "Creator analytics dashboard" — vague, broad, crowded market.

**The test audience is working creators, never aspiring founders.** A tool that only demos well to other wannabe SaaS builders fails by definition.

## 4. Pricing

**One subscription, everything included: $20–30/mo.** No per-tool pricing.

Why a bundle:

1. **Fewer churn decision points.** One $25 decision beats five $5 decisions, even at the same total.
2. **Umbrella for supporting tools.** A rate calculator may never justify its own subscription but meaningfully increases bundle stickiness.
3. **Feeds the data moat.** The cross-tool loop (deals → rates → media kit → invoices) only exists if users adopt multiple tools. Bundle pricing removes all friction from trying the next tool. The data loop is the only durable moat, so pricing must feed it.

Why $20–30 specifically:

- The buyer's alternative is a free spreadsheet **plus** invisible losses: forgotten follow-ups, underpriced deals. One mid-tier sponsorship in this band is $500–5,000. If the bundle saves one botched deal or lifts one negotiation 10% per year, it pays for itself many times over.
- But the buyer mentally categorizes software with existing subscriptions (Adobe, TubeBuddy, Canva: ~$10–55/mo). Pricing must stay **impulse-purchasable with no sales call** — the model has no sales team.
- $20–30 = "premium but frictionless."

## 5. Free Tier: Distribution by Artifact

**Rule: tools whose _output travels to third parties_ are free. Tools whose value is private, ongoing workflow are paid.**

- A media kit gets sent to sponsors. An invoice gets sent to brands. A rate card may be shared publicly. Every outward artifact is a branded impression in front of exactly the two audiences that matter: other creators and the brands that sponsor them.
- The tracker, deal pipeline, and reminders deliver private, recurring utility — which is what justifies recurring billing.

This gives a principled call for every future tool: **outward-facing artifact → free/viral; inward-facing workflow → paid.**

### The Cold-Start Rule (mandatory for all free tools)

> **Every free tool must deliver its full core value from public or user-entered data on first use. Bundle data may only _enhance_ a free tool, never _gate_ it.**

Example — media kit generator: core content is _channel_ data (subs, avg views, engagement, demographics), pulled from the YouTube API via a pasted URL or OAuth, plus a few manual fields. Complete, polished output in ~5 minutes with zero tracker data. Bundle integration is the _upgrade path_: verified sponsor logos from real deals, actual campaign performance, self-updating stats ("your media kit updates itself when your deals do"). Cold-start converts; data loop retains.

A free tool that requires paid-tool data cannot do its distribution job. This rule is non-negotiable.

## 6. Evaluation Criteria

The portfolio's economics depend on failed tools costing **one week of build, not one quarter of investment**. That only holds if we actually _stop investing_ in duds — and founders reliably keep pouring dev time into things that aren't working. So thresholds are **pre-committed before each tool ships** (in its `TOOL_TEMPLATE.md` spec) and evaluated at a fixed window. The discipline is about where effort goes next, **not** about taking anything away from users.

- **Evaluation window: 60 days** from launch. Long enough for a monthly-cadence workflow (deals happen roughly monthly) to show two usage cycles; short enough that a dud doesn't quietly soak up development attention.
- **Signals:**
  - **Activation** — did trial users touch it at all?
  - **Retention** — weekly return usage among activated users.
  - **Disappointment test** — qualitative: "how disappointed would you be if this disappeared?"
- **Outcomes:**
  - **Continue/invest** = met thresholds; eligible for enhancement work and the next tool.
  - **Freeze** = **the outcome for every miss.** Stop active development, keep the tool running for whoever uses it, and fix only what breaks. Maintenance on a frozen tool is near-zero by design (one sharp job, shared chassis), so leaving it up costs little.
- **We do not remove tools or features from users based on weak metrics.** Short evaluation windows plus small early cohorts make the numbers noisy, and pulling a working feature away is a trust cost that outweighs the tidiness of removing it — it makes the whole portfolio feel unreliable. Underperformance always resolves to _freeze_, never _delete_. The only reason to fully retire something is genuine harm (a security or legal problem, or a hard-broken dependency), and even then the preference is to disable it behind a flag and **retain user data** (the schema's soft-delete convention exists for exactly this), not to destroy it.
  - **Continue/invest** = met thresholds; eligible for enhancement work.

## 7. Explicit Rejections

Written down so neither Claude Code nor future-us drifts:

- ❌ **No tools whose primary buyer is aspiring SaaS founders or "make money online" audiences.** (Selling shovels to shovel-sellers — the trap this thesis exists to avoid.)
- ❌ **No broad platforms.** One sharp job per tool.
- ❌ **No tools requiring enterprise sales** or any human sales motion.
- ❌ **No tools outside the creator-monetization job cluster**, even if they demo well. Scope discipline is what keeps the shared chassis and data loop coherent.

## 8. Unit Economics & Conversion

**Free tools are near-zero marginal cost.** The YouTube Data API is quota-based, not billed (channel stats ≈ 1–3 units of a 10K/day default quota); PDF generation is seconds of serverless compute; hosted kit pages and per-user storage are negligible on Vercel/Neon. Realistic marginal cost per free user: fractions of a cent. The true costs of free users are **API quota management at scale** and **support attention** — infrastructure cost does not threaten the artifact rule.

**Profitability therefore hinges on conversion, and the strategy is explicit:**

1. **Paid tools must be independently excellent.** The tracker passes the demo test on its own merits; paid tools are never mere upsells. This is the primary strategy — a paid product strong enough that conversion is not an issue.
2. **Free tools carry structural, contextual conversion moments** — never nags. A creator generating a media kit is _at that moment_ actively pursuing sponsors: the single best moment to show the tracker ("when a brand replies to this kit, where does that deal go?"). Other mechanics: stale-stats reminders, verified-deal badges, self-updating kits.

**North-star conversion metric: free-to-paid conversion within 30 days of first artifact.** Benchmark context: typical freemium converts 2–5%; tool-gated freemium aimed at an already-qualified audience (media-kit makers have deal intent by definition) should beat that. If conversion is weak, the fix is sharpening the paid tools — **never gating the free ones.**

## 9. Open Questions / Revisit Later

- ~~Deal volume vs. subscriber band~~ — **resolved: subscriber-based** (see §2). Niche/rate nuance deferred to future media-kit "niche templates."
- Exact free-tier structure at scale: current position is _whole tools free by the artifact rule_ (not usage-limited versions of everything). Revisit if free-tool infra costs become material.
- Agency/manager tier as a future expansion — explicitly out of scope for now.
