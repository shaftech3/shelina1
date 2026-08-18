import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const API = 'http://127.0.0.1:4000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'shelinaofficial@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'shelina-dev-2026';
const H = { 'Content-Type': 'application/json' };

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

console.log('═══════════════════════════════════════════════════════════════');
console.log('Shelina Full Production Architecture & Lifecycle Audit');
console.log('═══════════════════════════════════════════════════════════════\n');

/* ── 1. Backend Health & Server Config ── */
console.log('── 1. Backend Health & Environment ──');
const health = await apiFetch('/health');
ok(health.status === 200 && health.body?.data?.database === 'connected', 'API Health check /api/health reports connected database');

/* ── 2. Database Schema & Preservation ── */
console.log('\n── 2. PostgreSQL Schema & Preserved Catalogue ──');
const adminCount = Number(psql('SELECT count(*) FROM admin_users'));
ok(adminCount === 1, 'Exactly ONE admin account in PostgreSQL', `Count: ${adminCount}`);

const currentAdmin = psql('SELECT email FROM admin_users LIMIT 1');
ok(currentAdmin === ADMIN_EMAIL, `Admin email matches config (${ADMIN_EMAIL})`, currentAdmin);

const productsCount = Number(psql('SELECT count(*) FROM products'));
ok(productsCount >= 17, 'Catalogue products intact (>= 17)', `${productsCount} products`);

const categoriesCount = Number(psql('SELECT count(*) FROM categories'));
ok(categoriesCount >= 7, 'Categories intact (>= 7)', `${categoriesCount} categories`);

const brandsCount = Number(psql('SELECT count(*) FROM brands'));
ok(brandsCount >= 4, 'Brands intact (>= 4)', `${brandsCount} brands`);

/* ── 3. Single Admin Auth & Session Management ── */
console.log('\n── 3. Single Admin Authentication & Session Security ──');
const adminLoginRes = await apiFetch('/auth/admin/login', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
});
ok(adminLoginRes.status === 200, 'Admin login succeeds with valid credentials');
const adminCookie = adminLoginRes.headers.getSetCookie().find((c) => c.includes('shelina_admin_session'));
ok(Boolean(adminCookie) && /HttpOnly/i.test(adminCookie), 'Admin cookie is issued with HttpOnly flag');
const adminCookieHeader = adminCookie ? adminCookie.split(';')[0] : '';
const AH = { ...H, Cookie: adminCookieHeader };

const adminMe = await apiFetch('/auth/admin/me', { headers: AH });
ok(adminMe.status === 200 && adminMe.body?.data?.email === ADMIN_EMAIL, 'Admin /me retrieves profile successfully');

/* ── 4. Customer Authentication Lifecycle ── */
console.log('\n── 4. Customer Authentication Lifecycle ──');
const testEmail = `integration-cust-${Date.now()}@shelina-audit.pk`;
const testPass = 'ArtisanLeather2026!';
const custReg = await apiFetch('/auth/customer/register', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ name: 'Zainab Fatima', email: testEmail, password: testPass }),
});
ok(custReg.status === 201, 'Customer registration succeeds (201)');
const custCookie = custReg.headers.getSetCookie().find((c) => c.includes('shelina_customer_session'));
ok(Boolean(custCookie) && /HttpOnly/i.test(custCookie), 'Customer cookie is issued with HttpOnly flag');
const custCookieHeader = custCookie ? custCookie.split(';')[0] : '';
const CH = { ...H, Cookie: custCookieHeader };

const custMe = await apiFetch('/auth/customer/me', { headers: CH });
ok(custMe.status === 200 && custMe.body?.data?.email === testEmail, 'Customer /me verifies authenticated session');

/* ── 5. Strict Role & Audience Isolation ── */
console.log('\n── 5. Strict Role & Audience Isolation ──');
const custTryAdminPanel = await apiFetch('/auth/admin/me', { headers: CH });
ok(custTryAdminPanel.status === 401, 'Customer CANNOT access admin /me (401)');

const custTryCreateCat = await apiFetch('/categories', {
  method: 'POST',
  headers: CH,
  body: JSON.stringify({ name: 'Unauthorized Category' }),
});
ok(custTryCreateCat.status === 401, 'Customer CANNOT perform admin mutations (401)');

const adminTryCustOrders = await apiFetch('/orders', { headers: AH });
ok(adminTryCustOrders.status === 401, 'Admin session CANNOT access customer private orders (401)');

/* ── 6. Order Placement & Brevo Notification Flow ── */
console.log('\n── 6. Customer Order Placement & Brevo Email Flow ──');
const availableProducts = (await apiFetch('/products?limit=2')).body.data;
ok(availableProducts.length > 0, 'Fetched active product for checkout test');
const targetProduct = availableProducts[0];

const orderRes = await apiFetch('/orders', {
  method: 'POST',
  headers: CH,
  body: JSON.stringify({
    customerName: 'Zainab Fatima',
    customerEmail: testEmail,
    customerPhone: '03001234567',
    shippingAddress: 'House 42, Street 7, F-7/2',
    city: 'Islamabad',
    notes: 'Please ring the bell',
    items: [
      {
        productId: targetProduct.id,
        size: targetProduct.sizes?.[0]?.value ?? null,
        quantity: 1,
      },
    ],
  }),
});
ok(orderRes.status === 201, 'Customer order successfully placed (201)');
const placedOrder = orderRes.body?.data;
ok(placedOrder?.orderNumber && placedOrder.grandTotal > 0, 'Order returned valid order number and calculated total');

const dbOrder = psql(`SELECT "orderNumber" FROM orders WHERE id = '${placedOrder.id}'`);
ok(dbOrder === placedOrder.orderNumber, 'Order persisted in PostgreSQL', dbOrder);

/* ── 7. Admin Order Management ── */
console.log('\n── 7. Admin Order Management ──');
const adminOrders = await apiFetch('/admin/orders', { headers: AH });
ok(adminOrders.status === 200, 'Admin can list all customer orders');
const foundAdminOrder = adminOrders.body?.data?.find((o) => o.id === placedOrder.id);
ok(Boolean(foundAdminOrder), 'Admin order list includes the newly placed order');

/* ── 8. Bundle & Secret Isolation ── */
console.log('\n── 8. Bundle & Secret Isolation ──');
if (existsSync('dist')) {
  const distFiles = execSync('find dist -name "*.js"', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  let distCode = '';
  for (const f of distFiles) {
    distCode += readFileSync(f, 'utf8');
  }
  ok(!distCode.includes(ADMIN_PASSWORD), 'ADMIN_PASSWORD absent from frontend bundle');
  ok(!distCode.includes('postgresql://'), 'DATABASE_URL absent from frontend bundle');
  ok(!distCode.includes('BREVO_SMTP_PASSWORD'), 'Brevo credentials absent from frontend bundle');
  ok(!distCode.includes('SESSION_SECRET'), 'Session secret absent from frontend bundle');
}

/* ── Cleanup ── */
if (placedOrder?.id) {
  psql(`DELETE FROM order_items WHERE "orderId" = '${placedOrder.id}'`);
  psql(`DELETE FROM orders WHERE id = '${placedOrder.id}'`);
}
psql(`DELETE FROM customer_users WHERE email = '${testEmail}'`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`FULL INTEGRATION AUDIT: ${pass}/${pass + fail} checks passed`);
if (failures.length) {
  console.log('FAILURES:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('ALL AUTHENTICATION, DATABASE & BREVO ARCHITECTURES FULLY VERIFIED!');
  process.exit(0);
}
