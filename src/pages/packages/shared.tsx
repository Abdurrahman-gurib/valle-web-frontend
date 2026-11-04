import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Fwd } from '@/components/ui/arrows';
import {
  Bike, Binoculars, Cable, CalendarDays, Camera, Car, Check, Clapperboard, Coffee, ConciergeBell, CupSoda, Flame, Flag, Footprints, Gift,
  GlassWater, Images, Mountain, Printer, Salad, Ticket, Trophy, UtensilsCrossed, Waves, type LucideIcon,
} from 'lucide-react';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { paths, useGoto } from '../../lib/nav';
import { money } from '../../lib/format';
import { useT } from '../../i18n';
import type { Product } from '../../types';
import { headingTilt } from '@/components/ui/heading';

/**
 * Shared pieces of the package class pages (/packages/<class>): type styles,
 * the section head, the fine-print line, the inclusion icons and the booking
 * path every package card uses (product:<key> in My Day, then /booking).
 */

export const MONO = "'Chivo Mono',monospace";
/** Barlow black italic: every package heading starts from it. */
export const BLACK_ITALIC: CSSProperties = { fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900 };
export const DISPLAY: CSSProperties = { ...BLACK_ITALIC, textTransform: 'uppercase', textWrap: 'balance' };
/** Prices keep their "Rs" casing. */
export const PRICE: CSSProperties = { ...DISPLAY, textTransform: 'none' };
export const PHONE = '+230 660 4477';
export const TEL = 'tel:+2306604477';
/** The course / reason labels of the menu lists: 12.5px and a deep violet, so they stay readable (the sheet's 11px was too faint). */
export const MENU_DT: CSSProperties = { fontSize: 12.5, color: '#5B21B6' };
/** The shared H2 (see components/ui/heading.tsx): -3° tilt from the start edge. */
export const H2: CSSProperties = { ...DISPLAY, margin: '14px 0 0', fontSize: 'var(--fs-h2)', lineHeight: 0.92, color: '#340057', ...headingTilt(2) };

export const rupees = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;

/** A photo filling its positioned frame (card photos, heroes, mosaics). */
export const cover = (position = 'center'): CSSProperties => ({ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: position });

/** Purple text on the light accents, white on the dark ones. */
export const fgOn = (c: string) => (['#7333FF', '#340057'].includes(c.toUpperCase()) ? '#FFFFFF' : '#340057');

/** A package photo chosen for the page (alt still to translate). */
export interface PagePhoto { src: string; alt: string; position: string }

/** The page's own photo of a package, or the catalog image with a generic alt. */
export function photoFor(photos: Record<string, PagePhoto>, key: string | undefined, fallback: string, name: string, t: (s: string, vars?: Record<string, string | number>) => string): PagePhoto {
  const p = key ? photos[key] : undefined;
  return p ? { src: p.src, alt: t(p.alt), position: p.position } : { src: fallback, alt: t('{name} package', { name }), position: 'center' };
}

/** The text button that scrolls to the quote form ("Request a group quote →"). */
export function QuoteLink({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" className="sr-link sr-link-btn" onClick={onClick}>{label} <Fwd /></button>;
}

/** The validity note every class page closes its "Good to know" with. */
export function useValidityItem(): { icon: LucideIcon; title: string; text: string } {
  const t = useT();
  return { icon: CalendarDays, title: t('Validity'), text: t('1 July 2026 to 30 June 2027') };
}

export function Eyebrow({ children, color = '#7333FF', className }: { children: ReactNode; color?: string; className?: string }) {
  return <div className={className} style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color }}>{children}</div>;
}

/** Splits "Visit by jeep (45 min)" into the inclusion and its hint ("45 min"). */
export function splitDuration(s: string): [string, string | null] {
  const m = /^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/.exec(s);
  return m ? [m[1], m[2]] : [s, null];
}

