import { chromium } from '/home/user/node_modules/playwright-core/index.mjs';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/**
 * Stage 6 audit — orders, checkout, stock, invoices, authorization.
 *
 * Everything is verified against the real running stack: the production build
 * served by `vite preview`, the Express API, and PostgreSQL inspected directly
 * with psql. Nothing is mocked and no result is assumed.
 *
 * The suite is idempotent: it cleans up its own rows, restores any stock it
 * moves, and can be re-run without drifting the database.
 */

const BASE = 'http://localhost:4173';
const API = 'http://localhost:4000/api';
const ADMIN = { email: 'admin@shelina.local', password: 'shelina-dev-2026' };
const H = { 'Content-Type': 'application/json' };

let pass = 0;
let fail = 0;
const failures = [];
const consoleErrors = [];

function ok(cond, name, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const psql = (sql) =>
  execSync(
    `PATH=/usr/lib/postgresql/17/bin:$PATH psql -h 127.0.0.1 -U shelina -d shelina_dev -tAc ${JSON.stringify(sql)}`,
    { shell: '/bin/bash', encoding: 'utf8' },
  ).trim();

const sqlStr = (value) => String(value).replace(/'/g, "''");

async function apiFetch(path, init) {
  const res = await fetch(`${API}${path}`, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON (e.g. a PDF) */
  }
  return { status: res.status, body, headers: res.headers, res };
}

/** Extracts the session cookie pair from a login/register response. */
function cookieOf(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

/* ═══════════ Clean up anything a previous aborted run left ═══════════ */
psql(`DELETE FROM order_items WHERE "orderId" IN (SELECT id FROM orders WHERE "customerEmail" LIKE 'audit6%@example.com')`);
psql(`DELETE FROM orders WHERE "customerEmail" LIKE 'audit6%@example.com'`);
psql(`DELETE FROM orders WHERE "customerId" IN (SELECT id FROM customer_users WHERE email LIKE 'audit6%@example.com')`);
psql(`DELETE FROM customer_users WHERE email LIKE 'audit6%@example.com'`);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
context.on('page', (p) => {
  p.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[console] ${m.text()}`);
  });
  p.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));
});

/* ═══════════════════ 1. Schema and scope ═══════════════════ */
console.log('\n──────── 1. Order schema and Stage 6 scope ────────');

ok(psql(`SELECT to_regclass('public.orders') IS NOT NULL`) === 't', 'orders table exists');
ok(psql(`SELECT to_regclass('public.order_items') IS NOT NULL`) === 't', 'order_items table exists');

// Stage 7+ models must NOT have been created.
for (const table of ['payments', 'coupons', 'reviews', 'wishlists', 'analytics', 'order_payments']) {
  ok(
    psql(`SELECT to_regclass('public.${table}') IS NULL`) === 't',
    `out-of-scope table is ABSENT: ${table}`,
  );
}

// The permanent rule: no global size/colour dictionary, ever.
ok(
  psql(
    `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%size%' OR table_name ILIKE '%colour%' OR table_name ILIKE '%color%')`,
  ) === '0',
  'still NO global size/colour table',
);
ok(
  psql(`SELECT count(*) FROM pg_type WHERE typname ILIKE '%size%' OR typname ILIKE '%color%'`) === '0',
  'still NO size/colour enum type',
);

// Required indexes (§37), and no more than needed.
const orderIdx = psql(`SELECT string_agg(indexname, ',' ORDER BY indexname) FROM pg_indexes WHERE tablename='orders'`);
for (const idx of ['orders_orderNumber_key', 'orders_customerId_idx', 'orders_status_idx', 'orders_createdAt_idx']) {
  ok(orderIdx.includes(idx), `index present: ${idx}`);
}
const itemIdx = psql(`SELECT string_agg(indexname, ',' ORDER BY indexname) FROM pg_indexes WHERE tablename='order_items'`);
ok(itemIdx.includes('order_items_orderId_idx'), 'index present: order_items_orderId_idx');
ok(itemIdx.includes('order_items_productId_idx'), 'index present: order_items_productId_idx');

// Snapshot columns must exist on the item, not be inferred from Product.
const itemCols = psql(
  `SELECT string_agg(column_name, ',' ORDER BY column_name) FROM information_schema.columns WHERE table_name='order_items'`,
);
for (const col of ['productName', 'sku', 'size', 'color', 'quantity', 'unitPrice', 'lineTotal', 'productImage']) {
  ok(itemCols.split(',').includes(col), `order_items snapshot column: ${col}`);
}

/* ═══════════════════ 2. Auth boundaries ═══════════════════ */
console.log('\n──────── 2. Guest and cross-customer boundaries ────────');

const guestOrder = await apiFetch('/orders', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ customerName: 'x', items: [] }),
});
ok(guestOrder.status === 401, 'guest CANNOT create an order', String(guestOrder.status));

const guestList = await apiFetch('/orders');
ok(guestList.status === 401, 'guest CANNOT list orders', String(guestList.status));

const guestAdmin = await apiFetch('/admin/orders');
ok(guestAdmin.status === 401, 'guest CANNOT reach admin orders', String(guestAdmin.status));

// Two real customers, created through the API.
const stamp = Date.now();
const buyerEmail = `audit6-buyer-${stamp}@example.com`;
const otherEmail = `audit6-other-${stamp}@example.com`;

const buyerRes = await apiFetch('/auth/customer/register', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ name: 'Audit Buyer', email: buyerEmail, password: 'audit-pass-1234' }),
});
const buyerCookie = cookieOf(buyerRes.res);
ok(buyerRes.status === 201 && buyerCookie.length > 0, 'buyer account created');

const otherRes = await apiFetch('/auth/customer/register', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ name: 'Audit Other', email: otherEmail, password: 'audit-pass-1234' }),
});
const otherCookie = cookieOf(otherRes.res);
ok(otherRes.status === 201 && otherCookie.length > 0, 'second customer created');

const adminRes = await apiFetch('/auth/admin/login', {
  method: 'POST',
  headers: H,
  body: JSON.stringify(ADMIN),
});
const adminCookie = cookieOf(adminRes.res);
ok(adminRes.status === 200 && adminCookie.length > 0, 'admin signed in');

/* ═══════════════════ 3. Pricing is server-side ═══════════════════ */
console.log('\n──────── 3. Server-authoritative pricing ────────');

