import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/utils/cn';

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  'aria-label'?: string;
}

/** Debounced search box. `onChange` fires after `delay` ms of no typing. */
export function SearchInput({ value = '', onChange, placeholder = 'Search…', delay = 350, className, ...rest }: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounce(local, delay);
  const first = useRef(true);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (debounced !== value) onChangeRef.current(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="px-9 [&::-webkit-search-cancel-button]:hidden"
        aria-label={rest['aria-label'] ?? placeholder}
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal('');
            onChange('');
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
