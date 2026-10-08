import { api, http } from '../client';
import type {
  BulkCsvOptions, BulkImportResult, BulkPriceBody, BulkStockBody, BulkStockResult, BulkValidateResult,
} from '@/types/catalog';

function csvForm(file: File, o: BulkCsvOptions) {
  const f = new FormData();
  f.append('file', file);
  f.append('createMissingCategories', String(o.createMissingCategories));
  f.append('duplicateSku', o.duplicateSku);
  if (o.abortOnErrors !== undefined) f.append('abortOnErrors', String(o.abortOnErrors));
  return f;
}

async function downloadCsv(path: string, filename: string) {
  const res = await http.get<Blob>(path, { responseType: 'blob', timeout: 120_000 });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const bulkApi = {
  downloadTemplate: () => downloadCsv('/bulk/products/template', 'vastra-products-template.csv'),
  downloadExport: () => downloadCsv('/bulk/products/export', `vastra-products-${new Date().toISOString().slice(0, 10)}.csv`),
  validate: async (file: File, o: BulkCsvOptions) =>
    (await api.upload<BulkValidateResult>('/bulk/products/validate', csvForm(file, o), undefined, { timeout: 120_000 })).data,
  import: async (file: File, o: BulkCsvOptions, onProgress?: (pct: number) => void) =>
    (await api.upload<BulkImportResult>('/bulk/products/import', csvForm(file, o), onProgress, { timeout: 10 * 60_000 })).data,
  price: async (body: BulkPriceBody) => (await api.post<{ productsMatched: number; variantsUpdated: number }>('/bulk/price', body)).data,
  stock: async (body: BulkStockBody) => (await api.post<BulkStockResult>('/bulk/stock', body)).data,
  status: async (body: { productIds: string[]; status: string }) =>
    (await api.post<{ requested: number; matched: number; updated: number }>('/bulk/status', body)).data,
};
