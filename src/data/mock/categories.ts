import type { Category } from '@/types';

/**
 * Demonstration categories only. The real category tree will be admin-managed;
 * nothing in the UI assumes these specific slugs exist.
 */
export const mockCategories: Category[] = [
  {
    id: 'cat-new-arrivals',
    slug: 'new-arrivals',
    name: 'New Arrivals',
    description: 'The latest additions to the collection.',
    image: { src: '/images/categories/new-arrivals.jpg', alt: 'New season leather footwear assortment', width: 1024, height: 1024 },
    group: 'Featured',
    productCount: 12,
    featured: true,
  },
  {
    id: 'cat-ladies-chappals',
    slug: 'ladies-chappals',
    name: 'Ladies Chappals',
    description: 'Everyday elegance in soft leather.',
    image: { src: '/images/categories/ladies-chappals.jpg', alt: 'Blush leather ladies chappals', width: 1024, height: 1024 },
    group: 'Women',
    productCount: 42,
    featured: true,
  },
  {
    id: 'cat-ladies-shoes',
    slug: 'ladies-shoes',
    name: 'Ladies Shoes',
    description: 'Heels, flats and formal silhouettes.',
    image: { src: '/images/categories/ladies-shoes.jpg', alt: 'Dusty rose ladies court shoes', width: 1024, height: 1024 },
    group: 'Women',
    productCount: 36,
    featured: true,
  },
  {
    id: 'cat-gents-chappals',
    slug: 'gents-chappals',
    name: 'Gents Chappals',
    description: 'Handcrafted comfort, built to last.',
    image: { src: '/images/categories/gents-chappals.jpg', alt: 'Tan leather gents chappals', width: 1024, height: 1024 },
    group: 'Men',
    productCount: 28,
    featured: true,
  },
  {
    id: 'cat-gents-shoes',
    slug: 'gents-shoes',
    name: 'Gents Shoes',
    description: 'Refined formals for every occasion.',
    image: { src: '/images/categories/gents-shoes.jpg', alt: 'Brown leather gents formal shoes', width: 1024, height: 1024 },
    group: 'Men',
    productCount: 31,
    featured: true,
  },
  {
    id: 'cat-sneakers',
    slug: 'sneakers',
    name: 'Sneakers',
    description: 'Clean lines, all-day cushioning.',
    image: { src: '/images/categories/sneakers.jpg', alt: 'Minimal white sneakers', width: 1024, height: 1024 },
    group: 'Unisex',
    productCount: 24,
    featured: true,
  },
  {
    id: 'cat-casual',
    slug: 'casual',
    name: 'Casual',
    description: 'Relaxed styles for the weekend.',
    image: { src: '/images/categories/ladies-chappals.jpg', alt: 'Casual footwear selection', width: 1024, height: 1024 },
    group: 'Unisex',
    productCount: 19,
  },
];
