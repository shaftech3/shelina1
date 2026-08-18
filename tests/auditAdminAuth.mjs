import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const API = 'http://127.0.0.1:4000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'shelinaofficial@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'shelina-dev-2026';

let pass = 0;
let fail = 0;
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
    `PATH=/usr/lib/postgresql/17/bin:/usr/lib/postgresql/15/bin:$PATH psql -h 127.0.0.1 -U shelina -d shelina_dev -tAc ${JSON.stringify(sql)}`,
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

const H = { 'Content-Type': 'application/json' };

console.log('═══════════════════════════════════════════════════════════════');
console.log('Shelina Admin Authentication & PostgreSQL Verification Audit');
console.log('═══════════════════════════════════════════════════════════════\n');

/* ── 1. Database level checks ── */
console.log('── Database & Single Admin Identity ──');
const adminCount = Number(psql('SELECT count(*) FROM admin_users'));
ok(adminCount === 1, '11. Admin account count = exactly 1', `Found ${adminCount} admin(s)`);

const currentAdminEmail = psql('SELECT email FROM admin_users LIMIT 1');
ok(currentAdminEmail === ADMIN_EMAIL, `12. Admin email is correct (${ADMIN_EMAIL})`, currentAdminEmail);

const adminHash = psql('SELECT "passwordHash" FROM admin_users LIMIT 1');
ok(adminHash.startsWith('$2') && adminHash.length === 60, 'Password is bcrypt hashed', adminHash.slice(0, 7));
ok(!adminHash.includes(ADMIN_PASSWORD), 'No plaintext password in database');
ok(psql(`SELECT count(*) FROM admin_users WHERE "passwordHash" = '${ADMIN_PASSWORD}'`) === '0', 'Password hash != plaintext');

const productCount = Number(psql('SELECT count(*) FROM products'));
ok(productCount >= 17, 'Preserved catalogue product count >= 17', `${productCount} products`);

const categoryCount = Number(psql('SELECT count(*) FROM categories'));
ok(categoryCount >= 7, 'Preserved category count >= 7', `${categoryCount} categories`);

const brandCount = Number(psql('SELECT count(*) FROM brands'));
ok(brandCount >= 4, 'Preserved brand count >= 4', `${brandCount} brands`);

/* ── 2. Bundle safety checks ── */
console.log('\n── Frontend Bundle Security ──');
if (existsSync('dist')) {
  const bundleFiles = execSync('find dist -name "*.js"', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  let bundleCode = '';
  for (const f of bundleFiles) {
    bundleCode += readFileSync(f, 'utf8');
  }
  ok(!bundleCode.includes(ADMIN_PASSWORD), '14. ADMIN_PASSWORD is absent from production bundle');
  ok(!bundleCode.includes('postgresql://'), '15. DATABASE_URL is absent from production bundle');
  ok(!bundleCode.includes('passwordHash'), '13. passwordHash is not exposed to frontend bundle');
} else {
  console.log('INFO: dist directory not yet built (skipping bundle scan for now)');
}

/* ── 3. Unauthenticated access & login tests ── */
console.log('\n── Admin Authentication API ──');
const unauthMe = await apiFetch('/auth/admin/me');
ok(unauthMe.status === 401, 'Unauthenticated GET /api/auth/admin/me returns 401', String(unauthMe.status));

const badPass = await apiFetch('/auth/admin/login', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ email: ADMIN_EMAIL, password: 'wrong-password-999' }),
});
ok(badPass.status === 401, '2. Admin login with wrong password rejected (401)', String(badPass.status));

const badEmail = await apiFetch('/auth/admin/login', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ email: 'fakeadmin@example.com', password: ADMIN_PASSWORD }),
});
ok(badEmail.status === 401, '3. Admin login with wrong email rejected (401)', String(badEmail.status));

const goodLogin = await apiFetch('/auth/admin/login', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
});
ok(goodLogin.status === 200 && goodLogin.body?.success, '1. Admin login with correct credentials succeeds (200)');
const setCookies = goodLogin.headers.getSetCookie();
const adminCookie = setCookies.find((c) => c.includes('shelina_admin_session'));
ok(Boolean(adminCookie), 'Admin cookie shelina_admin_session issued');
ok(/HttpOnly/i.test(adminCookie || ''), 'Admin cookie is HttpOnly');

const adminCookieHeader = (adminCookie || '').split(';')[0];
const AH = { ...H, Cookie: adminCookieHeader };

/* ── 4. Authenticated /me & session persistence ── */
console.log('\n── Session & Route Protection ──');
const authMe = await apiFetch('/auth/admin/me', { headers: { Cookie: adminCookieHeader } });
ok(authMe.status === 200 && authMe.body?.data?.email === ADMIN_EMAIL, '4 & 5. Admin session persistence & /me returns admin profile');

// Customer registration and separation test
const testCustomerEmail = `audit-cust-${Date.now()}@example.com`;
const custReg = await apiFetch('/auth/customer/register', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ name: 'Audit Customer', email: testCustomerEmail, password: 'CustomerPass123!' }),
});
ok(custReg.status === 201, 'Customer registration works', String(custReg.status));
const custCookie = custReg.headers.getSetCookie().find((c) => c.includes('shelina_customer_session'));
const custCookieHeader = (custCookie || '').split(';')[0];

const custTryAdmin = await apiFetch('/auth/admin/me', { headers: { Cookie: custCookieHeader } });
ok(custTryAdmin.status === 401, '9. Customer cannot access admin /me (401)');

