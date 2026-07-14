# TOOL_TEMPLATE.md

> **Purpose:** The repeatable spec format for proposing, building, and evaluating every portfolio tool. Copy this template to `/specs/<tool-name>.md`, fill it out **completely before any code is written**, and treat unfilled sections as a blocker. The kill criteria section is filled in _before launch_ — that pre-commitment is the point (thesis §6).

---

# Tool Spec: [Tool Name]

**Status:** Proposed | In Build | Live (behind flag) | Launched | Frozen | Killed
**Domain folder:** `/domains/[name]`
**Tier:** Free (artifact rule) | Paid (workflow rule)
**Spec date:** YYYY-MM-DD · **Launch date:** — · **Evaluation date (launch + 60d):** —

## 1. Job To Be Done

One sentence. The sharp, frequent, annoying job this tool replaces. If it takes two sentences, the tool is too broad (thesis §3).

> _Example (tracker): "Know the status, deadline, and payment state of every brand deal without digging through email threads and a spreadsheet."_

## 2. Demo Test Script

The literal 60-second demo, written as a shot list. This doubles as the launch tweet/short storyboard.

- 0–10s: the painful status quo (one shot)
- 10–45s: the tool doing the job
- 45–60s: the "I need that" payoff moment

If the payoff moment can't be shown on screen, the tool fails the filter. State explicitly: **what does the viewer see that makes them say "I need that"?**

## 3. Target Buyer Check

- [ ] Primary user is a working creator doing brand deals (thesis §2)
- [ ] Not primarily valuable to aspiring founders / MMO audiences (thesis §7)
- [ ] Within the creator-monetization job cluster (thesis §7)

## 4. Free/Paid Determination

Apply the artifact rule (thesis §5): does the tool's output travel to third parties?

- **Output artifact(s):** [e.g., PDF media kit, invoice, none]
- **Artifact audience:** [brands / other creators / private]
- **Determination:** Free | Paid — with one sentence of reasoning.

**If Free — cold-start plan (mandatory):** describe the complete first-use experience with zero bundle data. What public data is pulled (e.g., YouTube API)? What does the user enter manually? What is the finished output in ≤5 minutes? Then describe the _enhancement_ path when bundle data exists.

## 5. Data Contract

- **Consumes (from other domains, via their exported queries):** [e.g., `tracker.getVerifiedSponsors(userId)`]
- **Produces (exported for other domains):** [e.g., deal history → rate benchmarks]
- **Core/shared entities touched:** [e.g., `youtube_channels`]

This section is how the data loop compounds. A tool that neither consumes nor produces loop data isn't disqualified, but note why it belongs in the portfolio anyway.

## 6. MVP Scope

- **In (the one job, done well):** bullet list, ruthlessly short
- **Explicitly out of v1:** bullet list — write down the tempting adjacencies now so build sessions don't drift
- **Build budget:** 1 week. If the honest estimate exceeds it, cut scope or split the tool.

## 7. Kill Criteria (pre-committed — fill in BEFORE launch)

Evaluated at launch + 60 days (thesis §6):

| Signal                                                               | Threshold | Actual (fill at eval) |
| -------------------------------------------------------------------- | --------- | --------------------- |
| Activation: % of active bundle users who tried it ≥ once             | __%       |                       |
| Retention: % of activated users returning weekly                     | __%       |                       |
| Disappointment: % "very disappointed" if removed (qualitative, n≥10) | __%       |                       |

**Pre-committed outcome mapping:**

- Meets 2–3 thresholds → **Continue/invest**
- Meets 0–1 → **Freeze** (default) or **Kill** if it clutters/confuses
- Any special conditions: [e.g., "free tool: judged on signups + artifact shares instead of retention"]

## 8. Launch Checklist

- [ ] Domain follows chassis boundary rules (CHASSIS_SPEC §2)
- [ ] Activation/retention instrumentation live (CHASSIS_SPEC §7)
- [ ] Free tool: cold-start path tested with an empty account
- [ ] Demo recorded (the §2 script, executed)
- [ ] Feature flag flipped · date logged in BUILD_LOG.md

## 9. Evaluation Record (fill at +60d)

Decision: Continue | Freeze | Kill · Reasoning (3 sentences max) · Logged in BUILD_LOG.md: [ ]
