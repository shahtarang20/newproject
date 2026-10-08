# Vastra — Architecture Contract

Multi-tenant SaaS: digital catalogue + enquiry + order management for garment & saree shops.
**Every agent MUST follow this document.** If something is ambiguous, pick the simplest option consistent with this doc; do not invent new top-level conventions.

Rules for all contributors:
- Code only. No tests, no test files, no test deps. Do not run `npm install` (deps are pre-declared in each `package.json`; if you truly need a new one, add it to package.json and mention it in your final report).
- Never fake functionality. If something is out of scope, leave a clear `// TODO(feature-name):` and make the surface honest (no UI that pretends to work).
- Strict TypeScript. No `any` unless unavoidable (and then commented). No hard-coded tenant IDs, plan limits or secrets.
- Import enums/constants/permissions from `@vastra/shared` — never redefine them.
- Only edit files you own (see ownership in your brief). If you need something from another area, import the documented interface; do not rewrite their file.
- Keep files focused (< ~400 lines). Reusable, modular, no giant files.

## 1. Monorepo

```
apps/api        @vastra/api   Express + TS + Mongoose (CommonJS, tsx dev, tsup build)
apps/web        @vastra/web   React 18 + Vite + TS + Tailwind 3 + Radix (shadcn-style, hand-written)
packages/shared @vastra/shared enums, permissions, template ids, error codes (source-consumed TS)
docs/           this file
```
Path alias `@/*` → `src/*` in both apps. API is CommonJS: **no `.js` extensions in imports**.
Web uses Vite alias `@` → `src`.

## 2. Domain overview

- **Tenant = Shop.** Every tenant document has `shopId: ObjectId` (indexed, first element of compound indexes).
- Global user roles: `SUPER_ADMIN`, `SHOP_USER` (owner or staff; staff role lives in `ShopStaff`), `CUSTOMER` (optional account).
- Money = integer minor units (paise) everywhere in DB and API. Web formats with `Intl.NumberFormat('en-IN', {style:'currency', currency: shop.currency})`.
- Server computes all prices/totals/discounts. Never trust client prices, `shopId`, `userId`, or role.
- Soft delete products (`deletedAt`). Only `status=ACTIVE` and not deleted products are public.
- Usage counters live on `Shop.usage` (atomic `$inc`): `products, images, videos, customers, staff, catalogues, storageBytes, ordersThisPeriod, periodStart`. Limits live on `SubscriptionPlan.limits` (null = unlimited) with optional per-shop `Subscription.limitOverrides`. Enforcement: `limits.service` only.

### 2.1 Templates (7 premium storefront themes)
`TEMPLATE_IDS` in shared: `heritage-gold, minimal-noir, boutique-blush, urban-street, royal-silk, modern-linen, festive-bloom`.
- On shop registration the **server** assigns a random template: `Shop.theme.templateId = pickRandomTemplateId()`.
- Owner may later change it (settings/shop). Public shop payload includes `theme: { templateId, primaryColor?, buttonStyle, catalogueLayout }`.
- Web renders the storefront via a template registry (see §6.3).

## 3. Backend conventions (apps/api)

### 3.1 Layout
```
src/
  server.ts                  bootstrap: env → connect DB → app.listen, graceful shutdown
  app.ts                     createApp(): helmet, cors(credentials), compression, cookieParser, pino-http, json(1mb), rate limit, /api router, notFound, errorHandler
  config/        env.ts (zod-validated `env`), logger.ts (pino), constants.ts
  database/      connection.ts, plugins.ts, models/*.model.ts, seed/index.ts (+ seed data files)
  common/
    errors.ts            AppError + factory helpers
    response.ts          ok(), created(), noContent()
    asyncHandler.ts
    pagination.ts
    slug.ts
    audit.ts
    tenant.ts            tenantFilter(), withTenant()
    types.ts             express Request augmentation (req.auth, req.shop)
    middleware/          auth.ts, tenant.ts, validate.ts, rateLimit.ts, errorHandler.ts, upload.ts, security.ts
    utils/               money.ts, order-number.ts, date.ts, hash.ts
  providers/
    storage/             StorageProvider.ts, factory.ts, local.ts, cloudinary.ts, s3.ts (also R2 via S3_ENDPOINT)
    payments/            PaymentProvider.ts, factory.ts, razorpay.ts, stripe.ts, none.ts
    notifications/       NotificationChannel.ts, factory.ts, console-email.ts, resend-email.ts, whatsapp.ts (abstraction + Cloud API stub), inapp.ts
  modules/
    <name>/<name>.routes.ts       default export express Router
    <name>/<name>.controller.ts   thin HTTP layer
    <name>/<name>.service.ts      business logic
    <name>/<name>.schemas.ts      zod schemas (body/query/params)
    index.ts                      mounts every module router under /api
```
Modules: `auth, users, shops, products, categories, catalogues, customers, orders, cart, inventory, enquiries, offers, analytics, subscriptions, admin, staff, media, notifications, payments, storefront, bulk, qr, audit`.