// A product with sizes, colours and healthy stock.
const productId = psql(
  `SELECT id FROM products WHERE status='active' AND stock >= 6 AND jsonb_array_length(sizes::jsonb) > 0 AND jsonb_array_length(colors::jsonb) > 0 ORDER BY stock DESC LIMIT 1`,
);
const productRow = psql(
  `SELECT name||'§'||COALESCE(sku,'')||'§'||price||'§'||COALESCE("salePrice"::text,'')||'§'||stock FROM products WHERE id='${productId}'`,
).split('§');
const [pName, pSku, pPrice, pSale, pStock] = productRow;
const realUnit = pSale ? Number(pSale) : Number(pPrice);
const size = psql(`SELECT sizes::jsonb->0->>'value' FROM products WHERE id='${productId}'`);
const colour = psql(`SELECT colors::jsonb->0->>'name' FROM products WHERE id='${productId}'`);
console.log(`      (using "${pName}" — ${size} / ${colour}, unit Rs ${realUnit}, stock ${pStock})`);

const details = {
  customerName: 'Audit Buyer',
  customerEmail: buyerEmail,
  customerPhone: '03001234567',
  shippingAddress: '12 Audit Street, Gulberg',
  city: 'Lahore',
};

// Client lies about every money field it can think of.
const tampered = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({
    ...details,
    subtotal: 1,
    grandTotal: 1,
    shippingFee: 0,
    total: 1,
    items: [{ productId, size, color: colour, quantity: 2, unitPrice: 1, lineTotal: 2, price: 1 }],
  }),
});
ok(tampered.status === 201, 'order accepted', String(tampered.status));

const order1 = tampered.body?.data;
ok(order1?.items?.[0]?.unitPrice === realUnit, 'client unitPrice IGNORED — DB price used', `Rs ${order1?.items?.[0]?.unitPrice}`);
ok(order1?.subtotal === realUnit * 2, 'client subtotal IGNORED — server recalculated', `Rs ${order1?.subtotal}`);
ok(order1?.grandTotal === order1?.subtotal + order1?.shippingFee, 'grand total = subtotal + shipping');
ok(order1?.shippingFee >= 0, 'shipping fee set by the server', `Rs ${order1?.shippingFee}`);

// Order number format and uniqueness.
ok(/^SHL-\d{8}-\d{4}$/.test(order1?.orderNumber ?? ''), 'human-readable order number', order1?.orderNumber);
ok(order1?.orderNumber !== order1?.id, 'order number is NOT the database id');
ok(
  psql(`SELECT count(DISTINCT "orderNumber") = count(*) FROM orders`) === 't',
  'every order number in the table is unique',
);
ok(order1?.status === 'PENDING', 'new order starts PENDING', order1?.status);
ok(order1?.paymentStatus === 'UNPAID', 'payment state is UNPAID (Cash on Delivery)');

/* ═══════════════════ 4. Snapshots and variants in the DB ═══════════════════ */
console.log('\n──────── 4. Purchase-time snapshot in PostgreSQL ────────');

const dbItem = psql(
  `SELECT "productName"||'§'||COALESCE(sku,'')||'§'||COALESCE(size,'')||'§'||COALESCE(color,'')||'§'||quantity||'§'||"unitPrice"||'§'||"lineTotal" FROM order_items WHERE "orderId"='${order1.id}'`,
).split('§');
ok(dbItem[0] === pName, 'productName snapshotted', dbItem[0]);
ok(dbItem[1] === pSku, 'sku snapshotted', dbItem[1]);
ok(dbItem[2] === size, 'EXACT size string stored verbatim', `"${dbItem[2]}"`);
ok(dbItem[3] === colour, 'EXACT colour string stored verbatim', `"${dbItem[3]}"`);
ok(Number(dbItem[4]) === 2, 'quantity stored');
ok(Number(dbItem[5]) === realUnit, 'unitPrice snapshotted');
ok(Number(dbItem[6]) === realUnit * 2, 'lineTotal = unitPrice × quantity');
ok(
  psql(`SELECT "customerId" FROM orders WHERE id='${order1.id}'`) ===
    psql(`SELECT id FROM customer_users WHERE email='${sqlStr(buyerEmail)}'`),
  'order is linked to the correct customer',
);

/* ═══════════════════ 5. Stock ═══════════════════ */
console.log('\n──────── 5. Stock handling ────────');

const stockAfter = Number(psql(`SELECT stock FROM products WHERE id='${productId}'`));
ok(stockAfter === Number(pStock) - 2, 'stock decreased by the ordered quantity', `${pStock} → ${stockAfter}`);

const overStock = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, items: [{ productId, size, color: colour, quantity: 95 }] }),
});
ok(overStock.status === 409, 'ordering more than stock is REJECTED (409)', String(overStock.status));
ok(
  Number(psql(`SELECT stock FROM products WHERE id='${productId}'`)) === stockAfter,
  'a rejected order does not touch stock',
);
ok(
  psql(`SELECT count(*) FROM orders WHERE "customerEmail"='${sqlStr(buyerEmail)}'`) === '1',
  'no partial order row was created',
);
ok(Number(psql(`SELECT min(stock) FROM products`)) >= 0, 'no product has negative stock');

const zeroQty = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, items: [{ productId, size, color: colour, quantity: 0 }] }),
});
ok(zeroQty.status === 422, 'quantity 0 is rejected', String(zeroQty.status));

const negQty = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, items: [{ productId, size, color: colour, quantity: -3 }] }),
});
ok(negQty.status === 422, 'negative quantity is rejected', String(negQty.status));

/* ═══════════════════ 6. Variant validation ═══════════════════ */
console.log('\n──────── 6. Variant validation (per product, no dictionary) ────────');

const badSize = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, items: [{ productId, size: 'UK 999', color: colour, quantity: 1 }] }),
});
ok(badSize.status === 409, 'a size this product does not offer is rejected', String(badSize.status));

const badColour = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, items: [{ productId, size, color: 'Invisible Mauve', quantity: 1 }] }),
});
ok(badColour.status === 409, 'a colour this product does not offer is rejected', String(badColour.status));

