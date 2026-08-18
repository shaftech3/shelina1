# Stage 2 — Completion Checklist

Premium customer-facing storefront built on the Stage 1 foundation.
Every item below was verified in a real headless browser (Chromium via Playwright)
against the **production build** served by `vite preview`, not against the dev server.

---

## 1. Scope

| | |
|---|---|
| Stage 1 rebuilt? | **No.** Architecture, tokens, UI library, services, hooks and layout system were reused as-is. |
| New Stage 2 surface | Homepage (10 sections), search overlay, page transitions, placeholder routes, rewritten header/footer/mobile nav. |
| Out-of-scope work started? | **None.** No backend, auth, cart logic, checkout, payments, AI, wishlist, reviews or analytics. |

---

## 2. Homepage section order

Delivered in the required order, each with a distinct composition:

1. **Header** — sticky, transparent over hero, solid on scroll
2. **Hero** — full-bleed image, staggered entrance (eyebrow → heading → description → CTA → image)
3. **Featured categories** — one large feature card + four supporting cards
4. **Promotional / editorial banner** — reversed media side
5. **Featured products** — 4-up grid, centred header, "Shop all"
6. **New arrivals** — visually distinct from Featured (different header alignment + tone)
7. **Promotional section** — second banner, opposite composition
8. **Brand showcase** — four lines from the brand service
9. **Editorial / fashion section** — full-bleed imagery, editorial type
10. **Trust section** — simple icons, generic copy
11. **Newsletter** — visual-only success state
12. **Footer** — Shop / Categories / Customer / Brand / Social / legal

Rhythm: surface → cream → banner → surface → banner (reversed) → surface → full-bleed → cream → newsletter band.
No endless scroll; every section carries different weight.

---

## 3. Architecture & data integrity

- [x] **No mock data imported into pages.** Verified by grep — `src/pages/` contains zero `@/data/mock` imports.
- [x] All catalog/content reaches the UI through the service layer via hooks (`useProducts`, `useCategories`, `useHeroSlides`, `useBanner`, `useBrands`, `useEditorial`, `useTrustValues`).
- [x] Categories, brands, banners, hero and editorial content are all mock-data driven — nothing hardcoded as a permanent system.
- [x] Image URLs centralized in mock data; none scattered through JSX.
- [x] Logo consumed only through `BRAND_ASSETS`; swapping the real file touches one constant (plus the favicon path in `index.html`). No logo was generated.
- [x] No global size/colour dictionary — sizes and colours remain per-product.
- [x] Barrels added: `components/marketing/index.ts`; `SearchOverlay` / `PageTransition` / `RouteFallback` exported from `components/layout/index.ts`.
- [x] Dead code removed: `CategoryGrid.tsx` (superseded by `CategoryShowcase`, zero references).
- [x] No new dependencies installed in Stage 2. No animation or icon library added.

---

## 4. Build, lint, types

| Check | Result |
|---|---|
| `npx tsc -b` | clean, exit 0 |
| `npm run lint` (oxlint, 100 files / 104 rules) | **0 errors**, 2 known Fast-Refresh warnings (`Toast.tsx` `useToast`, `Field.tsx` `controlClasses`) |
| `npm run build` | passes, ~1.0s |

Bundle: `index` 92.13 kB (24.37 gz) · `react` 211.09 kB (67.20 gz) · `StyleGuidePage` 8.44 kB (2.66 gz) · CSS ~53 kB (~9 gz).
Stage 1 baseline was 73.01/20.22 — the whole Stage 2 storefront costs ~19 kB raw / ~4 kB gzipped.

---

## 5. Routes

All nine routes render with exactly one `<h1>` and a correct `— Shelina` title:

| Route | H1 | Title |
|---|---|---|
| `/` | Step into your style | Shelina — Footwear... |
| `/shop` | Shop all | Shop all — Shelina |
| `/categories` | All categories | All categories — Shelina |
| `/brands` | Brands | Brands — Shelina |
| `/new-arrivals` | New arrivals | New arrivals — Shelina |
| `/sale` | Sale | Sale — Shelina |
| `/category/:slug` | Category | Category — Shelina |
| `/product/:slug` | Product | Product — Shelina |
| `/definitely-missing` | This page has stepped out | Page not found — Shelina |

Placeholders are lightweight `ComingSoonPage` renders marked `noIndex` — no fake functionality. Full listing behaviour is deliberately left to Stage 3.

---

## 6. Navigation, search, mobile drawer

