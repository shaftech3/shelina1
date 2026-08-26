import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { STORE_CONFIG } from '@/lib/constants';
import { primaryNav } from '@/data/mock/navigation';
import { useScrolledPast } from '@/hooks';
import { useCart } from '@/cart';
import { Container, Dropdown, DropdownItem, Icon, IconButton } from '@/components/ui';
import { Logo } from './Logo';
import { AnnouncementBar } from './AnnouncementBar';
import { AccountMenu } from './AccountMenu';
import { MobileNav } from './MobileNav';
import { SearchOverlay } from './SearchOverlay';

interface HeaderProps {
  /** Hero pages start transparent and solidify on scroll. */
  overHero?: boolean;
}

export function Header({ overHero = false }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrolled = useScrolledPast(24);
  const { totals, openCart } = useCart();
  const cartCount = totals.count;
  const { pathname } = useLocation();
  const solid = scrolled || !overHero;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <AnnouncementBar />

      <header
        className={cn(
          'sticky top-0 z-50 w-full',
          'transition-[background-color,box-shadow,border-color] duration-base ease-elegant',
          solid
            ? 'border-b border-border bg-surface/92 backdrop-blur-md supports-[backdrop-filter]:bg-surface/85'
            : 'border-b border-transparent bg-transparent',
          scrolled && 'shadow-sm',
        )}
      >
        <Container>
          <div className="flex h-[var(--header-height)] items-center justify-between gap-3">
            {/* Mobile: menu trigger */}
            <div className="flex items-center lg:hidden">
              <IconButton
                label="Open menu"
                icon={<Icon name="menu" size={22} />}
                onClick={() => setMenuOpen(true)}
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
              />
            </div>

            {/* Brand */}
            <Link
              to="/"
              aria-label={`${STORE_CONFIG.name} — home`}
              className="flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:shadow-focus lg:mr-2"
            >
              <Logo slot="mobile" className="lg:hidden" priority />
              <Logo slot="desktop" className="hidden lg:inline-flex" showWordmark priority />
            </Link>

            {/* Desktop navigation */}
            <nav aria-label="Primary" className="hidden min-w-0 flex-1 lg:flex lg:justify-center">
              <ul className="flex items-center gap-0.5">
                {primaryNav.map((item) =>
                  item.children?.length ? (
                    <li key={item.label}>
                      <Dropdown
                        openOnHover
                        trigger={({ open, toggle, id, controls }) => (
                          <button
                            id={id}
                            type="button"
                            onClick={toggle}
                            aria-expanded={open}
                            aria-controls={controls}
                            aria-haspopup="menu"
                            className={cn(
                              'group relative inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-body-sm font-medium',
                              'transition-colors duration-fast ease-elegant focus-visible:outline-none focus-visible:shadow-focus',
                              open || isActive(item.href) ? 'text-primary-deep' : 'text-ink hover:text-primary-deep',
                            )}
                          >
                            {item.label}
                            <Icon
                              name="chevron-down"
                              size={15}
                              className={cn('transition-transform duration-fast', open && 'rotate-180')}
                            />
                          </button>
                        )}
                      >
                        {item.children.map((child) => (
                          <DropdownItem key={child.label} href={child.href} description={child.description}>
                            {child.label}
                          </DropdownItem>
                        ))}
                      </Dropdown>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <Link
                        to={item.href}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                        className={cn(
                          'group relative inline-block rounded-full px-3.5 py-2 text-body-sm font-medium',
                          'transition-colors duration-fast ease-elegant',
                          'focus-visible:outline-none focus-visible:shadow-focus',
                          item.accent ? 'text-secondary-deep hover:text-secondary-deep' : 'text-ink hover:text-primary-deep',
                          isActive(item.href) && !item.accent && 'text-primary-deep',
                        )}
                      >
                        {item.label}
                        {/* Underline micro-interaction — grows from the centre. */}
                        <span
                          aria-hidden
                          className={cn(
                            'pointer-events-none absolute inset-x-3.5 bottom-1 h-px origin-center rounded-full',
                            'transition-transform duration-base ease-elegant',
                            item.accent ? 'bg-secondary' : 'bg-primary',
                            isActive(item.href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                          )}
                        />
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            {/* Utility actions — search opens a visual-only overlay; account
                opens a real menu (popover on desktop, drawer on mobile) and
                the cart is live. */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <IconButton
                label="Search"
                icon={<Icon name="search" size={20} />}
                onClick={() => setSearchOpen(true)}
                aria-expanded={searchOpen}
                className="hidden sm:inline-flex"
              />
              <AccountMenu />
              <IconButton
                label={cartCount > 0 ? `Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Cart'}
                icon={<Icon name="cart" size={20} />}
                badgeCount={cartCount}
                onClick={openCart}
              />
            </div>
          </div>
        </Container>
      </header>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} onOpenSearch={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
