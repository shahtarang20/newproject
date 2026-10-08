# notifications — `/api/notifications` (any authenticated user)
Shop users see shop-level notifications (userId null) plus their own; other roles only their own.

- `GET /notifications?page=1&limit=20&unread=true|false` -> `data: {items: Notification[], unreadCount}`, `meta: PaginationMeta`.
  `Notification`: `{id, type, title, body, data|null, channels[], read:boolean, readAt|null, createdAt}`.
- `PATCH /notifications/:id/read` -> `{read:true}` (404 if not in scope)
- `POST /notifications/read-all` -> `{updated:number}`
Producers call `notify()` from `providers/notifications/notify.service` (unchanged).
