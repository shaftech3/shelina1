import { Spinner } from '@/components/ui/Spinner';

/** Minimal suspense fallback for lazily loaded routes. */
export function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-primary">
      <Spinner size="lg" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}
