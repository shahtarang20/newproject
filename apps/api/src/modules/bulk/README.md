# bulk

Auth: `authenticate`, `requireShop`, permission `products:write` for every route. Template/validate/import also require plan feature `bulkImport` (403 `FEATURE_NOT_IN_PLAN`). Money in CSV = major units (e.g. `1299.50`); in JSON bodies = minor units.

CSV columns: `product_name,sku,category,colour,size,price,mrp,stock,description,gender,fabric,brand,type,status`.
Required: `product_name`, `price`. Defaults: `mrp`=price, `stock`=0, `type`=GARMENT, `status`=DRAFT. Rows sharing a `product_name` become ONE product with one variant per row (colour/size). `sku` is the variant SKU (unique per shop). Enums (case-insensitive): gender GENDERS, fabric FABRICS, type GARMENT|SAREE, status DRAFT|ACTIVE|OUT_OF_STOCK|ARCHIVED. Max 5000 rows, 5MB.

- `GET /bulk/products/template` → CSV download (headers + 2 example rows).
- `POST /bulk/products/validate` multipart: `file` (.csv) + optional text fields `createMissingCategories=true|false`, `duplicateSku=error|skip|update` (default error). →
```json
{ "totalRows":2,"validRows":1,"invalidRows":1,
  "rows":[{"row":2,"valid":true,"errors":[],"warnings":[],"action":"create|update|skip|invalid","data":{"productName":"..","sku":"..","category":"..","colour":"..","size":"..","priceMinor":0,"mrpMinor":0,"stock":0,"description":"..","gender":"WOMEN","fabric":"SILK","brand":"..","type":"SAREE","status":"ACTIVE"}}],
  "summary":{"productsToCreate":1,"productsToUpdate":0,"variantsToCreate":2,"variantsToUpdate":0,"rowsToSkip":0,"categoriesToCreate":[],
    "productLimit":{"limit":50,"used":10,"newProducts":1,"headroom":40,"exceeds":false},"canImport":true} }
```
`row` = CSV line number (header is line 1). Existing live product with the same name (slug) receives the new variants.
- `POST /bulk/products/import` same multipart fields plus `abortOnErrors=true|false` (true = write nothing if any row invalid). Re-validates server-side; invalid rows are skipped and reported. Whole batch of new products must fit the plan (403 `PRODUCT_LIMIT_REACHED`, nothing written). Opening stock is recorded as `PURCHASE` inventory transactions. →
```json
{ "totalRows":10,"created":{"products":3,"variants":8,"categories":1,"openingStockTransactions":8},
  "updated":{"products":1,"variants":1},"skipped":0,"errors":[{"row":5,"errors":["price must be a number ..."]}] }
```
- `GET /bulk/products/export` → streamed CSV of all products x variants (same columns, re-importable).
- `POST /bulk/price` `{ productIds?: string[] (max 1000) | filter?: {categoryId?,status?,type?}, mode:"SET|INCREASE_PERCENT|DECREASE_PERCENT|INCREASE_FLAT", value:number, target?:"SELLING|MRP|BOTH" (default SELLING) }`. SET/INCREASE_FLAT value = integer minor units; percent modes = percent. Exactly one of productIds/filter. → `{ productsMatched, variantsUpdated }`
- `POST /bulk/stock` `{ items:[{ variantId | sku, quantity:int, mode:"SET|ADD", reason? }] }` (max 1000; SET qty >= 0; ADD may be negative). Applied per item through the inventory service (ADJUSTMENT transactions); partial success is reported →
`{ total, succeeded, failed, results:[{index,ok,variantId,sku,before,after,delta,error?}] }`
- `POST /bulk/status` `{ productIds:[..], status }` → `{ requested, matched, updated }` (ACTIVE products with zero stock flip to OUT_OF_STOCK via product recompute).
