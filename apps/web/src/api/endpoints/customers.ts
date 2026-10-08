import { api, http } from '../client';
import type {
  CreateCustomerPayload, Customer, CustomerDetail, CustomerListQuery, UpdateCustomerPayload,
} from '@/types/insights';

export const customersApi = {
  list: async (params: CustomerListQuery) => {
    const res = await api.get<Customer[]>('/customers', { params });
    return { items: res.data, meta: res.meta };
  },
  get: async (id: string) => (await api.get<CustomerDetail>(`/customers/${id}`)).data,
  create: async (body: CreateCustomerPayload) => (await api.post<Customer>('/customers', body)).data,
  update: async (id: string, body: UpdateCustomerPayload) => (await api.patch<Customer>(`/customers/${id}`, body)).data,
  /** Returns the CSV as a Blob. */
  exportCsv: async (params: Pick<CustomerListQuery, 'q' | 'tag' | 'sort' | 'dir'>) =>
    (await http.get<Blob>('/customers/export', { params, responseType: 'blob' })).data,
};
