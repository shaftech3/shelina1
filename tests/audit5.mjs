import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let chromium = null;
try {
  const pw = await import('playwright-core');
  chromium = pw.chromium;
} catch {
  // Headless browser optional in non-desktop CI
}

const BASE = 'http://localhost:4173';
const API = 'http://localhost:4000/api';
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'shelinaofficial@gmail.com',
  password: process.env.ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'shelina-dev-2026',
};

let pass = 0;
let fail = 0;
const errors = [];
const failures = [];

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

async function apiFetch(path, init) {
  const res = await fetch(`${API}${path}`, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, body, headers: res.headers };
}

/**
 * Remove rows left behind by an earlier aborted run so counts are stable and
 * the suite is safely repeatable.
 */
psql(`DELETE FROM products WHERE name LIKE 'Audit %' OR name LIKE 'Unauthorized %'`);
psql(`DELETE FROM categories WHERE name LIKE 'Audit Category %'`);
psql(`DELETE FROM brands WHERE name LIKE 'Audit Brand %'`);
psql(`DELETE FROM customer_users WHERE email LIKE 'browser-%@example.com' OR email LIKE 'shopper-%@example.com'`);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
context.on('page', (p) => {
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console] ${m.text()}`);
  });
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
});
const page = await context.newPage();

async function adminLogin(target = page) {
  await target.goto(`${BASE}/admin/login`, { waitUntil: 'load' });
  await target.waitForTimeout(900);
  // Pages share one browser context, so an admin session may already exist —
  // the login route then redirects straight into the panel and there is no
  // form to fill.
  if (!(await target.locator('input[name=email]').count())) return;
  await target.fill('input[name=email]', ADMIN.email);
  await target.fill('input[name=password]', ADMIN.password);
  await target.click('button[type=submit]');
  await target.waitForTimeout(2000);
}

/* ═══════════ 1. Infrastructure ═══════════ */
console.log('\n──────── 1. PostgreSQL, Prisma, migrations, seed ────────');
ok(psql('SELECT 1') === '1', 'PostgreSQL is reachable');
const tables = psql(
  "SELECT string_agg(tablename,',' ORDER BY tablename) FROM pg_tables WHERE schemaname='public'",
);
for (const t of [
  'admin_users',
  'customer_users',
  'products',
  'categories',
  'brands',
  'product_media',
  'homepage',
  'banners',
  'seo_settings',
]) {
  ok(tables.includes(t), `table exists: ${t}`);
}
// `orders` and `order_items` were added by Stage 6, so they are expected here
// now; this assertion originally ran before Stage 6 existed. What must still be
// absent is anything OUT of scope for the project as a whole.
for (const t of ['payments', 'coupons', 'reviews', 'wishlists']) {
  ok(!tables.includes(t), `out-of-scope table correctly absent: ${t}`);
}
ok(Number(psql('SELECT count(*) FROM _prisma_migrations')) > 0, 'Prisma migration recorded');
ok(Number(psql('SELECT count(*) FROM products')) === 17, 'seed loaded 17 products');
ok(Number(psql('SELECT count(*) FROM categories')) === 7, 'seed loaded 7 categories');
ok(Number(psql('SELECT count(*) FROM brands')) === 4, 'seed loaded 4 brands');
ok(Number(psql('SELECT count(*) FROM product_media')) > 17, 'product media rows seeded');

// No global size/colour table anywhere.
ok(
  !/(^|,)sizes(,|$)|(^|,)colors(,|$)|global_size|color_dictionary/.test(tables),
  'NO global size/colour table exists in the schema',
);

/* ═══════════ 2. Password security ═══════════ */
console.log('\n──────── 2. Password hashing ────────');
const adminHash = psql(`SELECT "passwordHash" FROM admin_users LIMIT 1`);
ok(adminHash.startsWith('$2'), 'admin password is a bcrypt hash', adminHash.slice(0, 7));
ok(adminHash.length === 60, 'bcrypt hash is well-formed (60 chars)');
ok(!adminHash.includes(ADMIN.password), 'plaintext password is NOT stored');
ok(
  psql(`SELECT count(*) FROM admin_users WHERE "passwordHash" = '${ADMIN.password}'`) === '0',
  'no admin row contains the plaintext password',
);

/* ═══════════ 3. API health + public reads ═══════════ */
console.log('\n──────── 3. Public API ────────');
const health = await apiFetch('/health');
ok(health.status === 200 && health.body.data.database === 'connected', 'API health reports DB connected');

const pub = await apiFetch('/products');
ok(pub.status === 200 && pub.body.data.length >= 17, 'GET /api/products returns the catalogue', String(pub.body.data.length));
ok(
  pub.body.data.every((p) => p.status === 'active'),
  'public product list contains ACTIVE products only',
);
const withMedia = pub.body.data.find((p) => p.images.length > 0);
ok(Boolean(withMedia), 'products carry image references');
ok(
  typeof withMedia.images[0].src === 'string' && !withMedia.images[0].src.startsWith('data:'),
  'media is a URL reference, never a binary blob',
  withMedia.images[0].src,
);

for (const [path, label] of [
  ['/categories', 'GET /api/categories'],
  ['/brands', 'GET /api/brands'],
  ['/homepage', 'GET /api/homepage'],
  ['/banners', 'GET /api/banners'],
  ['/seo', 'GET /api/seo'],
]) {
  const r = await apiFetch(path);
  ok(r.status === 200 && r.body.success, `${label} is public`, String(r.status));
}

/* ═══════════ 4. Free-form sizes and colours ═══════════ */
console.log('\n──────── 4. Manual sizes and colours stay free-form ────────');
const allSizes = pub.body.data.flatMap((p) => p.sizes.map((s) => s.value));
ok(allSizes.includes('UK 6') || allSizes.includes('UK 7'), 'UK-prefixed sizes survive the DB round trip');
ok(allSizes.some((s) => /^\d+$/.test(s)), 'numeric sizes survive');
ok(
  pub.body.data.some((p) => p.sizes.length === 0),
  'a product with NO sizes is supported',
);
ok(
  pub.body.data.some((p) => p.colors.length === 0),
  'a product with NO colours is supported',
);
const wordSizes = pub.body.data.find((p) => p.sizes.some((s) => /Small|Medium|Large/.test(s.value)));
ok(Boolean(wordSizes), 'word sizes (Small/Medium/Large) survive');

/* ═══════════ 5. Authorization ═══════════ */
console.log('\n──────── 5. Backend authorization ────────');
const cat = (await apiFetch('/categories')).body.data;
const brand = (await apiFetch('/brands')).body.data;
const validBody = JSON.stringify({
  name: 'Unauthorized Product',
  price: 1000,
  categoryId: cat[0].id,
  brandId: brand[0].id,
});
const H = { 'Content-Type': 'application/json' };

for (const [method, path] of [
  ['POST', '/products'],
  ['POST', '/categories'],
  ['POST', '/brands'],
  ['POST', '/banners'],
  ['PUT', '/homepage'],
  ['PUT', '/seo'],
]) {
  const r = await apiFetch(path, { method, headers: H, body: validBody });
  ok(r.status === 401, `unauthenticated ${method} ${path} is REJECTED`, String(r.status));
}
const delUnauth = await apiFetch(`/products/${pub.body.data[0].id}`, { method: 'DELETE' });
ok(delUnauth.status === 401, 'unauthenticated DELETE is REJECTED', String(delUnauth.status));

/* ═══════════ 6. Admin auth + customer separation (API level) ═══════════ */
console.log('\n──────── 6. Auth flows and session separation ────────');
// The credential limiter is deliberately strict (20 attempts / 15 min). A
// repeated audit run legitimately exhausts it, which would look like "login
// broken". Confirm the limiter is live, then restart the API to clear its
// in-memory window so the functional auth checks below are meaningful.
const limiterProbe = await apiFetch('/auth/admin/login', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ email: 'nobody@example.com', password: 'x' }),
});
ok(
  [401, 429].includes(limiterProbe.status),
  'auth endpoints are rate limited or rejecting bad credentials',
  String(limiterProbe.status),
);
if (limiterProbe.status === 429) {
  console.error(
    'ABORT: the auth rate-limit window is still active. Set AUTH_RATE_LIMIT ' +
      'high in shelina-api/.env and restart the API before auditing.',
  );
  process.exit(1);
}

const badLogin = await apiFetch('/auth/admin/login', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ email: ADMIN.email, password: 'definitely-wrong' }),
});
ok(badLogin.status === 401, 'wrong admin password is rejected', String(badLogin.status));
ok(
  !JSON.stringify(badLogin.body).toLowerCase().includes('hash'),
  'failed login leaks no hash detail',
);

const goodLogin = await apiFetch('/auth/admin/login', {
  method: 'POST',
  headers: H,
  body: JSON.stringify(ADMIN),
});
ok(goodLogin.status === 200, 'correct admin password is accepted');
const adminCookie = goodLogin.headers.getSetCookie().find((c) => c.includes('shelina_admin_session'));
ok(Boolean(adminCookie), 'admin session cookie is issued');
ok(/HttpOnly/i.test(adminCookie), 'admin cookie is HttpOnly (JS cannot read it)');
ok(/SameSite/i.test(adminCookie), 'admin cookie sets SameSite');
ok(
  !JSON.stringify(goodLogin.body).includes('passwordHash'),
  'login response never returns the password hash',
);
const adminCookieHeader = adminCookie.split(';')[0];

const email = `shopper-${Date.now()}@example.com`;
const reg = await apiFetch('/auth/customer/register', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ name: 'Test Shopper', email, password: 'shopper-pass-123' }),
});
ok(reg.status === 201, 'customer registration succeeds', String(reg.status));
const custCookie = reg.headers.getSetCookie().find((c) => c.includes('shelina_customer_session'));
ok(Boolean(custCookie) && /HttpOnly/i.test(custCookie), 'customer cookie is HttpOnly');
const custCookieHeader = custCookie.split(';')[0];

const dupe = await apiFetch('/auth/customer/register', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ name: 'Dupe', email, password: 'shopper-pass-123' }),
});
ok(dupe.status === 409, 'duplicate customer email is rejected', String(dupe.status));

const badCustomer = await apiFetch('/auth/customer/login', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ email, password: 'wrong-password' }),
});
ok(badCustomer.status === 401, 'wrong customer password is rejected');

// THE CRITICAL SEPARATION TESTS
const custTriesAdmin = await apiFetch('/products', {
  method: 'POST',
  headers: { ...H, Cookie: custCookieHeader },
  body: validBody,
});
ok(custTriesAdmin.status === 401, 'CUSTOMER session cannot perform an ADMIN mutation', String(custTriesAdmin.status));

const custOnAdminMe = await apiFetch('/auth/admin/me', { headers: { Cookie: custCookieHeader } });
ok(custOnAdminMe.body.data === null, 'customer cookie does not resolve an admin session');

const adminOnCustMe = await apiFetch('/auth/customer/me', { headers: { Cookie: adminCookieHeader } });
ok(adminOnCustMe.body.data === null, 'admin cookie does not resolve a customer session');

const adminMe = await apiFetch('/auth/admin/me', { headers: { Cookie: adminCookieHeader } });
ok(adminMe.body.data?.email === ADMIN.email, 'admin session resolves correctly');

/* ═══════════ 7. Backend validation ═══════════ */
console.log('\n──────── 7. Server-side validation ────────');
const AH = { ...H, Cookie: adminCookieHeader };
const invalidCases = [
  [{ price: 100, categoryId: cat[0].id, brandId: brand[0].id }, 'missing name'],
  [{ name: 'X', categoryId: cat[0].id, brandId: brand[0].id }, 'missing price'],
  [{ name: 'X', price: 100, salePrice: 500, categoryId: cat[0].id, brandId: brand[0].id }, 'salePrice >= price'],
  [{ name: 'X', price: 100, stock: -5, categoryId: cat[0].id, brandId: brand[0].id }, 'negative stock'],
  [{ name: 'X', price: 100, categoryId: 'nope', brandId: brand[0].id }, 'unknown categoryId'],
  [{ name: 'X', price: 100, categoryId: cat[0].id, brandId: 'nope' }, 'unknown brandId'],
  [{ name: 'X', price: -50, categoryId: cat[0].id, brandId: brand[0].id }, 'negative price'],
];
for (const [body, label] of invalidCases) {
  const r = await apiFetch('/products', { method: 'POST', headers: AH, body: JSON.stringify(body) });
  ok(r.status === 400, `validation rejects: ${label}`, String(r.status));
}

// Free-form sizes/colours must NOT be restricted.
const weird = await apiFetch('/products', {
  method: 'POST',
  headers: AH,
  body: JSON.stringify({
    name: 'Audit Freeform Product',
    price: 3000,
    categoryId: cat[0].id,
    brandId: brand[0].id,
    sizes: [
      { value: 'Free Size', available: true },
      { value: 'UK 13½', available: true },
      { value: '٤٢', available: true },
    ],
    colors: [{ name: 'Coffee', available: true }, { name: 'Dark Brown', available: false }],
  }),
});
ok(weird.status === 201, 'arbitrary free-form sizes/colours are ACCEPTED', String(weird.status));
const weirdSizes = weird.body?.data?.sizes?.map((s) => s.value) ?? [];
ok(
  weirdSizes.includes('Free Size') && weirdSizes.includes('UK 13½') && weirdSizes.includes('٤٢'),
  'free-form values are stored verbatim, no normalisation',
  JSON.stringify(weirdSizes),
);
const auditProductId = weird.body?.data?.id;

/* ═══════════ 8. Referential integrity ═══════════ */
console.log('\n──────── 8. Referential integrity ────────');
const inUse = cat.find((c) => (c.productCount ?? 0) > 0);
const delInUse = await apiFetch(`/categories/${inUse.id}`, { method: 'DELETE', headers: AH });
ok(delInUse.status === 409, 'deleting an in-use category is refused (409)', String(delInUse.status));
ok(
  /used by \d+ product/.test(delInUse.body.message),
  'refusal explains how many products must be reassigned',
  delInUse.body.message,
);
const brandInUse = brand.find((b) => (b.productCount ?? 0) > 0);
if (brandInUse) {
  const delBrand = await apiFetch(`/brands/${brandInUse.id}`, { method: 'DELETE', headers: AH });
  ok(delBrand.status === 409, 'deleting an in-use brand is refused (409)', String(delBrand.status));
}

/* ═══════════ 9. Error handling hygiene ═══════════ */
console.log('\n──────── 9. Error responses leak nothing ────────');
const notFound = await apiFetch('/products/does-not-exist-at-all');
ok(notFound.status === 404, 'unknown product returns 404');
ok(notFound.body.success === false && typeof notFound.body.message === 'string', 'error envelope is { success, message }');
const leakText = JSON.stringify(notFound.body) + JSON.stringify(delInUse.body);
for (const secret of ['postgresql://', 'shelina_dev', 'SESSION_SECRET', 'at Object.', 'node_modules']) {
  ok(!leakText.includes(secret), `error responses do not leak: ${secret}`);
}
const badRoute = await apiFetch('/definitely-not-a-route');
ok(badRoute.status === 404 && badRoute.body.success === false, 'unknown endpoint returns the standard envelope');

/* ═══════════ 10. CORS ═══════════ */
console.log('\n──────── 10. CORS ────────');
const corsAllowed = await fetch(`${API}/products`, { headers: { Origin: 'http://localhost:4173' } });
ok(
  corsAllowed.headers.get('access-control-allow-origin') === 'http://localhost:4173',
  'allowed origin is echoed exactly (not *)',
  String(corsAllowed.headers.get('access-control-allow-origin')),
);
ok(
  corsAllowed.headers.get('access-control-allow-credentials') === 'true',
  'credentials are allowed for the permitted origin',
);
const corsEvil = await fetch(`${API}/products`, { headers: { Origin: 'https://evil.example.com' } });
ok(
  corsEvil.headers.get('access-control-allow-origin') === null,
  'disallowed origin receives NO CORS grant',
  String(corsEvil.headers.get('access-control-allow-origin')),
);
ok(Boolean(corsAllowed.headers.get('x-content-type-options')), 'security headers present (helmet)');

/* ═══════════ 11. Admin panel against the real backend ═══════════ */
console.log('\n──────── 11. Admin panel end-to-end ────────');
await page.goto(`${BASE}/admin/products`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
ok(page.url().includes('/admin/login'), 'unauthenticated admin route redirects to login', page.url());

await adminLogin();
ok(page.url().includes('/admin/products'), 'admin login succeeds and returns to the target', page.url());

await page.waitForTimeout(800);
const rowCount = await page.getByRole('button', { name: /^Delete / }).count();
ok(rowCount >= 17, 'admin product table lists database rows', String(rowCount));

// CREATE through the UI
const unique = `Audit Sandal ${Date.now()}`;
await page.goto(`${BASE}/admin/products/new`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.getByLabel(/^Product name\*?$/).fill(unique);
await page.getByLabel(/^Price\*?$/).fill('7250');
await page.getByLabel(/^Category\*?$/).selectOption({ index: 1 });
await page.getByLabel(/^Brand\*?$/).selectOption({ index: 1 });
await page.getByLabel(/^Stock quantity$/).fill('12');
// Manual, free-form variants — no dropdown exists.
// The chip "Add" buttons share a label, so scope each to its own field row
// rather than guessing at a unique accessible name.
const sizeInput = page.getByLabel(/^Available sizes$/);
const sizeAdd = page.locator('div', { has: sizeInput }).last().getByRole('button', { name: 'Add' });
for (const value of ['Free Size', 'UK 12']) {
  await sizeInput.fill(value);
  await sizeAdd.click();
  await page.waitForTimeout(200);
}
const colorInput = page.getByLabel(/^Available colours$/);
const colorAdd = page.locator('div', { has: colorInput }).last().getByRole('button', { name: 'Add' });
for (const value of ['Coffee', 'Midnight Navy']) {
  await colorInput.fill(value);
  await colorAdd.click();
  await page.waitForTimeout(200);
}
await page.getByRole('button', { name: 'Save product' }).click();
await page.waitForTimeout(2500);

const dbRow = psql(`SELECT count(*) FROM products WHERE name = '${unique.replace(/'/g, "''")}'`);
ok(dbRow === '1', 'admin CREATE persisted to PostgreSQL', `rows=${dbRow}`);
const dbSizes = psql(`SELECT sizes::text FROM products WHERE name = '${unique.replace(/'/g, "''")}'`);
ok(
  dbSizes.includes('Free Size') && dbSizes.includes('UK 12'),
  'free-form sizes persisted verbatim in the database',
  dbSizes.slice(0, 80),
);
ok(dbSizes.includes('Coffee') === false, 'sizes column holds only sizes');
const dbColors = psql(`SELECT colors::text FROM products WHERE name = '${unique.replace(/'/g, "''")}'`);
ok(
  dbColors.includes('Coffee') && dbColors.includes('Midnight Navy'),
  'free-form colours persisted verbatim',
  dbColors.slice(0, 80),
);

