import * as React from 'react';
import { Controller, type Control, type FieldPath, type FieldValues, type ControllerRenderProps, type ControllerFieldState } from 'react-hook-form';
import { cn } from '@/utils/cn';
import { Label } from './label';

export function FormError({ message, id, className }: { message?: string; id?: string; className?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn('text-xs font-medium text-destructive', className)}>
      {message}
    </p>
  );
}

interface FormFieldProps<T extends FieldValues, N extends FieldPath<T>> {
  control: Control<T>;
  name: N;
  label?: React.ReactNode;
  description?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  render: (args: {
    field: ControllerRenderProps<T, N>;
    fieldState: ControllerFieldState;
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => React.ReactElement;
}

/** Label + control + error wiring for react-hook-form. */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control, name, label, description, hint, required, className, render,
}: FormFieldProps<T, N>) {
  const uid = React.useId();
  const id = `${uid}-${name}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const err = fieldState.error?.message;
        const describedBy = err ? `${id}-error` : description || hint ? `${id}-desc` : undefined;
        return (
          <div className={cn('space-y-1.5', className)}>
            {label && (
              <Label htmlFor={id}>
                {label}
                {required && <span className="ml-0.5 text-destructive">*</span>}
              </Label>
            )}
            {render({ field, fieldState, id, 'aria-invalid': !!err, 'aria-describedby': describedBy })}
            {!err && (description || hint) && (
              <p id={`${id}-desc`} className="text-xs text-muted-foreground">
                {description ?? hint}
              </p>
            )}
            <FormError id={`${id}-error`} message={err} />
          </div>
        );
      }}
    />
  );
}
