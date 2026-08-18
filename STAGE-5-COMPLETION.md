# Stage 5 — Backend & Database Integration

Shelina now runs on a real server and a real database. The storefront and the
admin panel were **not** rebuilt: the React app is unchanged in behaviour and
appearance, and every screen that worked in Stage 4 still works. What changed is
what sits behind `src/services/` — a browser-local mock store became a
PostgreSQL database reached over a REST API.

**Verified:** 162/162 automated checks pass (`node /home/user/audit5.mjs`),
TypeScript clean, lint clean (0 errors), production build succeeds, zero console
or page errors across the entire browser run.

---

## 1. Architecture

```
React (Vite, :4173)
  UI components  →  hooks  →  services  ←── the only layer that knows about HTTP
                                  │
                                  │  fetch, credentials: 'include'
                                  ▼
                         /api/*  (Vite dev+preview proxy)
                                  │
                                  ▼
Express 5 + TypeScript (:4000)
  routes → validation (Zod) → auth guards → Prisma → PostgreSQL 17
```

The layering rule from earlier stages is intact: **UI → Hooks → Services**, and
only `src/services/` touches the data source. No React component imports Prisma,
knows a table name, or builds a query. That is exactly why the migration was
possible without touching page code.

Two separate packages:

| Path | What it is |
|---|---|
| `/home/user/shelina` | The Vite + React frontend (Stages 1–4, migrated in Stage 5) |
| `/home/user/shelina-api` | The new Express + Prisma backend |

### Backend layout

```
shelina-api/
├── prisma/
│   ├── schema.prisma          9 models
│   ├── migrations/            20260816121115_init
│   └── seed.ts                reads the real Stage 3 mock data
├── src/
│   ├── lib/        env, prisma, errors, auth
│   ├── middleware/ authGuards, errorHandler
│   ├── validation/ schemas.ts  (Zod)
│   ├── services/   serialize.ts, slug.ts
│   ├── routes/     auth, products, taxonomy, content, media
│   ├── app.ts      middleware + route mounting
│   └── server.ts   listener
├── .env            real values, gitignored
└── .env.example    placeholders only
```

Dependencies were kept deliberately small: `express`, `@prisma/client`,
`@prisma/adapter-pg`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `cors`,
`helmet`, `express-rate-limit`, `zod`, `dotenv`. No ORM wrapper, no auth
framework, no validation framework beyond Zod. `npm audit` reports 0
vulnerabilities.

---

## 2. Database schema

Nine models, all snake_cased at the table level via `@@map`.

| Model | Table | Purpose |
|---|---|---|
| `AdminUser` | `admin_users` | Staff logins |
| `CustomerUser` | `customer_users` | Shopper accounts |
| `Category` | `categories` | Taxonomy + SEO |
| `Brand` | `brands` | Taxonomy + SEO |
| `Product` | `products` | Catalogue |
| `ProductMedia` | `product_media` | Image/video **URLs** |
| `Homepage` | `homepage` | Single row (`id = "homepage"`), hero + editorial |
| `Banner` | `banners` | FK → Homepage |
| `SeoSettings` | `seo_settings` | Single row (`id = "seo"`), global defaults |

**Deliberately absent:** Order, OrderItem, Payment, Coupon, Review, Analytics.
Those are Stage 6+, and the audit asserts none of those tables exist.

### Product fields

`id, name, slug, sku, description, shortDescription, price, salePrice, stock,
stockStatus, status, featured, newArrival, onSale, brandId, categoryId,
seoTitle, seoDescription, sizes, colors, tags, createdAt, updatedAt`

### Sizes and colours stay free-form

This is a hard constraint from Stage 3 and it survives the move to a relational
database. `Product.sizes` and `Product.colors` are `Json @default("[]")`:

```
sizes  → [{ value: "UK 7",       available: true }]
colors → [{ name: "Dark Brown", swatch: null, available: true }]
```

