# Staging Environment

Staging is a **fully separate Supabase project** from production — separate database,
separate auth users, separate storage. This is what makes it safe to test against:
nothing you do in staging (check-ins, reports, deleting a class, etc.) touches the
real Nurul Fajri data.

## 1. Create the staging Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**.
2. Name it something unambiguous, e.g. `lms-nge-staging`. Same region as prod.
3. Set a DB password and save it somewhere safe (password manager, not this repo).
4. Once provisioned, go to **Project Settings → API** and **Project Settings → Database**
   and copy the values into `.env.staging` (see step 2).

## 2. Configure `.env.staging`

```bash
cp .env.staging.example .env.staging
```

Fill in the values from the new project:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key |
| `DATABASE_URL` | Project Settings → Database → Connection pooling (port 6543) |
| `DIRECT_URL` | Project Settings → Database → Direct connection (port 5432) |

`.env.staging` is gitignored — it never gets committed, same as `.env`.

**Google Drive:** reuse the same service account (`GOOGLE_CLIENT_EMAIL`/`GOOGLE_PRIVATE_KEY`),
but create a separate root folder in Drive for staging uploads and point
`GOOGLE_DRIVE_ROOT_FOLDER_ID` at it — keeps test check-in photos and parent report
PDFs out of the real folder.

## 3. Apply the schema

This runs all 16 migrations (including the RLS policies, auth trigger, and the
`create_teaching_report` function) against the fresh staging database:

```bash
npm run db:migrate:staging
```

## 4. Create a staging admin account

The staging project has its own Supabase Auth — no users exist yet. Easiest path:
run the app locally against staging and use Supabase's dashboard (**Authentication →
Users → Add user**) to create your first admin, then insert the matching row into
`public.users` with `role = 'ADMIN'` (Table Editor, or `db:studio:staging`).

## 5. Run against staging locally

```bash
npm run dev:staging
```

This loads `.env.staging` instead of `.env`, so it talks to the staging Supabase
project on `localhost:3000`.

## 6. Deploy staging to Vercel

Recommended: a **second, separate Vercel project** (not a second environment on the
prod project) — cleanest isolation, no risk of an env var mix-up leaking staging
config into a prod build or vice versa.

```bash
vercel link            # creates/links a new Vercel project for this repo — pick a
                        # distinct name like lms-nge-staging when prompted
vercel env add NEXT_PUBLIC_SUPABASE_URL production   # repeat for each var in
                                                       # .env.staging, or paste them
                                                       # via the Vercel dashboard
vercel --prod           # deploy
```

(Prisma's `DATABASE_URL`/`DIRECT_URL` and the Google Drive vars need to be added the
same way.) I haven't run these — they create a live deployment, so it's worth doing
together once the Supabase side is confirmed working locally.

## Safety notes

- Never paste production credentials into `.env.staging`, and never paste staging
  credentials into `.env`.
- Staging starts completely empty (no schools/classes/students). The existing
  `scripts/seed-nurul-fajri.ts` and `scripts/seed-dtr-history.ts` are one-off
  imports of *real* production data (hardcoded to read `.env`, not reusable
  as a generic seeder) — don't run them against staging. Create test
  schools/classes/students through the app's own Admin UI instead, or ask for a
  dedicated staging seed script if you want a quick way to populate sample data.
- Migrations are applied to staging manually (`npm run db:migrate:staging`) — they
  are not automatically kept in sync with prod. Before testing a change, re-run that
  command if new migrations were added.
