import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon, Input } from '@/components/ui';
import { STORE_CONFIG } from '@/lib/constants';
import { useSeo } from '@/hooks';
import { useAdminAuth } from '../auth';

interface LocationState {
  from?: string;
}

/**
 * Admin sign-in.
 *
 * Intentionally plainer than the storefront — this is a tool, not a shop
 * window — while still using the Shelina palette and type scale.
 */
export function AdminLoginPage() {
  const { login, isAuthenticated, initialising } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useSeo({
    title: 'Admin sign in',
    description: 'Shelina store administration.',
    path: '/admin/login',
    // Admin screens must never be indexed.
    noIndex: true,
  });

  // Already signed in? Go where they were headed, or the dashboard.
  const destination = (location.state as LocationState | null)?.from ?? '/admin';
  if (!initialising && isAuthenticated) return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (!email.trim()) {
      setError('Please enter your admin email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(destination, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="eyebrow text-primary-deep">Store administration</span>
          <h1 className="mt-2 font-display text-h1 text-ink">{STORE_CONFIG.name}</h1>
          <p className="mt-2 text-body-sm text-ink-muted">Sign in to manage your catalogue and content.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 shadow-xs sm:p-8"
        >
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="shelinaofficial@gmail.com"
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            iconRight={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-1 text-ink-subtle hover:text-ink focus:outline-none transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
              </button>
            }
          />

          {error && (
            <p role="alert" className="flex items-start gap-2 text-body-sm text-error">
              <Icon name="alert" size={17} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth loading={submitting} disabled={submitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-caption leading-relaxed text-ink-subtle">
          Access is restricted to Shelina staff accounts. Every request is authorised on the server.
        </p>
      </div>
    </main>
  );
}
