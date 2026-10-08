import { useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { categoriesApi } from '@/api/endpoints/categories';
import { queryKeys } from '@/api/queryKeys';
import { getErrorMessage } from '@/utils/errors';
import { useWizard } from './context';
import { Field, StepCard } from './fields';

const NONE = '__none__';

export function CategoryStep() {
  const { form, canCategories } = useWizard();
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: queryKeys.categories.list({ tree: true }), queryFn: () => categoriesApi.list({ tree: true }) });
  const categoryId = form.watch('categoryId');
  const roots = cats.data ?? [];
  const subs = useMemo(() => roots.find((c) => c.id === categoryId)?.children ?? [], [roots, categoryId]);

  const [dlg, setDlg] = useState<{ parentId: string | null } | null>(null);
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: () => categoriesApi.create({ name: name.trim(), parentId: dlg?.parentId ?? null }),
    onSuccess: async (c) => {
      toast.success(`Category "${c.name}" created`);
      await qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      if (dlg?.parentId) form.setValue('subcategoryId', c.id, { shouldDirty: true });
      else {
        form.setValue('categoryId', c.id, { shouldDirty: true });
        form.setValue('subcategoryId', '', { shouldDirty: true });
      }
      setDlg(null);
      setName('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (cats.isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (cats.isError) return <ErrorState error={cats.error} onRetry={() => cats.refetch()} />;

  return (
    <StepCard title="Category" description="Organise the product so customers can browse it. Optional, but recommended.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <div className="flex gap-2">
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(v) => { field.onChange(v === NONE ? '' : v); form.setValue('subcategoryId', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No category</SelectItem>
                    {roots.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {canCategories && <Button type="button" variant="outline" size="icon" aria-label="Create category" onClick={() => setDlg({ parentId: null })}><Plus className="h-4 w-4" /></Button>}
          </div>
        </Field>
        <Field label="Subcategory">
          <div className="flex gap-2">
            <Controller
              control={form.control}
              name="subcategoryId"
              render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? '' : v)} disabled={!categoryId}>
                  <SelectTrigger><SelectValue placeholder={categoryId ? 'Choose subcategory' : 'Pick a category first'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {subs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {canCategories && <Button type="button" variant="outline" size="icon" aria-label="Create subcategory" disabled={!categoryId} onClick={() => setDlg({ parentId: categoryId })}><Plus className="h-4 w-4" /></Button>}
          </div>
        </Field>
      </div>
      {roots.length === 0 && <p className="text-sm text-muted-foreground">You have no categories yet{canCategories ? ' — create one with the + button.' : '.'}</p>}

      <Dialog open={!!dlg} onOpenChange={(o) => { if (!o) { setDlg(null); setName(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dlg?.parentId ? 'New subcategory' : 'New category'}</DialogTitle>
            <DialogDescription>You can add an image and more details later from the Categories page.</DialogDescription>
          </DialogHeader>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" maxLength={80}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { e.preventDefault(); create.mutate(); } }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button>
            <Button disabled={!name.trim()} loading={create.isPending} onClick={() => create.mutate()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StepCard>
  );
}
