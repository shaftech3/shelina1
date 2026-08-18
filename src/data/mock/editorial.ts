import type { EditorialFeature, TrustValue } from '@/types';

/**
 * Editorial story block. Demonstration copy only — the owner will replace this
 * through the admin panel in a later stage.
 */
export const mockEditorial: EditorialFeature = {
  id: 'edt-everyday',
  eyebrow: 'The everyday edit',
  heading: 'Find your everyday pair',
  description:
    'The pair you reach for without thinking. Softened leather, a footbed that holds its shape, and a silhouette that works from morning errands to evening plans.',
  image: {
    src: '/images/editorial/editorial-everyday.jpg',
    alt: 'A woman walking in blush leather slide sandals on a warm stone floor',
    width: 1536,
    height: 1024,
  },
  cta: { label: 'Explore the edit', href: '/shop' },
  align: 'left',
};

/**
 * Trust values.
 *
 * Deliberately non-committal wording: no invented guarantees, certifications,
 * return windows or delivery promises. The owner supplies real policy copy later.
 */
export const mockTrustValues: TrustValue[] = [
  {
    id: 'trv-quality',
    icon: 'shield',
    title: 'Quality footwear',
    description: 'Materials and finishing chosen for how a pair wears over time.',
  },
  {
    id: 'trv-ordering',
    icon: 'sparkle',
    title: 'Easy ordering',
    description: 'A short, clear path from choosing your pair to placing an order.',
  },
  {
    id: 'trv-delivery',
    icon: 'truck',
    title: 'Reliable delivery',
    description: 'Orders dispatched and tracked, with delivery details shared at checkout.',
  },
  {
    id: 'trv-support',
    icon: 'info',
    title: 'Customer support',
    description: 'A real person to help with sizing, orders and anything in between.',
  },
];
