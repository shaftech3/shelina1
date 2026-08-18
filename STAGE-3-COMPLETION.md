# Stage 3 — Customer Shopping Experience · Completion Report

Shop, product detail, and cart are complete and verified in a real headless browser
against the **production build** (`vite preview`, port 4173).

- **Stage 3 audit:** `node /home/user/audit3.mjs` → **94 / 94 passed**, 0 console errors, 0 horizontal overflow
- **Stage 1 / 2 regression:** `node /home/user/audit2.mjs` → no errors, no overflow, a11y unchanged
- **Contrast sweep:** `node /home/user/contrast3.mjs` → no AA failures on any Stage 3 route
- **Static:** `npx tsc -b` → 0 · `npm run lint` → 0 errors (2 known warnings) · `npm run build` → OK

---

## 1. The core requirement: per-product variants

**There is no global size list and no global colour dictionary anywhere in the codebase.**
Every product owns hand-authored `sizes` and `colors` arrays; values are free-form strings
rendered verbatim, never validated against a list and never transformed for display.

This is enforced by an automated check in the audit (`NO global size/colour dictionary exists`)
that greps the whole `src/` tree, so a future regression fails the suite rather than silently
reintroducing a taxonomy.

Proof from live DOM assertions:

| Product | Rendered sizes | Rendered colours |
|---|---|---|
| Aurelia Bow Slide | `36 · 37 · 38 · 39 (unavailable) · 40` | Blush · Ivory · Sand |
| Drift Low Sneaker | `UK 6 · UK 7 · UK 8 · UK 9 · UK 10` | per-product |
| Travel Shoe Bag | `Small · Medium · Large` | — |
| Hana Ankle Boot | sizes only | **`colors: []`** → colour block hidden |
| Atelier House Slipper | **`sizes: []`** → size block hidden | colours only |
| Shelina Care Kit | neither → both hidden, adds directly | — |

Unavailable options render struck-through and carry an sr-only `(unavailable)` suffix,
so the state is not communicated by styling alone.

## 2. §50 criteria

| # | Criterion | Status |
|---|---|---|
| 1 | `/shop` lists all products from the service layer | ✅ 17 products |
| 2 | Search across name/brand/category/description, case-insensitive, local | ✅ `chappal` → 5 |
| 3 | Category filter | ✅ multi-select |
| 4 | Brand filter | ✅ multi-select |
| 5 | Price filter | ✅ min/max, reversed range swaps rather than emptying |
| 6 | Availability filter | ✅ in-stock only |
| 7 | Sorting — Featured / Newest / Price ↑ / Price ↓ / Name A–Z | ✅ all five verified in order |
| 8 | Product count reflects active filters | ✅ |
| 9 | Filters sync to URL query params | ✅ `q · category · brand · min · max · stock · sort` |
| 10 | Responsive grid, equal heights, consistent ratios | ✅ 2 / 2–3 / 3–4 |
| 11 | Mobile filter drawer reuses Stage 1 `Drawer` | ✅ trap · Escape · scroll lock · Apply/Reset |
| 12 | ProductCard: image, name, brand, price, sale, badges, stock | ✅ |
| 13 | Cards link to `/product/:slug` | ✅ |
| 14 | Detail page fetches via service layer, not URL-passed objects | ✅ `getBySlug` |
| 15 | Gallery: thumbnails, prev/next, keyboard | ✅ |
| 16 | Video only when present, no autoplay-with-sound, poster, no preload | ✅ 1 product; `preload=metadata`, muted, controls |
| 17 | Full product info incl. SKU and stock | ✅ |
| 18 | Only that product's sizes/colours, verbatim | ✅ see table above |
| 19 | Selection required only when the array is non-empty | ✅ |
| 20 | Validation via Toast — never `alert()` | ✅ "Please select a size." / "Please select a colour." |
| 21 | Colour name always shown; swatch only when safe | ✅ |
| 22 | Quantity `[-] 1 [+]`, min 1, stock-aware | ✅ clamps at 1 |
| 23 | Cart identity = productId + size + colour | ✅ 3 distinct lines from 1 product |
| 24 | Only fully identical variants merge | ✅ |
| 25 | `cartService` owns all persistence | ✅ `localStorage` confined to one module |
| 26 | Cart drawer + `/cart` page, full line detail | ✅ |
| 27 | Remove + subtotal + continue shopping | ✅ subtotal Rs 19,560 verified |
| 28 | Header badge = total quantity | ✅ badge 4 |
| 29 | Survives refresh | ✅ |
| 30 | Checkout is a marked placeholder — no fake order | ✅ |
| 31 | Beautiful empty-cart state | ✅ |
| 32 | Product-not-found, search-empty, filter-empty states | ✅ all three |
| 33 | A11y, responsive, no console errors, no overflow | ✅ 10 viewports × 3 routes |

