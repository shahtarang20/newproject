import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '@/api/endpoints/shop';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/auth.store';
import type { ShopDto, UpdateShopInput } from '@/types/settings';

export function useShopQuery() {
  return useQuery({ queryKey: queryKeys.shop.detail(), queryFn: shopApi.get, staleTime: 30_000 });
}

/** PATCH /shop; keeps the query cache and the auth store's shop summary in sync. */
export function useUpdateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateShopInput) => shopApi.update(input),
    onSuccess: (shop) => {
      syncShop(qc, shop);
    },
  });
}

export function syncShop(qc: ReturnType<typeof useQueryClient>, shop: ShopDto) {
  qc.setQueryData(queryKeys.shop.detail(), shop);
  const current = useAuthStore.getState().shop;
  if (current) {
    useAuthStore.getState().setShop({
      ...current,
      name: shop.name,
      slug: shop.slug,
      logoUrl: shop.logoUrl,
      businessType: shop.businessType,
      theme: shop.theme ? { templateId: shop.theme.templateId } : current.theme,
    });
  }
}