There is **no `Size` table, no `GlobalSize` enum, no `GlobalColor` enum, and no
colour dictionary.** Values are stored exactly as the admin typed them and are
never validated against a list, normalised, or transformed for display. The
audit proves this by round-tripping `"Free Size"`, `"UK 13½"` and `"٤٢"` through
the API and reading the raw column back out of PostgreSQL — all three come back
byte-identical. A JSON column was chosen precisely because a join table would
have quietly reintroduced the global dictionary the brief forbids.

### Indexes

Only what the brief allowed: unique on `slug`, `sku`, `email`; plain indexes on
`categoryId`, `brandId`, `status`, and a composite `product_media(productId,
sortOrder)`. Nothing else — no speculative indexing.

---

## 3. API routes

Every `GET` below is public; **every mutation requires an admin session.**

| Method | Route | Auth |
|---|---|---|
| `POST` | `/api/auth/admin/login` · `logout` | public · admin |
| `GET` | `/api/auth/admin/me` | cookie |
| `POST` | `/api/auth/customer/register` · `login` · `logout` | public |
| `GET` | `/api/auth/customer/me` | cookie |
| `GET` | `/api/products` · `/api/products/:idOrSlug` | public |
| `POST` `PUT` `DELETE` | `/api/products` · `/:id` | **admin** |
| `GET` | `/api/categories` · `/:idOrSlug` | public |
| `POST` `PUT` `DELETE` | `/api/categories` · `/:id` | **admin** |
| `GET` | `/api/brands` · `/:idOrSlug` | public |
| `POST` `PUT` `DELETE` | `/api/brands` · `/:id` | **admin** |
| `GET` `PUT` | `/api/homepage` | public · **admin** |
| `GET` `POST` `PUT` `DELETE` | `/api/banners` · `/:id` | public · **admin** |
| `GET` `PUT` | `/api/seo` | public · **admin** |
| `GET` | `/api/media/config` | public |
| `POST` | `/api/media` | **admin** → `501 Not Implemented` |

Conventions:

- Detail routes accept **either an id or a slug** (`/:idOrSlug`), which is what
  lets the storefront keep using pretty URLs.
- Draft and archived products are only visible to an authenticated admin
  (`?all=true` / `?status=`). The public list returns active products only.
- Product listing uses a fixed `include` (brand + media) — **no N+1**. Taxonomy
  lists use `_count.products` instead of loading products.
- Deleting a referenced category or brand returns **409** with a message naming
  the number of products to reassign.
- Product update replaces `ProductMedia` inside a `$transaction`.
- Slugs are generated and de-duplicated server-side by `uniqueSlug()`.

### Error envelope

```json
{ "success": false, "message": "...", "errors": { "price": "..." } }
```

`ApiError` provides `badRequest / unauthorized / forbidden / notFound /
conflict`. Zod issues flatten into `errors` keyed by field path. Unknown
exceptions become a generic 500 in production — the audit greps error responses
for `postgresql://`, `shelina_dev`, `SESSION_SECRET`, stack frames and
`node_modules` and finds none.

---

## 4. Authentication & authorization

**Hashing.** bcrypt (`bcryptjs`) at cost factor 12. Passwords are never stored
in plaintext, never reversibly encrypted, and never hashed in the browser. The
audit reads the `passwordHash` column directly and asserts it matches
`$2b$12$…`, is 60 characters, and that the plaintext appears nowhere.

**Sessions.** A signed JWT (`SESSION_SECRET`, 8-hour TTL) carried in an
HTTP-only cookie. `httpOnly: true`, `secure` in production, `sameSite: strict`
in production / `lax` in development. The token is never readable by JavaScript
— the audit confirms `document.cookie` cannot see it.

**Admin and customer sessions are logically separate**, which the brief called
out specifically:

- Different tables (`admin_users` / `customer_users`).
- Different cookies (`shelina_admin_session` / `shelina_customer_session`).
- Every token carries an **audience**, and `readSession(cookies, audience)`
  rejects a token minted for the other side.
