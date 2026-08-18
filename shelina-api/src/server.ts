import { createApp } from './app.js';
import { env } from './lib/env.js';
import { bootstrapSingleAdmin } from './lib/bootstrapAdmin.js';

const app = createApp();

app.listen(env.port, '0.0.0.0', async () => {
  console.log(`[api] Shelina API listening on http://0.0.0.0:${env.port}`);
  console.log(`[api] environment: ${env.NODE_ENV}`);
  console.log(`[api] CORS allowlist: ${env.corsOrigins.join(', ') || '(none configured)'}`);

  // Guarantee single admin account synchronization on startup
  await bootstrapSingleAdmin();
});
