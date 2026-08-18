import { createApp } from './app.js';
import { env } from './lib/env.js';

const app = createApp();

app.listen(env.port, '0.0.0.0', () => {
  console.log(`[api] Shelina API listening on http://0.0.0.0:${env.port}`);
  console.log(`[api] environment: ${env.NODE_ENV}`);
  console.log(`[api] CORS allowlist: ${env.corsOrigins.join(', ') || '(none configured)'}`);
});
