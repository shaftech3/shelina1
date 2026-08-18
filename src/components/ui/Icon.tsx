import type { ReactElement, SVGProps } from 'react';

/**
 * Hand-rolled icon set.
 * A full icon package would add weight for the handful of glyphs this site
 * needs, so each icon is a tiny inline stroke path instead.
 */
export type IconName =
  | 'menu'
  | 'close'
  | 'search'
  | 'cart'
  | 'user'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'arrow-right'
  | 'check'
  | 'alert'
  | 'info'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'truck'
  | 'refresh'
  | 'shield'
  | 'sparkle'
  | 'image'
  // Admin panel glyphs (Stage 4).
  | 'plus'
  | 'minus'
  | 'trash'
  | 'edit'
  | 'grid'
  | 'tag'
  | 'layers'
  | 'home'
  | 'settings'
  | 'logout'
  | 'upload'
  | 'external'
  | 'drag'
  | 'eye'
  // Order glyphs (Stage 6).
  | 'download'
  | 'receipt';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, ReactElement> = {
  menu: <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />,
  close: <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.25" />
      <path d="M15.6 15.6L20.5 20.5" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4.5h2.2l2.1 10.4a1.6 1.6 0 001.57 1.3h7.9a1.6 1.6 0 001.56-1.24L20 8H6.2" />
      <circle cx="9.6" cy="19.6" r="1.3" />
      <circle cx="16.9" cy="19.6" r="1.3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M4.8 20a7.4 7.4 0 0114.4 0" />
    </>
  ),
  'chevron-down': <path d="M6 9.5l6 5.5 6-5.5" />,
  'chevron-right': <path d="M9.5 5.5l6.2 6.5-6.2 6.5" />,
  'chevron-left': <path d="M14.5 5.5L8.3 12l6.2 6.5" />,
  'arrow-right': <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  check: <path d="M5 12.8l4.3 4.2L19 7.4" />,
  alert: (
    <>
      <path d="M12 8.2v5" />
      <path d="M12 16.4h.01" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.2M12 7.8h.01" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M16.8 7.3h.01" />
    </>
  ),
  facebook: <path d="M14.8 8.4h2V5.2h-2.4c-2.1 0-3.4 1.4-3.4 3.5v2.1H8.6v3.1H11v7h3.2v-7h2.4l.5-3.1h-2.9V9.3c0-.6.3-.9.6-.9z" />,
  tiktok: <path d="M14.2 3.5v10.9a3.1 3.1 0 11-3.1-3.1c.3 0 .6 0 .9.1M14.2 3.5c.3 2.3 2 4 4.3 4.2" />,
  youtube: (
    <>
      <rect x="2.8" y="5.6" width="18.4" height="12.8" rx="4" />
      <path d="M10.4 9.6l4.8 2.4-4.8 2.4z" />
    </>
  ),
  truck: (
    <>
      <path d="M2.8 6.5h10.4v9.2H2.8zM13.2 9.6h3.6l3 3.1v3H13.2z" />
      <circle cx="7" cy="17.6" r="1.6" />
      <circle cx="17" cy="17.6" r="1.6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 11-2.4-5.7" />
      <path d="M20.2 4.4v4.2H16" />
    </>
  ),
  shield: <path d="M12 3.2l7 2.6v5.4c0 4.2-2.9 7.6-7 9.6-4.1-2-7-5.4-7-9.6V5.8z" />,
  sparkle: <path d="M12 3.4l1.9 5.3 5.3 1.9-5.3 1.9L12 17.8l-1.9-5.3-5.3-1.9 5.3-1.9zM18.6 16.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />,
  image: (
    <>
      <rect x="3.2" y="4.8" width="17.6" height="14.4" rx="2.6" />
      <circle cx="8.6" cy="10" r="1.5" />
      <path d="M4.4 17.2l4.6-4.4 3.5 3.2 2.8-2.4 4.4 3.9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 6.6h16M9.4 6.6V4.8h5.2v1.8" />
      <path d="M6.2 6.6l.9 12.1a1.6 1.6 0 001.6 1.5h6.6a1.6 1.6 0 001.6-1.5l.9-12.1" />
      <path d="M10.2 10.4v6M13.8 10.4v6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.2L19.4 8.8a2 2 0 000-2.8l-1.4-1.4a2 2 0 00-2.8 0L4 15.8z" />
      <path d="M14.6 6.2l3.2 3.2" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.6" height="6.6" rx="1.6" />
      <rect x="13.4" y="4" width="6.6" height="6.6" rx="1.6" />
      <rect x="4" y="13.4" width="6.6" height="6.6" rx="1.6" />
      <rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.6" />
    </>
  ),
  tag: (
    <>
      <path d="M11 3.6H4.6a1 1 0 00-1 1V11a2 2 0 00.6 1.4l7.6 7.6a1.6 1.6 0 002.3 0l6-6a1.6 1.6 0 000-2.3L12.4 4.2A2 2 0 0011 3.6z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.4L3.2 8l8.8 4.6L20.8 8z" />
      <path d="M3.2 12.4L12 17l8.8-4.6" />
      <path d="M3.2 16.6L12 21.2l8.8-4.6" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.4L12 4l8 6.4V19a1.6 1.6 0 01-1.6 1.6H5.6A1.6 1.6 0 014 19z" />
      <path d="M9.6 20.6v-6.2h4.8v6.2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.2 14.4a1.5 1.5 0 00.3 1.65l.06.06a1.8 1.8 0 11-2.55 2.55l-.06-.06a1.5 1.5 0 00-1.65-.3 1.5 1.5 0 00-.9 1.37v.18a1.8 1.8 0 11-3.6 0v-.1a1.5 1.5 0 00-.98-1.37 1.5 1.5 0 00-1.65.3l-.06.06a1.8 1.8 0 11-2.55-2.55l.06-.06a1.5 1.5 0 00.3-1.65 1.5 1.5 0 00-1.37-.9h-.18a1.8 1.8 0 110-3.6h.1a1.5 1.5 0 001.37-.98 1.5 1.5 0 00-.3-1.65l-.06-.06a1.8 1.8 0 112.55-2.55l.06.06a1.5 1.5 0 001.65.3h.07a1.5 1.5 0 00.9-1.37v-.18a1.8 1.8 0 113.6 0v.1a1.5 1.5 0 00.9 1.37 1.5 1.5 0 001.65-.3l.06-.06a1.8 1.8 0 112.55 2.55l-.06.06a1.5 1.5 0 00-.3 1.65v.07a1.5 1.5 0 001.37.9h.18a1.8 1.8 0 110 3.6h-.1a1.5 1.5 0 00-1.37.9z" />
    </>
  ),
  logout: (
    <>
      <path d="M9.4 20H5.6A1.6 1.6 0 014 18.4V5.6A1.6 1.6 0 015.6 4h3.8" />
      <path d="M15.4 16.4l4.4-4.4-4.4-4.4M19.2 12H9.4" />
    </>
  ),
  upload: (
    <>
      <path d="M4 15.6v2.8A1.6 1.6 0 005.6 20h12.8a1.6 1.6 0 001.6-1.6v-2.8" />
      <path d="M8 8.4L12 4.4l4 4M12 4.4v11" />
    </>
  ),
  // Mirror of `upload` — the arrow points into the tray.
  download: (
    <>
      <path d="M4 15.6v2.8A1.6 1.6 0 005.6 20h12.8a1.6 1.6 0 001.6-1.6v-2.8" />
      <path d="M8 11.2l4 4 4-4M12 15.2V4.2" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.6h12v16.8l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 18.8z" />
      <path d="M9.2 8.4h5.6M9.2 12h5.6" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.6h5.4V10" />
      <path d="M19.4 4.6L11.6 12.4" />
      <path d="M18 13.4v5a1.6 1.6 0 01-1.6 1.6H5.6A1.6 1.6 0 014 18.4V7.6A1.6 1.6 0 015.6 6h5" />
    </>
  ),
  drag: (
    <>
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
};

const FILLED: IconName[] = ['facebook', 'shield', 'sparkle', 'drag'];

export function Icon({ name, size = 20, ...rest }: IconProps) {
  const filled = FILLED.includes(name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
