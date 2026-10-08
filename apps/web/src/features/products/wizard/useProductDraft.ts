import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products';
import { queryKeys } from '@/api/queryKeys';
import type { Product } from '@/types/catalog';
import { buildProductPayload, buildVariantPayload, canCreateDraft, variantKey, type WizardValues } from './schema';
import type { SaveState } from './context';

interface Options {
  form: UseFormReturn<WizardValues>;
  initialId: string | null;
  canWrite: boolean;
  canStock: boolean;
  onProduct: (p: Product) => void;
  onCreated: (p: Product) => void;
}

const AUTOSAVE_MS = 1500;

/** Debounced autosave + create-on-first-save + variant diff-sync for the product wizard. */
export function useProductDraft({ form, initialId, canWrite, canStock, onProduct, onCreated }: Options) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState<string | null>(initialId);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<unknown>(null);

  const idRef = useRef<string | null>(initialId);
  const slugRef = useRef<string | undefined>(undefined);
  const productSnap = useRef<string | null>(null);
  const variantSnap = useRef<Map<string, string>>(new Map());
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<number>();
  const enabled = useRef(false); // flips on once the form is hydrated
  const createAllowed = useRef(false); // creation only after an explicit save / "Next"
  const lastSavedFull = useRef<string>('');

  const snapshotOf = useCallback(
    (v: WizardValues) =>
      JSON.stringify({
        p: buildProductPayload(v, false, slugRef.current),
        v: v.variants.map((r) => ({ k: variantKey(r), pl: buildVariantPayload(r, { canStock, forCreate: false }), del: !!r.id })),
      }),
    [canStock],
  );

  /** Mark baseline after loading an existing product. */
  const markHydrated = useCallback(
    (p: Product | null, values: WizardValues) => {
      if (p) {
        slugRef.current = p.slug;
        idRef.current = p.id;
        setProductId(p.id);
        productSnap.current = JSON.stringify(buildProductPayload(values, false, p.slug));
        variantSnap.current = new Map();
        for (const r of values.variants) {
          if (!r.id) continue;
          const pl = buildVariantPayload(r, { canStock, forCreate: false });
          if (pl) variantSnap.current.set(r.id, JSON.stringify(pl));
          else variantSnap.current.set(r.id, '');
        }
      }
      lastSavedFull.current = snapshotOf(values);
      enabled.current = true;
      setSaveState('idle');
    },
    [canStock, snapshotOf],
  );

  const syncVariants = async (id: string, values: WizardValues) => {
    const rows = values.variants;
    const liveIds = new Set(rows.map((r) => r.id).filter(Boolean));
    // deletions first (frees colour+size combos)
    for (const vid of [...variantSnap.current.keys()]) {
      if (!liveIds.has(vid)) {
        await productsApi.deleteVariant(id, vid);
        variantSnap.current.delete(vid);
      }
    }
    for (const row of rows) {
      if (row.id) {
        const pl = buildVariantPayload(row, { canStock, forCreate: false });
        if (!pl) continue;
        const h = JSON.stringify(pl);
        if (variantSnap.current.get(row.id) === h) continue;
        await productsApi.updateVariant(id, row.id, pl);
        variantSnap.current.set(row.id, h);
      } else {
        const pl = buildVariantPayload(row, { canStock, forCreate: true });
        if (!pl) continue;
        const created = await productsApi.createVariant(id, pl);
        const forUpdate = buildVariantPayload({ ...row, id: created.id }, { canStock, forCreate: false });
        variantSnap.current.set(created.id, forUpdate ? JSON.stringify(forUpdate) : '');
        const cur = form.getValues('variants');
        const idx = cur.findIndex((r) => !r.id && variantKey(r) === variantKey(row));
        if (idx >= 0) form.setValue(`variants.${idx}.id`, created.id, { shouldDirty: false });
        if (idx >= 0 && !cur[idx]!.sku) form.setValue(`variants.${idx}.sku`, created.sku ?? '', { shouldDirty: false });
      }
    }
  };

  const run = async (): Promise<string | null> => {
    const values = form.getValues();
    let id = idRef.current;
    if (!id && !(createAllowed.current && canCreateDraft(values))) return null;
    const snap = snapshotOf(values);
    if (id && snap === lastSavedFull.current) return id;

    setSaveState('saving');
    try {
      let product: Product | null = null;
      if (!id) {
        product = await productsApi.create(buildProductPayload(values, true));
        id = product.id;
        idRef.current = id;
        slugRef.current = product.slug;
        setProductId(id);
        form.setValue('slug', product.slug, { shouldDirty: false });
        if (!values.sku.trim()) form.setValue('sku', product.sku, { shouldDirty: false });
        productSnap.current = JSON.stringify(buildProductPayload(form.getValues(), false, product.slug));
        onCreated(product);
      } else {
        const payload = buildProductPayload(values, false, slugRef.current);
        const h = JSON.stringify(payload);
        if (h !== productSnap.current) {
          product = await productsApi.update(id, payload);
          slugRef.current = product.slug;
          productSnap.current = h;
        }
      }
      await syncVariants(id, values);
      if (product) onProduct(product);
      lastSavedFull.current = snap;
      setSaveError(null);
      setSaveState(snapshotOf(form.getValues()) === snap ? 'saved' : 'dirty');
      void qc.invalidateQueries({ queryKey: queryKeys.products.all });
      void qc.invalidateQueries({ queryKey: queryKeys.shop.usage() });
      return id;
    } catch (e) {
      setSaveError(e);
      setSaveState('error');
      throw e;
    }
  };

  /** Save immediately (serialised with autosaves). Rejects on server error. */
  const saveNow = useCallback(
    (opts: { create?: boolean } = {}): Promise<string | null> => {
      if (!canWrite) return Promise.resolve(idRef.current);
      if (opts.create) createAllowed.current = true;
      window.clearTimeout(timer.current);
      const p = chain.current.then(run, run);
      chain.current = p.catch(() => undefined);
      return p;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite, canStock],
  );

  // watch form → debounce autosave
  useEffect(() => {
    if (!canWrite) return;
    const sub = form.watch(() => {
      if (!enabled.current) return;
      const changed = snapshotOf(form.getValues()) !== lastSavedFull.current;
      if (!changed) return;
      setSaveState((s) => (s === 'saving' ? s : 'dirty'));
      if (!idRef.current) return; // nothing persisted yet; saved on first "Next"
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        saveNow().catch(() => undefined);
      }, AUTOSAVE_MS);
    });
    return () => {
      sub.unsubscribe();
      window.clearTimeout(timer.current);
    };
  }, [canWrite, form, saveNow, snapshotOf]);

  /** True while there are edits the server has not seen. */
  const hasUnsaved = saveState === 'dirty' || saveState === 'saving' || saveState === 'error';

  return { productId, saveState, saveError, saveNow, markHydrated, hasUnsaved, slugRef };
}
