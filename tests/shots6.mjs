import { chromium } from '/home/user/node_modules/playwright-core/index.mjs';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Captures the Stage 6 surfaces from the real production build on :4173.
 * Self-cleaning: the shopper it registers and the order it places are deleted
 * from PostgreSQL at the end and the stock it consumed is put back, so the
 * script can be re-run without drifting the database.
 *
 * Selectors mirror the ones proven in audit6.mjs.
 */

const BASE = 'http://localhost:4173';
const API = 'http://localhost:4000/api';
const OUT = '/home/user/shots6';
const H = { 'Content-Type': 'application/json' };
const EMAIL = `shots6-${Date.now()}@example.com`;
const PASSWORD = 'shots-pass-1234';

mkdirSync(OUT, { recursive: true });

const psql = (sql) =>
  execSync(
    `PATH=/usr/lib/postgresql/17/bin:$PATH psql -h 127.0.0.1 -U shelina -d shelina_dev -tAc ${JSON.stringify(sql)}`,
    { shell: '/bin/bash', encoding: 'utf8' },
  ).trim();

/** `.reveal` elements start at opacity 0 — scroll the page before shooting. */
async function settle(page) {
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 450));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 450));
  });
  await page.waitForTimeout(600);
}

async function shot(page, name, fullPage = true) {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log(`shot  ${name}`);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

/* ─────────── register ─────────── */
await page.goto(`${BASE}/account/register`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.fill('input[name=name]', 'Sana Iqbal');
await page.fill('input[name=email]', EMAIL);
await page.fill('input[name=password]', PASSWORD);
await page.click('button[type=submit]');
await page.waitForTimeout(3000);

/* ─────────── empty cart ─────────── */
await page.goto(`${BASE}/checkout`, { waitUntil: 'load' });
await page.waitForTimeout(2200);
await shot(page, '01-checkout-empty-cart');

/* ─────────── add a product, choosing variants in the UI ─────────── */
await page.goto(`${BASE}/product/drift-low-sneaker`, { waitUntil: 'load' });
await page.waitForTimeout(2200);
const groups = page.locator('[role=radiogroup]');
for (let i = 0; i < (await groups.count()); i += 1) {
  const option = groups.nth(i).getByRole('radio').or(groups.nth(i).locator('button')).first();
  if (await option.count()) {
    await option.click();
    await page.waitForTimeout(250);
  }
}
await page.getByRole('button', { name: /Add to bag/i }).first().click();
await page.waitForTimeout(1500);
await shot(page, '02-pdp-added-to-bag', false);

/* ─────────── checkout ─────────── */
await page.goto(`${BASE}/checkout`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await shot(page, '03-checkout-desktop');

await page.getByRole('button', { name: /Place order/i }).click();
await page.waitForTimeout(1200);
await shot(page, '04-checkout-validation');

await page.getByLabel(/^Full name\*?$/).fill('Sana Iqbal');
await page.getByLabel(/^Email\*?$/).fill(EMAIL);
await page.getByLabel(/^Phone\*?$/).fill('03001234567');
await page.getByLabel(/^Address\*?$/).fill('House 42, Street 9, Gulberg III');
await page.getByLabel(/^City\*?$/).fill('Lahore');
await page.getByLabel(/^Order notes$/).fill('Please call before delivery.');
await shot(page, '05-checkout-filled');

await page.getByRole('button', { name: /Place order/i }).click();
await page.waitForTimeout(5000);
const orderNumber = psql(`SELECT "orderNumber" FROM orders WHERE "customerEmail"='${EMAIL}'`);
await shot(page, '06-order-success');

/* ─────────── order history ─────────── */
await page.goto(`${BASE}/account/orders`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await shot(page, '07-account-orders');

await page.getByRole('link', { name: /View order/i }).first().click();
await page.waitForTimeout(2500);
const detailUrl = page.url();
await shot(page, '08-account-order-detail');

/* ─────────── account menu ─────────── */
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /^Account/ }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/09-account-menu.png` });
console.log('shot  09-account-menu');

/* ─────────── mobile ─────────── */
const mob = await browser.newContext({
  viewport: { width: 390, height: 844 },
  storageState: await ctx.storageState(),
});
const mp = await mob.newPage();
await mp.goto(`${BASE}/checkout`, { waitUntil: 'load' });
await mp.waitForTimeout(2200);
await shot(mp, '10-mobile-checkout');
await mp.goto(`${BASE}/account/orders`, { waitUntil: 'load' });
await mp.waitForTimeout(2200);
await shot(mp, '11-mobile-orders');
await mp.goto(detailUrl, { waitUntil: 'load' });
await mp.waitForTimeout(2200);
await shot(mp, '12-mobile-order-detail');
await mob.close();

/* ─────────── admin ─────────── */
const actx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const ap = await actx.newPage();
await ap.goto(`${BASE}/admin/login`, { waitUntil: 'load' });
await ap.waitForTimeout(1500);
await ap.fill('input[name=email]', 'admin@shelina.local');
await ap.fill('input[name=password]', 'shelina-dev-2026');
await ap.click('button[type=submit]');
await ap.waitForTimeout(3000);

await ap.goto(`${BASE}/admin/orders`, { waitUntil: 'load' });
await ap.waitForTimeout(2500);
await shot(ap, '13-admin-orders');

await ap.getByLabel(/^Search$/).fill(orderNumber);
await ap.waitForTimeout(2000);
await shot(ap, '14-admin-orders-search');

await ap.getByRole('link', { name: orderNumber }).first().click();
await ap.waitForTimeout(2500);
await shot(ap, '15-admin-order-detail');
await actx.close();

/* ─────────── invoice PDF → PNG ─────────── */
const login = await fetch(`${API}/auth/customer/login`, {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
const orderId = psql(`SELECT id FROM orders WHERE "orderNumber"='${orderNumber}'`);
const pdf = await fetch(`${API}/orders/${orderId}/invoice`, { headers: { Cookie: cookie } });
writeFileSync(`${OUT}/16-invoice.pdf`, Buffer.from(await pdf.arrayBuffer()));
execSync(`pdftoppm -png -r 110 -f 1 -l 1 ${OUT}/16-invoice.pdf ${OUT}/16-invoice`, { shell: '/bin/bash' });
console.log('shot  16-invoice');

await ctx.close();
await browser.close();

/* ─────────── cleanup ─────────── */
psql(
  `UPDATE products p SET stock = stock + sub.qty FROM (SELECT oi."productId" AS pid, SUM(oi.quantity) AS qty FROM order_items oi JOIN orders o ON o.id = oi."orderId" WHERE o."customerEmail"='${EMAIL}' AND o."stockRestoredAt" IS NULL AND oi."productId" IS NOT NULL GROUP BY oi."productId") sub WHERE p.id = sub.pid`,
);
psql(`DELETE FROM orders WHERE "customerEmail"='${EMAIL}'`);
psql(`DELETE FROM customer_users WHERE email='${EMAIL}'`);
console.log(`\ndone — ${OUT} (order ${orderNumber} cleaned up)`);