// A product with NO sizes must still be orderable — free-form means optional.
const noSizeProduct = psql(
  `SELECT id FROM products WHERE status='active' AND stock > 2 AND jsonb_array_length(sizes::jsonb) = 0 LIMIT 1`,
);
if (noSizeProduct) {
  const noSizeColour = psql(`SELECT colors::jsonb->0->>'name' FROM products WHERE id='${noSizeProduct}'`);
  const r = await apiFetch('/orders', {
    method: 'POST',
    headers: { ...H, Cookie: buyerCookie },
    body: JSON.stringify({
      ...details,
      items: [{ productId: noSizeProduct, size: null, color: noSizeColour === '' ? null : noSizeColour, quantity: 1 }],
    }),
  });
  ok(r.status === 201, 'a product with NO sizes can still be ordered', String(r.status));
  if (r.body?.data?.id) {
    psql(`DELETE FROM order_items WHERE "orderId"='${r.body.data.id}'`);
    psql(`DELETE FROM orders WHERE id='${r.body.data.id}'`);
    psql(`UPDATE products SET stock = stock + 1 WHERE id='${noSizeProduct}'`);
  }
}

const draftId = psql(`SELECT id FROM products WHERE status <> 'active' LIMIT 1`);
if (draftId) {
  const draftSize = psql(`SELECT sizes::jsonb->0->>'value' FROM products WHERE id='${draftId}'`);
  const r = await apiFetch('/orders', {
    method: 'POST',
    headers: { ...H, Cookie: buyerCookie },
    body: JSON.stringify({
      ...details,
      items: [{ productId: draftId, size: draftSize || null, color: null, quantity: 1 }],
    }),
  });
  ok(r.status === 409, 'a non-active product cannot be purchased', String(r.status));
}

const ghost = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, items: [{ productId: 'does-not-exist', size: null, color: null, quantity: 1 }] }),
});
ok(ghost.status === 409, 'a non-existent product is rejected', String(ghost.status));

/* ═══════════════════ 7. Checkout validation ═══════════════════ */
console.log('\n──────── 7. Checkout information validation ────────');

const emptyCart = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, items: [] }),
});
ok(emptyCart.status === 422, 'empty cart is rejected (422)', String(emptyCart.status));

const noDetails = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ items: [{ productId, size, color: colour, quantity: 1 }] }),
});
ok(noDetails.status === 422, 'missing shipping details rejected (422)', String(noDetails.status));
ok(
  typeof noDetails.body?.errors?.customerName === 'string' &&
    !/expected string/i.test(noDetails.body.errors.customerName),
  'field errors are human-readable',
  noDetails.body?.errors?.customerName,
);

const badEmail = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, customerEmail: 'not-an-email', items: [{ productId, size, color: colour, quantity: 1 }] }),
});
ok(badEmail.status === 422, 'invalid email rejected', String(badEmail.status));

/* ═══════════════════ 8. Idempotency ═══════════════════ */
console.log('\n──────── 8. Duplicate submission ────────');

const key = `audit6-${stamp}`;
const dupBody = JSON.stringify({
  ...details,
  idempotencyKey: key,
  items: [{ productId, size, color: colour, quantity: 1 }],
});
const first = await apiFetch('/orders', { method: 'POST', headers: { ...H, Cookie: buyerCookie }, body: dupBody });
const second = await apiFetch('/orders', { method: 'POST', headers: { ...H, Cookie: buyerCookie }, body: dupBody });
ok(
  first.body?.data?.orderNumber === second.body?.data?.orderNumber,
  'a repeated submit returns the SAME order',
  first.body?.data?.orderNumber,
);
ok(psql(`SELECT count(*) FROM orders WHERE "idempotencyKey"='${sqlStr(key)}'`) === '1', 'only ONE order row exists for that key');

// And under genuine concurrency.
const raceKey = `audit6-race-${stamp}`;
const raceBody = JSON.stringify({
  ...details,
  idempotencyKey: raceKey,
  items: [{ productId, size, color: colour, quantity: 1 }],
});
await Promise.all(
  Array.from({ length: 5 }, () =>
    apiFetch('/orders', { method: 'POST', headers: { ...H, Cookie: buyerCookie }, body: raceBody }).catch(() => null),
  ),
);
ok(
  psql(`SELECT count(*) FROM orders WHERE "idempotencyKey"='${sqlStr(raceKey)}'`) === '1',
  '5 CONCURRENT submits still create exactly one order',
);

/* ═══════════════════ 9. Ownership ═══════════════════ */
console.log('\n──────── 9. Order ownership ────────');

const mine = await apiFetch('/orders', { headers: { Cookie: buyerCookie } });
ok(mine.status === 200 && mine.body.data.length >= 1, 'customer sees their own orders', `${mine.body?.data?.length}`);
ok(
  mine.body.data.every((o) => o.customerEmail === buyerEmail),
  'the list contains ONLY this customer\'s orders',
);

const theirs = await apiFetch(`/orders/${order1.id}`, { headers: { Cookie: otherCookie } });
ok(theirs.status === 404, "another customer's order returns 404", String(theirs.status));
ok(
  !JSON.stringify(theirs.body ?? {}).includes(buyerEmail),
  'the 404 leaks nothing about the real order',
);

const theirsInvoice = await apiFetch(`/orders/${order1.id}/invoice`, { headers: { Cookie: otherCookie } });
ok(theirsInvoice.status === 404, "another customer's INVOICE is refused", String(theirsInvoice.status));

const anonInvoice = await apiFetch(`/orders/${order1.id}/invoice`);
ok(anonInvoice.status === 401, 'unauthenticated invoice download is refused (401)', String(anonInvoice.status));

const custAdminList = await apiFetch('/admin/orders', { headers: { Cookie: buyerCookie } });
ok(custAdminList.status === 401, 'customer CANNOT list admin orders', String(custAdminList.status));

const custStatus = await apiFetch(`/admin/orders/${order1.id}/status`, {
  method: 'PATCH',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ status: 'DELIVERED' }),
});
ok(custStatus.status === 401, 'customer CANNOT change order status', String(custStatus.status));
ok(
  psql(`SELECT status FROM orders WHERE id='${order1.id}'`) === 'PENDING',
  'the order status really is unchanged',
);

/* ═══════════════════ 10. Invoice ═══════════════════ */
console.log('\n──────── 10. PDF invoice ────────');

