import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Banknote, CreditCard, MapPin, Store, Truck } from 'lucide-react';
import type { PaymentMethod } from '@vastra/shared';
import { ApiError } from '@/api/client';
import { storefrontApi, trackEvent } from '@/api/endpoints/storefront';
import { formatMoney } from '@/utils/format';
import { getErrorMessage, getFieldErrors } from '@/utils/errors';
import { cn } from '@/utils/cn';
import { useStorefront } from '../hooks/useStorefront';
import { useCartPricing } from '../hooks/useCartPricing';
import { usePlaceOrder } from '../hooks/useStorefrontApi';
import { OrderSummary } from '../components/OrderSummary';
import { ShopInfoBlock, formatAddress } from '../components/ShopInfoBlock';
import { openRazorpay } from '../components/razorpay';
import { Honeypot, SfButton, SfContainer, SfEmpty, SfField, SfInput, SfLinkButton, SfTextarea } from '../components/ui-sf';
import { WhatsAppButton } from '../components/WhatsAppButton';

const phoneRule = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'));

const schema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name').max(80),
    phone: phoneRule,
    email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
    deliveryType: z.enum(['DELIVERY', 'PICKUP']),
    line1: z.string().trim().optional(),
    line2: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
    landmark: z.string().trim().optional(),
    notes: z.string().trim().max(500).optional(),
    paymentMethod: z.enum(['ONLINE', 'COD', 'PAY_AT_SHOP']),
    website: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryType !== 'DELIVERY') return;
    const need = (k: 'line1' | 'city' | 'state', msg: string) => {
      if (!v[k]) ctx.addIssue({ code: 'custom', path: [k], message: msg });
    };
    need('line1', 'Please enter your address');
    need('city', 'Please enter your city');
    need('state', 'Please enter your state');
    if (!/^\d{6}$/.test(v.pincode ?? '')) ctx.addIssue({ code: 'custom', path: ['pincode'], message: 'Enter a 6-digit pincode' });
  });
type FormInput = z.input<typeof schema>;

function RadioCard({ children, checked, className, ...p }: { children: ReactNode; checked: boolean; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('relative block cursor-pointer', p.disabled && 'cursor-not-allowed opacity-50', className)}>
      <input type="radio" className="peer sr-only" checked={checked} {...p} />
      <div className="flex items-start gap-3 rounded-[var(--sf-radius,8px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] p-4 transition peer-checked:border-[color:var(--sf-primary)] peer-checked:ring-1 peer-checked:ring-[color:var(--sf-primary)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--sf-primary)]">
        {children}
      </div>
    </label>
  );
}

