import type { Request } from 'express';
import { asyncHandler } from '@/common/asyncHandler';
import { audit } from '@/common/audit';
import { Errors } from '@/common/errors';
import { ok } from '@/common/response';
import { tenantFilter } from '@/common/tenant';
import { invalidateShopCache } from '@/common/utils/cache';
import { assertFeature } from '@/modules/subscriptions/limits.service';
import { buildTemplateCsv } from './bulk.csv';
import { streamExport } from './bulk.export.service';
import { importCsv, validateCsv } from './bulk.import.service';
import * as ops from './bulk.ops.service';
import type { CsvOptions } from './bulk.schemas';

const sid = (req: Request) => tenantFilter(req).shopId;
const file = (req: Request): Buffer => {
  if (!req.file) throw Errors.badRequest('VALIDATION_ERROR', 'CSV file is required (multipart field "file")');
  return req.file.buffer;
};

export const template = asyncHandler(async (req, res) => {
  await assertFeature(String(sid(req)), 'bulkImport');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="vastra-products-template.csv"');
  res.status(200).send(buildTemplateCsv());
});

export const validate = asyncHandler(async (req, res) => {
  await assertFeature(String(sid(req)), 'bulkImport');
  ok(res, await validateCsv(sid(req), file(req), req.body as CsvOptions), 'Validation complete');
});

export const importProducts = asyncHandler(async (req, res) => {
  const shopId = sid(req);
  await assertFeature(String(shopId), 'bulkImport');
  const result = await importCsv(shopId, req.auth?.userId, file(req), req.body as CsvOptions);
  invalidateShopCache(String(shopId));
  void audit(req, {
    action: 'bulk.import',
    entity: 'Product',
    meta: { filename: req.file?.originalname, totalRows: result.totalRows, createdProducts: result.created.products, createdVariants: result.created.variants, updatedVariants: result.updated.variants, skipped: result.skipped, errors: result.errors.length },
  });
  ok(res, result, 'Import complete');
});

export const exportProducts = asyncHandler(async (req, res) => {
  const shopId = sid(req);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="vastra-products-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  const rows = await streamExport(shopId, res);
  void audit(req, { action: 'bulk.export', entity: 'Product', meta: { rows } });
  res.end();
});

export const price = asyncHandler(async (req, res) => {
  const shopId = sid(req);
  const r = await ops.bulkPrice(shopId, req.body);
  invalidateShopCache(String(shopId));
  void audit(req, { action: 'bulk.price', entity: 'Product', meta: { mode: req.body.mode, value: req.body.value, target: req.body.target, ...r } });
  ok(res, r, 'Prices updated');
});

export const stock = asyncHandler(async (req, res) => {
  const shopId = sid(req);
  const r = await ops.bulkStock(shopId, req.auth?.userId, req.body, req.ip);
  invalidateShopCache(String(shopId));
  void audit(req, { action: 'bulk.stock', entity: 'ProductVariant', meta: { total: r.total, succeeded: r.succeeded, failed: r.failed } });
  ok(res, r, 'Stock updated');
});

export const status = asyncHandler(async (req, res) => {
  const shopId = sid(req);
  const r = await ops.bulkStatus(shopId, req.body);
  invalidateShopCache(String(shopId));
  void audit(req, { action: 'bulk.status', entity: 'Product', meta: { status: req.body.status, ...r } });
  ok(res, r, 'Status updated');
});
