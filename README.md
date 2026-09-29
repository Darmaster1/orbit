# Orbit — Family credit card tracker

Orbit is a mobile-first family credit card tracker built with React, TypeScript, Vite, and Supabase-ready data structures. It launches immediately in demo mode with realistic family data and persists changes in browser local storage. Add Supabase environment variables to switch the deployment from the local demo shell to a shared authenticated workspace.

## What is included

- Dashboard with family spending, card target progress, recent activity, reminders, and deterministic insights
- Fast mobile add-expense workflow with categories, tags, dates, and notes
- Shared expense ledger with search, card filtering, and delete controls
- Card detail drawer with period progress, spending breakdown, benefits, and activity
- Transparent “Which card should I use?” recommendation modal based only on configured rules
- Reports with category donut, card comparison, online/offline summary, and target completion
- PWA manifest and responsive mobile navigation
- Supabase PostgreSQL schema with integer paise money storage and Row Level Security policies
- Realtime subscription helper in `src/lib/supabase.ts`

## Run locally

Requirements: Node.js 18+.

```bash
corepack pnpm@9.15.5 install
corepack pnpm@9.15.5 run dev
```

Open the local URL printed by Vite. The app is usable without any account or environment variables; this is intentional so you can review the interface before connecting a database.

## Connect Supabase

1. Create a Supabase project.
2. Open **SQL Editor** in Supabase.
3. If you have not run the original schema yet, paste and run `supabase/schema.sql`. If you already ran the earlier build’s schema, run `supabase/migrations/002_auth_workspace.sql` instead.
4. In Supabase Auth, enable the sign-in method you want (email/password is the simplest starting point).
5. Copy `.env.example` to `.env.local`.
6. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the public project URL and Supabase Publishable key. Older projects can use `VITE_SUPABASE_ANON_KEY`; the app accepts either name.
7. Restart Vite:

```bash
corepack pnpm@9.15.5 run dev
```

The schema deliberately stores only the issuer, card name, owner, card type, and last four digits. Never add a full card number, CVV, PIN, or banking password to the database or environment variables.

### Production data wiring

When Supabase variables are present, the app uses Supabase Auth, family creation/joining, cards, expenses, RLS-safe writes, and realtime refreshes. Without them, it falls back to a local demo store so the interface can still be reviewed offline. The recommendation function remains pure and reads the configured card rules loaded for the current family.

## Build for production

```bash
corepack pnpm@9.15.5 run build
corepack pnpm@9.15.5 run preview
```

The production files are emitted to `dist/`.

## Host it

### Option A — Replit Deployments

1. Import this ZIP into a new Replit project.
2. Open the Shell and run `corepack pnpm install`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the project Secrets panel if using Supabase. Use the Publishable key, never the Secret key.
4. Run `corepack pnpm run build` once to verify the build.
5. Create a **Static deployment** with build command `pnpm run build` and public directory `dist`.
6. Publish and use the generated `.replit.app` URL.

### Option B — Vercel

1. Unzip the project and push the folder to GitHub.
2. Import the repository at vercel.com.
3. Framework preset: **Vite**.
4. Build command: `pnpm run build`.
5. Output directory: `dist`.
6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` if using Supabase.
7. Deploy.

### Option C — Netlify

1. Push the unzipped folder to GitHub or drag the folder into Netlify.
2. Build command: `pnpm run build`.
3. Publish directory: `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Site configuration → Environment variables. Use the Publishable key, never the Secret key.
5. Deploy.

For a static host, add a rewrite from `/*` to `/index.html` if you later introduce client-side routes. The current version uses a single-page shell, so its navigation works without that rewrite.

## Money and security notes

The demo uses rupees at the UI layer. The production schema uses integer paise to avoid floating-point money errors. Keep any conversion at the API boundary: `₹2,450` becomes `245000` paise in PostgreSQL. All access policies are scoped through `family_id` and the authenticated user’s `family_members` row.
