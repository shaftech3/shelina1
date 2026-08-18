import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';

export interface SmartLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

/** Internal app routes start with a single slash (not `//` protocol-relative). */
const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('//');

/**
 * Renders a router <Link> for internal hrefs and a plain <a> for external,
 * hash and `mailto:`/`tel:` targets.
 *
 * Data-driven links (navigation, cards, banners) come from mock data as plain
 * href strings, so this keeps them client-side without every consumer having
 * to know which kind of link it is holding.
 */
export const SmartLink = forwardRef<HTMLAnchorElement, SmartLinkProps>(function SmartLink(
  { href, children, ...rest },
  ref,
) {
  if (isInternal(href)) {
    return (
      <Link ref={ref} to={href} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <a ref={ref} href={href} {...rest}>
      {children}
    </a>
  );
});
