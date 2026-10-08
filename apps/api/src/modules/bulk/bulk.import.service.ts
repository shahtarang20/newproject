import { Types } from 'mongoose';
import { customAlphabet } from 'nanoid';
import { Errors } from '@/common/errors';
import { slugify, uniqueSlug } from '@/common/slug';
import { Category, InventoryTransaction, Product, ProductVariant } from '@/database/models';
import { assertWithinLimit, getUsageSummary, incrementUsage } from '@/modules/subscriptions/limits.service';
import { recomputeProductSummary } from '@/modules/products/products.service';
import { adjustVariantStock } from './bulk.inventory';
import { parseCsv, validateRow, type ParsedRowData } from './bulk.csv';
import type { CsvOptions } from './bulk.schemas';
import { chunk, mapLimit } from './bulk.util';

const suffix = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 4);
const CHUNK = 100;

export interface RowResult {
  row: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** What import would do with this row. */
  action: 'create' | 'update' | 'skip' | 'invalid';
  data: ParsedRowData;
}

interface Group {
  key: string; // product slug base
  name: string;
  rows: RowResult[]; // valid rows only
  existingProductId?: Types.ObjectId;
}

interface Analysis {
  rows: RowResult[];
  groups: Group[];
  categories: Map<string, Types.ObjectId>; // lower name/slug → id
  missingCategories: string[];
  skuToVariant: Map<string, { id: Types.ObjectId; productId: Types.ObjectId }>;
  summary: {
    productsToCreate: number;
    productsToUpdate: number;
    variantsToCreate: number;
    variantsToUpdate: number;
    rowsToSkip: number;
    categoriesToCreate: string[];
    productLimit: { limit: number | null; used: number; newProducts: number; headroom: number | null; exceeds: boolean };
    canImport: boolean;
  };
}

const vKey = (colour?: string, size?: string): string => `${(colour ?? '').toLowerCase()}|${(size ?? '').toLowerCase()}`;

