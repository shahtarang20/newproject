# orders

All money = integer minor units. Envelope: `{ success, data, message, meta? }`. Dashboard routes need `Authorization: Bearer`, a shop, and the listed permission.

## Service API (used by storefront)
- `placeGuestOrder(shopId, input: PlaceOrderInput, { ip?, customerUserId? }): Promise<PlaceOrderResponse>`
- `trackOrder(shopId, orderNumber, phone): Promise<TrackedOrder>` (same 404 `ORDER_NOT_FOUND` for wrong number/phone)
- zod: `placeOrderSchema`, `trackOrderSchema` (orders.schemas.ts). Honeypot `website` must be empty, else 400.

Place-order request (`POST /storefront/:slug/orders`):
```json
{ "items":[{"productId":"..","variantId":"..","quantity":1}], "couponCode":"WELCOME10",
  "customer":{"name":"Asha","phone":"+919876543210","email":"a@x.com"},
  "deliveryType":"DELIVERY", "address":{"line1":"..","city":"..","state":"..","pincode":"..","country":"IN"},
  "paymentMethod":"COD|ONLINE|PAY_AT_SHOP", "notes":"", "website":"" }
```
Response: `{ orderNumber, orderId, totalMinor, paymentStatus, status:"PENDING", payment?: { provider, providerOrderId, clientPayload } }` (`payment` only for ONLINE).
Errors: `OUT_OF_STOCK`/`INSUFFICIENT_STOCK` (409), `INVALID_VARIANT`, `COUPON_INVALID`, `PAYMENT_METHOD_DISABLED`, `ORDER_LIMIT_REACHED`/`CUSTOMER_LIMIT_REACHED` (403), `CONFLICT` (price changed), `VALIDATION_ERROR`.
Payment status: COD -> `COD`; ONLINE / PAY_AT_SHOP -> `PENDING`.
Tracking response: web `TrackedOrder`.

## Dashboard (`/api/orders`)
| Route | Permission | Notes |
|---|---|---|
| `GET /orders?status=PENDING,CONFIRMED&paymentStatus=PAID&paymentMethod=COD&search=&from=&to=&sort=-createdAt&page=1&limit=20` | orders:read | `data`: order[] (no timeline), `meta` pagination. `status` is a comma list (tabs). |
| `GET /orders/stats` | orders:read | `{ total, byStatus:{PENDING:n,...all statuses}, today:{orders, revenueMinor} }` (today excludes cancelled/rejected) |
| `POST /orders` | orders:create | body: `{ items, couponCode?, customer:{name,phone,email?}, deliveryType:"PICKUP"(default)|"DELIVERY", address? (required for DELIVERY), paymentMethod:"PAY_AT_SHOP"(default)|"COD", markPaid?:boolean, notes? }` -> 201 `{ orderNumber, orderId, totalMinor, paymentStatus, status }`. Same engine, `source:"DASHBOARD"`, payment-method enable flags are NOT enforced, no online payment. |
| `GET /orders/:id` | orders:read | full order (see Order model): `id, orderNumber, customerSnapshot, items[{productId,variantId,name,sku,colour,size,imageUrl,unitPriceMinor,mrpMinor,qty,discountMinor,taxPercent,taxMinor,lineTotalMinor}], address, subtotalMinor, discountMinor, taxMinor, shippingMinor, totalMinor, currency, couponCode, paymentMethod, paymentStatus, status, timeline[{status,at,by,byLabel,note}], customerNote, internalNote, cancelReason, stockRestored, source, createdAt` |
| `PATCH /orders/:id/status` | orders:write | `{ status, note? }`; invalid -> 400 `INVALID_ORDER_TRANSITION`. CANCELLED/REJECTED restore stock once; DELIVERED+COD marks PAID. Returns the order. |
| `PATCH /orders/:id/payment` | orders:write | `{ status:"PAID"|"REFUNDED", note?, refundViaProvider?:boolean }` (REFUNDED only from PAID; full refund). Returns the order. |
| `PATCH /orders/:id/notes` | orders:write | `{ internalNote }` |

Pricing: prices are tax-inclusive; `totalMinor = subtotal - discount + shipping` (see cart README).
