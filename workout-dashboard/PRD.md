# PRD: Reena's Workout Plan

**Owner:** Reena | **Status:** Draft v1 | **Last updated:** 2026-08-27

---

## 1. Overview

A single-user, web-based daily training and recovery dashboard. Every morning it pulls in the prior night's recovery data and the day's plan, and answers one question: *what should I do today, and how am I tracking?* It replaces manually checking Oura, Garmin Connect, and Cal AI separately by centralizing the day's numbers and the day's workout in one feed.

This is not a general-purpose fitness app for other users — it's built for one person's specific protocol (body recomposition, PPL split, Solidcore, gut/autoimmune-informed nutrition) and should be opinionated around that, not generic.

## 2. Goals

- Single daily view: recovery status, macro targets vs. actual, and the day's workout — no app-switching.
- Reduce logging friction: minimize manual re-entry of data that already exists in Oura/Garmin/Cal AI.
- Make progress visible over time (weight/body comp trend, training consistency, macro adherence, recovery trend) rather than just daily snapshots.
- Non-goal for v1: coaching intelligence (auto-adjusting workouts based on recovery), social features, multi-user support, native mobile app.

## 3. Success Criteria

- You open it once a day (habit-forming, replaces the multi-app check-in).
- Daily feed loads with same-day/prior-night data with no manual pull.
- You can see a 7/30/90-day trend for weight, macro adherence, and training consistency without exporting data elsewhere.

## 4. User & Context

Single user (Reena). Relevant standing context the app should be built around as defaults, not hardcoded permanently but as sensible seed data:

- **Training split:** Lifting Mon/Wed/Fri/Sat, Solidcore Tue/Thu.
- **Macro targets:** 125g protein / 160g carb / 57g fat (~1,653 kcal) — currently tracked in Cal AI.
- **Diet constraints:** No gluten, minimal dairy and chicken, eats fish.
- **Step goal:** 12,000/day.
- **Wearables:** Oura Ring + Garmin (Venu-series). Both currently worn; app should not assume only one.
- **Goal:** body recomposition — lean mass preservation while reducing remaining body fat.

Flag: several of these (autoimmune status, inflammation markers) are health data. The app should store them because you're the only user and it's for your own use, but if this ever becomes multi-user or shared, that data needs explicit handling (see §9).

## 5. Scope & Phasing

Per your call on build approach, this ships in three phases rather than all at once — the integrations are the highest-risk, highest-effort part, and two of the three services have real access hurdles (see §7). Building the core app first means you have a working, useful tool within days instead of blocked on third-party approvals.

**Phase 1 — Core app, manual entry (v1)**
Daily feed, workout log/plan, macro entry (manual, mirroring what you already see in Cal AI), progress trends. No external API integrations. Fully usable standalone.

**Phase 2 — Oura integration**
Oura has a clean, self-serve OAuth2 API with no business-approval gate. Pull sleep, readiness, HRV, temperature deviation, and workout data automatically into the daily feed.

**Phase 3 — Garmin integration (conditional)**
Garmin Connect's API requires applying to their Developer Program, which is explicitly scoped for business use, with a stated 1-4 week integration timeline after approval — there's a real chance a personal single-user project gets rejected or delayed. Treat this as a parallel-track application you submit early, not a v1 blocker. If it's rejected, fall back to manual CSV export from Garmin Connect (Garmin supports bulk data export via account settings) as a semi-automated import.

**Cal AI: no integration path currently exists.** Cal AI has no public developer API or documented data export — its only integrations are Apple Health (iOS) and Google Fit (Android), both of which are device-level, not something a web backend can query directly. Recommendation: keep macro entry manual in this app (you're already generating the numbers in Cal AI, so it's a copy-over, not new work), and revisit if Cal AI ships an API or exportable data later. Don't burn build time trying to reverse-engineer their app — flag it as infeasible and move on.

## 6. Core Features (Phase 1)

### 6.1 Daily Feed
The home screen, built for a single glance each morning.
- Today's scheduled workout (pulled from your standing PPL/Solidcore split, editable per day for swaps/rest days)
- Macro targets for the day vs logged-so-far (protein/carb/fat/kcal)
- Manually-entered recovery inputs for now (sleep quality, HRV if you want to type it in, resting HR, subjective energy 1-5) — these become auto-populated in Phase 2
- Step count vs 12K goal (manual entry in Phase 1)
- A short "today" note field — freeform, e.g. "deload today" or "high stress, cut volume"

### 6.2 Workout Log
- Pre-built PPL + Solidcore weekly template, editable
- Log sets/reps/weight per exercise; support supersets and notes
- Rest day / active recovery marking
- History view by exercise (progressive overload tracking — is your top set weight/reps trending up)

### 6.3 Macro & Nutrition Tracking
- Daily target: 125P/160C/57F, editable if your targets change
- Manual entry of daily totals (or per-meal, your call at build time) with running total vs target
- Diet constraint tags visible as a reference (gluten-free, low dairy/chicken, fish-forward) — not enforced, just a reminder surface, not a rules engine

