import { api } from '../client';
import type {
  AdjustStockPayload, AdjustStockResult, InventoryListQuery, InventoryListResult, InventoryTransaction, TransactionsQuery,
} from '@/types/commerce';

export const inventoryApi = {
  list: async (params: InventoryListQuery) => {
    const res = await api.get<InventoryListResult>('/inventory', { params });
    return { ...res.data, meta: res.meta };
  },
  adjust: async (body: AdjustStockPayload) => (await api.post<AdjustStockResult>('/inventory/adjust', body)).data,
  transactions: async (params: TransactionsQuery) => {
    const res = await api.get<InventoryTransaction[]>('/inventory/transactions', { params });
    return { items: res.data, meta: res.meta };
  },
};
