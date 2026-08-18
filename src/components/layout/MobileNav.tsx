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
            className="rounded-xs text-caption text-ink-muted transition-colors hover:text-primary-deep"
          >
            {STORE_CONFIG.supportPhone}
          </a>
          <div className="flex items-center gap-1">
            {socialLinks.map((social) => (
              <SocialIcon key={social.platform} {...social} />
            ))}
          </div>
        </div>
      }
    >
      <div id="mobile-navigation" className="flex flex-col gap-6">
        {/* Opens the shared search overlay — single implementation. */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenSearch?.();
          }}
          className={cn(
            'flex w-full items-center gap-3 rounded-md border border-border bg-surface px-4 py-3.5 text-left',
            'text-body-sm text-ink-subtle transition-colors duration-fast ease-elegant',
            'hover:border-border-strong hover:bg-cream focus-visible:outline-none focus-visible:shadow-focus',
          )}
        >
          <Icon name="search" size={18} />
          Search products...
        </button>

        <nav aria-label="Mobile">
          <ul className="flex flex-col">
            {primaryNav.map((item) => {
              const isOpen = expanded === item.label;

              if (!item.children?.length) {
                return (
                  <li key={item.label} className="border-b border-border">
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center justify-between py-3.5 font-display text-h4',
                        'transition-colors duration-fast focus-visible:outline-none',
                        item.accent
                          ? 'text-secondary-deep'
                          : 'text-ink hover:text-primary-deep focus-visible:text-primary-deep',
                      )}
                    >
                      {item.label}
                      <Icon name="chevron-right" size={17} className="text-ink-subtle" />
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.label} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : item.label)}
                    aria-expanded={isOpen}
                    aria-controls={`submenu-${item.label}`}
                    className="flex w-full items-center justify-between py-3.5 text-left font-display text-h4 text-ink transition-colors duration-fast hover:text-primary-deep focus-visible:outline-none focus-visible:text-primary-deep"
                  >
                    {item.label}
                    <Icon
                      name="chevron-down"
                      size={17}
                      className={cn(
                        'text-ink-subtle transition-transform duration-base ease-elegant',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {/* Grid-rows accordion: animates height without measuring JS.
                      Note `hidden` cannot be used here — a display utility would
                      override it — so collapsed content is removed from the tab
                      order with tabIndex/aria instead. */}
                  <div
                    id={`submenu-${item.label}`}
                    className={cn(
                      'grid transition-[grid-template-rows,opacity] duration-base ease-elegant',
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <ul className="flex min-h-0 flex-col gap-0.5 overflow-hidden pl-1">
                      {item.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            to={child.href}
                            onClick={onClose}
                            tabIndex={isOpen ? undefined : -1}
                            aria-hidden={!isOpen}
                            className="block rounded-md px-3 py-2.5 text-body-sm text-ink-muted transition-colors duration-fast hover:bg-cream hover:text-primary-deep focus-visible:outline-none focus-visible:bg-cream"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                      <li aria-hidden className="h-3" />
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-col gap-2.5">
          <ButtonLink href="/shop" fullWidth iconRight={<Icon name="arrow-right" size={18} />} onClick={onClose}>
            Shop the collection
          </ButtonLink>
          {/* Was a dead button. Customer accounts do not exist yet, so this
              routes to the same honest placeholder as the header menu. */}
          <ButtonLink
            href="/account/sign-in"
            variant="outline"
            fullWidth
            iconLeft={<Icon name="user" size={18} />}
            onClick={onClose}
          >
            My account
          </ButtonLink>
        </div>
      </div>
    </Drawer>
  );
}
