# Deployment

Reference topology: **web on Vercel**, **API on Render**, **database on MongoDB Atlas**, media on Cloudinary or S3/R2.
Nothing here is automated by the repo (no `vercel.json` / `render.yaml` is committed); follow the steps below.

## 1. MongoDB Atlas
1. Create a cluster (M0 is fine for demos; use M10+ for production, which also gives you a replica set).
2. Database Access: create a dedicated user with `readWrite` on the `vastra` database only.
3. Network Access: allow Render's outbound IPs (or `0.0.0.0/0` for a quick start, then tighten).
4. Copy the SRV connection string into `MONGODB_URI` (e.g. `mongodb+srv://USER:PASS@cluster.mongodb.net/vastra?retryWrites=true&w=majority`).
5. Atlas clusters are replica sets, so order creation uses real multi-document transactions (the API falls back to compensating writes on standalone Mongo).
6. Indexes (unique slugs, TTLs) are created at boot (`autoIndex: true`); the first boot against an empty database may take a few seconds.

## 2. API on Render (Web Service)
- Root directory: repository root. Runtime: Node 20+.
- Build command: `npm ci && npm run build -w @vastra/api`
- Start command: `npm run start -w @vastra/api` (runs `node dist/server.js`)
- Health check path: `/api/health`
- Environment variables (set in the Render dashboard, never in git):

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas SRV string |
| `FRONTEND_URL` | Comma-separated allowed web origins, e.g. `https://app.example.com` (used for CORS and links) |
| `BACKEND_URL` | Public API URL, e.g. `https://api.example.com` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | **Required in production**, at least 32 random chars each; the API refuses to boot otherwise |
| `COOKIE_DOMAIN` | e.g. `.example.com` when web and API share a parent domain |
| `STORAGE_PROVIDER` | `cloudinary`, `s3` or `r2`. **Do not use `local` on Render**: its disk is ephemeral |
| `CLOUDINARY_*` / `S3_*` | Credentials for the chosen provider |
| `PAYMENT_PROVIDER` + keys | `razorpay` (`RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`) or `stripe` (`STRIPE_SECRET_KEY/WEBHOOK_SECRET`) |
| `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | `resend` for real email; `console` just logs |
| `WHATSAPP_PROVIDER`, `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID` | Optional Cloud API stub |

Payment webhooks: point Razorpay/Stripe at `POST {BACKEND_URL}/api/webhooks/razorpay` and `/api/webhooks/stripe` and set the matching webhook secrets.

## 3. Web on Vercel
- Framework preset: Vite. Root directory: `apps/web` (enable "include files outside root" so `@vastra/shared` resolves) or build from the repo root with
  build command `npm run build -w @vastra/web` and output directory `apps/web/dist`.
- Env: `VITE_API_URL` = public API base including `/api` (e.g. `https://api.example.com/api`). If unset the app calls same-origin `/api`.
- Add an SPA fallback rewrite so deep links such as `/shop/:slug/product/:slug` work: rewrite `/(.*)` to `/index.html`.

### Cookies and cross-site hosting (important)
The refresh token is an HTTP-only cookie with `SameSite=Lax`, `Secure` in production, path `/api/auth`. Browsers do not send a Lax cookie on cross-site XHR, so
`*.vercel.app` talking to `*.onrender.com` will not stay logged in. Pick one:
1. **Same site (recommended):** serve web at `app.example.com` and API at `api.example.com`, and set `COOKIE_DOMAIN=.example.com`.
2. **Proxy:** rewrite `/api/*` on Vercel to the Render service so the browser only talks to one origin, and leave `VITE_API_URL` unset.

## 4. Seeding a hosted database
`npm run seed` refuses to run with `NODE_ENV=production` unless `--force` is passed. Only seed a non-production or demo database:
`MONGODB_URI=... SEED_SHOP_OWNER_PASSWORD=... npm run seed -w @vastra/api -- --force`. Generated passwords are printed once.

## 5. Post-deploy checklist
- `GET /api/health` returns 200 and Render shows the service live.
- Register a shop owner, add a product with an image (verifies storage provider), open `/shop/<slug>` in a private window.
- Place a guest COD order and confirm stock decrements and the notification appears.
- Rotate any secret that was ever pasted into a chat or committed.
- Review the security notes and known TODOs in the root `README.md`.
