import { RAJ_PRODUCTS } from './products.raj';
import { SHREE_PRODUCTS } from './products.shree';
import { URBAN_PRODUCTS } from './products.urban';
import type { ProductSpec } from '../types';

export { COLOURS, hexOf } from './colours';

/** Product specs per shop slug. */
export const PRODUCT_SPECS: Record<string, ProductSpec[]> = {
  'shree-fashion': SHREE_PRODUCTS,
  'raj-sarees': RAJ_PRODUCTS,
  'urban-garments': URBAN_PRODUCTS,
};