### 3.2 Response envelope (exactly)
Success: `{ success: true, data, message, meta? }` — Error: `{ success: false, error: { code, message, details? } }`.
Never leak stack traces when `NODE_ENV=production`. Error `code` ∈ `ERROR_CODES` from shared.

### 3.3 Core helpers (signatures are fixed — the foundation implements, modules consume)
```ts
// common/errors.ts
class AppError extends Error { status: number; code: ErrorCode | string; details?: unknown;
  constructor(status: number, code: ErrorCode | string, message: string, details?: unknown) }
const Errors = { badRequest(code,msg,details?), unauthorized(msg?), forbidden(msg?), notFound(code,msg), conflict(code,msg), tooMany(msg?), internal() } // each returns AppError

// common/response.ts
ok(res, data, message='Success', meta?)      // 200
created(res, data, message='Created')        // 201
noContent(res)                               // 204

// common/asyncHandler.ts
asyncHandler(fn: (req,res,next)=>Promise<unknown>): RequestHandler

// common/pagination.ts
parsePagination(query, {defaultLimit=20,maxLimit=100,defaultSort='-createdAt'}) → { page, limit, skip, sort: Record<string,1|-1> }
buildMeta(page, limit, total) → PaginationMeta

// common/slug.ts
slugify(text): string
uniqueSlug(model, base, scope?: FilterQuery, field='slug'): Promise<string>   // appends -2, -3 …

// common/audit.ts
audit(req | {userId, shopId?, ip?}, { action, entity, entityId?, before?, after?, meta? }): Promise<void> // fire-and-forget safe, never throws

// common/tenant.ts
tenantFilter(req): { shopId: ObjectId }        // derived from req.shop / req.auth ONLY
```
### 3.4 Auth & tenant middleware (`common/middleware`)
`req.auth` (set by `authenticate`): `{ userId: string; role: GlobalRole; shopId?: string; staffRole?: StaffRole; permissions: Permission[] }`.
`req.shop` (set by `requireShop`): `{ id: string; slug: string; status: ShopStatus }` — loaded from DB by `req.auth.shopId`; suspended shop → 403 `SHOP_SUSPENDED`.
- `authenticate` — verifies access JWT from `Authorization: Bearer` OR `access_token` cookie. 401 `AUTH_REQUIRED`/`TOKEN_EXPIRED`.
- `optionalAuth` — same but never fails.
- `requireRole(...roles: GlobalRole[])`
- `requireShop` — SHOP_USER with a shop (SUPER_ADMIN may impersonate via `X-Shop-Id` header → still sets req.shop).
- `requirePermission(...perms: Permission[])` — all required; OWNER passes everything.
- `validate({ body?, query?, params? })` — zod; replaces `req.body/query/params` with parsed values; 400 `VALIDATION_ERROR` with `details` = flattened issues.
- `publicRateLimit`, `authRateLimit`, `orderRateLimit`, `enquiryRateLimit` — express-rate-limit presets; `suspicionGuard` hook is CAPTCHA-ready (`CAPTCHA_REQUIRED`) but only enforced when `req.suspicious` is set by heuristics (honeypot field `website`, burst per IP+phone).
- `uploadMiddleware` — multer memory storage with size/type validation (images: jpeg/png/webp/avif ≤ 10MB; video: mp4/webm/quicktime ≤ 100MB).

Auth tokens: access JWT 15m (payload `{sub, role, shopId?, staffRole?}`), refresh JWT stored hashed in `RefreshToken` (rotation + reuse detection), set as HTTP-only `refresh_token` cookie (SameSite=Lax, Secure in prod, path `/api/auth`). Access token returned in JSON body and also as `access_token` HTTP-only cookie. Web keeps access token in memory only.

