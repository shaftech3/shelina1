import type { Banner } from '@/types';

/**
 * Promotional/editorial banners.
 * Keyed by id so pages request a specific banner through bannerService rather
 * than relying on array position.
 */
export const mockBanners: Banner[] = [
  {
    id: 'ban-everyday',
    variant: 'split',
    tone: 'surface',
    eyebrow: 'The Shelina promise',
    heading: 'Every step, your style',
    description:
      'One workshop, one standard. Women’s and men’s styles cut from the same leather and finished by the same hands — so the pair you choose feels considered, whichever aisle it came from.',
    image: {
      src: '/images/banners/banner-everyday.jpg',
      alt: 'Blush slides, tan chappals and white sneakers arranged on cream linen',
      width: 1536,
      height: 864,
    },
    cta: { label: 'Browse all styles', href: '/shop' },
    mediaSide: 'right',
  },
  {
    id: 'ban-craft',
    variant: 'split',
    tone: 'cream',
    eyebrow: 'The Shelina difference',
    heading: 'Ninety-two steps, one pair',
    description:
      'Every Shelina pair passes through the hands of a single artisan — from pattern cutting to the final polish. It is slower. It lasts longer.',
    image: {
      src: '/images/banners/banner-craft.jpg',
      alt: 'Artisan hand-stitching leather footwear at a workbench',
      width: 1536,
      height: 864,
    },
    cta: { label: 'Our craft', href: '/shop' },
    mediaSide: 'left',
  },
];
