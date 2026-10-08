import type { PublicProduct, PublicShop } from '@/types/storefront';
import type { ButtonStyle, CatalogueLayout, TemplateId } from '@vastra/shared';

/** Placeholder content for template previews. Never shown to customers. */
export function sampleShop(templateId: TemplateId, name: string, opts: { primaryColor?: string; buttonStyle?: ButtonStyle; layout?: CatalogueLayout } = {}): PublicShop {
  return {
    id: 'preview', slug: '__preview__', name: name || 'Your Shop', businessType: 'SAREE_SHOP',
    description: 'Handpicked sarees and ethnic wear for every occasion.',
    address: { city: 'Surat', state: 'Gujarat', country: 'IN' },
    phone: '+91 98765 43210', whatsapp: '919876543210', businessHours: [], currency: 'INR',
    theme: { templateId, primaryColor: opts.primaryColor || undefined, buttonStyle: opts.buttonStyle ?? 'rounded', catalogueLayout: opts.layout ?? 'grid' },
    payment: { codEnabled: true, onlineEnabled: false, payAtShopEnabled: false },
    whatsappEnabled: false,
  };
}

const product = (id: string, name: string, type: 'SAREE' | 'GARMENT', sellingMinor: number, mrpMinor: number, category: string): PublicProduct => ({
  id, slug: id, name, type, category: { id: category, name: category, slug: category },
  media: [], colours: [{ name: 'Maroon', hex: '#7a1f2b' }, { name: 'Teal', hex: '#0f766e' }, { name: 'Gold', hex: '#c9a24a' }], sizes: [],
  variants: [], inStock: true, lowStock: false,
  price: { sellingMinor, mrpMinor, discountPercent: Math.round((1 - sellingMinor / mrpMinor) * 100), hidden: false },
  createdAt: new Date(0).toISOString(),
});

export const SAMPLE_PRODUCTS: PublicProduct[] = [
  product('sample-1', 'Banarasi Silk Saree', 'SAREE', 689900, 899900, 'Sarees'),
  product('sample-2', 'Embroidered Anarkali Set', 'GARMENT', 349900, 449900, 'Kurtas'),
];
