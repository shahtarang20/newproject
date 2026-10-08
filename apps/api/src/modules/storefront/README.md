# storefront (public, no auth) — mounted at `/api/storefront`

Envelope: `{success,data,message,meta?}`. DTOs = `apps/web/src/types/storefront.ts` (exact). Money = minor units.
Tenant from `:slug`; unknown/pending/suspended shop => `404 SHOP_NOT_FOUND`. Only ACTIVE, non-deleted products are ever returned.
Rate limits: `publicRateLimit` (300/min/IP) on reads; `/events` 600/min; `/orders` orderRateLimit + antiSpam; `/enquiries` enquiryRateLimit + antiSpam; `/orders/track` 30/15min.
Honeypot field `website` (string, must be empty) accepted on orders/enquiries; flagged => `400 CAPTCHA_REQUIRED` (client may resend with `captchaToken`).

| Method & path | Response `data` |
|---|---|
| `GET /:slug` | `PublicShop` (cached 60s) |
| `GET /:slug/categories` | `PublicCategory[]` (only with >=1 active product, `productCount` includes children) |
| `GET /:slug/products` | `PublicProduct[]` + `meta` (`page,limit,total,totalPages,hasNext`) |
| `GET /:slug/products/:productSlug` | `PublicProduct` (increments viewCount async, skipped for bots) |
| `GET /:slug/products/:productSlug/related` | `PublicProduct[]` (max 8) |
| `GET /:slug/facets` | `StorefrontFacets` (cached 60s) |
| `GET /:slug/catalogues` | `PublicCatalogue[]` (published, non-empty) |
| `GET /:slug/catalogues/:catalogueSlug` | `PublicCatalogue` (`404 CATALOGUE_NOT_FOUND`) |
| `GET /:slug/offers` | `PublicOffer[]` (active, in date window) |
| `GET /:slug/sitemap-data` | `{products:[{slug,updatedAt}], catalogues:[{slug,updatedAt}]}` |
| `POST /:slug/cart/price` | `PricedCart` — body `CartPriceRequest` `{items:[{productId,variantId,quantity}], couponCode?}` |
| `POST /:slug/orders` (201) | `PlaceOrderResponse` — body `PlaceOrderRequest`; optional `Authorization: Bearer` of a CUSTOMER links the order |
| `POST /:slug/orders/track` | `TrackedOrder` — body `{orderNumber, phone}` |
| `POST /:slug/enquiries` (201) | `{id}` — body `CreateEnquiryRequest` (+ optional `email`) |
| `POST /:slug/events` (204, no body) | body `{type, productId?, catalogueId?, sessionId?, meta?}`, `type` in ANALYTICS_EVENT_TYPES; meta <= 2KB |
| `POST /:slug/payments/verify` | body `{orderNumber, payload:{...provider payload}}` -> result of `verifyAndMarkPaid` |

## `GET /:slug/products` query (`PublicProductsQuery`)
`q, category(slug, includes children), catalogue(slug), colour, size, fabric, brand, occasion` (repeat the param or comma-separate),
`gender (MEN|WOMEN|KIDS|UNISEX), minPrice, maxPrice (minor units), inStock, onOffer (true|false), sort (newest|price_asc|price_desc|popular|discount), page=1, limit=20 (<=48)`.
- `q`: text index first (whole words, relevance order); if no hits, case-insensitive substring match on name/sku/brand/tags/colour/size/fabric/category name.
- `catalogue` without `sort` keeps the catalogue's manual order. Default sort `newest`. List items carry max 4 media; the detail endpoint returns all.
- Price filters exclude "hidden price" products. Invalid category slug => empty list; invalid catalogue slug => 404.
- Cached 30s per shop+normalised query (invalidated by `invalidateShopCache(shopId)`).

## Privacy
No cost price/barcode. Exact stock only as `stockLeft` when `<= lowStockThreshold` (variant -> product -> shop setting). Hidden-price products: `price.hidden=true`, no amounts, `variants[].priceMinor = 0`.

## Backend exports
`getPublicShopBySlug(slug): Promise<PublicShop>`, `toPublicProduct(product, variants, ctx)`.
