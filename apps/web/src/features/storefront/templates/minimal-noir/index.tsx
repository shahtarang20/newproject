import type { TemplateDefinition } from '../types';
import { tokens } from './tokens';
import Shell from './Shell';
import Hero from './Hero';
import ProductCard from './ProductCard';
import { CategoryTile, SectionHeading } from './Parts';

const template: TemplateDefinition = {
  id: 'minimal-noir',
  name: 'Minimal Noir',
  tagline: 'Editorial monochrome with hairline precision',
  previewColors: ['#f6f6f3', '#0a0a0a', '#6b6b66', '#d4d4cf'],
  tokens,
  Shell,
  Hero,
  ProductCard,
  SectionHeading,
  CategoryTile,
  // gap-px over a border-coloured background draws hairline grid lines between cards
  gridClassName:
    'grid grid-cols-2 gap-px border border-[color:var(--sf-border)] bg-[color:var(--sf-border)] md:grid-cols-3 lg:grid-cols-4',
  productPage: { galleryLayout: 'stacked', stickyBuyBar: true },
};

export default template;
