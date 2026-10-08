import type {
  CatalogueLayout, Fabric, Gender, Occasion, PaginationMeta, ProductStatus, ProductType, SareeType, SareeWorkType, Season,
} from '@vastra/shared';

// ---------------------------------------------------------------- shop usage
export interface UsageEntry { key: string; used: number; limit: number | null; percent: number }
export interface ShopUsage {
  usage: UsageEntry[];
  storage: { usedBytes: number; limitBytes: number | null; percent: number; images: { count: number; bytes: number }; videos: { count: number; bytes: number } };
}

// ---------------------------------------------------------------- categories
export interface Category {
  id: string;
  shopId?: string;
  name: string;
  slug: string;
  parentId: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  childCount: number;
  children?: Category[];
  createdAt?: string;
  updatedAt?: string;
}
export interface CategoryInput {
  name?: string;
  slug?: string;
  parentId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

// ---------------------------------------------------------------- media
export interface Media {
  id: string;
  productId: string;
  kind: 'IMAGE' | 'VIDEO';
  url: string;
  thumbUrl?: string;
  tinyUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSec?: number | null;
  altText?: string | null;
  variantId?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

// ---------------------------------------------------------------- variants
export interface Variant {
  id: string;
  productId: string;
  sku: string;
  colour?: { name: string; hex?: string } | null;
  size?: string | null;
  sellingPriceMinor: number;
  mrpMinor?: number | null;
  costPriceMinor?: number | null;
  stock: number;
  lowStockThreshold?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  imageMediaId?: string | null;
  isActive: boolean;
}
export interface VariantPayload {
  colour?: { name: string; hex?: string };
  size?: string;
  sku?: string;
  sellingPriceMinor?: number;
  mrpMinor?: number;
  costPriceMinor?: number;
  stock?: number;
  lowStockThreshold?: number | null;
  barcode?: string | null;
  imageMediaId?: string | null;
  isActive?: boolean;
  stockReason?: string;
}

// ---------------------------------------------------------------- products
export interface SareeAttrs {
  sareeType?: SareeType;
  fabric?: Fabric;
  workTypes?: SareeWorkType[];
  lengthMeters?: number;
  blouseIncluded?: boolean;
  blouseDescription?: string;
  border?: string;
  pallu?: string;
  weave?: string;
  careInstructions?: string;
}
export interface GarmentAttrs {
  fit?: string; pattern?: string; sleeveType?: string; neckType?: string; fabricComposition?: string; washCare?: string;
}
export interface ProductPricing {
  minSellingMinor?: number | null;
  maxSellingMinor?: number | null;
  mrpMinor?: number | null;
  discountPercent?: number | null;
  taxPercent?: number;
  hidePrice?: boolean;
}
export interface Product {
  id: string;
  type: ProductType;
  name: string;
  slug: string;
  sku: string;
  brand?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string; slug: string; parentId?: string | null } | null;
  tags?: string[];
  gender?: Gender | null;
  occasions?: Occasion[];
  fabric?: Fabric | null;
  season?: Season | null;
  sareeAttrs?: SareeAttrs;
  garmentAttrs?: GarmentAttrs;
  pricing?: ProductPricing;
  colours?: string[];
  sizes?: string[];
  stockTotal: number;
  lowStockThreshold?: number | null;
  status: ProductStatus;
  isFeatured?: boolean;
  primaryImageUrl?: string | null;
  primaryThumbUrl?: string | null;
  seo?: { title?: string; description?: string };
  viewCount?: number;
  soldCount?: number;
  createdAt?: string;
  updatedAt?: string;
  media?: Media[];
  variants?: Variant[];
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: ProductStatus;
  type?: ProductType;
  category?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  isFeatured?: boolean;
  sort?: string;
}

export type ProductWritePayload = Record<string, unknown>;

export interface Paged<T> { items: T[]; meta?: PaginationMeta }

// ---------------------------------------------------------------- catalogues
export interface Catalogue {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  isPublic: boolean;
  isActive: boolean;
  isPublished: boolean;
  sortOrder: number;
  productIds: string[];
  productCount: number;
  viewCount: number;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string | null;
  endDate?: string | null;
  categoryIds?: string[];
  layout?: CatalogueLayout | null;
}
export interface CataloguePickedProduct {
  id: string; name: string; slug: string; sku: string; status: ProductStatus; imageUrl?: string | null;
  minPriceMinor?: number | null; maxPriceMinor?: number | null; mrpMinor?: number | null; hidePrice?: boolean; stockTotal: number;
}
export interface CatalogueDetail extends Catalogue { products: CataloguePickedProduct[] }
export interface CatalogueInput {
  name?: string;
  slug?: string;
  description?: string;
  coverUrl?: string | null;
  productIds?: string[];
  isPublished?: boolean;
  sortOrder?: number;
  categoryIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
  layout?: CatalogueLayout | null;
}
export interface CatalogueShare { url: string; isPublished: boolean; whatsappText: string; whatsappUrl: string }

// ---------------------------------------------------------------- bulk
export interface BulkRowData {
  productName: string; sku?: string; category?: string; colour?: string; size?: string; priceMinor?: number; mrpMinor?: number;
  stock?: number; description?: string; gender?: string; fabric?: string; brand?: string; type?: string; status?: string;
}
export interface BulkValidatedRow {
  row: number; valid: boolean; errors: string[]; warnings: string[]; action: 'create' | 'update' | 'skip' | 'invalid'; data?: BulkRowData;
}
export interface BulkValidateResult {
  totalRows: number; validRows: number; invalidRows: number; rows: BulkValidatedRow[];
  summary: {
    productsToCreate: number; productsToUpdate: number; variantsToCreate: number; variantsToUpdate: number; rowsToSkip: number;
    categoriesToCreate: string[];
    productLimit?: { limit: number | null; used: number; newProducts: number; headroom: number | null; exceeds: boolean };
    canImport: boolean;
  };
}
export interface BulkImportResult {
  totalRows: number;
  created: { products: number; variants: number; categories: number; openingStockTransactions: number };
  updated: { products: number; variants: number };
  skipped: number;
  errors: { row: number; errors: string[] }[];
}
export type DuplicateSkuPolicy = 'error' | 'skip' | 'update';
export interface BulkCsvOptions { createMissingCategories: boolean; duplicateSku: DuplicateSkuPolicy; abortOnErrors?: boolean }
export type BulkPriceMode = 'SET' | 'INCREASE_PERCENT' | 'DECREASE_PERCENT' | 'INCREASE_FLAT';
export interface BulkPriceBody {
  productIds?: string[];
  filter?: { categoryId?: string; status?: ProductStatus; type?: ProductType };
  mode: BulkPriceMode;
  value: number;
  target?: 'SELLING' | 'MRP' | 'BOTH';
}
export interface BulkStockBody {
  items: { variantId?: string; sku?: string; quantity: number; mode: 'SET' | 'ADD'; reason?: string }[];
}
export interface BulkStockResult {
  total: number; succeeded: number; failed: number;
  results: { index: number; ok: boolean; variantId?: string; sku?: string; before?: number; after?: number; delta?: number; error?: string }[];
}
