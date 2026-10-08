import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { FABRICS, GENDERS, PRODUCT_STATUSES, PRODUCT_TYPES, toMinor, type Fabric, type Gender, type ProductStatus, type ProductType } from '@vastra/shared';
import { Errors } from '@/common/errors';

export const CSV_COLUMNS = [
  'product_name',
  'sku',
  'category',
  'colour',
  'size',
  'price',
  'mrp',
  'stock',
  'description',
  'gender',
  'fabric',
  'brand',
  'type',
  'status',
] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];
export const REQUIRED_COLUMNS: readonly CsvColumn[] = ['product_name', 'price'];

export const MAX_ROWS = 5000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._\-/]{0,63}$/;

export interface ParsedRowData {
  productName: string;
  sku?: string;
  category?: string;
  colour?: string;
  size?: string;
  priceMinor: number;
  mrpMinor: number;
  stock: number;
  description?: string;
  gender?: Gender;
  fabric?: Fabric;
  brand?: string;
  type: ProductType;
  status: ProductStatus;
}

export interface RawRow {
  row: number; // spreadsheet line number (header = 1)
  cells: Partial<Record<CsvColumn, string>>;
}

/** Neutralise spreadsheet formula injection for text cells we emit. */
const safeCell = (v: unknown): string => {
  const s = v === undefined || v === null ? '' : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

const BOM = '﻿';

export function buildTemplateCsv(): string {
  const examples: Array<Record<CsvColumn, string>> = [
    { product_name: 'Kanjivaram Silk Saree', sku: 'KSS-RED-FREE', category: 'Sarees', colour: 'Red', size: 'FREE', price: '12999', mrp: '14999', stock: '5', description: 'Pure silk saree with zari border', gender: 'WOMEN', fabric: 'SILK', brand: 'Vastra Weaves', type: 'SAREE', status: 'ACTIVE' },
    { product_name: 'Cotton Casual Shirt', sku: 'CCS-BLU-M', category: 'Shirts', colour: 'Blue', size: 'M', price: '899', mrp: '1299', stock: '20', description: 'Slim fit cotton shirt', gender: 'MEN', fabric: 'COTTON', brand: 'Urban Co', type: 'GARMENT', status: 'ACTIVE' },
  ];
  return BOM + stringify([CSV_COLUMNS as unknown as string[], ...examples.map((e) => CSV_COLUMNS.map((c) => e[c]))]);
}

export function toCsvLine(values: unknown[]): string {
  return stringify([values.map(safeCell)]);
}
export const csvHeaderLine = (): string => BOM + stringify([CSV_COLUMNS as unknown as string[]]);

/** Parses an uploaded CSV buffer into raw rows. Throws 400 for structural problems. */
export function parseCsv(buffer: Buffer): RawRow[] {
  if (!buffer?.length) throw Errors.badRequest('VALIDATION_ERROR', 'The uploaded CSV file is empty');
  let records: Record<string, string>[];
  try {
    records = parse(buffer, {
      columns: (header: string[]) => header.map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_')),
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      to: MAX_ROWS + 1,
    }) as Record<string, string>[];
  } catch (err) {
    throw Errors.badRequest('VALIDATION_ERROR', `Could not read the CSV file: ${(err as Error).message}`);
  }
  if (!records.length) throw Errors.badRequest('VALIDATION_ERROR', 'The CSV file has no data rows');
  if (records.length > MAX_ROWS) throw Errors.badRequest('VALIDATION_ERROR', `The CSV file has more than ${MAX_ROWS} rows. Split it into smaller files.`);
  const present = new Set(Object.keys(records[0]));
  const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c));
  if (missing.length) throw Errors.badRequest('VALIDATION_ERROR', `Missing required column(s): ${missing.join(', ')}`, { missingColumns: missing });

  return records.map((rec, i) => {
    const cells: Partial<Record<CsvColumn, string>> = {};
    for (const c of CSV_COLUMNS) {
      const v = rec[c];
      if (typeof v === 'string' && v.trim() !== '') cells[c] = v.trim();
    }
    return { row: i + 2, cells };
  });
}

const parseMoney = (s: string): number | null => {
  const t = s.replace(/^(₹|rs\.?|inr)\s*/i, '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return toMinor(Number(t));
};

const oneOf = <T extends string>(list: readonly T[], v: string): T | undefined => list.find((x) => x === v.trim().toUpperCase().replace(/[\s-]+/g, '_'));

const STANDARD = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE']);

/** Pure per-row validation (no DB). */
export function validateRow(raw: RawRow): { errors: string[]; data: ParsedRowData } {
  const c = raw.cells;
  const errors: string[] = [];

  const productName = c.product_name ?? '';
  if (!productName) errors.push('product_name is required');
  else if (productName.length > 200) errors.push('product_name must be at most 200 characters');

  let priceMinor = 0;
  if (!c.price) errors.push('price is required');
  else {
    const p = parseMoney(c.price);
    if (p === null) errors.push('price must be a number (e.g. 1299 or 1299.50)');
    else priceMinor = p;
  }

  let mrpMinor = priceMinor;
  if (c.mrp) {
    const m = parseMoney(c.mrp);
    if (m === null) errors.push('mrp must be a number');
    else {
      mrpMinor = m;
      if (priceMinor && m < priceMinor) errors.push('mrp must be greater than or equal to price');
    }
  }

  let stock = 0;
  if (c.stock) {
    if (!/^\d+$/.test(c.stock.replace(/,/g, ''))) errors.push('stock must be a whole number (0 or more)');
    else stock = Number(c.stock.replace(/,/g, ''));
    if (stock > 1_000_000) errors.push('stock is too large');
  }

  if (c.sku && !SKU_PATTERN.test(c.sku)) errors.push('sku may only contain letters, numbers, dot, dash, underscore, slash (max 64 chars)');

  let gender: Gender | undefined;
  if (c.gender) {
    gender = oneOf(GENDERS, c.gender);
    if (!gender) errors.push(`gender must be one of ${GENDERS.join(', ')}`);
  }
  let fabric: Fabric | undefined;
  if (c.fabric) {
    fabric = oneOf(FABRICS, c.fabric);
    if (!fabric) errors.push(`fabric must be one of ${FABRICS.join(', ')}`);
  }
  let type: ProductType = 'GARMENT';
  if (c.type) {
    const t = oneOf(PRODUCT_TYPES, c.type);
    if (!t) errors.push(`type must be one of ${PRODUCT_TYPES.join(', ')}`);
    else type = t;
  }
  let status: ProductStatus = 'DRAFT';
  if (c.status) {
    const s = oneOf(PRODUCT_STATUSES, c.status);
    if (!s) errors.push(`status must be one of ${PRODUCT_STATUSES.join(', ')}`);
    else status = s;
  }
  if (c.description && c.description.length > 10000) errors.push('description is too long (max 10000 characters)');

  const size = c.size ? (STANDARD.has(c.size.toUpperCase()) ? c.size.toUpperCase() : c.size) : undefined;

  return {
    errors,
    data: { productName, sku: c.sku, category: c.category, colour: c.colour, size, priceMinor, mrpMinor, stock, description: c.description, gender, fabric, brand: c.brand, type, status },
  };
}
