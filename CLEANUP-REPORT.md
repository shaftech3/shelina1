# Shelina — Cleanup & Production Optimization Report

**Date:** 17 August 2026
**Scope:** Full-filesystem audit, safe removal, and 26-point post-cleanup verification.
**Method:** Every figure below was measured with `find`/`du` on the live filesystem, and every
"works" claim was proven by running the code in a headless browser or against the live database.
This audit was performed from scratch and does not rely on any previous report.

---

## 1. Headline result

| Metric | Before | After | Change |
|---|---:|---:|---:|
| **Project files** (persisted, excl. runtime DB) | 1,624 | **265** | **−1,359 (−83.7%)** |
| **Project size** | 75 MB | **6.3 MB** | **−68.7 MB (−91.6%)** |
| `pgdata/` (PostgreSQL cluster) | 1,347 files / 63 MB | 0 in project | moved to runtime-only |
| `shots6/` (audit screenshots) | 18 files / 7.2 MB | 4 files / 1.6 MB | −14 files / −5.6 MB |
| Source code (`shelina` + `shelina-api`) | 248 files / 4.4 MB | **248 files / 4.4 MB** | **unchanged — nothing removed** |

**Where the reduction came from:** 92.8% of it is `pgdata/` — a regenerable PostgreSQL data
directory, not project content. The rest is oversized PNG captures. **No source file, asset,
migration, test, or dependency was deleted**, because the audit proved there was nothing dead to delete.

---

## 2. The pg_data question (audited before anything was touched)

Two locations existed: `/home/user/pgdata` (the real cluster) and `/home/user/pgrun` (the socket
directory, containing only a stale lock file).

| Question | Finding |
|---|---|
| Which is empty? | `pgrun/` held one stale `.s.PGSQL.5432.lock`. |
| Which holds dev data? | `pgdata/` — 1,347 files, 63 MB, PostgreSQL 17.10 cluster. |
| Runtime dependency? | The **server** needs a running cluster; the **repository** does not. |
| Does `DATABASE_URL` point at it? | Yes — `postgresql://shelina@127.0.0.1:5432/shelina_dev`, via `shelina-api/.env` only. It is never exposed to Vite or the browser. |
| Needed for deployment? | **No.** Production points `DATABASE_URL` at a managed PostgreSQL instance. A local data directory is never shipped. |
| Should the DB be external/persistent? | **Yes.** It is now treated as external runtime state: gitignored, reproducible, and never part of the deliverable. |

**Decision (approved by you): verify everything first, delete last.** That is exactly what happened —
the full suite ran green *before* deletion, and again *after* recovery.

### Deletion was gated behind four proofs

1. **Fresh dump taken immediately beforehand** — `pg_dump --clean --if-exists --no-owner
   --no-privileges` → `backups/shelina_dev.sql` (41 KB) + `.gz` (10 KB).
   *A previously existing backup was found to be **stale** — it still contained an old
   `/about` call-to-action. It was discarded and regenerated. Never trust an old dump.*
2. **Restore proven** into a scratch database: exit 0, **0 errors**, all 12 tables row-identical,
   product deep-checksum `25b72c27…` identical, admin bcrypt hash intact (`$2b$`, length 60).
3. **A second, independent recovery path proven** — `prisma migrate deploy` + `npm run seed` on an
   empty database reproduced the catalogue with an identical checksum.
4. **Gitignore proven with real `git check-ignore`** (not by eye): `pgdata/**`, `pgrun/**`,
   `shots6/**`, `node_modules/**`, `.env.local` → ignored; source, schema and backups → tracked.

### Proven recoverable *after* deletion

`pgdata/` and `pgrun/` were deleted with PostgreSQL cleanly stopped, then **rebuilt from nothing**:
`initdb` → start → restore → **checksum `25b72c2768a7937028642cd0cf9ef92e`, identical to the
pre-deletion database**. The full audit suite was then re-run green against the recovered data.

A one-command script now makes this repeatable in ~3 seconds:

