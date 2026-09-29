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
npm install
npm run dev
```

Open the `http://localhost:5173` address shown in the terminal. You can add expenses and reload the page; demo changes are saved in that browser only.

## 4. Create the database (recommended for family sharing)

1. Go to https://supabase.com and create a project.
2. Open **SQL Editor → New query**.
3. Copy all contents of `supabase/schema.sql` into the editor.
4. Click **Run**.
5. Open **Project Settings → API** and copy the Project URL and anon public key.

The SQL creates the tables, indexes, realtime publication entries, and Row Level Security policies. It does not store full card numbers or banking credentials.

## 5. Add environment variables

Create `.env.local` in the project folder:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Never commit `.env.local` to GitHub. It is already covered by `.gitignore`.

## 6. Verify a production build

```bash
npm run build
npm run preview
```

If the build succeeds, the deployable files are in `dist/`.

## 7. Host on Vercel

1. Create a GitHub repository and upload the unzipped project.
2. Go to https://vercel.com/new and import the repository.
3. Keep **Framework Preset: Vite**.
4. Set **Build Command** to `npm run build`.
5. Set **Output Directory** to `dist`.
6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Environment Variables.
7. Deploy.

Vercel will give you an HTTPS URL. Use that URL when inviting family members.

## 8. Host on Netlify

1. Go to https://app.netlify.com/start and import the GitHub repository.
2. Set **Build command** to `npm run build`.
3. Set **Publish directory** to `dist`.
4. Add the two `VITE_` variables in Site configuration → Environment variables.
5. Click Deploy site.

## 9. Host on Replit

1. Create a new Replit project and import the ZIP.
2. Run `npm install`.
3. Add the environment variables in the Secrets tool.
4. Run `npm run build`.
5. Choose a Static deployment, with build command `npm run build` and public directory `dist`.
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
- **Supabase calls fail:** check the exact `VITE_` names and redeploy after changing them.
- **Changes are not shared:** the current ZIP opens in local demo mode until production query wiring is connected; the schema and realtime helper are included for that next step.
- **Currency display:** the UI is formatted for INR. Change `src/lib/format.ts` if your family uses another currency.