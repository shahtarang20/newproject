import type { ReactNode } from 'react';
import { useFormContext, type FieldPath } from 'react-hook-form';
import { FormField } from '@/components/ui/form';
import { Input, type InputProps } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { ShopSettingsForm } from '../schemas';

type Name = FieldPath<ShopSettingsForm>;

interface TextFieldProps extends Omit<InputProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> {
  name: Name;
  label: string;
  hint?: ReactNode;
  className?: string;
}

export function TextField({ name, label, hint, className, ...props }: TextFieldProps) {
  const { control } = useFormContext<ShopSettingsForm>();
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      hint={hint}
      className={className}
      render={({ field, id, ...a }) => (
        <Input
          {...props}
          id={id}
          name={field.name}
          ref={field.ref}
          value={String(field.value ?? '')}
          onChange={field.onChange}
          onBlur={field.onBlur}
          aria-invalid={a['aria-invalid']}
          aria-describedby={a['aria-describedby']}
        />
      )}
    />
  );
}

export function TextAreaField({
  name, label, hint, rows = 4, maxLength, placeholder,
}: { name: Name; label: string; hint?: ReactNode; rows?: number; maxLength?: number; placeholder?: string }) {
  const { control } = useFormContext<ShopSettingsForm>();
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      hint={hint}
      render={({ field, id, ...a }) => (
        <Textarea
          id={id}
          name={field.name}
          ref={field.ref}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          value={String(field.value ?? '')}
          onChange={field.onChange}
          onBlur={field.onBlur}
          aria-invalid={a['aria-invalid']}
          aria-describedby={a['aria-describedby']}
        />
      )}
    />
  );
}

export function SwitchField({ name, label }: { name: Name; label: string }) {
  const { control } = useFormContext<ShopSettingsForm>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, id }) => (
        <Switch id={id} aria-label={label} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
      )}
    />
  );
}
