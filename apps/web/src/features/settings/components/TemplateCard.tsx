import { Check } from 'lucide-react';
import type { ButtonStyle, CatalogueLayout } from '@vastra/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import type { TemplateMeta } from '@/types/settings';
import { TemplateMiniPreview } from './TemplateMiniPreview';

interface Props {
  template: TemplateMeta;
  shopName: string;
  applied: boolean;
  selected: boolean;
  onSelect: () => void;
  primaryColor?: string;
  buttonStyle?: ButtonStyle;
  layout?: CatalogueLayout;
  disabled?: boolean;
}

export function TemplateCard({ template, shopName, applied, selected, onSelect, primaryColor, buttonStyle, layout, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'group overflow-hidden rounded-2xl border bg-card text-left shadow-soft transition-all hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
        selected ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/40',
      )}
    >
      <div className="relative">
        <TemplateMiniPreview templateId={template.id} shopName={shopName} primaryColor={primaryColor} buttonStyle={buttonStyle} layout={layout} height={220} />
        <div className="absolute left-2 top-2 flex gap-1.5">
          {applied && <Badge variant="success" className="bg-background/95 shadow-soft"><Check className="h-3 w-3" /> Currently applied</Badge>}
        </div>
        {selected && !applied && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold tracking-tight">{template.name}</h3>
          <span className="flex shrink-0 -space-x-1">
            {template.previewColors.slice(0, 5).map((c) => (
              <span key={c} className="h-4 w-4 rounded-full border border-background ring-1 ring-border" style={{ backgroundColor: c }} />
            ))}
          </span>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{template.tagline}</p>
      </div>
    </button>
  );
}
