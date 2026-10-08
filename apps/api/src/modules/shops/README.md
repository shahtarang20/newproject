# shops — `/api/shop`
Envelope: `{success, data, message, meta?}`. Auth = Bearer; mutations need `settings:write` (OWNER/superadmin impersonation).

| Method | Path | Notes |
|---|---|---|
| GET | `/shop/public/:slug` | public, no auth; delegates to `storefront.service.getPublicShopBySlug` |
| GET | `/shop` | full profile |
| PATCH | `/shop` | partial update (below) |
| POST | `/shop/logo`, `/shop/cover` | multipart field **`file`** (jpeg/png/webp/avif ≤10MB) -> `{logoUrl}` / `{coverUrl}` |
| GET | `/shop/usage` | usage + storage breakdown |
| GET | `/shop/templates` | 7 templates |

**GET /shop** data: the Shop document (`id, name, slug, tagline, description, businessType, logoUrl, coverUrl, orderPrefix, contact{phone,email,whatsapp}, address{line1,line2,city,state,pincode,country}, socials{instagram,facebook,youtube,website}, businessHours[{day,open,close,closed}], theme{templateId,primaryColor,buttonStyle,catalogueLayout}, seo{title,description,keywords[],ogImageUrl}, paymentSettings{codEnabled,onlineEnabled,payAtShopEnabled,upiId}, shippingSettings{deliveryEnabled,pickupEnabled,flatRateMinor,freeAboveMinor|null}, notificationSettings{inApp,email,whatsapp,emailTo,whatsappTo,lowStockThreshold}, currency, status, ownerId, usage{products,images,videos,customers,staff,catalogues,storageBytes,ordersThisPeriod,periodStart}, createdAt, updatedAt`) plus:
`usageSummary: [{key, used, limit|null, percent}]`, `storageBytes`, `subscription: {planCode, planName, status, currentPeriodEnd|null}`.

**PATCH /shop** body (every field optional, at least one; nested objects are merged, arrays like `businessHours`/`seo.keywords` replaced):
`{name, slug, tagline, description, businessType, contact, address, socials, businessHours:[{day:"MONDAY",open:"10:00",close:"20:00",closed:false}], seo, theme:{templateId, primaryColor:"#7a1f2b"|"", buttonStyle:"rounded|pill|square", catalogueLayout:"grid|masonry|list|editorial"}, paymentSettings, shippingSettings, notificationSettings}` -> returns updated GET /shop payload.
Errors: `409 SLUG_TAKEN` (taken or reserved), `400 PAYMENT_METHOD_DISABLED` (onlineEnabled while platform has no payment provider), `400 VALIDATION_ERROR` (no payment method / no delivery+pickup enabled). Changing slug changes the public URL immediately.

**GET /shop/usage** data: `{ usage: [{key,used,limit|null,percent}], storage: {usedBytes, limitBytes|null, percent, images:{count,bytes}, videos:{count,bytes}} }`.

**GET /shop/templates** data: `[{id, name, tagline, previewColors: string[]}]` (ids: heritage-gold, minimal-noir, boutique-blush, urban-street, royal-silk, modern-linen, festive-bloom).