### 3.5 Plan limits (`modules/subscriptions/limits.service.ts`)
```ts
getEffectiveLimits(shopId): Promise<{ limits: PlanLimits; features: PlanFeatures; plan; subscription }>
assertWithinLimit(shopId, key: LimitKey, increment=1): Promise<void>    // throws AppError 403 with LIMIT_ERROR_CODES[key]
assertFeature(shopId, feature: FeatureKey): Promise<void>               // throws 403 FEATURE_NOT_IN_PLAN
assertStorage(shopId, bytes): Promise<void>
incrementUsage(shopId, key | {key:n}, by=1): Promise<void>             // $inc on Shop.usage
decrementUsage(...)
getUsageSummary(shopId): Promise<Array<{key, used, limit, percent}>>
```
Error message pattern: `Your plan allows {limit} {label}. You have reached your {label} limit. Upgrade your plan to add more.`

### 3.6 Provider abstractions
```ts
interface StorageProvider { name; upload({buffer,key,contentType}): Promise<{url,key,size}>; delete(key): Promise<void>; publicUrl(key): string }
interface PaymentProvider { name; createOrder({amountMinor,currency,receipt,notes}): Promise<{providerOrderId, clientPayload}>; verifyPayment(payload): Promise<{ok:boolean, providerPaymentId?}>; refund(paymentId, amountMinor?): Promise<void>; verifyWebhook(rawBody, signature): boolean }
interface NotificationChannelProvider { channel: NotificationChannel; send({to, subject?, body, templateKey?, data?}): Promise<void> }
```
Factories read `env` and return singletons. Never import a concrete provider outside `providers/*/factory.ts`.

### 3.7 Indexing & performance
Compound indexes lead with `shopId`. Products: text index on `name, sku, tags, brand`; `{shopId,status,deletedAt,createdAt}`, `{shopId,slug}` unique, `{shopId,categoryId,status}`. Public list endpoints are paginated, use `.lean()` and projections; public product list is cached (in-memory LRU/TTL util in `common/utils/cache.ts`) keyed by shop+query for 30s and invalidated on product writes.

### 3.8 REST surface (all under `/api`)
Auth: `POST /auth/register` (shop owner + shop), `POST /auth/register-customer`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `POST /auth/change-password`.
Shop: `GET/PATCH /shop`, `GET /shop/usage`, `GET /shop/public/:slug`, `POST /shop/logo`, `POST /shop/cover`, `GET /shop/templates`.
Products: CRUD `/products`, `POST /products/:id/duplicate`, `PATCH /products/:id/status`, `/products/:id/variants` (CRUD), `/products/:id/media` (upload/reorder/primary/delete), `/products/bulk/*` (see bulk).
Categories, Catalogues (+ `/catalogues/:id/products`), Orders, Customers, Inventory (`GET /inventory`, `POST /inventory/adjust`, `GET /inventory/transactions`), Enquiries, Offers (+ coupons), Analytics (`/analytics/dashboard|products|sales|funnel`), Staff (`/staff` invite/list/update/remove), Notifications (`/notifications`, read/mark-all), Subscription (`/subscription`, `/subscription/plans`, `/subscription/change`), QR (`/qr/shop|catalogue/:id|product/:id` → PNG/SVG), Bulk (`/bulk/products/template|validate|import|export`, `/bulk/price|stock|status`).
**Public storefront** (no auth, tenant by slug): `/storefront/:slug` (shop+theme), `/storefront/:slug/products` (search/filter/sort/paginate), `/storefront/:slug/products/:productSlug`, `/storefront/:slug/categories`, `/storefront/:slug/catalogues/:catSlug`, `/storefront/:slug/facets` (filter facets), `/storefront/:slug/offers`, `POST /storefront/:slug/cart/price` (server cart pricing), `POST /storefront/:slug/orders` (guest checkout), `POST /storefront/:slug/orders/track` (orderNumber+phone), `POST /storefront/:slug/enquiries`, `POST /storefront/:slug/events` (analytics), `POST /storefront/:slug/payments/verify`, webhooks `POST /webhooks/razorpay|stripe`.
Admin (SUPER_ADMIN): `/admin/shops` (+status), `/admin/users`, `/admin/plans` CRUD, `/admin/subscriptions`, `/admin/analytics`, `/admin/storage`, `/admin/settings` (feature flags), `/admin/logs`.

