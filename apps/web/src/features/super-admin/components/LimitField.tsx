import { useState } from 'react';
import type { LimitKey } from '@vastra/shared';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { GB, LIMIT_TITLES, MB } from './AdminBits';
import { cn } from '@/utils/cn';

type Unit = 'MB' | 'GB';

function init(key: LimitKey, value: number | null): { text: string; unit: Unit } {
  if (value === null) return { text: '', unit: 'GB' };
  if (key !== 'storageBytes') return { text: String(value), unit: 'GB' };
  if (value % GB === 0 || value >= GB * 10) return { text: String(Math.round((value / GB) * 100) / 100), unit: 'GB' };
  return { text: String(Math.round((value / MB) * 100) / 100), unit: 'MB' };
}

function toValue(key: LimitKey, text: string, unit: Unit): number {
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (key === 'storageBytes') return Math.round(n * (unit === 'GB' ? GB : MB));
  return Math.floor(n);
}

interface Props {
  limitKey: LimitKey;
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  /** Hide the label (when the caller renders its own). */
  hideLabel?: boolean;
}

/** Numeric limit with an "Unlimited" switch (null). Storage is edited in MB/GB and emitted as bytes. */
export function LimitField({ limitKey, value, onChange, disabled, hideLabel }: Props) {
  const [state, setState] = useState(() => init(limitKey, value));
  const unlimited = value === null;
  const isStorage = limitKey === 'storageBytes';
  const id = `limit-${limitKey}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hideLabel && (
        <label htmlFor={id} className="min-w-28 flex-1 text-sm font-medium">
          {LIMIT_TITLES[limitKey]}
        </label>
      )}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={isStorage ? 'any' : 1}
          className={cn('h-9 w-28 tabular-nums', unlimited && 'opacity-50')}
          disabled={disabled || unlimited}
          placeholder={unlimited ? '∞' : '0'}
          value={unlimited ? '' : state.text}
          onChange={(e) => {
            const text = e.target.value;
            setState((s) => ({ ...s, text }));
            onChange(toValue(limitKey, text, state.unit));
          }}
          aria-label={`${LIMIT_TITLES[limitKey]} limit`}
        />
        {isStorage && (
          <Select
            value={state.unit}
            disabled={disabled || unlimited}
            onValueChange={(u) => {
              setState((s) => ({ ...s, unit: u as Unit }));
              if (!unlimited) onChange(toValue(limitKey, state.text, u as Unit));
            }}
          >
            <SelectTrigger className="h-9 w-20" aria-label="Storage unit">
              <span>{state.unit}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MB">MB</SelectItem>
              <SelectItem value="GB">GB</SelectItem>
            </SelectContent>
          </Select>
        )}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Switch
            checked={unlimited}
            disabled={disabled}
            onCheckedChange={(on) => {
              if (on) onChange(null);
              else {
                const s = state.text === '' ? { text: '0', unit: state.unit } : state;
                setState(s);
                onChange(toValue(limitKey, s.text, s.unit));
              }
            }}
            aria-label={`${LIMIT_TITLES[limitKey]} unlimited`}
          />
          Unlimited
        </label>
      </div>
    </div>
  );
}
