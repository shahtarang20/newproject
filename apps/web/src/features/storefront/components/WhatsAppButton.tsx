import { MessageCircle } from 'lucide-react';
import { trackEvent } from '@/api/endpoints/storefront';
import type { PublicProduct, PublicVariant } from '@/types/storefront';
import { formatMoney } from '@/utils/format';
import { absoluteUrl, whatsappLink } from '@/utils/seo';
import { useStorefront } from '../hooks/useStorefront';
import { sfButtonClass, type SfSize, type SfVariant } from './ui-sf';
import { productPath } from './lib';

interface Props {
  product?: PublicProduct;
  variant?: PublicVariant;
  colour?: string;
  /** overrides the generated message */
  message?: string;
  label?: string;
  buttonVariant?: SfVariant;
  size?: SfSize;
  className?: string;
}

export function buildProductMessage(opts: { name: string; price: string; colour?: string; url: string }) {
  return `Hello, I am interested in this product:\n\nProduct: ${opts.name}\nPrice: ${opts.price}${
    opts.colour ? `\nColour: ${opts.colour}` : ''
  }\n\nProduct Link: ${opts.url}`;
}

export function WhatsAppButton({ product, variant, colour, message, label = 'Chat on WhatsApp', buttonVariant = 'outline', size = 'md', className }: Props) {
  const { shop, shopSlug } = useStorefront();
  if (!shop.whatsapp || shop.whatsappEnabled === false) return null;

  let text = message;
  if (!text && product) {
    const selling = variant?.priceMinor ?? product.price.sellingMinor;
    text = buildProductMessage({
      name: product.name,
      price: product.price.hidden || selling === undefined ? 'Please share the price' : formatMoney(selling, shop.currency),
      colour: colour ?? variant?.colour,
      url: absoluteUrl(productPath(shopSlug, product.slug)),
    });
  }
  if (!text) text = `Hello ${shop.name}, I would like to know more.`;

  return (
    <a
      href={whatsappLink(shop.whatsapp, text)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent(shopSlug, { type: 'WHATSAPP_CLICK', productId: product?.id })}
      className={sfButtonClass(buttonVariant, size, className)}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
