import { fullDateFromIso } from '../../lib/format';
import type { EmploymentType } from '../../types';
import { color } from '../../styles/theme';
import { tr, _t } from '../../i18n';

/** Shared by the careers pages (/vacancies and /vacancies/:slug). */

/** Where applications and speculative letters go. */
export const CAREERS_EMAIL = 'sales@vallepark.com';

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  'full-time': _t('FULL TIME'),
  'part-time': _t('PART TIME'),
  seasonal: _t('SEASONAL'),
  internship: _t('INTERNSHIP'),
};

const EMPLOYMENT_COLOR: Record<EmploymentType, { bg: string; fg: string }> = {
  'full-time': { bg: color.green, fg: color.purple },
  'part-time': { bg: color.yellow, fg: color.purple },
  seasonal: { bg: color.violet, fg: color.white },
  internship: { bg: color.pink, fg: color.white },
};

/** Pill colours for a contract type (lilac tint for one the site does not know). */
export function employmentStyle(employment: EmploymentType): { background: string; color: string } {
  const c = EMPLOYMENT_COLOR[employment] || { bg: color.tint, fg: color.purple };
  return { background: c.bg, color: c.fg };
}

/** Mono label: Chivo Mono 10.5px bold, letter-spaced. */
export const MONO = 'font-mono text-[10.5px] font-bold tracking-[.14em]';
/** Display heading: Barlow italic 900, uppercase, tight. */
export const DISPLAY = 'font-display italic font-black tracking-[-0.01em] leading-[0.9] uppercase';
/** Page frame of both careers pages, under the fixed header. */
export const PAGE = 'max-w-[1320px] mx-auto pt-[104px] px-[clamp(16px,3.5vw,40px)] pb-0';

/** "Closes Thu 30 Sep 2026", or an evergreen line when the role has no end date. */
export function closesLabel(closesOn: string | null): string {
  if (!closesOn) return tr('OPEN UNTIL FILLED');
  const full = fullDateFromIso(closesOn.slice(0, 10));
  return full ? tr('CLOSES {date}', { date: full.toUpperCase() }) : tr('OPEN UNTIL FILLED');
}
