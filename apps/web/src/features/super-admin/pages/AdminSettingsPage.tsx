import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { adminApi } from '@/api/endpoints/admin';
import type { PlatformSettings } from '@/types/admin';
import { SectionCard } from '../components/AdminBits';
import { useAdminMutation, useAdminSettings } from '../hooks/useAdmin';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const humanize = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const FLAG_RE = /^[A-Za-z][\w.-]{0,59}$/;

const DESCRIPTIONS: Record<string, string> = {
  maintenance: 'Show a maintenance notice. (Enforcement is up to the app; the API only stores it.)',
  signupsEnabled: 'Allow new shops to register.',
  featureFlags: 'Free-form boolean flags other modules can read.',
  defaults: 'Defaults for new shops.',
};

function Field({ path, label, value, onChange }: { path: string; label: string; value: unknown; onChange: (v: unknown) => void }) {
  const id = `setting-${path}`;
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-4 py-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <Switch id={id} checked={value} onCheckedChange={onChange} />
      </div>
    );
  }
  if (typeof value === 'number') {
    return (
      <div className="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <Input id={id} type="number" className="sm:w-40" value={Number.isFinite(value) ? value : ''} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <Input id={id} className="sm:max-w-sm" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FeatureFlags({ flags, onChange }: { flags: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void }) {
  const [name, setName] = useState('');
  const valid = FLAG_RE.test(name) && !(name in flags);
  const entries = Object.entries(flags);
  return (
    <div className="space-y-2">
      {entries.length === 0 && <p className="py-2 text-sm text-muted-foreground">No feature flags defined.</p>}
      <ul className="divide-y">
        {entries.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between gap-3 py-2">
            <label htmlFor={`flag-${k}`} className="min-w-0 truncate font-mono text-sm">{k}</label>
            <div className="flex items-center gap-2">
              <Switch id={`flag-${k}`} checked={v} onCheckedChange={(on) => onChange({ ...flags, [k]: on })} />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove flag ${k}`}
                onClick={() => {
                  const { [k]: _removed, ...rest } = flags;
                  onChange(rest);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onChange({ ...flags, [name]: false });
          setName('');
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="newFlagName" aria-label="New flag name" className="font-mono" />
        <Button type="submit" variant="outline" disabled={!valid}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>
      {name && !valid && <p className="text-xs text-destructive">Start with a letter; use letters, digits, _ . - (unique).</p>}
    </div>
  );
}

export default function AdminSettingsPage() {
  const q = useAdminSettings();
  const [draft, setDraft] = useState<PlatformSettings | null>(null);
  useEffect(() => {
    if (q.data) setDraft(structuredClone(q.data));
  }, [q.data]);

  const save = useAdminMutation((body: PlatformSettings) => adminApi.saveSettings(body), { success: 'Settings saved' });

  const changed = useMemo(() => {
    if (!q.data || !draft) return {} as PlatformSettings;
    const out: PlatformSettings = {};
    for (const k of Object.keys(draft)) if (JSON.stringify(draft[k]) !== JSON.stringify(q.data[k])) out[k] = draft[k];
    return out;
  }, [q.data, draft]);
  const dirty = Object.keys(changed).length > 0;

  const setTop = (key: string, value: unknown) => setDraft((d) => ({ ...(d ?? {}), [key]: value }));
  const setNested = (key: string, sub: string, value: unknown) => setDraft((d) => ({ ...(d ?? {}), [key]: { ...(isObj(d?.[key]) ? (d?.[key] as Obj) : {}), [sub]: value } }));

  return (
    <>
      <PageHeader
        title="Platform settings"
        description="Global switches and defaults. Saved changes apply immediately."
        actions={
          <>
            <Button variant="outline" disabled={!dirty} onClick={() => q.data && setDraft(structuredClone(q.data))}>
              Discard
            </Button>
            <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(changed)}>
              Save changes
            </Button>
          </>
        }
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !draft ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(draft).map(([key, value]) => {
            const title = humanize(key);
            if (key === 'featureFlags' && isObj(value)) {
              return (
                <SectionCard key={key} title={title} description={DESCRIPTIONS[key]}>
                  <FeatureFlags flags={value as Record<string, boolean>} onChange={(v) => setTop(key, v)} />
                </SectionCard>
              );
            }
            if (isObj(value)) {
              return (
                <SectionCard key={key} title={title} description={DESCRIPTIONS[key]}>
                  <div className="divide-y">
                    {Object.entries(value).map(([sub, v]) => (
                      <Field key={sub} path={`${key}-${sub}`} label={humanize(sub)} value={v} onChange={(nv) => setNested(key, sub, nv)} />
                    ))}
                  </div>
                </SectionCard>
              );
            }
            return (
              <SectionCard key={key} title={title} description={DESCRIPTIONS[key]}>
                <Field path={key} label={title} value={value} onChange={(v) => setTop(key, v)} />
              </SectionCard>
            );
          })}
        </div>
      )}
    </>
  );
}
