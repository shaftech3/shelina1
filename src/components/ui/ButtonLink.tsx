import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

/** Internal app routes start with a single slash (not `//` protocol-relative). */
const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('//');

/**
 * Anchor styled as a button.
 *
 * Keeping navigation on a real anchor preserves keyboard, middle-click and
 * screen-reader semantics — never simulate links with onClick handlers.
 * Internal hrefs render a router <Link> so navigation stays client-side;
 * external and hash hrefs fall back to a plain <a>.
 */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconLeft,
  iconRight,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  const classes = cn(buttonClasses(variant, size, fullWidth), className);
  const content = (
    <span className="inline-flex items-center gap-2">
      {iconLeft}
      {children}
      {iconRight}
    </span>
  );

  if (isInternal(href)) {
    return (
      <Link to={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} className={classes} {...rest}>
      {content}
    </a>
  );
}
