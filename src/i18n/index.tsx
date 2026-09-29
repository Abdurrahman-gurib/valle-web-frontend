import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';

/**
 * Languages of the public site. English lives at the root (/explore), every
 * other language under its prefix (/fr/explore, /de/explore, /it/explore), so
 * each page has one crawlable URL per language and hreflang can link them.
 *
 * Translation is by source text: `t('Book your day')` looks the English string
 * up in the language's dictionary and falls back to English when missing, so a
 * new or edited sentence is never blank. Dictionaries are flat JSON maps
 * (src/i18n/<lang>.json); `npm run i18n:extract` lists every key the site uses
 * and src/i18n/i18n.test.ts fails when a language lacks one.
 *
 * Placeholders: `t('{n} adults', { n: 3 })`. Keep them identical in translations.
 */
export const LANGS = ['en', 'fr', 'de', 'it'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_META: Record<Lang, { name: string; short: string; locale: string; og: string }> = {
  en: { name: 'English', short: 'EN', locale: 'en-GB', og: 'en_MU' },
  fr: { name: 'Français', short: 'FR', locale: 'fr-FR', og: 'fr_FR' },
  de: { name: 'Deutsch', short: 'DE', locale: 'de-DE', og: 'de_DE' },
  it: { name: 'Italiano', short: 'IT', locale: 'it-IT', og: 'it_IT' },
};

const DICTS: Record<Lang, Record<string, string>> = {
  en: {},
  fr: fr as Record<string, string>,
  de: de as Record<string, string>,
  it: it as Record<string, string>,
};

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

/** Language of the page being rendered; set by LangProvider on every render (like the display currency). */
let current: Lang = 'en';
export const currentLang = (): Lang => current;
export function setCurrentLang(lang: Lang): void { current = lang; }

/** Translate `s` into `lang` (default: the current page's language), filling {placeholders}. */
export function tr(s: string, vars?: Record<string, string | number>, lang: Lang = current): string {
  let out = lang === 'en' ? s : (DICTS[lang][s] || s);
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
  return out;
}

/**
 * Identity marker for text that lives in data files (map pins, tour copy...).
 * It changes nothing at runtime; the extractor collects `_t('...')` literals so
 * the dictionaries cover them, and the component renders them through `t()`.
 */
export const _t = (s: string): string => s;

/** '/fr/explore' -> 'fr'; anything else (including /staff) -> 'en'. */
export function langFromPath(pathname: string): Lang {
  const seg = pathname.split('/')[1] || '';
  return seg !== 'en' && isLang(seg) ? seg : 'en';
}

/** '/fr/explore?x#y' -> '/explore?x#y'; '/fr' -> '/'. */
export function stripLang(path: string): string {
  const m = path.match(/^\/(fr|de|it)(?=\/|$|\?|#)(.*)$/);
  if (!m) return path || '/';
  const rest = m[2] || '/';
  return rest.startsWith('/') ? rest : '/' + rest;
}

/** '/explore?cat=kids' + 'fr' -> '/fr/explore?cat=kids'; '/' -> '/fr'; '/#plan' -> '/fr#plan'. */
export function localizePath(path: string, lang: Lang = current): string {
  const bare = stripLang(path);
  if (lang === 'en') return bare;
  if (bare === '/') return '/' + lang;
  if (bare.startsWith('/#') || bare.startsWith('/?')) return '/' + lang + bare.slice(1);
  return '/' + lang + bare;
}

const Ctx = createContext<Lang>('en');

/**
 * Derives the language from the URL for the whole app (the store and the
 * catalog sit above the routes and need it too), keeps <html lang> in step and
 * remembers the choice for the suggestion banner.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const lang = langFromPath(pathname);
  setCurrentLang(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('valle_lang', lang); } catch { /* private mode */ }
  }, [lang]);
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function useLang(): Lang {
  return useContext(Ctx);
}

/** `const t = useT(); t('Book now')` */
export function useT(): (s: string, vars?: Record<string, string | number>) => string {
  const lang = useLang();
  return useMemo(() => (s: string, vars?: Record<string, string | number>) => tr(s, vars, lang), [lang]);
}

/** Keys that identify things rather than describe them: never translated in catalog data. */
const NON_TEXT_KEYS = new Set(['id', 'n', 'cat', 'img', 'image', 'src', 'mode', 'pdf', 'key', 'variant', 'href', 'url', 'act', 'color', 'c', 'f', 'bg', 'rr', 'nr', 'menuPdf', 'flatLabel', 'go', 'kind']);

/** Deep copy of a catalog-like object with every descriptive string translated. */
export function localizeData<T>(data: T, lang: Lang): T {
  if (lang === 'en') return data;
  const walk = (v: unknown, key?: string): unknown => {
    if (typeof v === 'string') {
      if (key && NON_TEXT_KEYS.has(key)) return v;
      return DICTS[lang][v] || v;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, key === 'gallery' ? 'src' : undefined));
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = walk(x, k);
      return out;
    }
    return v;
  };
  return walk(data) as T;
}

/** For tests and the extractor. */
export const dictionaries = DICTS;