## 4. Data model notes (foundation agent defines exact Mongoose models in `database/models`)
User, RefreshToken, Shop (profile, address, contact, socials, businessHours[], theme, seo, paymentSettings{codEnabled, onlineEnabled, payAtShopEnabled}, notificationSettings, currency, status, usage, subscriptionId, ownerId), ShopStaff, SubscriptionPlan, Subscription, Category (tree via parentId), Product (type GARMENT|SAREE, garmentAttrs, sareeAttrs, media refs, pricing summary, status, seo, counters), ProductVariant, Media, Catalogue (+ productIds[] embedded as ordered list), InventoryTransaction, Customer (per shop; phone unique per shop), CustomerAddress, Cart (server-side optional), Order (embedded `items[]` snapshot lines — name, variant, sku, image, unitPrice, qty, tax), Payment, Enquiry, Offer, Coupon, Notification, AnalyticsEvent (TTL 400d + daily rollup `AnalyticsDaily`), AuditLog, PlatformSetting (feature flags), Counter (atomic sequences, e.g. order numbers).
`OrderItem`/`CartItem`/`CatalogueProduct` are embedded subdocuments, not separate collections (scalability + atomicity); document this in the model files.
Order number: `{SHOP_PREFIX}-{YYYY}-{000123}` via atomic `Counter` per shop+year.

## 5. Stock & order rules (enforced in orders.service)
1. Re-validate variant active + stock inside a Mongo transaction (fallback to atomic conditional `$inc` with `stock >= qty` filter per line, rolling back already-decremented lines on failure).
2. Server calculates price from DB (variant price → offer/coupon → tax). Ignore client prices.
3. On create: decrement stock, write `InventoryTransaction(SALE)`, upsert Customer (by shop+phone), `incrementUsage(ordersThisPeriod)`, notify shop, emit analytics ORDER event.
4. Status transitions validated against `ORDER_STATUS_TRANSITIONS`; `CANCELLED`/`REJECTED` restore stock (`RETURN` txn) exactly once; every change appended to `order.timeline[]` and audit-logged.
5. COD → paymentStatus `COD`; online → `PENDING` until verified; pay-at-shop → `PENDING`.

## 6. Frontend conventions (apps/web)

