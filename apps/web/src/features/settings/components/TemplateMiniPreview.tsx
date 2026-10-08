import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import type { ButtonStyle, CatalogueLayout, TemplateId } from '@vastra/shared';
import { TemplateProvider } from '@/features/storefront/templates/useTemplate';
import { loadTemplate } from '@/features/storefront/templates/registry';
import type { TemplateDefinition } from '@/features/storefront/templates/types';
import { Skeleton } from '@/components/ui/skeleton';
import { SAMPLE_PRODUCTS, sampleShop } from './sampleData';

class PreviewBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('[TemplateMiniPreview]', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const VIRTUAL_WIDTH = 960;

interface Props {
  templateId: TemplateId;
  shopName: string;
  primaryColor?: string;
  buttonStyle?: ButtonStyle;
  layout?: CatalogueLayout;
  /** Visual height of the preview in px. */
  height?: number;
}

function PreviewContent({ def, templateId, shopName, primaryColor, buttonStyle, layout }: Omit<Props, 'height'> & { def: TemplateDefinition }) {
  const shop = sampleShop(templateId, shopName, { primaryColor, buttonStyle, layout });
  return (
    <TemplateProvider templateId={templateId} primaryColor={primaryColor} buttonStyle={buttonStyle} fallback={null}>
      <div className="!min-h-0">
        <def.Hero shop={shop} featured={SAMPLE_PRODUCTS} />
        <div className="px-8 py-8">
          <def.SectionHeading eyebrow="New in" title="Featured picks" align="center" />
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-6">
            {SAMPLE_PRODUCTS.map((p) => <def.ProductCard key={p.id} product={p} shop={shop} priority />)}
          </div>
        </div>
      </div>
    </TemplateProvider>
  );
}

/** Scaled-down, non-interactive live render of a template's Hero + two ProductCards using sample data. */
export function TemplateMiniPreview({ height = 280, ...props }: Props) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);
  const [def, setDef] = useState<TemplateDefinition | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / VIRTUAL_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadTemplate(props.templateId).then((d) => alive && setDef(d)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [props.templateId]);

  const fallback = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-xs text-muted-foreground">
      <ImageOff className="h-5 w-5" /> Preview unavailable
    </div>
  );

  return (
    <div ref={outer} className="relative w-full overflow-hidden bg-muted" style={{ height }} aria-hidden="true">
      {failed ? fallback : !def ? <Skeleton className="h-full w-full rounded-none" /> : (
        <PreviewBoundary fallback={fallback}>
          <div className="pointer-events-none absolute left-0 top-0 select-none origin-top-left" style={{ width: VIRTUAL_WIDTH, transform: `scale(${scale})` }}
            ref={(el) => el?.setAttribute('inert', '')}>
            <PreviewContent def={def} {...props} />
          </div>
        </PreviewBoundary>
      )}
    </div>
  );
}