const invRes = await fetch(`${API}/orders/${order1.id}/invoice`, { headers: { Cookie: buyerCookie } });
const invBuf = Buffer.from(await invRes.arrayBuffer());
ok(invRes.status === 200, 'customer downloads their own invoice', String(invRes.status));
ok(invRes.headers.get('content-type') === 'application/pdf', 'served as application/pdf');
ok(
  (invRes.headers.get('content-disposition') ?? '').includes(order1.orderNumber),
  'filename carries the order number',
);
ok(invBuf.subarray(0, 4).toString() === '%PDF', 'the body is a real PDF');
ok(invBuf.length > 1000, 'PDF has real content', `${invBuf.length} bytes`);

writeFileSync('/tmp/audit6-invoice.pdf', invBuf);
const invText = execSync('pdftotext -layout /tmp/audit6-invoice.pdf - 2>/dev/null || true', {
  shell: '/bin/bash',
  encoding: 'utf8',
});
ok(invText.includes('SHELINA'), 'invoice shows the Shelina brand');
ok(invText.includes(order1.orderNumber), 'invoice shows the order number');
ok(invText.includes(pName), 'invoice shows the product name');
ok(invText.includes(size), `invoice shows the EXACT size (${size})`);
ok(invText.includes(colour), `invoice shows the EXACT colour (${colour})`);
if (pSku) ok(invText.includes(pSku), 'invoice shows the SKU');
ok(invText.includes('Cash on Delivery'), 'invoice states Cash on Delivery');
ok(/Grand total/i.test(invText), 'invoice shows a grand total');

const adminInv = await fetch(`${API}/orders/${order1.id}/invoice`, { headers: { Cookie: adminCookie } });
ok(adminInv.status === 200, 'admin can download ANY invoice', String(adminInv.status));

/* ═══════════════════ 11. THE SNAPSHOT TEST (§44) ═══════════════════ */
console.log('\n──────── 11. Historical order survives product edits ────────');

const beforeName = psql(`SELECT "productName" FROM order_items WHERE "orderId"='${order1.id}'`);
const beforePrice = psql(`SELECT "unitPrice" FROM order_items WHERE "orderId"='${order1.id}'`);

// Restoring the catalogue is registered BEFORE the mutation, so an interrupted
// run (SIGPIPE from `| head`, Ctrl-C, a thrown assertion) can never leave a
// product renamed in the database.
const restoreProduct = () =>
  psql(
    `UPDATE products SET name='${sqlStr(pName)}', sku='${sqlStr(pSku)}', price=${pPrice}, "salePrice"=${pSale === '' ? 'NULL' : pSale} WHERE id='${productId}'`,
  );
let productMutated = false;
const emergencyRestore = () => {
  if (productMutated) {
    productMutated = false;
    try {
      restoreProduct();
    } catch {
      /* nothing left to do while dying */
    }
  }
};
process.on('exit', emergencyRestore);
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGPIPE']) {
  process.on(signal, () => {
    emergencyRestore();
    process.exit(1);
  });
}
process.on('uncaughtException', (err) => {
  emergencyRestore();
  console.error(err);
  process.exit(1);
});

// Mutate the catalogue underneath the order, directly in SQL.
productMutated = true;
psql(
  `UPDATE products SET name='MUTATED PRODUCT NAME', sku='MUTATED-SKU-001', price=987654, "salePrice"=NULL WHERE id='${productId}'`,
);

const afterEdit = await apiFetch(`/orders/${order1.id}`, { headers: { Cookie: buyerCookie } });
const editedItem = afterEdit.body?.data?.items?.[0];
ok(editedItem?.productName === beforeName, 'order STILL shows the original product name', editedItem?.productName);
ok(String(editedItem?.unitPrice) === beforePrice, 'order STILL shows the original price', `Rs ${editedItem?.unitPrice}`);
ok(editedItem?.sku === pSku, 'order STILL shows the original SKU', editedItem?.sku);
ok(editedItem?.size === size, 'order STILL shows the original size');
ok(editedItem?.color === colour, 'order STILL shows the original colour');
ok(afterEdit.body?.data?.grandTotal === order1.grandTotal, 'order total is unchanged by the edit');

const invAfter = await fetch(`${API}/orders/${order1.id}/invoice`, { headers: { Cookie: buyerCookie } });
writeFileSync('/tmp/audit6-invoice2.pdf', Buffer.from(await invAfter.arrayBuffer()));
const invText2 = execSync('pdftotext -layout /tmp/audit6-invoice2.pdf - 2>/dev/null || true', {
  shell: '/bin/bash',
  encoding: 'utf8',
});
ok(invText2.includes(pName), 'REPRINTED invoice still shows the original name');
ok(!invText2.includes('MUTATED PRODUCT NAME'), 'reprinted invoice does NOT show the new name');
ok(!invText2.includes('MUTATED-SKU-001'), 'reprinted invoice does NOT show the new SKU');

// Put the catalogue back.
restoreProduct();
productMutated = false;
ok(psql(`SELECT name FROM products WHERE id='${productId}'`) === pName, 'product restored after the snapshot test');

/* ═══════════════════ 12. Status transitions ═══════════════════ */
console.log('\n──────── 12. Admin status transitions ────────');

const illegal = await apiFetch(`/admin/orders/${order1.id}/status`, {
  method: 'PATCH',
  headers: { ...H, Cookie: adminCookie },
  body: JSON.stringify({ status: 'DELIVERED' }),
});
ok(illegal.status === 409, 'PENDING → DELIVERED is refused', String(illegal.status));

const bogus = await apiFetch(`/admin/orders/${order1.id}/status`, {
  method: 'PATCH',
  headers: { ...H, Cookie: adminCookie },
  body: JSON.stringify({ status: 'TELEPORTED' }),
});
ok(bogus.status === 400, 'an unknown status value is refused', String(bogus.status));

for (const [from, to] of [
  ['PENDING', 'CONFIRMED'],
  ['CONFIRMED', 'PROCESSING'],
  ['PROCESSING', 'SHIPPED'],
  ['SHIPPED', 'DELIVERED'],
]) {
  const r = await apiFetch(`/admin/orders/${order1.id}/status`, {
    method: 'PATCH',
    headers: { ...H, Cookie: adminCookie },
    body: JSON.stringify({ status: to }),
  });
  ok(r.status === 200 && r.body?.data?.status === to, `${from} → ${to} allowed`);
}
ok(psql(`SELECT status FROM orders WHERE id='${order1.id}'`) === 'DELIVERED', 'final status persisted in PostgreSQL');

