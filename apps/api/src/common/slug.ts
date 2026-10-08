import type { FilterQuery, Model } from 'mongoose';
import { RESERVED_SHOP_SLUGS } from '@vastra/shared';

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const isReservedSlug = (slug: string): boolean => (RESERVED_SHOP_SLUGS as readonly string[]).includes(slug);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Returns a slug unique within `scope` (e.g. `{ shopId }`), appending -2, -3 … on collision.
 * Reserved shop slugs are only avoided when `reserved` is true (use for Shop.slug).
 */
export async function uniqueSlug<T>(
  model: Model<T>,
  base: string,
  scope: FilterQuery<T> = {},
  field = 'slug',
  opts: { reserved?: boolean; excludeId?: unknown } = {},
): Promise<string> {
  const root = slugify(base) || 'item';
  const taken = async (candidate: string): Promise<boolean> => {
    if (opts.reserved && isReservedSlug(candidate)) return true;
    const filter = { ...scope, [field]: candidate } as FilterQuery<T>;
    if (opts.excludeId) (filter as Record<string, unknown>)._id = { $ne: opts.excludeId };
    return (await model.exists(filter)) !== null;
  };
  if (!(await taken(root))) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