```bash
./restore-db.sh          # restore exact data from backups/shelina_dev.sql
./restore-db.sh --seed   # rebuild via prisma migrate deploy + npm run seed
```

---

## 3. What was examined, and why almost nothing was deletable

| Audit | Method | Result |
|---|---|---|
| Dead source files | Import-graph crawl from `main.tsx` resolving `@/` aliases, relative paths, **dynamic `import()`**, and CSS `@import` | 165 files, **160 reachable**; the only 5 "unreachable" are `src/data/mock/*` |
| Are the mocks dead? | `prisma/seed.ts:27` reads `../shelina/src/data/mock` at seed time | **Not dead — they are the seed source.** Deleting them breaks database recovery. Retained. |
| Orphan assets | Every one of 30 files in `public/` grepped across src, `index.html`, prisma, api | **0 orphans** |
| Broken image paths | Every `/images/...` string checked against disk | **0 missing** |
| Duplicate files | `md5sum` across all non-pgdata files | 4 byte-identical pairs found (`products/pN-a.jpg` = `categories/*.jpg`) — **both names referenced**; deleting either side breaks a product image or a category tile. **Retained.** |
| Build artifacts / caches | `find` for `dist`, `node_modules`, `.cache`, `coverage` | **0 persisted** (regenerated on demand) |
| Temp files | `find` for `*.log *.tmp *.bak *.orig *~ .DS_Store` | **0** |
| Empty files/dirs | `find -empty` | 1 empty file (`.sudo_as_admin_successful`, created by the OS, not the project); 0 empty dirs |
| Dependencies | Frontend 111 packages, backend 285 — each top-level import checked | **0 unused**; nothing removed |

**Conclusion: the codebase was already clean.** Categories F (temporary) and G (dead) were empty
outside `pgdata/` and the screenshots. Reporting that honestly is the correct outcome — padding the
deletion count by removing tests, docs, or assets would have been exactly the "cheating" you ruled out.

---

## 4. Real bugs found and fixed

Verification is only worth doing if failures are acted on. Two genuine defects surfaced:

**(a) Unauthorized request on `/account/orders` — fixed.**
`useMyOrders` fired `GET /api/orders` before the session cookie had been verified, so every
signed-out visitor triggered a `401` and a red console error before being redirected. The backend
was behaving correctly; the frontend was asking too early.
*Fix:* `useAsync` gained an `enabled` gate; the two customer-scoped order hooks now wait for
`!initialising && isAuthenticated`. Signed-out visitors produce **no 401 and no console error**;
signed-in customers still load their history — verified end-to-end by placing order
`SHL-20260817-0001` and seeing it render (test data removed afterwards).

**(b) Obsolete Stage-4 notice on the admin dashboard — removed.**
The dashboard still told operators *"Content you save is stored in this browser only… Connecting
the database and secure server-side authentication is the next stage."* This has been false since
Stage 5 — data is in PostgreSQL behind HttpOnly-cookie auth. Misleading copy, now deleted.

---

## 5. Post-cleanup verification (all run after the deletion and recovery)

