import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Portably load backend .env for root Prisma CLI executions
const candidates = [
  path.resolve(process.cwd(), 'shelina-api', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, 'shelina-api', '.env'),
  path.resolve(__dirname, '.env'),
];

for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export default defineConfig({
  schema: path.join('shelina-api', 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx shelina-api/prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://shelina@127.0.0.1:5432/shelina_dev?schema=public',
  },
});
