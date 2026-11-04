import type { ReactNode } from 'react';
import { ArrowDown, Phone } from 'lucide-react';
import { Img } from '../../components/Img';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { useT } from '../../i18n';
import { headingTilt } from '@/components/ui/heading';
import { DISPLAY, Eyebrow, PHONE, PRICE, TEL, cover } from './shared';

export interface HeroPhoto { src: string; alt: string; width: number; height: number; position: string }

/**
 * The campaign hero every package class page opens with, after the official
 * sheets: the purple field with the yellow VALLÉ logo block, the title, an
 * audience chip, a one-line promise, the "from" price, then "Book" (scrolls to
 * the packages) and the call button; the campaign photo fills the other half.
 */
export function ClassHero({ id, title, chip, promise, from, fromNote, photo, onBook, bookLabel, bookTestId, actions, testId, chipColor = '#D6173F', currency, logo }: {
  /** id of the h1, also the section's label */
  id: string;
  title: ReactNode;
  chip: string;
  promise: ReactNode;
  /** the lowest price, already formatted ("Rs 1,100"); no block when absent */
  from?: string;
  fromNote?: string;
  photo: HeroPhoto;
  onBook?: () => void;
  bookLabel?: string;
  bookTestId?: string;
  /** replaces the default book + call buttons */
  actions?: ReactNode;
  testId?: string;
  chipColor?: string;
  /** the currency picker beside the price (pages whose prices convert) */
  currency?: boolean;
  /** the yellow VALLÉ logo plate above the title (senior page only, after the official sheet) */
  logo?: boolean;
}) {
  const t = useT();
  return (
    <section className="sr-hero" aria-labelledby={id} data-testid={testId}>
      <div className="sr-hero-photo">
        <Img src={photo.src} alt={photo.alt} priority surface="dark" width={photo.width} height={photo.height} style={cover(photo.position)} />
      </div>
      <div className="sr-hero-text">
        {logo && (
          <div className="sr-logo">
            <img src="/images/brand/valle-logo-purple.webp" alt="VALLÉ Advenature™ Park" width={826} height={425} />
          </div>
        )}
        <h1 id={id} style={{ ...DISPLAY, color: '#FFFFFF', fontSize: 'var(--fs-h1)', lineHeight: 0.9, margin: '8px 0 4px', ...headingTilt(1) }}>{title}</h1>
        <span className="sr-age" style={{ background: chipColor }}>{chip}</span>
        <p className="sr-promise">{promise}</p>
        {from && (
          <div className="sr-from">
            <Eyebrow color="#33FF74">{t('FROM')}</Eyebrow>
            <span dir="ltr" style={{ ...PRICE, color: '#FFFC33', fontSize: 'clamp(38px,4vw,52px)', lineHeight: 1, unicodeBidi: 'isolate' }}>{from}</span>
            <span className="sr-from-note">{fromNote ?? t('per person · VAT inclusive')}</span>
            {currency && <span style={{ marginInlineStart: 'auto' }}><CurrencyPicker fg="#FFFFFF" /></span>}
          </div>
        )}
        {currency && !from && <CurrencyPicker fg="#FFFFFF" />}
        <div className="sr-hero-actions">
          {actions ?? (<>
            <button type="button" data-testid={bookTestId} className="vbtn vbtn-on-dark" onClick={onBook}>{bookLabel ?? t('Book a package')} <ArrowDown aria-hidden strokeWidth={2.5} style={{ width: '1.05em', height: '1.05em' }} /></button>
            <CallButton />
          </>)}
        </div>
      </div>
    </section>
  );
}

/** The ghost "Call +230 660 4477" button of the hero. */
export function CallButton({ testId }: { testId?: string }) {
  const t = useT();
  return (
    <a href={TEL} data-testid={testId} className="vbtn vbtn-ghost" aria-label={t('Call VALLÉ on {phone}', { phone: PHONE })}>
      <Phone aria-hidden strokeWidth={2.2} style={{ width: '1em', height: '1em' }} />{t('Call')} <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{PHONE}</span>
    </a>
  );
}
