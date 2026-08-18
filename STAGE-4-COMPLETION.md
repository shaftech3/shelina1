# Stage 4 — Admin Panel, Authentication & Backend-Ready Foundation

Stage 4 adds a small, professional content-management area to Shelina. It is a
**product and content manager**, not an enterprise dashboard: no analytics, no
orders, no CRM, no AI. The storefront built in Stages 1–3 is unchanged apart
from the data layer it now reads through.

> **Security notice — read first.** The authentication in this build is a
> **development adapter only and is not production-secure.** It runs entirely in
> the browser and protects nothing. See [Security limitations](#security-limitations).

---

## 1. Admin routes

All routes are lazy-loaded as a single `admin` chunk that storefront visitors
never download (verified: 0 admin resources requested on a storefront visit).

| Route | Page | Protected |
| --- | --- | --- |
| `/admin/login` | Sign in | — |
| `/admin` | Dashboard (counts only) | ✅ |
| `/admin/products` | Product list, search + filters | ✅ |
| `/admin/products/new` | Create product | ✅ |
| `/admin/products/:id/edit` | Edit product | ✅ |
| `/admin/categories` | Category CRUD | ✅ |
| `/admin/brands` | Brand CRUD | ✅ |
| `/admin/homepage` | Hero, banners, promo block | ✅ |
| `/admin/seo` | Site-wide SEO settings | ✅ |
| `/admin/*` | Not found | ✅ |

`AdminRoutes` is mounted in `App.tsx` at `/admin/*`. Every child except `login`
is wrapped in `<RequireAdmin>`, which redirects unauthenticated visitors to
`/admin/login` and returns them to their intended page after signing in.

---

## 2. Authentication architecture

Email + password only. No registration, no social login, no 2FA — by design.

`src/services/authService.ts` is the single abstraction:

```ts
login(credentials): Promise<AdminUser>
logout(): Promise<void>
getCurrentAdmin(): AdminUser | null
isAuthenticated(): boolean
subscribe(listener): () => void
isDevAuthConfigured(): boolean
```

`src/admin/auth/` wraps this in React: `AdminAuthProvider` holds the session,
`useAdminAuth()` exposes `{ admin, isAuthenticated, initialising, login, logout }`.
UI components never read the session store directly.

**Development credentials** come from `.env.local` (gitignored, never
committed): `VITE_DEV_ADMIN_EMAIL` and `VITE_DEV_ADMIN_PASSWORD`. There is **no
fallback and no hardcoded password anywhere in source, mock data or the
committed `.env.example`**. If the variables are missing, login is disabled and
the form says so — a shipped default password is a vulnerability, and silently
accepting one is worse than being unable to log in. The session lives in
`sessionStorage` (`shelina.admin.session.v1`, 8-hour TTL). No JWT is issued and
no signing secret exists in the frontend.

**Logout** clears the admin session and returns to `/admin/login`. It
deliberately **does not touch the customer's cart** (`shelina.cart.v1`), which
is verified in the audit.

### Backend integration points

The UI does not change when a real backend is connected — only the bodies of
these service functions do:

| Now | Stage 5 |
| --- | --- |
| `login()` checks env credentials | `POST /api/auth/login`, server verifies an Argon2/bcrypt hash and sets a `Secure; HttpOnly; SameSite=Strict` cookie |
| `getCurrentAdmin()` reads sessionStorage | `GET /api/auth/me`, trusting the cookie |
| `logout()` clears sessionStorage | `POST /api/auth/logout`, server clears the cookie |
| `RequireAdmin` guards the client route | Server authorises every `/api/admin/*` request independently |

---

## 3. Service architecture

The Stage 1–3 rule holds: **UI → Hooks → Services → Data.** Admin components
never touch `localStorage` or the repository directly.

```
src/admin/pages/*        UI
src/admin/hooks/*        useAdminProducts / Product / Categories / Brands /
                         Homepage / Seo / Stats → { data, loading, error, retry }
src/services/*           product, category, brand, homepage, seo, media, auth
src/data/repository.ts   the single shared store
```

`src/data/repository.ts` is the one mutable source of truth
(`DataStore { version, products, categories, brands, hero, banners, editorial,
trustValues, seo, updatedAt }`) persisted to `localStorage` under
`shelina.data.v1`, with `read / write / subscribe / getRevision / reset`.
**Only `src/services/` may import it.** `src/data/mock/*` are seed data only.

Because admin and storefront read the *same* repository, there are no duplicated
datasets and no mutation of imported constants. `useDataRevision()` — a
`useSyncExternalStore` subscription — is in the dependency list of every catalog,
content and admin hook, so an admin edit re-renders the storefront immediately.

Service methods follow one shape: `listAll(query?)`, `getById`, `create`,
`update`, `remove`, plus `stats()` for products and banner CRUD on
`homepageService`.

---

## 4. Product management

The table shows Image, Name, Category, Brand, Price, Stock, Status, Actions,
with search by name/SKU/brand and filters for category, brand and status. Below
`md` it becomes a card list. Form sections: Product information, Pricing,
Inventory, Variants, Media, SEO, Visibility.

**Validation.** Name, price, category and brand are required (SKU is optional);
sale price must be below price; stock cannot be negative. Errors render inline
against real `<label>` elements. The slug is suggested from the name while
creating and is **never overwritten once edited by hand**. Submits are disabled
while saving, success raises a toast, and a failed write never fakes a save.
Unsaved changes prompt before navigation.

**Deletion** uses the existing `Modal` — never `confirm()`.

### Sizes and colours — manual entry only

There is **no predefined size dropdown and no predefined colour dropdown**, and
no global size or colour dictionary exists anywhere in the codebase. Both fields
are a free-text input plus an "Add" button that produces removable chips.

Any string is accepted and stored **exactly as typed** — `38`, `UK 6`,
`EU 41`, `Free Size`, `Coffee`, `Dark Brown`, `Navy Blue`. Nothing is
normalised, title-cased, validated against a list, or mapped to a CSS colour.
Duplicates within one product are rejected; that is the only rule. Products with
no sizes, no colours, or neither are fully supported.

---

## 5. Categories, brands and consistency

Both support name, slug, description, image, logo, SEO title and SEO
description, created and edited in a modal form. No taxonomy is hardcoded as
mandatory.

**Referential integrity (§40):** deleting a category or brand that is still
referenced by products is refused with a `409` and an explanatory toast —
*"This category is used by 3 products. Reassign them before deleting it."*
Unused entries delete cleanly. Renaming a brand cascades to its products, since
`Product` stores the brand by name rather than by id.

---

## 6. Homepage management

Hero: eyebrow, heading, subheading, badge, image + alt text, primary and
secondary button labels/links (clearing a label hides that button). Banners:
add, edit, delete, and an Active toggle; the storefront shows the first two
active banners. Promotional/editorial block: eyebrow, heading, description,
image + alt, button label and link.

The layout is fixed. There is no drag-and-drop page builder and no arbitrary
layout selection — only the content changes.

---

## 7. SEO management

Per product, category and brand: SEO title and description, falling back to the
entity's own name and short description when empty. Site-wide: site title,
description, default image, keywords, OG title/description/image and optional
Twitter fields, with an empty string meaning "inherit".

`seoService.resolve` composes `"<page title> — <site title>"` and `useSeo` writes
the tags. Note that the site description is a **fallback**: a page that supplies
its own description keeps it, which is correct behaviour.

---

## 8. Media handling

`mediaService` is an abstraction, not a fake uploader. Products store
**references only** — `{ url, alt }` for images and `{ url, poster }` for video —
never binary blobs.

Two paths: enter a path to a file already published under `/public`, or pick
local files for **preview only**. The preview path is labelled in the UI as
non-persistent (it disappears on reload) precisely so it is not mistaken for a
working upload. Real uploads become `POST /api/media` in Stage 5, returning a URL
that is stored the same way. Multiple images are supported with preview and
removal, the first being the primary image; video is optional and never
autoplays. Alt text is available for product, hero and banner images.

---

## 9. Mock repository behaviour

Seeded with 17 products, 7 categories and 4 brands, including deliberate edge
cases: no colours, no sizes, neither, word-based sizes, video-only media,
out-of-stock and pre-order.

Writes go to `localStorage`, so admin edits survive a reload and are visible on
the storefront in the same session. `repository.reset()` restores the seed.
Data is per-browser and per-device; this is a development persistence layer, and
the production API service stays separate from it.

---

## 10. Design and accessibility

Shelina tokens only (`#2596BE` primary, `#D29E9E` secondary, `#FAFBF6` neutral,
`#FFFFFF` surface) — no hardcoded colours in components, no new palette, no pure
black. Usability first: dense tables, clear labels, no decoration for its own
sake. Desktop sidebar collapses to a focus-trapped mobile drawer, reusing the
Stage 1 `Drawer`/`Modal`/`Toast` — no second overlay system. `alert()` and
`confirm()` are not used anywhere.

Verified across 320–1920px: no horizontal overflow, exactly one `h1` per route,
no heading-level jumps, every image has alt text, every button has an accessible
name, every form control has a label, and `prefers-reduced-motion` collapses
admin animations.

### Issues found and fixed during the audit

1. **Banner Active toggle allowed a double submit.** The write round-trips
   through an async service, so a fast second click raced the first. Fixed with
   a `togglingId` guard that disables the checkbox while the write is in flight.
2. **The hidden file input had no accessible name.** `#product-image-upload` is
   `sr-only` but still in the accessibility tree, and its visible trigger is a
   separate button, so screen readers announced an unnamed control. Given an
   explicit `aria-label`.
3. **Status badges failed WCAG AA.** `success`, `warning` and `error` badges
   render their base hue on a 12% tint of themselves — that is ~4.0:1, below the
   4.5:1 required for 11px text, even though the same hues pass on white. Added
   tint-safe `--c-success-deep`, `--c-warning-deep` and `--c-error-deep` tokens
   (≥5.2:1) and switched the tinted badge tones to them.

---

## 11. Verification

| Check | Result |
| --- | --- |
| `npx tsc -b` | 0 errors |
| `npm run lint` | 0 errors (2 pre-existing `only-export-components` warnings) |
| `npm run build` | clean |
| Stage 4 audit (`audit4.mjs`, 117 checks) | **117 / 117** |
| Stage 3 regression (`audit3.mjs`, 94 checks) | **94 / 94** |
| Stage 1–2 regression (`audit2.mjs`) | no console errors, no overflow |
| Contrast sweep (storefront + 7 admin routes) | no admin failures |
| Console / page errors across the whole run | none |

Bundle: `index` 58.70 kB (14.98 gz), **`admin` 72.64 kB (17.03 gz, lazy)**,
`layout` 90.26 kB (25.69 gz), `react` 213.68 kB (68.05 gz), CSS 62.54 kB (10.65 gz).

No new runtime dependencies: `react`, `react-dom`, `react-router-dom`. No Redux,
form framework, table library, page builder, rich text editor, chart library or
analytics SDK.

Storefront regression re-verified in-browser: homepage, shop, search, filters,
product page, variant selection, cart drawer, cart page, cart persistence and
mobile navigation all behave as they did in Stage 3.

---

## Security limitations

**This build's authentication is not production-secure and must not be deployed
as-is.** It is a development adapter so the admin UI can be built and tested
before a backend exists.

- All checks run in the browser and can be bypassed from devtools; `RequireAdmin`
  hides UI, it does not protect data.
- Vite inlines `VITE_*` variables into the client bundle, so `.env.local` may
  only ever hold a throwaway local secret — never a real credential.
- Anyone with access to the browser can edit `localStorage` and change catalogue
  content; the repository is a development store, not a database.
- No password hashing, no rate limiting, no CSRF protection, no audit log, no
  session revocation.

Before production: move every mutation behind server-authorised `/api/admin/*`
endpoints, verify passwords against a hash server-side, issue an HttpOnly cookie
session, and re-check authorisation on every request. The admin UI itself does
not need to change.

---

## Addendum — customer account menu (header fix)

The storefront header's person icon was inert: it had no `onClick`, and it was
`hidden sm:inline-flex`, so on phones there was no account control at all. The
"My account" button in the mobile navigation drawer was dead in the same way.

Both are now functional, and both are **entirely separate from the Stage 4 admin
authentication** — different service, different types, no shared session or
storage. Signing into the admin panel does not change the storefront header, and
the account menu never imports `authService`.

- **Desktop (≥768px):** a popover built on the existing `Dropdown` primitive —
  `role="menu"`, `aria-haspopup="menu"`, `aria-controls`, `aria-labelledby`, and
  `aria-expanded` tracking state.
- **Mobile (<768px):** a right-side `Drawer` — `role="dialog"`,
  `aria-haspopup="dialog"`, focus-trapped, scroll-locked.
- Both open on click, close on outside click and Escape, are fully keyboard
  operable, and produce no horizontal overflow at 320–1920px.

**Customer authentication still does not exist and is not faked.**
`customerAccountService` reports a permanently signed-out, disabled state; it
touches no browser storage, holds no mock customer, and its `signIn`/`register`
throw a `501` rather than pretending to succeed. The guest options route to
`/account/sign-in` and `/account/register`, which render the honest
`ComingSoonPage` placeholder — no fake form and no password field exists
anywhere in the build.

No new dependency was added; both branches reuse Stage 1 primitives, so no
second overlay system was introduced.

Verified in-browser (`/home/user/audit-account.mjs`, **63/63**): open/close
behaviour, ARIA wiring, keyboard navigation, mobile drawer, admin/customer
separation, overflow at 9 widths, and header/search/cart/nav regression.

---

## Scope

**Included:** products, categories, brands, homepage hero, banners, promotional
content, SEO settings.

**Deliberately excluded:** orders, checkout, payments, delivery, invoices,
customers, CRM, coupons, reviews, wishlist, inventory analytics, staff
management, complex permissions, notifications, analytics and AI. No
`Order`, `OrderItem`, `Payment`, `Customer`, `Coupon` or `Review` entity exists.
