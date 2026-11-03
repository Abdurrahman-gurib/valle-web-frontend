import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { Fwd } from '@/components/ui/arrows';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';
import { DISPLAY, Eyebrow, PRICE, inclusionIcon, splitDuration, useProductBooking } from './shared';

export interface CardPhoto { src: string; alt: string; position?: string }
/** One inclusion: the line shown (page language) and the English catalog line its icon is read from. */
export interface CardItem { text: string; english: string }

/** "45 min", "1 h", "3 rides": only times get the clock. */
const isTime = (s: string) => /\d\s*(h|min|hour|hr)\b/i.test(s);

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
        <Img src={photo.src} alt={photo.alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: photo.position ?? 'center' }} />
        <span className="sr-card-tag" style={{ background: tagColor, color: tagFg }}>{tag}</span>
        {badge && <span className="pk-badge">{badge}</span>}
      </div>
      <div className="sr-card-body">
        <h3 id={titleId} style={{ ...DISPLAY, margin: 0, fontSize: compact ? 'clamp(22px,2vw,26px)' : 'clamp(28px,2.8vw,36px)', lineHeight: 0.95, color: '#340057' }}>{title}</h3>
        {subtitle && <p className="pk-sub">{subtitle}</p>}
        {items.length > 0 && <Eyebrow className="sr-card-label">{label ?? t('WHAT IS INCLUDED')}</Eyebrow>}
        {items.length > 0 && (
          <ol className="sr-incl">
            {items.map((it, i) => {
              const Icon = inclusionIcon(it.english);
              const [text, hint] = splitDuration(it.text);
              return (
                <li key={it.text + i}>
                  <span aria-hidden className="sr-incl-n">{i + 1}</span>
                  <Icon aria-hidden className="sr-incl-icon" strokeWidth={1.9} />
                  <span className="sr-incl-text">{text}</span>
                  {hint && <span className="sr-chip">{isTime(hint) && <Clock aria-hidden strokeWidth={2.2} />}{hint}</span>}
                </li>
              );
            })}
          </ol>
        )}
        {children}
        <div className="sr-card-foot">
          {single && (
            <div className="sr-price-row">
              <div className="pk-prices">
                <div>
                  <Eyebrow color="rgba(52,0,87,.7)">{singleLabel ?? (pair ? t('SINGLE') : t('PER PERSON'))}</Eyebrow>
                  <div data-testid={priceTestId} dir="ltr" style={{ ...PRICE, fontSize: priceSize, lineHeight: 1, color: '#D91E44', marginTop: 4, unicodeBidi: 'isolate' }}>{single}</div>
                </div>
                {pair && (
                  <div>
                    <Eyebrow color="rgba(52,0,87,.7)">{t('DOUBLE · 2 PEOPLE')}</Eyebrow>
                    <div data-testid={priceTestId ? priceTestId + '-double' : undefined} dir="ltr" style={{ ...PRICE, fontSize: priceSize, lineHeight: 1, color: '#340057', marginTop: 4, unicodeBidi: 'isolate' }}>{dbl}</div>
                  </div>
                )}
              </div>
              <div className="sr-price-note">
                {t('VAT inclusive')}
                {rateChip && <span className="sr-rate">{rateChip}</span>}
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
  if (b.blocked) {
    return (
      <div className="sr-visitor" data-testid="pkg-rate-note">
        <p style={{ margin: 0 }}>{blockedText ?? (b.blocked === 'rr' ? t('This package is sold at the resident rate. You are browsing at the visitor rate.') : t('This package is sold at the visitor rate. You are browsing at the resident rate.'))}</p>
        <button type="button" className="sr-btn sr-btn-outline" onClick={() => b.setRate(b.blocked!)}>{b.blocked === 'rr' ? t('I am a resident: switch to the resident rate') : t('I am visiting: switch to the visitor rate')}</button>
      </div>
    );
  }
  return (
    <div className={onDetails ? 'sr-actions' : 'sr-actions sr-actions-one'}>
      <button type="button" data-testid={bookTestId} className="sr-btn sr-btn-primary" onClick={b.book}>
        {b.inDay ? t('In my day · book now') : (bookLabel ?? t('Book {name}', { name }))} <Fwd />
      </button>
      {onDetails && <button type="button" className="sr-btn sr-btn-outline" onClick={onDetails} aria-label={t('View details of {name}', { name })}>{t('View details')}</button>}
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
      rateChip={rateOnly === 'rr' ? t('RESIDENT RATE · ID REQUIRED') : rateOnly === 'nr' ? t('VISITOR RATE · NR') : undefined}
      actions={<BookActions productKey={productKey} name={name} onDetails={onDetails} bookTestId={bookTestId} blockedText={blockedText} bookLabel={bookLabel} />}
    />
  );
}
