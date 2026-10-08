import { cn } from '@/utils/cn';

type Flat = Record<string, unknown>;

function flatten(v: unknown, prefix = '', out: Flat = {}): Flat {
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0) {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) flatten(val, prefix ? `${prefix}.${k}` : k, out);
  } else if (prefix) out[prefix] = v;
  else out['(value)'] = v;
  return out;
}

const show = (v: unknown) => (v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v));

/** Field-level before/after diff of two JSON values. */
export function JsonDiff({ before, after }: { before: unknown; after: unknown }) {
  const b = before == null ? {} : flatten(before);
  const a = after == null ? {} : flatten(after);
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
  const rows = keys.map((k) => ({ k, b: b[k], a: a[k], changed: JSON.stringify(b[k]) !== JSON.stringify(a[k]) }));
  const changed = rows.filter((r) => r.changed);
  if (!rows.length) return <p className="text-xs text-muted-foreground">No before/after data recorded.</p>;
  if (!changed.length) return <p className="text-xs text-muted-foreground">No field changes recorded.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 font-medium">Field</th>
            <th className="px-3 py-1.5 font-medium">Before</th>
            <th className="px-3 py-1.5 font-medium">After</th>
          </tr>
        </thead>
        <tbody className="divide-y font-mono">
          {changed.map((r) => (
            <tr key={r.k}>
              <td className="px-3 py-1.5 align-top">{r.k}</td>
              <td className={cn('break-all px-3 py-1.5 align-top', r.b !== undefined && 'bg-destructive/10 text-destructive')}>{show(r.b)}</td>
              <td className={cn('break-all px-3 py-1.5 align-top', r.a !== undefined && 'bg-success/10 text-success')}>{show(r.a)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