| # | Check | Result |
|---|---|---|
| 1 | Clean install (frontend) | `npm ci` — 111 packages |
| 2 | Clean install (backend) | `npm ci` — 285 packages |
| 3 | TypeScript (frontend) | `tsc -b` → **0 errors** |
| 4 | TypeScript (backend) | `tsc --noEmit` → **0 errors** |
| 5 | Lint | oxlint → **0 errors**, 2 dev-only fast-refresh warnings, 166 files |
| 6 | Production build | **OK in 1.61s** |
| 7 | API server | starts, `/api/products`, `/api/categories`, `/api/homepage` → **200** |
| 8 | Storefront server | serves the built app |
| 9 | Database connectivity | 17 products / 21 media / 7 categories / 4 brands / 2 banners / 1 admin |
| 10 | **Stage 5 audit** | **161 / 161 passed** |
| 11 | **Stage 6 audit** | **226 / 226 passed** |
| 12 | **Route & link crawl** | **38 / 38 passed** — every nav link, category, product and brand filter resolves |
| 13 | Customer login | register → sign in → order history renders |
| 14 | Admin login | authenticates, dashboard loads |
| 15 | Order creation | `SHL-20260817-0001` created transactionally; totals computed server-side |
| 16 | Free-form variants | Backend correctly rejected a colour on a product that has none — per-product validation, **no global dictionary** |
| 17 | Homepage rendering | All 10 sections present with content at full opacity |
| 18 | Responsive | 390 px → **0 px horizontal overflow**; verified at 1024/1280/1440/1920 |
| 19 | Console errors | **0 across the entire run** |
| 20 | Secrets in bundle | `DATABASE_URL`, `postgresql://`, `SESSION_SECRET`, `JWT_SECRET`, bcrypt hashes → **0 matches in `dist/`** |
| 21 | `.env.example` | Placeholders only; real values never printed in this report |
| 22 | Vulnerabilities | Backend **0**; frontend 2 moderate (see §7) |
| 23 | DB recovery | Cluster deleted and rebuilt — **checksum identical** |
| 24 | Migrations | 3 migrations + `migration_lock.toml` intact; `migrate deploy` builds 12 tables |
| 25 | Seed | Reproduces the catalogue exactly |
| 26 | Nothing important removed | Source, assets, migrations, tests, deps: **all retained** |

**Total automated: 425 / 425 checks passing.**

---

## 6. Retained deliberately (and why)

- **`src/data/mock/*` (5 files)** — the seed source read by `prisma/seed.ts`. Not dead code.
- **4 byte-identical image pairs** — same bytes, two semantic roles, both referenced.
- **All 30 public assets** — every one is referenced.
- **All 3 migrations + `migration_lock.toml`** — required to rebuild the schema.
- **All 9 Prisma models** — none dropped for being sparsely populated (`CustomerUser`, `Order`, `OrderItem` are empty only because test data was cleaned up).
- **All documentation** (`README`, `STAGE-2/3/4/5/6-COMPLETION.md`, ~68 KB) — project history.
- **`tests/audit5.mjs`, `tests/audit6.mjs`** — the regression suite that validated this cleanup.
- **`backups/`** — the proven-restorable dump the deletion depended on.
- **All dependencies** — no unused package found.

## 7. Not removed, flagged for your decision

- **2 moderate advisories in `react-router` 7.17.0** (open redirect via backslash; constructor
  injection in SSR hydration). The fix requires `react-router-dom@7.18.2`, a **breaking major
  change**. The second advisory concerns SSR hydration, which this SPA does not use. Upgrading is a
  deliberate change with regression risk, so it was **not** performed inside a cleanup task.
  *Recommended as a separate, tested change.*
- **2 oxlint warnings** (`Toast.tsx`, `Field.tsx`) — `only-export-components` fast-refresh hints.
  Co-locating `useToast` with its provider is idiomatic; splitting the files would add indirection
  for a dev-only ergonomics rule. **No production impact.**
- **`.pki/` and `.sudo_as_admin_successful`** — created by the operating system in the home
  directory, not by this project. Left untouched.

## 8. Guarantees honoured

No redesign, no rewrite, no downgrade. The real backend was **not** swapped for mocks, and
PostgreSQL was **not** swapped for localStorage. No security feature was weakened. The manual,
free-form size/colour system remains intact — **no table, enum, dictionary or taxonomy** was
introduced, and the backend still validates variants against each product's own authored options.
No large folder was deleted to flatter the numbers: the single large deletion was a regenerable
database cluster, deleted only after its recoverability was proven twice and demonstrated in practice.

---

## 9. Recommendations

1. Schedule the `react-router` 7.18.x upgrade as its own change, with the audit suite as the gate.
2. Keep `backups/shelina_dev.sql` refreshed before any destructive database work — a stale dump
   was found during this audit and would have silently lost the newest content.
3. Run `./restore-db.sh` after any sandbox reset instead of rebuilding the cluster by hand.
4. Continue treating `pgdata/` as runtime state: never commit it, never ship it.
