import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';

export type ToastTone = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (toast: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastTone; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, IconName> = { info: 'info', success: 'check', error: 'alert' };
const TONE_STYLE: Record<ToastTone, string> = {
  info: 'text-primary-deep',
  success: 'text-success',
  error: 'text-error',
};

/** Global, dependency-free toast host. Mounted once at app root. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<ToastContextValue['notify']>(
    ({ title, description, tone = 'info', duration = 4200 }) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="false"
            /* Top-anchored on phones: a bottom-anchored toast covers the
               footer CTA of an open Drawer (cart/filters), which are exactly
               the flows that raise toasts. Bottom-right on larger screens
               where there is no such collision. */
            className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex flex-col items-center gap-2.5 p-4 pt-[calc(var(--header-height)+1.25rem)] sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-auto sm:items-end sm:p-6"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role="status"
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-md',
                  'motion-safe:animate-fade-up',
                )}
              >
                <span className={cn('mt-0.5 shrink-0', TONE_STYLE[toast.tone])}>
                  <Icon name={TONE_ICON[toast.tone]} size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium text-ink">{toast.title}</span>
                  {toast.description && (
                    <span className="mt-0.5 block text-caption text-ink-muted">{toast.description}</span>
                  )}
                </span>
                <IconButton
                  label="Dismiss notification"
                  size="sm"
                  icon={<Icon name="close" size={16} />}
                  onClick={() => dismiss(toast.id)}
                />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
