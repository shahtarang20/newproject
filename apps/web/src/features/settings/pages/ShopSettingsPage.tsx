import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks/usePermission';
import { getErrorMessage } from '@/utils/errors';
import { pageTitle } from '@/utils/seo';
import { ContactSection } from '../components/ContactSection';
import { HoursSection } from '../components/HoursSection';
import { PaymentsSection, ShippingSection } from '../components/PaymentsShippingSections';
import { ProfileSection } from '../components/ProfileSection';
import { PublicLinkSection } from '../components/PublicLinkSection';
import { SeoSection } from '../components/SeoSection';
import { formToUpdate, shopSettingsSchema, shopToForm, type ShopSettingsForm } from '../schemas';
import { useShopQuery, useUpdateShop } from '../hooks/useShop';

export default function ShopSettingsPage() {
  const { can } = usePermission();
  const canWrite = can('settings:write');
  const { data: shop, isLoading, error, refetch } = useShopQuery();
  const update = useUpdateShop();

  const form = useForm<ShopSettingsForm>({ resolver: zodResolver(shopSettingsSchema) });
  const { isDirty } = form.formState;

  // Reset when the server copy changes (initial load, or after a save), but never clobber unsaved edits.
  useEffect(() => {
    if (shop && !form.formState.isDirty) form.reset(shopToForm(shop));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  const onSubmit = form.handleSubmit(
    async (values) => {
      try {
        const saved = await update.mutateAsync(formToUpdate(values));
        form.reset(shopToForm(saved));
        toast.success('Shop settings saved');
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not save settings'));
      }
    },
    () => toast.error('Please fix the highlighted fields.'),
  );

  return (
    <>
      <Helmet><title>{pageTitle('Shop settings')}</title></Helmet>
      <PageHeader
        title="Shop settings"
        description="Profile, contact details, hours, payments and more."
        breadcrumb={<Link to="/dashboard/settings" className="inline-flex items-center gap-0.5 hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /> Settings</Link>}
      />
      {isLoading && (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}</div>
      )}
      {error && !shop && <ErrorState error={error} onRetry={() => void refetch()} />}
      {shop && (
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate className="space-y-5 pb-24">
            <fieldset disabled={!canWrite} className="space-y-5 [&:disabled]:opacity-90">
              <ProfileSection shop={shop} disabled={!canWrite} />
              <ContactSection />
              <HoursSection />
              <PublicLinkSection shop={shop} disabled={!canWrite} />
              <SeoSection shop={shop} />
              <PaymentsSection />
              <ShippingSection />
            </fieldset>
            <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-2xl border bg-card/95 p-3 shadow-card backdrop-blur">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {!canWrite ? "You don't have permission to edit settings." : isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" disabled={!isDirty || update.isPending} onClick={() => form.reset(shopToForm(shop))}>Discard</Button>
                <Button type="submit" disabled={!isDirty || !canWrite} loading={update.isPending}>Save changes</Button>
              </div>
            </div>
          </form>
        </FormProvider>
      )}
    </>
  );
}
