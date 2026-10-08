import type { Response } from 'express';
import type { PaginationMeta } from '@vastra/shared';

export function ok<T>(res: Response, data: T, message = 'Success', meta?: PaginationMeta): Response {
  return res.status(200).json({ success: true, data, message, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return res.status(201).json({ success: true, data, message });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
