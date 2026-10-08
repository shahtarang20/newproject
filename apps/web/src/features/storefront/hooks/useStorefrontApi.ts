import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '@/api/endpoints/storefront';
import type { CartPriceRequest, PublicProductsQuery } from '@/types/storefront';

export const sfKeys = {
  all: (slug: string) => ['storefront', slug] as const,
  shop: (slug: string) => ['storefront', slug, 'shop'] as const,
  categories: (slug: string) => ['storefront', slug, 'categories'] as const,
  products: (slug: string, q: PublicProductsQuery) => ['storefront', slug, 'products', q] as const,
  product: (slug: string, p: string) => ['storefront', slug, 'product', p] as const,
  facets: (slug: string) => ['storefront', slug, 'facets'] as const,
  catalogues: (slug: string) => ['storefront', slug, 'catalogues'] as const,
  catalogue: (slug: string, c: string) => ['storefront', slug, 'catalogue', c] as const,
  offers: (slug: string) => ['storefront', slug, 'offers'] as const,
  price: (slug: string, r: CartPriceRequest) => ['storefront', slug, 'price', r] as const,
};

const MIN = 60_000;

export const useShopQuery = (slug: string) =>
  useQuery({ queryKey: sfKeys.shop(slug), queryFn: () => storefrontApi.shop(slug), enabled: !!slug, staleTime: 5 * MIN });

export const useCategoriesQuery = (slug: string) =>
  useQuery({ queryKey: sfKeys.categories(slug), queryFn: () => storefrontApi.categories(slug), enabled: !!slug, staleTime: 5 * MIN });

export const useProductsQuery = (slug: string, query: PublicProductsQuery, enabled = true) =>
  useQuery({
    queryKey: sfKeys.products(slug, query),
    queryFn: () => storefrontApi.products(slug, query),
    enabled: !!slug && enabled,
    staleTime: MIN,
    placeholderData: keepPreviousData,
  });

export const useProductQuery = (slug: string, productSlug: string) =>
  useQuery({
    queryKey: sfKeys.product(slug, productSlug),
    queryFn: () => storefrontApi.product(slug, productSlug),
    enabled: !!slug && !!productSlug,
    staleTime: MIN,
  });

export const useFacetsQuery = (slug: string) =>
  useQuery({ queryKey: sfKeys.facets(slug), queryFn: () => storefrontApi.facets(slug), enabled: !!slug, staleTime: 5 * MIN });

export const useCataloguesQuery = (slug: string) =>
  useQuery({ queryKey: sfKeys.catalogues(slug), queryFn: () => storefrontApi.catalogues(slug), enabled: !!slug, staleTime: 5 * MIN });

export const useCatalogueQuery = (slug: string, catalogueSlug: string) =>
  useQuery({
    queryKey: sfKeys.catalogue(slug, catalogueSlug),
    queryFn: () => storefrontApi.catalogue(slug, catalogueSlug),
    enabled: !!slug && !!catalogueSlug,
    staleTime: 5 * MIN,
  });

export const useOffersQuery = (slug: string) =>
  useQuery({ queryKey: sfKeys.offers(slug), queryFn: () => storefrontApi.offers(slug), enabled: !!slug, staleTime: 5 * MIN });

export const usePricedCart = (slug: string, req: CartPriceRequest, enabled = true) =>
  useQuery({
    queryKey: sfKeys.price(slug, req),
    queryFn: () => storefrontApi.priceCart(slug, req),
    enabled: !!slug && enabled && req.items.length > 0,
    staleTime: 0,
    gcTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
  });

export const usePlaceOrder = (slug: string) => useMutation({ mutationFn: (b: Parameters<typeof storefrontApi.placeOrder>[1]) => storefrontApi.placeOrder(slug, b) });

export const useTrackOrder = (slug: string) =>
  useMutation({ mutationFn: (b: { orderNumber: string; phone: string }) => storefrontApi.trackOrder(slug, b) });

export const useCreateEnquiry = (slug: string) =>
  useMutation({ mutationFn: (b: Parameters<typeof storefrontApi.createEnquiry>[1]) => storefrontApi.createEnquiry(slug, b) });

export function useInvalidateStorefront(slug: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: sfKeys.all(slug) });
}
