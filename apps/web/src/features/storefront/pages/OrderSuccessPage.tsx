import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Check, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { storefrontApi } from '@/api/endpoints/storefront';
import { formatMoney } from '@/utils/format';
import { useStorefront } from '../hooks/useStorefront';
import { SfBadge, SfContainer, SfEmpty, SfLinkButton, SfSkeleton } from '../components/ui-sf';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { statusLabel } from '../components/lib';

export default function OrderSuccessPage() {
  const { shop, shopSlug } = useStorefront();
  const [sp] = useSearchParams();
  const orderNumber = sp.get('order') ?? '';
  const phone = sp.get('phone') ?? '';
  const [copied, setCopied] = useState(false);

  const q = useQuery({
    queryKey: ['storefront', shopSlug, 'order', orderNumber, phone],
    queryFn: () => storefrontApi.trackOrder(shopSlug, { orderNumber, phone }),
    enabled: !!orderNumber && !!phone,
    staleTime: 30_000,
    retry: 1,
  });

  if (!orderNumber) {
    return (
      <SfContainer className="py-16">
        <SfEmpty title="No order to show" description="If you've just placed an order, check your messages for the order number." action={<SfLinkButton to={`/shop/${shopSlug}/track-order`}>Track an order</SfLinkButton>} />
      </SfContainer>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      toast.success('Order number copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy the order number');
    }
  };

  const trackHref = `/shop/${shopSlug}/track-order?order=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`;
  const order = q.data;

  return (
    <SfContainer className="max-w-xl py-10 md:py-16">
      <Helmet>
        <title>Order placed</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="rounded-[var(--sf-radius,10px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] p-6 text-center md:p-10">
        <CheckCircle2 className="mx-auto h-16 w-16 text-[color:var(--sf-primary)]" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl font-semibold md:text-4xl">Thank you for your order!</h1>
        <p className="mt-2 text-sm text-[color:var(--sf-muted-fg)]">{shop.name} has received your order and will be in touch soon.</p>

        <div className="mt-6 rounded-[var(--sf-radius,8px)] bg-[color:var(--sf-muted)] p-4">
          <p className="text-xs uppercase tracking-widest text-[color:var(--sf-muted-fg)]">Order number</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="font-display text-2xl font-semibold tracking-wide">{orderNumber}</span>
            <button type="button" onClick={copy} aria-label="Copy order number" className="rounded-full p-2 hover:bg-[color:var(--sf-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--sf-primary)]">
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-[color:var(--sf-muted-fg)]">Save this number and your phone number to track your order.</p>
        </div>

        <div className="mt-5 min-h-10" aria-live="polite">
          {q.isPending && !!phone ? (
            <SfSkeleton className="mx-auto h-8 w-48" />
          ) : order ? (
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <SfBadge className="bg-[color:var(--sf-primary)] text-[color:var(--sf-primary-fg)]">{statusLabel(order.status)}</SfBadge>
              <SfBadge>{order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus === 'COD' ? 'Pay on delivery' : order.paymentStatus === 'PENDING' ? 'Payment pending' : statusLabel(order.paymentStatus)}</SfBadge>
              <span className="font-semibold">{formatMoney(order.totalMinor, order.currency)}</span>
            </div>
          ) : q.isError ? (
            <p className="text-xs text-[color:var(--sf-muted-fg)]">We couldn&apos;t load the latest status, but your order is safe. You can check it on the tracking page.</p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <SfLinkButton to={trackHref}>Track order</SfLinkButton>
          <WhatsAppButton label="WhatsApp the shop" message={`Hello ${shop.name}, I just placed order ${orderNumber}.`} />
        </div>
        <Link to={`/shop/${shopSlug}/products`} className="mt-5 inline-block text-sm underline underline-offset-4">Continue shopping</Link>
      </div>
    </SfContainer>
  );
}