### 6.1 Layout
```
src/
  main.tsx, App.tsx
  routes/        router.tsx (lazy routes for every path in §6.2), guards.tsx (RequireAuth, RequireRole, RequirePermission)
  layouts/       MarketingLayout, AuthLayout, DashboardLayout, SuperAdminLayout, StorefrontLayout
  api/           client.ts (axios + in-memory token + 401→refresh→retry queue), endpoints/*.ts (typed fns per module), queryKeys.ts
  stores/        auth.store.ts (zustand), cart.store.ts (persisted per shop slug), ui.store.ts
  hooks/         useDebounce, useAuth, usePermission, useShopSlug, useMediaQuery …
  types/         api.ts (DTOs mirroring API), index.ts
  utils/         cn.ts, format.ts (money/date), errors.ts (getErrorMessage), seo.ts
  components/
    ui/          button, input, textarea, label, select, checkbox, switch, dialog, dropdown-menu, tabs, tooltip, badge, card, skeleton, progress, separator, avatar, table, popover, sheet, accordion, toast(sonner), empty-state, spinner, pagination, form fields
    common/      PageHeader, StatCard, DataTable, ConfirmDialog, ImageUploader, QRCodeCard, StatusBadge, MoneyText, SearchInput, LimitBanner, ErrorState
  features/
    auth/ dashboard/ products/ categories/ inventory/ orders/ customers/ enquiries/ catalogues/ offers/ staff/ analytics/ settings/ subscription/ super-admin/ marketing/
    storefront/  (pages, components, hooks, templates/)
  assets/ styles/globals.css
```
- Tailwind with CSS-variable design tokens (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--radius`, …) for dashboard; light + dark ready. Dashboard visual identity: Linear/Vercel-clean, neutral zinc scale, one indigo/violet accent, Inter font, subtle borders, 12–16px radii, soft shadows.
- Server state: TanStack Query. Forms: React Hook Form + Zod resolver. Toasts: sonner.
- Every list page: loading skeleton, empty state, error state. Every mutation: pending state + friendly error toast via `getErrorMessage`.
- Route-level code splitting (`React.lazy`) for every page.

### 6.2 Routes (React Router v6)
Public: `/`, `/login`, `/register`, `/pricing`, `/about`, `/contact`.
Storefront: `/shop/:shopSlug`, `/shop/:shopSlug/products`, `/shop/:shopSlug/category/:categorySlug`, `/shop/:shopSlug/product/:productSlug`, `/shop/:shopSlug/catalogue/:catalogueSlug`, `/shop/:shopSlug/cart`, `/shop/:shopSlug/checkout`, `/shop/:shopSlug/order-success`, `/shop/:shopSlug/track-order`.
Dashboard (`SHOP_USER`): `/dashboard`, `/dashboard/products`, `/dashboard/products/new`, `/dashboard/products/:id`, `/dashboard/categories`, `/dashboard/inventory`, `/dashboard/orders`, `/dashboard/orders/:id`, `/dashboard/customers`, `/dashboard/customers/:id`, `/dashboard/catalogue`, `/dashboard/enquiries`, `/dashboard/offers`, `/dashboard/staff`, `/dashboard/analytics`, `/dashboard/settings`, `/dashboard/settings/shop`, `/dashboard/settings/catalogue`, `/dashboard/settings/notifications`, `/dashboard/subscription`, `/dashboard/bulk`.
Super admin: `/super-admin`, `/super-admin/shops`, `/super-admin/users`, `/super-admin/plans`, `/super-admin/subscriptions`, `/super-admin/analytics`, `/super-admin/storage`, `/super-admin/settings`, `/super-admin/logs`.

### 6.3 Template system (storefront)
`src/features/storefront/templates/`:
```
types.ts        TemplateDefinition
registry.ts     TEMPLATES: Record<TemplateId, () => Promise<{default: TemplateDefinition}>> (lazy) + getTemplate(id) w/ fallback to heritage-gold
useTemplate.tsx TemplateProvider + useTemplate() (current definition) 
<id>/index.tsx  exports default TemplateDefinition for that template
<id>/*.tsx      template components + <id>/tokens.ts
```
```ts
export interface TemplateTokens {
  /** CSS variables injected on the storefront root, e.g. { '--sf-bg':'#fff8f0', '--sf-fg':'#2b1810', '--sf-primary':'#7a1f2b', '--sf-accent':'#c9a24a', '--sf-muted':'#f3e8dc', '--sf-border':'#e6d5c3', '--sf-radius':'6px', '--sf-font-display':"'Cormorant Garamond', serif", '--sf-font-body':"'Inter', sans-serif" } */
  vars: Record<`--sf-${string}`, string>;
  fontsHref: string;          // Google Fonts css2 URL, loaded once via <link>
  darkHeader?: boolean;
}
export interface ShellProps { shop: PublicShop; cartCount: number; categories: PublicCategory[]; children: ReactNode; onSearch(q: string): void }
export interface HeroProps { shop: PublicShop; featured?: PublicProduct[]; catalogue?: PublicCatalogue }
export interface ProductCardProps { product: PublicProduct; shop: PublicShop; onQuickAdd?(p: PublicProduct): void; priority?: boolean }
export interface TemplateDefinition {
  id: TemplateId; name: string; tagline: string; previewColors: string[];
  tokens: TemplateTokens;
  Shell: ComponentType<ShellProps>;               // header, nav, search, cart button, footer, mobile bottom bar
  Hero: ComponentType<HeroProps>;                 // home hero / cover
  ProductCard: ComponentType<ProductCardProps>;
  SectionHeading: ComponentType<{ eyebrow?: string; title: string; subtitle?: string; align?: 'left'|'center' }>;
  CategoryTile: ComponentType<{ category: PublicCategory; shop: PublicShop }>;
  gridClassName: string;                          // Tailwind classes for product grid layout
  productPage: { galleryLayout: 'thumbs-left'|'thumbs-bottom'|'stacked'; stickyBuyBar: boolean };
}
```
Shared storefront pages (written once by the storefront agent) compose these slots + shared primitives (VariantPicker, PriceTag, Gallery, FilterBar, EnquiryDialog, WhatsAppButton, CartDrawer). Templates must be visually **very distinct** (layout structure, typography, imagery treatment, motion), mobile-first, accessible, premium. Template CSS uses `var(--sf-*)` only (plus Tailwind utilities and arbitrary values); shop `theme.primaryColor` overrides `--sf-primary` when set (and `buttonStyle` overrides radius of buttons).
Shop public payload (`PublicShop`) includes `theme.templateId`; the shell loads the template lazily via `getTemplate(theme.templateId)`.

### 6.4 Cart (guest-first)
Zustand persisted per `shopSlug`: lines `{ productId, variantId, qty, snapshot:{name,image,colour,size,unitPrice} }` for display only. Server re-prices at `POST /storefront/:slug/cart/price` and at order creation.

## 7. Done criteria for the whole product
The acceptance scenario in the product brief (register → plan → product → publish → public link → guest COD order → stock decrement → order lifecycle → analytics/inventory/customers/audit) must be implementable end-to-end by the code you write.
