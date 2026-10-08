# admin — `/api/admin` (SUPER_ADMIN only)
Lists return `data: T[]` + `meta: PaginationMeta` (`?page&limit&sort`). Ids are 24-hex strings.

## Shops
- `GET /admin/shops?q&status=ACTIVE|SUSPENDED|PENDING&planId|plan=<CODE>` -> items `{id,name,slug,status,businessType,createdAt,owner:{id,name,email}|null,plan:{id,code,name}|null,subscriptionStatus,usage:[{key,used,limit|null,percent}]}`
- `GET /admin/shops/:id` -> `{shop (full doc), owner, subscription:{id,plan,status,storedStatus,interval,currentPeriodStart,currentPeriodEnd,trialEndsAt,cancelAtPeriodEnd,limitOverrides}|null, limits, features, usage[], counts:{products,orders}}`
- `PATCH /admin/shops/:id/status` `{status:"ACTIVE"|"SUSPENDED", reason}` (reason required to suspend; revokes sessions; emails owner) -> shop detail
- `PATCH /admin/shops/:id/limits` `{limitOverrides?:{products?:number|null,...}, clearOverrides?:["products"]}` (null = unlimited) -> shop detail
- `PATCH /admin/shops/:id/plan` `{planId, interval?, status?, currentPeriodEnd?:ISO|null, resetOverrides?}` -> shop detail + `overLimit: LimitKey[]` (no downgrade block for admins)

## Users
`GET /admin/users?q&role&active=true|false` -> `{id,name,email,phone,role,isActive,shopId,shop:{id,name,slug}|null,lastLoginAt,createdAt}`; `GET /admin/users/:id` adds `memberships:[{shopId,shopName,shopSlug,role,status}]`; `PATCH /admin/users/:id` `{isActive}`.

## Plans (soft delete)
`GET /admin/plans?includeInactive=true` (array, not paginated), `GET /admin/plans/:id`, `POST /admin/plans`, `PATCH /admin/plans/:id`, `DELETE /admin/plans/:id` -> `{deactivated:true, shopCount}`.
Plan: `{id,code,name,description,priceMinor:{MONTHLY,YEARLY},currency,trialDays,limits:{<every LimitKey>: int>=0|null},features:{<every FeatureKey>:bool},isPublic,isActive,isDefault,sortOrder,shopCount,createdAt,updatedAt}`. POST requires all of `code(A-Z0-9_), name, priceMinor, limits(all keys), features(all keys)`; PATCH accepts partial incl. partial `limits/features/priceMinor`. Setting `isDefault:true` demotes others; default plan can't be deleted/deactivated. Changes apply to all its shops immediately.

## Subscriptions
`GET /admin/subscriptions?status&planId&q` -> `{id,shop:{id,name,slug,status},plan,status,storedStatus,interval,currentPeriodStart,currentPeriodEnd,trialEndsAt,cancelAtPeriodEnd,limitOverrides,createdAt}`; `PATCH /admin/subscriptions/:id` `{status?,interval?,currentPeriodEnd?,trialEndsAt?,cancelAtPeriodEnd?}`.

## Analytics / storage
- `GET /admin/analytics?days=30` -> `{totals:{shops,activeShops,suspendedShops,users,products,orders,gmvMinor,mrrMinor,payingShops}, rangeDays, signups:{shops:[{date,count}],users:[...]}, topShops:[{shopId,name,slug,gmvMinor,orders}], shopsNearLimits:[{shopId,name,slug,plan,keys:[{key,used,limit,percent}],maxPercent}]}` (GMV excludes CANCELLED/REJECTED; MRR = ACTIVE subs, yearly/12, trials excluded; near limits >= 80%).
- `GET /admin/storage?q` -> `data:{items:[{shopId,name,slug,status,plan,usedBytes,limitBytes|null,percent,images,videos}], totals:{usedBytes,images,videos,products,shops}, topConsumers:[...]}` + `meta`.

## Settings / logs
- `GET /admin/settings` and `PUT /admin/settings` (partial) -> `{maintenance:{enabled,message}, signupsEnabled, featureFlags:{[flag]:boolean}, defaults:{currency,trialDays,lowStockThreshold}}`. Helper for other modules: `getPlatformSetting(key)` in `admin.settings.service`. Nothing enforces maintenance/signups yet (TODO for auth/app owners).
- `GET /admin/logs?shopId&userId&action(prefix)&entity&entityId&from&to` -> `{id,action,entity,entityId,before,after,meta,ip,createdAt,user:{id,name,email}|null,shop:{id,name,slug}|null}`.
