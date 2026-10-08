import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStorefront } from '../hooks/useStorefront';
import { useTrackOrder } from '../hooks/useStorefrontApi';
import { TrackedOrderView } from '../components/TrackedOrderView';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { SfButton, SfContainer, SfField, SfInput } from '../components/ui-sf';
import { getErrorMessage } from '@/utils/errors';

const schema = z.object({
  orderNumber: z.string().trim().min(3, 'Enter your order number'),
  phone: z.string().trim().transform((v) => v.replace(/[\s-]/g, '')).pipe(z.string().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter the 10-digit mobile number used for the order')),
});
type Input = z.input<typeof schema>;

export default function TrackOrderPage() {
  const { shop, shopSlug, template } = useStorefront();
  const [sp] = useSearchParams();
  const track = useTrackOrder(shopSlug);
  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { orderNumber: sp.get('order') ?? '', phone: sp.get('phone') ?? '' },
  });

  const submit = handleSubmit((raw) => {
    const v = schema.parse(raw);
    track.mutate({ orderNumber: v.orderNumber.toUpperCase(), phone: v.phone });
  });

  useEffect(() => {
    const o = sp.get('order');
    const p = sp.get('phone');
    if (o && p && schema.safeParse({ orderNumber: o, phone: p }).success) void submit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const order = track.data;
  const notFound = track.isError;

  return (
    <SfContainer className="max-w-2xl py-8 md:py-14">
      <Helmet>
        <title>Track your order</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <template.SectionHeading title="Track your order" subtitle="Enter your order number and the phone number used while ordering" />
      <form onSubmit={submit} noValidate className="mt-6 grid gap-4 rounded-[var(--sf-radius,8px)] border border-[color:var(--sf-border)] bg-[color:var(--sf-card)] p-5 sm:grid-cols-2">
        <SfField label="Order number" htmlFor="tr-order" error={errors.orderNumber?.message}>
          <SfInput id="tr-order" autoCapitalize="characters" aria-invalid={!!errors.orderNumber} {...register('orderNumber')} />
        </SfField>
        <SfField label="Mobile number" htmlFor="tr-phone" error={errors.phone?.message}>
          <SfInput id="tr-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register('phone')} />
        </SfField>
        <SfButton type="submit" className="sm:col-span-2" loading={track.isPending}>
          Track order
        </SfButton>
      </form>

      <div className="mt-8" aria-live="polite">
        {notFound && (
          <div role="alert" className="space-y-3 rounded-[var(--sf-radius,8px)] bg-[color:var(--sf-muted)] p-5 text-center">
            <p className="font-medium">{getErrorMessage(track.error, "We couldn't find that order.")}</p>
            <p className="text-sm text-[color:var(--sf-muted-fg)]">Please check the order number and phone number and try again.</p>
            <WhatsAppButton label="Ask the shop" message={`Hello ${shop.name}, I need help finding my order.`} />
          </div>
        )}
        {order && (
          <div className="space-y-5">
            <h2 className="font-display text-2xl font-semibold">Order {order.orderNumber}</h2>
            <TrackedOrderView order={order} />
            <WhatsAppButton label="Questions? WhatsApp the shop" message={`Hello ${shop.name}, I have a question about order ${order.orderNumber}.`} />
          </div>
        )}
      </div>
    </SfContainer>
  );
}
