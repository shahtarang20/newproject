import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Check, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/api/endpoints/auth';
import { Button } from '@/components/ui/button';
import { FormError, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { homePathForRole, useAuthStore } from '@/stores/auth.store';
import { getErrorMessage, getFieldErrors } from '@/utils/errors';
import { BUSINESS_TYPE_LABELS, toOptions } from '@/utils/labels';
import { pageTitle, slugify } from '@/utils/seo';
import { registerSchema, type RegisterForm, type RegisterOutput } from '../schemas';

const BUSINESS_OPTIONS = toOptions(BUSINESS_TYPE_LABELS);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function RegisterPage() {
  const registerUser = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<RegisterForm, unknown, RegisterOutput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', shopName: '', shopSlug: '' },
  });
  const { control, setValue, setError, formState: { isSubmitting, errors } } = form;

  const shopName = useWatch({ control, name: 'shopName' });
  const slug = useWatch({ control, name: 'shopSlug' }) ?? '';

  // Auto-suggest slug from shop name until the user edits the slug manually.
  useEffect(() => {
    if (!slugTouched) setValue('shopSlug', slugify(shopName ?? ''), { shouldValidate: !!shopName });
  }, [shopName, slugTouched, setValue]);

  const debouncedSlug = useDebounce(slug.trim().toLowerCase(), 450);
  const slugValid = SLUG_RE.test(debouncedSlug) && debouncedSlug.length >= 3 && !errors.shopSlug;
  const availability = useQuery({
    queryKey: ['auth', 'slug-available', debouncedSlug],
    queryFn: ({ signal }) => authApi.slugAvailable(debouncedSlug, signal),
    enabled: slugValid,
    staleTime: 15_000,
    retry: false,
  });
  const checking = slug.trim().toLowerCase() !== debouncedSlug || availability.isFetching;
  const taken = slugValid && !checking && availability.data?.available === false;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    if (taken) {
      setError('shopSlug', { message: 'That shop link is already taken' });
      return;
    }
    try {
      const user = await registerUser(values);
      toast.success('Your shop is ready. Welcome to Vastra!');
      navigate(homePathForRole(user.role), { replace: true });
    } catch (e) {
      const fields = getFieldErrors(e);
      let handled = false;
      for (const [k, msg] of Object.entries(fields)) {
        if (k in values) {
          setError(k as keyof RegisterForm, { message: msg });
          handled = true;
        }
      }
      const msg = getErrorMessage(e, "We couldn't create your account. Please try again.");
      if (!handled) setFormError(msg);
      toast.error(msg);
    }
  });

  return (
    <div>
      <Helmet><title>{pageTitle('Create your shop')}</title></Helmet>
      <h1 className="text-2xl font-semibold tracking-tight">Create your shop</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Start free — your catalogue link is ready in a minute.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        <FormField control={control} name="name" label="Your name" required render={({ field, ...a }) => (
          <Input {...field} id={a.id} autoComplete="name" placeholder="Ananya Sharma" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
        )} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={control} name="email" label="Email" required render={({ field, ...a }) => (
            <Input {...field} id={a.id} type="email" autoComplete="email" inputMode="email" placeholder="you@shop.com" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
          )} />
          <FormField control={control} name="phone" label="Mobile number" required render={({ field, ...a }) => (
            <Input {...field} id={a.id} type="tel" autoComplete="tel" inputMode="tel" placeholder="98765 43210" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
          )} />
        </div>
        <FormField control={control} name="password" label="Password" required description="At least 8 characters with a letter and a number." render={({ field, ...a }) => (
          <div className="relative">
            <Input {...field} id={a.id} type={show ? 'text' : 'password'} autoComplete="new-password" className="pr-10" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )} />

        <div className="my-2 h-px bg-border" />

        <FormField control={control} name="shopName" label="Shop name" required render={({ field, ...a }) => (
          <Input {...field} id={a.id} autoComplete="organization" placeholder="Lakshmi Sarees" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
        )} />
        <FormField control={control} name="shopSlug" label="Shop link" required render={({ field, ...a }) => (
          <div className="space-y-1.5">
            <div className="relative">
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 bg-muted px-3 text-sm text-muted-foreground">/shop/</span>
                <Input
                  {...field}
                  id={a.id}
                  onChange={(e) => { setSlugTouched(true); field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '-')); }}
                  className="rounded-l-none pr-9"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="lakshmi-sarees"
                  aria-invalid={a['aria-invalid'] || taken}
                  aria-describedby={a['aria-describedby']}
                />
              </div>
              <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
                {slugValid && checking ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  : slugValid && availability.data?.available === true ? <Check className="h-4 w-4 text-success" />
                  : taken ? <X className="h-4 w-4 text-destructive" /> : null}
              </span>
            </div>
            <p className="text-xs" aria-live="polite">
              {taken ? (
                <span className="text-destructive">
                  Already taken.{availability.data?.suggestion && (
                    <> Try <button type="button" className="font-medium underline" onClick={() => { setSlugTouched(true); setValue('shopSlug', availability.data!.suggestion!, { shouldValidate: true }); }}>{availability.data.suggestion}</button></>
                  )}
                </span>
              ) : slugValid && !checking && availability.data?.available ? (
                <span className="text-success">Available</span>
              ) : null}
            </p>
          </div>
        )} />
        <FormField control={control} name="businessType" label="Business type" required render={({ field, ...a }) => (
          <Select value={field.value ?? ''} onValueChange={field.onChange}>
            <SelectTrigger id={a.id} aria-invalid={a['aria-invalid']} ref={field.ref} onBlur={field.onBlur}>
              <SelectValue placeholder="What do you sell?" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )} />

        <FormError message={formError} />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={taken}>Create my shop</Button>
        <p className="text-center text-xs text-muted-foreground">By continuing you agree to our Terms and Privacy Policy.</p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
