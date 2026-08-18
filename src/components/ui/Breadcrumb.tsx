import { Fragment } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import { SmartLink } from './SmartLink';

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: Crumb[];
  className?: string;
}

/** Semantic breadcrumb trail; the final item is marked as current page. */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-caption', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-ink-subtle">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {item.href && !last ? (
                  <SmartLink
                    href={item.href}
                    className="rounded-xs transition-colors duration-fast hover:text-primary-deep focus-visible:outline-none focus-visible:text-primary-deep"
                  >
                    {item.label}
                  </SmartLink>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={last ? 'text-ink' : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden className="text-border-strong">
                  <Icon name="chevron-right" size={13} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
