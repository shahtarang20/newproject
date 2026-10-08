# Products API

Base `/api/products`. Auth required (Bearer). Reads `products:read`; create/update/status/variants/duplicate `products:write`; delete `products:delete`; changing a variant's `stock` additionally needs `inventory:write`. Envelope `{ success, data, message, meta? }`. Money = integer paise.

## Product object (detail)
```json
{ "id":"…", "type":"SAREE|GARMENT", "name":"…", "slug":"…", "sku":"SIL-7K2M9Q", "brand":null, "description":null, "shortDescription":null,
  "categoryId":"…|null", "category": { "id":"…","name":"…","slug":"…","parentId":null } , "tags":["silk"], "gender":"WOMEN", "occasions":["WEDDING"], "fabric":"SILK", "season":null,
  "sareeAttrs": { "sareeType":"BANARASI","fabric":"SILK","workTypes":["ZARI"],"lengthMeters":5.5,"blouseIncluded":true,"blouseDescription":"","border":"","pallu":"","weave":"","careInstructions":"" },
  "garmentAttrs": { "fit":"","pattern":"","sleeveType":"","neckType":"","fabricComposition":"","washCare":"" },
  "pricing": { "minSellingMinor":150000,"maxSellingMinor":180000,"mrpMinor":200000,"discountPercent":25,"taxPercent":5,"hidePrice":false },
  "colours":["Red"], "sizes":["Free"], "stockTotal":12, "lowStockThreshold":null,
  "status":"DRAFT|ACTIVE|OUT_OF_STOCK|ARCHIVED", "isFeatured":false, "primaryImageUrl":"…", "primaryThumbUrl":"…",
  "seo": { "title":"", "description":"" }, "viewCount":0, "soldCount":0, "shareCount":0, "createdAt":"…", "updatedAt":"…",
  "media": [ /* Media objects, see media/README.md */ ],
  "variants": [ /* Variant objects */ ] }
```
`pricing.min/max/mrp/discountPercent`, `colours`, `sizes`, `stockTotal` are server-derived from active variants (never send them).

## Variant object
```json
{ "id":"…", "productId":"…", "sku":"SIL-7K2M9Q-RED-FREE", "colour": { "name":"Red", "hex":"#AA0000" }, "size":"Free",
  "sellingPriceMinor":150000, "mrpMinor":200000, "costPriceMinor":100000, "stock":12, "lowStockThreshold":null,
  "barcode":null, "imageUrl":"…", "imageMediaId":"…|null", "isActive":true }
```

## Endpoints
- `GET /` — query: `page,limit(≤100),q,status,type,category (incl. sub-categories),lowStock,outOfStock,isFeatured,sort`. `sort` ∈ `createdAt|updatedAt|name|price|stockTotal|soldCount|viewCount`, prefix `-` for desc (default `-createdAt`). `q` matches name/sku/brand/tags (case-insensitive, partial). `lowStock` = 0 < stockTotal ≤ product `lowStockThreshold` (default 5). Returns `Product[]` (lean: no description/attrs/seo/media array) + `meta { page,limit,total,totalPages,hasNext }`.
- `POST /` — wizard payload (only `type` and `name` required):
```json
{ "type":"SAREE","name":"Banarasi Silk","slug?":"…","sku?":"auto if missing","brand?":"","description?":"","shortDescription?":"",
  "categoryId?":"id","subcategoryId?":"id (must be a child of categoryId; stored as the product's category)","tags?":["silk"],"gender?":"WOMEN",
  "occasions?":["WEDDING"],"fabric?":"SILK","season?":"ALL_SEASON","sareeAttrs?":{…},"garmentAttrs?":{…},
  "pricing?":{"taxPercent":5,"hidePrice":false},"seo?":{"title":"","description":""},"isFeatured?":false,"lowStockThreshold?":5,"status?":"DRAFT",
  "variants?":[{ "colour":"Red" | {"name":"Red","hex":"#A00"}, "size":"Free","sku?":"","sellingPriceMinor":150000,"mrpMinor":200000,"costPriceMinor?":0,"stock?":10,"lowStockThreshold?":2,"barcode?":"" }] }
```
  → 201 detail Product. Always created as DRAFT (images are uploaded afterwards, then publish via `/status`). Variants created together; any failure rolls the product back. Stock > 0 writes a `PURCHASE` "Opening stock" transaction. 403 `PRODUCT_LIMIT_REACHED`; 409 `CONFLICT` for duplicate SKU.
- `GET /:id` → detail Product.
- `PATCH /:id` — any subset of create fields except `variants`/`status`. Nested objects merge per field; `""` or `null` clears optional values (`categoryId: null` removes category). Autosave friendly → detail Product.
- `DELETE /:id` → 204. Soft delete (ARCHIVED, slug/sku renamed, variants deactivated, media files removed, usage released).
- `POST /:id/duplicate` → 201 detail Product plus `mediaCopy: { copied, skipped, reason? }`. New DRAFT "… (Copy)" with new slug/SKU, variants copied with stock 0 and new SKUs, media physically copied (never shared; skipped if plan limits would be exceeded).
- `PATCH /:id/status` — `{ "status":"DRAFT|ACTIVE|OUT_OF_STOCK|ARCHIVED" }` → detail Product. ACTIVE needs ≥1 active variant and ≥1 image, else 400 `VALIDATION_ERROR` (`message` says what is missing, `details.missing = {variants, images}`). ACTIVE with zero stock immediately becomes OUT_OF_STOCK; stock arriving flips OUT_OF_STOCK → ACTIVE automatically (DRAFT/ARCHIVED untouched).

### Variants
- `GET /:id/variants` → `Variant[]`.
- `POST /:id/variants` — `{ colour|colourName+colourHex, size?, sku?, sellingPriceMinor (alias priceMinor, required), mrpMinor?, costPriceMinor?, stock?, lowStockThreshold?, barcode?, imageMediaId?, isActive? }` → 201 `Variant`. SKU auto-generated if missing (unique per shop). Same colour+size twice → 409 `CONFLICT`.
- `PATCH /:id/variants/:variantId` — any subset plus `stockReason?`. A changed `stock` is applied as an atomic delta and recorded as an `ADJUSTMENT` inventory transaction (never silently overwritten). `barcode`, `imageMediaId`, `lowStockThreshold` accept `null` to clear. Price changes are audit-logged. → `Variant`.
- `DELETE /:id/variants/:variantId` → `{ deleted, deactivated }` (variants with sales history are deactivated instead of removed).

After every variant write the product summary and OUT_OF_STOCK/ACTIVE status are recomputed.

## Server-side exports (`products.service`)
`recomputeProductSummary(productId, shopId)`; media: `media.service` → `uploadShopAsset`, `deleteShopAsset`, `syncProductMedia`.
