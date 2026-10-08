import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PRODUCT_STATUSES, PRODUCT_TYPES, toMinor, type ProductStatus, type ProductType } from '@vastra/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { bulkApi } from '@/api/endpoints/bulk';
import { categoriesApi } from '@/api/endpoints/categories';
import { queryKeys } from '@/api/queryKeys';
import type { BulkPriceMode, Category } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';
import { PRODUCT_STATUS_LABELS, PRODUCT_TYPE_LABELS } from '@/utils/labels';
import { ProductPicker } from '@/features/products/components/ProductPicker';
import { LimitReachedAlert } from '@/features/products/components/LimitReached';

const ANY = '__any__';
const MODES: { value: BulkPriceMode; label: string }[] = [
  { value: 'SET', label: 'Set to exact price' }, { value: 'INCREASE_PERCENT', label: 'Increase by %' },
  { value: 'DECREASE_PERCENT', label: 'Decrease by %' }, { value: 'INCREASE_FLAT', label: 'Increase by amount' },
];
const flat = (cs: Category[], d = 0): { id: string; name: string }[] => cs.flatMap((c) => [{ id: c.id, name: `${'— '.repeat(d)}${c.name}` }, ...flat(c.children ?? [], d + 1)]);

function Scope({ mode, setMode, ids, setIds, cat, setCat, status, setStatus, type, setType, withFilter }: {
  mode: 'filter' | 'pick'; setMode: (m: 'filter' | 'pick') => void; ids: string[]; setIds: (i: string[]) => void;
  cat: string; setCat: (v: string) => void; status: string; setStatus: (v: string) => void; type: string; setType: (v: string) => void; withFilter: boolean;
}) {
  const cats = useQuery({ queryKey: queryKeys.categories.list({ tree: true }), queryFn: () => categoriesApi.list({ tree: true }), staleTime: 60_000 });
  const sel = (value: string, set: (v: string) => void, label: string, opts: { value: string; label: string }[]) => (
    <Select value={value} onValueChange={set}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value={ANY}>{label}: any</SelectItem>{opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
  );
  return (
    <div className="space-y-3">
      <Label>Apply to</Label>
      {withFilter && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={mode === 'filter' ? 'soft' : 'outline'} onClick={() => setMode('filter')}>By filter</Button>
          <Button type="button" size="sm" variant={mode === 'pick' ? 'soft' : 'outline'} onClick={() => setMode('pick')}>Pick products</Button>
        </div>
      )}
      {mode === 'filter' && withFilter ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {sel(cat, setCat, 'Category', flat(cats.data ?? []).map((c) => ({ value: c.id, label: c.name })))}
          {sel(status, setStatus, 'Status', PRODUCT_STATUSES.map((s) => ({ value: s, label: PRODUCT_STATUS_LABELS[s] })))}
          {sel(type, setType, 'Type', PRODUCT_TYPES.map((t) => ({ value: t, label: PRODUCT_TYPE_LABELS[t] })))}
        </div>
      ) : (
        <>
          <ProductPicker value={ids} onChange={setIds} allowAddByCategory max={1000} />
          <p className="text-xs text-muted-foreground">{ids.length} product{ids.length === 1 ? '' : 's'} selected</p>
        </>
      )}
    </div>
  );
}

