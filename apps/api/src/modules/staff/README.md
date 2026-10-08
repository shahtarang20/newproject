# staff — `/api/staff`
All except `accept-invite` need `staff:manage` (OWNER only per ROLE_PERMISSIONS). Assignable roles: `MANAGER|SALES|INVENTORY|ORDER_MANAGER`.

| Method | Path | Body | Result `data` |
|---|---|---|---|
| GET | `/staff` | | `StaffDto[]` |
| GET | `/staff/permissions` | | `{permissions: Permission[], roles: {OWNER:[...],MANAGER:[...],...}, assignableRoles: [...]}` |
| POST | `/staff/invite` | `{name, email, phone?, role}` | 201 `StaffDto` (limit -> `403 STAFF_LIMIT_REACHED`, duplicate email -> `409 CONFLICT`) |
| POST | `/staff/:id/resend-invite` | | `{sent:true}` |
| PATCH | `/staff/:id` | `{role?, active?}` | `StaffDto` (not owner, not self; forces re-login of that user) |
| DELETE | `/staff/:id` | | 204 (not owner, not self; frees a staff slot; revokes refresh tokens) |
| POST | `/staff/accept-invite` | `{token, password(min 8)}` | public; `{email}` then user logs in at `/auth/login` |

`StaffDto`: `{id (ShopStaff id, use in :id), userId, name, email, phone|null, role, status:"ACTIVE|DISABLED", invitePending:boolean, lastLoginAt|null, createdAt}`.
Invite email links to `${FRONTEND_URL}/accept-invite?token=<token>` (token valid 7 days; only its sha256 is stored). With `EMAIL_PROVIDER=console` the link is printed in the API log.
Web must implement the public `/accept-invite` page.
