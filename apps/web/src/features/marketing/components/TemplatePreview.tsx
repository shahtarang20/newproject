import type { TemplateId } from '@vastra/shared';

export interface TemplateMeta {
  name: string;
  tagline: string;
  primary: string;
  secondary: string;
  serif?: boolean;
  radius: string;
  layout: 'split' | 'center' | 'grid' | 'band';
}

export const TEMPLATE_META: Record<TemplateId, TemplateMeta> = {
  'heritage-gold': { name: 'Heritage Gold', tagline: 'Deep maroon and gold for classic saree houses', primary: '#5b1226', secondary: '#c9a24a', serif: true, radius: '4px', layout: 'split' },
  'minimal-noir': { name: 'Minimal Noir', tagline: 'Monochrome editorial with hairline borders', primary: '#0a0a0a', secondary: '#f6f6f3', radius: '0px', layout: 'center' },
  'boutique-blush': { name: 'Boutique Blush', tagline: 'Soft, airy and rounded for boutiques', primary: '#c2476b', secondary: '#fdf0f2', radius: '14px', layout: 'split' },
  'urban-street': { name: 'Urban Street', tagline: 'Bold dark grid with a neon accent', primary: '#c6ff3d', secondary: '#0b0b0c', radius: '2px', layout: 'grid' },
  'royal-silk': { name: 'Royal Silk', tagline: 'Regal blue with gold foil for luxury', primary: '#0c1b4d', secondary: '#c9a24a', serif: true, radius: '6px', layout: 'band' },
  'modern-linen': { name: 'Modern Linen', tagline: 'Warm neutrals and a calm lifestyle feel', primary: '#b4694a', secondary: '#f4efe7', radius: '10px', layout: 'center' },
  'festive-bloom': { name: 'Festive Bloom', tagline: 'Marigold and magenta, made for festivals', primary: '#d6246e', secondary: '#ffb400', radius: '18px', layout: 'grid' },
};

const DARK_BG = new Set<TemplateId>(['urban-street', 'minimal-noir']);

/** Stylised, purely decorative CSS mini-storefront derived from the template colours. */
export function TemplatePreview({ id }: { id: TemplateId }) {
  const m = TEMPLATE_META[id];
  const light = id === 'minimal-noir' ? m.secondary : id === 'urban-street' ? m.secondary : m.secondary;
  // page background / ink / accent per template
  const pageBg = id === 'minimal-noir' ? '#f6f6f3' : id === 'urban-street' ? '#0b0b0c' : id === 'royal-silk' ? '#f7f4ec' : id === 'heritage-gold' ? '#fbf6ee' : id === 'festive-bloom' ? '#fff7e6' : light;
  const ink = DARK_BG.has(id) && id === 'urban-street' ? '#f4f4f4' : '#1a1a1a';
  const headerBg = id === 'heritage-gold' || id === 'royal-silk' ? m.primary : id === 'minimal-noir' ? '#f6f6f3' : id === 'urban-street' ? '#0b0b0c' : 'transparent';
  const headerInk = id === 'heritage-gold' || id === 'royal-silk' ? m.secondary : ink;
  const accent = id === 'minimal-noir' ? '#0a0a0a' : id === 'urban-street' ? m.primary : id === 'modern-linen' || id === 'boutique-blush' || id === 'festive-bloom' ? m.primary : m.secondary;
  const heroBg =
    id === 'heritage-gold' ? `linear-gradient(135deg, ${m.primary}, #8a2340)`
    : id === 'royal-silk' ? `linear-gradient(135deg, ${m.primary}, #1d3a8f)`
    : id === 'festive-bloom' ? `linear-gradient(135deg, ${m.primary}, ${m.secondary})`
    : id === 'boutique-blush' ? `linear-gradient(135deg, #f8d3dc, #fdf0f2)`
    : id === 'modern-linen' ? `linear-gradient(135deg, #e6dccb, #f4efe7)`
    : id === 'urban-street' ? `linear-gradient(135deg, #1a1a1c, #26262a)`
    : `linear-gradient(135deg, #e9e9e5, #f6f6f3)`;
  const tileBgs =
    id === 'urban-street' ? ['#1c1c1f', '#232327', '#1c1c1f', '#232327']
    : id === 'festive-bloom' ? ['#ffe3ef', '#fff0c2', '#ffd6e8', '#ffe9a8']
    : id === 'boutique-blush' ? ['#fbe0e6', '#fdf0f2', '#f6cfd8', '#fdf0f2']
    : id === 'modern-linen' ? ['#eadfcf', '#e2d3bd', '#efe6d8', '#dcc9ae']
    : id === 'minimal-noir' ? ['#ececE8', '#dededa', '#ececE8', '#e2e2de']
    : ['#efe3cf', '#e8d6b8', '#f1e7d4', '#e2cfa8'];
  const r = m.radius;
  const font = m.serif ? 'Georgia, "Times New Roman", serif' : 'inherit';
  const tileCols = m.layout === 'grid' ? 'grid-cols-3' : 'grid-cols-2';
  const tiles = m.layout === 'grid' ? 3 : 4;

  return (
    <div aria-hidden className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border shadow-card" style={{ background: pageBg, color: ink, fontFamily: font }}>
      <div className="flex h-7 items-center justify-between px-3" style={{ background: headerBg, color: headerInk, borderBottom: id === 'minimal-noir' ? '1px solid #0a0a0a' : undefined }}>
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em]">{id.split('-')[0]}</span>
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => <span key={i} className="h-[2px] w-3" style={{ background: headerInk, opacity: 0.7 }} />)}
        </span>
      </div>
      <div className="p-3">
        <div className={m.layout === 'center' ? 'flex flex-col items-center gap-2 py-3 text-center' : 'relative flex items-end overflow-hidden p-3'} style={m.layout === 'center' ? undefined : { background: heroBg, borderRadius: r, height: 88 }}>
          {m.layout === 'center' ? (
            <>
              <div className={id === 'minimal-noir' ? 'text-[26px] font-black leading-none tracking-tighter' : 'text-[15px] font-medium leading-tight'}>
                {id === 'minimal-noir' ? 'NEW\nSEASON'.split('\n').map((t) => <div key={t}>{t}</div>) : 'Linen, made slow'}
              </div>
              <div className="h-1.5 w-16" style={{ background: accent, borderRadius: r }} />
              <div className="mt-1 h-14 w-full" style={{ background: heroBg, borderRadius: r }} />
            </>
          ) : (
            <>
              <div className="space-y-1">
                <div className="h-2 w-16 rounded-full" style={{ background: id === 'boutique-blush' || id === 'modern-linen' ? m.primary : id === 'urban-street' ? m.primary : m.secondary }} />
                <div className="h-1.5 w-10 rounded-full opacity-60" style={{ background: id === 'boutique-blush' || id === 'modern-linen' ? m.primary : '#fff' }} />
              </div>
              {m.layout === 'band' && <div className="absolute inset-x-0 top-0 h-1" style={{ background: m.secondary }} />}
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-30" style={{ background: id === 'urban-street' ? m.primary : m.secondary }} />
            </>
          )}
        </div>
        <div className={`mt-3 grid gap-2 ${tileCols}`}>
          {Array.from({ length: tiles }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="aspect-[3/4] w-full" style={{ background: tileBgs[i % 4], borderRadius: r, border: id === 'minimal-noir' ? '1px solid #0a0a0a22' : undefined }} />
              <div className="h-1 w-3/4 rounded-full" style={{ background: ink, opacity: 0.55 }} />
              <div className="h-1 w-1/3 rounded-full" style={{ background: accent }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
