# Stage 6 — Orders, Checkout & Invoices

Cart → Checkout → Order → PostgreSQL → Admin management → Customer history → PDF invoice.

Built on Stage 5. Nothing was rebuilt, no architecture was replaced, and the Stage 1–5
feature set is verified intact by the regression section of the audit harness.

**Audit result: `node /home/user/audit6.mjs` → 226/226 passed, zero console errors.**

---

## 1. Data model

Exactly two new models, as specified. No other table was added.

### `Order` → `orders`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String @id @default(cuid())` | Internal only — **never exposed as the customer reference** |
| `orderNumber` | `String @unique` | Human-readable: `SHL-20260816-0001` |
| `idempotencyKey` | `String? @unique` | Collapses duplicate submissions |
| `customerId` | `String` → `CustomerUser` (`Restrict`) | History cannot silently vanish |
| `status` | `String @default("PENDING")` | Six controlled values (below) |
| `paymentStatus` | `String @default("UNPAID")` | COD only; the one payment field the brief permits |
| `customerName` / `customerEmail` / `customerPhone` | `String` | Captured at checkout |
| `shippingAddress` / `city` | `String` | Snapshot — editing an account later must not rewrite where a parcel was sent |
| `notes` | `String?` | Optional |
| `subtotal` / `shippingFee` / `grandTotal` | `Int` | Integer PKR, **all server-calculated** |
| `stockRestoredAt` | `DateTime?` | The claim flag that makes stock restoration exactly-once |
| `createdAt` / `updatedAt` | `DateTime` | |

### `OrderItem` → `order_items`

`orderId` (Cascade), `productId String?` (**SetNull** — deleting a product must not delete
history), then the purchase-time snapshot: `productName`, `sku?`, `productImage?`,
`productSlug?`, `size?`, `color?`, `quantity`, `unitPrice`, `lineTotal`.

`status` is a `String`, not a native enum, so the allowed set and the legal transitions live
in one auditable place in application code rather than being split across a migration.

### Indexes — deliberately minimal

`orders`: `orderNumber` (unique), `customerId`, `status`, `createdAt`, `idempotencyKey` (unique).
`order_items`: `orderId`, `productId`. Nothing else; there is no speculative indexing.

Migrations: `20260816143808_stage6_orders`, `20260816144023_stage6_order_idempotency`.

---

## 2. The snapshot strategy (§24)

**An order is a historical record, not a live join.**

`OrderItem` keeps its own copy of the product name, SKU, image, slug, size, colour and unit
price. The `productId` relation exists only for stock restoration and reporting — **no order
screen and no invoice ever reads through it.**

Proven, not asserted. The audit renames a product, rewrites its SKU and sets its price to
`987654` *after* an order exists, then re-reads the order and **regenerates the PDF**:

```
PASS  order STILL shows the original product name
PASS  order STILL shows the original price — Rs 8290
PASS  order STILL shows the original SKU — SHA-DRI-005
PASS  order STILL shows the original size / colour
PASS  order total is unchanged by the edit
PASS  REPRINTED invoice still shows the original name
PASS  reprinted invoice does NOT show the new name / new SKU
```

The catalogue is restored afterwards. Because an interrupted run once left a product renamed,
the restore is now registered on `exit`/`SIGINT`/`SIGTERM`/`SIGHUP`/`SIGPIPE`/`uncaughtException`
**before** the mutation, so the database self-heals even if the harness is killed mid-test.

---

## 3. Size and colour — the permanent rule

No size table. No colour table. No enum. No dictionary. **No global validation list.**

A variant is valid if and only if *that product* offers it. Matching is trim + case-insensitive,
but the string **stored is the one the product authored** (`UK 6`, `Optic White`), so it survives
verbatim into the order, the order detail page, the admin view and the invoice. Products with no
sizes, no colours, or neither remain orderable — all covered by the audit.

---

## 4. Order lifecycle

```
PENDING ──→ CONFIRMED ──→ PROCESSING ──→ SHIPPED ──→ DELIVERED   (terminal)
   │             │
   └─────────────┴──────→ CANCELLED                              (terminal)
```

Cancellation is allowed only from `PENDING` or `CONFIRMED`. `DELIVERED` and `CANCELLED` are
terminal. Every illegal move is refused with **409** and an explanatory message:

> `A PENDING order cannot move to DELIVERED. Allowed next: CONFIRMED, CANCELLED.`

Status changes are **admin-only**. The serialized order exposes `allowedTransitions`, so the
admin UI offers only legal next states rather than duplicating the rules.

---

## 5. Checkout

`/checkout` collects name, email, phone, address, city and optional notes, validated in the
browser **and re-validated on the server** — the frontend rules are a convenience, never the
enforcement point.

- **Login required.** A guest hitting `/checkout` is redirected to
  `/account/sign-in?redirect=/checkout` **with the cart preserved**, and is returned to checkout
  after signing in. No guest checkout.
- **Empty cart** → "Your cart is empty." + Continue shopping.
- **COD is stated plainly** on the page and in the summary.
- **The cart is cleared only after the backend confirms.** Any failure preserves both the cart
  and the entered details.

