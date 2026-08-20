import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

/**
 * Single Prisma client for the process. Prisma 7 takes the connection through
 * a driver adapter rather than the schema file.
 */
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prisma = new PrismaClient({
  adapter,
  log: env.isProduction ? ['error'] : ['error', 'warn'],
});
