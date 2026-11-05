import { describe, expect, it } from 'vitest';
import fallback from '../../data/fallback.json';
import type { Catalog } from '../../types';
import { packageGroups } from './packageGroups';

const t = (s: string) => s;
const titles = (rate: 'rr' | 'nr' | null) => packageGroups(t, fallback as unknown as Catalog, rate).map((g) => g.title);

describe('packages menu follows the rate', () => {
  it('shows a visitor no resident-only packages, exclusive first', () => {
    const v = titles('nr');
    expect(v[0]).toBe('EXCLUSIVE PACKAGE');
    expect(v).not.toContain('RESIDENT PACKAGE');
    expect(v).not.toContain('SPECIAL DEALS');
  });
  it('puts resident packages before exclusive for a resident', () => {
    const r = titles('rr');
    expect(r.indexOf('RESIDENT PACKAGE')).toBeLessThan(r.indexOf('EXCLUSIVE PACKAGE'));
  });
  it('keeps every group before a rate is chosen', () => {
    expect(titles(null)).toEqual(expect.arrayContaining(['EXCLUSIVE PACKAGE', 'RESIDENT PACKAGE', 'SENIOR CITIZEN', 'RESTAURANTS & MENUS']));
  });
});
