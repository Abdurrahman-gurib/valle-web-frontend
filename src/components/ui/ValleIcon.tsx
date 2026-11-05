import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * The park's official icon set (owner-supplied, public/icons/valle/*.png).
 * Each icon is a single-colour shape, drawn here as a CSS mask filled with
 * currentColor, so it takes the text colour of wherever it sits: purple on
 * light surfaces, white or yellow on purple and photos.
 *
 * The set is for content (activities, inclusions, visit info). UI controls
 * (chevrons, close, menu, play, search) keep their Lucide icons.
 */
export const VALLE_ICONS = [
  'luge-kart', 'team-stars', 'bicycle-zipline', 'tea', 'nature-sprout', 'kids-playground', 'camera', 'nepalese-bridge',
  'quad', 'restaurant', 'zipline', 'events', 'meeting-point', 'landscape', 'boots',
  'giant-swing', 'tortoise', 'waterfall',
] as const;
export type ValleIconName = (typeof VALLE_ICONS)[number];

export const valleIconUrl = (name: ValleIconName) => `/icons/valle/${name}.png`;

export function ValleIcon({ name, size = 20, label, className, style }: {
  name: ValleIconName;
  size?: number | string;
  /** Translated text when the icon carries meaning on its own; otherwise it is decorative (aria-hidden). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const url = `url(${valleIconUrl(name)})`;
  const dim = typeof size === 'number' ? `${size}px` : size;
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };
  return (
    <span
      {...a11y}
      data-icon={name}
      className={cn('valle-icon', className)}
      style={{
        display: 'inline-block', flex: 'none', width: dim, height: dim, backgroundColor: 'currentColor', verticalAlign: '-0.2em',
        WebkitMaskImage: url, maskImage: url, WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center',
        ...style,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Mappings from catalog ids and English lines to icons.               */
/* ------------------------------------------------------------------ */

/** Kids Park rides (catalog ids). */
const KIDS_IDS = /^(pirate|bonding|coaster|playground|miniquad|miniexc|kaz|kids)/i;

/**
 * The icon for a catalog activity, from its id (and category when the id says
 * nothing). Unknown activities get no icon rather than a wrong one.
 */
export function iconForActivity(id: string, cat?: string): ValleIconName | undefined {
  const s = id.toLowerCase();
  if (/bicycle|bike/.test(s)) return 'bicycle-zipline';
  if (/luge/.test(s)) return 'luge-kart';
  if (/nepal|bridge/.test(s)) return 'nepalese-bridge';
  if (/quad|buggy/.test(s) && !/mini/.test(s)) return 'quad';
  if (KIDS_IDS.test(s)) return 'kids-playground';
  if (/swing/.test(s)) return 'giant-swing';
  if (/waterfall|cascade/.test(s)) return 'waterfall';
  if (/animal|tortoise|deer/.test(s)) return 'tortoise';
  if (/zip|tour|plunge|flight/.test(s)) return 'zipline';
  if (/peak|coloured|colored|earth|scenic|view/.test(s)) return 'landscape';
  if (/tree|rock|garden|trail|nature|eco/.test(s)) return 'nature-sprout';
  if (/expedition|private|group|team|vip/.test(s)) return 'team-stars';
  if (/photo|cinematic|gopro|film|video/.test(s)) return 'camera';
  if (/lunch|restaurant|menu|dine/.test(s)) return 'restaurant';
  const c = (cat ?? '').toLowerCase();
  if (/kids/.test(c)) return 'kids-playground';
  if (/zip/.test(c)) return 'zipline';
  if (/nature|discover/.test(c)) return 'landscape';
  if (/drive|motor|quad/.test(c)) return 'quad';
  return undefined;
}

/** Ordered: the first rule that matches the English line wins. */
const INCLUSION_RULES: [RegExp, ValleIconName][] = [
  [/butler|guide|\bvip\b|\bteam|private|group expedition/i, 'team-stars'],
  [/bicycle/i, 'bicycle-zipline'],
  [/luge/i, 'luge-kart'],
  [/nepal|bridge/i, 'nepalese-bridge'],
  [/quad|buggy/i, 'quad'],
  [/kids|playground|pirate|coaster|bonding/i, 'kids-playground'],
  [/gopro|photo|cinematic|video|film|stills|captured/i, 'camera'],
  [/swing/i, 'giant-swing'],
  [/animal|tortoise|deer/i, 'tortoise'],
  // before waterfall, so "Waterfall Zipline" stays a zipline
  [/zip|plunge|flight|\btours?\b|signature/i, 'zipline'],
  [/waterfall|cascade/i, 'waterfall'],
  [/\btea\b|coffee|café|\bcafe\b|snack|beverage/i, 'tea'],
  [/lunch|menu|restaurant|dinner|meal/i, 'restaurant'],
  [/peak|coloured earth|colored earth|scenery|viewpoint|expedition|hunting/i, 'landscape'],
  [/tree|rock|garden|nature|trail|\beco|koi|pond/i, 'nature-sprout'],
  [/admission|entrance|\bentry\b|meeting point/i, 'meeting-point'],
  [/\bevents?\b|calendar|validity|\bdates?\b/i, 'events'],
  [/\bwear\b|shoe|boot|\bwalk/i, 'boots'],
];

/** The icon for one package inclusion, read from its English catalog line. */
export function iconForInclusion(text: string): ValleIconName | undefined {
  return INCLUSION_RULES.find(([re]) => re.test(text))?.[1];
}
