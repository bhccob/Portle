# Deploying to Vercel

Portle runs on Vercel with a Neon Postgres database and Resend for email. All three have free plans. This guide puts it on a free `*.vercel.app` address; a custom domain comes later (see the end).

What the repo already does for you:

- `vercel.json` runs `pnpm db:setup` before `pnpm build`, so every deploy applies database migrations and seeds reference data. Migrations use Neon's direct connection (`DATABASE_URL_UNPOOLED`); the app uses the pooled `DATABASE_URL`.
- Functions run in Frankfurt (`fra1`), next to the database. Create the Neon database in Frankfurt too, or every query crosses the Atlantic.
- Node 24 is pinned in `package.json`.
- Auth links and checks use Vercel's production address automatically, so `BETTER_AUTH_URL` is only needed for a custom domain.
- On Vercel, the app refuses to start without `DATABASE_URL` and says how to fix it.

## 1. Resend (email)

1. Sign up at [resend.com](https://resend.com) with the email address you will use to test Portle.
2. Open **API Keys**, choose **Create API Key**, give it sending access, and copy the key (it starts with `re_`). It is shown once.

Until a domain is verified, Resend only delivers to your own account email, from `onboarding@resend.dev`. Signing up with any other address fails at the confirmation email. That is fine for testing alone.

## 2. Generate the two secret keys

Run this on your computer. It prints two lines, ready to paste:

```bash
node -e "const r=()=>require('crypto').randomBytes(32).toString('base64');console.log('BETTER_AUTH_SECRET='+r());console.log('PORTLE_ENCRYPTION_KEY='+r())"
```

Save both in a password manager. `PORTLE_ENCRYPTION_KEY` encrypts stored broker tokens: if it is lost or changed, those tokens can no longer be read.

## 3. Vercel (the site)

1. Sign up at [vercel.com](https://vercel.com) with **Continue with GitHub**.
2. Choose **Add New… → Project**, find `bhccob/Portle`, and choose **Import**. If it is not listed, use the link to adjust Vercel's GitHub access and allow the repository.
3. On the configure screen, leave the framework as **Next.js** and the build settings as they are (`vercel.json` sets them).
4. Open **Environment Variables** and add these. You can paste all lines at once into the first **Key** box:

   ```
   BETTER_AUTH_SECRET=<from step 2>
   PORTLE_ENCRYPTION_KEY=<from step 2>
   RESEND_API_KEY=<from step 1>
   MAIL_FROM=Portle <onboarding@resend.dev>
   FX_PROVIDER=frankfurter
   ```

5. Choose **Deploy**. **This first deploy is expected to fail** with "DATABASE_URL is not set": the database is added next.

## 4. Neon (the database)

1. In the Vercel project, open the **Storage** tab and choose **Create Database**, then **Neon** (Serverless Postgres).
2. Pick the region **Frankfurt** (AWS `eu-central-1`) and the free plan, then create it.
3. Connect it to the project for all environments (Production, Preview, Development). Vercel adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` itself.

## 5. Deploy again

1. Open the **Deployments** tab, open the menu (**⋯**) on the failed deployment, and choose **Redeploy**.
2. When it shows **Ready**, open the address under **Domains** on the project page (it looks like `portle-xxxx.vercel.app`). Use that address: Vercel protects the long per-deployment addresses with a login.
3. Sign up with your Resend account email, confirm from the email, and complete onboarding.

From now on, every push to `main` deploys automatically.

## If something goes wrong

- **Build fails with "DATABASE_URL is not set"**: the Neon database is not connected to this project, or not for Production. Check **Storage** → the database → connected projects.
- **"Failed to set environment variables" while connecting Neon**: a `DATABASE_URL` or `PG*` variable already exists. Delete it in **Settings → Environment Variables** and connect again.
- **Sign-up fails or no confirmation email arrives**: you signed up with an address other than your Resend account email (Resend refuses it with a 403), or `RESEND_API_KEY` is wrong. The deployment's logs show which.
- **Logs**: the deployment's **Logs** tab shows server errors.

## Before inviting other people

- **Domain:** buy one, add it under **Settings → Domains**, set `BETTER_AUTH_URL=https://<your domain>`, verify it in Resend (**Domains**), and change `MAIL_FROM` to an address on it.
- **Rate limits:** sign-in limits are stored in the database and work across instances. The in-memory limits on posts, comments and other actions are per instance, and Vercel runs many; add a shared store (Upstash Redis, roadmap item 3) first.
- **Previews:** preview deployments share the production database and run its migrations. Before working on branches, turn on Neon's database branch per preview in the integration settings.
- **Legal:** have the terms and privacy notice reviewed (roadmap item 10).
