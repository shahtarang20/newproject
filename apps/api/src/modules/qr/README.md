# qr

All routes: `authenticate`, `requireShop` (any shop user). Responses are the raw image (NOT the JSON envelope); errors use the normal envelope.
Query: `format=png|svg` (default png), `size=128..2048` (default 512, px), `download=1` (adds `Content-Disposition: attachment; filename=...`).
Response headers: `Content-Type: image/png | image/svg+xml`, `X-QR-Url` = the encoded public URL.

- `GET /qr/shop` → `${FRONTEND_URL}/shop/<shopSlug>`
- `GET /qr/catalogue/:id` → `${FRONTEND_URL}/shop/<shopSlug>/catalogue/<catalogueSlug>` (404 `CATALOGUE_NOT_FOUND` if not in this shop)
- `GET /qr/product/:id` → `${FRONTEND_URL}/shop/<shopSlug>/product/<productSlug>` (404 `PRODUCT_NOT_FOUND`)

Web note: image requests need the bearer token; fetch as blob (`responseType:'blob'`) and use `URL.createObjectURL`, or rely on the `access_token` cookie.
