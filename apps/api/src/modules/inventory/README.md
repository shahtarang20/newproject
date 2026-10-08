# inventory

Service: `adjustStock(shopId, {variantId,type,quantity,note?}, {userId?,ip?})`, `recordTransaction(...)`, `decrementStock`, `incrementStock`, `notifyStockCrossings`, `recomputeProducts`; `transaction.ts`: `runAtomic` (Mongo transaction when replica set, else compensating rollback).
Auth + shop required. Lists use `meta` pagination.

- `GET /inventory?filter=all|low|out&q=&productId=&page=&limit=` (inventory:read)
  `data: { items:[{variantId,productId,productName,productSlug,imageUrl,sku,colour,size,stock,lowStockThreshold,status:"OK"|"LOW"|"OUT",sellingPriceMinor}], summary:{totalProducts,totalVariants,totalStock,lowStock,outOfStock} }` (summary covers all active variants, ignores filter/search). Threshold = variant -> product -> shop default.
- `POST /inventory/adjust` (inventory:write) body `{ variantId, type:"PURCHASE|ADJUSTMENT|DAMAGE|RETURN", quantity:int, note?, unitCostMinor? }`
  Sign rules: PURCHASE/RETURN quantity > 0 adds; DAMAGE quantity > 0 removes; ADJUSTMENT is a signed non-zero delta. Never below 0 (409 `INSUFFICIENT_STOCK`).
  Response: `{ variantId, productId, type, delta, before, stock, transactionId }`.
- `GET /inventory/transactions?variantId=&productId=&type=&from=&to=&page=&limit=` (inventory:read)
  `data:[{id,type,quantity(signed),balanceAfter,reason,productId,productName,variantId,sku,colour,size,orderId?,createdBy?,createdAt}]`
