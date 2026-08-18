# Shelina — Complete Workspace Storage Audit

**Date:** 17 August 2026 · **Mode: READ-ONLY.** Nothing was deleted, modified, uninstalled, or stopped.
The database is running and was left running. No source file was touched.

---

## 0. The answer up front: the 46 MB is *not* leftover junk

Your quota reads **1,604 files / 52.3 MB**. My measurement of the snapshot-eligible set returns
**1,604 files / 53 MB** — an exact match, so this audit accounts for 100% of your quota.

**The gap is `pgdata/` — 1,339 files / 47 MB — and it came back *after* the cleanup report was written.**

I deleted it during the cleanup, then **rebuilt it myself** at 13:06 while verifying that
`restore-db.sh` genuinely works. That verification was necessary (it proved the database could be
recovered from nothing), but it left a live cluster on disk. The previous report's
"265 files / 6.3 MB" measured the workspace *excluding* pgdata — that figure is still correct for
project content, and is confirmed again below at **264 files / 6.2 MB**.

```
  1,604 quota files
 −1,339 pgdata (live PostgreSQL cluster, rebuilt 13:06)
 −    1 pgrun  (socket lock)
 ────────
     264 actual project files  =  6.2 MB
```

**Nothing is hiding.** There is no second copy of the project, no `.git`, no archive, no stray log.

---

## 1. Why disk shows 1.5 GB but your quota shows 52.3 MB

| Measurement | Files | Size |
|---|---:|---:|
| Everything on disk under `/home/user` | 20,131 | 1.5 GB |
| **Snapshot-eligible (= your quota)** | **1,604** | **53 MB** |

Snapshots exclude ~21 directory **names** (`node_modules`, `.cache`, `.npm`, `dist`, `build`,
`.vite`, `coverage`, `out`, `target`, …). So the 1.45 GB below **does not consume your quota at all**:

| Excluded from quota | Files | Size |
|---|---:|---:|
| `.cache/ms-playwright` (Chromium ×2) | 597 | **655 MB** |
| `shelina-api/node_modules` | 13,735 | 408 MB |
| `.npm` (npm download cache) | 806 | 183 MB |
| `shelina/node_modules` | 3,220 | 155 MB |
| `node_modules` (root, playwright-core) | 112 | 14 MB |
| `shelina/dist` (production build) | 37 | 3.4 MB |

> **Implication:** deleting `node_modules` or the Playwright cache would free **zero** quota. It
> would only cost you a reinstall. **Do not delete these for quota reasons.**

---

## 2. Full breakdown of the 52.3 MB (largest first)

| # | Path | Size | Files | Type | Required? | Regenerable? |
|---|---|---:|---:|---|---|---|
| 1 | **`pgdata/`** | **47 MB** | **1,339** | Runtime data (PostgreSQL 17 cluster) | **Live now** — the running API reads it | **Yes** — `./restore-db.sh` (~3 s, proven) |
| 2 | `shelina/` | 4.0 MB | 214 | **Source** | **YES** | No — this is the product |
| 3 | `shots6/` | 1.6 MB | 4 | Generated artifacts (screenshots) | No | Yes — `tests/shots6.mjs` |
| 4 | `shelina-api/` | 377 KB | 34 | **Source** | **YES** | No — this is the product |
| 5 | `tests/` | 96 KB | 3 | Test harnesses | **YES** (regression suite) | No |
| 6 | `.pki/` | 68 KB | 3 | OS artifact (NSS cert DB) | Not project | Yes (by the OS) |
| 7 | `backups/` | 56 KB | 2 | **Disaster recovery** | **YES — critical** | Only from a live DB |
| 8 | `CLEANUP-REPORT.md` | 12 KB | 1 | Documentation | Your call | No |
| 9 | `restore-db.sh` | 4 KB | 1 | Tooling | **YES** — rebuilds the DB | No |
| 10 | `.gitignore` | 4 KB | 1 | Config | **YES** | No |
| 11 | `pgrun/` | 512 B | 1 | Runtime socket lock | With running DB | Yes |
| 12 | `.sudo_as_admin_successful` | 0 B | 1 | OS artifact | No | Yes |