const afterDelivered = await apiFetch(`/admin/orders/${order1.id}/status`, {
  method: 'PATCH',
  headers: { ...H, Cookie: adminCookie },
  body: JSON.stringify({ status: 'PENDING' }),
});
ok(afterDelivered.status === 409, 'DELIVERED → PENDING is refused (terminal)', String(afterDelivered.status));

const cancelDelivered = await apiFetch(`/admin/orders/${order1.id}/status`, {
  method: 'PATCH',
  headers: { ...H, Cookie: adminCookie },
  body: JSON.stringify({ status: 'CANCELLED' }),
});
ok(cancelDelivered.status === 409, 'a DELIVERED order cannot be cancelled', String(cancelDelivered.status));

/* ═══════════════════ 13. Cancellation restores stock once ═══════════════════ */
console.log('\n──────── 13. Cancellation restores stock exactly once ────────');

const stockBeforeCancelOrder = Number(psql(`SELECT stock FROM products WHERE id='${productId}'`));
const cancelMe = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, items: [{ productId, size, color: colour, quantity: 3 }] }),
});
const cancelId = cancelMe.body.data.id;
ok(
  Number(psql(`SELECT stock FROM products WHERE id='${productId}'`)) === stockBeforeCancelOrder - 3,
  'stock reserved by the new order',
);

const c1 = await apiFetch(`/admin/orders/${cancelId}/status`, {
  method: 'PATCH',
  headers: { ...H, Cookie: adminCookie },
  body: JSON.stringify({ status: 'CANCELLED' }),
});
ok(c1.status === 200, 'PENDING → CANCELLED allowed');
ok(
  Number(psql(`SELECT stock FROM products WHERE id='${productId}'`)) === stockBeforeCancelOrder,
  'cancelling RESTORED the stock',
);
ok(psql(`SELECT "stockRestoredAt" IS NOT NULL FROM orders WHERE id='${cancelId}'`) === 't', 'restoration is stamped');

const c2 = await apiFetch(`/admin/orders/${cancelId}/status`, {
  method: 'PATCH',
  headers: { ...H, Cookie: adminCookie },
  body: JSON.stringify({ status: 'CANCELLED' }),
});
ok(c2.status === 409, 'a second cancellation is refused', String(c2.status));
ok(
  Number(psql(`SELECT stock FROM products WHERE id='${productId}'`)) === stockBeforeCancelOrder,
  'stock was NOT restored twice',
);

// Concurrency: five simultaneous cancels of a fresh order.
const raceOrder = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: JSON.stringify({ ...details, items: [{ productId, size, color: colour, quantity: 2 }] }),
});
const raceId = raceOrder.body.data.id;
const stockDuringRace = Number(psql(`SELECT stock FROM products WHERE id='${productId}'`));
await Promise.all(
  Array.from({ length: 5 }, () =>
    apiFetch(`/admin/orders/${raceId}/status`, {
      method: 'PATCH',
      headers: { ...H, Cookie: adminCookie },
      body: JSON.stringify({ status: 'CANCELLED' }),
    }).catch(() => null),
  ),
);
ok(
  Number(psql(`SELECT stock FROM products WHERE id='${productId}'`)) === stockDuringRace + 2,
  '5 CONCURRENT cancellations restore stock exactly once',
);

/* ═══════════════════ 14. Admin search / filter / sort ═══════════════════ */
console.log('\n──────── 14. Admin order management ────────');

const all = await apiFetch('/admin/orders', { headers: { Cookie: adminCookie } });
ok(all.status === 200 && all.body.data.length > 0, 'admin sees all orders', `${all.body?.meta?.total} total`);

const byNumber = await apiFetch(`/admin/orders?search=${encodeURIComponent(order1.orderNumber)}`, {
  headers: { Cookie: adminCookie },
});
ok(byNumber.body.data.length === 1, 'search by order number works');

const byEmail = await apiFetch(`/admin/orders?search=${encodeURIComponent(buyerEmail)}`, {
  headers: { Cookie: adminCookie },
});
ok(byEmail.body.data.length >= 1, 'search by customer email works');

const byPhone = await apiFetch('/admin/orders?search=03001234567', { headers: { Cookie: adminCookie } });
ok(byPhone.body.data.length >= 1, 'search by phone works');

const byName = await apiFetch('/admin/orders?search=Audit%20Buyer', { headers: { Cookie: adminCookie } });
ok(byName.body.data.length >= 1, 'search by customer name works');

const cancelled = await apiFetch('/admin/orders?status=CANCELLED', { headers: { Cookie: adminCookie } });
ok(
  cancelled.body.data.length > 0 && cancelled.body.data.every((o) => o.status === 'CANCELLED'),
  'status filter works',
);

const high = await apiFetch('/admin/orders?sort=total-high', { headers: { Cookie: adminCookie } });
const highTotals = high.body.data.map((o) => o.grandTotal);
ok(
  highTotals.every((v, i) => i === 0 || highTotals[i - 1] >= v),
  'sort by highest total works',
);
const low = await apiFetch('/admin/orders?sort=total-low', { headers: { Cookie: adminCookie } });
const lowTotals = low.body.data.map((o) => o.grandTotal);
ok(
  lowTotals.every((v, i) => i === 0 || lowTotals[i - 1] <= v),
  'sort by lowest total works',
);
const oldest = await apiFetch('/admin/orders?sort=oldest', { headers: { Cookie: adminCookie } });
const dates = oldest.body.data.map((o) => new Date(o.createdAt).getTime());
ok(
  dates.every((v, i) => i === 0 || dates[i - 1] <= v),
  'sort by oldest works',
);

/* ═══════════════════ 15. Error hygiene ═══════════════════ */
console.log('\n──────── 15. Error responses leak nothing ────────');

const notFound = await apiFetch('/orders/nope-nope-nope', { headers: { Cookie: buyerCookie } });
ok(notFound.status === 404, 'unknown order id → 404');
const blob = JSON.stringify(notFound.body) + JSON.stringify(overStock.body) + JSON.stringify(noDetails.body);
for (const secret of ['postgresql://', 'shelina_dev', 'SESSION_SECRET', 'at Object.', 'node_modules', 'prisma']) {
  ok(!blob.includes(secret), `order errors do not leak: ${secret}`);
}
ok(notFound.body?.success === false && typeof notFound.body?.message === 'string', 'standard error envelope');

