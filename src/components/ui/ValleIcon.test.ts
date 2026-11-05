import { describe, expect, it } from 'vitest';
import { VALLE_ICONS, iconForActivity, iconForInclusion } from './ValleIcon';
import fallback from '../../data/fallback.json';

describe('official icon set', () => {
  it('ships a PNG and a WebP for every icon name', () => {
    const files = Object.keys(import.meta.glob('/public/icons/valle/*.{png,webp}', { query: '?url', import: 'default' }));
    for (const n of VALLE_ICONS) {
      expect(files).toContain(`/public/icons/valle/${n}.png`);
      expect(files).toContain(`/public/icons/valle/${n}.webp`);
    }
  });

  it('maps catalog activities to their icons', () => {
    expect(iconForActivity('zipline', 'adventure')).toBe('zipline');
    expect(iconForActivity('bicycle', 'adventure')).toBe('bicycle-zipline');
    expect(iconForActivity('quad')).toBe('quad');
    expect(iconForActivity('buggy')).toBe('quad');
    expect(iconForActivity('luge')).toBe('luge-kart');
    expect(iconForActivity('nepalese')).toBe('nepalese-bridge');
    expect(iconForActivity('peak')).toBe('landscape');
    expect(iconForActivity('coloured', 'nature')).toBe('landscape');
    expect(iconForActivity('waterfalls', 'nature')).toBe('waterfall');
    expect(iconForActivity('trees', 'nature')).toBe('nature-sprout');
    expect(iconForActivity('animals', 'nature')).toBe('tortoise');
    expect(iconForActivity('giantswing', 'adventure')).toBe('giant-swing');
    expect(iconForActivity('swing', 'adventure')).toBe('giant-swing');
    expect(iconForActivity('bonding', 'kids')).toBe('kids-playground');
    expect(iconForActivity('miniquad', 'kids')).toBe('kids-playground');
    expect(iconForActivity('private', 'tours')).toBe('team-stars');
    expect(iconForActivity('somethingnew')).toBeUndefined();
  });

  it('gives every fallback-catalog activity an icon', () => {
    for (const a of fallback.ACTS) expect(iconForActivity(a.id, a.cat), a.id).toBeDefined();
  });

  it('maps package inclusion lines to their icons', () => {
    expect(iconForInclusion('Admission fee')).toBe('meeting-point');
    expect(iconForInclusion('Sky Pulse Tour (3.1 km, 7 lines)')).toBe('zipline');
    expect(iconForInclusion('The Plunge Zipline (500 m)')).toBe('zipline');
    expect(iconForInclusion('Waterfall Zipline (300 m · 2 lines)')).toBe('zipline');
    expect(iconForInclusion('Giant Swing')).toBe('giant-swing');
    expect(iconForInclusion('Visit of the waterfalls')).toBe('waterfall');
    expect(iconForInclusion('Advenature Flight (5.5 km, 11 lines)')).toBe('zipline');
    expect(iconForInclusion('Mountain Luge Kart (3 rides)')).toBe('luge-kart');
    expect(iconForInclusion('Exclusive Quad Adventure (1 h)')).toBe('quad');
    expect(iconForInclusion('Private guide (zipline & quad)')).toBe('team-stars');
    expect(iconForInclusion('Lunch, Discovery Menu')).toBe('restaurant');
    expect(iconForInclusion('Tea break')).toBe('tea');
    expect(iconForInclusion('GoPro rental (full day) + photo')).toBe('camera');
    expect(iconForInclusion('Full-day cinematic video')).toBe('camera');
    expect(iconForInclusion('The Peak')).toBe('landscape');
    expect(iconForInclusion('Nepalese Bridge (350 m)')).toBe('nepalese-bridge');
    expect(iconForInclusion('Souvenir gift')).toBeUndefined();
    expect(iconForInclusion('Visit by jeep (45 min)')).toBeUndefined();
  });
});
