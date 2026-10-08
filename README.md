# Vastra

Multi-tenant SaaS for garment and saree shops: a digital catalogue, enquiry and order management in one place. Each shop (tenant) gets a public
storefront at `/shop/<slug>` in one of 7 premium templates, and a dashboard for products, inventory, orders, customers, enquiries, offers, staff and analytics.

## Stack
- `apps/api` Express + TypeScript + Mongoose (CommonJS; `tsx` for dev, `tsup` for build)
- `apps/web` React 18 + Vite + TypeScript + Tailwind + Radix (TanStack Query, React Hook Form, Zustand)
- `packages/shared` enums, permissions, template ids and error codes shared by both apps
- `docs/` architecture contract (`ARCHITECTURE.md`), data model (`DATA_MODEL.md`), deployment (`DEPLOYMENT.md`)

## Quickstart
Prerequisites: Node 20+, a MongoDB (local, or an Atlas URI).
```bash
npm install
cp .env.example .env        # edit MONGODB_URI etc.; in dev, JWT secrets fall back to dev-only values
npm run seed                # optional demo data (see Seeding)
npm run dev:api             # http://localhost:4000
npm run dev:web             # http://localhost:5173 (proxies /api to the API)
```

## Scripts (repo root)
| Script | What it does |
|---|---|
| `npm run dev:api` / `dev:web` | Dev servers (API with `tsx watch`, web with Vite) |
| `npm run build` | Builds API (`tsup`) then web (`tsc` + `vite build`) |
| `npm run typecheck` | Type-checks shared, API and web |
| `npm run seed` | Seeds demo data (add `-- --reset` / `-- --force`, see below) |

## Environment
All variables are documented in `.env.example`. Key ones: `MONGODB_URI`, `FRONTEND_URL` (comma-separated CORS origins), `BACKEND_URL`,
`JWT_SECRET` / `JWT_REFRESH_SECRET` (required, 32+ chars, in production), `STORAGE_PROVIDER` (`local|cloudinary|s3|r2`),
`PAYMENT_PROVIDER` (`razorpay|stripe|none`), `EMAIL_PROVIDER` (`console|resend`), `WHATSAPP_PROVIDER` (`none|meta`).
Web: `VITE_API_URL` (defaults to same-origin `/api`). Seed-only: `SEED_*_EMAIL`, `SEED_*_PASSWORD` and `SEED_IMAGE_BASE` (see below).

## Architecture summary
- Tenant = Shop; every tenant document carries an indexed `shopId` and every query is scoped from `req.shop`/`req.auth`, never from client input.
- Money is integer paise. The server prices carts and orders; client prices are ignored. Prices are tax-inclusive.
- Roles: `SUPER_ADMIN`, `SHOP_USER` (owner or staff via `ShopStaff` with `OWNER|MANAGER|SALES|INVENTORY|ORDER_MANAGER`) and `CUSTOMER`. Permissions come from `@vastra/shared`.
- Plan limits live in `SubscriptionPlan.limits` (null = unlimited) with per-shop overrides, enforced only by `limits.service`; usage counters live on `Shop.usage`.
- Orders keep embedded item snapshots, a timeline and a Counter-based number (`SF-2026-000123`); stock changes write `InventoryTransaction` rows.
- Providers (storage, payments, notifications) sit behind interfaces and are chosen by env. Public product lists are cached for 30 s.
- Auth: 15 min access JWT plus rotating refresh token (HTTP-only cookie, reuse detection).

## Seeding
`npm run seed` creates a Super Admin, a demo customer, the plans (FREE/STARTER/PRO/BUSINESS) and three demo shops on the PRO plan, each with categories, 22-23 products
(variants by colour and size, MRP/discounts, low and out-of-stock items, 2 drafts), 2-3 published catalogues, 2 offers and the `WELCOME10` coupon, 18-22 customers with addresses,
28-36 orders over the last 60 days (all statuses, payment states, inventory SALE/RETURN ledger, customer aggregates), enquiries, 30 days of analytics rollups and events, notifications and audit logs.

