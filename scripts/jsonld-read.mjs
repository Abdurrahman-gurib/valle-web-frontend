/**
 * Reads the JSON-LD blocks of a prerendered page in dist/ (used by
 * src/lib/structuredData.test.ts after `npm run build`; the test skips without a build).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

export const hasBuild = () => existsSync(join(dist, 'activities', 'zipline', 'index.html'));

export function jsonLdOf(file) {
  const html = readFileSync(join(dist, file), 'utf8');
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}
