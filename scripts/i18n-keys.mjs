/**
 * Lists every English source string the public site translates:
 *   - literals passed to t('...'), tr('...') and _t('...') in src/ (the back
 *     office under src/pages/staff and src/pages/hr stays English),
 *   - every descriptive string in the bundled catalog (src/data/fallback.json),
 *     using the same "not text" keys as localizeData().
 *
 *   node scripts/i18n-keys.mjs          -> writes src/i18n/keys.json
 *   import { collectKeys } from '...'   -> used by src/i18n/i18n.test.ts
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const SKIP_DIRS = new Set(['staff', 'hr', 'i18n']);
const NON_TEXT_KEYS = new Set(['id', 'n', 'cat', 'img', 'image', 'src', 'mode', 'pdf', 'key', 'variant', 'href', 'url', 'act', 'color', 'c', 'f', 'bg', 'rr', 'nr', 'menuPdf', 'flatLabel', 'go', 'kind']);

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!SKIP_DIRS.has(name)) out.push(...files(p)); continue; }
    if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(p);
  }
  return out;
}

const unescape = (s, q) => s.replace(/\\n/g, '\n').replace(new RegExp('\\\\' + q, 'g'), q).replace(/\\\\/g, '\\');

export function collectKeys() {
  const keys = new Map(); // key -> first place seen
  const add = (k, where) => { if (k && k.trim() && !keys.has(k)) keys.set(k, where); };

  // 1. t('...') / tr('...') / _t('...') literals
  const call = /(?<![\w.])(?:t|tr|_t)\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  const dynamic = [];
  for (const f of files(SRC)) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(call)) {
      const [, q, body] = m;
      if (q === '`' && body.includes('${')) { dynamic.push(relative(root, f) + ': ' + body.slice(0, 60)); continue; }
      add(unescape(body, q), relative(root, f));
    }
  }

  // 2. catalog text
  const cat = JSON.parse(readFileSync(join(SRC, 'data', 'fallback.json'), 'utf8'));
  const looksLikeText = (s) => /[A-Za-zÀ-ÿ]/.test(s) && !/^(\/|https?:|#[0-9a-f]{3,8}$|rgba?\()/i.test(s) && !/\.(avif|webp|png|jpe?g|svg|pdf|mp4)$/i.test(s);
  const walk = (v, key, path) => {
    if (typeof v === 'string') { if (!(key && NON_TEXT_KEYS.has(key)) && looksLikeText(v)) add(v, 'catalog:' + path); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, key === 'gallery' ? 'src' : undefined, path + '[' + i + ']')); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k, path + '.' + k);
  };
  walk(cat, undefined, '');

  // 3. price-list option labels: kept English as keys, displayed through t(row.n)
  for (const rows of Object.values(cat.PL || {})) for (const r of rows) add(r.n, 'catalog:PL');
  // per-unit labels ("/ buggy") stay English in data (logic reads them) and are displayed through t()
  for (const a of cat.ACTS || []) if (a.flatLabel) add(a.flatLabel, 'catalog:flatLabel');

  return { keys: [...keys.keys()].sort((a, b) => a.localeCompare(b)), where: Object.fromEntries(keys), dynamic };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { keys, dynamic } = collectKeys();
  writeFileSync(join(SRC, 'i18n', 'keys.json'), JSON.stringify(keys, null, 1) + '\n');
  console.log(`${keys.length} keys -> src/i18n/keys.json`);
  if (dynamic.length) console.log(`${dynamic.length} template literals with \${} inside t() (not translatable, use {placeholders}):\n  ` + dynamic.join('\n  '));
}
