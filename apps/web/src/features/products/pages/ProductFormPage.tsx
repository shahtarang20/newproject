import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, CloudOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { productsApi } from '@/api/endpoints/products';
import { queryKeys } from '@/api/queryKeys';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';
import type { Media, Product } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';
import { LimitReachedAlert } from '../components/LimitReached';
import { WizardContext, type WizardCtx } from '../wizard/context';
import { STEPS, emptyValues, productToValues, validateStep, type StepId, type WizardValues } from '../wizard/schema';
import { useProductDraft } from '../wizard/useProductDraft';
import { BasicInfoStep } from '../wizard/steps.basic';
import { CategoryStep } from '../wizard/steps.category';
import { MediaStep } from '../wizard/steps.media';
import { VariantsStep, applyMatrix } from '../wizard/steps.variants';
import { PricingStep } from '../wizard/steps.pricing';
import { InventoryStep } from '../wizard/steps.inventory';
import { SeoStep } from '../wizard/steps.seo';
import { PreviewStep } from '../wizard/steps.preview';
import { PublishStep } from '../wizard/steps.publish';

function SaveIndicator({ state, onRetry }: { state: WizardCtx['saveState']; onRetry: () => void }) {
  if (state === 'saving') return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span>;
  if (state === 'saved') return <span className="inline-flex items-center gap-1.5 text-xs text-success" role="status"><Check className="h-3.5 w-3.5" /> Saved</span>;
  if (state === 'error') return <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-xs text-destructive"><CloudOff className="h-3.5 w-3.5" /> Save failed — retry</button>;
  if (state === 'dirty') return <span className="text-xs text-muted-foreground" role="status">Unsaved changes</span>;
  return null;
}

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermission();
  const { shop } = useAuth();
  const canWrite = can('products:write');
  const canStock = can('inventory:write');

  const form = useForm<WizardValues>({ defaultValues: emptyValues() });
  const [product, setProduct] = useState<Product | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'draft' | 'publish' | 'unpublish' | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [hydrated, setHydrated] = useState(!id);
  const leaving = useRef(false);
  const step = STEPS[stepIdx]!;

  const detail = useQuery({
    queryKey: queryKeys.products.detail(id ?? 'new'),
    queryFn: () => productsApi.get(id!),
    enabled: !!id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const draft = useProductDraft({
    form, initialId: id ?? null, canWrite, canStock,
    onProduct: (p) => setProduct((prev) => ({ ...(prev ?? {}), ...p, media: prev?.media, variants: prev?.variants }) as Product),
    onCreated: (p) => {
      setProduct(p);
      window.history.replaceState(window.history.state, '', `/dashboard/products/${p.id}`);
    },
  });
  const { markHydrated, saveNow, hasUnsaved } = draft;

  // hydrate once
  useEffect(() => {
    if (hydrated) return;
    if (id && detail.data) {
      const values = productToValues(detail.data);
      form.reset(values);
      setProduct(detail.data);
      setMedia(detail.data.media ?? []);
      markHydrated(detail.data, form.getValues());
      setMaxReached(STEPS.length - 1);
      setHydrated(true);
    }
  }, [detail.data, hydrated, id, form, markHydrated]);
  useEffect(() => {
    if (!id) markHydrated(null, form.getValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // live re-validation once a step has shown errors
  useEffect(() => {
    const sub = form.watch(() => {
      setErrors((cur) => (Object.keys(cur).length ? validateStep(step.id, form.getValues()) : cur));
    });
    return () => sub.unsubscribe();
  }, [form, step.id]);

  // leave warnings
  const blocker = useBlocker(() => canWrite && hasUnsaved && !leaving.current);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    void confirm({ title: 'Leave without saving?', description: 'Some changes have not been saved yet.', confirmText: 'Leave', cancelText: 'Stay', destructive: true })
      .then((ok) => (ok ? blocker.proceed() : blocker.reset()));
  }, [blocker, confirm]);
  useEffect(() => {
    if (!hasUnsaved) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [hasUnsaved]);

  const ensureProduct = useCallback(async () => {
    const pid = await saveNow({ create: true });
    if (!pid) throw new Error('Enter a product name first (step 1).');
    return pid;
  }, [saveNow]);

  const goTo = useCallback((target: StepId) => {
    const i = STEPS.findIndex((s) => s.id === target);
    if (i >= 0) { setErrors({}); setStepIdx(i); setMaxReached((m) => Math.max(m, i)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }, []);

  const next = async () => {
    if (step.id === 'variants') applyMatrix(form);
    const errs = validateStep(step.id, form.getValues());
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please fix the highlighted fields.');
      return;
    }
    if (canWrite && (step.id === 'basic' || draft.productId)) {
      try { await saveNow({ create: step.id === 'basic' }); } catch (e) { toast.error(getErrorMessage(e, 'Could not save draft')); if (step.id === 'basic') return; }
    }
    goTo(STEPS[stepIdx + 1]!.id);
  };
  const back = () => goTo(STEPS[stepIdx - 1]!.id);

  const jump = (i: number) => {
    if (i <= stepIdx) return goTo(STEPS[i]!.id);
    if (i <= maxReached) return goTo(STEPS[i]!.id);
    if (i === stepIdx + 1) void next();
  };

  const exit = () => { leaving.current = true; navigate('/dashboard/products'); };

  const saveDraftAndExit = async () => {
    setBusy('draft'); setActionError(null);
    try { await saveNow({ create: true }); toast.success('Draft saved'); exit(); }
    catch (e) { setActionError(e); toast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const publish = async () => {
    setBusy('publish'); setActionError(null);
    for (const s of ['basic', 'variants', 'pricing', 'inventory', 'seo'] as StepId[]) {
      const errs = validateStep(s, form.getValues());
      if (Object.keys(errs).length) { setErrors(errs); setBusy(null); goTo(s); toast.error('Fix the highlighted fields before publishing.'); return; }
    }
    try {
      const pid = await ensureProduct();
      const updated = await productsApi.setStatus(pid, 'ACTIVE');
      setProduct((p) => ({ ...(p ?? {}), ...updated }) as Product);
      void qc.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success(updated.status === 'OUT_OF_STOCK' ? 'Published (currently out of stock)' : 'Product published');
    } catch (e) { setActionError(e); toast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const unpublish = async () => {
    setBusy('unpublish'); setActionError(null);
    try {
      const pid = await ensureProduct();
      const updated = await productsApi.setStatus(pid, 'DRAFT');
      setProduct((p) => ({ ...(p ?? {}), ...updated }) as Product);
      void qc.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('Product moved to drafts');
    } catch (e) { setActionError(e); toast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };

  if (id && detail.isError) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  if (!hydrated) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-3 w-full" /><Skeleton className="h-72 w-full rounded-2xl" /></div>;

  const ctx: WizardCtx = {
    form, errors, productId: draft.productId, product, shopSlug: shop?.slug ?? '', media, setMedia,
    ensureProduct, saveState: draft.saveState, canWrite, canStock, canCategories: can('categories:write'), goTo,
  };
  const progress = Math.round(((stepIdx + 1) / STEPS.length) * 100);

  const body = {
    basic: <BasicInfoStep />, category: <CategoryStep />, media: <MediaStep />, variants: <VariantsStep />, pricing: <PricingStep />,
    inventory: <InventoryStep />, seo: <SeoStep />, preview: <PreviewStep />,
    publish: <PublishStep busy={busy} error={actionError} onSaveDraft={saveDraftAndExit} onPublish={publish} onUnpublish={unpublish} onCancel={exit} />,
  }[step.id];

  return (
    <WizardContext.Provider value={ctx}>
      <PageHeader
        title={id || draft.productId ? (form.watch('name') || 'Edit product') : 'New product'}
        description={`Step ${stepIdx + 1} of ${STEPS.length} · ${step.title}`}
        breadcrumb={<button type="button" onClick={exit} className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Products</button>}
        actions={<SaveIndicator state={draft.saveState} onRetry={() => void saveNow().catch((e) => toast.error(getErrorMessage(e)))} />}
      />
      <Progress value={progress} className="mb-4 h-1.5" aria-label="Progress" />
      <nav aria-label="Steps" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-1.5">
          {STEPS.map((s, i) => {
            const done = i < stepIdx || (i <= maxReached && i !== stepIdx);
            return (
              <li key={s.id}>
                <button type="button" onClick={() => jump(i)} aria-current={i === stepIdx ? 'step' : undefined}
                  className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors', i === stepIdx ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-secondary', i > maxReached && i !== stepIdx + 1 && 'opacity-50')}>
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold', done ? 'bg-success text-success-foreground' : i === stepIdx ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {!canWrite && <p className="mb-4 rounded-lg bg-muted p-3 text-sm">You have view-only access to products.</p>}
      <LimitReachedAlert error={draft.saveError} className="mb-4" />

      <fieldset disabled={!canWrite} className="min-w-0 border-0 p-0">{body}</fieldset>

      {step.id !== 'publish' && (
        <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-between gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <Button variant="outline" onClick={back} disabled={stepIdx === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
          <Button onClick={() => void next()}>{step.id === 'preview' ? 'Continue' : 'Next'} <ArrowRight className="h-4 w-4" /></Button>
        </div>
      )}
      {step.id === 'publish' && <div className="mt-6"><Button variant="outline" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button></div>}
    </WizardContext.Provider>
  );
}
