import type { NavLink } from '@/types';

/**
 * Storefront navigation.
 *
 * Every href here resolves to a route that genuinely exists. The
 * "coming soon" placeholder pages were removed during the production cleanup,
 * so nothing in the navigation points at a stub.
 */
export const primaryNav: NavLink[] = [
  { label: 'Shop', href: '/shop' },
  {
    // No standalone index page: this is a dropdown trigger whose children are
    // the real /category/:slug routes. `href` points at /shop so the link is
    // never dead for keyboard or no-JS users.
    label: 'Categories',
    href: '/shop',
    children: [
      { label: 'Ladies Chappals', href: '/category/ladies-chappals', description: 'Everyday leather slides' },
      { label: 'Ladies Shoes', href: '/category/ladies-shoes', description: 'Heels, flats and formals' },
      { label: 'Gents Chappals', href: '/category/gents-chappals', description: 'Handcrafted comfort' },
      { label: 'Gents Shoes', href: '/category/gents-shoes', description: 'Refined formals' },
      { label: 'Sneakers', href: '/category/sneakers', description: 'Clean everyday lines' },
    ],
  },
  { label: 'Brands', href: '/shop' },
  { label: 'New Arrivals', href: '/new-arrivals' },
  { label: 'Sale', href: '/sale', accent: true },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', href: '/shop' },
      { label: 'New arrivals', href: '/new-arrivals' },
      { label: 'Sale', href: '/sale' },
      { label: 'Brands', href: '/shop' },
    ],
  },
  {
    title: 'Categories',
    links: [
      { label: 'Ladies chappals', href: '/category/ladies-chappals' },
      { label: 'Ladies shoes', href: '/category/ladies-shoes' },
      { label: 'Gents chappals', href: '/category/gents-chappals' },
      { label: 'Gents shoes', href: '/category/gents-shoes' },
      { label: 'Sneakers', href: '/category/sneakers' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My account', href: '/account' },
      { label: 'My orders', href: '/account/orders' },
      { label: 'Sign in', href: '/account/sign-in' },
      { label: 'Create account', href: '/account/register' },
    ],
  },
];

/**
 * Empty by design. Privacy and Terms pages do not exist yet, and inventing
 * legal content is out of scope — the footer simply omits the row until real
 * documents are written. Add entries here and the footer renders them.
 */
export const legalNav: NavLink[] = [];

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok';

export const socialLinks: { platform: SocialPlatform; label: string; href: string }[] = [
  {
    platform: 'facebook',
    label: 'Shelina on Facebook',
    href: 'https://www.facebook.com/profile.php?id=1279055035285704&hr=1&wtsid=rdr_0e2rvnTyHIvAjOqZm',
  },
  {
    platform: 'instagram',
    label: 'Shelina on Instagram',
    href: 'https://www.instagram.com/shelina_offical',
  },
  {
    platform: 'tiktok',
    label: 'Shelina on TikTok',
    href: 'https://www.tiktok.com/@shelinacollection',
  },
];