### 2a. Inside `pgdata/` (47 MB)

| Component | Size | Note |
|---|---:|---|
| `base/` | 31 MB | 4 databases — **your data is only 8.4 MB** |
| `pg_wal/` | 16 MB | One pre-allocated WAL segment (minimum possible) |
| `global/` + config | 0.6 MB | Cluster catalogues |

Per-database: `shelina_dev` **8.4 MB** · `template1` 7.6 MB · `postgres` 7.5 MB · `template0` 7.4 MB.
The 22.4 MB of templates is mandatory PostgreSQL scaffolding.

> **A freshly initialised cluster is also ~47 MB.** This cannot be meaningfully shrunk in place —
> it is either present (47 MB) or absent (0 MB, restored on demand).
> As a dump it is **41 KB — 1,146× smaller.**

### 2b. Inside `shelina/` (4.0 MB, 214 files)

`public/` **2.9 MB / 30 files** (all referenced) · `src/` 964 KB / 165 files · docs 80 KB / 6 · config 122 KB / 13.
Largest assets: `banner-everyday.jpg` 204 KB, `p10-c.jpg` 168 KB, `banner-craft.jpg` 156 KB.

### 2c. Inside `shelina-api/` (377 KB, 34 files)

`src/` 152 KB / 21 · `prisma/` 49 KB / 6 (schema, seed, 3 migrations) · config 172 KB / 7.

---

## 3. Targeted search results

| Searched for | Found |
|---|---|
| `node_modules` | 4 copies, 17,073 files, 577 MB — **all quota-excluded** |
| Playwright / browser caches | `.cache/ms-playwright` 655 MB (Chromium 389 MB + headless shell 262 MB) — **quota-excluded** |
| `.git` | **None.** Not a git repository |
| `dist` / `build` / `.vite` / `out` / `coverage` | `shelina/dist` (3.4 MB) + in-package dists — **all quota-excluded** |
| Screenshots | 4 files, 1.6 MB, in `shots6/` |
| Old audit artifacts | 3 harnesses (96 KB), 7 markdown docs (92 KB) |
| Backups | 2 files, 56 KB — **verified current** (checksum matches live DB) |
| PostgreSQL data dirs | 1: `pgdata/` (live). `pgrun/` holds only a socket lock |
| Temp files (`.log .tmp .bak .orig ~ .DS_Store .swp`) | **None** |
| Duplicate project copies | **None** — one frontend, one backend |
| Old Arena-generated files | **None** |
| Archives (`.zip .tar .gz .7z .rar`) | **None** (except the intended `backups/*.sql.gz`) |
| Logs | **None** (`pg.log` was gitignored and removed during cleanup) |
| Generated reports | `CLEANUP-REPORT.md` (12 KB) |
| Empty files | 1: `.sudo_as_admin_successful` (OS-created) |

---

## 4. Classification

### A. REQUIRED PROJECT FILES — 253 files / 4.5 MB · **never delete**
`shelina/` (214) · `shelina-api/` (34) · `.gitignore` · `restore-db.sh` · `backups/` (2, verified current) · `tests/` (3).

*Note: `tests/shots6.mjs` is not referenced by the other harnesses, but it is the generator for the
screenshots in §B — keeping it is what makes those screenshots regenerable.*

### B. REGENERABLE — 1,344 files / 48.6 MB
| Item | Files | Size | How to regenerate | Cost |
|---|---:|---:|---|---|
| `pgdata/` | 1,339 | 47 MB | `./restore-db.sh` | ~3 s |
| `pgrun/` | 1 | 512 B | Automatic on DB start | instant |
| `shots6/` | 4 | 1.6 MB | `node tests/shots6.mjs` | ~30 s |

