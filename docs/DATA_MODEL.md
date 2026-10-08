# Data Model (as implemented in `apps/api/src/database/models`)

Conventions: money = integer minor units; `shopId` (ObjectId, ref Shop, required) on every tenant model; `id` replaces `_id`/`__v` in JSON; `passwordHash`/`tokenHash` never serialised. Import models from `@/database/models` (each exports `Model` + `IModel`). Enums come from `@vastra/shared`. All have `createdAt/updatedAt` unless noted.
Soft delete = `deletedAt` (null = alive); query with `{ deletedAt: null }` explicitly.

## User
email (unique, lowercase), phone?, name, passwordHash (select:false), role GlobalRole, shopId? (primary shop), avatarUrl?, isActive, emailVerifiedAt?, lastLoginAt?, passwordChangedAt?. Idx: email unique; {role,createdAt}; shopId sparse.
## RefreshToken (createdAt only)
userId, tokenHash (unique sha256), familyId, expiresAt, revokedAt?, replacedByHash?, userAgent?, ip?. Idx: TTL on expiresAt; userId; familyId.
## Shop (no shopId)
name, slug (unique), tagline?, description?, businessType, logoUrl?, coverUrl?, orderPrefix, contact{phone,email,whatsapp}, address{line1,line2,city,state,pincode,country}, socials{instagram,facebook,youtube,website}, businessHours[{day,open,close,closed}], theme{templateId,primaryColor?,buttonStyle,catalogueLayout}, seo{title,description,keywords[],ogImageUrl}, paymentSettings{codEnabled,onlineEnabled,payAtShopEnabled,upiId?}, shippingSettings{deliveryEnabled,pickupEnabled,flatRateMinor,freeAboveMinor|null}, notificationSettings{inApp,email,whatsapp,emailTo?,whatsappTo?,lowStockThreshold}, currency, status, ownerId, subscriptionId?, usage{products,images,videos,customers,staff,catalogues,storageBytes,ordersThisPeriod,periodStart}. Idx: slug unique; ownerId; {status,createdAt}; text(name,slug).
## ShopStaff
shopId, userId, role StaffRole, status ACTIVE|DISABLED, invitedBy?. Idx: {shopId,userId} unique; {userId,status}.
## SubscriptionPlan (no shopId)
code (unique, upper), name, description?, priceMinor{MONTHLY,YEARLY}, currency, trialDays, limits PlanLimits (null=unlimited), features PlanFeatures, isPublic, isActive, isDefault, sortOrder. Idx: {isPublic,isActive,sortOrder}.
## Subscription
shopId (unique), planId, status, interval, currentPeriodStart, currentPeriodEnd|null, trialEndsAt?, cancelAtPeriodEnd, limitOverrides Partial<PlanLimits> (key present with null = unlimited), providerSubscriptionId?. Idx: planId; {status,currentPeriodEnd}.
## Category
name, slug, parentId?, description?, imageUrl?, sortOrder, isActive. Idx: {shopId,slug} unique; {shopId,parentId,sortOrder}.
## Product (soft delete)
type, name, slug, sku?, brand?, description?, shortDescription?, categoryId?, tags[], gender?, occasions[], fabric?, season?, sareeAttrs{sareeType,fabric,workTypes[],lengthMeters,blouseIncluded,blouseDescription,border,pallu,weave,careInstructions}, garmentAttrs{fit,pattern,sleeveType,neckType,fabricComposition,washCare}, pricing{minSellingMinor,maxSellingMinor,mrpMinor,taxPercent,hidePrice}, colours[] (names), sizes[], stockTotal, lowStockThreshold?, status, isFeatured, media[{mediaId,kind,url,thumbUrl,isPrimary,sortOrder}] (embedded), mediaIds[], primaryImageUrl?, primaryThumbUrl?, seo{title,description}, viewCount, soldCount, shareCount, deletedAt.
Idx: {shopId,slug} unique (**service must rename slug on soft delete**); {shopId,status,deletedAt,createdAt}; {shopId,categoryId,status}; {shopId,type,status}; {shopId,isFeatured,status}; {shopId,pricing.minSellingMinor}; {shopId,soldCount}; {shopId,sku} partial; text `{shopId, name, sku, tags, brand}` (queries must include shopId equality).
## ProductVariant
productId, sku?, colour{name,hex}, size?, sellingPriceMinor, mrpMinor, costPriceMinor?, stock, lowStockThreshold?, barcode?, imageUrl?, isActive. Idx: {shopId,productId,isActive}; {shopId,sku} unique partial(string); {shopId,stock}.
## Media
productId?, kind, url, thumbUrl?, key, provider, mimeType, sizeBytes, width?, height?, durationSec?, altText?, isPrimary, sortOrder, uploadedBy?. Idx: {shopId,productId,sortOrder}; {shopId,kind,createdAt}.
## Catalogue
name, slug, description?, coverUrl?, isPublic, isActive, sortOrder, products[{productId,sortOrder}] (embedded), viewCount. Idx: {shopId,slug} unique; {shopId,isActive,isPublic,sortOrder}; {shopId,products.productId}.
## InventoryTransaction (createdAt only)
productId, variantId, type, quantity (signed), balanceAfter, reason?, orderId?, unitCostMinor?, createdBy?. Idx: {shopId,createdAt}; {shopId,productId,createdAt}; {shopId,variantId,createdAt}; {shopId,orderId,type}.
## Customer
name, phone (normalised, `normalisePhone`), email?, userId?, tags[], notes?, source, isBlocked, stats{ordersCount,totalSpentMinor,lastOrderAt}. Idx: {shopId,phone} unique; {shopId,createdAt}; {shopId,stats.totalSpentMinor}; {shopId,name}; {shopId,userId} sparse.
## CustomerAddress
customerId, label?, isDefault, name, phone, line1, line2?, landmark?, city, state, pincode, country. Idx: {shopId,customerId,isDefault}.
## Cart (optional server cart)
customerId?, sessionId?, items[{productId,variantId,qty,addedAt}] (embedded), expiresAt. Idx: TTL expiresAt; {shopId,customerId}/{shopId,sessionId} sparse.
## Order
orderNumber, customerId?, customerSnapshot{name,phone,email}, items[{productId,variantId,name,sku,colour,size,imageUrl,unitPriceMinor,mrpMinor,qty,discountMinor,taxPercent,taxMinor,lineTotalMinor}], deliveryType, address? (IAddress), subtotalMinor, discountMinor, taxMinor, shippingMinor, totalMinor, currency, couponCode?, couponId?, paymentMethod, paymentStatus, status, timeline[{status,at,by,byLabel,note}], customerNote?, internalNote?, cancelReason?, stockRestored, source, placedByIp?. Idx: {shopId,orderNumber} unique; {shopId,status,createdAt}; {shopId,createdAt}; {shopId,customerId,createdAt}; {shopId,customerSnapshot.phone,createdAt}; {shopId,paymentStatus,createdAt}.
## Payment
orderId, provider, method, providerOrderId?, providerPaymentId?, amountMinor, refundedMinor, currency, status, failureReason?, processedEventIds[], meta?. Idx: {shopId,orderId}; {shopId,status,createdAt}; {provider,providerOrderId} sparse; {provider,providerPaymentId} sparse.
## Enquiry
productId?, customerId?, name, phone, email?, message, status, source, assignedTo?, notes[{by,text,at}], respondedAt?. Idx: {shopId,status,createdAt}; {shopId,productId,createdAt}; {shopId,phone,createdAt}.
## Offer
name, description?, badgeText?, discountType, value, maxDiscountMinor?, buyQty?, getQty?, scope ALL|PRODUCTS|CATEGORIES, productIds[], categoryIds[], minOrderMinor, startsAt?, endsAt?, isActive. Idx: {shopId,isActive,startsAt,endsAt}.
## Coupon
code (upper), description?, discountType, value, maxDiscountMinor?, minOrderMinor, usageLimit?, perCustomerLimit?, usedCount, startsAt?, endsAt?, isActive. Idx: {shopId,code} unique; {shopId,isActive,endsAt}.
## Notification (shopId/userId optional, createdAt only)
type, title, body, data?, channels[], readAt?. Idx: {shopId,readAt,createdAt}; {userId,readAt,createdAt}; TTL createdAt 180d.
## AnalyticsEvent (createdAt only)
type, productId?, catalogueId?, orderId?, visitorId?, sessionId?, referrer?, device?, meta?. Idx: {shopId,type,createdAt}; {shopId,productId,type,createdAt}; TTL createdAt 400d.
## AnalyticsDaily (updatedAt only)
date "YYYY-MM-DD", productId|null (null = shop-level row), counts Map<eventType,number> (`$inc: {'counts.PRODUCT_VIEW': 1}`), uniqueVisitors, ordersCount, revenueMinor. Idx: {shopId,date,productId} unique; {shopId,productId,date}.
## AuditLog (shopId/userId optional, createdAt only)
action, entity, entityId?, before?, after?, meta?, ip?. Idx: {shopId,createdAt}; {shopId,entity,entityId,createdAt}; {userId,createdAt}; {action,createdAt}.
## PlatformSetting
key (unique), value (Mixed), description?, updatedBy?.
## Counter
_id (string key, e.g. `order:<shopId>:<year>`), seq. Use `nextOrderNumber(shopId, prefix)`.
