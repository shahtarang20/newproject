import { createContext, useContext } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { Media, Product } from '@/types/catalog';
import type { WizardValues, StepId } from './schema';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface WizardCtx {
  form: UseFormReturn<WizardValues>;
  errors: Record<string, string>;
  productId: string | null;
  product: Product | null;
  shopSlug: string;
  media: Media[];
  setMedia: (m: Media[]) => void;
  /** Persist the draft if needed and resolve with the product id. Throws a user-friendly Error. */
  ensureProduct: () => Promise<string>;
  saveState: SaveState;
  canWrite: boolean;
  canStock: boolean;
  canCategories: boolean;
  goTo: (step: StepId) => void;
}

export const WizardContext = createContext<WizardCtx | null>(null);
export function useWizard(): WizardCtx {
  const c = useContext(WizardContext);
  if (!c) throw new Error('useWizard outside provider');
  return c;
}
