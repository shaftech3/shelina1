import { useState } from 'react';
import { cn } from '@/lib/cn';
import { OFFICIAL_WHATSAPP_NUMBER } from '@/lib/constants';
import { buildInquiryWhatsAppUrl } from '@/lib/whatsapp';
import { Icon } from './Icon';

interface FloatingWhatsAppProps {
  className?: string;
  inquiryText?: string;
}

/**
 * Global Floating WhatsApp Action Button.
 *
 * Appears across all customer-facing storefront pages with:
 * - Fixed bottom-right positioning with safe-area insets (mobile & desktop)
 * - Touch-optimized compact mobile sizing (48px) and luxury desktop sizing (56px)
 * - High z-index (z-[90]) to remain visible above all content and footers without obscuring modals
 * - Subtle breathing halo / pulse ring
 * - Desktop hover tooltip
 * - Direct official WhatsApp inquiry link
 */
export function FloatingWhatsApp({ className, inquiryText }: FloatingWhatsAppProps) {
  const [hovered, setHovered] = useState(false);
  const href = inquiryText
    ? buildInquiryWhatsAppUrl(inquiryText)
    : `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        'Hello Shelina, I have an inquiry regarding your footwear collection.',
      )}`;

  return (
    <div
      id="floating-whatsapp-container"
      className={cn(
        'fixed floating-whatsapp-pos z-[90]',
        'flex items-center gap-2.5 pointer-events-auto select-none',
        className,
      )}
    >
      {/* Desktop hover badge / tooltip */}
      <span
        aria-hidden
        className={cn(
          'hidden sm:inline-flex items-center rounded-full bg-ink/90 px-3.5 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-xs select-none',
          'transition-all duration-300 pointer-events-none',
          hovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2',
        )}
      >
        Chat on WhatsApp
      </span>

      {/* Floating Action Button */}
      <a
        id="floating-whatsapp-btn"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label="Chat with Shelina on WhatsApp"
        className={cn(
          'group relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full',
          'bg-gradient-to-tr from-[#128C7E] to-[#25D366] text-white',
          'shadow-[0_4px_18px_rgba(37,211,102,0.42)] hover:shadow-[0_6px_26px_rgba(37,211,102,0.58)]',
          'transition-all duration-300 ease-out hover:scale-105 sm:hover:scale-108 active:scale-95 touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#25D366] focus-visible:ring-offset-2',
        )}
      >
        {/* Subtle breathing glow ring (respects prefers-reduced-motion) */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 motion-safe:animate-ping duration-1000 -z-10 pointer-events-none"
        />

        {/* WhatsApp Icon - Responsive sizing */}
        <Icon
          name="whatsapp"
          size={24}
          className="sm:hidden text-white drop-shadow-xs transition-transform duration-300"
        />
        <Icon
          name="whatsapp"
          size={28}
          className="hidden sm:block text-white drop-shadow-xs transition-transform duration-300 group-hover:scale-110"
        />

        {/* Active green status dot */}
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 flex h-3 w-3 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-full bg-white ring-2 ring-white"
        >
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#25D366]" />
        </span>
      </a>
    </div>
  );
}
