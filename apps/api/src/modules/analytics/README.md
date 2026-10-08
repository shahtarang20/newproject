# analytics

All routes: `authenticate`, `requireShop`, permission `analytics:read`. Envelope `{success,data,message,meta?}`. Money = minor units. Dates are UTC days `YYYY-MM-DD`; series are zero-filled.
Range params (sales/products/funnel): `range=7d|30d|90d|365d` (default 30d) OR `from=YYYY-MM-DD&to=YYYY-MM-DD` (inclusive, max 366 days).

## Server export
`recordEvent(shopId, { type, productId?, catalogueId?, sessionId?, meta? }): Promise<void>` in `analytics.service.ts`. Never throws; call as `void recordEvent(...)`. Dedupes PRODUCT_VIEW/CATALOGUE_VIEW per session+entity for 30 min. Updates `AnalyticsDaily` ($inc, shop row + product row). For `ORDER` pass `meta.totalMinor` to roll up revenue.

## GET /analytics/dashboard?range=7d|30d|90d   (always allowed)
```json
{ "range":"30d","currency":"INR","from":"2026-09-09","to":"2026-10-08",
  "todaySalesMinor":0,"todayOrders":0,"pendingOrders":0,"totalCustomers":0,"productsCount":0,"lowStockCount":0,"outOfStockCount":0,
  "revenue":{"totalMinor":0,"previousMinor":0,"deltaPercent":12.5,"orders":0,"previousOrders":0,"ordersDeltaPercent":null},
  "topProducts":[{"productId":"..","name":"..","imageUrl":"..","quantity":3,"revenueMinor":0,"orders":2}],
  "recentOrders":[{"id":"..","orderNumber":"..","customerName":"..","totalMinor":0,"status":"PENDING","paymentStatus":"COD","createdAt":".."}],
  "recentEnquiries":[{"id":"..","name":"..","phone":"..","message":"..","status":"NEW","productId":null,"createdAt":".."}],
  "salesOverTime":[{"date":"2026-10-01","revenueMinor":0}],
  "ordersOverTime":[{"date":"2026-10-01","orders":0}],
  "topCategories":[{"categoryId":"..|null","name":"..","revenueMinor":0,"quantity":0}] }
```
`deltaPercent` is `null` when the previous period was 0 and current > 0. Sales exclude CANCELLED/REJECTED orders.

## GET /analytics/sales?groupBy=day|week|month&range=...   (feature `analytics`)
```json
{ "groupBy":"day","from":"..","to":"..","series":[{"date":"2026-10-01","revenueMinor":0,"orders":0}],
  "totals":{"revenueMinor":0,"orders":0,"averageOrderValueMinor":0,"previousRevenueMinor":0,"previousOrders":0,"revenueDeltaPercent":0,"ordersDeltaPercent":0},
  "paymentMethodSplit":[{"method":"COD","orders":0,"revenueMinor":0}],
  "statusSplit":[{"status":"DELIVERED","orders":0,"revenueMinor":0}] }
```
Week buckets start Monday, month buckets on the 1st (`date` = bucket start).

## GET /analytics/products?range=..&page=1&limit=20&sort=views|addToCart|orders|revenue|quantity&order=asc|desc   (features `analytics` + `advancedAnalytics`)
`data: { items:[{productId,name,imageUrl,views,addToCart,orders,quantity,revenueMinor,conversionPercent}], from, to }`, `meta` = pagination.

## GET /analytics/funnel?range=..   (features `analytics` + `advancedAnalytics`)
```json
{ "from":"..","to":"..",
  "funnel":[{"step":"CATALOGUE_VIEW","count":0,"conversionFromPreviousPercent":null,"conversionFromStartPercent":0},
            {"step":"PRODUCT_VIEW",...},{"step":"ADD_TO_CART",...},{"step":"CHECKOUT_START",...},{"step":"ORDER",...}],
  "engagement":{"SHOP_VIEW":0,"WHATSAPP_CLICK":0,"PRODUCT_SHARE":0,"ENQUIRY":0} }
```
The ORDER step is counted from real (non-cancelled) orders. Plan gate failures: 403 `FEATURE_NOT_IN_PLAN`.
