import { useState } from 'react';
import { Check, Copy, Tag } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicOffer } from '@/types/storefront';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import { sfFocusRing } from './ui-sf';

function describe(o: PublicOffer, currency: string): string {
  if (o.description) return o.description;
  if (o.discountType === 'PERCENT') return `${o.discountValue}% off`;
  if (o.discountType === 'FLAT') return `${formatMoney(o.discountValue, currency)} off`;
  return o.name;
}

export function OfferStrip({ offers, currency, className }: { offers: PublicOffer[]; currency: string; className?: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!offers.length) return null;

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`Coupon ${code} copied`);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.message(`Use coupon code ${code} at checkout`);
    }
  };

  return (
    <section aria-label="Current offers" className={cn('border-y border-[color:var(--sf-border)] bg-[color:var(--sf-muted)]', className)}>
      <ul className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {offers.map((o) => (
          <li key={o.id} className="flex shrink-0 items-center gap-2 text-sm">
            <Tag className="h-4 w-4 text-[color:var(--sf-primary)]" aria-hidden="true" />
            <span className="font-medium">{o.name}</span>
            <span className="text-[color:var(--sf-muted-fg)]">
              {describe(o, currency)}
              {o.minOrderMinor ? ` on orders above ${formatMoney(o.minOrderMinor, currency)}` : ''}
            </span>
            {o.couponCode && (
              <button
                type="button"
                onClick={() => copy(o.couponCode!)}
                aria-label={`Copy coupon code ${o.couponCode}`}
                className={cn('inline-flex items-center gap-1 rounded border border-dashed border-[color:var(--sf-primary)] px-2 py-0.5 text-xs font-semibold tracking-wider text-[color:var(--sf-primary)]', sfFocusRing)}
              >
                {o.couponCode}
                {copied === o.couponCode ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
