import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { lookupApi } from '@/api/endpoints/orders';
import { SearchInput } from '@/components/common/SearchInput';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

/** Multi-select product picker (search + chips). Names of already-saved ids are resolved lazily. */
export function ProductMultiPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});

  const unknown = value.filter((id) => !names[id]);
  const resolved = useQuery({
    queryKey: ['lookup', 'productsByIds', unknown.join(',')],
    queryFn: () => lookupApi.productsByIds(unknown),
    enabled: unknown.length > 0,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (resolved.data?.length) setNames((n) => ({ ...n, ...Object.fromEntries(resolved.data!.map((p) => [p.id, p.name])) }));
  }, [resolved.data]);

  const results = useQuery({ queryKey: ['lookup', 'products', q], queryFn: () => lookupApi.products(q), staleTime: 30_000 });

  const toggle = (id: string, name: string) => {
    setNames((n) => ({ ...n, [id]: name }));
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Badge key={id} variant="soft" className="gap-1 py-1 pl-2.5 pr-1">
              <span className="max-w-[10rem] truncate">{names[id] ?? 'Product'}</span>
              <button type="button" aria-label="Remove product" onClick={() => onChange(value.filter((x) => x !== id))} className="rounded-full p-0.5 hover:bg-background/60"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
      <SearchInput value={q} onChange={setQ} placeholder="Search products to add" />
      <div className="max-h-44 overflow-y-auto rounded-xl border">
        {results.isLoading ? (
          <div className="space-y-2 p-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
        ) : (results.data?.length ?? 0) === 0 ? (
          <p className="p-3 text-center text-sm text-muted-foreground">No products found.</p>
        ) : (
          results.data!.map((p) => (
            <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-3 px-3 hover:bg-secondary">
              <Checkbox checked={value.includes(p.id)} onCheckedChange={() => toggle(p.id, p.name)} />
              <span className="truncate text-sm">{p.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export function CategoryMultiPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['lookup', 'categories'], queryFn: lookupApi.categories, staleTime: 60_000 });
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data?.length) return <p className="rounded-xl border p-3 text-sm text-muted-foreground">No categories yet.</p>;
  return (
    <div className="max-h-44 overflow-y-auto rounded-xl border">
      {data.map((c) => (
        <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 px-3 hover:bg-secondary">
          <Checkbox checked={value.includes(c.id)} onCheckedChange={() => onChange(value.includes(c.id) ? value.filter((x) => x !== c.id) : [...value, c.id])} />
          <span className="truncate text-sm">{c.parentId ? '- ' : ''}{c.name}</span>
        </label>
      ))}
    </div>
  );
}