function Card({ title, step, children }: { title: string; step: number; children: ReactNode }) {
  return (
    <section className="rounded-[var(--sf-radius,8px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-bg)] p-5 md:p-6">
      <h2 className="mb-4 flex items-center gap-3 font-display text-xl font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--sf-primary)] text-sm text-[color:var(--sf-primary-fg)]">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const { shop, shopSlug, template } = useStorefront();
  const navigate = useNavigate();
  const { cart, priced, query, stale, blocking, couponCode } = useCartPricing(shopSlug);
  const placeOrder = usePlaceOrder(shopSlug);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ orderNumber: string; phone: string; payload?: Record<string, unknown>; providerMessage?: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const started = useRef(false);

  const methods = (
    [
      shop.payment.onlineEnabled && { id: 'ONLINE' as const, title: 'Pay online', desc: 'UPI, cards, net banking & wallets', icon: CreditCard },
      shop.payment.codEnabled && { id: 'COD' as const, title: 'Cash on delivery', desc: 'Pay when your order arrives', icon: Banknote },
      shop.payment.payAtShopEnabled && { id: 'PAY_AT_SHOP' as const, title: 'Pay at shop', desc: 'Pay when you pick up from the shop', icon: Store },
    ] as const
  ).filter(Boolean) as { id: PaymentMethod; title: string; desc: string; icon: typeof Store }[];

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', deliveryType: 'DELIVERY', line1: '', line2: '', city: shop.address.city ?? '', state: shop.address.state ?? '', pincode: '', landmark: '', notes: '', paymentMethod: methods[0]?.id ?? 'COD', website: '' },
  });
  const { register, handleSubmit, control, setValue, setError, formState: { errors } } = form;
  const deliveryType = useWatch({ control, name: 'deliveryType' });
  const paymentMethod = useWatch({ control, name: 'paymentMethod' });

  const allowed = methods;

  useEffect(() => {
    if (started.current || cart.lines.length === 0) return;
    started.current = true;
    trackEvent(shopSlug, { type: 'CHECKOUT_START' });
  }, [cart.lines.length, shopSlug]);

  const finish = (orderNumber: string, phone: string) => {
    cart.clear();
    navigate(`/shop/${shopSlug}/order-success?order=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`, { replace: true });
  };

  const runOnlinePayment = async (orderNumber: string, phone: string, clientPayload: Record<string, unknown>, provider: string, who: { name: string; email?: string }) => {
    if (typeof clientPayload.checkoutUrl === 'string' && clientPayload.checkoutUrl) {
      cart.clear();
      window.location.assign(clientPayload.checkoutUrl);
      return;
    }
    if (provider !== 'razorpay') {
      setPendingPayment({ orderNumber, phone, providerMessage: 'Online payment is not available for this order right now.' });
      return;
    }
    setPaying(true);
    const result = await openRazorpay(clientPayload, { name: who.name, contact: phone, email: who.email });
    if (result.status === 'success') {
      try {
        await storefrontApi.verifyPayment(shopSlug, { orderNumber, payload: result.payload });
        setPaying(false);
        finish(orderNumber, phone);
        return;
      } catch (e) {
        setPaying(false);
        setPendingPayment({ orderNumber, phone, payload: clientPayload, providerMessage: `We could not confirm your payment yet (${getErrorMessage(e, 'verification failed')}). If money was deducted, please contact the shop with order ${orderNumber}.` });
        return;
      }
    }
    setPaying(false);
    setPendingPayment({
      orderNumber,
      phone,
      payload: result.status === 'unavailable' ? undefined : clientPayload,
      providerMessage:
        result.status === 'unavailable'
          ? 'The payment window could not be loaded. Please check your connection and try again.'
          : result.status === 'failed'
            ? 'Your payment did not go through.'
            : 'Payment was not completed.',
    });
  };

  const onSubmit = handleSubmit(async (raw) => {
    setNotice(null);
    if (!priced || blocking) {
      setNotice('Some items in your bag need attention. Please review your bag.');
      return;
    }
    const v = schema.parse(raw);
    const phone = v.phone;
    try {
      const res = await placeOrder.mutateAsync({
        items: cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.qty })),
        couponCode: couponCode && priced.coupon?.valid ? couponCode : undefined,
        customer: { name: v.name, phone, email: v.email || undefined },
        deliveryType: v.deliveryType,
        address:
          v.deliveryType === 'DELIVERY'
            ? { line1: v.line1!, line2: v.line2 || undefined, city: v.city!, state: v.state!, pincode: v.pincode!, landmark: v.landmark || undefined, country: 'IN' }
            : undefined,
        paymentMethod: v.paymentMethod,
        notes: v.notes || undefined,
        website: v.website,
      });
      if (v.paymentMethod === 'ONLINE') {
        if (res.payment) await runOnlinePayment(res.orderNumber, phone, res.payment.clientPayload, res.payment.provider, { name: v.name, email: v.email || undefined });
        else setPendingPayment({ orderNumber: res.orderNumber, phone, providerMessage: 'Online payment could not be started for this order.' });
        return;
      }
      finish(res.orderNumber, phone);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'OUT_OF_STOCK' || e.code === 'INSUFFICIENT_STOCK')) {
        void query.refetch();
        setNotice('Some items just went out of stock or have limited quantity. We have refreshed your bag — please review it and try again.');
        return;
      }
      const fields = getFieldErrors(e);
      const map: Record<string, keyof FormInput> = { 'customer.name': 'name', 'customer.phone': 'phone', 'customer.email': 'email', 'address.line1': 'line1', 'address.city': 'city', 'address.state': 'state', 'address.pincode': 'pincode' };
      let mapped = false;
      for (const [k, msg] of Object.entries(fields)) {
        const f = map[k] ?? (k in raw ? (k as keyof FormInput) : undefined);
        if (f) {
          setError(f, { message: msg });
          mapped = true;
        }
      }
      setNotice(mapped ? 'Please check the highlighted fields.' : getErrorMessage(e, 'We could not place your order. Please try again.'));
    }
  });

  if (pendingPayment) {
    return (
      <SfContainer className="max-w-xl py-12">
        <div role="alert" className="space-y-4 rounded-[var(--sf-radius,8px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" aria-hidden="true" />
          <h1 className="font-display text-2xl font-semibold">Payment pending</h1>
          <p className="text-sm text-[color:var(--sf-muted-fg)]">
            Your order <strong>{pendingPayment.orderNumber}</strong> has been saved but is <strong>not paid yet</strong>. {pendingPayment.providerMessage}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {pendingPayment.payload && (
              <SfButton
                loading={paying}
                onClick={() => {
                  const p = pendingPayment;
                  void runOnlinePayment(p.orderNumber, p.phone, p.payload!, 'razorpay', { name: form.getValues('name'), email: form.getValues('email') || undefined });
                }}
              >
                Retry payment
              </SfButton>
            )}
            <SfLinkButton variant="outline" to={`/shop/${shopSlug}/track-order?order=${encodeURIComponent(pendingPayment.orderNumber)}&phone=${encodeURIComponent(pendingPayment.phone)}`} onClick={() => cart.clear()}>
              Track this order
            </SfLinkButton>
            <WhatsAppButton label="Contact the shop" message={`Hello, I need help with the payment for my order ${pendingPayment.orderNumber}.`} />
          </div>
        </div>
      </SfContainer>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <SfContainer className="py-16">
        <SfEmpty title="Your bag is empty" description="Add a few items before checking out." action={<SfLinkButton to={`/shop/${shopSlug}/products`}>Browse products</SfLinkButton>} />
      </SfContainer>
    );
  }

  if (methods.length === 0) {
    return (
      <SfContainer className="max-w-xl py-16">
        <SfEmpty title="Online ordering isn't available" description={`${shop.name} is not accepting online orders right now. You can still reach out to the shop directly.`} action={<WhatsAppButton buttonVariant="primary" label="Chat with the shop" />} />
      </SfContainer>
    );
  }

  const err = (k: keyof FormInput) => errors[k]?.message as string | undefined;
  const busy = placeOrder.isPending || paying;

  return (
    <SfContainer className="py-8 md:py-12">
      <Helmet>
        <title>Checkout</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <template.SectionHeading title="Checkout" subtitle="Guest checkout — no account needed" />
      <form id="checkout-form" onSubmit={onSubmit} noValidate className="relative mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <Honeypot {...register('website')} />
        <div className="space-y-6">
          <Card step={1} title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <SfField label="Full name" htmlFor="co-name" error={err('name')} className="sm:col-span-2">
                <SfInput id="co-name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
              </SfField>
              <SfField label="Mobile number" htmlFor="co-phone" error={err('phone')} hint="We'll send order updates here">
                <SfInput id="co-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register('phone')} />
              </SfField>
              <SfField label="Email (optional)" htmlFor="co-email" error={err('email')}>
                <SfInput id="co-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
              </SfField>
            </div>
          </Card>

          <Card step={2} title="Delivery">
            <div role="radiogroup" aria-label="Delivery type" className="grid gap-3 sm:grid-cols-2">
              <RadioCard value="DELIVERY" checked={deliveryType === 'DELIVERY'} {...register('deliveryType')}>
                <Truck className="mt-0.5 h-5 w-5 text-[color:var(--sf-primary)]" aria-hidden="true" />
                <span><span className="block font-medium">Home delivery</span><span className="text-xs text-[color:var(--sf-muted-fg)]">Delivered to your address</span></span>
              </RadioCard>
              <RadioCard value="PICKUP" checked={deliveryType === 'PICKUP'} {...register('deliveryType')}>
                <Store className="mt-0.5 h-5 w-5 text-[color:var(--sf-primary)]" aria-hidden="true" />
                <span><span className="block font-medium">Pick up from shop</span><span className="text-xs text-[color:var(--sf-muted-fg)]">Collect it yourself</span></span>
              </RadioCard>
            </div>

            {deliveryType === 'PICKUP' ? (
              <div className="mt-4 flex gap-3 rounded-[var(--sf-radius,6px)] bg-[color:var(--sf-muted)] p-4 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--sf-primary)]" aria-hidden="true" />
                <div>
                  <p className="font-medium">{shop.name}</p>
                  <p className="text-[color:var(--sf-muted-fg)]">{formatAddress(shop.address) || 'Address available from the shop'}</p>
                  {shop.phone && <p className="mt-1">Call: {shop.phone}</p>}
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SfField label="Address line 1" htmlFor="co-l1" error={err('line1')} className="sm:col-span-2">
                  <SfInput id="co-l1" autoComplete="address-line1" aria-invalid={!!errors.line1} {...register('line1')} />
                </SfField>
                <SfField label="Address line 2 (optional)" htmlFor="co-l2" className="sm:col-span-2">
                  <SfInput id="co-l2" autoComplete="address-line2" {...register('line2')} />
                </SfField>
                <SfField label="City" htmlFor="co-city" error={err('city')}>
                  <SfInput id="co-city" autoComplete="address-level2" aria-invalid={!!errors.city} {...register('city')} />
                </SfField>
                <SfField label="State" htmlFor="co-state" error={err('state')}>
                  <SfInput id="co-state" autoComplete="address-level1" aria-invalid={!!errors.state} {...register('state')} />
                </SfField>
                <SfField label="Pincode" htmlFor="co-pin" error={err('pincode')}>
                  <SfInput id="co-pin" inputMode="numeric" maxLength={6} autoComplete="postal-code" aria-invalid={!!errors.pincode} {...register('pincode')} />
                </SfField>
                <SfField label="Landmark (optional)" htmlFor="co-landmark">
                  <SfInput id="co-landmark" {...register('landmark')} />
                </SfField>
              </div>
            )}
            <SfField label="Order notes (optional)" htmlFor="co-notes" error={err('notes')} className="mt-4">
              <SfTextarea id="co-notes" rows={2} placeholder="Any special instructions?" {...register('notes')} />
            </SfField>
          </Card>

          <Card step={3} title="Payment">
            {allowed.length === 0 ? (
              <p className="text-sm text-[color:var(--sf-muted-fg)]">
                No payment method is available for {deliveryType === 'DELIVERY' ? 'home delivery' : 'pickup'}. Please choose the other delivery option or contact the shop.
              </p>
            ) : (
              <div role="radiogroup" aria-label="Payment method" className="grid gap-3">
                {allowed.map((m) => (
                  <RadioCard key={m.id} value={m.id} checked={paymentMethod === m.id} {...register('paymentMethod')}>
                    <m.icon className="mt-0.5 h-5 w-5 text-[color:var(--sf-primary)]" aria-hidden="true" />
                    <span><span className="block font-medium">{m.title}</span><span className="text-xs text-[color:var(--sf-muted-fg)]">{m.desc}</span></span>
                  </RadioCard>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="h-fit space-y-5 rounded-[var(--sf-radius,8px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] p-5 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <ul className="max-h-64 space-y-3 overflow-y-auto">
            {cart.lines.map((l) => {
              const p = priced?.lines.find((x) => x.variantId === l.variantId);
              return (
                <li key={l.variantId} className="flex gap-3 text-sm">
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded bg-[color:var(--sf-muted)]">
                    {l.snapshot.image && <img src={l.snapshot.image} alt="" width={56} height={64} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium">{l.snapshot.name}</p>
                    <p className="text-xs text-[color:var(--sf-muted-fg)]">{[l.snapshot.colour, l.snapshot.size].filter(Boolean).join(' · ')} × {l.qty}</p>
                    {p?.issue && <p className="text-xs text-red-600">{p.issue === 'INSUFFICIENT_STOCK' ? `Only ${p.maxQuantity} available` : 'Unavailable'}</p>}
                  </div>
                  <span className="font-medium">{formatMoney(p ? p.lineTotalMinor : l.snapshot.unitPrice * l.qty, shop.currency)}</span>
                </li>
              );
            })}
          </ul>
          <OrderSummary priced={priced} estimate={cart.subtotalEstimate} currency={shop.currency} dim={stale} />
          {(blocking || notice) && (
            <div role="alert" className="rounded-[var(--sf-radius,6px)] bg-red-50 p-3 text-sm text-red-800">
              {notice ?? 'Some items need attention.'}{' '}
              <Link to={`/shop/${shopSlug}/cart`} className="font-semibold underline">Review bag</Link>
            </div>
          )}
          {query.isError && !priced && <p role="alert" className="text-sm text-red-700">We couldn&apos;t confirm prices right now. {getErrorMessage(query.error)}</p>}
          <SfButton type="submit" size="lg" className="w-full" loading={busy} disabled={!priced || blocking || allowed.length === 0 || (stale && !busy)}>
            {paymentMethod === 'ONLINE' ? 'Place order & pay' : 'Place order'}{priced ? ` · ${formatMoney(priced.totalMinor, shop.currency)}` : ''}
          </SfButton>
          <p className="text-center text-xs text-[color:var(--sf-muted-fg)]">By placing your order you agree to be contacted about it on the number provided.</p>
        </aside>
      </form>
      <div className="mt-12 hidden md:block"><ShopInfoBlock shop={shop} /></div>
    </SfContainer>
  );
}
