# Deploying J's Finest to Railway

Follow these in order. Anything in `code font` is typed or pasted exactly.

---

## How storage works (read this once)

Two things have to survive every redeploy, or the shop loses data:

| What | Where it lives | Why |
|---|---|---|
| Barber accounts, hours, bookings, customers, tips | SQLite file at `/data/app.db` | On the volume, not in the app image |
| Profile photos, portfolios, homepage gallery | `/data/uploads/` | Same — uploads are files, not database rows |

Both sit on **one Railway Volume mounted at `/data`**. A volume is a disk that
stays attached to the service across deploys and restarts.

The critical thing this setup fixes: photos used to be written into `public/`.
Next.js only serves `public/` **as it existed when the app was built**, so every
redeploy would have silently wiped every photo a barber uploaded. Uploads now go
to the volume and are served by a route handler that reads from disk on each
request.

---

## Step 1 — Move the project out of OneDrive

Do this first. OneDrive syncing locks files mid-write and has already crashed
the dev server and corrupted a Prisma build during development. It will do worse
to a live database.

Move the whole `barbershop-website` folder to somewhere outside OneDrive, e.g.:

```
C:\Users\sasan\projects\barbershop-website
```

Then reopen the project from the new location.

---

## Step 2 — Put the code on GitHub

Railway deploys from a GitHub repo. From the project folder:

```bash
git init
```

```bash
git add -A && git commit -m "J's Finest barbershop site"
```

Create an empty repo on github.com (private is fine), then:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
```

```bash
git branch -M main && git push -u origin main
```

`.gitignore` already excludes `uploads/`, `*.db`, `.env`, and `backups/` — real
photos, the database, and secrets never land in GitHub.

---

## Step 3 — Create the Railway service

1. railway.app → **New Project** → **Deploy from GitHub repo** → pick the repo.
2. Let the first build run. **It will fail or come up empty — that's expected**,
   the variables and volume aren't set yet.

---

## Step 4 — Add the Volume (do this before the next deploy)

In the service → **Settings** → **Volumes** → **New Volume**:

- **Mount path:** `/data`

Start at 1 GB. That holds thousands of photos; you can grow it later.

---

## Step 5 — Set the environment variables

Service → **Variables** → add all four:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `file:/data/app.db` |
| `UPLOAD_DIR` | `/data/uploads` |
| `SESSION_SECRET` | a long random string — generate below |
| `TZ` | `America/Chicago` |

`TZ` is not optional. The booking system works in shop-local time — opening
hours, time slots, "today" on the dashboard. Railway containers default to UTC,
which would shift every appointment by 5–6 hours and show barbers the wrong day.

Generate the session secret (never reuse the local one):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

If `SESSION_SECRET` ever changes, everyone is logged out — set it once and leave it.

---

## Step 6 — Deploy

Trigger a redeploy. On start the app runs `prisma migrate deploy`, which creates
all the tables on the volume automatically. Watch the deploy log for
`Ready in …`.

---

## Step 7 — Seed the shop and claim your account

The database is empty on first deploy — no services, no barbers. Seed it once.

Install the Railway CLI, then from the project folder:

```bash
npx @railway/cli login
```

```bash
npx @railway/cli link
```

```bash
npx @railway/cli run npm run db:seed
```

That creates the six services (Classic Cut, Skin Fade, …) and the barber rows,
including the owner row for **juliomolina65@gmail.com with no password**.

Now open `https://<your-app>.up.railway.app/signup` and sign up with
**juliomolina65@gmail.com**. Because that row already exists without a password,
signing up sets your password and hands you owner access — you are not put in the
approval queue.

Then, in **Manage Barbers**, deactivate the demo barbers (Marco, Andre) if you
don't want them public.

---

## Step 8 — Re-upload the homepage photos

Your 15 gallery photos are local only (they're gitignored, correctly). After
logging in as owner:

**Dashboard → OUR WORK → + ADD PHOTOS**, then select all of them from:

```
<project folder>\uploads\work
```

They upload straight to the volume and appear in the homepage carousel.

---

## Step 9 — Connect the GoDaddy domain

**In Railway:** service → Settings → Networking → **Custom Domain** → enter
`jsfinestbarbershop.com` (and add `www.jsfinestbarbershop.com` as a second
domain). Railway shows you a target hostname like
`abc123.up.railway.app`.

**In GoDaddy:** My Products → your domain → **DNS** → Manage DNS:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `www` | the Railway target hostname | 1 hour |

For the bare domain (`jsfinestbarbershop.com` with no `www`), GoDaddy doesn't
allow a CNAME at the root. Two options:

- **Easiest:** use GoDaddy's **Forwarding** to redirect the root to
  `https://www.jsfinestbarbershop.com`, and treat `www` as the real address.
- **Cleaner:** point the domain's nameservers at a DNS provider that supports
  ALIAS/ANAME records (Cloudflare's free tier does), then add an ALIAS at the
  root pointing to the Railway hostname.

DNS usually propagates in 10–60 minutes. Railway issues the HTTPS certificate
automatically once it resolves.

---

## Step 10 — Set up backups (don't skip this)

The volume is a single disk. If it's lost, bookings, accounts, and every photo
go with it. Back up before you start taking real customers.

From your machine, with the Railway CLI linked:

```bash
npx @railway/cli run npm run db:backup
```

That writes `backups/<timestamp>/` containing `database.db` and a copy of
`uploads/`. **Copy that folder to Google Drive or an external disk** — a backup
sitting next to the original is not a backup.

Do this weekly at minimum. Railway also offers volume backups on paid plans;
turning those on as well is worth it.

---

## Going further

**If the shop grows** (multiple locations, heavy traffic, or you want automatic
point-in-time database backups), move from SQLite to Railway's managed Postgres:

1. Add a Postgres database in the Railway project.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `"postgresql"`.
3. Point `DATABASE_URL` at Railway's `${{Postgres.DATABASE_URL}}`.
4. Re-run migrations.

Photos still stay on the volume — only the database moves. Nothing else in the
code changes, because everything already reads `DATABASE_URL` from the
environment.

---

## Troubleshooting

**Photos vanish after a deploy** — the volume isn't mounted at `/data`, or
`UPLOAD_DIR` isn't `/data/uploads`. Check Variables and the volume mount path.

**"SESSION_SECRET is not set"** — add the variable and redeploy.

**Everyone logged out unexpectedly** — `SESSION_SECRET` changed. Set it back.

**Build fails on `prisma generate`** — confirm the repo has `prisma/schema.prisma`
committed and `prisma` is in `devDependencies` (it is).

**Bookings show the wrong time / dashboard shows the wrong day** — `TZ` is
missing or wrong. It must be `America/Chicago`. Redeploy after setting it.
