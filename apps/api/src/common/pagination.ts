import type { PaginationMeta } from '@vastra/shared';

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
  defaultSort?: string;
  /** Optional whitelist of sortable fields; unknown fields are dropped. */
  allowedSort?: readonly string[];
}

export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, 1 | -1>;
}

const toInt = (v: unknown, fallback: number): number => {
  const n = typeof v === 'string' || typeof v === 'number' ? Number.parseInt(String(v), 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

/** `sort=-createdAt,name` → { createdAt: -1, name: 1 } */
export function parsePagination(query: Record<string, unknown>, opts: PaginationOptions = {}): ParsedPagination {
  const { defaultLimit = 20, maxLimit = 100, defaultSort = '-createdAt', allowedSort } = opts;
  const page = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(maxLimit, Math.max(1, toInt(query.limit, defaultLimit)));
  const sortStr = typeof query.sort === 'string' && query.sort ? query.sort : defaultSort;

  const sort: Record<string, 1 | -1> = {};
  for (const part of sortStr.split(',')) {
    const t = part.trim();
    if (!t) continue;
    const dir: 1 | -1 = t.startsWith('-') ? -1 : 1;
    const field = t.replace(/^[-+]/, '');
    if (!/^[\w.]+$/.test(field)) continue;
    if (allowedSort && !allowedSort.includes(field)) continue;
    sort[field] = dir;
  }
  if (Object.keys(sort).length === 0) {
    const t = defaultSort.trim();
    sort[t.replace(/^[-+]/, '')] = t.startsWith('-') ? -1 : 1;
  }
  return { page, limit, skip: (page - 1) * limit, sort };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages };
}
