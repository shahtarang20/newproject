import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Circle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { analyticsApi } from '@/api/endpoints/analytics';
import { queryKeys } from '@/api/queryKeys';
import { usePermission } from '@/hooks';
import { cn } from '@/utils/cn';
import { shopShareKey } from './ShareShopDialog';

function useShared(shopId?: string) {
  const read = () => {
    try {
      return localStorage.getItem(shopShareKey(shopId)) === '1';
    } catch {
      return false;
    }
  };
  const [shared, setShared] = useState(read);
  useEffect(() => {
    const h = () => setShared(read());
    window.addEventListener('vastra:shop-shared', h);
    return () => window.removeEventListener('vastra:shop-shared', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);
  return shared;
}

/** Derived from real data; hidden once every step is done. */
export function OnboardingChecklist({ shopId, onShare }: { shopId?: string; onShare: () => void }) {
  const { can } = usePermission();
  const shared = useShared(shopId);
  const cats = useQuery({ queryKey: queryKeys.categories.list({ count: true }), queryFn: analyticsApi.countCategories });
  const prods = useQuery({ queryKey: queryKeys.products.list({ count: true }), queryFn: () => analyticsApi.countProducts() });
  const active = useQuery({ queryKey: queryKeys.products.list({ count: true, status: 'ACTIVE' }), queryFn: () => analyticsApi.countProducts('ACTIVE') });

  if (cats.isLoading || prods.isLoading || active.isLoading) return null;
  if (cats.isError || prods.isError || active.isError) return null; // never block the dashboard

  const steps = [
    { key: 'cat', label: 'Add a category', hint: 'Group products like Sarees or Kurtas.', done: (cats.data ?? 0) > 0, to: '/dashboard/categories', allowed: can('categories:write') },
    { key: 'prod', label: 'Add your first product', hint: 'Photos, price and stock.', done: (prods.data ?? 0) > 0, to: '/dashboard/products/new', allowed: can('products:write') },
    { key: 'pub', label: 'Publish a product', hint: 'Set a product to Active so it shows in your shop.', done: (active.data ?? 0) > 0, to: '/dashboard/products', allowed: can('products:write') },
    { key: 'share', label: 'Share your shop link', hint: 'Send it on WhatsApp or print the QR.', done: shared, action: onShare, allowed: true },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Get your shop ready</h2>
          <p className="text-xs text-muted-foreground">{doneCount} of {steps.length} steps complete</p>
        </div>
        <Progress value={(doneCount / steps.length) * 100} className="h-1.5 w-full sm:w-40" />
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.key} className={cn('flex flex-col gap-2 rounded-xl border p-3', s.done && 'bg-muted/40')}>
            <div className="flex items-center gap-2">
              {s.done ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground"><Check className="h-3 w-3" /></span>
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/50" aria-hidden />
              )}
              <span className={cn('text-sm font-medium', s.done && 'text-muted-foreground line-through')}>{i + 1}. {s.label}</span>
            </div>
            {!s.done && (
              <>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
                {s.allowed &&
                  ('to' in s && s.to ? (
                    <Button asChild size="sm" variant="soft" className="self-start"><Link to={s.to}>Go</Link></Button>
                  ) : (
                    <Button size="sm" variant="soft" className="self-start" onClick={s.action}>Share</Button>
                  ))}
              </>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