- Guards re-fetch the user row on each request, so a deleted or disabled account
  cannot keep acting on a still-valid token.
- Logout clears only its own cookie.

Verified in both directions, at the API *and* in a real browser: a customer
cookie cannot perform an admin mutation (401), does not resolve at
`/auth/admin/me`, and an admin who is signed into the panel is still an ordinary
**guest** on the storefront — the account menu offers "Sign In / Create Account"
and never leaks the admin's email.

**Authorization is enforced on the server.** Frontend route guards remain purely
cosmetic. The audit bypasses the UI entirely and fires unauthenticated `POST`,
`PUT` and `DELETE` requests at products, categories, brands, banners, homepage
and SEO — all seven are rejected with 401.

**Rate limiting.** Credential endpoints share a limiter (default 20 attempts per
IP per 15 minutes) configurable via `AUTH_RATE_LIMIT`. It is tunable so an
automated suite can exercise real logins, never disabled.

No Google, Facebook, OTP or 2FA. No hardcoded admin password anywhere in
frontend source, mock data, or the built bundle.

---

## 5. Environment variables

`shelina-api/.env.example` ships placeholders only — no real secret is
committed, and `.env` is gitignored.

```
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/shelina_dev?schema=public
SESSION_SECRET=
CORS_ORIGIN=http://localhost:4173,http://localhost:5173
PORT=4000
NODE_ENV=development
AUTH_RATE_LIMIT=20
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=
```

The frontend only ever learns `VITE_API_BASE_URL` (default `/api`).
**`DATABASE_URL` is never exposed to Vite**, and the audit greps the built
production bundle for `SESSION_SECRET`, `DATABASE_URL`, the dev secret and any
bcrypt hash — none are present.

> Note on Prisma 7: the connection URL lives in `prisma.config.ts` and is passed
> to `PrismaClient` through `PrismaPg`, not in a `url = env(...)` line inside
> `datasource db` (that combination errors with P1012).

---

## 6. Seeding

`prisma/seed.ts` imports the **actual Stage 3 mock files** from
`../shelina/src/data/mock/`. No second dataset was invented, and no product was
renamed or reinvented — the shop that existed before the migration is the shop
that exists after it.

Seeded: **17 products, 7 categories, 4 brands, 21 media rows, 2 banners, 1
homepage row, 1 SEO row, 1 admin user.**

The deliberate Stage 3 edge cases all survive: `prd-013` has no colours,
`prd-014` no sizes, `prd-015` neither, `prd-016` a single colour, `prd-017` word
sizes, `prd-010` only a video, `prd-007` out of stock, `prd-006` pre-order,
`prd-005` UK sizes.

---

## 7. Frontend migration

The critical requirement was that **service interfaces stay identical** —
`productService.getProducts()` had to keep working, with only its implementation
changing. It does. No page, component or hook signature changed.

- **`src/services/apiClient.ts`** (new) — thin `fetch` wrapper:
  `credentials: 'include'`, `api.{get,post,put,delete}`, query serialisation, and
  `ApiValidationError extends ServiceError` carrying per-field messages. A
  network failure becomes `ServiceError(msg, 0)` rather than an unhandled
  rejection.
- **Rewritten against the API:** product, category, brand, homepage, hero,
  banner, content, seo, auth, customerAccount services.
- **`src/data/repository.ts`** — the old mutable localStorage store is gone. The
  file survives only as a **revision signal** (`subscribe` / `getRevision` /
  `invalidate`) plus `slugify()`. Every mutating service calls `invalidate()`,
  and `useDataRevision()` sits in the deps of every catalogue/content/admin hook,
  so the UI refreshes exactly as it did before.
