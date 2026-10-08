import { createContext, useContext } from 'react';
import type { PublicCategory, PublicShop } from '@/types/storefront';
import type { TemplateDefinition } from '../templates/types';

export interface StorefrontContextValue {
  shopSlug: string;
  shop: PublicShop;
  categories: PublicCategory[];
  template: TemplateDefinition;
  /** mini-cart drawer (opened after add-to-cart) */
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

export const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function useStorefront(): StorefrontContextValue {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error('useStorefront must be used inside <StorefrontLayout>');
  return ctx;
}
