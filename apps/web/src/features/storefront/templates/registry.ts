import { DEFAULT_TEMPLATE_ID, TEMPLATE_IDS, type TemplateId } from '@vastra/shared';
import type { TemplateDefinition } from './types';

type Loader = () => Promise<{ default: TemplateDefinition }>;

/** Lazy loaders — each template is its own chunk; only the shop's template is downloaded. */
export const TEMPLATE_LOADERS: Record<TemplateId, Loader> = {
  'heritage-gold': () => import('./heritage-gold'),
  'minimal-noir': () => import('./minimal-noir'),
  'boutique-blush': () => import('./boutique-blush'),
  'urban-street': () => import('./urban-street'),
  'royal-silk': () => import('./royal-silk'),
  'modern-linen': () => import('./modern-linen'),
  'festive-bloom': () => import('./festive-bloom'),
};

const cache = new Map<TemplateId, TemplateDefinition>();

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && (TEMPLATE_IDS as readonly string[]).includes(value);
}

export async function loadTemplate(id: unknown): Promise<TemplateDefinition> {
  const safeId: TemplateId = isTemplateId(id) ? id : DEFAULT_TEMPLATE_ID;
  const hit = cache.get(safeId);
  if (hit) return hit;
  const mod = await TEMPLATE_LOADERS[safeId]();
  cache.set(safeId, mod.default);
  return mod.default;
}

export function getCachedTemplate(id: unknown): TemplateDefinition | undefined {
  return cache.get(isTemplateId(id) ? id : DEFAULT_TEMPLATE_ID);
}
