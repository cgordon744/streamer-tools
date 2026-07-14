# Tool Spec: Sponsor Deal Tracker

**Status:** Proposed
**Domain folder:** `/domains/tracker`
**Tier:** Paid (workflow rule)
**Spec date:** 2026-07-13 · **Launch date:** — · **Evaluation date (launch + 60d):** —

## 1. Job To Be Done

Know the status, deliverables, deadline, and payment state of every brand deal at a glance — without digging through email threads and a spreadsheet.

## 2. Demo Test Script

- **0–10s:** Split screen: a cluttered Gmail search for "sponsorship" next to a messy spreadsheet with stale statuses. Voiceover/caption: "This is how you're tracking $8,000 of deals."
- **10–45s:** The tracker pipeline view. Add a new deal in ~10 seconds (brand, amount, stage). Drag a deal from *Negotiating* → *Contract Signed*. Click a deal: deliverables checklist, due dates, payment status (invoiced / paid / overdue) all on one card. The dashboard flags one deal: **"Payment overdue 12 days — $1,500."**
- **45–60s:** Payoff shot: the dashboard's top strip — *"3 active deals · $6,500 in flight · 1 payment overdue · next deliverable Friday."* Caption: "Every deal, every dollar, one glance."

**The "I need that" moment:** the overdue-payment flag. Every creator has been quietly stiffed or paid late; seeing software catch it is visceral.

## 3. Target Buyer Check

- [x] Primary user is a working creator doing brand deals (thesis §2)
- [x] Not primarily valuable to aspiring founders / MMO audiences (thesis §7)
- [x] Within the creator-monetization job cluster (thesis §7)

## 4. Free/Paid Determination

- **Output artifact(s):** none that travel — all views are private workflow
- **Artifact audience:** private
- **Determination:** **Paid.** Ongoing private utility (pipeline, deadlines, payment state) is exactly what justifies recurring billing (thesis §5).

## 5. Data Contract

- **Consumes:** `core.youtube_channels` (optional — channel context only; tracker must work with zero YouTube connection)
- **Produces (exported for future domains):**
  - `getVerifiedSponsors(userId)` → brand names + logos from completed deals (→ media kit)
  - `getDealHistory(userId)` → amounts, niches, dates (→ rate calculator benchmarks)
  - `getPayableDeals(userId)` → deals at invoiceable stages (→ invoice tool)
- **Core/shared entities touched:** `users`, `subscriptions`

The tracker is the portfolio's primary data *producer* — the root of the loop.

## 6. MVP Scope

**In (the one job, done well):**
- Deals CRUD: brand, contact, amount, currency, notes
- Pipeline stages (config-driven enum): Lead → Negotiating → Contract Signed → Content Delivered → Invoiced → Paid (+ Dead)
- Per-deal deliverables checklist with due dates
- Payment status with overdue detection (the demo's hero feature)
- Dashboard strip: active deals, $ in flight, overdue payments, next deadline
- Email reminders: deliverable due in 48h; payment overdue

**Explicitly out of v1:**
- Gmail/email integration or parsing
- Contract upload/e-sign
- Analytics/reporting beyond the dashboard strip
- Multi-user/team anything
- CSV import (fast-follow candidate, not v1)
- Sponsor CRM features (outreach, prospecting)

**Build budget:** 1 week.

## 7. Kill Criteria (pre-committed — DRAFT, needs founder sign-off)

**Special condition:** the tracker is the wedge and bundle anchor. A miss here doesn't trigger freeze/kill — it triggers a thesis-level review, because the portfolio is built on this tool converting. Thresholds below are therefore *health checks*, evaluated at launch + 60 days:

| Signal | Threshold (draft) | Actual |
|---|---|---|
| Activation: % of signups creating ≥1 deal in first week | 60% | |
| Retention: % of activated users active weekly | 40% | |
| Disappointment: % "very disappointed" if removed (n≥10) | 40% | |

- Meets 2–3 → invest; begin tool #2
- Meets 0–1 → thesis review: wrong buyer, wrong job, or wrong execution — diagnose before building anything else

## 8. Launch Checklist

- [ ] Domain follows chassis boundary rules (CHASSIS_SPEC §2)
- [ ] Activation/retention instrumentation live (CHASSIS_SPEC §7)
- [ ] ~~Cold-start test~~ (n/a — paid tool)
- [ ] Demo recorded (§2 script, executed)
- [ ] Feature flag flipped · date logged in BUILD_LOG.md

## 9. Evaluation Record (fill at +60d)

Decision: — · Reasoning: — · Logged in BUILD_LOG.md: [ ]
