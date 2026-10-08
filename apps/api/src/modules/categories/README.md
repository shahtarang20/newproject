# Categories API

Base `/api/categories`. Auth required (Bearer). Reads need `products:read`, writes need `categories:write`. Envelope: `{ success, data, message, meta? }`. Money n/a.

## Category object
```json
{ "id": "…", "shopId": "…", "name": "Silk Sarees", "slug": "silk-sarees", "parentId": null,
  "description": "…", "imageUrl": "https://…", "sortOrder": 0, "isActive": true,
  "productCount": 12, "childCount": 2, "createdAt": "…", "updatedAt": "…" }
```
`productCount` counts non-deleted products directly in that category. With `?tree=true` each node also has `children: Category[]`.

## Endpoints
- `GET /` — query: `tree=true|false`, `parentId=<id>|root`, `isActive`, `q` (name search). Returns `Category[]` ordered by `sortOrder, name` (flat, or nested roots when `tree=true`).
- `GET /:id` — `Category`.
- `POST /` — body `{ name (req), slug?, parentId?: id|null, description?, imageUrl?, sortOrder?, isActive? }` → 201 `Category`. Slug auto-generated and unique per shop (`-2`, `-3` …). Parent must exist.
- `PATCH /:id` — any subset of the create fields (`description`/`imageUrl`/`parentId` accept `null` to clear). Moving under itself/descendant → 400 `VALIDATION_ERROR`. → `Category`.
- `PATCH /reorder` — body `{ items: [{ id, sortOrder }] }` → 204.
- `POST /:id/image` — multipart, field `file` (jpeg/png/webp/avif ≤10MB) → `Category` with new `imageUrl` (stored as WebP, counts toward storage only).
- `DELETE /:id?reassignTo=<categoryId>|none` — 204. If the category has products or sub-categories and no `reassignTo` → 409 `CONFLICT`. With `reassignTo`, products and child categories move to that category (`none` = products uncategorised, children become roots). Target cannot be the category or its descendants.

Errors: 404 `CATEGORY_NOT_FOUND`, 400 `VALIDATION_ERROR`, 409 `CONFLICT`.
