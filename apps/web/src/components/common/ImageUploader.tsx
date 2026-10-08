import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import Cropper, { type Area } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { ArrowLeft, ArrowRight, Crop, ImagePlus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';

export interface UploadedImage {
  /** Stable id (server id once uploaded). */
  id: string;
  url: string;
  isPrimary?: boolean;
  alt?: string;
}

interface ImageUploaderProps {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  /** Upload one (already compressed/cropped) file and resolve with the stored image. Endpoint-agnostic. */
  onUpload: (file: File) => Promise<UploadedImage>;
  /** Called when an image is removed (e.g. to delete on the server). Throwing keeps the image. */
  onRemove?: (image: UploadedImage) => Promise<void> | void;
  maxFiles?: number;
  maxSizeMB?: number;
  /** Open crop dialog before upload (single-file drops only). */
  crop?: boolean;
  aspect?: number;
  disabled?: boolean;
  className?: string;
}

async function cropToFile(src: string, area: Area, name: string): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  canvas.getContext('2d')!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Crop failed'))), 'image/jpeg', 0.92));
  return new File([blob], name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export function ImageUploader({
  value, onChange, onUpload, onRemove, maxFiles = 10, maxSizeMB = 1.5, crop = false, aspect = 1, disabled, className,
}: ImageUploaderProps) {
  const [busy, setBusy] = useState(0);
  const [cropSrc, setCropSrc] = useState<{ file: File; url: string } | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  const remaining = Math.max(0, maxFiles - value.length);

  const processAndUpload = useCallback(
    async (files: File[], base: UploadedImage[]) => {
      setBusy((n) => n + files.length);
      let current = base;
      for (const file of files) {
        try {
          const compressed = file.type === 'image/gif'
            ? file
            : await imageCompression(file, { maxSizeMB, maxWidthOrHeight: 2000, useWebWorker: true, fileType: file.type === 'image/png' ? 'image/png' : undefined });
          const uploaded = await onUpload(compressed);
          current = [...current, { ...uploaded, isPrimary: uploaded.isPrimary ?? current.length === 0 }];
          onChange(current);
        } catch (e) {
          toast.error(`${file.name}: ${getErrorMessage(e, 'Upload failed')}`);
        } finally {
          setBusy((n) => n - 1);
        }
      }
    },
    [maxSizeMB, onChange, onUpload],
  );

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      rejected.forEach((r) => toast.error(`${r.file.name}: ${r.errors[0]?.message ?? 'Not accepted'}`));
      const files = accepted.slice(0, remaining);
      if (accepted.length > remaining) toast.warning(`Only ${maxFiles} images allowed.`);
      if (!files.length) return;
      if (crop && files.length === 1) {
        setCropSrc({ file: files[0]!, url: URL.createObjectURL(files[0]!) });
        setPos({ x: 0, y: 0 });
        setZoom(1);
        return;
      }
      void processAndUpload(files, value);
    },
    [crop, maxFiles, processAndUpload, remaining, value],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/avif': [] },
    maxSize: 10 * 1024 * 1024,
    disabled: disabled || remaining === 0,
  });

  const confirmCrop = async () => {
    if (!cropSrc || !area) return;
    const { file, url } = cropSrc;
    setCropSrc(null);
    try {
      const cropped = await cropToFile(url, area, file.name);
      await processAndUpload([cropped], value);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not crop image'));
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const skipCrop = () => {
    if (!cropSrc) return;
    const { file, url } = cropSrc;
    setCropSrc(null);
    URL.revokeObjectURL(url);
    void processAndUpload([file], value);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const setPrimary = (id: string) => onChange(value.map((v) => ({ ...v, isPrimary: v.id === id })));
  const remove = async (img: UploadedImage) => {
    try {
      await onRemove?.(img);
      const next = value.filter((v) => v.id !== img.id);
      if (img.isPrimary && next[0]) next[0] = { ...next[0], isPrimary: true };
      onChange(next);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not remove image'));
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {(value.length > 0 || busy > 0) && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((img, i) => (
            <li key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted">
              <img src={img.url} alt={img.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
              {img.isPrimary && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Star className="h-3 w-3 fill-current" /> Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <div className="flex gap-0.5">
                  <IconBtn label="Move left" onClick={() => move(i, -1)} disabled={disabled || i === 0}><ArrowLeft className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Move right" onClick={() => move(i, 1)} disabled={disabled || i === value.length - 1}><ArrowRight className="h-3.5 w-3.5" /></IconBtn>
                </div>
                <div className="flex gap-0.5">
                  {!img.isPrimary && <IconBtn label="Set as primary" onClick={() => setPrimary(img.id)} disabled={disabled}><Star className="h-3.5 w-3.5" /></IconBtn>}
                  <IconBtn label="Remove image" onClick={() => remove(img)} disabled={disabled}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </div>
            </li>
          ))}
          {Array.from({ length: busy }).map((_, i) => (
            <li key={`busy-${i}`} className="flex aspect-square items-center justify-center rounded-xl border bg-muted">
              <Spinner className="h-5 w-5" label="Uploading" />
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            isDragActive ? 'border-primary bg-accent' : 'border-input hover:border-primary/50 hover:bg-secondary/50',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <input {...getInputProps()} aria-label="Upload images" />
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ImagePlus className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium">{isDragActive ? 'Drop images here' : 'Drag & drop, or click to browse'}</p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP or AVIF · auto-compressed · {remaining} of {maxFiles} slots left
          </p>
        </div>
      )}

      <Dialog open={!!cropSrc} onOpenChange={(o) => !o && skipCrop()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crop className="h-4 w-4" /> Crop image</DialogTitle>
            <DialogDescription>Drag to reposition and use the slider to zoom. Closing uploads the original.</DialogDescription>
          </DialogHeader>
          {cropSrc && (
            <div className="relative h-72 overflow-hidden rounded-xl bg-black sm:h-96">
              <Cropper image={cropSrc.url} crop={pos} zoom={zoom} aspect={aspect} onCropChange={setPos} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
            </div>
          )}
          <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0] ?? 1)} aria-label="Zoom" />
          <DialogFooter>
            <Button variant="outline" onClick={skipCrop}>Use original</Button>
            <Button onClick={confirmCrop} disabled={!area}>Crop & upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconBtn({ label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-zinc-900 transition-colors hover:bg-white disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}
