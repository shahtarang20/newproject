import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { categoriesApi } from '@/api/endpoints/categories';
import { queryKeys } from '@/api/queryKeys';
import { usePermission } from '@/hooks/usePermission';
import type { Category } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';
import { CategoryDialog } from '../components/CategoryDialog';

const NONE = '__none__';

function collectIds(c: Category): string[] {
  return [c.id, ...(c.children ?? []).flatMap(collectIds)];
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermission();
  const canWrite = can('categories:write');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ category: Category | null; parentId?: string | null } | null>(null);
  const [del, setDel] = useState<Category | null>(null);
  const [reassign, setReassign] = useState(NONE);

  const q = useQuery({ queryKey: queryKeys.categories.list({ tree: true }), queryFn: () => categoriesApi.list({ tree: true }) });
  const roots = q.data ?? [];
  const invalidate = () => { void qc.invalidateQueries({ queryKey: queryKeys.categories.all }); };

  const reorder = useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => categoriesApi.reorder(items),
    onSuccess: invalidate,
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: ({ c, to }: { c: Category; to?: string }) => categoriesApi.remove(c.id, to),
    onSuccess: () => { toast.success('Category deleted'); setDel(null); invalidate(); void qc.invalidateQueries({ queryKey: queryKeys.products.all }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const move = (siblings: Category[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    const order = [...siblings];
    [order[i], order[j]] = [order[j]!, order[i]!];
    reorder.mutate(order.map((c, n) => ({ id: c.id, sortOrder: n })));
  };

  const reassignTargets = useMemo(() => {
    if (!del) return [];
    const banned = new Set(collectIds(del));
    const flat = (cs: Category[], d = 0): { id: string; name: string }[] =>
      cs.flatMap((c) => [{ id: c.id, name: `${'— '.repeat(d)}${c.name}` }, ...flat(c.children ?? [], d + 1)]);
    return flat(roots).filter((c) => !banned.has(c.id));
  }, [del, roots]);

  const startDelete = async (c: Category) => {
    if (c.productCount === 0 && c.childCount === 0) {
      if (await confirm({ title: `Delete "${c.name}"?`, description: 'This category is empty and will be removed.', confirmText: 'Delete', destructive: true })) remove.mutate({ c });
      return;
    }
    setReassign(NONE);
    setDel(c);
  };

  const row = (c: Category, siblings: Category[], i: number, depth: number) => {
    const open = expanded.has(c.id);
    const hasKids = (c.children?.length ?? 0) > 0;
    return (
      <li key={c.id}>
        <div className={cn('flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-secondary/50', !c.isActive && 'opacity-60')} style={{ paddingLeft: 8 + depth * 24 }}>
          <button type="button" className={cn('h-6 w-6 shrink-0 text-muted-foreground', !hasKids && 'invisible')} aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <FolderTree className="h-4 w-4 text-muted-foreground" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{c.name}</p>
            <p className="truncate text-xs text-muted-foreground">{c.productCount} product{c.productCount === 1 ? '' : 's'}{c.childCount ? ` · ${c.childCount} sub` : ''}</p>
          </div>
          {!c.isActive && <Badge variant="neutral" className="hidden sm:inline-flex">Hidden</Badge>}
          {canWrite && (
            <div className="flex shrink-0 items-center">
              <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0 || reorder.isPending} onClick={() => move(siblings, i, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={i === siblings.length - 1 || reorder.isPending} onClick={() => move(siblings, i, 1)}><ArrowDown className="h-4 w-4" /></Button>
              {depth === 0 && <Button variant="ghost" size="icon-sm" aria-label="Add subcategory" onClick={() => { setExpanded((s) => new Set(s).add(c.id)); setDialog({ category: null, parentId: c.id }); }}><Plus className="h-4 w-4" /></Button>}
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => setDialog({ category: c })}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${c.name}`} onClick={() => startDelete(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          )}
        </div>
        {hasKids && open && <ul>{c.children!.map((k, n) => row(k, c.children!, n, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <>
      <PageHeader title="Categories" description="Organise products into categories and subcategories."
        actions={canWrite && <Button onClick={() => setDialog({ category: null, parentId: null })}><Plus className="h-4 w-4" /> New category</Button>} />

      {q.isLoading ? (
        <Card className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</Card>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : roots.length === 0 ? (
        <EmptyState icon={FolderTree} title="No categories yet" description="Create categories like Sarees, Kurtas or Kidswear to help customers browse."
          action={canWrite ? <Button onClick={() => setDialog({ category: null, parentId: null })}><Plus className="h-4 w-4" /> New category</Button> : undefined} />
      ) : (
        <Card className="p-2"><ul>{roots.map((c, i) => row(c, roots, i, 0))}</ul></Card>
      )}

      <CategoryDialog
        open={!!dialog}
        onOpenChange={(o) => !o && setDialog(null)}
        category={dialog?.category ?? null}
        defaultParentId={dialog?.parentId}
        parents={roots.filter((r) => r.id !== dialog?.category?.id).map((r) => ({ id: r.id, name: r.name }))}
      />

      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete "{del?.name}"?</DialogTitle>
            <DialogDescription>
              This category has {del?.productCount ?? 0} product(s) and {del?.childCount ?? 0} subcategor{del?.childCount === 1 ? 'y' : 'ies'}. Choose where they should go.
            </DialogDescription>
          </DialogHeader>
          <Select value={reassign} onValueChange={setReassign}>
            <SelectTrigger aria-label="Move items to"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Uncategorised (subcategories become top level)</SelectItem>
              {reassignTargets.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDel(null)}>Cancel</Button>
            <Button variant="destructive" loading={remove.isPending} onClick={() => del && remove.mutate({ c: del, to: reassign === NONE ? 'none' : reassign })}>Delete category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
