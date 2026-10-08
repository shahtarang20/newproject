import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { trackEvent } from '@/api/endpoints/storefront';
import { getErrorMessage } from '@/utils/errors';
import type { PublicProduct } from '@/types/storefront';
import { useStorefront } from '../hooks/useStorefront';
import { useCreateEnquiry } from '../hooks/useStorefrontApi';
import { Honeypot, SfButton, SfChip, SfDialog, SfField, SfInput, SfTextarea } from './ui-sf';

const SUGGESTIONS = ['Is this available in another colour?', 'Do you have XL?', 'What is the price?', 'Can I get this tomorrow?'];

const schema = z.object({
  customerName: z.string().trim().min(2, 'Please enter your name').max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')),
  question: z.string().trim().min(5, 'Please type your question').max(1000),
  website: z.string().max(0).optional(),
});
type FormValues = z.input<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: PublicProduct;
  variantId?: string;
}

export function EnquiryDialog({ open, onOpenChange, product, variantId }: Props) {
  const { shopSlug } = useStorefront();
  const mutation = useCreateEnquiry(shopSlug);
  const [done, setDone] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { customerName: '', phone: '', question: '', website: '' } });
  const { register, handleSubmit, setValue, reset, formState: { errors } } = form;

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setDone(false);
        mutation.reset();
        reset();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = handleSubmit(async (values) => {
    const parsed = schema.parse(values);
    await mutation.mutateAsync({
      customerName: parsed.customerName,
      phone: parsed.phone,
      question: parsed.question,
      productId: product?.id,
      variantId,
      website: values.website,
    });
    trackEvent(shopSlug, { type: 'ENQUIRY', productId: product?.id });
    setDone(true);
  });

  return (
    <SfDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="center"
      title={done ? 'Enquiry sent' : 'Ask about this product'}
      description={product && !done ? product.name : undefined}
    >
      {done ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="mb-3 h-12 w-12 text-[color:var(--sf-primary)]" aria-hidden="true" />
          <p className="font-display text-xl font-semibold">Thank you!</p>
          <p className="mt-1 text-sm text-[color:var(--sf-muted-fg)]">The shop will get back to you shortly on your phone number.</p>
          <SfButton className="mt-5" onClick={() => onOpenChange(false)}>
            Done
          </SfButton>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="relative space-y-4">
          <Honeypot {...register('website')} />
          <SfField label="Your name" htmlFor="enq-name" error={errors.customerName?.message}>
            <SfInput id="enq-name" autoComplete="name" aria-invalid={!!errors.customerName} {...register('customerName')} />
          </SfField>
          <SfField label="Mobile number" htmlFor="enq-phone" error={errors.phone?.message}>
            <SfInput id="enq-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!errors.phone} {...register('phone')} />
          </SfField>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[color:var(--sf-muted-fg)]">Quick questions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <SfChip key={s} onClick={() => setValue('question', s, { shouldValidate: true })}>
                  {s}
                </SfChip>
              ))}
            </div>
          </div>
          <SfField label="Your question" htmlFor="enq-q" error={errors.question?.message}>
            <SfTextarea id="enq-q" rows={3} aria-invalid={!!errors.question} {...register('question')} />
          </SfField>
          {mutation.isError && (
            <p role="alert" className="text-sm text-red-600">
              {getErrorMessage(mutation.error, 'We could not send your enquiry. Please try again.')}
            </p>
          )}
          <SfButton type="submit" className="w-full" loading={mutation.isPending}>
            Send enquiry
          </SfButton>
        </form>
      )}
    </SfDialog>
  );
}
