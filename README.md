# Shelina — Stage 1

Design foundation, UI system and responsive architecture for the Shelina premium footwear store.

Stage 1 is deliberately **visual + architectural only**. No backend, auth, cart, payments, wishlist,
reviews or AI features exist — those belong to later stages. What is here is the foundation those
stages plug into.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the production build
npm run lint     # oxlint
```

Routes:

| Route          | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `/`            | Home — hero, categories, featured, craft banner, new in   |
| `/style-guide` | Living documentation of tokens + every UI component       |
| `*`            | 404                                                       |

---

## Replacing the logo (owner action)

All brand imagery is referenced from **one place**: `BRAND_ASSETS` in `src/lib/constants.ts`.

```ts
export const BRAND_ASSETS = {
  logoDesktop: '/images/brand/shelina-logo.jpeg',
  logoMobile:  '/images/brand/shelina-logo.jpeg',
  logoFooter:  '/images/brand/shelina-logo.jpeg',
  favicon:     '/images/brand/shelina-logo.jpeg',
};
```

To swap in the final logo, either overwrite the files in `public/images/brand/` or point these
paths elsewhere. The favicon is additionally referenced in `index.html`. No component needs editing —
`<Logo slot="desktop" | "mobile" | "footer" />` reads from this map.

---

## Architecture

```
UI components  →  hooks  →  services  →  data source
```

Components never import mock data. They call hooks (`useProducts`, `useCategories`), which call
services (`productService`, `categoryService`, …), which currently resolve from `src/data/mock/`.

**To connect a real backend in a later stage**, change only the service bodies (and
`src/services/http.ts`). The UI, hooks and types stay untouched.

```
src/
  components/
    ui/          Reusable primitives (Button, Input, Modal, Drawer, Image, …)
    layout/      Header, Footer, Logo, MobileNav, Layout shell
    product/     ProductCard, ProductGrid, ColorSwatches, StockLabel
    category/    CategoryCard, CategoryGrid
    marketing/   Hero, Banner
  pages/         Route-level components
  data/mock/     Mock catalog, content and navigation data
  services/      Data-access seam (swap for REST later)
  hooks/         useAsync, useCatalog, useSeo, useScrollReveal, useFocusTrap, …
  lib/           cn, format, constants
  types/         Domain types (catalog, content, commerce, seo)
  styles/        tokens.css (design tokens) + index.css (base/components/utilities)
```

---

## Design tokens

`src/styles/tokens.css` is the single source of truth; `tailwind.config.js` maps Tailwind onto it.
No component hardcodes a brand colour.

| Token          | Value     | Role                                    |
| -------------- | --------- | --------------------------------------- |
| `primary`      | `#2596BE` | Primary brand identity, fills, CTAs     |
| `secondary`    | `#D29E9E` | Refined accent, sale markers            |
| `cream`        | `#FAFBF6` | Soft neutral replacing harsh dark/black |
| `background`   | `#FFFFFF` | Dominant page background                |

### Accessibility note on the brand colours

`#2596BE` on white measures **3.4:1** and `#D29E9E` on white **2.2:1** — both fail WCAG AA for
small text. Rather than alter the brand colours, two derived tokens carry *small text only*:

- `primary-deep` `#1A6F8C` — 5.7:1
- `secondary-deep` `#9E5B5B` — 4.9:1

The exact brand colours remain in full use for fills, buttons, badges and large display text.
Badges and buttons on a `#D29E9E` fill use ink-coloured labels (7:1) instead of white.

---

## Product variants — no global size/colour lists

Per the brief, **there is no global size dictionary and no global colour dictionary anywhere.**

Each `Product` carries its own freely-authored arrays, exactly as an admin will enter them:

```ts
sizes:  [{ value: '38', available: true }, …]        // free-form strings: "38", "UK 7", "Medium"
colors: [{ name: 'Blush', swatch: '#D8A7A2', available: true }, …]
```

The mock data demonstrates this: one product uses `36–40`, another `UK 6–UK 10`, another `7–11`.
Nothing in the UI derives options from a shared list.

---

## Animation system

- Pure CSS on `transform` and `opacity` only — no animation library.
- Scroll reveals use one `IntersectionObserver` per element, disconnected after firing
  (`useScrollReveal` / `<Reveal delay={…}>`).
- Durations and easings are tokens (`--dur-*`, `--ease-*`).
- **`prefers-reduced-motion: reduce`** collapses every duration to ~0 globally and neutralises
  reveals, so all content is immediately visible. Verified in a reduced-motion browser context.

---

## Verified in Stage 1

- ✅ Type-checks clean (`tsc -b`, strict) and lints with 0 errors
- ✅ Zero console errors at 320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920 px
- ✅ Zero horizontal overflow at every one of those widths
- ✅ Single `<h1>`, no heading-level jumps, all landmarks present
- ✅ Every image has `alt`; every icon button has an accessible name
- ✅ Skip link is the first tab stop; drawer/modal trap focus and close on Escape
- ✅ Collapsed mobile submenu links are removed from the tab order
- ✅ Reduced-motion verified in a real reduced-motion context
- ✅ Bundle: ~86 kB gzipped total, style guide route code-split

---

## Migration to Google AI Studio

Nothing platform-specific is used: standard Vite + React + TypeScript + Tailwind, one `@/*` path
alias declared in both `vite.config.ts` and `tsconfig.app.json`. Copy the folder, run
`npm install`, and it builds. Business logic lives in services/hooks, not in visual components.

## Stage 2 starting points

- Replace `resolveMock(...)` in `src/services/*` with `request(...)` calls
- Build the PDP against `productService.getBySlug` (types already defined)
- Wire cart state and reuse `<Drawer>` for the cart panel
- Add real routes for `/shop`, `/category/:slug`, `/product/:slug`
