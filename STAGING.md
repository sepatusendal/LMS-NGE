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

**Google Drive:** the app authenticates via a real Google account's OAuth2 refresh
token, not a service account (a standalone service account has zero Drive storage
quota — see the comment at the top of `src/lib/google-drive/drive-client.ts`).
Reuse the same `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET`/
`GOOGLE_OAUTH_REFRESH_TOKEN` as production (same dedicated Gmail account,
obtained once via `scripts/google-oauth-setup.ts`), but create a separate root
folder in Drive for staging uploads and point `GOOGLE_DRIVE_ROOT_FOLDER_ID` at it
— keeps test check-in photos and parent report PDFs out of the real folder.

## 3. Apply the schema

This runs every migration in `prisma/migrations/` (33 and counting as of
2026-09-05 — including the RLS policies, auth trigger, `create_teaching_report`
function, and whatever's been added most recently) against the staging database:

```bash
npm run db:migrate:staging
```

Run `npx prisma migrate status` (with `.env.staging` loaded — see the pattern
under "Safety notes" below) first if you're not sure staging is caught up.

## 4. Staging admin account

**Staging is no longer empty** (this section described first-time setup; as of
2026-08-13 staging was seeded with a full mirror of production data — schools,
classes, students, teachers, admin/coordinator accounts — so this step usually
doesn't apply anymore). Existing staging credentials are in `CREDENTIALS.staging.md`
(gitignored) — check there first before creating a new account.

If you do need a fresh account (a brand-new staging project, or testing a specific
role from scratch): run the app locally against staging and use Supabase's dashboard
(**Authentication → Users → Add user**) to create it, then insert the matching row
into `public.users` with the right `role` (Table Editor, or `db:studio:staging`) —
or, now that it exists, use the app's own **Admin & Coordinator → Tambah Akun** /
**Teacher → Tambah Teacher** UI instead (see `USER-MANAGEMENT.md`), which is the
supported path for every role except the very first admin on a brand-new project.

## 5. Run against staging locally

```bash
npm run dev:staging
```

This loads `.env.staging` instead of `.env`. The `.claude/launch.json` config for
this (`ecms-staging`) pins it to **`localhost:3100`** specifically — deliberately
different from the plain `dev` config's `localhost:3000` — so you can run staging
and production side by side locally (e.g. verifying a fix on staging while prod is
still open in another tab) without a port clash.

**Windows/PowerShell gotcha:** `dev:staging`/`db:migrate:staging`/etc. all shell out
to `dotenv-cli`, which on a fresh `npm install` sometimes doesn't get a `.cmd` shim
generated under `node_modules/.bin/` on Windows (you'll see `'dotenv' is not
recognized...`). Fix: re-run `npm install` once (regenerates the platform-correct
shims, doesn't touch `package.json`/`package-lock.json`) — no need to install
anything globally.

## 6. Deploy staging to Vercel

Still not set up as of 2026-09-05 — staging has only ever been run locally
(`npm run dev:staging`) against the staging Supabase project, never deployed. If/when
this is needed, the recommended approach is still a **second, separate Vercel
project** (not a second environment on the prod project) — cleanest isolation, no
risk of an env var mix-up leaking staging config into a prod build or vice versa.

```bash
vercel link            # creates/links a new Vercel project for this repo — pick a
                        # distinct name like lms-nge-staging when prompted
vercel env add NEXT_PUBLIC_SUPABASE_URL production   # repeat for each var in
                                                       # .env.staging, or paste them
                                                       # via the Vercel dashboard
vercel --prod           # deploy
```

(Prisma's `DATABASE_URL`/`DIRECT_URL` and the Google Drive vars need to be added the
same way.) Note: `TZ` specifically **cannot** be added this way — Vercel rejects it
as a reserved environment-variable name (confirmed 2026-09-05, both via dashboard and
`vercel env add`). Production works around this in code via `src/instrumentation.ts`
(`process.env.TZ = "Asia/Jakarta"`, set once at server start) rather than an env var
— replicate that same file if this staging Vercel project ever gets set up, don't
waste time trying to set `TZ` in its dashboard.

## Safety notes

- Never paste production credentials into `.env.staging`, and never paste staging
  credentials into `.env`.
- **Staging is not empty anymore** — as of 2026-08-13 it holds a full mirror of
  production data (real schools, classes, students, teacher/admin accounts — see
  `CREDENTIALS.staging.md`), specifically so manual testing reflects realistic scale
  and edge cases. Treat it as "safe to break, but not empty" — e.g. don't assume a
  count/list widget showing real-looking numbers means you're on prod by mistake;
  double-check the URL/env instead. The `scripts/seed-nurul-fajri.ts` and
  `scripts/seed-dtr-history.ts` one-off import scripts (hardcoded to read `.env`,
  real production data) are what originally populated it — don't re-run them.
- Migrations are applied to each environment manually — staging via
  `npm run db:migrate:staging`, prod via `npm run db:migrate:prod` — and are
  **not** automatically kept in sync with each other. Before testing a change,
  re-run the staging command if new migrations were added; **and don't forget
  the prod command too**, once the change is verified on staging. Skipping the
  prod run is exactly what caused a 2026-08-31 incident: prod silently fell 2
  migrations behind staging, and every class-listing query broke app-wide
  (missing `curriculums.reportFormat` column caused a SQL error on every
  request). Always run both commands, one right after the other, whenever a
  new migration file is added. (As of 2026-09-05 both environments are in sync at
  33 migrations.)
- **Git branch note:** production deploys from the `prod` branch (not `main`, which
  is stale/unused), via Vercel's git integration — pushing to `prod` triggers an
  automatic production build. The workflow used for every fix in this repo so far:
  commit to `dev`, verify on staging, then fast-forward `prod` to `dev`
  (`git checkout prod && git merge --ff-only dev && git push origin prod`) once
  confirmed. `prod` should only ever move forward via fast-forward from `dev` —
  never commit directly to it.
