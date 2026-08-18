import { useId, useState, type FormEvent } from 'react';
import { cn } from '@/lib/cn';
import { Button, Container, Icon, Input, Reveal } from '@/components/ui';

interface NewsletterProps {
  className?: string;
  heading?: string;
  description?: string;
}

type Status = 'idle' | 'submitting' | 'success';

/**
 * Newsletter signup.
 *
 * Stage 2 is presentation only: no backend, no third-party provider. Submitting
 * runs a short local delay and swaps to a success state so the interaction can
 * be designed and reviewed. Wire to a real endpoint in a later stage by
 * replacing the body of `handleSubmit`.
 */
export function Newsletter({
  className,
  heading = 'Join the Shelina list',
  description = 'New arrivals, seasonal edits and private previews — sent occasionally, never noisily.',
}: NewsletterProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [email, setEmail] = useState('');
  const headingId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== 'idle') return;
    setStatus('submitting');
    // Demo only — no network request is made.
    window.setTimeout(() => setStatus('success'), 620);
  };

  // Uses primary-deep rather than primary: white body text on the lighter brand
  // blue measures only 2.4:1 and fails WCAG AA. The deeper tone keeps the brand
  // identity while clearing 5.68:1.
  return (
    <section className={cn('bg-primary-deep', className)} aria-labelledby={headingId}>
      <Container>
        <Reveal className="flex flex-col items-center gap-6 py-14 text-center md:py-20">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="eyebrow text-white">Stay in touch</span>
            <h2 id={headingId} className="text-h2 text-white">
              {heading}
            </h2>
            <p className="text-body text-white">{description}</p>
          </div>

          {status === 'success' ? (
            <div
              role="status"
              className="flex items-center gap-3 rounded-full bg-white px-6 py-4 text-left shadow-md"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
                <Icon name="check" size={19} strokeWidth={2.4} />
              </span>
              <span className="flex flex-col">
                <span className="text-body-sm font-medium text-ink">You’re on the list</span>
                <span className="text-caption text-ink-muted">
                  Demo only — no email was sent.
                </span>
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-lg flex-col gap-3 sm:flex-row"
              aria-label="Newsletter signup"
            >
              <Input
                type="email"
                name="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                autoComplete="email"
                wrapperClassName="flex-1"
                className="h-14 bg-white"
              />
              <Button
                type="submit"
                variant="light"
                size="lg"
                loading={status === 'submitting'}
                className="sm:shrink-0"
              >
                Subscribe
              </Button>
            </form>
          )}
        </Reveal>
      </Container>
    </section>
  );
}
