import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

interface Props {
  label: string;
  value?: string;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  /** CSS aspect class for the preview. */
  shapeClassName?: string;
  disabled?: boolean;
  hint?: string;
}

/** One-image uploader that posts to a dedicated endpoint (logo / cover). The server has no "remove" endpoint, so replacing is the only action. */
export function SingleImageUpload({ label, value, onUpload, shapeClassName = 'aspect-square w-28', disabled, hint }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return void toast.error('Use a JPG, PNG, WebP or AVIF image.');
    if (file.size > 10 * 1024 * 1024) return void toast.error('Image must be 10 MB or smaller.');
    setProgress(0);
    try {
      await onUpload(file, setProgress);
      toast.success(`${label} updated`);
    } catch (e) {
      toast.error(getErrorMessage(e, `Could not upload ${label.toLowerCase()}`));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-4">
        <div className={cn('relative shrink-0 overflow-hidden rounded-xl border bg-muted', shapeClassName)}>
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground"><ImagePlus className="h-6 w-6" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input ref={input} type="file" accept={ACCEPT.join(',')} className="sr-only" aria-label={`Upload ${label}`} onChange={(e) => void pick(e.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" disabled={disabled || progress !== null} loading={progress !== null} onClick={() => input.current?.click()}>
            {value ? 'Replace' : 'Upload'}
          </Button>
          {progress !== null && <Progress value={progress} className="h-1.5 max-w-[12rem]" />}
          <p className="text-xs text-muted-foreground">{hint ?? 'JPG, PNG, WebP or AVIF, up to 10 MB. Saved immediately.'}</p>
        </div>
      </div>
    </div>
  );
}
