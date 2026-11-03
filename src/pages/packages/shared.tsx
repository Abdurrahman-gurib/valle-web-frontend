import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike, Binoculars, Cable, Camera, Car, Check, Clapperboard, Coffee, ConciergeBell, CupSoda, Flame, Flag, Footprints, Gift,
  GlassWater, Images, Mountain, Printer, Salad, Ticket, Trophy, UtensilsCrossed, Waves, type LucideIcon,
} from 'lucide-react';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { paths, useGoto } from '../../lib/nav';
import { money } from '../../lib/format';
import { useT } from '../../i18n';
import type { Product } from '../../types';

/**
 * Shared pieces of the package class pages (/packages/<class>): type styles,
 * the section head, the fine-print line, the inclusion icons and the booking
 * path every package card uses (product:<key> in My Day, then /booking).
 */

export const MONO = "'Chivo Mono',monospace";
export const DISPLAY: CSSProperties = { fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', textWrap: 'balance' } as CSSProperties;
/** Prices keep their "Rs" casing. */
export const PRICE: CSSProperties = { ...DISPLAY, textTransform: 'none' };
export const PHONE = '+230 660 4477';
export const TEL = 'tel:+2306604477';
export const H2: CSSProperties = { ...DISPLAY, margin: '10px 0 0', fontSize: 'clamp(32px,4vw,52px)', lineHeight: 0.92, color: '#340057' };

export const rupees = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;

export function Eyebrow({ children, color = '#7333FF', className }: { children: ReactNode; color?: string; className?: string }) {
  return <div className={className} style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, letterSpacing: '.16em', color }}>{children}</div>;
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

/** The sheet's footer line: VAT, non refundable, terms. */
export function FineLine({ text }: { text?: string }) {
  const t = useT();
  return (
    <div className="sr-fine">
      <span>{text ?? t('ALL PRICES ARE VAT INCLUSIVE · ALL ACTIVITIES SOLD ARE NON REFUNDABLE · TERMS AND CONDITIONS APPLY')}</span>
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
