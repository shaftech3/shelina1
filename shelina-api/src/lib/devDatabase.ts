import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

let isReady = false;

function isPortOpen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

/**
 * In non-production environments where a standalone PostgreSQL server is not
 * reachable on localhost:5432, this starts an embedded PostgreSQL-compatible
 * PGlite TCP server on 127.0.0.1:5432 and ensures migrations & seed are applied.
 */
export async function ensureDevDatabaseReady(): Promise<void> {
  if (isReady || env.isProduction) {
    return;
  }

  const isLocalDb = env.databaseUrl.includes('127.0.0.1') || env.databaseUrl.includes('localhost');
  if (!isLocalDb) {
    isReady = true;
    return;
  }

  const alreadyRunning = await isPortOpen(5432, '127.0.0.1');
  if (alreadyRunning) {
    isReady = true;
    return;
  }

  try {
    const { PGlite } = await import('@electric-sql/pglite');
    const { fromNodeSocket } = await import('pg-gateway/node');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const apiRoot = path.resolve(__dirname, '../..');
    const dbDir = path.join(apiRoot, 'pgdata-dev');

    const db = new PGlite(dbDir);

    // Apply migrations if tables don't exist
    const migDir = path.join(apiRoot, 'prisma/migrations');
    if (fs.existsSync(migDir)) {
      const folders = fs
        .readdirSync(migDir)
        .filter((f) => fs.statSync(path.join(migDir, f)).isDirectory())
        .sort();

      for (const folder of folders) {
        const sqlPath = path.join(migDir, folder, 'migration.sql');
        if (fs.existsSync(sqlPath)) {
          const raw = fs.readFileSync(sqlPath, 'utf8');
          const cleaned = raw.replace(/--.*$/gm, '').trim();
          const statements = cleaned.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
          for (const stmt of statements) {
            try {
              await db.exec(stmt);
            } catch {
              // Table / index already exists
            }
          }
        }
      }
    }

    // Start TCP Gateway Server on 127.0.0.1:5432
    const server = net.createServer(async (socket) => {
      await fromNodeSocket(socket, {
        serverVersion: '16.3',
        auth: { method: 'trust' },
        async onMessage(data, { isAuthenticated }) {
          if (isAuthenticated) {
            return await db.execProtocolRaw(data);
          }
        },
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(5432, '127.0.0.1', () => {
        console.log('[dev] Embedded PostgreSQL (PGlite) active on 127.0.0.1:5432');
        resolve();
      });
      server.on('error', () => {
        resolve();
      });
    });

    isReady = true;

    // Seed catalogue if empty
    try {
      const { prisma } = await import('./prisma.js');
      const count = await prisma.product.count();
      if (count === 0) {
        console.log('[dev] Seeding catalogue into development database...');
        const seedModule = await import('../../prisma/seed.js');
        if (typeof seedModule.seedDatabase === 'function') {
          await seedModule.seedDatabase();
        }
      }
    } catch (seedErr) {
      console.warn('[dev] Seed notice:', seedErr);
    }
  } catch (err) {
    console.warn('[dev] Could not start embedded dev database:', err);
  }
}
