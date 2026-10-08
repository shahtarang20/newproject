/** Central TanStack Query key factory. Other agents: add your module's keys here via spread-friendly factories. */
export const queryKeys = {
  auth: { me: ['auth', 'me'] as const },
  shop: { all: ['shop'] as const, detail: () => ['shop', 'detail'] as const, usage: () => ['shop', 'usage'] as const },
  products: {
    all: ['products'] as const,
    list: (params?: unknown) => ['products', 'list', params ?? {}] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  categories: { all: ['categories'] as const, list: (params?: unknown) => ['categories', 'list', params ?? {}] as const },
  inventory: {
    all: ['inventory'] as const,
    list: (params?: unknown) => ['inventory', 'list', params ?? {}] as const,
    transactions: (params?: unknown) => ['inventory', 'transactions', params ?? {}] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (params?: unknown) => ['orders', 'list', params ?? {}] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (params?: unknown) => ['customers', 'list', params ?? {}] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  catalogues: {
    all: ['catalogues'] as const,
    list: (params?: unknown) => ['catalogues', 'list', params ?? {}] as const,
    detail: (id: string) => ['catalogues', 'detail', id] as const,
  },
  enquiries: { all: ['enquiries'] as const, list: (params?: unknown) => ['enquiries', 'list', params ?? {}] as const },
  offers: { all: ['offers'] as const, list: (params?: unknown) => ['offers', 'list', params ?? {}] as const },
  staff: { all: ['staff'] as const },
  analytics: { all: ['analytics'] as const, section: (name: string, params?: unknown) => ['analytics', name, params ?? {}] as const },
  subscription: { all: ['subscription'] as const, current: () => ['subscription', 'current'] as const, plans: () => ['subscription', 'plans'] as const },
  notifications: { all: ['notifications'] as const },
  admin: { all: ['admin'] as const, section: (name: string, params?: unknown) => ['admin', name, params ?? {}] as const },
  storefront: {
    all: (slug: string) => ['storefront', slug] as const,
    shop: (slug: string) => ['storefront', slug, 'shop'] as const,
    products: (slug: string, params?: unknown) => ['storefront', slug, 'products', params ?? {}] as const,
    product: (slug: string, productSlug: string) => ['storefront', slug, 'product', productSlug] as const,
    categories: (slug: string) => ['storefront', slug, 'categories'] as const,
    catalogue: (slug: string, catSlug: string) => ['storefront', slug, 'catalogue', catSlug] as const,
    facets: (slug: string, params?: unknown) => ['storefront', slug, 'facets', params ?? {}] as const,
    offers: (slug: string) => ['storefront', slug, 'offers'] as const,
  },
} as const;