// PERSISTS ACROSS A HARD RELOAD (the spec's explicit requirement)
await page.goto(`${BASE}/admin/products`, { waitUntil: 'load' });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2000);
ok(
  (await page.getByText(unique, { exact: false }).count()) > 0,
  'admin change still present after a browser refresh',
);

// EDIT
await page.getByRole('link', { name: `Edit ${unique}` }).click();
await page.waitForTimeout(2200);
const editedName = `${unique} Edited`;
await page.getByLabel(/^Product name\*?$/).fill(editedName);
// The edit page's submit reads "Save changes" (the new-product page says
// "Save product") — match either rather than assuming.
await page.getByRole('button', { name: /^Save (changes|product)$/ }).click();
await page.waitForTimeout(2500);
ok(
  psql(`SELECT count(*) FROM products WHERE name = '${editedName.replace(/'/g, "''")}'`) === '1',
  'admin EDIT persisted to PostgreSQL',
);

// DELETE
await page.goto(`${BASE}/admin/products`, { waitUntil: 'load' });
await page.waitForTimeout(1800);
await page.getByRole('button', { name: `Delete ${editedName}` }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Delete', exact: true }).click();
await page.waitForTimeout(2200);
ok(
  psql(`SELECT count(*) FROM products WHERE name = '${editedName.replace(/'/g, "''")}'`) === '0',
  'admin DELETE removed the row from PostgreSQL',
);

/* ═══════════ 12. Category / brand / homepage / SEO persistence ═══════════ */
console.log('\n──────── 12. Content persistence ────────');
const catName = `Audit Category ${Date.now()}`;
await page.goto(`${BASE}/admin/categories`, { waitUntil: 'load' });
await page.waitForTimeout(1600);
await page.getByRole('button', { name: /Add category/i }).click();
await page.waitForTimeout(700);
await page.getByLabel(/^Name\*?$/).fill(catName);
await page.getByRole('button', { name: /^(Create category|Save)$/ }).click();
await page.waitForTimeout(2200);
ok(
  psql(`SELECT count(*) FROM categories WHERE name = '${catName.replace(/'/g, "''")}'`) === '1',
  'admin category CREATE persisted to PostgreSQL',
);

const brandName = `Audit Brand ${Date.now()}`;
await page.goto(`${BASE}/admin/brands`, { waitUntil: 'load' });
await page.waitForTimeout(1600);
await page.getByRole('button', { name: /Add brand/i }).click();
await page.waitForTimeout(700);
// The brand modal labels its field "Brand name" (the category modal uses "Name").
await page.getByLabel(/^Brand name\*?$/).fill(brandName);
await page.getByRole('button', { name: /^(Create brand|Save)$/ }).click();
await page.waitForTimeout(2200);
ok(
  psql(`SELECT count(*) FROM brands WHERE name = '${brandName.replace(/'/g, "''")}'`) === '1',
  'admin brand CREATE persisted to PostgreSQL',
);

// Homepage hero. Save the real copy first — these fields are live content,
// not throwaway rows, so they must be restored at the end of the run.
const originalHeroHeading = psql('SELECT heading FROM homepage LIMIT 1');
const heroHeading = `Audit Hero ${Date.now()}`;
await page.goto(`${BASE}/admin/homepage`, { waitUntil: 'load' });
await page.waitForTimeout(1800);
const heroForm = page.locator('form', {
  has: page.getByRole('button', { name: 'Save hero' }),
});
await heroForm.getByLabel(/^Heading\*?$/).fill(heroHeading);
await heroForm.getByRole('button', { name: 'Save hero' }).click();
await page.waitForTimeout(2200);
ok(
  psql(`SELECT heading FROM homepage LIMIT 1`) === heroHeading,
  'homepage hero update persisted to PostgreSQL',
);

// SEO
const originalSiteTitle = psql('SELECT "siteTitle" FROM seo_settings LIMIT 1');
const siteTitle = `Shelina Audit ${Date.now()}`;
await page.goto(`${BASE}/admin/seo`, { waitUntil: 'load' });
await page.waitForTimeout(1800);
await page.getByLabel(/^Site title\*?$/).fill(siteTitle);
await page.getByRole('button', { name: 'Save SEO settings' }).click();
await page.waitForTimeout(2200);
ok(
  psql(`SELECT "siteTitle" FROM seo_settings LIMIT 1`) === siteTitle,
  'SEO settings update persisted to PostgreSQL',
);

/* ═══════════ 13. Storefront reads the database ═══════════ */
console.log('\n──────── 13. Storefront reads live database data ────────');
const shop = await context.newPage();
await shop.goto(`${BASE}/`, { waitUntil: 'load' });
await shop.waitForTimeout(2200);
ok(
  (await shop.locator('h1').first().textContent())?.includes(heroHeading),
  'admin hero edit is visible on the storefront homepage',
);
ok((await shop.title()).includes(siteTitle), 'admin SEO title reaches the document title', await shop.title());

await shop.goto(`${BASE}/shop`, { waitUntil: 'load' });
await shop.waitForTimeout(2200);
const cards = await shop.locator('a[href^="/product/"]').count();
ok(cards >= 15, 'shop grid renders database products', String(cards));

// Search / filter / sort still work against the API.
await shop.getByRole('searchbox').first().fill('sneaker');
await shop.waitForTimeout(1600);
const searchCount = await shop.locator('a[href^="/product/"]').count();
ok(searchCount > 0 && searchCount < cards, 'search narrows the database-backed grid', String(searchCount));
await shop.getByRole('searchbox').first().fill('');
await shop.waitForTimeout(1400);

// Product detail with manual variants from the DB.
await shop.goto(`${BASE}/product/drift-low-sneaker`, { waitUntil: 'load' });
await shop.waitForTimeout(2200);
ok((await shop.locator('h1').count()) === 1, 'product detail page renders from the database');
const pdpText = await shop.locator('body').innerText();
ok(pdpText.includes('UK 6') || pdpText.includes('UK 7'), 'manual free-form sizes render on the PDP');
ok((await shop.locator('img').count()) > 0, 'product media renders from ProductMedia rows');

// Cart still works.
// Pick whatever variants this product actually offers rather than assuming
// names — the PDP refuses to add to bag until both are chosen.
const groups = shop.locator('[role=radiogroup]');
for (let i = 0; i < (await groups.count()); i += 1) {
  const option = groups.nth(i).getByRole('radio').or(groups.nth(i).locator('button')).first();
  if (await option.count()) {
    await option.click();
    await shop.waitForTimeout(300);
  }
}
await shop.getByRole('button', { name: /Add to bag/i }).first().click();
await shop.waitForTimeout(1800);
ok(
  (await shop.getByRole('dialog').count()) > 0,
  'cart drawer opens after adding a database-backed product',
);
await shop.keyboard.press('Escape');
await shop.waitForTimeout(600);

/* ═══════════ 14. Customer account flow in the browser ═══════════ */
console.log('\n──────── 14. Customer accounts in the browser ────────');
const cust = await context.newPage();
const custEmail = `browser-${Date.now()}@example.com`;
await cust.goto(`${BASE}/account/register`, { waitUntil: 'load' });
await cust.waitForTimeout(1600);
await cust.getByLabel(/^Full name\*?$/).fill('Browser Shopper');
await cust.getByLabel(/^Email address\*?$/).fill(custEmail);
await cust.getByLabel(/^Password\*?$/).fill('browser-pass-123');
await cust.getByRole('button', { name: 'Create account' }).click();
await cust.waitForTimeout(2600);
ok(cust.url().includes('/account'), 'customer registration signs the shopper in', cust.url());
ok(
  psql(`SELECT count(*) FROM customer_users WHERE email = '${custEmail}'`) === '1',
  'customer row created in PostgreSQL',
);
const custHash = psql(`SELECT "passwordHash" FROM customer_users WHERE email = '${custEmail}'`);
ok(custHash.startsWith('$2') && !custHash.includes('browser-pass'), 'customer password is bcrypt-hashed');

// Session survives a reload (HttpOnly cookie).
await cust.reload({ waitUntil: 'load' });
await cust.waitForTimeout(2200);
ok(
  (await cust.locator('body').innerText()).includes(custEmail),
  'customer session persists across a page refresh',
);

// The account menu shows the signed-in state.
await cust.goto(`${BASE}/`, { waitUntil: 'load' });
await cust.waitForTimeout(2000);
const accountTrigger = cust.getByRole('button', { name: /^Account/ });
await accountTrigger.click();
await cust.waitForTimeout(800);
const menuText = await cust.getByRole('menu', { name: /Account/i }).innerText();
ok(/My Account/i.test(menuText), 'signed-in menu shows My Account');
ok(/Logout/i.test(menuText), 'signed-in menu shows Logout');
ok(!/Create Account/i.test(menuText), 'signed-in menu hides the guest options');

// Cart must survive customer logout.
await cust.goto(`${BASE}/product/aurelia-bow-slide`, { waitUntil: 'load' });
await cust.waitForTimeout(2000);
const s2 = cust.getByRole('button', { name: /^38$/ });
if (await s2.count()) await s2.first().click();
const c2 = cust.getByRole('button', { name: /Blush|Ivory/ }).first();
if (await c2.count()) await c2.click();
await cust.waitForTimeout(300);
await cust.getByRole('button', { name: /Add to bag/i }).first().click();
await cust.waitForTimeout(1800);
await cust.keyboard.press('Escape');
await cust.waitForTimeout(600);
const cartBefore = await cust.evaluate(() => localStorage.getItem('shelina.cart.v1'));

await cust.getByRole('button', { name: /^Account/ }).click();
await cust.waitForTimeout(700);
await cust.getByRole('menuitem', { name: /Logout/i }).click();
await cust.waitForTimeout(2600);
const cartAfter = await cust.evaluate(() => localStorage.getItem('shelina.cart.v1'));
ok(cartBefore === cartAfter && Boolean(cartAfter), 'customer LOGOUT does NOT clear the cart');

await cust.goto(`${BASE}/`, { waitUntil: 'load' });
await cust.waitForTimeout(1800);
await cust.getByRole('button', { name: /^Account/ }).click();
await cust.waitForTimeout(700);
const guestMenu = await cust.getByRole('menu', { name: /Account/i }).innerText();
ok(/Sign In/i.test(guestMenu), 'after logout the menu returns to guest options');

/* ═══════════ 15. Admin session ≠ customer session in the browser ═══════════ */
console.log('\n──────── 15. Browser-level session separation ────────');
const sep = await context.newPage();
await adminLogin(sep);
ok(sep.url().includes('/admin'), 'admin signed in on this browser context');
await sep.goto(`${BASE}/`, { waitUntil: 'load' });
await sep.waitForTimeout(2000);
await sep.getByRole('button', { name: /^Account/ }).click();
await sep.waitForTimeout(800);
const storefrontMenu = await sep.getByRole('menu', { name: /Account/i }).innerText();
ok(
  /Sign In/i.test(storefrontMenu) && /Create Account/i.test(storefrontMenu),
  'a signed-in ADMIN is still a GUEST on the storefront',
);
ok(!storefrontMenu.includes(ADMIN.email), 'admin identity never leaks into the customer menu');
await sep.close();

// Put the real hero + SEO copy back now that the persistence checks are done.
psql(`UPDATE homepage SET heading = '${originalHeroHeading.replace(/'/g, "''")}'`);
psql(`UPDATE seo_settings SET "siteTitle" = '${originalSiteTitle.replace(/'/g, "''")}'`);
ok(
  psql('SELECT heading FROM homepage LIMIT 1') === originalHeroHeading &&
    psql('SELECT "siteTitle" FROM seo_settings LIMIT 1') === originalSiteTitle,
  'audit restored the original hero and SEO content',
);

/* ═══════════ 16. No secrets in the frontend bundle ═══════════ */
console.log('\n──────── 16. Secret hygiene ────────');
const bundleFiles = execSync('ls /home/user/shelina/dist/assets/*.js', { encoding: 'utf8' })
  .trim()
  .split('\n');
const bundle = bundleFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
for (const secret of [
  'shelina-dev-2026',
  'postgresql://',
  'SESSION_SECRET',
  'DATABASE_URL',
  process.env.SESSION_SECRET ?? 'dev-only-insecure-secret',
]) {
  ok(!bundle.includes(secret), `built bundle does NOT contain: ${secret}`);
}
ok(!bundle.includes('$2b$'), 'built bundle contains no bcrypt hash');
const apiEnvExample = readFileSync('/home/user/shelina-api/.env.example', 'utf8');
ok(!/SESSION_SECRET=.+/.test(apiEnvExample), '.env.example ships an EMPTY session secret');
ok(
  !/SEED_ADMIN_PASSWORD=.+/.test(apiEnvExample),
  '.env.example ships an EMPTY seed admin password',
);
const gitignore = readFileSync('/home/user/shelina-api/.gitignore', 'utf8');
ok(gitignore.includes('.env'), 'backend .gitignore excludes .env');

/* ═══════════ 17. Responsive regression ═══════════ */
console.log('\n──────── 17. Responsive: no horizontal overflow ────────');
for (const w of [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920]) {
  const rp = await context.newPage();
  await rp.setViewportSize({ width: w, height: 900 });
  for (const route of ['/', '/shop', '/account/sign-in']) {
    await rp.goto(`${BASE}${route}`, { waitUntil: 'load' });
    await rp.waitForTimeout(1100);
    const overflow = await rp.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    ok(overflow <= 0, `no horizontal overflow @ ${w}px ${route}`, `${overflow}px`);
  }
  await rp.close();
}

/* ═══════════ Cleanup ═══════════ */
if (auditProductId) {
  await apiFetch(`/products/${auditProductId}`, { method: 'DELETE', headers: AH });
}
psql(`DELETE FROM categories WHERE name LIKE 'Audit Category %'`);
psql(`DELETE FROM brands WHERE name LIKE 'Audit Brand %'`);
psql(`DELETE FROM customer_users WHERE email LIKE 'browser-%@example.com' OR email LIKE 'shopper-%@example.com'`);

console.log('\n=== CONSOLE / PAGE ERRORS ===');
console.log(errors.length ? errors.join('\n') : 'none');
ok(errors.length === 0, 'no console or page errors across the whole run', String(errors.length));

if (failures.length) {
  console.log('\n=== FAILED CHECKS ===');
  failures.forEach((f) => console.log(` - ${f}`));
}
console.log(`\n=== SUMMARY: ${pass}/${pass + fail} passed ===`);
await browser.close();
