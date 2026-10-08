import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { SfInput, sfFocusRing } from './ui-sf';
import { cn } from '@/utils/cn';

interface Props {
  value: string;
  onChange: (q: string) => void;
  placeholder?: string;
  className?: string;
}

/** Debounced (400ms) search input. Emits only when the user's typed value differs from `value`. */
export function SearchBar({ value, onChange, placeholder = 'Search sarees, kurtas, colours…', className }: Props) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 400);
  const last = useRef(value);

  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (debounced.trim() !== last.current.trim()) {
      last.current = debounced;
      onChange(debounced);
    }
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault();
        last.current = text;
        onChange(text);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--sf-muted-fg)]" aria-hidden="true" />
      <SfInput type="search" aria-label="Search products" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} className="pl-9 pr-9" enterKeyHint="search" />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText('');
            last.current = '';
            onChange('');
          }}
          className={cn('absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-[color:var(--sf-muted)]', sfFocusRing)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
