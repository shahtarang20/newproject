import { z } from 'zod';
import type { Fabric, Gender, Occasion, ProductType, SareeType, SareeWorkType, Season } from '@vastra/shared';
import { fromMinor, toMinor } from '@vastra/shared';
import type { Product, Variant, VariantPayload } from '@/types/catalog';

export interface VariantRow {
  _k?: string;
  /** Server id once persisted. */
  id: string;
  colourName: string;
  colourHex: string;
  size: string;
  sku: string;
  price: string;
  mrp: string;
  cost: string;
  stock: string;
  lowStock: string;
  barcode: string;
  isActive: boolean;
  imageMediaId: string;
}

export interface ColourOption { name: string; hex: string }

export interface WizardValues {
  type: ProductType;
  name: string;
  sku: string;
  slug: string;
  brand: string;
  description: string;
  shortDescription: string;
  gender: Gender | '';
  fabric: Fabric | '';
  season: Season | '';
  occasions: Occasion[];
  tags: string[];
  categoryId: string;
  subcategoryId: string;
  saree: {
    sareeType: SareeType | ''; lengthMeters: string; blouseIncluded: boolean; blouseDescription: string;
    workTypes: SareeWorkType[]; border: string; pallu: string; weave: string; careInstructions: string;
  };
  garment: { fit: string; pattern: string; sleeveType: string; neckType: string; fabricComposition: string; washCare: string };
  basePrice: string;
  baseMrp: string;
  taxPercent: string;
  hidePrice: boolean;
  lowStockThreshold: string;
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  /** Matrix generator inputs (kept in the form so nothing is lost when switching steps). */
  colours: ColourOption[];
  sizes: string[];
  variants: VariantRow[];
}

export const emptyValues = (): WizardValues => ({
  type: 'GARMENT', name: '', sku: '', slug: '', brand: '', description: '', shortDescription: '',
  gender: '', fabric: '', season: '', occasions: [], tags: [], categoryId: '', subcategoryId: '',
  saree: { sareeType: '', lengthMeters: '', blouseIncluded: true, blouseDescription: '', workTypes: [], border: '', pallu: '', weave: '', careInstructions: '' },
  garment: { fit: '', pattern: '', sleeveType: '', neckType: '', fabricComposition: '', washCare: '' },
  basePrice: '', baseMrp: '', taxPercent: '', hidePrice: false, lowStockThreshold: '',
  seoTitle: '', seoDescription: '', isFeatured: false, colours: [], sizes: [], variants: [],
});

export const COLOUR_PRESETS: ColourOption[] = [
  { name: 'Red', hex: '#D32F2F' }, { name: 'Maroon', hex: '#7A1F2B' }, { name: 'Pink', hex: '#EC4899' }, { name: 'Orange', hex: '#F97316' },
  { name: 'Yellow', hex: '#FACC15' }, { name: 'Green', hex: '#16A34A' }, { name: 'Teal', hex: '#0D9488' }, { name: 'Blue', hex: '#2563EB' },
  { name: 'Navy', hex: '#1E3A8A' }, { name: 'Purple', hex: '#7C3AED' }, { name: 'Brown', hex: '#78350F' }, { name: 'Beige', hex: '#D6C3A1' },
  { name: 'White', hex: '#FFFFFF' }, { name: 'Grey', hex: '#6B7280' }, { name: 'Black', hex: '#111111' }, { name: 'Gold', hex: '#C9A24A' },
];

export const GARMENT_FITS = ['Regular', 'Slim', 'Relaxed', 'Oversized', 'Tailored'];
export const SLEEVES = ['Sleeveless', 'Short', 'Three-quarter', 'Full', 'Cap', 'Bell'];
export const NECKS = ['Round', 'V-neck', 'Collar', 'Mandarin', 'Boat', 'Square', 'Halter'];
export const PATTERNS = ['Solid', 'Printed', 'Striped', 'Checked', 'Floral', 'Embroidered', 'Geometric'];