### C. SAFE TO DELETE (no approval needed) — 4 files / 68 KB
| Item | Size | Why safe |
|---|---:|---|
| `.pki/nssdb/` (3 files) | 68 KB | Chromium's cert store, created by headless runs. Not project data. |
| `.sudo_as_admin_successful` | 0 B | Empty OS marker file. |

**Total genuinely "junk": 68 KB (0.13%).** This is the honest answer — there is almost nothing to sweep up.

### D. REQUIRES YOUR APPROVAL

**D1 — `pgdata/` + `pgrun/` · 1,340 files / 47 MB · 89.8% of your quota**
The only decision that materially changes the number.
- ✅ Fully recoverable: dump verified current *today*; two independent recovery paths proven; `restore-db.sh` tested from a truly empty state.
- ✅ Gitignored, never deployed; production uses a managed database.
- ⚠️ **It is live right now** — the running API is serving from it. Deleting requires stopping PostgreSQL first, and you must re-run `./restore-db.sh` before using the app again.
- ⚠️ Contains 0 orders / 0 customers — **no user data at risk**; the catalogue is fully reproducible.

**D2 — `shots6/` · 4 files / 1.6 MB**
Visual evidence for the cleanup report. Regenerable via `tests/shots6.mjs`.

**D3 — Documentation · 7 files / 92 KB**
`CLEANUP-REPORT.md` + `README.md` + 5× `STAGE-*-COMPLETION.md`. Project history; **I recommend keeping** — 92 KB buys a lot of context.

---

## 5. Final figures

| Metric | Value |
|---|---:|
| **Total workspace (quota-counted)** | **1,604 files / 53 MB** |
| Total on disk (incl. excluded dirs) | 20,131 files / 1.5 GB |
| **Shelina source** (`shelina` + `shelina-api`) | **248 files / 4.4 MB** |
| Project total excluding runtime DB | 264 files / 6.2 MB |
| `pgdata/` (runtime DB) | 1,339 files / 47 MB |
| `shots6/` | 4 files / 1.6 MB |
| `tests/` | 3 files / 96 KB |
| `backups/` | 2 files / 56 KB |
| `.pki/` | 3 files / 68 KB |

### Removal potential

| Scenario | Frees | Result | Risk |
|---|---:|---|---|
| **Safe only** (category C) | 4 files / **68 KB** | 1,600 files / 52.2 MB | None |
| **+ screenshots** (D2) | 8 files / **1.67 MB** | 1,596 files / 50.6 MB | None — regenerable |
| **+ pgdata** (D1) ← *the real win* | 1,348 files / **48.7 MB** | **256 files / 4.3 MB** | Must run `./restore-db.sh` before next use |
| Everything incl. docs (D3) | 1,355 files / **48.8 MB** | 249 files / 4.2 MB | Loses project history |

> **Recommended:** C + D2 + D1 → **1,604 → 256 files (−84.0%)** and **52.3 MB → 4.3 MB (−91.8%)**,
> i.e. **3.3% of your 128 MB quota**, with the database one command away.

---

## 6. What I recommend *against*

1. **Do not delete `node_modules` or `.cache/ms-playwright` to save quota** — they are already excluded. You would free 0 MB and pay a long reinstall.
2. **Do not delete `backups/`** — 56 KB is what makes the 47 MB deletion safe.
3. **Do not delete `tests/`** — 96 KB; it is the 425-check suite that validates every change.
4. **Do not try to shrink `pgdata/` in place** — a fresh cluster is the same size. It is all-or-nothing.

## 7. Awaiting your decision

No files were deleted, no source modified, no dependency removed, and the database is still running.
Tell me which of **D1 / D2 / D3** to proceed with (C is trivially safe and can be bundled in), and
I will regenerate the backup immediately beforehand, stop PostgreSQL cleanly, delete only what you
approve, and verify the app afterwards.
