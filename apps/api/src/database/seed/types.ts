import type { BusinessType, ButtonStyle, CatalogueLayout, Fabric, Gender, Occasion, ProductStatus, ProductType, SareeType, SareeWorkType, TemplateId } from '@vastra/shared';
import type { Types } from 'mongoose';
import type { IProductVariant } from '@/database/models/product-variant.model';
import type { IProduct } from '@/database/models/product.model';

/** Stock scenario for a seeded product. */
export type StockMode = 'normal' | 'high' | 'low' | 'out';

export interface ProductSpec {
  name: string;
  /** Leaf category slug (see ShopDef.categories). */
  cat: string;
  type: ProductType;
  /** Selling price (rupees) of the cheapest variant and the matching MRP. */
  price: number;
  mrp: number;
  gender?: Gender;
  fabric?: Fabric;
  occ: Occasion[];
  tags: string[];
  /** Colour names (keys of COLOURS). */
  colours: string[];
  sizes: string[];
  brand?: string;
  /** Garment attrs encoded "fit|pattern|sleeve|neck|composition". */
  ga?: string;
  /** Saree attrs: [sareeType, workTypes, border, pallu, weave]. */
  sr?: [SareeType, SareeWorkType[], string, string, string];
  stock?: StockMode;
  status?: Extract<ProductStatus, 'DRAFT'>;
  featured?: boolean;
  /** One-line description fragment used to build the long description. */
  blurb: string;
}

export interface CategoryDef {
  slug: string;
  name: string;
  parent?: string;
  description?: string;
}

export interface CatalogueDef {
  slug: string;
  name: string;
  description: string;
  layout: CatalogueLayout;
  /** Selects ACTIVE products for this catalogue (in listing order). */
  pick: (p: ProductSpec, index: number) => boolean;
  limit: number;
}

export interface ShopDef {
  slug: string;
  name: string;
  prefix: string;
  businessType: BusinessType;
  templateId: TemplateId;
  primaryColor: string;
  buttonStyle: ButtonStyle;
  tagline: string;
  description: string;
  ownerName: string;
  ownerEmailKey: 'owner' | 'owner2' | 'owner3';
  ownerPhone: string;
  contactPhone: string;
  contactEmail: string;
  instagram: string;
  address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  upiId: string;
  flatRateMinor: number;
  freeAboveMinor: number;
  seoKeywords: string[];
  categories: CategoryDef[];
  catalogues: CatalogueDef[];
  customerCount: number;
  orderCount: number;
  enquiryCount: number;
  /** Categories used for the targeted flat offer. */
  offerCategorySlug: string;
  /** Anchor seed so shops get different but stable randomness. */
  rngSeed: number;
}

/** What the catalog builder hands to the order/engagement builders. */
export interface BuiltProduct {
  product: IProduct;
  spec: ProductSpec;
  variants: IProductVariant[];
}

export interface ShopContext {
  def: ShopDef;
  shopId: Types.ObjectId;
  ownerId: Types.ObjectId;
  ownerName: string;
  currency: string;
  flatRateMinor: number;
  freeAboveMinor: number;
}
