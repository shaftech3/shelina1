import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

let envLoaded = false;

/**
 * Portably resolves and loads the backend .env configuration.
 *
 * Checks candidate locations relative to current working directory and
 * compiled module paths without hardcoding absolute server paths.
 * Prioritizes backend environment (shelina-api/.env) over root defaults.
 */
export function loadBackendEnv(): void {
  if (envLoaded) {
    return;
  }

  const candidatePaths: string[] = [];

  // 1. Process current working directory candidates
  const cwd = process.cwd();
  candidatePaths.push(
    path.resolve(cwd, 'shelina-api', '.env'),
    path.resolve(cwd, '.env'),
    path.resolve(cwd, '..', 'shelina-api', '.env'),
    path.resolve(cwd, '..', '.env')
  );

  // 2. Relative to compiled bundle/module directory (CJS / dist)
  if (typeof __dirname !== 'undefined') {
    candidatePaths.push(
      path.resolve(__dirname, '..', 'shelina-api', '.env'),
      path.resolve(__dirname, 'shelina-api', '.env'),
      path.resolve(__dirname, '.env'),
      path.resolve(__dirname, '..', '.env'),
      path.resolve(__dirname, '..', '..', 'shelina-api', '.env'),
      path.resolve(__dirname, '..', '..', '.env'),
      path.resolve(__dirname, '..', '..', '..', 'shelina-api', '.env'),
      path.resolve(__dirname, '..', '..', '..', '.env')
    );
  }

  // Load each candidate that exists. Dotenv does not overwrite existing process.env variables.
  const loadedFiles: string[] = [];
  const seen = new Set<string>();
  for (const envPath of candidatePaths) {
    if (!seen.has(envPath)) {
      seen.add(envPath);
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        loadedFiles.push(envPath);
      }
    }
  }

  // Sanitize CLOUDINARY_URL if present to avoid SDK initialisation crash
  if (process.env.CLOUDINARY_URL) {
    let cleaned = process.env.CLOUDINARY_URL.trim().replace(/^["']|["']$/g, '').trim();
    if (cleaned.startsWith('CLOUDINARY_URL=')) {
      cleaned = cleaned.substring('CLOUDINARY_URL='.length).trim().replace(/^["']|["']$/g, '').trim();
    }
    if (cleaned.startsWith('cloudinary://')) {
      process.env.CLOUDINARY_URL = cleaned;
    } else {
      delete process.env.CLOUDINARY_URL;
    }
  }

  envLoaded = true;
}

// Automatically load on import
loadBackendEnv();