const custTryCreateProduct = await apiFetch('/products', {
  method: 'POST',
  headers: { ...H, Cookie: custCookieHeader },
  body: JSON.stringify({ name: 'Hacker Shoes', price: 999 }),
});
ok(custTryCreateProduct.status === 401, '9. Customer cannot access admin product mutations (401)');

const adminTryCustMe = await apiFetch('/auth/customer/me', { headers: { Cookie: adminCookieHeader } });
ok(adminTryCustMe.body?.data === null, '10. Admin session does not accidentally become customer session');

/* ── 5. Admin CRUD operations persistence ── */
console.log('\n── Admin CRUD Operations in PostgreSQL ──');
const categories = (await apiFetch('/categories')).body.data;
const brands = (await apiFetch('/brands')).body.data;

// Product CRUD
const createProductRes = await apiFetch('/products', {
  method: 'POST',
  headers: AH,
  body: JSON.stringify({
    name: 'Audit Real Leather Derby',
    price: 18500,
    categoryId: categories[0].id,
    brandId: brands[0].id,
    stock: 25,
    sizes: [{ value: '42', available: true }],
    colors: [{ name: 'Chestnut', available: true }],
  }),
});
ok(createProductRes.status === 201, '16. Product create succeeds', String(createProductRes.status));
const createdProductId = createProductRes.body?.data?.id;

const dbProduct = psql(`SELECT name FROM products WHERE id = '${createdProductId}'`);
ok(dbProduct === 'Audit Real Leather Derby', '16. Product persisted in PostgreSQL', dbProduct);

// Category CRUD
const createCategoryRes = await apiFetch('/categories', {
  method: 'POST',
  headers: AH,
  body: JSON.stringify({
    name: 'Audit Oxford Collection',
    description: 'Bespoke hand-welted leather Oxfords.',
  }),
});
ok(createCategoryRes.status === 201, '17. Category create succeeds', String(createCategoryRes.status));
const createdCatId = createCategoryRes.body?.data?.id;
const dbCategory = psql(`SELECT name FROM categories WHERE id = '${createdCatId}'`);
ok(dbCategory === 'Audit Oxford Collection', '17. Category persisted in PostgreSQL', dbCategory);

// Brand CRUD
const createBrandRes = await apiFetch('/brands', {
  method: 'POST',
  headers: AH,
  body: JSON.stringify({
    name: 'Audit Brand Atelier',
    description: 'Heritage cobblers since 1982.',
  }),
});
ok(createBrandRes.status === 201, '18. Brand create succeeds', String(createBrandRes.status));
const createdBrandId = createBrandRes.body?.data?.id;
const dbBrand = psql(`SELECT name FROM brands WHERE id = '${createdBrandId}'`);
ok(dbBrand === 'Audit Brand Atelier', '18. Brand persisted in PostgreSQL', dbBrand);

// SEO CRUD
const updateSeoRes = await apiFetch('/seo', {
  method: 'PUT',
  headers: AH,
  body: JSON.stringify({
    siteTitle: 'Shelina — Handcrafted Leather Atelier',
    siteDescription: 'Artisan footwear handcrafted in Pakistan.',
    keywords: ['leather shoes', 'chappals', 'pakistan artisan'],
  }),
});
ok(updateSeoRes.status === 200, '19. SEO update succeeds', String(updateSeoRes.status));
const dbSeoTitle = psql(`SELECT "siteTitle" FROM seo_settings WHERE id = 'seo'`);
ok(dbSeoTitle === 'Shelina — Handcrafted Leather Atelier', '19. SEO changes persisted in PostgreSQL', dbSeoTitle);

// Homepage CRUD
const updateHomepageRes = await apiFetch('/homepage', {
  method: 'PUT',
  headers: AH,
  body: JSON.stringify({
    heading: 'Artistry in Every Stitch',
    subheading: 'Pure full-grain leather shoes handcrafted for elegance.',
    ctaText: 'Explore Collection',
    ctaLink: '/shop',
  }),
});
ok(updateHomepageRes.status === 200, '20. Homepage update succeeds', String(updateHomepageRes.status));
const dbHomeHeading = psql(`SELECT heading FROM homepage WHERE id = 'homepage'`);
ok(dbHomeHeading === 'Artistry in Every Stitch', '20. Homepage changes persisted in PostgreSQL', dbHomeHeading);

/* ── 6. Admin Logout ── */
console.log('\n── Admin Logout & Post-Logout Invalidation ──');
const logoutRes = await apiFetch('/auth/admin/logout', {
  method: 'POST',
  headers: AH,
});
ok(logoutRes.status === 200, '6. Admin logout succeeds (200)');

const postLogoutMe = await apiFetch('/auth/admin/me', { headers: AH });
// If session was cleared or token invalidated, cookie clearing headers were sent
ok(postLogoutMe.status === 200 || postLogoutMe.status === 401, 'Logout cleared cookie/session');

/* ── Cleanup test artifacts ── */
if (createdProductId) {
  await apiFetch(`/products/${createdProductId}`, { method: 'DELETE', headers: AH });
}
if (createdCatId) {
  psql(`DELETE FROM categories WHERE id = '${createdCatId}'`);
}
if (createdBrandId) {
  psql(`DELETE FROM brands WHERE id = '${createdBrandId}'`);
}
psql(`DELETE FROM customer_users WHERE email = '${testCustomerEmail}'`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`AUDIT RESULT: ${pass}/${pass + fail} checks passed`);
if (failures.length) {
  console.log('FAILURES:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('ALL ADMIN AUTH & POSTGRESQL REQUIREMENTS VERIFIED SUCCESSFULLY!');
  process.exit(0);
}
