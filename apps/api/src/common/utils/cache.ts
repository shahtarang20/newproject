interface Entry<T> {
  value: T;
  expiresAt: number;
}

/** Tiny in-process TTL + LRU cache. Not shared across instances — only for short-lived public reads. */
export class TtlCache<T = unknown> {
  private store = new Map<string, Entry<T>>();

  constructor(
    private readonly maxEntries = 500,
    private readonly defaultTtlMs = 30_000,
  ) {}

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // refresh LRU position
    this.store.delete(key);
    this.store.set(key, e);
    return e.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  async wrap(key: string, loader: () => Promise<T>, ttlMs?: number): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await loader();
    this.set(key, value, ttlMs);
    return value;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }

  clear(): void {
    this.store.clear();
  }
}

/** Shared cache for public storefront reads. Keys: `shop:<shopId>:<resource>:<query>`. */
export const publicCache = new TtlCache<unknown>(1000, 30_000);
export const invalidateShopCache = (shopId: string): void => publicCache.invalidateByPrefix(`shop:${shopId}:`);

/** Public shop profile is cached by slug (see storefront.service getPublicShopBySlug). */
export const invalidateSlugCache = (...slugs: Array<string | undefined>): void => {
  for (const slug of slugs) if (slug) publicCache.delete(`slug:${slug.toLowerCase()}:public`);
};