---

## 6. Order creation — one transaction, server-authoritative money

`POST /api/orders` runs entirely inside a single `prisma.$transaction`:

1. Authenticate (session cookie → `customerId`; never a client-supplied id)
2. Reject an empty cart
3. Load the products from the database
4. Validate each size/colour **against that product**
5. Validate quantity (1–99, integer)
6. Check stock
7. **Take prices from the DB row** — `salePrice` when it is lower than `price`
8. Compute `subtotal`, `shippingFee`, `grandTotal` server-side
9. Create `Order` + `OrderItem`s
10. Decrement stock with a guarded `updateMany({ where: { id, stock: { gte: qty } } })`

Any failure rolls the whole thing back — **no partial orders**.

> **Money is never accepted from the client.** The payload carries product ids, variants and
> quantities and nothing else. The audit submits `unitPrice: 1, subtotal: 1` and the server
> charges the real Rs 8,290.

### Stock

Rejects `quantity <= 0` and quantities above stock. Stock can never go negative. Insufficient
stock rejects the **entire** order with **409** and the exact required copy:

> "Some products are no longer available in the requested quantity."

…plus a per-line detail such as `Only 4 left of Hana Ankle Boot.` Cancellation restores stock
**exactly once**, claimed atomically via `updateMany({ where: { id, stockRestoredAt: null } })`.
Verified under **five concurrent cancellations**: stock is restored once, the losers get 409.

### Duplicate submission

The client sends an `idempotencyKey`. A repeat returns the **same** order (200, not a second
201). If two requests race and one loses the unique-constraint fight, that is treated as
success and the winner's order is returned. Verified by five parallel POSTs and by a real
double-click in the browser — **exactly one order** each time.

### Shipping

A configurable flat fee, decided by the backend: `SHIPPING_FEE=250`,
`FREE_SHIPPING_THRESHOLD=5000`. The checkout page *displays* the fee by asking
`GET /api/orders/shipping-quote`; it never computes it.

---

## 7. Invoice PDF

`GET /api/orders/:id/invoice` → `application/pdf`,
`Content-Disposition: attachment; filename="shelina-SHL-20260816-0001.pdf"`, `nosniff`.
One page, ~88 KB, generated with `pdfkit` (the only dependency Stage 6 added).

Contains SHELINA branding and logo, tagline, `INVOICE`, order number, date, status and payment
line, BILLED TO / SHIP TO blocks, order notes, an items table
(`PRODUCT | SIZE | COLOUR | QTY | UNIT | TOTAL`, with `—` for absent variants), subtotal,
shipping, grand total, and a COD footer. **Every value comes from the `OrderItem` snapshots.**

Access: the owning customer or any admin. `401` unauthenticated, `404` cross-customer.
Verified by extracting the real PDF text with `pdftotext -layout` — not by trusting the byte count.

---

## 8. Authorization

| Endpoint | Rule |
| --- | --- |
| `POST /api/orders` | Customer session required → **401** for guests |
| `GET /api/orders` | Scoped to `req.customerId` from the verified cookie |
| `GET /api/orders/:id` | Own order only → **404** for someone else's (no existence leak) |
| `GET /api/orders/:id/invoice` | Owner or admin → 401 / 404 |
| `GET /api/admin/orders` | Admin session → **401** for customers |
| `GET /api/admin/orders/:id` | Admin only |
| `PATCH /api/admin/orders/:id/status` | Admin only |

A cross-customer request returns **404, not 403**, so it cannot be used to confirm that an
order number exists. Route protection in the browser is convenience only — the backend enforces
every rule.

---

## 9. Error handling

| Code | Meaning |
| --- | --- |
| 400 | Malformed request body |
| 401 | Not authenticated (customer or admin) |
| 403 / 404 | Not yours / not found — cross-customer access returns 404 |
| 409 | Insufficient stock, invalid variant, illegal status transition, already cancelled |
| 422 | Invalid checkout information (field-level messages) |

Single error funnel with a uniform envelope `{ success: false, message, errors? }`. Responses
never contain SQL, stack traces, file paths, connection strings or Prisma internals.

---

## 10. Frontend

**Customer** — `/checkout`, `/order/success/:orderNumber` (order number, total, view order,
download invoice, continue shopping; **refreshing does not create a second order**),
`/account/orders` (number, date, status, item count, total, View; paginated),
`/account/orders/:id` (full detail + Download Invoice).

**Admin** — `/admin/orders` (search by number/name/email/phone, filter by status, sort
newest/oldest/highest/lowest) and `/admin/orders/:id` (detail + status change persisted to
PostgreSQL). Lightweight list and detail only: **no analytics dashboard, no charts.**

**Account menu** — authenticated: My Account, My Orders, Logout. Guest: Sign In, Create Account.
No admin surface is exposed to customers.

Layering is unchanged: **UI → Hooks → Services → Data.** New work reuses the existing
components (`Button`, `Select`, `Textarea`, `Badge`, `States`, `Toast`), the existing animation
system and the existing tokens. No new palette, no hardcoded colours, no new heavy dependency,
no `alert()`/`confirm()`.

### Design & accessibility

