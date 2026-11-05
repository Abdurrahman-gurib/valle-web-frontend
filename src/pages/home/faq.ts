import { useT } from '../../i18n';
import { useApp } from '../../store/AppStore';
import { useRawCatalog } from '../../store/CatalogContext';
import { entryPrices } from '../../store/booking';
import { mur } from '../../lib/format';

export interface FaqEntry { id: string; question: string; answer: string }

/**
 * "Questions before you come", the desk's most-asked questions answered from the
 * park rules. One source for the accordion in "Plan your visit" and the page's
 * FAQPage structured data, so the two always read the same, in the same language.
 */
export function usePlanFaq(): FaqEntry[] {
  const t = useT();
  const app = useApp();
  const raw = useRawCatalog();
  const child = entryPrices(raw, app.rate === 'nr' ? 'nr' : 'rr').child;
  return [
    { id: 'pay', question: t('Do I pay when I book?'), answer: t('No. Booking is free. Pay at the gate or online. No cancellation fee on regular bookings; Expo deals are non refundable.') },
    { id: 'kids', question: t('How much do children pay?'), answer: t('Ages 6–11: {child} park entry ({rate}). Under 6: free.', { child: mur(child), rate: app.rate === 'nr' ? t('visitor rate') : t('resident rate') }) },
    { id: 'pass', question: t('What is the Explorer Pass?'), answer: t('Book three or more different adventure activities for the same day and the Explorer Pass takes 15% off them automatically. Promo and partner codes are applied as shown on the booking page and cannot be combined with another code.') },
    { id: 'bring', question: t('What should I bring?'), answer: t('Closed shoes, sunscreen, water and a change of clothes for the waterfalls. Ziplines, quad and buggy have age, height and weight limits, shown on each activity page.') },
    { id: 'waiver', question: t('Do I need to sign a waiver?'), answer: t('Before ziplines, quad, buggy, luge and similar activities every participant, or a parent or guardian for a minor, signs the park’s safety waiver, online from the booking confirmation or at the gate. No signed waiver, no activity.') },
    { id: 'rain', question: t('What happens if it rains?'), answer: t('Most activities run rain or shine. Ziplines pause in strong wind or storms; if the weather stops your day, we postpone it to another date, never lose it.') },
    { id: 'hours', question: t('When is the park open?'), answer: '09:00–17:30 · ' + t('Open every day of the week. Last activity departures around 16:00.') },
  ];
}
