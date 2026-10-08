# offers

Two collections: **Offers** (automatic discounts) and **Coupons** (codes). Dashboard routes need auth + shop; offers:write for writes and reads. Envelope as usual; lists have `meta`.

Service: `getActiveOffers(shopId): Promise<PublicOffer[]>`, `applyBestOffersAndCoupon(shopId, lines, couponCode?, {phone?})`, `validateCoupon(shopId, code, {subtotalMinor, phone?})` (throws 400 `COUPON_INVALID`), `claimCoupon`, `releaseCoupon`.
`PublicOffer`: `{ id, name, description?, discountType, discountValue, minOrderMinor?, endDate? }` (`discountValue`: percent for PERCENT, minor units for FLAT, 0 for BUY_X_GET_Y). Coupons are NOT listed publicly (no `couponCode`).

## Offers (`/api/offers`)
- `GET /offers?active=true|false&q=&page=&limit=` · `GET /offers/:id` · `DELETE /offers/:id` (204)
- `POST /offers` / `PATCH /offers/:id`:
```json
{ "name":"Festive 20%", "description":"", "badgeText":"20% OFF", "discountType":"PERCENT|FLAT|BUY_X_GET_Y",
  "value":20, "maxDiscountMinor":50000, "buyQty":2, "getQty":1, "scope":"ALL|PRODUCTS|CATEGORIES",
  "productIds":[], "categoryIds":[], "minOrderMinor":0, "startsAt":"ISO|null", "endsAt":"ISO|null", "isActive":true }
```
  `value`: percent (1-100) for PERCENT, minor units for FLAT. BUY_X_GET_Y needs buyQty & getQty (per line: for every buy+get units, `get` are free). PRODUCTS/CATEGORIES scope needs ids.
- `PATCH /offers/:id/toggle` -> offer with flipped `isActive`.

## Coupons (`/api/offers/coupons`)
- `GET /offers/coupons` · `POST /offers/coupons` · `PATCH /offers/coupons/:id` · `PATCH /offers/coupons/:id/toggle` · `DELETE /offers/coupons/:id`
```json
{ "code":"WELCOME10", "description":"", "discountType":"PERCENT|FLAT", "value":10, "maxDiscountMinor":null,
  "minOrderMinor":0, "usageLimit":100, "perCustomerLimit":1, "startsAt":null, "endsAt":null, "isActive":true }
```
  Response includes `usedCount`. Duplicate code -> 409 `CONFLICT`. `usedCount` is incremented when an order is placed and given back when it is cancelled/rejected.