- [x] Desktop nav: Home, Shop, Categories, Brands, New Arrivals, Sale.
- [x] Search / cart / account are **visual placeholders only**.
- [x] Search overlay opens, moves focus inside, and closes on Escape.
- [x] Mobile drawer locks body scroll (`overflow: hidden`), closes on Escape, and **restores scroll on close** — verified the inline style returns to empty and the page scrolls again afterwards.
- [x] Collapsed submenu links are out of tab order `[-1,-1,-1,-1,-1]`; expanded `[0,0,0,0,0]`.
- [x] Internal navigation is client-side throughout — no reload, `scrollY` resets to 0. No `window.location` navigation anywhere.

---

## 7. Responsive — 10 viewports

320 · 360 · 375 · 390 · 414 · 768 · 1024 · 1280 · 1440 · 1920

- [x] **No horizontal overflow at any width.**
- [x] Product grid: 2-up on mobile, 2–3 tablet, 4 desktop; fixed aspect ratios.
- [x] **No card taller than its siblings** — equal-height contract enforced by reserved line boxes (brand eyebrow `min-h-[1.45em]`, title `min-h-[2.75em]`).
- [x] Mobile hero is not over-tall and does not clip the subject: image `h-[34vh] min-h-[220px]` → `sm:h-[44vh]` → `lg:h-full`, with the crop shifted to `[object-position:70%_50%]` on mobile because the sandals sit right-of-centre in the source photo. Hero CTA now lands at **634–662px** on a 800px-tall phone viewport (was 714–742px), so both CTAs sit above the fold.

---

## 8. Accessibility

```
h1Count: 1        headingJumps: []      imgsMissingAlt: 0
btnsNoName: 0     linksNoName: 0        emptyHrefs: 0
```

- [x] First tab stop is "Skip to content".
- [x] No hover-only content — the category CTA reveal is `aria-hidden` and duplicates the card link, which is always reachable.
- [x] `prefers-reduced-motion`: all 33 reveals render visible, animations collapse to 0.001s.
- [x] **Colour contrast: zero failures.** Every text node on `/`, `/shop`, `/brands`, `/new-arrivals` and `/style-guide` was measured against its computed background; text over imagery was pixel-sampled separately.

Contrast defects found and fixed this pass — all were **token-level**, so the fixes apply everywhere:

| Issue | Before | After |
|---|---|---|
| `--c-text-subtle` on caption text (12.8px) | 3.07:1 | **4.56:1** (cream) / 4.74:1 (white) |
| `--c-warning` ("Low stock") | 2.78:1 | **4.53:1** |
| `--c-success` ("In stock") | 4.07:1 | **4.51:1** |
| Primary button label (white on `#2596BE`) | 3.40:1 | **5.68:1** (`primary-deep` fill) |
| Outline button label | 3.40:1 | **5.68:1** |
| Newsletter body on blue | 2.41:1 | **5.68:1** |
| `Banner` `primary` tone, `Badge`, header bar, skip link, cart count | 3.40:1 | **5.68:1** |
| Required-field `*` marker | 2.30:1 | **4.92:1** |
| Small category card titles over pale photos | 3.64:1 | **4.72:1** worst (deeper scrim) |

Brand hues are unchanged — these use the existing `-deep` variants and slightly darkened status tokens, exactly the Stage 1 contrast policy (dominant fills keep the bright brand colour; small text uses the deep variant).

---

## 9. Performance

- [x] **3 eager images, 23 lazy.** Eager loading is opt-in via a `priority` prop on `ProductGrid` / `CategoryGrid` / `CategoryShowcase`, so only above-the-fold media loads immediately (down from 10 eager).
- [x] Fixed aspect-ratio containers on every image — no layout shift.
- [x] Responsive `sizes` on all grid and hero imagery.
- [x] Controlled DOM: 33 reveal nodes on the homepage.

---

## 10. Motion

- [x] Section, image and text reveals with staggered cards (delays ≤ ~240ms).
- [x] Hero entrance sequence: eyebrow → heading → description → CTA → image.
- [x] Page transitions are **enter-only** fade-up keyed on pathname — navigation is never delayed by an exit animation.
- [x] No video backgrounds, no 3D, no parallax beyond subtle image scale.
- [x] Everything motion is `motion-safe:` gated.

---

## 11. Console

- [x] **No console errors and no page errors** on any route, at any viewport, across the full audit.

---

## Notes for whoever picks this up

- Run audits against `vite preview` (port 4173), **not** the dev server — multi-page Playwright runs exhaust the dev server's unbundled module requests (`ERR_INSUFFICIENT_RESOURCES`).
- Tailwind silently emits **nothing** for an opacity modifier that isn't in the scale. `theme.extend.opacity` now carries `{3, 8, 12, 18, 55, 72, 92}`; add the step before using it. This bit during this pass — a `via-ink/55` scrim rendered as no rule at all.
- Responsive `object-position` must be a utility class on `imgClassName`, never an inline `style` prop — an inline style can't be overridden at a breakpoint.

---

**Stage 3 can begin immediately on top of this codebase.**
