import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import type { Category } from '@/types';
import { EmptyState, ErrorState, Icon, IconButton, Reveal, Skeleton } from '@/components/ui';
import { SquareCategoryCard } from './DiamondCategoryCard';

interface CategoryShowcaseProps {
  categories: Category[] | null;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
  priority?: boolean;
}

/**
 * Horizontal scrolling square category showcase.
 *
 * Implements compact, premium square category cards with left/right
 * desktop controls and smooth touch-swipe snap on mobile.
 */
export function CategoryShowcase({
  categories,
  loading,
  error,
  onRetry,
  className,
  priority = false,
}: CategoryShowcaseProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function checkScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  function scroll(direction: 'left' | 'right') {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  }

  if (error) return <ErrorState title="We couldn’t load categories" onRetry={onRetry} />;

  if (loading) {
    return (
      <div className={cn('flex gap-2.5 sm:gap-4 overflow-hidden py-2', className)} aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-1.5 shrink-0 w-[82px] xs:w-[96px] sm:w-[110px] md:w-[124px]">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-3.5 w-16 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return <EmptyState title="No categories yet" description="Categories will appear here once published." />;
  }

  return (
    <div className={cn('relative group/carousel', className)}>
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

      {/* Horizontal scrolling square categories container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-start gap-2.5 sm:gap-4 md:gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1 px-0.5 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((category, index) => (
          <div key={category.id} className="shrink-0 snap-start">
            <Reveal delay={index * 40}>
              <SquareCategoryCard category={category} priority={priority && index < 4} />
            </Reveal>
          </div>
        ))}
      </div>
    </div>
  );
}
