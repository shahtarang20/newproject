import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Eye, EyeOff, MoreHorizontal, Pencil, Plus, QrCode, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { SearchInput } from '@/components/common/SearchInput';
import { LimitBanner } from '@/components/common/LimitBanner';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { cataloguesApi } from '@/api/endpoints/catalogues';
import { shopUsageApi } from '@/api/endpoints/products';
import { queryKeys } from '@/api/queryKeys';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';
import type { Catalogue } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';
import { ShareDialog } from '@/features/products/components/ShareDialog';
import { publicCatalogueUrl } from '@/features/products/utils';
import { CatalogueSheet } from '../components/CatalogueSheet';

function schedule(c: Catalogue): { label: string; variant: 'info' | 'success' | 'neutral' } | null {
  const now = Date.now();
  if (c.startDate && new Date(c.startDate).getTime() > now) return { label: 'Scheduled', variant: 'info' };
  if (c.endDate && new Date(c.endDate).getTime() < now) return { label: 'Expired', variant: 'neutral' };
  if (c.startDate || c.endDate) return { label: 'Live', variant: 'success' };
  return null;
}

export default function CataloguesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermission();
  const { shop } = useAuth();
  const canWrite = can('catalogues:write');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<{ catalogue: Catalogue | null } | null>(null);
  const [share, setShare] = useState<Catalogue | null>(null);

  const params = { page, limit: 12, search: q || undefined, sort: '-createdAt' };
  const list = useQuery({ queryKey: queryKeys.catalogues.list(params), queryFn: () => cataloguesApi.list(params), placeholderData: (p) => p });
  const usage = useQuery({ queryKey: queryKeys.shop.usage(), queryFn: shopUsageApi.get, staleTime: 30_000 });
  const cu = usage.data?.usage.find((u) => u.key === 'catalogues');
  const atLimit = !!cu && cu.limit != null && cu.used >= cu.limit;

  const invalidate = () => { void qc.invalidateQueries({ queryKey: queryKeys.catalogues.all }); void qc.invalidateQueries({ queryKey: queryKeys.shop.usage() }); };
  const toggle = useMutation({
    mutationFn: (c: Catalogue) => (c.isPublished ? cataloguesApi.unpublish(c.id) : cataloguesApi.publish(c.id)),
    onSuccess: (c) => { toast.success(c.isPublished ? 'Catalogue published' : 'Catalogue unpublished'); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (c: Catalogue) => cataloguesApi.remove(c.id),
    onSuccess: () => { toast.success('Catalogue deleted'); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const del = async (c: Catalogue) => {
    if (await confirm({ title: 'Delete catalogue?', description: `"${c.name}" will be removed. Products are not deleted.`, confirmText: 'Delete', destructive: true })) remove.mutate(c);
  };

  const items = list.data?.items ?? [];
  const newBtn = canWrite && (
    <Button onClick={() => setSheet({ catalogue: null })} disabled={atLimit} title={atLimit ? 'Catalogue limit reached' : undefined}><Plus className="h-4 w-4" /> New catalogue</Button>
  );

  return (
    <>
      <PageHeader title="Catalogues" description="Curated product collections you can share with customers." actions={newBtn} />
      {cu && <LimitBanner limitKey="catalogues" used={cu.used} limit={cu.limit} className="mb-4" />}
      <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search catalogues…" className="mb-4 max-w-sm" />

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={BookOpen} title={q ? 'No catalogues found' : 'No catalogues yet'} description={q ? 'Try another search.' : 'Create a catalogue such as "Diwali Edit" and share it on WhatsApp.'} action={!q ? newBtn || undefined : undefined} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <div className="relative aspect-[16/9] bg-muted">
                  {c.coverUrl ? <img src={c.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><BookOpen className="h-8 w-8" /></div>}
                  <Badge variant={c.isPublished ? 'success' : 'neutral'} className="absolute left-3 top-3 bg-background/90">{c.isPublished ? 'Published' : 'Draft'}</Badge>
                  {schedule(c) && <Badge variant={schedule(c)!.variant} className="absolute right-3 top-3 bg-background/90">{schedule(c)!.label}</Badge>}
                </div>
                <div className="flex items-start gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.productCount} product{c.productCount === 1 ? '' : 's'} · {c.viewCount} views</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {canWrite && <DropdownMenuItem onSelect={() => setSheet({ catalogue: c })}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>}
                      <DropdownMenuItem onSelect={() => setShare(c)}><QrCode className="h-4 w-4" /> Share / QR</DropdownMenuItem>
                      {canWrite && (
                        <DropdownMenuItem onSelect={() => toggle.mutate(c)}>{c.isPublished ? <><EyeOff className="h-4 w-4" /> Unpublish</> : <><Eye className="h-4 w-4" /> Publish</>}</DropdownMenuItem>
                      )}
                      {canWrite && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => del(c)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem></>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
          <Pagination meta={list.data?.meta} onPageChange={setPage} className="mt-4" />
        </>
      )}

      {sheet && <CatalogueSheet open onOpenChange={(o) => !o && setSheet(null)} catalogue={sheet.catalogue} />}
      {share && (
        <ShareDialog open onOpenChange={(o) => !o && setShare(null)} url={publicCatalogueUrl(shop?.slug ?? '', share.slug)} title={share.name}
          shareText={`Browse our ${share.name} catalogue`} fileName={`qr-${share.slug}`} />
      )}
    </>
  );
}
