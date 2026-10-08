# subscriptions — `/api/subscription`
Limits are read live from `SubscriptionPlan` (+ per-shop `Subscription.limitOverrides`) by `limits.service`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/subscription/public-plans` | none | marketing/pricing page |
| GET | `/subscription/plans` | shop user | same list |
| GET | `/subscription` | shop user | current subscription |
| POST | `/subscription/change` | `subscription:manage` | body `{planId, interval:"MONTHLY|YEARLY"}` |
| POST | `/subscription/verify` | `subscription:manage` | body `{changeId, payload}` |

Plan DTO: `{id, code, name, description|null, priceMinor:{MONTHLY,YEARLY}, currency, trialDays, limits:{products,images,videos,storageBytes,customers,ordersPerMonth,staff,catalogues} (null=unlimited), features:{customDomain,...}, isPublic, isDefault, sortOrder}`.

**GET /subscription** data: `{plan: PlanDto, status, storedStatus, isActive, interval, currentPeriodStart, currentPeriodEnd|null, trialEndsAt|null, trialDaysLeft|null, graceEndsAt|null, cancelAtPeriodEnd, limits (effective), limitOverrides, features, usage:[{key,used,limit|null,percent}], pendingChange: {id,planId,interval,amountMinor,currency,createdAt}|null}`.
`status` is the *effective* status from `getEffectiveStatus()` (TRIALING/ACTIVE past period end -> PAST_DUE for 7 days grace -> EXPIRED).

**POST /subscription/change**
- Free target (price 0 for interval): immediate -> `{status:"COMPLETED", subscription: <GET /subscription data>}`.
- Paid target: `{status:"PENDING_PAYMENT", changeId, provider, providerOrderId, amountMinor, currency, clientPayload}`. Plan is NOT changed yet. Open provider checkout with `clientPayload`, then call `/subscription/verify` with `{changeId, payload:{...provider checkout result}}` (razorpay: `razorpay_order_id, razorpay_payment_id, razorpay_signature`; stripe: `paymentIntentId`) -> returns `GET /subscription` data. Verify failure -> `400 PAYMENT_FAILED`. No provider configured -> `400 PAYMENT_METHOD_DISABLED`.
- Over-limit downgrade -> `400 VALIDATION_ERROR` with `error.details.exceeded: [{key, used, limit}]` and a message listing them.
- TODO(billing-webhooks): no recurring provider subscriptions/renewals/dunning; each paid period is a one-off payment, no webhook handling for subscription payments yet.
