# Product Media API

Base `/api/products/:productId/media`. Auth required. Reads `products:read`, writes `products:write`. Envelope `{ success, data, message }`.

## Media object
```json
{ "id": "…", "productId": "…", "kind": "IMAGE|VIDEO", "url": "full (≤2000px WebP | original video)",
  "thumbUrl": "480px WebP (images)", "tinyUrl": "160px WebP (images)", "mimeType": "image/webp",
  "sizeBytes": 123456, "width": 1600, "height": 2000, "durationSec": null, "altText": null,
  "variantId": null, "isPrimary": true, "sortOrder": 0, "createdAt": "…" }
```
`sizeBytes` is the total of all stored renditions. Storage keys are server-internal (`key`, `thumbKey`, `tinyKey` also present; do not use).

## Endpoints
- `GET /` → `Media[]` ordered by `sortOrder`.
- `POST /` — `multipart/form-data`, field **`files`** (1–10 files). Images: jpeg/png/webp/avif ≤10MB (auto-rotated, resized, WebP + thumbs). Videos: mp4/webm/quicktime ≤100MB, stored as-is (no poster/thumbnail yet; `thumbUrl` absent). Optional text fields: `durationSec` (repeat per video, in upload order), `altText`. → 201 `Media[]`.
  Errors: 400 `UPLOAD_INVALID_TYPE`, 413 `UPLOAD_TOO_LARGE`, 403 `IMAGE_LIMIT_REACHED` | `VIDEO_LIMIT_REACHED` | `STORAGE_LIMIT_REACHED` (nothing is uploaded when a limit fails), 404 `PRODUCT_NOT_FOUND`. The first image becomes primary automatically.
- `PATCH /reorder` — `{ "orderedIds": ["mediaId", …] }` (unlisted items keep relative order after the listed ones) → `Media[]`.
- `PATCH /:mediaId/primary` — images only → `Media[]`.
- `PATCH /:mediaId` — `{ altText?: string|null, variantId?: id|null }` (links an image to a variant; also sets that variant's `imageMediaId`/`imageUrl`) → `Media`.
- `DELETE /:mediaId` → 204. Deletes storage objects, releases usage; next image is promoted to primary.

`Product.media[]`, `primaryImageUrl`, `primaryThumbUrl` are kept in sync after every change.

## Server-side exports
`uploadShopAsset(shopId, file, folder) → { url, key, sizeBytes, width, height }` (single WebP ≤1600px at `shops/<shopId>/<folder>/<id>.webp`, storage quota only), `deleteShopAsset(shopId, key, sizeBytes)`, `syncProductMedia(productId, shopId)`.
