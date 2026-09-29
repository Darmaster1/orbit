# Step-by-step hosting guide

This guide gets the ZIP from your computer to a live URL. You can host the interface first in demo mode, then connect a shared Supabase database.

## 1. Install Node.js

Install Node.js 18 or newer from https://nodejs.org. Confirm it:

```bash
node --version
npm --version
```

## 2. Unzip the download

Extract `orbit-family-credit-card-tracker.zip` into a folder. Open a terminal in that folder.

## 3. Test the app locally

```bash
corepack pnpm@9.15.5 install
corepack pnpm@9.15.5 run dev
```

Open the `http://localhost:5173` address shown in the terminal. You can add expenses and reload the page; demo changes are saved in that browser only.

## 4. Create the database (recommended for family sharing)

1. Go to https://supabase.com and create a project.
2. Open **SQL Editor → New query**.
3. If you have not run the original schema yet, copy all contents of `supabase/schema.sql` into the editor. If you already ran the earlier build’s schema, use `supabase/migrations/002_auth_workspace.sql` instead.
4. Click **Run**.
5. Open **Project Settings → API** and copy the Project URL and anon public key.

The SQL creates the tables, indexes, realtime publication entries, and Row Level Security policies. It does not store full card numbers or banking credentials.

## 5. Add environment variables

Create `.env.local` in the project folder:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never commit `.env.local` to GitHub. It is already covered by `.gitignore`.

## 6. Verify a production build

```bash
corepack pnpm@9.15.5 run build
corepack pnpm@9.15.5 run preview
```

If the build succeeds, the deployable files are in `dist/`.

## 7. Host on Vercel

1. Create a GitHub repository and upload the unzipped project.
2. Go to https://vercel.com/new and import the repository.
3. Keep **Framework Preset: Vite**.
4. Set **Install Command** to `pnpm install --frozen-lockfile`.
5. Set **Build Command** to `pnpm run build`.
6. Set **Output Directory** to `dist`.
7. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Environment Variables. Use the Supabase Publishable key, never the Secret key.
8. Deploy.

Vercel will give you an HTTPS URL. Use that URL when inviting family members.

## 8. Host on Netlify

1. Go to https://app.netlify.com/start and import the GitHub repository.
2. Set **Build command** to `pnpm run build`.
3. Set **Publish directory** to `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Site configuration → Environment variables. Use the Supabase Publishable key, never the Secret key.
5. Click Deploy site.

## 9. Host on Replit

1. Create a new Replit project and import the ZIP.
2. Run `corepack pnpm install`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Secrets tool. Use the Publishable key, never the Secret key.
4. Run `corepack pnpm run build`.
5. Choose a Static deployment, with build command `pnpm run build` and public directory `dist`.
6. Publish the deployment.

## 10. Before inviting family

- Turn on the auth provider in Supabase.
- Create the first admin user and family row.
- Seed the default categories and tags.
- Add each card using only issuer, card name, owner, type, and last four digits.
- Configure card rules manually; Orbit never guesses a card’s benefits.
- Test with two separate accounts and confirm that each family can see only its own data.

## Troubleshooting

- **Blank page after deploy:** verify the publish directory is `dist`, not the project root.
- **Supabase calls fail:** check the exact `VITE_` names, confirm the Publishable key (not Secret key), and redeploy after changing them.
- **Users cannot create or join a family:** rerun the latest `supabase/schema.sql`, including the `create_family` and `join_family` functions.
- **Changes are not shared:** confirm that every user is signed in, belongs to the same family invite code, and that the latest deployment has the Supabase variables attached to the Production environment.
- **Currency display:** the UI is formatted for INR. Change `src/lib/format.ts` if your family uses another currency.