/**
 * Regression: an unexpected 500 must not describe itself.
 *
 * The dev branch of the error handler used to interpolate `String(error)` into
 * the response, which meant a Prisma failure shipped absolute source paths and
 * model names to the browser. Forced here with a deliberately malformed body.
 */
const forced = await apiFetch('/orders', {
  method: 'POST',
  headers: { ...H, Cookie: buyerCookie },
  body: '{"customerName":',
});
const forcedBlob = JSON.stringify(forced.body ?? {});
ok(forced.status === 400, 'a malformed request body is a 400, not a 500', String(forced.status));
for (const leak of ['/home/user', 'PrismaClient', 'tx.order', 'Invalid `', '.ts:']) {
  ok(!forcedBlob.includes(leak), `a 500 does not leak: ${leak}`);
}

/* ═══════════════ 15b. Concurrent DISTINCT checkouts ═══════════════ */
console.log('\n──────── 15b. Concurrent distinct checkouts ────────');

/**
 * Regression: order-number allocation is a read-modify-write, so five separate
 * customers checking out at the same instant used to derive the same number and
 * three of five got a 500. Distinct idempotency keys, so this is five genuinely
 * different orders racing — not the double-click case covered in section 8.
 */
const raceKeys = [1, 2, 3, 4, 5].map((n) => `${stamp}-race-${n}`);
const raced = await Promise.all(
  raceKeys.map((key) =>
    apiFetch('/orders', {
      method: 'POST',
      headers: { ...H, Cookie: buyerCookie },
      body: JSON.stringify({
        ...details,
        idempotencyKey: key,
        items: [{ productId, size, color: colour, quantity: 1 }],
      }),
    }),
  ),
);
ok(
  raced.every((r) => r.status === 201),
  'five concurrent DISTINCT checkouts all succeed',
  raced.map((r) => r.status).join(','),
);
const racedNumbers = raced.map((r) => r.body?.data?.orderNumber).filter(Boolean);
ok(new Set(racedNumbers).size === racedNumbers.length, 'every concurrent order got a UNIQUE number');
ok(racedNumbers.length === 5, 'all five orders exist', racedNumbers.length ? racedNumbers.join(', ') : 'none');

/* ═══════════════════ 16. Browser: customer journey ═══════════════════ */
console.log('\n──────── 16. Browser — full customer journey ────────');

const shopper = await context.newPage();
const shopperEmail = `audit6-shopper-${stamp}@example.com`;

await shopper.goto(`${BASE}/checkout`, { waitUntil: 'load' });
await shopper.waitForTimeout(2500);
ok(shopper.url().includes('/account/sign-in'), 'guest visiting /checkout is redirected to sign-in', shopper.url());
ok(shopper.url().includes('redirect=%2Fcheckout') || shopper.url().includes('redirect=/checkout'), 'the redirect target is preserved');

await shopper.goto(`${BASE}/account/register`, { waitUntil: 'load' });
await shopper.waitForTimeout(1500);
await shopper.fill('input[name=name]', 'Audit Shopper');
await shopper.fill('input[name=email]', shopperEmail);
await shopper.fill('input[name=password]', 'audit-pass-1234');
await shopper.click('button[type=submit]');
await shopper.waitForTimeout(2800);
ok(shopper.url().includes('/account'), 'customer registered in the browser');

// Empty-cart checkout.
await shopper.goto(`${BASE}/checkout`, { waitUntil: 'load' });
await shopper.waitForTimeout(2200);
const emptyText = await shopper.locator('body').innerText();
ok(/your cart is empty/i.test(emptyText), 'empty cart shows "Your cart is empty."');
ok(/continue shopping/i.test(emptyText), 'empty cart offers "Continue shopping"');

// Add a product, choosing variants in the UI.
const slug = psql(`SELECT slug FROM products WHERE id='${productId}'`);
await shopper.goto(`${BASE}/product/${slug}`, { waitUntil: 'load' });
await shopper.waitForTimeout(2200);
const groups = shopper.locator('[role=radiogroup]');
const chosen = [];
for (let i = 0; i < (await groups.count()); i += 1) {
  const option = groups.nth(i).getByRole('radio').or(groups.nth(i).locator('button')).first();
  if (await option.count()) {
    chosen.push((await option.innerText()).trim());
    await option.click();
    await shopper.waitForTimeout(250);
  }
}
await shopper.getByRole('button', { name: /Add to bag/i }).first().click();
await shopper.waitForTimeout(1500);
ok(true, `variants chosen in the UI: ${chosen.join(' / ')}`);

await shopper.goto(`${BASE}/checkout`, { waitUntil: 'load' });
await shopper.waitForTimeout(2500);
ok((await shopper.locator('h1').first().textContent())?.includes('Checkout'), 'checkout page renders');
const summary = await shopper.locator('aside').innerText();
ok(/Cash on Delivery/i.test(summary), 'checkout states Cash on Delivery');
ok(/Subtotal/i.test(summary) && /Total/i.test(summary), 'checkout shows a summary with totals');

// Submit with missing fields to prove client validation fires.
await shopper.getByRole('button', { name: /Place order/i }).click();
await shopper.waitForTimeout(900);
ok(
  psql(`SELECT count(*) FROM orders WHERE "customerEmail"='${sqlStr(shopperEmail)}'`) === '0',
  'submitting an incomplete form creates NO order',
);

await shopper.getByLabel(/^Full name\*?$/).fill('Audit Shopper');
await shopper.getByLabel(/^Email\*?$/).fill(shopperEmail);
await shopper.getByLabel(/^Phone\*?$/).fill('03009876543');
await shopper.getByLabel(/^Address\*?$/).fill('9 Browser Lane, Model Town');
await shopper.getByLabel(/^City\*?$/).fill('Karachi');
await shopper.getByLabel(/^Order notes$/).fill('Leave with the guard.');

const placeBtn = shopper.getByRole('button', { name: /Place order/i });
// Double-click to prove the idempotency guard holds through the UI.
await placeBtn.click();
await placeBtn.click({ force: true }).catch(() => {});
await shopper.waitForTimeout(4000);

