import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Package, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductStatus } from '@vastra/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { SearchInput } from '@/components/common/SearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LimitBanner } from '@/components/common/LimitBanner';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { productsApi, shopUsageApi } from '@/api/endpoints/products';
import { categoriesApi } from '@/api/endpoints/categories';
import { bulkApi } from '@/api/endpoints/bulk';
import { queryKeys } from '@/api/queryKeys';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';
import type { Category, Product, ProductListParams } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';
import { PRODUCT_TYPE_LABELS, labelOf } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { ProductRowActions } from '../components/ProductRowActions';
import { ShareDialog } from '../components/ShareDialog';
import { LimitReachedAlert } from '../components/LimitReached';
import { priceRangeText, publicProductUrl } from '../utils';

type Tab = 'ALL' | 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK' | 'ARCHIVED';
const TABS: { value: Tab; label: string }[] = [
  { value: 'ALL', label: 'All' }, { value: 'ACTIVE', label: 'Active' }, { value: 'DRAFT', label: 'Draft' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' }, { value: 'ARCHIVED', label: 'Archived' },
];
const SORTS = [
  { value: '-createdAt', label: 'Newest first' }, { value: 'createdAt', label: 'Oldest first' }, { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' }, { value: 'price', label: 'Price: low to high' }, { value: '-price', label: 'Price: high to low' },
  { value: 'stockTotal', label: 'Stock: low to high' }, { value: '-stockTotal', label: 'Stock: high to low' }, { value: '-soldCount', label: 'Best selling' },
  { value: '-updatedAt', label: 'Recently updated' },
];
const ALL = '__all__';

function flatten(cats: Category[], depth = 0): { id: string; name: string }[] {
  return cats.flatMap((c) => [{ id: c.id, name: `${'— '.repeat(depth)}${c.name}` }, ...flatten(c.children ?? [], depth + 1)]);
}

function Thumb({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  return (
    <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground', className)}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-5 w-5" />}
    </span>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermission();
  const { shop } = useAuth();
  const shopSlug = shop?.slug ?? '';
  const canWrite = can('products:write');
  const canDelete = can('products:delete');

  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('ALL');
  const [category, setCategory] = useState(ALL);
  const [lowStock, setLowStock] = useState(false);
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qrFor, setQrFor] = useState<Product | null>(null);

  const params: ProductListParams = {
    page, limit: 20, q: q || undefined, sort,
    status: tab === 'ALL' ? undefined : (tab as ProductStatus),
    category: category === ALL ? undefined : category,
    lowStock: lowStock || undefined,
  };

  const list = useQuery({ queryKey: queryKeys.products.list(params), queryFn: () => productsApi.list(params), placeholderData: (p) => p });
  const usage = useQuery({ queryKey: queryKeys.shop.usage(), queryFn: shopUsageApi.get, staleTime: 30_000 });
  const cats = useQuery({ queryKey: queryKeys.categories.list({ tree: true }), queryFn: () => categoriesApi.list({ tree: true }), staleTime: 60_000 });
  const catOptions = useMemo(() => flatten(cats.data ?? []), [cats.data]);

  const productUsage = usage.data?.usage.find((u) => u.key === 'products');
  const limitReached = !!productUsage && productUsage.limit != null && productUsage.used >= productUsage.limit;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.products.all });
    void qc.invalidateQueries({ queryKey: queryKeys.shop.usage() });
  };

  const duplicate = useMutation({
    mutationFn: (p: Product) => productsApi.duplicate(p.id),
    onSuccess: (np) => { toast.success(`Duplicated as "${np.name}"`); invalidate(); navigate(`/dashboard/products/${np.id}`); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const setStatus = useMutation({
    mutationFn: ({ p, status }: { p: Product; status: ProductStatus }) => productsApi.setStatus(p.id, status),
    onSuccess: (_, v) => { toast.success(v.status === 'ACTIVE' ? 'Product published' : v.status === 'ARCHIVED' ? 'Product archived' : 'Product unpublished'); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (p: Product) => productsApi.remove(p.id),
    onSuccess: () => { toast.success('Product deleted'); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const bulkStatus = useMutation({
    mutationFn: (status: ProductStatus) => bulkApi.status({ productIds: [...selected], status }),
    onSuccess: (r) => { toast.success(`${r.updated} of ${r.requested} products updated`); setSelected(new Set()); invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handlers = {
    onDuplicate: (p: Product) => duplicate.mutate(p),
    onToggleStatus: (p: Product, next: 'ACTIVE' | 'DRAFT') => setStatus.mutate({ p, status: next }),
    onArchive: async (p: Product) => {
      if (await confirm({ title: 'Archive this product?', description: `"${p.name}" will be hidden from your store.`, confirmText: 'Archive' })) setStatus.mutate({ p, status: 'ARCHIVED' });
    },
    onDelete: async (p: Product) => {
      if (await confirm({ title: 'Delete this product?', description: `"${p.name}" and its media will be removed. This cannot be undone.`, confirmText: 'Delete', destructive: true })) remove.mutate(p);
    },
    onQr: (p: Product) => setQrFor(p),
  };

  const items = list.data?.items ?? [];
  const allSelected = items.length > 0 && items.every((p) => selected.has(p.id));
  const someSelected = items.some((p) => selected.has(p.id));
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allSelected) items.forEach((p) => n.delete(p.id)); else items.forEach((p) => n.add(p.id));
    return n;
  });
  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const stockCell = (p: Product) => (
    <span className={cn('tabular-nums', p.stockTotal === 0 && 'text-destructive', p.stockTotal > 0 && p.stockTotal <= (p.lowStockThreshold ?? 5) && 'text-warning')}>
      {p.stockTotal}
    </span>
  );

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'select', headerClassName: 'w-10', className: 'w-10',
      header: <Checkbox checked={allSelected ? true : someSelected ? 'indeterminate' : false} onCheckedChange={toggleAll} aria-label="Select all" />,
      cell: (p) => <span onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} aria-label={`Select ${p.name}`} /></span>,
    },
    {
      key: 'name', header: 'Product', mobileTitle: true,
      cell: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <Thumb src={p.primaryThumbUrl} name={p.name} />
          <div className="min-w-0">
            <p className="max-w-[260px] truncate font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.sku} · {labelOf(PRODUCT_TYPE_LABELS, p.type)}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: (p) => p.category?.name ?? <span className="text-muted-foreground">—</span> },
    { key: 'price', header: 'Price', cell: (p) => <span className="whitespace-nowrap tabular-nums">{priceRangeText(p, shop?.currency)}</span> },
    { key: 'stock', header: 'Stock', cell: stockCell },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge type="product" status={p.status} /> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, className: 'w-12 text-right',
      cell: (p) => <ProductRowActions product={p} shopSlug={shopSlug} canWrite={canWrite} canDelete={canDelete} {...handlers} />,
    },
  ];

  const mobileCard = (p: Product) => (
    <div className="flex items-start gap-3">
      <Checkbox className="mt-1" checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${p.name}`} />
      <Thumb src={p.primaryThumbUrl} name={p.name} className="h-16 w-16" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium">{p.name}</p>
        <p className="truncate text-xs text-muted-foreground">{p.sku}{p.category ? ` · ${p.category.name}` : ''}</p>
        <p className="text-sm tabular-nums">{priceRangeText(p, shop?.currency)}</p>
        <div className="flex items-center gap-2 text-xs">
          <StatusBadge type="product" status={p.status} />
          <span className="text-muted-foreground">Stock: {stockCell(p)}</span>
        </div>
      </div>
      <ProductRowActions product={p} shopSlug={shopSlug} canWrite={canWrite} canDelete={canDelete} {...handlers} />
    </div>
  );

  const filtersActive = !!q || tab !== 'ALL' || category !== ALL || lowStock;

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your catalogue, stock and pricing."
        actions={canWrite && (
          <>
            <Button asChild variant="outline"><Link to="/dashboard/bulk"><Upload className="h-4 w-4" /> Import</Link></Button>
            {limitReached ? (
              <Button disabled title="Product limit reached"><Plus className="h-4 w-4" /> Add product</Button>
            ) : (
              <Button asChild><Link to="/dashboard/products/new"><Plus className="h-4 w-4" /> Add product</Link></Button>
            )}
          </>
        )}
      />

      {productUsage && <LimitBanner limitKey="products" used={productUsage.used} limit={productUsage.limit} className="mb-4" />}
      {productUsage && productUsage.limit != null && productUsage.used < productUsage.limit * 0.8 && (
        <p className="mb-4 text-xs text-muted-foreground">{productUsage.used} of {productUsage.limit} products used on your plan.</p>
      )}
      <LimitReachedAlert error={duplicate.error} className="mb-4" />

      <div className="mb-4 space-y-3">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setPage(1); setSelected(new Set()); }}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList>{TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}</TabsList>
          </div>
        </Tabs>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name, SKU, brand or tag…" className="flex-1" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="sm:w-44" aria-label="Category"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {catOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger className="sm:w-44" aria-label="Sort"><SelectValue /></SelectTrigger>
              <SelectContent>{SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant={lowStock ? 'soft' : 'outline'} aria-pressed={lowStock} onClick={() => { setLowStock((v) => !v); setPage(1); }}>
            Low stock
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-accent/40 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          {canWrite && (
            <>
              <Button size="sm" variant="outline" loading={bulkStatus.isPending} onClick={() => bulkStatus.mutate('ACTIVE')}><Eye className="h-4 w-4" /> Activate</Button>
              <Button size="sm" variant="outline" loading={bulkStatus.isPending} onClick={() => bulkStatus.mutate('DRAFT')}><EyeOff className="h-4 w-4" /> Deactivate</Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        rowKey={(p) => p.id}
        loading={list.isLoading}
        error={list.isError ? list.error : undefined}
        onRetry={() => list.refetch()}
        meta={list.data?.meta}
        onPageChange={(p) => { setPage(p); setSelected(new Set()); }}
        onRowClick={(p) => navigate(`/dashboard/products/${p.id}`)}
        mobileCard={mobileCard}
        emptyIcon={Package}
        emptyTitle={filtersActive ? 'No products match your filters' : 'No products yet'}
        emptyDescription={filtersActive ? 'Try clearing the search or filters.' : 'Add your first product to start building your catalogue.'}
        emptyAction={canWrite && !filtersActive ? <Button asChild><Link to="/dashboard/products/new"><Plus className="h-4 w-4" /> Add product</Link></Button> : undefined}
      />

      {qrFor && (
        <ShareDialog
          open
          onOpenChange={(o) => !o && setQrFor(null)}
          url={publicProductUrl(shopSlug, qrFor.slug)}
          title={qrFor.name}
          shareText={`Check out ${qrFor.name}`}
          fileName={`qr-${qrFor.slug}`}
        />
      )}
    </>
  );
}