/** Scrolls to a section under the fixed header, without smooth motion when the guest asks for less. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: reduce ? 'auto' : 'smooth' });
}

/** Eyebrow + h2 (+ optional intro) that opens every section of a class page. */
export function SectionHeader({ id, eyebrow, title, intro, onDark }: { id: string; eyebrow: ReactNode; title: ReactNode; intro?: ReactNode; onDark?: boolean }) {
  return (
    <div className="sr-head">
      <Eyebrow color={onDark ? '#33FF74' : '#7333FF'}>{eyebrow}</Eyebrow>
      <h2 id={id} style={{ ...H2, color: onDark ? '#FFFFFF' : '#340057' }}>{title}</h2>
      {intro && <p className="pk-intro" style={onDark ? { color: 'rgba(255,255,255,.85)' } : undefined}>{intro}</p>}
    </div>
  );
}

/**
 * The sheet's footer line: VAT and terms. Only the expo deals are sold non
 * refundable (their own note says so); regular bookings keep free cancellation,
 * so this line no longer claims "all activities sold are non refundable".
 */
export function FineLine({ text }: { text?: string }) {
  const t = useT();
  return (
    <div className="sr-fine">
      <span style={{ fontSize: 12 }}>{text ?? t('ALL PRICES ARE VAT INCLUSIVE · TERMS AND CONDITIONS APPLY')}</span>
      <Link to={paths.terms()} style={{ color: '#340057', textDecoration: 'underline', textUnderlineOffset: 3 }}>{t('Read the terms')}</Link>
    </div>
  );
}

/**
 * The icon for one inclusion, read from the English catalog line (the page
 * shows the translated one at the same index, so icons work in every language).
 */
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/admission|entrance/i, Ticket],
  [/butler|private guide/i, ConciergeBell],
  [/quad/i, Bike],
  [/bicycle/i, Bike],
  [/zipline|flight|tour|plunge|signature/i, Cable],
  [/bridge/i, Footprints],
  [/luge/i, Flag],
  [/peak/i, Mountain],
  [/stone/i, Flame],
  [/snack|beverage/i, CupSoda],
  [/lunch|menu/i, UtensilsCrossed],
  [/tea/i, Coffee],
  [/water/i, GlassWater],
  [/gopro|photo/i, Camera],
  [/cinematic|video|film/i, Clapperboard],
  [/expedition|hunting/i, Binoculars],
  [/jeep|transfer/i, Car],
  [/gift|souvenir/i, Gift],
  [/games/i, Trophy],
  [/print/i, Printer],
  [/salad/i, Salad],
  [/koi|pond/i, Waves],
  [/stills|captured/i, Images],
];
export const inclusionIcon = (english: string): LucideIcon => ICON_RULES.find(([re]) => re.test(english))?.[1] ?? Check;

/** What booking a catalog product looks like from a card: in My Day yet, which rate it is sold at, and the action. */
export function useProductBooking(key?: string) {
  const app = useApp();
  const goto = useGoto();
  const catalog = useCatalog();
  const product: Product | undefined = key ? (catalog.PRODUCTS ?? []).find((p) => p.key === key) : undefined;
  const id = 'product:' + (key ?? '');
  const inDay = !!key && !!app.sel[id];
  /** A resident-only product while browsing at the visitor rate, or the reverse. */
  const blocked: 'rr' | 'nr' | null = product?.rateOnly === 'rr' && app.rate === 'nr' ? 'rr' : product?.rateOnly === 'nr' && app.rate !== 'nr' ? 'nr' : null;
  const book = () => { if (key && !inDay) app.toggleSel(id); goto.booking(); };
  /** Rupee labels for the rate the guest browses at (the catalog's own label when the product is unknown). */
  const nr = app.rate === 'nr';
  const single = product ? money(nr ? product.nr : product.rr) : undefined;
  const dblN = product ? (nr ? product.dblNr : product.dblRr) : null;
  const dbl = dblN != null ? money(dblN) : undefined;
  return { product, inDay, blocked, book, single, dbl, setRate: app.setRate };
}

/** Pairs the translated inclusions with the English ones (same order) for the icons. */
export function cardItems(items: { t: string }[], english?: { t: string }[]) {
  return items.map((it, i) => ({ text: it.t, english: english?.[i]?.t ?? it.t }));
}
