import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FormError } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categoriesApi } from '@/api/endpoints/categories';
import { CATALOGUE_LAYOUTS, type CatalogueLayout } from '@vastra/shared';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/components/common/ErrorState';
import { cataloguesApi } from '@/api/endpoints/catalogues';
import { queryKeys } from '@/api/queryKeys';
import type { Catalogue, CataloguePickedProduct, Product } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';
import { ProductPicker } from '@/features/products/components/ProductPicker';
import { LimitReachedAlert } from '@/features/products/components/LimitReached';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(2000),
  isPublished: z.boolean(),
  startDate: z.string(),
  endDate: z.string(),
  layout: z.string(),
}).refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: 'End date must be on or after start date', path: ['endDate'] });
type Values = z.infer<typeof schema>;
type Slim = Pick<CataloguePickedProduct, 'id' | 'name' | 'imageUrl' | 'sku'>;

export function CatalogueSheet({ open, onOpenChange, catalogue }: { open: boolean; onOpenChange: (o: boolean) => void; catalogue: Catalogue | null }) {
  const qc = useQueryClient();
  const editing = !!catalogue;
  const [ids, setIds] = useState<string[]>([]);
  const [known, setKnown] = useState<Record<string, Slim>>({});
  const [catIds, setCatIds] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', isPublished: false, startDate: '', endDate: '', layout: '' },
  });

  const detail = useQuery({
    queryKey: queryKeys.catalogues.detail(catalogue?.id ?? ''),
    queryFn: () => cataloguesApi.get(catalogue!.id),
    enabled: open && editing,
  });

  useEffect(() => {
    if (!open) return;
    setCoverFile(null);
    setCoverPreview(catalogue?.coverUrl ?? null);
    if (!catalogue) { reset({ name: '', description: '', isPublished: false, startDate: '', endDate: '', layout: '' }); setIds([]); setCatIds([]); return; }
    reset({ name: catalogue.name, description: catalogue.description ?? '', isPublished: catalogue.isPublished,
      startDate: catalogue.startDate?.slice(0, 10) ?? '', endDate: catalogue.endDate?.slice(0, 10) ?? '', layout: catalogue.layout ?? '' });
    setIds(catalogue.productIds);
    setCatIds(catalogue.categoryIds ?? []);
  }, [open, catalogue, reset]);

  useEffect(() => {
    if (!detail.data) return;
    setIds(detail.data.productIds);
    setKnown((k) => ({ ...k, ...Object.fromEntries(detail.data.products.map((p) => [p.id, p])) }));
  }, [detail.data]);

  const cats = useQuery({ queryKey: queryKeys.categories.list({ tree: true }), queryFn: () => categoriesApi.list({ tree: true }), enabled: open, staleTime: 60_000 });
  const flatCats = (function f(cs: typeof cats.data, d = 0): { id: string; name: string }[] { return (cs ?? []).flatMap((c) => [{ id: c.id, name: c.name }, ...f(c.children, d + 1)]); })(cats.data);

  const remember = (ps: Product[]) =>
    setKnown((k) => ({ ...k, ...Object.fromEntries(ps.map((p) => [p.id, { id: p.id, name: p.name, sku: p.sku, imageUrl: p.primaryThumbUrl }])) }));

  const save = useMutation({
    mutationFn: async (v: Values) => {
      const body = {
        name: v.name.trim(), description: v.description.trim(), productIds: ids, isPublished: v.isPublished, categoryIds: catIds,
        startDate: v.startDate ? new Date(`${v.startDate}T00:00:00`).toISOString() : null,
        endDate: v.endDate ? new Date(`${v.endDate}T23:59:59`).toISOString() : null,
        layout: (v.layout || null) as CatalogueLayout | null,
      };
      let saved = catalogue ? await cataloguesApi.update(catalogue.id, body) : await cataloguesApi.create(body);
      if (coverFile) saved = await cataloguesApi.uploadCover(saved.id, coverFile);
      return saved;
    },
    onSuccess: (c) => {
      toast.success(editing ? 'Catalogue saved' : `Catalogue "${c.name}" created`);
      void qc.invalidateQueries({ queryKey: queryKeys.catalogues.all });
      onOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const pickCover = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/') || f.size > 10 * 1024 * 1024) return toast.error('Use an image under 10 MB.');
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const n = [...ids];
    [n[i], n[j]] = [n[j]!, n[i]!];
    setIds(n);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-2xl flex-col gap-4 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit catalogue' : 'New catalogue'}</SheetTitle>
          <SheetDescription>Curate a shareable collection of products.</SheetDescription>
        </SheetHeader>
        <LimitReachedAlert error={save.error} />
        <form id="catalogue-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="flex-1 space-y-4">
          <Tabs defaultValue="details">
            <TabsList><TabsTrigger value="details">Details</TabsTrigger><TabsTrigger value="products">Products ({ids.length})</TabsTrigger></TabsList>
            <TabsContent value="details" className="space-y-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} aria-label="Upload cover image"
                  className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted text-muted-foreground hover:bg-secondary">
                  {coverPreview ? <img src={coverPreview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files?.[0])} />
                <p className="text-xs text-muted-foreground">Cover image shown on the catalogue page and when shared.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" {...register('name')} maxLength={120} aria-invalid={!!errors.name} />
                <FormError message={errors.name?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea id="cat-desc" rows={3} {...register('description')} maxLength={2000} />
                <FormError message={errors.description?.message} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="cat-start">Start date</Label><Input id="cat-start" type="date" {...register('startDate')} /></div>
                <div className="space-y-1.5"><Label htmlFor="cat-end">End date</Label><Input id="cat-end" type="date" {...register('endDate')} aria-invalid={!!errors.endDate} /><FormError message={errors.endDate?.message} /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Layout</Label>
                <Select value={watch('layout') || '__default__'} onValueChange={(v) => setValue('layout', v === '__default__' ? '' : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="__default__">Shop default</SelectItem>{CATALOGUE_LAYOUTS.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Highlighted categories</Label>
                <div className="flex flex-wrap gap-2">
                  {flatCats.length === 0 && <p className="text-xs text-muted-foreground">No categories yet.</p>}
                  {flatCats.map((c) => {
                    const on = catIds.includes(c.id);
                    return <button key={c.id} type="button" aria-pressed={on} onClick={() => setCatIds(on ? catIds.filter((x) => x !== c.id) : [...catIds, c.id])}
                      className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-secondary'}`}>{c.name}</button>;
                  })}
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <span><span className="block text-sm font-medium">Published</span><span className="text-xs text-muted-foreground">Visible to customers via its public link.</span></span>
                <Switch checked={watch('isPublished')} onCheckedChange={(v) => setValue('isPublished', v)} aria-label="Published" />
              </label>
            </TabsContent>
            <TabsContent value="products" className="space-y-4">
              {ids.length > 0 && (
                detail.isLoading && editing ? <Skeleton className="h-24 w-full" /> : (
                  <ol className="space-y-1.5">
                    {ids.map((id, i) => {
                      const p = known[id];
                      return (
                        <li key={id} className="flex items-center gap-2 rounded-xl border p-2">
                          <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">{p?.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}</span>
                          <span className="min-w-0 flex-1 truncate text-sm">{p?.name ?? 'Product'}</span>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={i === ids.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove" onClick={() => setIds(ids.filter((x) => x !== id))}><X className="h-4 w-4" /></Button>
                        </li>
                      );
                    })}
                  </ol>
                )
              )}
              {detail.isError && <ErrorState error={detail.error} onRetry={() => detail.refetch()} />}
              <p className="text-sm font-medium">Add products</p>
              <ProductPicker value={ids} onChange={setIds} onProductsLoaded={remember} allowAddByCategory max={500} />
            </TabsContent>
          </Tabs>
        </form>
        <SheetFooter className="sticky bottom-0 bg-background pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="catalogue-form" loading={save.isPending}>{editing ? 'Save changes' : 'Create catalogue'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
