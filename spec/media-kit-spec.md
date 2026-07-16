# Tool Spec: Media Kit Generator

**Status:** Proposed
**Domain folder:** `/domains/media-kit`
**Tier:** Free (artifact rule)
**Spec date:** 2026-07-16 · **Launch date:** — · **Evaluation date (launch + 60d):** —

## 1. Job To Be Done

Produce the polished, current media kit a sponsor just asked for — in five minutes instead of an evening in Canva with screenshotted, already-stale stats.

## 2. Demo Test Script

- **0–10s:** A creator's screen: a Canva template half-filled, a YouTube Studio tab open for screenshotting subscriber numbers, a sponsor email visible: _"Can you send over your media kit?"_ Caption: "Every creator's least favorite email."
- **10–45s:** The generator. Paste a channel URL → subscribers, total views, average views, and upload cadence populate themselves in ~3 seconds. Pick a template, type in niche, rates, and contact email. The kit preview builds live as fields fill.
- **45–60s:** Payoff shot: a clean, branded, hosted kit page — then the **"Refresh stats"** click, and the numbers update in place. Caption: _"Your media kit. Always current. Free."_

**The "I need that" moment:** watching channel stats fill themselves in from a pasted URL. Everyone who has ever screenshotted YouTube Studio into a slide deck feels that instantly. The refresh-in-place beat lands the second hook: this kit never goes stale.

## 3. Target Buyer Check

- [x] Primary user is a working creator doing brand deals (thesis §2) — a media kit request is often the _first_ signal a creator has entered the deal-doing band
- [x] Not primarily valuable to aspiring founders / MMO audiences (thesis §7)
- [x] Within the creator-monetization job cluster (thesis §7)

## 4. Free/Paid Determination

- **Output artifact(s):** hosted, shareable media kit page (public URL)
- **Artifact audience:** brands/sponsors (primary), other creators who see it shared (secondary)
- **Determination:** **Free.** The canonical artifact-rule tool (thesis §5): the output travels to exactly the two audiences that matter, carrying the portfolio's branding. This is the portfolio's distribution engine.

Per chassis §6, free = sign-in required, never a payment method. (A no-account "paste a URL, see a preview" landing-page teaser is a possible marketing-layer experiment later; the _tool_ requires the account relationship.)

**Cold-start plan (mandatory, thesis §5):**

- **Public data pulled:** channel title, avatar, subscriber count, total views, video count via YouTube Data API `channels.list` from a pasted channel URL/handle; average views + upload cadence computed from the channel's recent public uploads (`playlistItems` + `videos.list`). No OAuth needed.
- **User enters manually:** niche/category, one-line pitch, audience description + demographics (age/gender/geo splits, from their own YouTube Studio — the public API does not expose demographics; see §6), rate card lines, past brand highlights (free text), contact email, accent color. Connecting YouTube via OAuth (optional per user) replaces the manual demographics with Analytics API data; the manual path always remains, so cold-start never depends on granting OAuth.
- **Finished output in ≤5 minutes:** a hosted kit page at a shareable URL with the portfolio's tasteful branding (chassis §5), plus a print stylesheet so "Save as PDF" from the browser produces a clean document. Zero tracker rows involved.
- **Enhancement path (bundle data, additive only):** verified sponsor names/logos from `tracker.getVerifiedSponsors(userId)` render a "Brands I've worked with" section automatically; stats refresh keeps the kit self-updating ("your media kit updates itself when your deals do"). Enhancements are additive branches — the cold-start path is a test case (chassis §6).

**Structural conversion moment (thesis §8):** immediately after the kit is created/shared — the one moment the user is provably pursuing sponsors — show the tracker once: _"When a brand replies to this kit, where does that deal go?"_ Never a nag, never a gate.

## 5. Data Contract