export function BulkEditTab() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [mode, setMode] = useState<'filter' | 'pick'>('filter');
  const [ids, setIds] = useState<string[]>([]);
  const [cat, setCat] = useState(ANY);
  const [fStatus, setFStatus] = useState(ANY);
  const [fType, setFType] = useState(ANY);
  // price
  const [pMode, setPMode] = useState<BulkPriceMode>('INCREASE_PERCENT');
  const [pValue, setPValue] = useState('');
  const [target, setTarget] = useState<'SELLING' | 'MRP' | 'BOTH'>('SELLING');
  // stock
  const [sMode, setSMode] = useState<'SET' | 'ADD'>('SET');
  const [sText, setSText] = useState('');
  // status
  const [newStatus, setNewStatus] = useState<ProductStatus>('ACTIVE');

  const done = () => { void qc.invalidateQueries({ queryKey: queryKeys.products.all }); void qc.invalidateQueries({ queryKey: queryKeys.inventory.all }); };
  const scopeProps = { mode, setMode, ids, setIds, cat, setCat, status: fStatus, setStatus: setFStatus, type: fType, setType: setFType };

  const price = useMutation({
    mutationFn: () => {
      const n = Number(pValue);
      const value = pMode === 'SET' || pMode === 'INCREASE_FLAT' ? toMinor(n) : n;
      const filter = {
        ...(cat !== ANY ? { categoryId: cat } : {}),
        ...(fStatus !== ANY ? { status: fStatus as ProductStatus } : {}),
        ...(fType !== ANY ? { type: fType as ProductType } : {}),
      };
      return bulkApi.price({ ...(mode === 'pick' ? { productIds: ids } : { filter }), mode: pMode, value, target });
    },
    onSuccess: (r) => { toast.success(`${r.variantsUpdated} variants updated across ${r.productsMatched} products`); done(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const stock = useMutation({
    mutationFn: () => {
      const items = sText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const [sku, qty] = l.split(/[,\t;]/).map((s) => s.trim());
        return { sku: sku ?? '', quantity: Math.round(Number(qty)), mode: sMode };
      });
      if (items.some((i) => !i.sku || !Number.isFinite(i.quantity))) throw new Error('Each line must be "SKU, quantity".');
      return bulkApi.stock({ items });
    },
    onSuccess: (r) => { toast[r.failed ? 'warning' : 'success'](`${r.succeeded} of ${r.total} updated${r.failed ? `, ${r.failed} failed` : ''}`); if (r.failed) setFailures(r.results.filter((x) => !x.ok).map((x) => `${x.sku ?? x.variantId}: ${x.error}`)); else setFailures([]); done(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const [failures, setFailures] = useState<string[]>([]);
  const status = useMutation({
    mutationFn: () => bulkApi.status({ productIds: ids, status: newStatus }),
    onSuccess: (r) => { toast.success(`${r.updated} of ${r.requested} products updated`); done(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const runPrice = async () => {
    const n = Number(pValue);
    if (!pValue.trim() || !Number.isFinite(n) || n < 0) return void toast.error('Enter a valid value.');
    if (mode === 'pick' && ids.length === 0) return void toast.error('Pick at least one product.');
    const scope = mode === 'pick' ? `${ids.length} selected products` : 'all products matching the filter';
    if (await confirm({ title: 'Update prices?', description: `This changes prices for ${scope}. It cannot be undone automatically.`, confirmText: 'Update prices' })) price.mutate();
  };

  return (
    <Tabs defaultValue="price">
      <TabsList><TabsTrigger value="price">Price</TabsTrigger><TabsTrigger value="stock">Stock</TabsTrigger><TabsTrigger value="status">Status</TabsTrigger></TabsList>

      <TabsContent value="price">
        <Card className="space-y-4 p-4">
          <LimitReachedAlert error={price.error} />
          <Scope {...scopeProps} withFilter />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Change</Label>
              <Select value={pMode} onValueChange={(v) => setPMode(v as BulkPriceMode)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="bulk-val">{pMode.endsWith('PERCENT') ? 'Percent' : 'Amount (₹)'}</Label><Input id="bulk-val" inputMode="decimal" value={pValue} onChange={(e) => setPValue(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Field</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="SELLING">Selling price</SelectItem><SelectItem value="MRP">MRP</SelectItem><SelectItem value="BOTH">Both</SelectItem></SelectContent></Select></div>
          </div>
          <Button loading={price.isPending} onClick={runPrice}>Apply price change</Button>
        </Card>
      </TabsContent>

      <TabsContent value="stock">
        <Card className="space-y-4 p-4">
          <div className="space-y-1.5"><Label>Mode</Label>
            <Select value={sMode} onValueChange={(v) => setSMode(v as 'SET' | 'ADD')}><SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="SET">Set stock to quantity</SelectItem><SelectItem value="ADD">Add to stock (negative to subtract)</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="stock-lines">Variant SKUs and quantities</Label>
            <Textarea id="stock-lines" rows={8} value={sText} onChange={(e) => setSText(e.target.value)} placeholder={'SIL-7K2M9Q-RED-FREE, 12\nKUR-1A2B3C-BLUE-M, 5'} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">One per line: SKU, quantity. Max 1000 lines.</p></div>
          {failures.length > 0 && <ul className="max-h-40 overflow-auto rounded-xl bg-destructive/5 p-3 text-xs">{failures.map((f) => <li key={f}>{f}</li>)}</ul>}
          <Button disabled={!sText.trim()} loading={stock.isPending} onClick={() => stock.mutate()}>Update stock</Button>
        </Card>
      </TabsContent>

      <TabsContent value="status">
        <Card className="space-y-4 p-4">
          <Scope {...scopeProps} withFilter={false} />
          <div className="space-y-1.5"><Label>New status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ProductStatus)}><SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PRODUCT_STATUSES.map((s) => <SelectItem key={s} value={s}>{PRODUCT_STATUS_LABELS[s]}</SelectItem>)}</SelectContent></Select></div>
          <Button disabled={ids.length === 0} loading={status.isPending} onClick={() => status.mutate()}>Update {ids.length} product{ids.length === 1 ? '' : 's'}</Button>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
