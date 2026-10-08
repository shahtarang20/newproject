import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/api/client';
import { staffApi } from '@/api/endpoints/staff';
import { Button } from '@/components/ui/button';
import { FormError, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/utils/errors';
import { pageTitle } from '@/utils/seo';

const schema = z.object({
  password: z.string().min(8, 'Use at least 8 characters').max(128),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type Form = z.infer<typeof schema>;

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [invalid, setInvalid] = useState<string>();
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      const { email } = await staffApi.acceptInvite(token, password);
      toast.success(`Password set. Sign in${email ? ` as ${email}` : ''} to get started.`);
      navigate('/login', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 404 || e.status === 410) && e.code !== 'VALIDATION_ERROR') setInvalid(getErrorMessage(e));
      else toast.error(getErrorMessage(e, 'Could not accept the invitation'));
    }
  });

  if (!token || invalid) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle className="h-6 w-6" /></span>
        <h1 className="text-2xl font-semibold tracking-tight">This invitation link isn't valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">{invalid ?? 'The link is missing its token.'} It may have expired (links last 7 days) or already been used. Ask the shop owner to resend the invitation.</p>
        <Button asChild className="mt-6"><Link to="/login">Go to sign in</Link></Button>
      </div>
    );
  }

  return (
    <div>
      <Helmet><title>{pageTitle('Accept invitation')}</title></Helmet>
      <h1 className="text-2xl font-semibold tracking-tight">Join your team</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Set a password to activate your account.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        <FormField control={form.control} name="password" label="New password" render={({ field, id, ...a }) => (
          <Input {...field} id={id} type="password" autoComplete="new-password" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
        )} />
        <FormField control={form.control} name="confirm" label="Confirm password" render={({ field, id, ...a }) => (
          <Input {...field} id={id} type="password" autoComplete="new-password" aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']} />
        )} />
        <FormError message={form.formState.errors.root?.message} />
        <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>Activate account</Button>
      </form>
    </div>
  );
}