- **Query behaviour preserved.** `ProductQuery` still accepts `categoryId,
  categorySlugs, brands, featured, onSale, isNew, search, minPrice, maxPrice,
  availability, inStockOnly, sort, limit`. Search, category, brand and sorting
  run in SQL; price/availability refinements run client-side via
  `applyLocalFilters` on the already-narrowed set.
- **`Product.brand` stays a name string** in the frontend contract;
  `productService.resolveBrandId()` bridges that to `brandId` on write, so no
  component had to learn about foreign keys.
- **`seoService` keeps `resolve()` and `social()` synchronous** via a
  module-level snapshot primed at boot — page components call them during
  render, so they could not become async.
- **Account UI (§25):** guest sees *Sign In / Create Account*; a signed-in
  customer sees *My Account / Logout*. No orders anywhere. Logout never clears
  the cart (explicitly tested).
- **Dev fallback:** there is none. Removing it entirely was cleaner than
  isolating it — the API was verified working *before* the mock store was
  removed, so there was never a broken half-migrated state.

Vite proxies `/api` to `http://127.0.0.1:4000` in both dev and preview, so the
browser only ever calls a same-origin relative URL.

---

## 8. Security

| Concern | Measure |
|---|---|
| Password storage | bcrypt cost 12, server-side only |
| Session transport | HTTP-only, `secure` in prod, `sameSite` set |
| Authorization | Enforced in Express guards, never in React |
| Session crossover | Audience-scoped tokens, separate cookies and tables |
| CORS | Explicit origin allowlist from `CORS_ORIGIN`; the exact origin is echoed, **never `*`**, with credentials enabled. A disallowed origin receives no CORS grant at all. |
| Headers | `helmet` |
| Brute force | Shared limiter on all credential endpoints |
| Input | Zod schemas on every mutation |
| Error leakage | Generic 500s; no stack traces, SQL, or credentials |
| Secrets | Absent from the frontend bundle; `.env` gitignored |

Validation is genuinely server-side: missing name, missing price,
`salePrice >= price`, negative price, negative stock, and unknown
`categoryId`/`brandId` are each rejected with 400 regardless of what the UI
allows.

---

## 9. Media architecture

**No binaries are stored in PostgreSQL.** A `product_media` row holds a URL, a
type (`image | video`), alt text and a sort order — nothing more.

No cloud storage provider is configured, and none is faked. The backend says so
honestly rather than pretending:

- `GET /api/media/config` → `{ provider: 'none', uploadsEnabled: false,
  acceptsUrlReferences: true, message }`
- `POST /api/media` → `501 Not Implemented`

The frontend `mediaService` is unchanged: `selectExisting()` references a file
already served from `/public` (this is what the catalogue uses and what
persists), while `upload()` wraps a `File` in an object URL for preview only and
reports `persistent: false`, which the admin UI surfaces as a warning.

Adding a real provider later means replacing the body of `upload()` with a
multipart POST returning `{ url, width, height }`. Because the form only ever
sees a `MediaAsset` and the database only ever stores a URL, **no form code and
no schema change is required.**

---

## 10. Testing & audit

`/home/user/audit5.mjs` — 17 sections, **162 checks, all passing**, against the
production build served by `vite preview`, driving a real Chromium browser and
verifying results directly in PostgreSQL with `psql`. The suite is idempotent:
it cleans up rows from prior runs, restores the hero and SEO copy it edits, and
leaves the database at exactly 17 products / 7 categories / 4 brands.

| # | Section | Result |
|---|---|---|
| 1 | Infrastructure, tables, migrations, seed | pass |
| 2 | bcrypt hashing | pass |
| 3 | Public API | pass |
| 4 | Free-form sizes/colours | pass |
| 5 | Unauthenticated mutations rejected | pass |
| 6 | Auth flows + session separation | pass |
| 7 | Server-side validation | pass |
| 8 | Referential integrity (409s) | pass |
| 9 | Error responses leak nothing | pass |
| 10 | CORS | pass |
| 11 | Admin CRUD end-to-end + persistence | pass |
| 12 | Category/brand/hero/SEO persistence | pass |
| 13 | Storefront reads live DB data | pass |
| 14 | Customer accounts in the browser | pass |
| 15 | Browser-level session separation | pass |
| 16 | No secrets in the bundle | pass |
| 17 | Responsive overflow at 10 widths | pass |

