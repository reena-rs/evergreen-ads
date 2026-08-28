# Reena's Workout Plan

Single-user daily training and recovery dashboard. Daily feed, workout log,
macro/step tracking, progress trends, plus a real Oura sync and a Garmin CSV
importer — per the PRD's Phase 1 core app and Phase 2/3 integrations.

Stack: Next.js (App Router) + Tailwind CSS + hand-rolled shadcn-style
components + Supabase (Postgres, Auth, RLS) + Recharts, per the PRD's
recommended stack.

## 1. Create a Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the **Project URL**, **anon public**
   key, and **service_role** key (the service role key is only used
   server-side by the Oura sync job — never expose it to the browser).
3. Copy `.env.example` to `.env.local` and fill in the Supabase values:

   ```bash
   cp .env.example .env.local
   ```

## 2. Run the migrations

In the Supabase dashboard's **SQL Editor**, run the files in
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

## 4. Set up Oura (optional, but this is the "real data" integration)

1. Register an API application at
   [cloud.ouraring.com/oauth/applications](https://cloud.ouraring.com/oauth/applications).
2. Add both redirect URIs so it works locally and once deployed:
   - `http://localhost:3000/api/integrations/oura/callback`
   - `https://<your-vercel-domain>/api/integrations/oura/callback`
3. Put the Client ID/Secret into `.env.local` as `OURA_CLIENT_ID` /
   `OURA_CLIENT_SECRET`.
4. Generate a token encryption key and put it in `.env.local` as
   `TOKEN_ENCRYPTION_KEY`:

   ```bash
   openssl rand -hex 32
   ```
5. Sign in to the app, go to **Settings**, and click **Connect Oura**.

Once connected, `/api/cron/sync` refreshes tokens as needed and pulls the
last few days of sleep score, readiness score, HRV, resting HR, and
temperature deviation into `recovery_data(source='oura')`. There's also a
**Sync now** button in Settings for testing without waiting on the schedule.

### The scheduled sync

`vercel.json` configures a daily cron hitting `/api/cron/sync` at 11:00 UTC
(~6-7am US Eastern, adjust to taste) — Vercel's Hobby tier supports one
cron run per day, which is all this needs. Set `CRON_SECRET` in both
`.env.local` and your Vercel project's env vars so the endpoint only accepts
requests carrying that secret (Vercel Cron sends it automatically once set).

## 5. Garmin — CSV import, not live sync

Garmin Connect's real-time API requires applying to their Developer Program
(explicitly scoped for business use, 1-4 week review, not guaranteed for a
personal project — see the PRD §7/§11). Rather than block on that approval,
Settings has a CSV importer: export a report from Garmin Connect (Account
Settings → Export Your Data, or an individual report's CSV export — Sleep,
Heart Rate, Steps) and upload it. The importer matches common column-name
variants for date, resting heart rate, HRV, sleep score, steps, and weight,
and writes into `recovery_data(source='garmin')` / `daily_metrics`.

If you want live Garmin OAuth later, apply at Garmin's Connect Developer
Program portal — that's a business-facing application only you can submit.

## 6. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first sign-in seeds
your weekly split (Push/Solidcore/Pull/Solidcore/Legs/Push/Rest) and macro
target (125P/160C/57F, 12,000 step goal) — edit both anytime on the Settings
page.

## What's here

- **Daily Feed** (`/`) — today's workout (editable), macro target vs. logged,
  recovery (auto-filled from Oura once connected, plus manual sleep
  quality/notes), steps vs. goal, a freeform note.
- **Workouts** (`/workouts`) — edit the standing weekly template, log
  sets/reps/weight/supersets for any date, mark rest/active recovery.
  `/workouts/history` charts top-set weight per exercise over time.
- **Nutrition** (`/nutrition`) — daily macro totals vs. target, diet
  constraint tags shown as a reference (not enforced).
- **Progress** (`/progress`) — 7/30/90-day weight trend, weekly training
  consistency, weekly macro adherence (% of logged days within 10% of kcal
  target), and recovery trend (merged across manual/Oura/Garmin sources).
- **Settings** (`/settings`) — macro targets/step goal (versioned), diet
  tags, profile, CSV export, Oura connect/disconnect + sync status, Garmin
  CSV importer.

## Cal AI — still no path in

No public API or documented data export exists for Cal AI. Macro entry
stays manual (you're already generating the numbers there, so it's a
copy-over). The PRD's alternative, if auto-sync becomes a hard requirement,
is switching to an app with a real API (Cronometer, MyFitnessPal).

## Security notes

- OAuth tokens (`integration_tokens`) are encrypted at rest with
  AES-256-GCM (`src/lib/crypto.ts`) using `TOKEN_ENCRYPTION_KEY` — not
  stored in plaintext.
- The scheduled sync job (`/api/cron/sync`) uses the Supabase **service
  role** key (`SUPABASE_SERVICE_ROLE_KEY`) since it has no logged-in browser
  session to carry an RLS-scoped JWT. It's used only server-side, in that one
  route and the shared sync helper — never bundled into client code.
- Set `CRON_SECRET` in production so the sync endpoint can't be triggered by
  anyone who finds the URL.

## Known limitations (intentional, for a v1)

- "Today" is computed from the server's clock, not your device's timezone.
  `profiles.timezone` exists in the schema for this but isn't wired into the
  date calculation yet — fine for a single timezone, worth fixing if that
  changes.
- Macro adherence tolerance (±10% of kcal target) is hardcoded in
  `src/lib/progress.ts` — change `tolerancePct` there if you want a tighter
  or looser bar.
- Garmin CSV column matching is best-effort against known Garmin Connect
  export variants — if a file doesn't match, the importer reports which
  fields it couldn't find rather than guessing.

## Deploying

Push to a Git repo and import into [Vercel](https://vercel.com/new), setting
**Root Directory** to `workout-dashboard` and these env vars in the project
settings: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`,
`TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`. No other backend to stand up —
Next.js API routes and the Vercel Cron job talk to Supabase and Oura
directly.
