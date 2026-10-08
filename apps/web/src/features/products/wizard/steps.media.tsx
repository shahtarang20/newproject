import { useRef, useState } from 'react';
import { Film, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImageUploader, type UploadedImage } from '@/components/common/ImageUploader';
import { productsApi } from '@/api/endpoints/products';
import type { Media } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';
import { formatBytes } from '@/utils/format';
import { LimitReachedAlert } from '../components/LimitReached';
import { isLimitError } from '../utils';
import { useWizard } from './context';
import { StepCard } from './fields';

const MAX_VIDEO = 100 * 1024 * 1024;
const toImg = (m: Media): UploadedImage => ({ id: m.id, url: m.thumbUrl ?? m.url, isPrimary: m.isPrimary, alt: m.altText ?? undefined });

export function MediaStep() {
  const { media, setMedia, ensureProduct, productId, canWrite } = useWizard();
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const [limitErr, setLimitErr] = useState<unknown>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const images = media.filter((m) => m.kind === 'IMAGE');
  const videos = media.filter((m) => m.kind === 'VIDEO');
  const commit = (next: Media[]) => { mediaRef.current = next; setMedia(next); };

  const refetch = async (id: string) => commit(await productsApi.listMedia(id));

  const onUpload = async (file: File): Promise<UploadedImage> => {
    try {
      const id = await ensureProduct();
      const [m] = await productsApi.uploadMedia(id, [file]);
      if (!m) throw new Error('Upload failed');
      commit([...mediaRef.current, m]);
      setLimitErr(null);
      return toImg(m);
    } catch (e) {
      if (isLimitError(e)) setLimitErr(e);
      throw e;
    }
  };

  const onRemove = async (img: UploadedImage) => {
    if (!productId) return;
    await productsApi.deleteMedia(productId, img.id);
    await refetch(productId);
  };

  /** ImageUploader reports reorder / primary changes through onChange; persist them. */
  const onChange = async (next: UploadedImage[]) => {
    if (!productId) return;
    const prevImgs = mediaRef.current.filter((m) => m.kind === 'IMAGE');
    const prevIds = prevImgs.map((m) => m.id);
    const nextIds = next.map((i) => i.id);
    const sameSet = prevIds.length === nextIds.length && prevIds.every((i) => nextIds.includes(i));
    if (!sameSet) return; // uploads/removals are handled in onUpload/onRemove
    const prevPrimary = prevImgs.find((m) => m.isPrimary)?.id;
    const nextPrimary = next.find((i) => i.isPrimary)?.id;
    try {
      if (prevIds.join() !== nextIds.join()) {
        const others = mediaRef.current.filter((m) => m.kind !== 'IMAGE');
        const byId = new Map(prevImgs.map((m) => [m.id, m]));
        commit([...nextIds.map((i) => byId.get(i)!), ...others]);
        await productsApi.reorderMedia(productId, [...nextIds, ...others.map((m) => m.id)]);
      }
      if (nextPrimary && nextPrimary !== prevPrimary) {
        commit(mediaRef.current.map((m) => (m.kind === 'IMAGE' ? { ...m, isPrimary: m.id === nextPrimary } : m)));
        commit(await productsApi.setPrimaryMedia(productId, nextPrimary));
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
      await refetch(productId).catch(() => undefined);
    }
  };

  const uploadVideo = async (file: File) => {
    if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) return toast.error('Use an MP4, WebM or MOV video.');
    if (file.size > MAX_VIDEO) return toast.error('Video is larger than 100 MB.');
    try {
      const id = await ensureProduct();
      setProgress(0);
      const list = await productsApi.uploadMedia(id, [file], setProgress);
      commit([...mediaRef.current, ...list]);
      setLimitErr(null);
      toast.success('Video uploaded');
    } catch (e) {
      if (isLimitError(e)) setLimitErr(e);
      else toast.error(getErrorMessage(e, 'Video upload failed'));
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeVideo = async (m: Media) => {
    if (!productId) return;
    try {
      await productsApi.deleteMedia(productId, m.id);
      commit(mediaRef.current.filter((x) => x.id !== m.id));
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      <LimitReachedAlert error={limitErr} />
      <StepCard title="Photos" description="Add at least one clear photo. The first (primary) image is the cover. Use the arrows to reorder, the star to set primary.">
        <ImageUploader
          value={images.map(toImg)}
          onUpload={onUpload}
          onRemove={onRemove}
          onChange={(v) => void onChange(v)}
          crop
          aspect={4 / 5}
          maxFiles={20}
          disabled={!canWrite}
        />
        <p className="text-xs text-muted-foreground">Images are cropped/compressed in your browser, then optimised again on upload. Saving a draft happens automatically when you add the first photo.</p>
      </StepCard>

      <StepCard title="Video (optional)" description="MP4, WebM or MOV up to 100 MB.">
        {videos.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {videos.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-xl border">
                <video src={m.url} controls preload="metadata" className="aspect-video w-full bg-black" />
                <div className="flex items-center justify-between gap-2 p-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Film className="h-3.5 w-3.5" /> {m.sizeBytes ? formatBytes(m.sizeBytes) : 'Video'}</span>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove video" disabled={!canWrite} onClick={() => removeVideo(m)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {progress !== null && (
          <div className="space-y-1.5" role="status">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" aria-label="Upload video"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadVideo(f); }} />
        <Button type="button" variant="outline" disabled={!canWrite || progress !== null} onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload video
        </Button>
      </StepCard>
    </div>
  );
}
