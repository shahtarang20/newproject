import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormError } from '@/components/ui/form';
import { categoriesApi } from '@/api/endpoints/categories';
import { queryKeys } from '@/api/queryKeys';
import type { Category } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  parentId: z.string(),
  description: z.string().max(500),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;
const NONE = '__none__';

export function CategoryDialog({ open, onOpenChange, category, defaultParentId, parents }: {
  open: boolean; onOpenChange: (o: boolean) => void; category: Category | null; defaultParentId?: string | null;
  /** Possible parents (root categories excluding the one being edited). */
  parents: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema) as never,
    defaultValues: { name: '', parentId: '', description: '', sortOrder: 0, isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: category?.name ?? '', parentId: category ? (category.parentId ?? '') : (defaultParentId ?? ''),
      description: category?.description ?? '', sortOrder: category?.sortOrder ?? 0, isActive: category?.isActive ?? true,
    });
    setFile(null);
    setPreview(category?.imageUrl ?? null);
  }, [open, category, defaultParentId, reset]);

  const save = useMutation({
    mutationFn: async (v: Values) => {
      const body = { name: v.name.trim(), parentId: v.parentId || null, description: v.description.trim() || null, sortOrder: v.sortOrder, isActive: v.isActive };
      let saved = category ? await categoriesApi.update(category.id, body) : await categoriesApi.create(body);
      if (file) saved = await categoriesApi.uploadImage(saved.id, file);
      return saved;
    },
    onSuccess: (c) => {
      toast.success(category ? 'Category updated' : `Category "${c.name}" created`);
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      onOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const pickFile = (f?: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(f.type) || f.size > 10 * 1024 * 1024) return toast.error('Use a JPG, PNG, WebP or AVIF image under 10 MB.');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const parentId = watch('parentId');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>Categories group products on your storefront.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted text-muted-foreground hover:bg-secondary" aria-label="Upload category image">
              {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
            <p className="text-xs text-muted-foreground">Optional image. JPG, PNG, WebP or AVIF up to 10 MB.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" {...register('name')} maxLength={80} aria-invalid={!!errors.name} />
            <FormError message={errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Parent category</Label>
            <Select value={parentId || NONE} onValueChange={(v) => setValue('parentId', v === NONE ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None (top level)</SelectItem>
                {parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea id="cat-desc" rows={2} {...register('description')} maxLength={500} />
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-sort">Sort order</Label>
              <Input id="cat-sort" type="number" min={0} className="w-28" {...register('sortOrder')} />
              <FormError message={errors.sortOrder?.message} />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Switch checked={watch('isActive')} onCheckedChange={(v) => setValue('isActive', v)} aria-label="Active" /> Active
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{category ? 'Save changes' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
