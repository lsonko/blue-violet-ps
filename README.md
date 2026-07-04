# Blue Violet Physician Services

Administrative & tax-management web app for a New Jersey physician operating
through an LLC — income, deductions, CME, and credentials feeding one dashboard
with a live tax-set-aside estimate. Built from the Claude Design prototype.

**Stack:** Next.js 16 (App Router) · TypeScript · Supabase (Postgres + Auth +
Storage). No Tailwind — the prototype's periwinkle design system is ported to
plain CSS + inline styles for pixel fidelity.

## Setup

1. **Environment** — copy `.env.example` to `.env.local` and fill in your
   Supabase project URL + anon key (Project Settings → API):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

2. **Database** — run `supabase/migrations/0001_init.sql` in the Supabase SQL
   editor (or `supabase db push`). It creates the tables, row-level-security
   policies, and the private `documents` storage bucket.

3. **Auth** — in the Supabase dashboard:
   - Authentication → Providers → Email: enabled (turn off "Confirm email" for
     quick local testing).
   - Authentication → URL Configuration → Redirect URLs: add
     `http://localhost:3000/**` (needed for the password-reset link).
   - Authentication → Users → Add user: create an account. On first login the
     app auto-seeds the demo physician dataset for that user.

4. **Run**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000.

## How it fits together

- `app/login`, `app/reset` — auth screens (sign in, forgot-password via
  Supabase's emailed reset link, set-new-password landing).
- `proxy.ts` — refreshes the Supabase session cookie and gates every route.
- `app/page.tsx` — server component: authenticates, loads + seeds data
  (`lib/data.ts`), renders the app.
- `components/App.tsx` — the authenticated shell + all six screens
  (dashboard, income, deductions, CME, credentials, settings), modals, and the
  file viewer. Ported from the prototype; persists via `lib/supabase/repo.ts`.
- `lib/tax.ts` — the tax engine (annualized projection → SE tax → federal + NJ
  brackets → level quarterly installments with catch-up). Independently
  verified against the source design's numbers.

## Data model & security

Every table is keyed to `auth.uid()` and protected by RLS, so a signed-in user
can only ever touch their own rows. Receipts and credential documents go to a
**private** Storage bucket, scoped to a per-user folder and served through
short-lived signed URLs — no public file access.

## Notes for real-world use

The tax bracket thresholds, standard deductions, SS wage base, and Medicare
surtax thresholds in `lib/tax.ts` are the design's stated 2026 figures
(per IRS Rev. Proc. 2025-32). Confirm them against the final published 2026
tables before relying on the estimate for actual planning. The app is a
planning tool for how much to set aside — not a filed return; QBI and some
retirement vehicles are intentionally excluded (surfaced as in-app caveats).
