import type { Brand } from '@/types';

/**
 * Demonstration brands only.
 * The admin will add real brands manually in a later stage; nothing in the UI
 * assumes these specific slugs exist.
 */
export const mockBrands: Brand[] = [
  {
    id: 'brd-shelina',
    slug: 'shelina',
    name: 'Shelina',
    description: 'Our in-house atelier line.',
    logo: {
      src: '/images/categories/ladies-chappals.jpg',
      alt: 'Shelina in-house line',
      width: 1024,
      height: 1024,
    },
  },
  {
    id: 'brd-shelina-signature',
    slug: 'shelina-signature',
    name: 'Shelina Signature',
    description: 'Limited seasonal editions.',
    logo: {
      src: '/images/categories/ladies-shoes.jpg',
      alt: 'Shelina Signature seasonal editions',
      width: 1024,
      height: 1024,
    },
  },
  {
    id: 'brd-atelier',
    slug: 'atelier-lahore',
    name: 'Atelier Lahore',
    description: 'Traditional handwork, modern finish.',
    logo: {
      src: '/images/categories/gents-chappals.jpg',
      alt: 'Atelier Lahore handcrafted line',
      width: 1024,
      height: 1024,
    },
  },
  {
    id: 'brd-shelina-active',
    slug: 'shelina-active',
    name: 'Shelina Active',
    description: 'Everyday sneakers and casual styles.',
    logo: {
      src: '/images/categories/sneakers.jpg',
      alt: 'Shelina Active sneakers line',
      width: 1024,
      height: 1024,
    },
  },
];