- **Consumes (optional, never required):** `tracker.getVerifiedSponsors(userId)` — completed-deal sponsors for the verified-brands section. Already exported and doc-commented for this consumer.
- **Produces (exported for other domains):**
  - `getChannelSnapshot(userId)` → cached channel stats (→ rate calculator's inputs, invoice letterhead)
- **Core/shared entities touched:** `youtube_channels` (**new** — the chassis §3 shared entity, created by this tool via a **new `/core/youtube`** Data API client; multiple future domains read it). `/core` addition → BUILD_LOG entry before implementation, per chassis §8.
- **Domain tables:** `mediakit_kits` (userId-scoped, soft-delete, `tracker_`-style prefix per chassis §3), public-slug column for the hosted page.
- **Instrumentation:** `kit_created`, `kit_published`, `kit_viewed` (public views, no auth) events — `kit_viewed` is how artifact-share reach gets measured for §7.

## 6. MVP Scope

**In (the one job, done well):**

- Paste channel URL/handle → fetch + cache public stats (`/core/youtube`, key-based quota, cached snapshot in `youtube_channels` with manual "Refresh stats")
- One kit per user, **one excellent template** (config-driven template list per chassis §4, seeded with one entry)
- Manual fields: niche, pitch, demographics, rate card, brand highlights, contact, accent color
- Live preview while editing; publish → public hosted page at `/kit/[slug]` (no auth, `kit_viewed` tracked)
- Print stylesheet for browser-native PDF output
- Verified-sponsors section when tracker data exists (additive)
- The one structural tracker CTA post-publish
- **YouTube OAuth connect → Analytics API demographics** (founder decision 2026-07-16: pre-launch requirement, not fast-follow — competitor tools will have it). Optional per user; fills the demographics section automatically and marks it "verified via YouTube". Manual entry remains the fallback (and the cold-start guarantee). _Correction to thesis §5's example:_ the public Data API does not expose demographics — only owner OAuth does. Build order: manual-entry kit first, OAuth as the second build phase, both before launch.

**Explicitly out of v1:**

- Other platforms (Twitch, TikTok, Instagram)
- Multiple kits, multiple templates, niche templates (thesis §2 defers these), custom/white-label branding
- Server-rendered PDF generation (print stylesheet first; revisit if brands demand attachments)
- Campaign-performance sections, testimonials, analytics on kit views beyond the event counter

**Build budget:** 1 week for the manual-entry kit, plus a second pre-launch phase for OAuth demographics (est. 2–3 days — Google provider wiring, token storage, Analytics API queries, consent-screen verification lead time). **Not counted in it — chassis prerequisites this tool exposes:**

1. **Public signup flow** — none exists today (single seeded user, credentials only). A free tool cannot launch without self-serve account creation. Chassis work, own BUILD_LOG entry.
2. **`/core/youtube`** client + `youtube_channels` shared table (this spec's §5).
3. **Founder inputs:** YouTube Data API key + OAuth client credentials/consent screen (Google Cloud project); Resend verified domain + `EMAIL_FROM` (NEEDS INPUT #6 — required before signup opens).

## 7. Evaluation Criteria (pre-committed — founder signed off 2026-07-16)

**Special condition (per template):** free tool — judged on signups + artifact shares instead of retention. Retention is not this tool's job; distribution and conversion are.

| Signal                                                                    | Threshold | Actual |
| ------------------------------------------------------------------------- | --------- | ------ |
| Activation: % of media-kit signups publishing a kit in first session/week | 50%       |        |
| Distribution: % of published kits viewed ≥1× by a third party within 14d  | 30%       |        |
| Conversion: free→paid within 30 days of first published kit (north star)  | 3%        |        |

**Pre-committed outcome mapping:**

- Meets 2–3 → **Continue/invest** (OAuth demographics fast-follow becomes eligible)
- Meets 0–1 → **Freeze** — stop active development, keep it running and kits hosted for existing users; we do not remove it (thesis §6)
- Special condition: if activation is high but conversion misses, the fix is sharpening the tracker, never gating the kit (thesis §8)

## 8. Launch Checklist

- [ ] Domain follows chassis boundary rules (CHASSIS_SPEC §2) — consumes tracker via exported queries only
- [ ] Activation/retention instrumentation live (CHASSIS_SPEC §7) — `kit_created` / `kit_published` / `kit_viewed`
- [ ] Cold-start path tested with an empty account (zero tracker rows → complete published kit)
- [ ] Public signup flow live (chassis prerequisite)
- [ ] YouTube API key in Vercel env; quota sanity-checked (~1–3 units/fetch against 10K/day default)
- [ ] YouTube OAuth connect live: demographics auto-filled for a connected channel, manual path still complete without it
- [ ] Resend domain verified + `EMAIL_FROM` set (NEEDS INPUT #6)
- [ ] Demo recorded (§2 script, executed)
- [ ] Feature flag flipped · date logged in BUILD_LOG.md

## 9. Evaluation Record (fill at +60d)

Decision: — · Reasoning: — · Logged in BUILD_LOG.md: [ ]
