import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import type { Product } from '@/types';
import { EmptyState, ErrorState, Icon, IconButton, Reveal, Skeleton } from '@/components/ui';
import { ProductCard } from './ProductCard';

interface ProductCarouselProps {
  products: Product[] | null;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyMessage?: string;
  className?: string;
  priority?: boolean;
}

/**
 * Premium horizontal product carousel with desktop arrows and mobile swipe snap.
 */
export function ProductCarousel({
  products,
  loading,
  error,
  onRetry,
  emptyMessage = 'No products found.',
  className,
  priority = false,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [products]);

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  }

  if (error) return <ErrorState title="We couldn’t load products" onRetry={onRetry} />;

  if (loading) {
    return (
      <div className={cn('flex gap-3.5 sm:gap-5 md:gap-6 overflow-hidden py-2', className)} aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="w-[165px] xs:w-[185px] sm:w-[220px] md:w-[245px] lg:w-[265px] shrink-0">
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
            <Skeleton className="h-3 w-1/3 mt-2.5" />
            <Skeleton className="h-4 w-4/5 mt-1" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return <EmptyState title="No products in this section" description={emptyMessage} />;
  }

  return (
    <div className={cn('relative group/product-carousel', className)}>
      {/* Desktop navigation buttons */}
      <div className="absolute -top-12 right-0 hidden sm:flex items-center gap-1.5 z-10">
        <IconButton
          label="Scroll left"
          icon={<Icon name="chevron-down" size={16} className="rotate-90" />}
          size="sm"
          variant="outline"
          disabled={!canScrollLeft}
          onClick={() => scroll('left')}
          className="rounded-full shadow-2xs disabled:opacity-30 h-8 w-8 hover:bg-cream"
        />
        <IconButton
          label="Scroll right"
          icon={<Icon name="chevron-down" size={16} className="-rotate-90" />}
          size="sm"
          variant="outline"
          disabled={!canScrollRight}
          onClick={() => scroll('right')}
          className="rounded-full shadow-2xs disabled:opacity-30 h-8 w-8 hover:bg-cream"
        />
      </div>

      {/* Horizontally scrolling product row */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3.5 sm:gap-5 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1.5 pb-3 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            className="w-[165px] xs:w-[185px] sm:w-[220px] md:w-[245px] lg:w-[265px] shrink-0 snap-start"
          >
            <Reveal delay={index * 40}>
              <ProductCard product={product} priority={priority && index < 2} />
            </Reveal>
          </div>
        ))}
      </div>
    </div>
  );
}