### 6.4 Progress Tracking
- Weight/body composition trend line (manual entry, e.g. weekly weigh-in)
- Training consistency (workouts completed vs scheduled, weekly)
- Macro adherence trend (days within X% of target)
- Recovery trend once Phase 2 lands (resting HR, HRV, sleep score over time)

## 7. Integration Architecture (Phases 2-3)

| Service | Auth model | Access model | Data available | Risk |
|---|---|---|---|---|
| Oura | OAuth2 (server-side flow, refresh tokens) | Self-serve developer registration, no approval gate | Sleep, readiness, activity, workouts, heart rate, SpO2, tags | Low |
| Garmin Connect | OAuth (Connect Developer Program) | Requires application + approval; explicitly "business use" per their FAQ | Health, Activity, Women's Health, Training, Courses APIs | Medium-high — approval not guaranteed for a personal project; budget for rejection |
| Cal AI | None available | No public API, no documented export | N/A | Blocked — manual entry is the only current path |

For Oura and (if approved) Garmin: store tokens server-side, refresh proactively, and pull the prior night's/day's data via a scheduled job each morning so the daily feed loads pre-populated rather than fetching live on page load.

## 8. Data Model (high level)

- **User** — single row for you; profile + macro targets + step goal (versioned, so target changes are tracked, not overwritten)
- **WorkoutTemplate** — the standing weekly split (day of week → workout type)
- **WorkoutLog** — date, exercises, sets/reps/weight, notes, completed vs scheduled
- **Exercise** — name, category, tracked for history/PR views
- **DailyMetrics** — date, macros (target + actual), steps, weight, subjective energy, notes
- **RecoveryData** — date, source (manual/Oura/Garmin), sleep score, HRV, resting HR, temperature deviation, readiness score
- **IntegrationToken** — service, OAuth tokens, refresh state, last sync timestamp

## 9. Non-Functional Requirements

- **Privacy:** this is your personal health data (autoimmune status, hormone protocol, recovery metrics). Even single-user, don't skip basic security: encrypt tokens at rest, use HTTPS, don't log sensitive fields in plaintext application logs.
- **Auth:** simple single-user login is sufficient for v1 (email/password or magic link via your chosen backend's auth) — no need for enterprise-grade auth given the "just for me" decision, but don't skip auth entirely since OAuth tokens for your wearables will live in this database.
- **Performance:** daily feed should load in under 2 seconds on a cold load; this is a small-scale personal app, so this is achievable with basically any modern stack without special optimization.
- **Data ownership:** you should be able to export your own data (CSV at minimum) at any time — don't build yourself into a silo.

## 10. Recommended Tech Stack

Given you're building this yourself with an AI coding tool (Claude Code, Cursor, Bolt, or similar), this stack is chosen because it's extremely well-represented in those tools' training data and documentation, meaning fewer dead ends:

- **Frontend/Framework:** Next.js (React) — single codebase for frontend + API routes
- **Styling/UI:** Tailwind CSS + shadcn/ui components — fast to build a clean dashboard without designing from scratch
- **Backend/Database/Auth:** Supabase (Postgres + built-in auth + row-level security) — handles your DB, login, and OAuth token storage without standing up separate services
- **Hosting:** Vercel — pairs natively with Next.js, free tier is more than enough for single-user traffic
- **Charts:** Recharts or Tremor for the progress trend views

This stack needs no dedicated backend server to manage, which matters for a solo build — Next.js API routes + Supabase covers the OAuth token exchange/refresh jobs (via Supabase Edge Functions or a Vercel cron job) needed for Phase 2/3.

## 11. Risks & Open Questions

- **Garmin approval is not guaranteed.** Apply early (Phase 1, in parallel with building), not after Phase 1-2 are done — the FAQ language ("business use") suggests personal projects may get extra scrutiny or rejection. Have the manual-CSV fallback ready.
- **Cal AI has no path in today.** If macro auto-sync is a hard requirement rather than a nice-to-have, the realistic alternative is switching macro tracking to an app with a real API (e.g., Cronometer or MyFitnessPal both have more developer-accessible ecosystems) — worth a explicit decision from you rather than assuming Cal AI will add one.
- **Scope creep risk:** the daily feed concept invites "just one more integration" (Whoop, Apple Health, etc.) — recommend holding the line at Oura + Garmin per this PRD until Phase 1-3 are solid and in daily use.
- **Open question for you:** per-meal macro logging vs daily-total-only — affects both UI complexity and how much this duplicates Cal AI's job. Recommend daily-total-only for v1 since Cal AI already does per-meal photo logging well; no reason to rebuild that.

## 12. Rollout Plan

1. **Phase 1 (build first):** Core app — daily feed, workout log, manual macro/step/recovery entry, progress trends. Fully usable on its own.
2. **Submit Garmin Developer Program application** in parallel with Phase 1 build (long lead time, no reason to wait).
3. **Phase 2:** Oura OAuth integration — auto-populate recovery data each morning.
4. **Phase 3:** Garmin integration if approved; otherwise CSV import fallback.
5. **Revisit Cal AI** periodically for API/export changes; no action until then.
