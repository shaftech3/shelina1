import { ensureSchemaMigrations } from '../lib/ensureSchema.js';
import { prisma } from '../lib/prisma.js';

async function runSafeMigration() {
  console.log('[safe-migrate] Starting safe database migration check...');
  try {
    // 1. Clear any stale advisory lock held by idle sessions
    const locks: Array<{ pid: number }> = await prisma.$queryRawUnsafe(`
      SELECT l.pid
      FROM pg_locks l
      LEFT JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE l.locktype = 'advisory' AND (l.objid = 72707369 OR (l.classid = 0 AND l.objid = 72707369))
        AND (a.state = 'idle' OR a.state IS NULL);
    `);

    for (const lock of locks) {
      console.log(`[safe-migrate] Releasing stale advisory lock PID ${lock.pid}...`);
      await prisma.$queryRawUnsafe(`SELECT pg_terminate_backend($1);`, lock.pid);
    }

    // 2. Ensure all migrations are applied
    await ensureSchemaMigrations();

    // 3. Verify migration status
    const applied: Array<{ migration_name: string; finished_at: Date }> = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      WHERE finished_at IS NOT NULL 
      ORDER BY started_at ASC;
    `);

    console.log(`[safe-migrate] Total applied migrations: ${applied.length}`);
    for (const m of applied) {
      console.log(`[safe-migrate]  ✓ ${m.migration_name} (${m.finished_at})`);
    }

    console.log('[safe-migrate] Database migration verification successfully completed.');
  } catch (error) {
    console.error('[safe-migrate] Migration verification encountered an error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSafeMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
