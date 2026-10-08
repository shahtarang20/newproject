# cart

Server-authoritative pricing; client prices are ignored. Money = minor units.

Service: `priceCart(shopId, { items:[{productId,variantId,quantity}], couponCode?, deliveryType? }): Promise<PricedCart>` (web `PricedCart`).
Also `computePricing(shop, input, opts)` (used by orders), `shippingFor`.
Public route (router in `cart.routes.ts`, not mounted by modules/index; storefront mounts it at `/storefront/:slug/cart`): `POST /cart/price`.

Request: `{ "items":[{"productId","variantId","quantity"}], "couponCode":"X", "deliveryType":"DELIVERY|PICKUP" }` (`deliveryType` optional, default DELIVERY, or PICKUP if the shop has delivery disabled).
Response `data`: `{ lines:[{productId,variantId,name,slug,imageUrl,colour,size,sku,unitPriceMinor,mrpMinor,quantity,lineTotalMinor,available,maxQuantity,issue?}], subtotalMinor, discountMinor, taxMinor, shippingMinor, totalMinor, coupon?:{code,valid,message?}, currency }`.
- `issue`: `OUT_OF_STOCK | INSUFFICIENT_STOCK (maxQuantity = stock) | UNAVAILABLE | PRICE_HIDDEN`. Flagged lines have `available:false`, `lineTotalMinor:0` and are excluded from totals. Nothing throws for bad lines; invalid coupon -> `coupon.valid=false`.
- Duplicate variant lines are merged.
- Tax policy: prices are TAX-INCLUSIVE. `taxMinor` is the tax contained in (line amount - discount); it is not added on top. `totalMinor = subtotalMinor - discountMinor + shippingMinor`.
- Discounts: best single automatic offer per line, then coupon on the remainder.
- Shipping: DELIVERY = `shippingSettings.flatRateMinor`, free when `(subtotal - discount) >= freeAboveMinor`; PICKUP = 0.
