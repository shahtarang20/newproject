import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, ChevronLeft, Info, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePermission } from '@/hooks/usePermission';
import { getErrorMessage } from '@/utils/errors';
import { pageTitle } from '@/utils/seo';
import type { ShopDto } from '@/types/settings';
import { SettingsSection, ToggleRow } from '../components/SettingsSection';
import { useShopQuery, useUpdateShop } from '../hooks/useShop';

const schema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  whatsapp: z.boolean(),
  emailTo: z.string().trim().email('Enter a valid email').or(z.literal('')),
  whatsappTo: z.string().trim().max(20).regex(/^\+?[0-9 ]*$/, 'Digits only, with country code'),
  lowStockThreshold: z.coerce.number({ invalid_type_error: 'Enter a number' }).int('Whole number').min(0).max(100000),
}).superRefine((v, ctx) => {
  if (v.email && !v.emailTo) ctx.addIssue({ code: 'custom', path: ['emailTo'], message: 'Add an email address to receive email alerts' });
  if (v.whatsapp && !v.whatsappTo) ctx.addIssue({ code: 'custom', path: ['whatsappTo'], message: 'Add a WhatsApp number to receive alerts' });
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const toForm = (s: ShopDto['notificationSettings']): FormIn => ({
  inApp: s?.inApp ?? true,
  email: s?.email ?? false,
  whatsapp: s?.whatsapp ?? false,
  emailTo: s?.emailTo ?? '',
  whatsappTo: s?.whatsappTo ?? '',
  lowStockThreshold: s?.lowStockThreshold ?? 5,
});

const EVENTS = [
  'New orders and order cancellations',
  'New customer enquiries',
  'Payments received',
  'Low stock and out-of-stock products',
  'Plan limit warnings',
];

export default function NotificationSettingsPage() {
  const { can } = usePermission();
  const canWrite = can('settings:write');
  const { data: shop, isLoading, error, refetch } = useShopQuery();
  const update = useUpdateShop();
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema), defaultValues: toForm(undefined) });
  const { isDirty } = form.formState;

  useEffect(() => {
    if (shop && !form.formState.isDirty) form.reset(toForm(shop.notificationSettings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync({ notificationSettings: values });
      form.reset(toForm(saved.notificationSettings));
      toast.success('Notification settings saved');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save notification settings'));
    }
  });

  const channel = (name: 'inApp' | 'email' | 'whatsapp', title: string, description: string) => (
    <ToggleRow title={title} description={description}>
      <Controller control={form.control} name={name} render={({ field }) => (
        <Switch aria-label={title} checked={!!field.value} onCheckedChange={field.onChange} disabled={!canWrite} />
      )} />
    </ToggleRow>
  );

  return (
    <>
      <Helmet><title>{pageTitle('Notification settings')}</title></Helmet>
      <PageHeader
        title="Notification settings"
        description="Choose how you are alerted about activity in your shop."
        breadcrumb={<Link to="/dashboard/settings" className="inline-flex items-center gap-0.5 hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /> Settings</Link>}
      />
      {isLoading && <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>}
      {error && !shop && <ErrorState error={error} onRetry={() => void refetch()} />}
      {shop && (
        <form onSubmit={onSubmit} noValidate className="space-y-5 pb-24">
          <SettingsSection title="Channels" description="Each channel you switch on receives every alert type listed below.">
            <div className="space-y-3">
              {channel('inApp', 'In-app', 'Shows in the bell menu at the top of your dashboard.')}
              {channel('email', 'Email', 'Sent to the address below.')}
              {channel('whatsapp', 'WhatsApp', 'Sent to the number below.')}
            </div>
            <div className="mt-4 flex gap-2 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p>Alerts in this list are sent on every channel you enable: {EVENTS.join('; ').toLowerCase()}.</p>
                <p>Email and WhatsApp delivery depend on credentials configured on the server by the platform. If they are not set up, these alerts are not delivered even when the switch is on; in-app alerts always work. We do not show a "connected" state because the app cannot verify it.</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Where to send alerts">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="emailTo" label={<span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Alert email</span>} render={({ field, id, ...a }) => (
                <Input {...field} id={id} type="email" inputMode="email" disabled={!canWrite} placeholder="owner@yourshop.com" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
              )} />
              <FormField control={form.control} name="whatsappTo" label={<span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp number</span>} hint="With country code, e.g. 919876543210" render={({ field, id, ...a }) => (
                <Input {...field} id={id} type="tel" inputMode="tel" disabled={!canWrite} aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
              )} />
            </div>
          </SettingsSection>

          <SettingsSection title="Low stock" description="Get alerted when a product's stock falls to this number or below.">
            <div className="max-w-xs">
              <FormField control={form.control} name="lowStockThreshold" label="Low stock threshold" render={({ field, id, ...a }) => (
                <Input id={id} name={field.name} ref={field.ref} onBlur={field.onBlur} onChange={field.onChange} value={String(field.value ?? '')} type="number" inputMode="numeric" min={0} disabled={!canWrite} aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
              )} />
            </div>
          </SettingsSection>

          <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-2xl border bg-card/95 p-3 shadow-card backdrop-blur">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Bell className="h-4 w-4" />{!canWrite ? "You don't have permission to edit settings." : isDirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => form.reset(toForm(shop.notificationSettings))}>Discard</Button>
              <Button type="submit" disabled={!isDirty || !canWrite} loading={update.isPending}>Save changes</Button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
