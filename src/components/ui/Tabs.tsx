import { useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultId?: string;
  className?: string;
  'aria-label': string;
}

/** WAI-ARIA tab pattern with arrow-key roving focus. */
export function Tabs({ items, defaultId, className, 'aria-label': ariaLabel }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultId ?? items[0]?.id);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const index = items.findIndex((item) => item.id === activeId);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;

    setActiveId(items[next].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  const active = items.find((item) => item.id === activeId);

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border"
      >
        {items.map((item) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              className={cn(
                'relative shrink-0 whitespace-nowrap px-4 py-3 text-body-sm font-medium',
                'transition-colors duration-fast ease-elegant focus-visible:outline-none focus-visible:bg-cream',
                selected ? 'text-primary-deep' : 'text-ink-muted hover:text-ink',
              )}
            >
              {item.label}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-3 -bottom-px h-0.5 origin-center rounded-full bg-primary',
                  'transition-transform duration-base ease-elegant',
                  selected ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </button>
          );
        })}
      </div>

      {active && (
        <div
          id={`${baseId}-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${active.id}`}
          tabIndex={0}
          className="motion-safe:animate-fade-in pt-6 focus-visible:outline-none"
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