Mobile-first; verified free of horizontal overflow at **320, 360, 375, 390, 414, 768, 1024,
1280, 1440 and 1920 px**. Items render as cards below `md` and as a table at `md` and above.
Every checkout control has an accessible name and is keyboard reachable with a visible focus
ring. **Order status is always written in words** — colour is reinforcement, never the only
signal.

---

## 11. Defects found and fixed during Stage 6

These were found by testing the running stack, and each is now covered by a regression test.

**1. Concurrent checkouts returned 500 (data-integrity bug).**
Order-number allocation read the highest number for the day and added one — a read-modify-write.
Five customers checking out simultaneously derived the same number; the `UNIQUE` constraint
correctly blocked the duplicates, but **three of five customers got a 500** and lost their order.
Fixed with a transaction-scoped PostgreSQL advisory lock
(`pg_advisory_xact_lock`), which serializes just the allocation and is released automatically on
commit *or* rollback. No new dependency; the `UNIQUE` constraint remains the last line of defence.
Now 5/5 succeed with unique sequential numbers.

**2. A 500 leaked internal details.**
The error handler interpolated `String(error)` into the response outside production, so a Prisma
failure shipped absolute source paths, model names and SQL detail to the browser. A dev-only leak
still reaches screenshots and bug reports. The body is now always a fixed message plus a short
`errorId` that correlates to the full server-side log line.

**3. Malformed JSON was reported as 500.** Now a clean **400** "Malformed request body."

**4. The storefront advertised a promise the server would not honour.**
The header promised free delivery over PKR 5,000 while the backend threshold was 10,000 — an
Rs 8,290 order was charged Rs 250. The backend threshold is now 5,000, and the header derives the
figure from `STORE_CONFIG` via `formatPrice` instead of hardcoding "PKR 5,000".

---

## 12. Testing

`node /home/user/audit6.mjs` — **226/226**, run against the real stack: the production build on
`:4173`, the Express API on `:4000`, and PostgreSQL inspected directly with `psql`. Nothing is
mocked. The harness is idempotent and self-cleaning: it deletes its own rows, restores stock and
restores any mutated product.

1. Schema & scope — tables, no out-of-scope tables, **no size/colour table or enum**, indexes, snapshot columns
2. Guest & cross-customer boundaries
3. Server-authoritative pricing — client money fields ignored
4. Purchase-time snapshot in PostgreSQL, exact variant strings
5. Stock — decrement, over-order rejected, no negative stock, no partial order
6. Variant validation, including products with no sizes/colours
7. Checkout validation (422, human-readable field errors)
8. Duplicate submission — same key, and 5 concurrent submits
9. Ownership — 404 not 403, no existence leak, customer blocked from admin
10. PDF invoice — real text extracted with `pdftotext`
11. **Snapshot test (§24)** — product mutated, order + reprinted invoice unchanged
12. Status transitions — legal path and every refusal
13. Cancellation restores stock exactly once, incl. 5 concurrent cancels
14. Admin search / filter / sort
15. Error hygiene — no leaked internals, incl. a forced 500
15b. **Concurrent distinct checkouts** — 5 simultaneous orders, all 201, unique numbers
16. Browser — full customer journey (guest redirect → register → PDP → checkout → double-click → success → refresh → history → detail)
17. Browser — admin journey (list, search, detail, status change, persistence after hard reload)
18. **Stage 1–5 regression** — homepage, SEO, shop grid, search, PDP, API health, 17 products, auth still enforced
19. Responsive — 10 widths × 3 pages
20. Accessibility — accessible names, keyboard focus, status not by colour alone

Plus the standing green baseline: frontend `tsc -b` **0 errors**, `npm run lint` **0 errors**
(2 pre-existing `only-export-components` warnings), `npm run build` **OK**, backend
`tsc --noEmit` **0 errors**, and **no console errors** anywhere in the browser runs.

Screenshots: `/home/user/shots6/` (16 captures, including the rendered invoice).

---

## 13. Scope discipline

Not built, by instruction: AI, payment gateways, coupons, reviews, wishlist, delivery/tracking
APIs, email/SMS/WhatsApp, advanced analytics, loyalty. Only `Order` and `OrderItem` were added.
`pdfkit` is the single new dependency.

**Email integration point:** order creation returns the complete order object from one place
(`createOrder` in `src/services/orders.ts`). A confirmation email would be dispatched from that
single call site — nothing is stubbed, faked or half-wired in anticipation.

---

## 14. Stage 7 integration points

- **Order events** — `createOrder` and the status-transition service are the two chokepoints
  where notifications, webhooks or fulfilment hooks belong.
- **Payments** — `paymentStatus` already exists as a plain string; a gateway would add its own
  model rather than reshaping `Order`.
- **Shipping** — `calculateShipping(subtotal)` is a single pure function reading configuration;
  a rate API replaces its body without touching any route or component.
- **Invoices** — `src/services/invoice.ts` renders purely from a serialized order, so tax lines
  or a redesign are local changes.
- **Admin** — `/admin/orders` is intentionally a plain list; any future reporting should be a
  separate surface, not bolted onto it.
