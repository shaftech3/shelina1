import { useState, useEffect } from 'react';
import { STORE_CONFIG } from '@/lib/constants';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Container } from '@/components/ui';

const ANNOUNCEMENTS = [
  `Cash on Delivery Available Across Pakistan`,
  `Complimentary delivery on orders over ${formatPrice(STORE_CONFIG.freeShippingThreshold)}`,
  `Handcrafted in Pakistan • 100% Genuine Leather`,
  `Bespoke Arch Support & Hand-Stitched Durability`,
];

export function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside aria-label="Store Announcements" className="relative z-50 bg-primary-deep text-white/95 overflow-hidden select-none border-b border-primary/20">
      <Container className="flex h-9 items-center justify-between">
        {/* Left proof point indicator (Desktop only) */}
        <span className="hidden md:inline-flex items-center gap-1.5 text-[0.72rem] tracking-wider uppercase text-white/75 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
          Official Atelier
        </span>

        {/* Center cycling announcement */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
          <p
            key={currentIndex}
            className={cn(
              'text-center text-caption tracking-[0.06em] font-medium leading-none truncate',
              'animate-fade-in transition-all duration-300',
            )}
          >
            {ANNOUNCEMENTS[currentIndex]}
          </p>
        </div>

        {/* Right guarantee indicator (Desktop only) */}
        <span className="hidden md:inline-flex items-center gap-1 text-[0.72rem] tracking-wider uppercase text-white/75 font-medium">
          Easy Returns & Exchanges
        </span>
      </Container>
    </aside>
  );
}
