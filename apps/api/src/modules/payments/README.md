# payments

Service: `verifyAndMarkPaid(shopId, { orderNumber, payload }): Promise<{ orderNumber, paymentStatus }>`, `handleWebhook(provider:'razorpay'|'stripe', rawBody, signature)`, `applyPaymentPaid`, `applyPaymentFailed`, `refundOrderPayment`. zod: `verifyPaymentSchema` (payments.schemas.ts) for `POST /storefront/:slug/payments/verify`.

verify body: `{ "orderNumber":"SHOP-2026-000001", "payload": <provider checkout result> }`
- Razorpay payload: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
- Stripe payload: `{ paymentIntentId }`
The payload must reference the order's provider order id; signature/intent status is re-verified server-side. Failure -> 400 `PAYMENT_FAILED`. Success -> `{ orderNumber, paymentStatus:"PAID" }`. Idempotent.

## Webhooks (mounted at `/api/webhooks`, no auth, raw body signature)
- `POST /webhooks/razorpay` (header `x-razorpay-signature`; events payment.captured, order.paid, payment.failed)
- `POST /webhooks/stripe` (header `stripe-signature`; payment_intent.succeeded, payment_intent.payment_failed)
Invalid signature or provider not active -> 401. Authentic events -> 200 `{ received:true, handled:boolean }`. Idempotent (atomic status guard + `processedEventIds`). Paid: Payment+Order `PAID`, timeline entry, `PAYMENT_RECEIVED` notification.