// ------------------------------------------------------------------ conversions
const num = (s: string): number | undefined => {
  if (s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const fmtMajor = (minor?: number | null): string => (minor == null ? '' : String(fromMinor(minor)));

export const variantKey = (r: { colourName: string; size: string }) => `${r.colourName.trim().toLowerCase()}|${r.size.trim().toLowerCase()}`;

export function variantToRow(v: Variant): VariantRow {
  return {
    id: v.id,
    colourName: v.colour?.name ?? '',
    colourHex: v.colour?.hex ?? '#9CA3AF',
    size: v.size ?? '',
    sku: v.sku ?? '',
    price: fmtMajor(v.sellingPriceMinor),
    mrp: fmtMajor(v.mrpMinor),
    cost: fmtMajor(v.costPriceMinor),
    stock: String(v.stock ?? 0),
    lowStock: v.lowStockThreshold == null ? '' : String(v.lowStockThreshold),
    barcode: v.barcode ?? '',
    isActive: v.isActive !== false,
    imageMediaId: v.imageMediaId ?? '',
  };
}

export function productToValues(p: Product): WizardValues {
  const base = emptyValues();
  const cat = p.category;
  const rows = (p.variants ?? []).map(variantToRow);
  const colours: ColourOption[] = [];
  const sizes: string[] = [];
  for (const r of rows) {
    if (r.colourName && !colours.some((c) => c.name.toLowerCase() === r.colourName.toLowerCase())) colours.push({ name: r.colourName, hex: r.colourHex });
    if (r.size && !sizes.some((s) => s.toLowerCase() === r.size.toLowerCase())) sizes.push(r.size);
  }
  const firstActive = (p.variants ?? []).find((v) => v.isActive);
  return {
    ...base,
    type: p.type,
    name: p.name,
    sku: p.sku ?? '',
    slug: p.slug ?? '',
    brand: p.brand ?? '',
    description: p.description ?? '',
    shortDescription: p.shortDescription ?? '',
    gender: p.gender ?? '',
    fabric: p.fabric ?? '',
    season: p.season ?? '',
    occasions: p.occasions ?? [],
    tags: p.tags ?? [],
    categoryId: cat?.parentId ? cat.parentId : (cat?.id ?? p.categoryId ?? ''),
    subcategoryId: cat?.parentId ? cat.id : '',
    saree: {
      sareeType: p.sareeAttrs?.sareeType ?? '',
      lengthMeters: p.sareeAttrs?.lengthMeters != null ? String(p.sareeAttrs.lengthMeters) : '',
      blouseIncluded: p.sareeAttrs?.blouseIncluded ?? true,
      blouseDescription: p.sareeAttrs?.blouseDescription ?? '',
      workTypes: p.sareeAttrs?.workTypes ?? [],
      border: p.sareeAttrs?.border ?? '',
      pallu: p.sareeAttrs?.pallu ?? '',
      weave: p.sareeAttrs?.weave ?? '',
      careInstructions: p.sareeAttrs?.careInstructions ?? '',
    },
    garment: {
      fit: p.garmentAttrs?.fit ?? '', pattern: p.garmentAttrs?.pattern ?? '', sleeveType: p.garmentAttrs?.sleeveType ?? '',
      neckType: p.garmentAttrs?.neckType ?? '', fabricComposition: p.garmentAttrs?.fabricComposition ?? '', washCare: p.garmentAttrs?.washCare ?? '',
    },
    basePrice: fmtMajor(firstActive?.sellingPriceMinor ?? p.pricing?.minSellingMinor),
    baseMrp: fmtMajor(firstActive?.mrpMinor ?? p.pricing?.mrpMinor),
    taxPercent: p.pricing?.taxPercent != null ? String(p.pricing.taxPercent) : '',
    hidePrice: p.pricing?.hidePrice ?? false,
    lowStockThreshold: p.lowStockThreshold != null ? String(p.lowStockThreshold) : '',
    seoTitle: p.seo?.title ?? '',
    seoDescription: p.seo?.description ?? '',
    isFeatured: p.isFeatured ?? false,
    colours,
    sizes,
    variants: rows,
  };
}

/** Product-level payload (never contains variants/status). `forCreate` omits nulls the create schema rejects. */
export function buildProductPayload(v: WizardValues, forCreate: boolean, serverSlug?: string): Record<string, unknown> {
  const out: Record<string, unknown> = {
    type: v.type,
    name: v.name.trim(),
    brand: v.brand.trim(),
    description: v.description.trim(),
    shortDescription: v.shortDescription.trim(),
    tags: v.tags,
    occasions: v.occasions,
    pricing: { ...(num(v.taxPercent) !== undefined ? { taxPercent: num(v.taxPercent) } : {}), hidePrice: v.hidePrice },
    seo: { title: v.seoTitle.trim(), description: v.seoDescription.trim() },
    isFeatured: v.isFeatured,
  };
  if (v.gender) out.gender = v.gender;
  if (v.fabric) out.fabric = v.fabric;
  if (v.season) out.season = v.season;
  if (v.sku.trim().length >= 2) out.sku = v.sku.trim();
  if (v.slug.trim() && v.slug.trim() !== serverSlug) out.slug = v.slug.trim().toLowerCase();

  if (v.categoryId) {
    out.categoryId = v.categoryId;
    if (v.subcategoryId) out.subcategoryId = v.subcategoryId;
    else if (!forCreate) out.subcategoryId = null;
  } else if (!forCreate) {
    out.categoryId = null;
  }
  const low = num(v.lowStockThreshold);
  if (low !== undefined) out.lowStockThreshold = Math.max(0, Math.round(low));
  else if (!forCreate) out.lowStockThreshold = null;

  if (v.type === 'SAREE') {
    const s = v.saree;
    const len = num(s.lengthMeters);
    out.sareeAttrs = {
      ...(s.sareeType ? { sareeType: s.sareeType } : {}),
      ...(len !== undefined ? { lengthMeters: len } : {}),
      workTypes: s.workTypes,
      blouseIncluded: s.blouseIncluded,
      blouseDescription: s.blouseDescription.trim(),
      border: s.border.trim(), pallu: s.pallu.trim(), weave: s.weave.trim(), careInstructions: s.careInstructions.trim(),
    };
  } else {
    const g = v.garment;
    out.garmentAttrs = {
      fit: g.fit.trim(), pattern: g.pattern.trim(), sleeveType: g.sleeveType.trim(), neckType: g.neckType.trim(),
      fabricComposition: g.fabricComposition.trim(), washCare: g.washCare.trim(),
    };
  }
  return out;
}

/** Variant payload, or null when the row cannot be saved yet (no valid price). */
export function buildVariantPayload(r: VariantRow, opts: { canStock: boolean; forCreate: boolean }): VariantPayload | null {
  const price = num(r.price);
  if (price === undefined || price < 0) return null;
  const mrp = num(r.mrp);
  const cost = num(r.cost);
  const stock = num(r.stock);
  const low = num(r.lowStock);
  const p: VariantPayload = {
    sellingPriceMinor: toMinor(price),
    mrpMinor: toMinor(mrp !== undefined && mrp >= price ? mrp : price),
    isActive: r.isActive,
  };
  if (r.colourName.trim()) p.colour = { name: r.colourName.trim(), hex: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(r.colourHex) ? r.colourHex : undefined };
  if (r.size.trim()) p.size = r.size.trim();
  if (r.sku.trim().length >= 2) p.sku = r.sku.trim();
  if (cost !== undefined) p.costPriceMinor = toMinor(cost);
  if (opts.canStock && stock !== undefined) p.stock = Math.max(0, Math.round(stock));
  if (opts.forCreate) {
    if (low !== undefined) p.lowStockThreshold = Math.round(low);
    if (r.barcode.trim()) p.barcode = r.barcode.trim();
    if (r.imageMediaId) p.imageMediaId = r.imageMediaId;
  } else {
    p.lowStockThreshold = low !== undefined ? Math.round(low) : null;
    p.barcode = r.barcode.trim() || null;
    p.imageMediaId = r.imageMediaId || null;
  }
  return p;
}

export const discountPercent = (price: number, mrp: number) => (mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);

// ------------------------------------------------------------------ step validation
export const STEPS = [
  { id: 'basic', title: 'Basic info' },
  { id: 'category', title: 'Category' },
  { id: 'media', title: 'Media' },
  { id: 'variants', title: 'Variants' },
  { id: 'pricing', title: 'Pricing' },
  { id: 'inventory', title: 'Inventory' },
  { id: 'seo', title: 'SEO' },
  { id: 'preview', title: 'Preview' },
  { id: 'publish', title: 'Publish' },
] as const;
export type StepId = (typeof STEPS)[number]['id'];

const numStr = (label: string, opts: { min?: number; max?: number; int?: boolean; required?: boolean } = {}) =>
  z.string().refine((s) => {
    if (s.trim() === '') return !opts.required;
    const n = Number(s);
    if (!Number.isFinite(n)) return false;
    if (opts.int && !Number.isInteger(n)) return false;
    if (opts.min !== undefined && n < opts.min) return false;
    if (opts.max !== undefined && n > opts.max) return false;
    return true;
  }, `${label} is invalid`);

const basicSchema = z.object({
  name: z.string().trim().min(2, 'Enter a product name (min 2 characters)').max(200),
  type: z.enum(['GARMENT', 'SAREE']),
  sku: z.string().trim().refine((s) => s === '' || (s.length >= 2 && s.length <= 60), 'Product code must be 2–60 characters'),
  brand: z.string().trim().max(100, 'Brand is too long'),
  description: z.string().trim().max(10000, 'Description is too long'),
  shortDescription: z.string().trim().max(500, 'Short description max 500 characters'),
  tags: z.array(z.string()).max(30, 'Max 30 tags'),
});

const variantsSchema = z.object({
  variants: z.array(
    z.object({
      colourName: z.string().max(60, 'Max 60 chars'),
      colourHex: z.string().refine((s) => s === '' || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s), 'Invalid colour'),
      size: z.string().max(40, 'Max 40 chars'),
      sku: z.string().refine((s) => s.trim() === '' || (s.trim().length >= 2 && s.trim().length <= 60), 'SKU must be 2–60 characters'),
      barcode: z.string().max(64, 'Max 64 chars'),
    }),
  ).superRefine((rows, ctx) => {
    const seen = new Map<string, number>();
    rows.forEach((r, i) => {
      const k = variantKey(r);
      if (seen.has(k)) ctx.addIssue({ code: 'custom', path: [i, 'size'], message: 'Duplicate colour + size' });
      seen.set(k, i);
    });
  }),
});

const pricingSchema = z.object({
  basePrice: numStr('Price', { min: 0 }),
  baseMrp: numStr('MRP', { min: 0 }),
  taxPercent: numStr('GST', { min: 0, max: 100 }),
  variants: z.array(
    z.object({
      price: numStr('Price', { min: 0, required: true }).refine((s) => s.trim() !== '', 'Price required'),
      mrp: numStr('MRP', { min: 0 }),
      cost: numStr('Cost', { min: 0 }),
    }).superRefine((r, ctx) => {
      const p = Number(r.price), m = Number(r.mrp);
      if (r.mrp.trim() !== '' && r.price.trim() !== '' && m < p) ctx.addIssue({ code: 'custom', path: ['mrp'], message: 'MRP must be ≥ price' });
    }),
  ),
});

const inventorySchema = z.object({
  lowStockThreshold: numStr('Threshold', { min: 0, int: true }),
  variants: z.array(z.object({ stock: numStr('Stock', { min: 0, int: true }), lowStock: numStr('Threshold', { min: 0, int: true }) })),
});

const seoSchema = z.object({
  seoTitle: z.string().max(120, 'Title max 120 characters'),
  seoDescription: z.string().max(320, 'Description max 320 characters'),
  slug: z.string().refine((s) => s === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s), 'Lowercase letters, numbers and hyphens only'),
});

const schemas: Partial<Record<StepId, z.ZodTypeAny>> = {
  basic: basicSchema, variants: variantsSchema, pricing: pricingSchema, inventory: inventorySchema, seo: seoSchema,
};

/** Returns `{ 'variants.0.price': 'Price required', name: '…' }`. Empty object = valid. */
export function validateStep(step: StepId, values: WizardValues): Record<string, string> {
  const schema = schemas[step];
  if (!schema) return {};
  const res = schema.safeParse(values);
  if (res.success) return {};
  const errs: Record<string, string> = {};
  for (const issue of res.error.issues) {
    const path = issue.path.join('.');
    if (!errs[path]) errs[path] = issue.message;
  }
  return errs;
}

export const canCreateDraft = (v: WizardValues) => v.name.trim().length >= 2;
