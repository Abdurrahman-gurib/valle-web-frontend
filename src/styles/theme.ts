/**
 * VALLÉ design tokens.
 *
 * The site is styled with inline style objects ported 1:1 from the design file,
 * so these are the single source for the values that repeat across features.
 * Anything already hard-coded inside a ported section is left alone: this exists
 * for new surfaces (back office, careers, chat) so they stay on-brand without
 * copying hex codes around.
 */

export const color = {
  /** Primary brand purple: body text and dark surfaces. */
  purple: '#340057',
  /** Deepest purple: full-bleed dark sections and the mobile nav. */
  deep: '#260040',
  /** Action pink: primary CTAs. */
  pink: '#FF3358',
  pinkDark: '#D91E44',
  /** Nature green: success, "open", confirmations. */
  green: '#33FF74',
  greenDeep: '#12B54A',
  /** Highlight yellow: accents on dark, "most loved" flags. */
  yellow: '#FFFC33',
  /** Tours violet: secondary emphasis. */
  violet: '#7333FF',
  /** Lilac hairline border on light surfaces. */
  border: '#EBE2FF',
  /** Lilac tint: card fills and placeholders on light surfaces. */
  tint: '#F7F3FF',
  white: '#FFFFFF',
  /** Soft status fills used by the booking flow. */
  warnFill: '#FFFFE2',
  okFill: '#E2FFEB',
  errFill: '#FFE2E7',
} as const;

export const font = {
  /** Display: always italic 900 and usually rotated a few degrees. */
  display: "'Barlow',sans-serif",
  /** Mono: eyebrows, labels, codes, timestamps. Always letter-spaced. */
  mono: "'Chivo Mono',monospace",
  /** Body. */
  body: "'Work Sans',sans-serif",
} as const;

/** Ready-made display heading style; pass a fontSize to taste. */
export const display = {
  fontFamily: font.display,
  fontStyle: 'italic',
  fontWeight: 900,
  letterSpacing: '-0.01em',
  lineHeight: 0.9,
  textTransform: 'uppercase',
} as const;

/** Ready-made mono label style. */
export const mono = {
  fontFamily: font.mono,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '.14em',
} as const;

export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

export const shadow = {
  card: '0 18px 40px -22px rgba(52,0,87,.45)',
  lifted: '0 26px 50px -18px rgba(52,0,87,.45)',
  pink: '0 10px 28px -6px rgba(255,51,88,.5)',
  panel: '0 40px 90px -20px rgba(0,0,0,.6)',
} as const;

/** The caution-stripe fill used as a section rule throughout the site. */
export const stripes = 'repeating-linear-gradient(-45deg,#33FF74 0 14px,#340057 14px 28px)';
export const stripesSm = 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)';

/** Motion. Keep durations short: the brand reads as energetic, not floaty. */
export const motion = {
  fast: '.18s cubic-bezier(.2,.7,.2,1)',
  base: '.28s cubic-bezier(.2,.7,.2,1)',
  slow: '.45s cubic-bezier(.2,.7,.2,1)',
  /** Overshoot for elements that pop in (chat panel, badges). */
  spring: '.42s cubic-bezier(.16,1.06,.3,1.12)',
} as const;

/** Single breakpoint the whole site uses. */
export const MOBILE_BREAKPOINT = 1080;

/** Status pill colours shared by the back office. */
export const statusColor: Record<string, { bg: string; fg: string }> = {
  confirmed: { bg: '#E2FFEB', fg: '#12B54A' },
  arrived: { bg: '#EBE2FF', fg: '#7333FF' },
  cancelled: { bg: '#FFE2E7', fg: '#D91E44' },
  draft: { bg: '#F7F3FF', fg: '#7333FF' },
  published: { bg: '#E2FFEB', fg: '#12B54A' },
  closed: { bg: '#F1F1F4', fg: '#6B6B78' },
  new: { bg: '#FFFFE2', fg: '#8A7A00' },
  reviewing: { bg: '#EBE2FF', fg: '#7333FF' },
  shortlisted: { bg: '#E2FFEB', fg: '#12B54A' },
  interviewed: { bg: '#E2F4FF', fg: '#1B6FA8' },
  offered: { bg: '#E2FFEB', fg: '#12B54A' },
  rejected: { bg: '#FFE2E7', fg: '#D91E44' },
  hired: { bg: '#33FF74', fg: '#340057' },
};