Highlights actually exercised through the UI, then confirmed in SQL: creating a
product in the admin form writes the row (and its free-form variants) to
PostgreSQL and survives a **hard reload**; editing and deleting propagate; a hero
edit appears on the storefront homepage; a customer registered in the browser
gets a bcrypt-hashed row and a session that persists across refresh; logging out
preserves the cart.

Also green: `tsc -b` 0 errors, `npm run lint` 0 errors (2 long-standing
`only-export-components` warnings in `ui/Toast.tsx` and `ui/Field.tsx`),
`npm run build` succeeds, no horizontal overflow at 320/360/375/390/414/768/
1024/1280/1440/1920, and **zero console or page errors** across the whole run.

Screenshots: `/home/user/shots5/` (12 desktop, 3 mobile).

### Real bugs found and fixed during the audit

Three genuine defects surfaced — worth recording, since the rest of the run
passed first time.

1. **Global SEO settings never reached the page.** `seoService.prime()` was
   implemented but never called, so the database-backed site title was silently
   ignored and every page fell back to the neutral default. Fixed by priming at
   app boot in `App.tsx`.
2. **`useSeo` was frozen to the first render.** Even after priming, the hook read
   the snapshot once and never re-rendered, so settings arriving after first
   paint — or edited by an admin at runtime — did not apply. Fixed by having
   `seoService` expose a revision counter and `useSeo` subscribe via
   `useSyncExternalStore`.
3. **A stale `mediaService` header comment** still described Stage 5 as future
   work ("Stage 5 replaces the body of `upload()`…"). Rewritten to describe what
   the code actually does now.

The remaining early failures were harness bugs, not product bugs — guessed
selector names ("Add size" vs "Add", "Save product" vs "Save changes", "Name" vs
"Brand name", invented colour names) and the rate limiter correctly blocking a
repeated run. Each was corrected in the harness rather than worked around in the
app.

---

## 11. Running it

```bash
# PostgreSQL (cluster persists at /home/user/pgdata)
export PATH=/usr/lib/postgresql/17/bin:$PATH
postgres -D /home/user/pgdata -k /home/user/pgrun -p 5432 -c listen_addresses=127.0.0.1

# API
cd shelina-api && npm install && npx prisma generate
npx prisma migrate dev && npx tsx prisma/seed.ts
npx tsx src/server.ts            # :4000

# Frontend
cd shelina && npm install
npm run dev                      # :5173
npm run build && npm run preview # :4173
```

---

## 12. Stage 6 integration points

Stage 5 stops cleanly at the boundary the brief drew. What is already in place
for orders and checkout:

- **`CustomerUser` exists and authenticates.** An `Order` model needs only a
  `customerId` FK; the session that would own an order already works.
- **`Product` carries `price`, `salePrice` and `stock`.** `OrderItem` should
  snapshot price at purchase time rather than joining live — the fields are ready.
- **Auth guards generalise.** `requireCustomer` already exists alongside
  `requireAdmin`, so customer-scoped routes (`GET /api/orders/mine`) need no new
  auth machinery.
- **The error envelope, Zod validation, rate limiter and CORS policy** are
  route-agnostic and apply to new routers for free.
- **Media** accepts URL references today; wiring a real provider is a change to
  one function body, not a schema migration.
- **The cart** is still client-side (`shelina.cart.v1`). Stage 6 decides whether
  to persist it server-side; nothing in Stage 5 blocks either choice.

Not built, by design: Order, OrderItem, Payment, Coupon, Review, Analytics,
checkout, invoices, wishlist backend, delivery tracking, admin order management.
