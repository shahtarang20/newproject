import { TEMPLATE_IDS, type TemplateId } from '@vastra/shared';

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  tagline: string;
  previewColors: string[];
}

/** Static metadata mirroring the web template definitions (name/tagline/previewColors). Keep in sync with apps/web templates. */
const META: Record<TemplateId, Omit<TemplateMeta, 'id'>> = {
  'heritage-gold': { name: 'Heritage Gold', tagline: 'Classic Indian heritage in maroon and gold', previewColors: ['#7a1f2b', '#c9a24a', '#fff8f0', '#2b1810'] },
  'minimal-noir': { name: 'Minimal Noir', tagline: 'Monochrome editorial elegance', previewColors: ['#0a0a0a', '#ffffff', '#737373', '#e5e5e5'] },
  'boutique-blush': { name: 'Boutique Blush', tagline: 'Soft, airy and effortlessly feminine', previewColors: ['#e8a0b4', '#fdf0f3', '#8a4a5c', '#fff'] },
  'urban-street': { name: 'Urban Street', tagline: 'Bold streetwear with neon energy', previewColors: ['#0d0d0f', '#c6ff3d', '#ff3d81', '#1f1f23'] },
  'royal-silk': { name: 'Royal Silk', tagline: 'Regal blues and emerald with gold foil', previewColors: ['#14305c', '#0f6b4f', '#d4af37', '#f7f3e8'] },
  'modern-linen': { name: 'Modern Linen', tagline: 'Warm neutrals, calm and natural', previewColors: ['#d9cdb8', '#f5f0e6', '#6b5d4a', '#a3b18a'] },
  'festive-bloom': { name: 'Festive Bloom', tagline: 'Vibrant festival colours, marigold and magenta', previewColors: ['#f59e0b', '#d9267d', '#fff4e0', '#5b1a45'] },
};

export const TEMPLATE_LIST: TemplateMeta[] = TEMPLATE_IDS.map((id) => ({ id, ...META[id] }));
