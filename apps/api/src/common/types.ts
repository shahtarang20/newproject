import type { GlobalRole, Permission, ShopStatus, StaffRole } from '@vastra/shared';

export interface AuthContext {
  userId: string;
  role: GlobalRole;
  shopId?: string;
  staffRole?: StaffRole;
  permissions: Permission[];
}

export interface ShopContext {
  id: string;
  slug: string;
  status: ShopStatus;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      shop?: ShopContext;
      /** Set by heuristics (honeypot / burst); CAPTCHA enforced by suspicionGuard when present. */
      suspicious?: boolean;
      /** Raw body captured for webhook signature verification (mounted under /api/webhooks). */
      rawBody?: Buffer;
      /** Optional request correlation id. */
      requestId?: string;
    }
  }
}

export {};
