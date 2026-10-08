# catalogues

Auth: `authenticate`, `requireShop`. Reads: any shop user. Writes: permission `catalogues:write`. Envelope `{success,data,message,meta?}`. Public storefront shows only `isPublished` catalogues.

Catalogue DTO:
```json
{ "id":"..","name":"Diwali Edit","slug":"diwali-edit","description":null,"coverUrl":null,
  "isPublic":false,"isActive":true,"isPublished":false,"sortOrder":0,
  "productIds":["..",".."],"productCount":2,"viewCount":0,"createdAt":"..","updatedAt":".." }
```
`isPublished = isPublic && isActive`. `productIds` is in display order.

- `GET /catalogues?page&limit&search&published=true|false&sort=sortOrder|name|-name|createdAt|-createdAt|-viewCount` → `data: DTO[]` + `meta`.
- `GET /catalogues/:id` → DTO plus hydrated `products:[{id,name,slug,sku,status,imageUrl,minPriceMinor,maxPriceMinor,mrpMinor,hidePrice,stockTotal}]` in order (deleted products omitted).
- `POST /catalogues` body `{ name, slug?, description?, coverUrl? (https URL of an existing asset), productIds?: string[], isPublished?: boolean, sortOrder? }` → 201 DTO. Checks plan limit (403 `CATALOGUE_LIMIT_REACHED`), slug unique per shop (409 `SLUG_TAKEN`; auto-suffixed when omitted), all productIds must belong to the shop (400 `VALIDATION_ERROR`, `details.invalidProductIds`).
- `PATCH|PUT /catalogues/:id` body: any subset of the create fields (`productIds` = full ordered replace) → DTO.
- `DELETE /catalogues/:id` → 204.
- `POST /catalogues/:id/cover` multipart field `file` (image) → DTO with new `coverUrl`.
- `PUT /catalogues/:id/products` `{ productIds: [..ordered..] }` full replace → DTO.
- `POST /catalogues/:id/products` `{ productIds }` append (skips duplicates) → DTO. `DELETE /catalogues/:id/products` `{ productIds }` remove → DTO. (max 500 products per catalogue)
- `POST /catalogues/:id/publish` / `POST /catalogues/:id/unpublish` → DTO.
- `GET /catalogues/:id/share` → `{ url, isPublished, whatsappText, whatsappUrl }` where `url = ${FRONTEND_URL}/shop/<shopSlug>/catalogue/<slug>`.

Not supported (model has no fields for them): categories[], startDate/endDate, layout override.
