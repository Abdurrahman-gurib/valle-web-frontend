import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM script without types
import { collectKeys } from '../../scripts/i18n-keys.mjs';
import { LANGS, dictionaries, localizeData, localizePath, stripLang, tr, type Lang } from './index';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n paths', () => {
  it('prefixes every language but English and strips it back', () => {
    expect(localizePath('/explore?cat=kids', 'fr')).toBe('/fr/explore?cat=kids');
    expect(localizePath('/', 'de')).toBe('/de');
    expect(localizePath('/#plan', 'it')).toBe('/it#plan');
    expect(localizePath('/fr/booking', 'en')).toBe('/booking');
    expect(localizePath('/fr/booking', 'it')).toBe('/it/booking');
    expect(stripLang('/fr')).toBe('/');
    expect(stripLang('/de/activities/zipline')).toBe('/activities/zipline');
    expect(stripLang('/fresh-air')).toBe('/fresh-air');
    expect(localizePath('/packages', 'ar')).toBe('/ar/packages');
    expect(stripLang('/ar/booking')).toBe('/booking');
    expect(stripLang('/army')).toBe('/army');
  });

  it('keeps ids, option keys and images when localising catalog data', () => {
    const out = localizeData({ id: 'zipline', name: 'Book your day', n: 'Book your day', img: '/x.avif' }, 'en');
    expect(out.id).toBe('zipline');
    expect(out.n).toBe('Book your day');
  });

  it('fills placeholders and falls back to English', () => {
    expect(tr('{n} adults', { n: 3 }, 'en')).toBe('3 adults');
    expect(tr('A sentence no dictionary has', undefined, 'fr')).toBe('A sentence no dictionary has');
  });
});

describe('dictionaries', () => {
  const { keys, dynamic } = collectKeys() as { keys: string[]; dynamic: string[] };

  it('the source uses no un-translatable template literals inside t()', () => {
    expect(dynamic).toEqual([]);
  });

  for (const lang of LANGS.filter((l) => l !== 'en') as Lang[]) {
    it(`${lang} translates every string the site shows, with the same placeholders`, () => {
      const dict = dictionaries[lang];
      const missing = keys.filter((k) => !dict[k] || !dict[k].trim());
      expect(missing.slice(0, 25), `${missing.length} strings missing in ${lang}.json`).toEqual([]);
      const broken = keys.filter((k) => dict[k] && placeholders(dict[k]).join() !== placeholders(k).join());
      expect(broken.slice(0, 10), `placeholders differ in ${lang}.json`).toEqual([]);
    });
  }
});