ok(/\/order\/success\//.test(shopper.url()), 'redirected to the success page', shopper.url());
ok(
  psql(`SELECT count(*) FROM orders WHERE "customerEmail"='${sqlStr(shopperEmail)}'`) === '1',
  'a DOUBLE-CLICKED place order created exactly ONE order',
);

const successText = await shopper.locator('body').innerText();
ok(/Order placed successfully/i.test(successText), 'success page confirms the order');
const shopperOrderNumber = psql(
  `SELECT "orderNumber" FROM orders WHERE "customerEmail"='${sqlStr(shopperEmail)}'`,
);
ok(successText.includes(shopperOrderNumber), 'success page shows the order number', shopperOrderNumber);
ok(/Download invoice/i.test(successText), 'success page offers the invoice');

// Cart must be empty only AFTER a confirmed order.
const cartCount = await shopper.evaluate(() => {
  try {
    const raw = localStorage.getItem('shelina.cart.v1');
    return raw ? (JSON.parse(raw).items ?? []).length : 0;
  } catch {
    return -1;
  }
});
ok(cartCount === 0, 'cart cleared after a successful order', String(cartCount));

// Reloading the success page must not create another order.
await shopper.reload({ waitUntil: 'load' });
await shopper.waitForTimeout(2200);
ok(
  psql(`SELECT count(*) FROM orders WHERE "customerEmail"='${sqlStr(shopperEmail)}'`) === '1',
  'reloading the success page does NOT create a second order',
);

// My Orders
await shopper.goto(`${BASE}/account/orders`, { waitUntil: 'load' });
await shopper.waitForTimeout(2500);
const ordersText = await shopper.locator('body').innerText();
ok(ordersText.includes(shopperOrderNumber), 'My Orders lists the order');
ok(/View order/i.test(ordersText), 'each row offers "View order"');

await shopper.getByRole('link', { name: /View order/i }).first().click();
await shopper.waitForTimeout(2500);
const detailText = await shopper.locator('body').innerText();
ok(detailText.includes(shopperOrderNumber), 'order detail shows the order number');
ok(/Subtotal/i.test(detailText) && /Grand total/i.test(detailText), 'order detail shows totals');
for (const value of chosen) {
  if (value) ok(detailText.includes(value), `order detail shows the chosen variant "${value}"`);
}
ok(/Download invoice/i.test(detailText), 'order detail offers the invoice');

// The account menu must now offer My Orders.
await shopper.goto(`${BASE}/`, { waitUntil: 'load' });
await shopper.waitForTimeout(2000);
await shopper.getByRole('button', { name: /^Account/ }).click();
await shopper.waitForTimeout(800);
const menu = await shopper.getByRole('menu', { name: /Account/i }).innerText();
ok(/My Account/i.test(menu), 'signed-in menu shows My Account');
ok(/My Orders/i.test(menu), 'signed-in menu shows My Orders');
ok(/Logout/i.test(menu), 'signed-in menu shows Logout');
ok(!/Sign In/i.test(menu), 'signed-in menu hides the guest options');

/* ═══════════════════ 17. Browser: admin ═══════════════════ */
console.log('\n──────── 17. Browser — admin order management ────────');

const adminPage = await context.newPage();
await adminPage.goto(`${BASE}/admin/login`, { waitUntil: 'load' });
await adminPage.waitForTimeout(1200);
if (await adminPage.locator('input[name=email]').count()) {
  await adminPage.fill('input[name=email]', ADMIN.email);
  await adminPage.fill('input[name=password]', ADMIN.password);
  await adminPage.click('button[type=submit]');
  await adminPage.waitForTimeout(2500);
}

await adminPage.goto(`${BASE}/admin/orders`, { waitUntil: 'load' });
await adminPage.waitForTimeout(2500);
ok((await adminPage.locator('h1').first().textContent())?.includes('Orders'), 'admin Orders page renders');
ok(
  (await adminPage.locator('body').innerText()).includes(shopperOrderNumber),
  'admin list contains the browser-placed order',
);

// Sidebar link exists.
ok(
  (await adminPage.getByRole('link', { name: /^Orders$/ }).count()) > 0,
  'admin sidebar has an Orders entry',
);

// Search narrows the list.
await adminPage.getByLabel(/^Search$/).fill(shopperOrderNumber);
await adminPage.waitForTimeout(2000);
const searchRows = await adminPage.locator(`text=${shopperOrderNumber}`).count();
ok(searchRows > 0, 'admin search finds the order');

await adminPage.getByRole('link', { name: shopperOrderNumber }).first().click();
await adminPage.waitForTimeout(2500);
const adminDetail = await adminPage.locator('body').innerText();
ok(adminDetail.includes(shopperOrderNumber), 'admin order detail opens');
ok(adminDetail.includes('Audit Shopper'), 'admin sees the customer name');
ok(adminDetail.includes('9 Browser Lane, Model Town'), 'admin sees the shipping address');
ok(adminDetail.includes('Leave with the guard.'), 'admin sees the order notes');
for (const value of chosen) {
  if (value) ok(adminDetail.includes(value), `admin sees the exact variant "${value}"`);
}

// Change status through the UI and verify persistence after a reload.
await adminPage.getByLabel(/^Move to$/).selectOption('CONFIRMED');
await adminPage.getByRole('button', { name: /Update status/i }).click();
await adminPage.waitForTimeout(2500);
ok(
  psql(`SELECT status FROM orders WHERE "orderNumber"='${sqlStr(shopperOrderNumber)}'`) === 'CONFIRMED',
  'admin status change persisted to PostgreSQL',
);

await adminPage.reload({ waitUntil: 'load' });
await adminPage.waitForTimeout(2500);
ok(
  /Confirmed/i.test(await adminPage.locator('body').innerText()),
  'status still shows Confirmed after a hard reload',
);

/* ═══════════════════ 18. Stage 1–5 regression ═══════════════════ */
console.log('\n──────── 18. Stage 1–5 regression ────────');

const reg = await context.newPage();
await reg.goto(`${BASE}/`, { waitUntil: 'load' });
await reg.waitForTimeout(2200);
ok((await reg.locator('a[href^="/product/"]').count()) > 0, 'homepage still renders products');
ok((await reg.title()).length > 0, 'SEO title still applied', await reg.title());

await reg.goto(`${BASE}/shop`, { waitUntil: 'load' });
await reg.waitForTimeout(2200);
const shopCards = await reg.locator('a[href^="/product/"]').count();
ok(shopCards >= 15, 'shop grid still lists the catalogue', String(shopCards));

await reg.getByRole('searchbox').first().fill('sneaker');
await reg.waitForTimeout(1600);
const searched = await reg.locator('a[href^="/product/"]').count();
ok(searched > 0 && searched < shopCards, 'search still narrows results', String(searched));
await reg.getByRole('searchbox').first().fill('');
await reg.waitForTimeout(1200);

await reg.goto(`${BASE}/product/${slug}`, { waitUntil: 'load' });
await reg.waitForTimeout(2200);
ok((await reg.locator('h1').count()) === 1, 'product detail still renders');

const health = await apiFetch('/health');
ok(health.body?.data?.database === 'connected', 'API and database still healthy');

const products = await apiFetch('/products');
ok(products.body?.data?.length === 17, 'still 17 catalogue products', String(products.body?.data?.length));

const unauthProduct = await apiFetch('/products', { method: 'POST', headers: H, body: '{}' });
ok(unauthProduct.status === 401, 'unauthenticated product mutation still rejected');

/* ═══════════════════ 19. Responsive ═══════════════════ */
console.log('\n──────── 19. Responsive — no horizontal overflow ────────');

const widths = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920];
const routes = [
  ['/checkout', 'checkout'],
  ['/account/orders', 'my orders'],
  [`/account/orders/${psql(`SELECT id FROM orders WHERE "orderNumber"='${sqlStr(shopperOrderNumber)}'`)}`, 'order detail'],
];

