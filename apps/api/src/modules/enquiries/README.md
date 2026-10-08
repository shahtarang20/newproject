# enquiries

Public creation: `POST /api/storefront/:slug/enquiries` (see storefront README). Service fn `createEnquiry(shopId, input)`.
Body: `{customerName, phone, email?, productId?, variantId?, question, website?}` -> `201 {id}`. Product must be ACTIVE in this shop (`404 PRODUCT_NOT_FOUND`), variant must belong to it (`400 INVALID_VARIANT`; the variant label is appended to the stored message as `[Variant: Red / M]`).
Side effects: lead Customer upserted by phone (`source=ENQUIRY`, not counted as an order; skipped if plan `customers` limit reached), shop notified (`ENQUIRY_NEW`), analytics `ENQUIRY` event.

Dashboard (authenticate + shop; `enquiries:read` for GET, `enquiries:write` for PATCH) under `/api/enquiries`:

- `GET /enquiries?status=NEW|IN_PROGRESS|RESPONDED|CLOSED|ALL&q=&productId=&page=1&limit=20` -> `data: Enquiry[]`, `meta` pagination (newest first). `q` searches name/phone/email/message.
- `GET /enquiries/stats` -> `{counts:{NEW,IN_PROGRESS,RESPONDED,CLOSED}, total, unreadNew}` (`unreadNew` = NEW count; use for the badge).
- `GET /enquiries/:id` -> `Enquiry`
- `PATCH /enquiries/:id` body `{status?, response?}` (at least one). With `response`: stored as a note, `respondedAt` set, status defaults to `RESPONDED`, customer notified via WhatsApp/Email when available (never blocks). -> updated `Enquiry`.

```json
Enquiry = {
  "id": "…", "name": "Asha", "phone": "9876543210", "email": "a@x.com",
  "message": "Is this available in M?", "status": "NEW", "source": "STOREFRONT",
  "customerId": "…",
  "product": { "id": "…", "name": "Silk Saree", "slug": "silk-saree", "imageUrl": "https://…" },
  "response": "Yes, in stock", "notes": [{ "text": "Yes, in stock", "at": "ISO" }],
  "respondedAt": "ISO", "createdAt": "ISO", "updatedAt": "ISO"
}
```
`product`, `email`, `customerId`, `response`, `respondedAt` are omitted when absent. Phone is stored normalised (digits, optional leading +).
