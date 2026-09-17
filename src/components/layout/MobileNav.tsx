import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { STORE_CONFIG } from '@/lib/constants';
import { primaryNav, socialLinks } from '@/data/mock/navigation';
import { ButtonLink, Drawer, Icon } from '@/components/ui';
import { SocialIcon } from './SocialIcon';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  /** Hands off to the shared SearchOverlay rather than duplicating it. */
  onOpenSearch?: () => void;
}

/** Mobile navigation drawer with accessible accordion sub-menus. */
export function MobileNav({ open, onClose, onOpenSearch }: MobileNavProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      title="Menu"
      footer={
        <div className="flex items-center justify-between gap-4">
          <a
            href={`tel:${STORE_CONFIG.supportPhone.replace(/\s/g, '')}`}
            className="rounded-xs text-body-sm font-medium tracking-wide text-ink-muted transition-colors hover:text-ink"
          >
            {STORE_CONFIG.supportPhone}
          </a>
          <div className="flex items-center gap-1.5 opacity-80">
            {socialLinks.map((social) => (
              <SocialIcon key={social.platform} {...social} />
            ))}
          </div>
        </div>
      }
    >
      <div id="mobile-navigation" className="flex flex-col gap-8">
        {/* Opens the shared search overlay — single implementation. */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenSearch?.();
          }}
          className={cn(
            'flex w-full items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3.5 text-left',
            'text-body-sm text-ink-subtle transition-all duration-300 ease-elegant',
            'hover:border-border-strong hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <Icon name="search" size={19} className="opacity-70" />
          <span className="tracking-wide">Search collection...</span>
        </button>

        <nav aria-label="Mobile">
          <ul className="flex flex-col">
            {primaryNav.map((item) => {
              const isOpen = expanded === item.label;

              if (!item.children?.length) {
                return (
                  <li key={item.label} className="border-b border-border/50 last:border-0">
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-center justify-between py-4 sm:py-5 font-display text-[2rem] sm:text-[2.25rem] leading-none tracking-tight',
                        'transition-all duration-300 focus-visible:outline-none',
                        item.accent
                          ? 'text-secondary-deep'
                          : 'text-ink/90 hover:text-ink hover:translate-x-1 focus-visible:text-ink',
                      )}
                    >
                      {item.label}
                      <Icon name="chevron-right" size={20} className="text-ink-muted/60 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.label} className="border-b border-border/40 last:border-0">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : item.label)}
                    aria-expanded={isOpen}
                    aria-controls={`submenu-${item.label}`}
                    className="flex w-full items-center justify-between py-4 sm:py-5 text-left font-display text-[2rem] sm:text-[2.25rem] leading-none tracking-tight text-ink/90 transition-all duration-300 hover:text-ink focus-visible:outline-none focus-visible:text-ink"
                  >
                    <span className={cn("transition-transform duration-300", isOpen && "translate-x-1")}>{item.label}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream/50 transition-colors">
                      <Icon
                        name="chevron-down"
                        size={18}
                        className={cn(
                          'text-ink-muted transition-transform duration-300 ease-elegant',
                          isOpen && '-rotate-180 text-ink',
                        )}
                      />
                    </span>
                  </button>
                  <div
                    id={`submenu-${item.label}`}
                    className={cn(
                      'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-elegant',
                      isOpen ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0 mb-0',
                    )}
                  >
                    <ul className="flex min-h-0 flex-col gap-1 overflow-hidden pl-5 border-l-[1.5px] border-border/40 ml-2 mt-1">
                      {item.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            to={child.href}
                            onClick={onClose}
                            tabIndex={isOpen ? undefined : -1}
                            aria-hidden={!isOpen}
                            className="block rounded-md px-3 py-3 text-[1.05rem] font-sans tracking-wide text-ink-muted transition-all duration-300 hover:bg-cream hover:text-ink hover:translate-x-1 focus-visible:outline-none focus-visible:bg-cream"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-col gap-3 mt-4">
          <ButtonLink href="/shop" size="lg" fullWidth iconRight={<Icon name="arrow-right" size={18} />} onClick={onClose} className="font-medium tracking-wide">
            Shop the collection
          </ButtonLink>
          <ButtonLink
            href="/account/sign-in"
            variant="outline"
            size="lg"
            fullWidth
            iconLeft={<Icon name="user" size={18} />}
            onClick={onClose}
            className="font-medium tracking-wide border-border/80 hover:border-ink"
          >
            My account
          </ButtonLink>
        </div>
      </div>
    </Drawer>
  );
}
