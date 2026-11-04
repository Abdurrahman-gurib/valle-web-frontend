import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { Fwd } from '@/components/ui/arrows';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';
import { DISPLAY, Eyebrow, PRICE, cover, inclusionIcon, splitDuration, useProductBooking } from './shared';

export interface CardPhoto { src: string; alt: string; position?: string }
/** One inclusion: the line shown (page language) and the English catalog line its icon is read from. */
export interface CardItem { text: string; english: string }

/** "45 min", "1 h", "3 rides": only times get the clock. */
const isTime = (s: string) => /\d\s*(h|min|hour|hr)\b/i.test(s);

/** The numbered inclusions with their icons and hint chips (times get a clock with `clock`). */
export function InclusionList({ items, clock, className }: { items: CardItem[]; clock?: boolean; className?: string }) {
  return (
    <ol className={className ? 'sr-incl ' + className : 'sr-incl'}>
      {items.map((it, i) => {
        const Icon = inclusionIcon(it.english);
        const [text, hint] = splitDuration(it.text);
        return (
          <li key={it.text + i}>
            <span aria-hidden className="sr-incl-n">{i + 1}</span>
            <Icon aria-hidden className="sr-incl-icon" strokeWidth={1.9} />
            <span className="sr-incl-text">{text}</span>
            {hint && <span className="sr-chip">{clock && isTime(hint) && <Clock aria-hidden strokeWidth={2.2} />}{hint}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** A price with its mono label above ("SINGLE", "PER PERSON"). */
export function PriceFigure({ label, value, testId, size, color = '#340057', labelColor = 'rgba(52,0,87,.7)' }: { label: string; value?: string; testId?: string; size: string; color?: string; labelColor?: string }) {
  return (
    <div>
      <Eyebrow color={labelColor}>{label}</Eyebrow>
      <div data-testid={testId} dir="ltr" style={{ ...PRICE, fontSize: size, lineHeight: 1, color, marginTop: 4, unicodeBidi: 'isolate' }}>{value}</div>
    </div>
  );
}

/**
 * A package card, after the official sheets: a large photo with the package
 * tag, the headline, the numbered inclusions with icons and duration chips,
 * then a footer pinned to the bottom (cards in a row line up) with the price
 * per person or the single/double pair, the VAT note and the actions.
 */
export function PackageCard({
  testId = 'package-card', dataKey, titleId, photo, tag, tagColor, tagFg = '#340057', badge, title, subtitle, label, items,
  single, dbl, singleLabel, priceTestId, rateChip, actions, compact, children,
}: {
  testId?: string;
  dataKey?: string;
  titleId: string;
  photo: CardPhoto;
  tag: string;
  tagColor: string;
  tagFg?: string;
  /** a second chip on the photo ("MOST POPULAR") */
  badge?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  label?: string;
  items: CardItem[];
  single?: string;
  dbl?: string;
  singleLabel?: string;
  priceTestId?: string;
  rateChip?: string;
  actions: ReactNode;
  compact?: boolean;
  /** extra content under the inclusions */
  children?: ReactNode;
}) {
  const t = useT();
  const pair = !!dbl;
  const priceSize = compact ? 'clamp(26px,2.4vw,32px)' : pair ? 'clamp(32px,3.2vw,42px)' : 'clamp(40px,4vw,50px)';
  return (
    <article data-testid={testId} data-key={dataKey} aria-labelledby={titleId} className={'sr-card' + (compact ? ' pk-compact' : '')}>
      <div className="sr-card-photo">
        <Img src={photo.src} alt={photo.alt} style={cover(photo.position)} />
        <span className="sr-card-tag" style={{ background: tagColor, color: tagFg }}>{tag}</span>
        {badge && <span className="pk-badge">{badge}</span>}
      </div>
      <div className="sr-card-body">
        <h3 id={titleId} className="pk-card-title" style={{ ...DISPLAY, margin: 0, fontSize: compact ? "clamp(22px,2vw,26px)" : "clamp(28px,2.8vw,36px)", lineHeight: 1, color: "#340057" }}>{title}</h3>
        {subtitle && <p className="pk-sub">{subtitle}</p>}
        {items.length > 0 && <Eyebrow className="sr-card-label">{label ?? t('WHAT IS INCLUDED')}</Eyebrow>}
        {items.length > 0 && <InclusionList items={items} clock />}
        {children}
        <div className="sr-card-foot">
          {single && (
            <div className="sr-price-row">
              <div className="pk-prices">
                <PriceFigure label={singleLabel ?? (pair ? t('SINGLE') : t('PER PERSON'))} value={single} testId={priceTestId} size={priceSize} />
                {pair && <PriceFigure label={t('DOUBLE · 2 PEOPLE')} value={dbl} testId={priceTestId ? priceTestId + '-double' : undefined} size={priceSize} />}
              </div>
              <div className="sr-price-note">
                {t('VAT inclusive')}
                {rateChip && <span className="sr-rate" style={{ fontSize: 12 }}>{rateChip}</span>}
              </div>
            </div>
          )}
          {actions}
        </div>
      </div>
    </article>
  );
}

/**
 * The footer actions of a bookable package: Book (adds product:<key> to My Day
 * and opens the booking page) and View details; a rate switch instead when the
 * product is sold at the other rate.
 */
export function BookActions({ productKey, name, onDetails, bookTestId = 'pkg-book', blockedText, bookLabel }: {
  productKey?: string;
  name: string;
  onDetails?: () => void;
  bookTestId?: string;
  /** what to say when the product is sold at the other rate only */
  blockedText?: string;
  bookLabel?: string;
}) {
  const t = useT();
  const b = useProductBooking(productKey);
  const blocked = b.blocked;
  if (blocked) {
    return (
      <div className="sr-visitor" data-testid="pkg-rate-note">
        <p style={{ margin: 0 }}>{blockedText ?? (blocked === 'rr' ? t('This package is sold at the resident rate. You are browsing at the visitor rate.') : t('This package is sold at the visitor rate. You are browsing at the resident rate.'))}</p>
        <button type="button" className="vbtn vbtn-secondary" onClick={() => b.setRate(blocked)}>{blocked === 'rr' ? t('I am a resident: switch to the resident rate') : t('I am visiting: switch to the visitor rate')}</button>
        {/* what is in the package stays readable at either rate */}
        {onDetails && <button type="button" className="vbtn vbtn-secondary" onClick={onDetails} aria-label={t('View details of {name}', { name })}>{t('View details')}</button>}
      </div>
    );
  }
  return (
    <div className={onDetails ? 'sr-actions' : 'sr-actions sr-actions-one'}>
      <button type="button" data-testid={bookTestId} className="vbtn vbtn-primary" onClick={b.book}>
        {b.inDay ? t('In my day · book now') : (bookLabel ?? t('Book {name}', { name }))} <Fwd />
      </button>
      {onDetails && <button type="button" className="vbtn vbtn-secondary" onClick={onDetails} aria-label={t('View details of {name}', { name })}>{t('View details')}</button>}
    </div>
  );
}

/**
 * A package card for a bookable catalog product: the price for the rate the
 * guest browses at (the catalog label when the product is not listed), the
 * resident/visitor rate chip and the Book / View details actions.
 */
export function ProductCard({ productKey, name, fallbackSingle, fallbackDbl, onDetails, bookTestId, blockedText, bookLabel, ...card }: Omit<Parameters<typeof PackageCard>[0], 'single' | 'dbl' | 'actions' | 'rateChip' | 'dataKey'> & {
  productKey?: string;
  name: string;
  fallbackSingle?: string;
  fallbackDbl?: string;
  onDetails?: () => void;
  bookTestId?: string;
  blockedText?: string;
  bookLabel?: string;
}) {
  const t = useT();
  const b = useProductBooking(productKey);
  const rateOnly = b.product?.rateOnly;
  return (
    <PackageCard
      {...card}
      dataKey={productKey}
      single={b.single ?? fallbackSingle}
      dbl={b.product ? b.dbl : fallbackDbl || undefined}
      rateChip={rateOnly === 'rr' ? t('RESIDENT RATE · ID REQUIRED') : rateOnly === 'nr' ? t('Visitor rate') : undefined}
      actions={<BookActions productKey={productKey} name={name} onDetails={onDetails} bookTestId={bookTestId} blockedText={blockedText} bookLabel={bookLabel} />}
    />
  );
}
