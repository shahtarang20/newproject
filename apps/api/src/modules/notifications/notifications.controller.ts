import type { Request, Response } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { Errors } from '@/common/errors';
import { ok } from '@/common/response';
import * as svc from './notifications.service';

const auth = (req: Request) => {
  if (!req.auth) throw Errors.unauthorized();
  return req.auth;
};

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { items, unreadCount, meta } = await svc.listNotifications(auth(req), req.query as { page?: number; limit?: number; unread?: boolean });
  return ok(res, { items, unreadCount }, 'Success', meta);
});

export const read = asyncHandler(async (req: Request, res: Response) => {
  await svc.markRead(auth(req), req.params.id);
  return ok(res, { read: true }, 'Marked as read');
});

export const readAll = asyncHandler(async (req: Request, res: Response) => {
  const updated = await svc.markAllRead(auth(req));
  return ok(res, { updated }, 'All notifications marked as read');
});
