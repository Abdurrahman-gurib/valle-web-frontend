import type { ReactNode } from 'react';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';
import type { PackItem } from '../../types';
import type { HeroPhoto } from './ClassHero';
import { BookActions, InclusionList, PriceFigure } from './PackageCard';
import { DISPLAY, Eyebrow, MONO, cardItems, cover, useProductBooking } from './shared';

const FEATURE_PRICE = 'clamp(36px,3.6vw,48px)';

/** The premium treatment of VIP Ultimate and Diamond: big photo (and a mosaic), all inclusions in two columns, the prices and the actions. */
export function FeaturePackage({ eyebrow, testId, productKey, name, title, titleId, chip, lead, items, english, photo, mosaic, note, blockedText, fallbackSingle, fallbackDbl, onDetails }: {
  eyebrow: string; testId: string; productKey?: string; name: string; title: ReactNode; titleId: string; chip: string; lead?: string;
  items: PackItem[]; english?: PackItem[]; photo: HeroPhoto; mosaic?: HeroPhoto[]; note?: ReactNode; blockedText?: string;
  fallbackSingle?: string; fallbackDbl?: string; onDetails?: () => void;
}) {
  const t = useT();
  const b = useProductBooking(productKey);
  const single = b.single ?? fallbackSingle;
  const dbl = b.product ? b.dbl : fallbackDbl;
  return (
    <article className="pk-feature" data-testid={testId} data-key={productKey} aria-labelledby={titleId}>
      <div className="pk-feature-left">
        <div className="pk-feature-photo">
          <Img src={photo.src} alt={photo.alt} sizes="(max-width: 900px) 100vw, 50vw" surface="dark" width={photo.width} height={photo.height} style={cover(photo.position)} />
        </div>
        {mosaic && (
          <div className="pk-feature-mosaic">
            {mosaic.map((m) => (
              <div key={m.src}><Img src={m.src} alt={m.alt} sizes="(max-width: 900px) 33vw, 18vw" surface="dark" width={m.width} height={m.height} style={cover(m.position)} /></div>
            ))}
          </div>
        )}
      </div>
      <div className="pk-feature-body">
        <Eyebrow color="#33FF74">{eyebrow}</Eyebrow>
        <h2 id={titleId} style={{ ...DISPLAY, margin: '14px 0 0', fontSize: 'clamp(40px,4.6vw,64px)', lineHeight: 0.88, color: '#FFFFFF' }}>{title}</h2>
        {lead && <p className="sr-promise" style={{ marginTop: 16 }}>{lead}</p>}
        <span className="sr-age" style={{ background: '#FFFC33', color: '#340057', marginTop: 16 }}>{chip}</span>
        <Eyebrow color="#33FF74" className="sr-card-label">{t('WHAT IS INCLUDED')}</Eyebrow>
        <InclusionList items={cardItems(items, english)} className="pk-feature-incl" />
        {single && (
          <div className="pk-price-band">
            <PriceFigure label={dbl ? t('SINGLE') : t('PER PERSON')} value={single} testId={testId + '-single'} size={FEATURE_PRICE} color="#FFFC33" labelColor="rgba(255,255,255,.75)" />
            {dbl && <PriceFigure label={t('DOUBLE · 2 PEOPLE')} value={dbl} testId={testId + '-double'} size={FEATURE_PRICE} color="#FFFFFF" labelColor="rgba(255,255,255,.75)" />}
            <div className="sr-from-note">{t('VAT inclusive')}{b.product?.rateOnly === 'nr' && <> · {t('Visitor rate')}</>}</div>
          </div>
        )}
        {note && <p className="pk-sub" style={{ color: 'rgba(255,255,255,.8)', fontFamily: MONO, fontSize: 11.5, letterSpacing: '.06em', marginTop: 14 }}>{note}</p>}
        <div style={{ width: '100%', marginTop: 4 }}>
          <BookActions productKey={productKey} name={name} onDetails={onDetails} bookTestId={testId + '-book'} blockedText={blockedText} />
        </div>
      </div>
    </article>
  );
}