export async function analyse(shopId: Types.ObjectId, buffer: Buffer, opts: CsvOptions): Promise<Analysis> {
  const raws = parseCsv(buffer);
  const rows: RowResult[] = raws.map((r) => {
    const { errors, data } = validateRow(r);
    return { row: r.row, valid: errors.length === 0, errors, warnings: [], action: errors.length ? 'invalid' : 'create', data };
  });
  const fail = (r: RowResult, msg: string): void => {
    r.errors.push(msg);
    r.valid = false;
    r.action = 'invalid';
  };

  // ---- duplicate SKUs inside the file
  const seenSku = new Map<string, number>();
  for (const r of rows) {
    const s = r.data.sku?.toLowerCase();
    if (!s) continue;
    const first = seenSku.get(s);
    if (first !== undefined) fail(r, `Duplicate sku "${r.data.sku}" (also on row ${first})`);
    else seenSku.set(s, r.row);
  }

  // ---- DB lookups (tenant scoped)
  const skus = [...new Set(rows.filter((r) => r.data.sku).map((r) => r.data.sku as string))];
  const slugs = [...new Set(rows.filter((r) => r.data.productName).map((r) => slugify(r.data.productName) || 'item'))];
  const [cats, dbVariants, dbProducts] = await Promise.all([
    Category.find({ shopId }).select('name slug').lean(),
    skus.length ? ProductVariant.find({ shopId, sku: { $in: skus } }).select('sku productId').lean() : Promise.resolve([]),
    Product.find({ shopId, slug: { $in: slugs } }).select('slug deletedAt').lean(),
  ]);

  const categories = new Map<string, Types.ObjectId>();
  for (const c of cats) {
    categories.set(c.name.toLowerCase(), c._id);
    categories.set(c.slug.toLowerCase(), c._id);
  }
  const skuToVariant = new Map(dbVariants.map((v) => [String(v.sku).toLowerCase(), { id: v._id, productId: v.productId }]));
  const liveProducts = new Map(dbProducts.filter((p) => !p.deletedAt).map((p) => [p.slug, p._id]));

  // ---- category + DB sku checks
  const missing = new Set<string>();
  for (const r of rows) {
    if (!r.valid) continue;
    if (r.data.category && !categories.has(r.data.category.toLowerCase()) && !categories.has(slugify(r.data.category))) {
      if (opts.createMissingCategories) {
        missing.add(r.data.category.trim());
        r.warnings.push(`Category "${r.data.category}" will be created`);
      } else fail(r, `Category "${r.data.category}" does not exist (enable "create missing categories" or add it first)`);
    }
    const dbHit = r.data.sku ? skuToVariant.get(r.data.sku.toLowerCase()) : undefined;
    if (r.valid && dbHit) {
      if (opts.duplicateSku === 'error') fail(r, `sku "${r.data.sku}" already exists in your inventory`);
      else if (opts.duplicateSku === 'skip') {
        r.action = 'skip';
        r.warnings.push(`sku "${r.data.sku}" already exists - row will be skipped`);
      } else {
        r.action = 'update';
        r.warnings.push(`sku "${r.data.sku}" already exists - price/MRP/stock will be updated`);
      }
    }
  }
  const missingCategories = [...new Map([...missing].map((m) => [m.toLowerCase(), m])).values()];

  // ---- group rows by product
  const groupMap = new Map<string, Group>();
  for (const r of rows) {
    if (!r.valid || r.action === 'skip' || r.action === 'update') continue;
    const key = slugify(r.data.productName) || 'item';
    let g = groupMap.get(key);
    if (!g) {
      g = { key, name: r.data.productName, rows: [], existingProductId: liveProducts.get(key) };
      groupMap.set(key, g);
    }
    g.rows.push(r);
  }

  // existing variants of target products (colour+size collisions)
  const existingIds = [...groupMap.values()].map((g) => g.existingProductId).filter((x): x is Types.ObjectId => !!x);
  const existingVariants = existingIds.length
    ? await ProductVariant.find({ shopId, productId: { $in: existingIds } }).select('productId colour.name size').lean()
    : [];
  const existingKeys = new Set(existingVariants.map((v) => `${v.productId}:${vKey(v.colour?.name, v.size)}`));

  for (const g of groupMap.values()) {
    const seen = new Set<string>();
    for (const r of g.rows) {
      const k = vKey(r.data.colour, r.data.size);
      if (seen.has(k)) fail(r, `Duplicate colour/size combination for product "${g.name}"`);
      else if (g.existingProductId && existingKeys.has(`${g.existingProductId}:${k}`)) fail(r, `Variant (${r.data.colour ?? '-'} / ${r.data.size ?? '-'}) already exists on product "${g.name}"`);
      seen.add(k);
    }
    g.rows = g.rows.filter((r) => r.valid);
  }
  const groups = [...groupMap.values()].filter((g) => g.rows.length > 0);

  // ---- plan limit headroom
  const productRow = (await getUsageSummary(shopId)).find((u) => u.key === 'products');
  const newProducts = groups.filter((g) => !g.existingProductId).length;
  const limit = productRow?.limit ?? null;
  const used = productRow?.used ?? 0;
  const headroom = limit === null ? null : Math.max(0, limit - used);
  const exceeds = limit !== null && newProducts > headroom!;
  if (exceeds) {
    for (const g of groups.filter((x) => !x.existingProductId)) for (const r of g.rows) r.warnings.push('New products in this file exceed your plan product limit');
  }

  return {
    rows,
    groups,
    categories,
    missingCategories,
    skuToVariant,
    summary: {
      productsToCreate: newProducts,
      productsToUpdate: groups.length - newProducts,
      variantsToCreate: groups.reduce((s, g) => s + g.rows.length, 0),
      variantsToUpdate: rows.filter((r) => r.valid && r.action === 'update').length,
      rowsToSkip: rows.filter((r) => r.action === 'skip').length,
      categoriesToCreate: missingCategories,
      productLimit: { limit, used, newProducts, headroom, exceeds },
      canImport: !exceeds && rows.some((r) => r.valid && r.action !== 'skip'),
    },
  };
}

export async function validateCsv(shopId: Types.ObjectId, buffer: Buffer, opts: CsvOptions) {
  const a = await analyse(shopId, buffer, opts);
  const validRows = a.rows.filter((r) => r.valid).length;
  return {
    totalRows: a.rows.length,
    validRows,
    invalidRows: a.rows.length - validRows,
    rows: a.rows.map((r) => ({ row: r.row, valid: r.valid, errors: r.errors, warnings: r.warnings, action: r.action, data: r.data })),
    summary: a.summary,
  };
}

export interface ImportResult {
  created: { products: number; variants: number; categories: number; openingStockTransactions: number };
  updated: { products: number; variants: number };
  skipped: number;
  errors: Array<{ row: number; errors: string[] }>;
  totalRows: number;
}

