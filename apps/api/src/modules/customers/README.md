# customers (dashboard) — `/api/customers`, auth + shop; `customers:read` (GET) / `customers:write` (POST, PATCH)

```json
Customer = { "id":"…","name":"Asha","phone":"9876543210","email":"a@x.com","tags":["vip"],"notes":"…",
  "source":"ORDER|ENQUIRY|MANUAL|ACCOUNT","isBlocked":false,"hasAccount":false,
  "stats":{"ordersCount":3,"totalSpentMinor":450000,"lastOrderAt":"ISO"},"createdAt":"ISO","updatedAt":"ISO" }
```
- `GET /customers?q=&tag=&sort=newest|totalSpent|lastOrderAt|name&dir=asc|desc&page=1&limit=20` -> `Customer[]` + `meta`. `q` matches name/email/phone (digits too). Default dir: desc (name: asc).
- `POST /customers` body `{name, phone, email?, notes?, tags?}` -> 201 `Customer`. `409 CONFLICT` if phone exists; `403 CUSTOMER_LIMIT_REACHED` at plan limit.
- `GET /customers/export?q=&tag=&sort=&dir=` -> `text/csv` attachment (max 50k rows, Total spent in major units).
- `GET /customers/:id` ->
```json
{ "customer": Customer,
  "orderStats": {"ordersCount":3,"cancelledCount":1,"totalSpentMinor":450000,"averageOrderMinor":150000,"lastOrderAt":"ISO"},
  "recentOrders": [{"id","orderNumber","status","paymentStatus","paymentMethod","totalMinor","currency","itemCount","createdAt"}],
  "enquiries": [{"id","message","status","productId?","respondedAt?","createdAt"}],
  "purchasedProducts": [{"productId","name","imageUrl?","quantity","spentMinor","ordersCount","lastPurchasedAt"}],
  "favouriteProducts": [ /* same shape, bought >=2 times, top 5 */ ],
  "addresses": [{"id?","label?","isDefault","name","phone","line1","line2?","landmark?","city","state","pincode","country","source":"SAVED|ORDER"}] }
```
orderStats exclude CANCELLED/REJECTED orders (matched by customerId or order phone).
- `PATCH /customers/:id` body any of `{name, email|null|"", notes|null, tags[], isBlocked}` -> `Customer`.