## 3. Accessibility

- One `h1` per route; no heading-level jumps on `/shop`, `/product/:slug`, `/cart`
- Variant selection is a `radiogroup`; the selected state is carried by `aria-checked`
  **plus** a filled background and border — never colour alone
- Invalid submit sets `aria-invalid` and `aria-errormessage` on the group and moves nothing
  unexpectedly; the toast announces the problem
- Adding to the bag opens the cart drawer, which carries its own polite live region
  (`Bag updated. N items, subtotal …`). The success toast was deliberately removed so the
  same event is not announced twice or drawn over the drawer's CTA
- Focus trap, Escape, scroll lock and scroll restoration verified on cart drawer,
  mobile filter drawer, search overlay and mobile nav
- `prefers-reduced-motion` → all 17 reveals render visible, animations collapse to 1 ms
- Every image has `alt`; every button and link has an accessible name

## 4. Notable fixes made during the audit

**Focus trap portal race (real bug).** After add-to-cart, focus stayed on the "Add to bag"
button outside the open dialog, stranding keyboard users. `useFocusTrap` captured
`containerRef.current` once at effect time, but the portal mounts in the *same commit*
that activates the trap, so the ref was `null` and the single `requestAnimationFrame`
fired before the node attached. `focusFirst` now re-reads the ref on each attempt, retries
across up to 10 frames, filters to visible focusables, and the Tab handler reads the ref at
event time. This touches every overlay, so Stage 1/2 was re-audited afterwards — clean.

**Shop heading gap.** Two stacked `Section`s summed their vertical padding into a ~150 px
void. A `pb-0` override did **not** work: `cn` is a dependency-free joiner with no
tailwind-merge, so `pb-0` loses to the responsive `md:py-16` inside its own media query.
The bands were merged into one instead; the gap is now a deliberate 48 px.

**Toast placement.** A bottom-anchored toast covered the cart drawer's "View bag" button on
phones. Toasts are now top-anchored below the header on small screens, bottom-right on
desktop where no such collision exists.

**Accessory imagery.** The Leather Care Kit and Travel Shoe Bag were reusing boot and
slipper photography. Both now have their own correct images.

## 5. Scope discipline

Not built, as instructed: backend, database, auth, payments, orders, checkout processing,
tax, coupons, delivery calculation, video upload, admin, AI of any kind, virtual try-on,
wishlist, reviews, loyalty, quick view.

Runtime dependencies are still exactly `react`, `react-dom`, `react-router-dom` — Stage 3
added **zero** packages. No page imports mock data directly; no `eval`; no
`dangerouslySetInnerHTML`; no hardcoded colours; no duplicate overlay system.

## 6. Ready for Stage 4

`cartService` is already the single seam a real backend would replace, and `CartProvider`
consumes it through a stable interface, so orders/checkout can be layered on without
touching components. `ProductQuery` covers filtering, sorting, and pagination-shaped
`limit`, so a server-side catalogue swaps in behind `productService` unchanged.

---

### Verification harnesses

| Path | Purpose |
|---|---|
| `/home/user/audit3.mjs` | Stage 3 — 94 checks across 8 sections |
| `/home/user/audit2.mjs` | Stage 1/2 regression |
| `/home/user/contrast3.mjs` | WCAG AA sweep, 10 routes × 2 viewports |
| `/home/user/shots3/` | Stage 3 screenshots |

Re-running after a workspace reset requires `npm install` and the Playwright browser
setup, both documented in the project notes — `node_modules` and the browser cache are
excluded from workspace snapshots.
