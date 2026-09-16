import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useFocusTrap, useLockBodyScroll } from '@/hooks';
import { Container, Icon, IconButton, Input, SmartLink, Spinner, Image } from '@/components/ui';
import { productService } from '@/services';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/format';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [mounted, setMounted] = useState(open);
  const containerRef = useFocusTrap<HTMLDivElement>(open, onClose);
  useLockBodyScroll(open);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<number>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setQuery('');
      setResults([]);
      setHasSearched(false);
      // autofocus delay to allow animation
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      productService
        .list({ search: query.trim(), limit: 5 })
        .then((data) => {
          setResults(data);
          setHasSearched(true);
        })
        .catch(() => {
          setResults([]);
          setHasSearched(true);
        })
        .finally(() => setLoading(false));
    }, 400);

    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[105]" role="dialog" aria-modal="true" aria-label="Search">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className={cn(
          'absolute inset-0 h-full w-full cursor-default bg-ink/35 backdrop-blur-[2px]',
          'transition-opacity duration-base ease-elegant',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        ref={containerRef}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 top-0 border-b border-border bg-surface shadow-lg outline-none max-h-[85vh] overflow-y-auto',
          'transition-transform duration-base ease-elegant motion-reduce:transition-none',
          open ? 'translate-y-0' : '-translate-y-full',
        )}
      >
        <Container>
          <div className="flex flex-col gap-5 py-6 sm:py-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-h4 text-ink">Search</h2>
              <IconButton label="Close search" icon={<Icon name="close" size={20} />} onClick={onClose} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) {
                  navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
                  onClose();
                }
              }}
              className="relative"
            >
              <Input
                ref={inputRef}
                type="search"
                placeholder="Search products..."
                aria-label="Search products"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                iconLeft={<Icon name="search" size={19} />}
                className="h-14 bg-cream/50 focus:bg-surface transition-colors text-body"
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-subtle">
                  <Spinner size={20} />
                </div>
              )}
            </form>

            {!query.trim() && !hasSearched ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-caption uppercase tracking-[0.14em] text-ink-subtle">
                  Popular categories
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Ladies chappals', href: '/category/ladies-chappals' },
                    { label: 'Gents shoes', href: '/category/gents-shoes' },
                    { label: 'Sneakers', href: '/category/sneakers' },
                    { label: 'New arrivals', href: '/new-arrivals' },
                  ].map((item) => (
                    <SmartLink
                      key={item.label}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'inline-flex items-center rounded-full border border-border bg-surface px-3.5 py-2',
                        'text-caption font-medium text-ink-muted transition-colors duration-fast ease-elegant',
                        'hover:border-primary/50 hover:text-primary-deep',
                        'focus-visible:outline-none focus-visible:shadow-focus',
                      )}
                    >
                      {item.label}
                    </SmartLink>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                <span className="text-caption uppercase tracking-[0.14em] text-ink-subtle">
                  {loading ? 'Searching...' : 'Products'}
                </span>
                
                {hasSearched && !loading && results.length === 0 && (
                  <p className="text-body-sm text-ink-muted py-4 text-center">
                    No products found matching "{query}".
                  </p>
                )}

                {results.length > 0 && (
                  <ul className="flex flex-col gap-4">
                    {results.map((product) => (
                      <li key={product.id}>
                        <Link
                          to={`/product/${product.slug}`}
                          onClick={onClose}
                          className="group flex items-center gap-4 rounded-md p-2 -mx-2 transition-colors hover:bg-cream focus-visible:bg-cream focus-visible:outline-none"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xs border border-border bg-surface">
                            {product.media[0]?.url ? (
                              <Image
                                src={product.media[0].url}
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="64px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-cream text-ink-subtle">
                                <Icon name="image" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col">
                            <h3 className="font-serif text-body font-medium text-ink line-clamp-1">{product.name}</h3>
                            <div className="mt-1 flex items-center gap-2 text-body-sm">
                              {product.salePrice && product.salePrice < product.price ? (
                                <>
                                  <span className="font-medium text-secondary-deep">{formatPrice(product.salePrice)}</span>
                                  <span className="text-ink-subtle line-through decoration-ink-subtle/40">{formatPrice(product.price)}</span>
                                </>
                              ) : (
                                <span className="font-medium text-ink-muted">{formatPrice(product.price)}</span>
                              )}
                            </div>
                          </div>
                          <Icon name="arrow-right" size={18} className="text-ink-subtle opacity-0 transition-all group-hover:opacity-100 group-hover:-translate-x-1" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                
                {results.length > 0 && (
                  <Link
                    to={`/shop?q=${encodeURIComponent(query.trim())}`}
                    onClick={onClose}
                    className="mt-2 text-center text-body-sm font-medium text-primary-deep hover:underline"
                  >
                    View all results for "{query}"
                  </Link>
                )}
              </div>
            )}
          </div>
        </Container>
      </div>
    </div>,
    document.body,
  );
}
