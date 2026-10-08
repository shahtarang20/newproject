import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormError } from '@/components/ui/form';
import { cn } from '@/utils/cn';
import { useWizard } from './context';

/** Label + control + error (error comes from the wizard's per-step validation map). */
export function Field({ label, path, hint, required, className, children }: {
  label: ReactNode; path?: string; hint?: ReactNode; required?: boolean; className?: string; children: ReactNode;
}) {
  const { errors } = useWizard();
  const err = path ? errors[path] : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {err ? <FormError message={err} /> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const NONE = '__none__';

export function EnumSelect<T extends string>({ value, onChange, options, placeholder = 'Select…', allowNone = true, disabled }: {
  value: T | ''; onChange: (v: T | '') => void; options: { value: T; label: string }[]; placeholder?: string; allowNone?: boolean; disabled?: boolean;
}) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : (v as T))} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>{placeholder === 'Select…' ? 'Not set' : placeholder}</SelectItem>}
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ChipToggleGroup<T extends string>({ value, onChange, options }: {
  value: T[]; onChange: (v: T[]) => void; options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn('rounded-full border px-3 py-1 text-sm transition-colors', on ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-secondary')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function TagsInput({ value, onChange, placeholder = 'Type and press Enter', max = 30 }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((t) => t.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p.slice(0, 40));
    onChange(next);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function StepCard({ title, description, children, className }: { title: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-4 rounded-2xl border bg-card p-4 shadow-soft sm:p-6', className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
