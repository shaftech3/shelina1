import type { HeroSlide } from '@/types';

export const mockHeroSlides: HeroSlide[] = [
  {
    id: 'hero-01',
    eyebrow: 'Autumn Edit 2026',
    heading: 'Step into your style',
    subheading:
      'Leather chappals, shoes and sneakers, finished by hand in Pakistan — built for the pace of your day.',
    image: {
      src: '/images/hero/hero-main.jpg',
      alt: 'Blush leather slide sandals styled on an ivory studio surface',
      width: 1536,
      height: 1024,
    },
    primaryCta: { label: 'Shop the collection', href: '/shop' },
    secondaryCta: { label: 'Explore categories', href: '/shop' },
    badge: 'New season',
    overlayOpacity: 0.34,
    align: 'left',
    highlights: ['Hand-finished leather', 'Women & men', 'Delivered nationwide'],
  },
];