export async function importCsv(shopId: Types.ObjectId, userId: string | undefined, buffer: Buffer, opts: CsvOptions): Promise<ImportResult> {
  const a = await analyse(shopId, buffer, opts);
  const errors = a.rows.filter((r) => !r.valid).map((r) => ({ row: r.row, errors: r.errors }));
  if (opts.abortOnErrors && errors.length) {
    throw Errors.badRequest('VALIDATION_ERROR', `${errors.length} row(s) are invalid. Nothing was imported.`, { errors });
  }
  const newGroups = a.groups.filter((g) => !g.existingProductId);
  // Abort cleanly (no partial overflow) when the whole batch of new products does not fit the plan.
  if (newGroups.length) await assertWithinLimit(shopId, 'products', newGroups.length);

  const result: ImportResult = {
    created: { products: 0, variants: 0, categories: 0, openingStockTransactions: 0 },
    updated: { products: 0, variants: 0 },
    skipped: a.rows.filter((r) => r.action === 'skip').length,
    errors,
    totalRows: a.rows.length,
  };
  const by = userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined;

  // ---- categories
  for (const name of a.missingCategories) {
    const slug = await uniqueSlug(Category, name, { shopId });
    const cat = await Category.create({ shopId, name, slug, sortOrder: 0, isActive: true });
    a.categories.set(name.toLowerCase(), cat._id);
    a.categories.set(slug, cat._id);
    result.created.categories++;
  }
  const catId = (name?: string): Types.ObjectId | null =>
    name ? (a.categories.get(name.toLowerCase()) ?? a.categories.get(slugify(name)) ?? null) : null;

  const affected = new Set<string>();
  const failChunk = (g: Group[], msg: string): void => {
    for (const grp of g) for (const r of grp.rows) result.errors.push({ row: r.row, errors: [msg] });
  };

  // ---- new products, in batches
  const taken = new Set<string>();
  for (const part of chunk(newGroups, CHUNK)) {
    const existingSlugs = new Set(
      (await Product.find({ shopId, slug: { $in: part.map((g) => g.key) } }).select('slug').lean()).map((p) => p.slug),
    );
    const productDocs: Record<string, unknown>[] = [];
    const variantDocs: Record<string, unknown>[] = [];
    const txnDocs: Record<string, unknown>[] = [];
    for (const g of part) {
      let slug = g.key;
      while (existingSlugs.has(slug) || taken.has(slug)) slug = `${g.key}-${suffix()}`;
      taken.add(slug);
      const first = g.rows[0].data;
      const productId = new Types.ObjectId();
      const prices = g.rows.map((r) => r.data.priceMinor);
      const colours = [...new Set(g.rows.map((r) => r.data.colour).filter((x): x is string => !!x))];
      const sizes = [...new Set(g.rows.map((r) => r.data.size).filter((x): x is string => !!x))];
      const firstOf = <K extends keyof ParsedRowData>(k: K): ParsedRowData[K] | undefined => g.rows.map((r) => r.data[k]).find((v) => v !== undefined && v !== '');
      const type = first.type;
      const fabric = firstOf('fabric');
      productDocs.push({
        _id: productId,
        shopId,
        type,
        name: g.name,
        slug,
        sku: g.rows.length === 1 ? first.sku : undefined,
        brand: firstOf('brand'),
        description: firstOf('description'),
        categoryId: catId(firstOf('category')),
        gender: firstOf('gender'),
        fabric,
        ...(type === 'SAREE' ? { sareeAttrs: { workTypes: [], fabric } } : {}),
        pricing: { minSellingMinor: Math.min(...prices), maxSellingMinor: Math.max(...prices), mrpMinor: Math.max(...g.rows.map((r) => r.data.mrpMinor)), taxPercent: 0, hidePrice: false },
        colours,
        sizes,
        stockTotal: g.rows.reduce((s, r) => s + r.data.stock, 0),
        status: first.status,
      });
      for (const r of g.rows) {
        const variantId = new Types.ObjectId();
        variantDocs.push({
          _id: variantId,
          shopId,
          productId,
          sku: r.data.sku,
          colour: r.data.colour ? { name: r.data.colour } : undefined,
          size: r.data.size,
          sellingPriceMinor: r.data.priceMinor,
          mrpMinor: r.data.mrpMinor,
          stock: r.data.stock,
          isActive: true,
        });
        if (r.data.stock > 0) {
          txnDocs.push({ shopId, productId, variantId, type: 'PURCHASE', quantity: r.data.stock, balanceAfter: r.data.stock, reason: 'Opening stock (bulk import)', createdBy: by });
        }
      }
    }
    const productIds = productDocs.map((p) => p._id as Types.ObjectId);
    try {
      await Product.insertMany(productDocs, { ordered: true });
      await ProductVariant.insertMany(variantDocs, { ordered: true });
      if (txnDocs.length) await InventoryTransaction.insertMany(txnDocs, { ordered: true });
    } catch (err) {
      // roll the batch back so a failure never leaves half-created products
      await Promise.all([
        Product.deleteMany({ shopId, _id: { $in: productIds } }),
        ProductVariant.deleteMany({ shopId, productId: { $in: productIds } }),
        InventoryTransaction.deleteMany({ shopId, productId: { $in: productIds }, reason: 'Opening stock (bulk import)', createdAt: { $gte: new Date(Date.now() - 3_600_000) } }),
      ]);
      failChunk(part, `Batch failed and was rolled back: ${(err as Error).message}`);
      continue;
    }
    result.created.products += productDocs.length;
    result.created.variants += variantDocs.length;
    result.created.openingStockTransactions += txnDocs.length;
    productIds.forEach((p) => affected.add(String(p)));
  }
  if (result.created.products) await incrementUsage(shopId, 'products', result.created.products);

  // ---- variants appended to existing products
  const existingGroups = a.groups.filter((g) => g.existingProductId);
  for (const part of chunk(existingGroups, CHUNK)) {
    const variantDocs: Record<string, unknown>[] = [];
    const txnDocs: Record<string, unknown>[] = [];
    for (const g of part) {
      for (const r of g.rows) {
        const variantId = new Types.ObjectId();
        variantDocs.push({ _id: variantId, shopId, productId: g.existingProductId, sku: r.data.sku, colour: r.data.colour ? { name: r.data.colour } : undefined, size: r.data.size, sellingPriceMinor: r.data.priceMinor, mrpMinor: r.data.mrpMinor, stock: r.data.stock, isActive: true });
        if (r.data.stock > 0) txnDocs.push({ shopId, productId: g.existingProductId, variantId, type: 'PURCHASE', quantity: r.data.stock, balanceAfter: r.data.stock, reason: 'Opening stock (bulk import)', createdBy: by });
      }
    }
    const ids = variantDocs.map((v) => v._id as Types.ObjectId);
    try {
      await ProductVariant.insertMany(variantDocs, { ordered: true });
      if (txnDocs.length) await InventoryTransaction.insertMany(txnDocs, { ordered: true });
    } catch (err) {
      await ProductVariant.deleteMany({ shopId, _id: { $in: ids } });
      await InventoryTransaction.deleteMany({ shopId, variantId: { $in: ids } });
      failChunk(part, `Batch failed and was rolled back: ${(err as Error).message}`);
      continue;
    }
    result.created.variants += variantDocs.length;
    result.created.openingStockTransactions += txnDocs.length;
    part.forEach((g) => affected.add(String(g.existingProductId)));
  }

  // ---- update existing variants by sku (duplicateSku = update)
  const updates = a.rows.filter((r) => r.valid && r.action === 'update' && r.data.sku);
  for (const part of chunk(updates, CHUNK)) {
    await ProductVariant.bulkWrite(
      part.map((r) => ({
        updateOne: {
          filter: { shopId, _id: a.skuToVariant.get(r.data.sku!.toLowerCase())!.id },
          update: { $set: { sellingPriceMinor: r.data.priceMinor, mrpMinor: r.data.mrpMinor } },
        },
      })),
      { ordered: false },
    );
    for (const r of part) {
      const v = a.skuToVariant.get(r.data.sku!.toLowerCase())!;
      affected.add(String(v.productId));
      result.updated.variants++;
      try {
        await adjustVariantStock(shopId, userId, { variantId: String(v.id), mode: 'SET', quantity: r.data.stock, reason: 'Bulk import stock update' });
      } catch (err) {
        result.errors.push({ row: r.row, errors: [`Price updated but stock update failed: ${(err as Error).message}`] });
      }
    }
  }

  result.updated.products = Math.max(0, affected.size - result.created.products);
  await mapLimit([...affected], 8, (id) => recomputeProductSummary(id, String(shopId)));
  return result;
}
