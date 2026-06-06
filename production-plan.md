# Production Readiness Plan

## Phases Overview

| Phase | What | Status |
|-------|------|--------|
| 1 | Database: SQLite → PostgreSQL | 🔄 In Progress |
| 2 | File storage: local filesystem → Cloudflare R2 | ⏳ Pending |
| 3 | Email: console logs → Resend | ⏳ Pending |

---

## Phase 1: Database

### 1a — Local PostgreSQL via Docker ✅ Done

- `docker-compose.yml` created — runs Postgres 16 in a container
- `prisma/schema.prisma` updated: `sqlite` → `postgresql`
- `.env` created with `DATABASE_URL=postgresql://rental:rental@localhost:5432/rental_app`
- `npm run db:push` — schema created in Postgres
- `npm run db:seed` — demo account seeded (`demo@landlord.app` / `demo1234`)
- Verified via Prisma Studio (`npx prisma studio`)

**To start the local database:**
```bash
docker compose up -d   # start Postgres container
npm run dev            # start the app
```

**To inspect the database:**
```bash
npx prisma studio      # visual browser at http://localhost:5555
# or connect directly:
docker exec -it rental-app-db-1 psql -U rental -d rental_app
```

---

### 1b — Production PostgreSQL via Neon ⏳ Next

Neon is a serverless Postgres provider with a free tier and one-click Vercel integration.

**Steps:**

1. **Create a Neon account** at [neon.tech](https://neon.tech)
2. **Create a new project** — choose a region close to your users (e.g. US East)
3. **Copy the connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Set it as `DATABASE_URL`** in your hosting platform's environment variables (Vercel, Railway, etc.)
5. **Run migrations on Neon** — either via the Prisma CLI pointed at Neon, or let the deploy pipeline handle it:
   ```bash
   DATABASE_URL="<neon-connection-string>" npx prisma db push
   ```
6. **Seed if needed** (optional — production likely won't need demo data):
   ```bash
   DATABASE_URL="<neon-connection-string>" npx prisma db seed
   ```

**Important:** Never commit the Neon connection string to git. Always set it as an environment variable on the hosting platform.

---

## Phase 2: File Storage — Local → Cloudflare R2 ⏳ Pending

Currently all uploaded files (leases, bills, maintenance photos) and generated PDFs (statements, receipts) are written to `./uploads/` on the local filesystem. This is wiped on every deploy.

**Plan:**
- Add `@aws-sdk/client-s3` (R2 is S3-compatible)
- Update `src/lib/files.ts` to upload to / download from R2
- Update `src/lib/pdf.ts` to write generated PDFs to R2
- Store object keys in the DB instead of local file paths
- Add env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

**Setup (when ready):**
1. Create a [Cloudflare account](https://cloudflare.com) → R2 → New bucket
2. Create an API token with R2 read/write permissions
3. Set the env vars above on your hosting platform

---

## Phase 3: Email — Console → Resend ⏳ Pending

Currently all emails (statements, receipts, notices) log to stdout. Nothing is actually sent.

**Plan:**
- Sign up at [resend.com](https://resend.com) — free tier: 3,000 emails/month
- Add `RESEND_API_KEY` env var
- Update `src/lib/email.ts` to call the Resend API instead of logging

---

## Environment Variables Checklist

| Variable | Local dev | Production |
|----------|-----------|------------|
| `DATABASE_URL` | ✅ Set (Docker Postgres) | Set Neon connection string |
| `SESSION_SECRET` | ⚠️ Using placeholder | Set a long random string |
| `NEXT_PUBLIC_APP_URL` | ✅ `http://localhost:3000` | Set production domain |
| `STRIPE_SECRET_KEY` | Optional | Set if using Stripe |
| `STRIPE_WEBHOOK_SECRET` | Optional | Set if using Stripe |
| `CRON_SECRET` | Optional | Set for auto-billing |
| `RESEND_API_KEY` | Not yet | Set after Phase 3 |
| R2 keys | Not yet | Set after Phase 2 |