// Re-add an item so /checkout renders the full form, not the empty state.
await shopper.goto(`${BASE}/product/${slug}`, { waitUntil: 'load' });
await shopper.waitForTimeout(2000);
const g2 = shopper.locator('[role=radiogroup]');
for (let i = 0; i < (await g2.count()); i += 1) {
  const o = g2.nth(i).getByRole('radio').or(g2.nth(i).locator('button')).first();
  if (await o.count()) {
    await o.click();
    await shopper.waitForTimeout(200);
  }
}
await shopper.getByRole('button', { name: /Add to bag/i }).first().click();
await shopper.waitForTimeout(1200);

for (const width of widths) {
  await shopper.setViewportSize({ width, height: 900 });
  for (const [path, label] of routes) {
    await shopper.goto(`${BASE}${path}`, { waitUntil: 'load' });
    await shopper.waitForTimeout(1300);
    const overflow = await shopper.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    ok(overflow <= 0, `no horizontal overflow @ ${width}px ${label}`, `${overflow}px`);
  }
}
await shopper.setViewportSize({ width: 1440, height: 900 });

/* ═══════════════════ 20. Accessibility ═══════════════════ */
console.log('\n──────── 20. Accessibility ────────');

await shopper.goto(`${BASE}/checkout`, { waitUntil: 'load' });
await shopper.waitForTimeout(2200);
const unlabelled = await shopper.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('input, select, textarea, button, a')) {
    if (el.type === 'hidden') continue;
    const name =
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      (el.labels && el.labels.length ? el.labels[0].textContent : '') ||
      el.textContent ||
      el.getAttribute('title');
    if (!name || !name.trim()) bad.push(el.tagName + (el.name ? `[name=${el.name}]` : ''));
  }
  return bad;
});
ok(unlabelled.length === 0, 'every checkout control has an accessible name', unlabelled.join(', ') || 'all named');

const focusable = await shopper.evaluate(() => {
  const first = document.querySelector('input[name=customerName]');
  if (!first) return false;
  first.focus();
  return document.activeElement === first;
});
ok(focusable, 'checkout fields are keyboard focusable');

// Status must never be conveyed by colour alone.
await shopper.goto(`${BASE}/account/orders`, { waitUntil: 'load' });
await shopper.waitForTimeout(2200);
const statusText = await shopper.locator('body').innerText();
ok(
  /Pending|Confirmed|Processing|Shipped|Delivered|Cancelled/i.test(statusText),
  'order status is written in words, not colour alone',
);

/* ═══════════════════ Cleanup ═══════════════════ */
console.log('\n──────── Cleanup ────────');

const auditOrderIds = psql(
  `SELECT string_agg(id, ',') FROM orders WHERE "customerEmail" LIKE 'audit6%@example.com'`,
);
// Return any stock still held by non-cancelled audit orders before deleting.
// `psql -tAc` takes a single statement on one line, so this is deliberately
// not pretty-printed.
psql(
  `UPDATE products p SET stock = stock + sub.qty FROM (SELECT oi."productId" AS pid, SUM(oi.quantity) AS qty FROM order_items oi JOIN orders o ON o.id = oi."orderId" WHERE o."customerEmail" LIKE 'audit6%@example.com' AND o."stockRestoredAt" IS NULL AND oi."productId" IS NOT NULL GROUP BY oi."productId") sub WHERE p.id = sub.pid`,
);
psql(`DELETE FROM order_items WHERE "orderId" IN (SELECT id FROM orders WHERE "customerEmail" LIKE 'audit6%@example.com')`);
psql(`DELETE FROM orders WHERE "customerEmail" LIKE 'audit6%@example.com'`);
psql(`DELETE FROM orders WHERE "customerId" IN (SELECT id FROM customer_users WHERE email LIKE 'audit6%@example.com')`);
psql(`DELETE FROM customer_users WHERE email LIKE 'audit6%@example.com'`);

ok(
  psql(`SELECT count(*) FROM orders WHERE "customerEmail" LIKE 'audit6%@example.com'`) === '0',
  'audit orders cleaned up',
);
ok(
  Number(psql(`SELECT stock FROM products WHERE id='${productId}'`)) === Number(pStock),
  'product stock restored to its pre-audit value',
  `${psql(`SELECT stock FROM products WHERE id='${productId}'`)} (was ${pStock})`,
);
ok(psql(`SELECT count(*) FROM products`) === '17', 'catalogue still has 17 products');
void auditOrderIds;

/* ═══════════════════ Summary ═══════════════════ */
console.log('\n=== CONSOLE / PAGE ERRORS ===');
const realErrors = consoleErrors.filter(
  // A 401/404 probe is an EXPECTED part of this suite; the browser logs the
  // failed fetch, but it is not an application error.
  (e) => !/401|404|Failed to load resource/i.test(e),
);
console.log(realErrors.length ? realErrors.slice(0, 10).join('\n') : 'none');
ok(realErrors.length === 0, 'no unexpected console or page errors', String(realErrors.length));

await browser.close();

console.log(`\n=== SUMMARY: ${pass}/${pass + fail} passed ===`);
if (failures.length) {
  console.log('\nFAILURES:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
process.exit(fail > 0 ? 1 : 0);
