# Reena's Workout Plan

Single-user daily training and recovery dashboard. Phase 1 (per the PRD): daily
feed, workout log, manual macro/step/recovery entry, and progress trends — no
external integrations yet.

Stack: Next.js (App Router) + Tailwind CSS + hand-rolled shadcn-style
components + Supabase (Postgres, Auth, RLS) + Recharts, per the PRD's
recommended stack.

## 1. Create a Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the **Project URL** and **anon public**
   key.
3. Copy `.env.example` to `.env.local` and fill them in:

   ```bash
   cp .env.example .env.local
   ```

## 2. Run the migrations

In the Supabase dashboard's **SQL Editor**, run the two files in
`supabase/migrations/` in order:

1. `0001_init.sql` — tables, RLS policies, triggers
2. `0002_seed_function.sql` — `seed_default_plan(user_id)`, called
   automatically on first sign-in to populate your standing weekly split and
   starting macro target

(If you prefer the Supabase CLI: `supabase db push` after `supabase link`,
with these files in place.)

## 3. Create your account

This is a single-user app — there's no public sign-up flow. In the Supabase
dashboard, go to **Authentication → Users → Add user** and create yourself an
email/password account. Sign in with those credentials at `/login`.

## 4. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first sign-in seeds
your weekly split (Push/Solidcore/Pull/Solidcore/Legs/Push/Rest) and macro
target (125P/160C/57F, 12,000 step goal) — edit both anytime on the Settings
page.

## What's here (Phase 1)

- **Daily Feed** (`/`) — today's workout (editable), macro target vs. logged,
  manual recovery inputs (sleep quality/HRV/resting HR), steps vs. goal, a
  freeform note.
- **Workouts** (`/workouts`) — edit the standing weekly template, log
  sets/reps/weight/supersets for any date, mark rest/active recovery.
  `/workouts/history` charts top-set weight per exercise over time.
- **Nutrition** (`/nutrition`) — daily macro totals vs. target, diet
  constraint tags shown as a reference (not enforced).
- **Progress** (`/progress`) — 7/30/90-day weight trend, weekly training
  consistency, weekly macro adherence (% of logged days within 10% of kcal
  target), and recovery trend.
- **Settings** (`/settings`) — edit macro targets/step goal (versioned —
  changes apply from today forward, past days keep their original target),
  diet tags, profile; CSV export of all your data.

## What's *not* here yet (Phases 2-3, per the PRD)

- **Oura** — Phase 2. Self-serve OAuth2, no approval gate. Not implemented in
  this codebase yet; `integration_tokens` table exists in the schema so
  Phase 2 doesn't need a migration.
- **Garmin** — Phase 3, conditional on Garmin Connect Developer Program
  approval (explicitly scoped for business use — apply early, in parallel,
  not as a Phase 1 blocker). Fallback is manual CSV import from Garmin
  Connect's account-settings export if rejected.
- **Cal AI** — no public API or data export exists. Macro entry stays manual
  in this app (you're already generating the numbers in Cal AI, so it's a
  copy-over). Revisit if that changes.

### Security notes before building Phase 2/3

`integration_tokens` stores OAuth tokens in plain columns today. Before
writing real tokens into it, add encryption at rest (e.g. Supabase Vault /
`pgsodium`, or application-level encryption before insert) — the PRD calls
this out explicitly (§9) since these are your personal health/wearable
credentials, not just app data.

## Known limitations (intentional, for a v1)

- "Today" is computed from the server's clock, not your device's timezone.
  `profiles.timezone` exists in the schema for this but isn't wired into the
  date calculation yet — fine for a single timezone, worth fixing if that
  changes.
- Macro adherence tolerance (±10% of kcal target) is hardcoded in
  `src/lib/progress.ts` — change `tolerancePct` there if you want a tighter
  or looser bar.

## Deploying

Push to a Git repo and import into [Vercel](https://vercel.com/new), setting
the two `NEXT_PUBLIC_SUPABASE_*` env vars in the project settings. No other
backend to stand up — Next.js API routes talk to Supabase directly.