| Shop | URL | Owner | Template |
|---|---|---|---|
| Shree Fashion (mixed clothing) | `/shop/shree-fashion` | `SEED_SHOP_OWNER_EMAIL` (default `owner@example.com`) | `heritage-gold` |
| Raj Sarees (saree shop) | `/shop/raj-sarees` | `owner2@example.com` | `royal-silk` |
| Urban Garments (men's wear) | `/shop/urban-garments` | `owner3@example.com` | `urban-street` |

- Credentials come only from env (`SEED_SUPER_ADMIN_*`, `SEED_SHOP_OWNER_*`, `SEED_CUSTOMER_*`). An empty password is replaced by a random one that is printed once at the end of the run. All three owners share the owner password.
- Idempotent: users and shops are upserted on email/slug; each run regenerates the tenant data of the three seeded shops only. Data is deterministic (seeded PRNG), relative to "now".
- `npm run seed -- --reset` first drops the seeded shops, their staff/subscriptions/data and owner accounts. `NODE_ENV=production` is refused unless `--force` is passed.
- Images are generated garment illustrations (shirts, kurtas, sarees, lehengas… coloured per variant), written to `apps/api/uploads/seed/<shop>/` by the seed and served at `/uploads/seed/...`. They are stored as Media with `provider: 'external'`, so deleting a seeded product never touches storage. Set `SEED_IMAGE_BASE` (e.g. `https://picsum.photos/seed`) to use remote placeholder photos instead.
- Seeded orders include some ONLINE-paid history; online checkout itself stays disabled until a payment provider is configured. Raw analytics events are a sample; rollups are the source for dashboards.

## The 7 storefront templates
`heritage-gold` (maroon and gold, serif), `minimal-noir` (monochrome editorial), `boutique-blush` (soft rose, airy), `urban-street` (bold dark, neon accent),
`royal-silk` (royal blue/emerald with gold foil), `modern-linen` (warm neutrals), `festive-bloom` (marigold and magenta, playful).
New shops get a random template; owners can change it in settings. Templates live in `apps/web/src/features/storefront/templates/`.

## Deployment
Vercel (web) + Render (API) + MongoDB Atlas; see `docs/DEPLOYMENT.md`, including the cookie/same-site caveat for cross-domain hosting and why `STORAGE_PROVIDER=local` is unsuitable on Render.

## Security notes
- Helmet, CORS limited to `FRONTEND_URL`, rate limits on public/auth/order/enquiry routes, honeypot field `website` on public forms, zod validation on every input.
- Passwords hashed with bcrypt (12 rounds); refresh tokens stored hashed with rotation and reuse detection; secrets are required in production and never defaulted there.
- Tenant isolation is derived server-side; client-supplied prices, `shopId` and roles are ignored. Stack traces are hidden in production.
- Payment webhooks verify signatures; uploads are type and size checked. Do not commit `.env`; seed passwords are never hardcoded.
- CAPTCHA is only a hook today (see `TODO(captcha)`).

## Known TODOs
Collected with `grep -rn "TODO(" apps packages`:
- `TODO(observability)` forward web ErrorBoundary errors to an error-reporting service (`apps/web/src/components/common/ErrorBoundary.tsx`)
- `TODO(contact-endpoint)` contact page uses a mailto hand-off instead of a backend endpoint (`ContactPage.tsx`)
- `TODO(gst-invoice)` packing slip is not a GST tax invoice (`PackingSlip.tsx`)
- `TODO(video-thumbnail)` videos are stored as-is, no poster frame or transcoding (`media.service.ts`)
- `TODO(whatsapp-templates)` use approved template messages for business-initiated WhatsApp sends (`providers/notifications/whatsapp.ts`)
- `TODO(password-reset)` forgot/reset password endpoints return 501 (`auth.routes.ts`, `auth.service.ts`)
- `TODO(billing-webhooks)` no recurring subscription billing, renewals, dunning or EXPIRED enforcement (`subscriptions.service.ts`)
- `TODO(notifications)` no dedicated ENQUIRY_RESPONSE notification type (`enquiries.service.ts`)
- `TODO(category-image-cleanup)` replaced category images are not deleted from storage (`categories.controller.ts`)
- `TODO(offer-coupon)` public coupon codes are intentionally not exposed by the storefront (`storefront.mapper.ts`)
- `TODO(captcha)` plug in hCaptcha/Turnstile in the suspicion guard (`common/middleware/security.ts`)
