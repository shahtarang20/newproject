import type { ComponentType, ReactNode } from 'react';
import type { TemplateId } from '@vastra/shared';
import type { PublicCatalogue, PublicCategory, PublicProduct, PublicShop } from '@/types/storefront';

export interface TemplateTokens {
  /**
   * CSS variables injected on the storefront root, e.g.
   * { '--sf-bg':'#fff8f0','--sf-fg':'#2b1810','--sf-primary':'#7a1f2b','--sf-primary-fg':'#fff',
   *   '--sf-accent':'#c9a24a','--sf-muted':'#f3e8dc','--sf-muted-fg':'#7a6a5c','--sf-border':'#e6d5c3',
   *   '--sf-card':'#ffffff','--sf-radius':'6px','--sf-font-display':"'Cormorant Garamond', serif",
   *   '--sf-font-body':"'Inter', sans-serif" }
   * REQUIRED keys: --sf-bg --sf-fg --sf-primary --sf-primary-fg --sf-accent --sf-muted --sf-muted-fg
   *                --sf-border --sf-card --sf-radius --sf-font-display --sf-font-body
   */
  vars: Record<`--sf-${string}`, string>;
  /** Google Fonts css2 URL, loaded once via <link rel="stylesheet">. */
  fontsHref: string;
}

export interface ShellProps {
  shop: PublicShop;
  cartCount: number;
  categories: PublicCategory[];
  children: ReactNode;
  onSearch(query: string): void;
}

export interface HeroProps {
  shop: PublicShop;
  featured?: PublicProduct[];
  catalogue?: PublicCatalogue;
}

export interface ProductCardProps {
  product: PublicProduct;
  shop: PublicShop;
  onQuickAdd?(product: PublicProduct): void;
  /** true for above-the-fold cards: eager-load image */
  priority?: boolean;
}

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}

export interface CategoryTileProps {
  category: PublicCategory;
  shop: PublicShop;
}

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  tagline: string;
  /** 3–5 swatches used by the template picker preview */
  previewColors: string[];
  tokens: TemplateTokens;
  /** header, nav, search, cart button, footer, mobile bottom bar */
  Shell: ComponentType<ShellProps>;
  /** home hero / cover */
  Hero: ComponentType<HeroProps>;
  ProductCard: ComponentType<ProductCardProps>;
  SectionHeading: ComponentType<SectionHeadingProps>;
  CategoryTile: ComponentType<CategoryTileProps>;
  /** Tailwind classes for the product grid layout, e.g. 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4' */
  gridClassName: string;
  productPage: { galleryLayout: 'thumbs-left' | 'thumbs-bottom' | 'stacked'; stickyBuyBar: boolean };
}
