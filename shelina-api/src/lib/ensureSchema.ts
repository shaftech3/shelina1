import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { prisma } from './prisma.js';

/**
 * Safely releases any stale advisory locks held on objid 72707369 (Prisma migration lock)
 * by idle database sessions to prevent P1002 timeouts.
 */
async function clearStaleAdvisoryLocks(): Promise<void> {
  try {
    const locks: Array<{ pid: number; state: string | null }> = await prisma.$queryRawUnsafe(`
      SELECT l.pid, a.state
      FROM pg_locks l
      LEFT JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE l.locktype = 'advisory' AND (l.objid = 72707369 OR (l.classid = 0 AND l.objid = 72707369))
        AND (a.state = 'idle' OR a.state IS NULL);
    `);

    for (const lock of locks) {
      console.log(`[schema] Clearing stale advisory lock from idle backend PID ${lock.pid}...`);
      await prisma.$queryRawUnsafe(`SELECT pg_terminate_backend($1);`, lock.pid);
    }
  } catch {
    // Non-fatal if pg_locks or permissions are restricted
  }
}

/**
 * Ensures all Prisma migration files are applied to the connected PostgreSQL database
 * (including external Neon PostgreSQL) on server boot without relying on external npx binaries.
 */
export async function ensureSchemaMigrations(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.resolve(__dirname, '../../prisma/migrations');

  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  // Clear any stale advisory locks from idle sessions
  await clearStaleAdvisoryLocks();

  // Dynamically discover all migration directories containing migration.sql, sorted chronologically
  const migrationDirs = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(migrationsDir, entry.name, 'migration.sql')))
    .map((entry) => entry.name)
    .sort();

  try {
    // 1. Create _prisma_migrations table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id VARCHAR(36) PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMPTZ,
        migration_name VARCHAR(255) NOT NULL,
        logs TEXT,
        rolled_back_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      );
    `);

    // 2. Check and apply each migration in order
    for (const dirName of migrationDirs) {
      const sqlPath = path.join(migrationsDir, dirName, 'migration.sql');
      if (!fs.existsSync(sqlPath)) continue;

      const applied: unknown[] = await prisma.$queryRawUnsafe(
        'SELECT 1 FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL LIMIT 1',
        dirName,
      );

      if (Array.isArray(applied) && applied.length > 0) {
        continue;
      }

      console.log(`[schema] Applying migration: ${dirName}...`);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');

      // Execute migration SQL
      await prisma.$executeRawUnsafe(sqlContent);

      const migrationId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        'INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ($1, $2, now(), $3, 1)',
        migrationId,
        'applied-' + dirName,
        dirName,
      );
      console.log(`[schema] Successfully applied migration: ${dirName}`);
    }

    // 3. Ensure orders.customerId column is nullable for guest orders
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'customerId' AND is_nullable = 'NO'
          ) THEN
            ALTER TABLE "orders" ALTER COLUMN "customerId" DROP NOT NULL;
          END IF;
        END $$;
      `);
    } catch {
      // Ignore if table doesn't exist yet or already nullable
    }
  } catch (error) {
    console.error('[schema] Migration check/execution error:', error instanceof Error ? error.message : error);
  }
}
