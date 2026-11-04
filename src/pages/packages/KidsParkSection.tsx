import { Link } from 'react-router-dom';
import { Img } from '../../components/Img';
import { KP, KP_CONFETTI, KP_FONT, KidsProfile, kpButton } from '../../components/KidsPark';
import { Fwd } from '@/components/ui/arrows';
import { useCatalog, useRawCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { paths } from '../../lib/nav';
import { money } from '../../lib/format';
import { useT } from '../../i18n';
import { MONO, cover } from './shared';

/**
 * The Kids Park pricelist, in the park's own look (confetti, points), with the
 * ride photo beside it. It opens the Kids Park page (/explore?cat=kids#kids-prices);
 * the resident page links to it (KidsParkLink).
 */
export function KidsParkSection() {
  const t = useT();
  const catalog = useCatalog();
  const raw = useRawCatalog();
  const { rate, rateTag } = useApp();
  const rk = rate ?? 'rr';
  /** The Kids Park ride a price line is for ("Roller Coaster Zipline" is the Bonding Roller Coaster Zipline). */
  const rideOf = (n: string) => {
    const id = raw.ACTS.find((a) => a.cat === 'kids' && a.name.includes(n))?.id; // English names, as the price lines
    return id ? catalog.ACTS.find((a) => a.id === id) : undefined;
  };
  return (
    <section id="kids-prices" aria-label={t('Vallé Kids Park pricelist')} style={{ scrollMarginTop: 96 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 18, alignItems: 'stretch' }}>
        <div data-testid="kids-pricelist" style={{ flex: '1 1 340px', background: KP.purple, borderRadius: 26, overflow: 'hidden', color: '#FFFFFF', boxShadow: '0 18px 40px -18px rgba(58,10,70,.55)' }}>
          <div aria-hidden style={{ height: 22, ...KP_CONFETTI }} />
          <div style={{ padding: '18px 22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ ...KP_FONT, background: KP.yellow, color: '#3A0A46', fontSize: 13, borderRadius: 12, padding: '8px 13px', display: 'inline-block', transform: 'rotate(-3deg)' }}>{t('KIDS PARK PRICELIST · {rate}', { rate: rateTag })}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: KP.lime }}>{t('PAY WITH POINTS · 10 POINTS = RS 100')}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              {(catalog.PL.kids || []).map((r) => {
                const ride = rideOf(r.n);
                return (
                  <div key={r.n} data-testid="kids-price-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: '2px dotted rgba(166,206,57,.55)' }}>
                    <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600 }}>
                      {t(r.n)}
                      {/* who may ride, from the catalog: the Pirate Ship is 12+, unlike the rest of the park */}
                      {ride?.age && <span data-testid="kids-price-age" style={{ background: KP.lime, color: '#3A0A46', borderRadius: 999, padding: '3px 9px', fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.04em' }}>{t('AGE {age}', { age: ride.age })}</span>}
                    </span>
                    {/* 10 points = Rs 100, so the points follow the price shown at this rate */}
                    <span style={{ ...KP_FONT, background: KP.yellow, color: '#3A0A46', fontSize: 15, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}>{t('{price} · {n} pts', { price: money(r[rk]), n: Math.round(r[rk] / 10) })}</span>
                  </div>
                );
              })}
            </div>
            <div data-testid="kids-topup" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, background: KP.lime, color: '#3A0A46', borderRadius: 18, padding: '12px 16px', boxShadow: '0 4px 0 #6E8F1A' }}>
              <span aria-hidden style={{ ...KP_FONT, flexShrink: 0, width: 42, height: 42, borderRadius: 999, background: KP.purple, color: KP.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>+</span>
              <span style={{ ...KP_FONT, fontSize: 'clamp(16px,1.8vw,19px)', lineHeight: 1.1 }}>{t('Grab the top-up card for just Rs 50')}</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.06em', color: 'rgba(255,255,255,.85)', marginTop: 12 }}>{t('OUTDOOR PLAYGROUND INCLUDED WITH THE PARK VISIT · STUDENT GROUPS RS 100 PER RIDE')}</div>
          </div>
        </div>
        <div style={{ flex: '1 1 280px', minHeight: 300, maxHeight: 480, borderRadius: 26, overflow: 'hidden', position: 'relative', background: KP.lime, boxShadow: `0 0 0 4px ${KP.lime}` }}>
          <Img src="/images/miniquad.avif" alt={t('Mini Quad at Vallé Kids Park')} surface="dark" style={cover()} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(58,10,70,.9), rgba(58,10,70,0) 58%)' }} />
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            <div style={{ ...KP_FONT, color: '#FFFFFF', fontSize: 'clamp(24px,3vw,34px)', lineHeight: 0.95 }}>{t('Little feet')}<br /><span style={{ color: KP.yellow }}>{t('lead the way')}</span></div>
            <a href="#kids-rides-list" data-testid="kids-rides" style={{ ...kpButton('yellow'), marginTop: 14 }}>{t('Meet the Kids Park rides →')}</a>
          </div>
        </div>
      </div>
      <KidsProfile />
    </section>
  );
}

/** The resident page's short way to the Kids Park pricelist, which lives on the Kids Park page. */
export function KidsParkLink() {
  const t = useT();
  return (
    <div id="kids" className="sr-section">
      <Link to={paths.explore('kids') + '#kids-prices'} data-testid="kids-pricelist-link" className="v-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 20, padding: 20, color: '#340057', textDecoration: 'none', flexWrap: 'wrap' }}>
        <span style={{ width: 120, flexShrink: 0 }}><KidsParkEntranceLogo /></span>
        <span style={{ flex: '1 1 240px' }}>
          <span className="v-h3" style={{ display: 'block' }}>{t('Vallé Kids Park pricelist')}</span>
          <span style={{ display: 'block', marginTop: 6, fontSize: 15, lineHeight: 1.5, color: 'rgba(52,0,87,.78)' }}>{t('Rides are paid with points on the Kids Park top-up card. See every ride and its price on the Kids Park page.')}</span>
        </span>
        <span style={{ fontWeight: 700, color: '#5B21B6', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{t('See the prices')} <Fwd /></span>
      </Link>
    </div>
  );
}

function KidsParkEntranceLogo() {
  return <Img src="/images/kids-park/kids-park-logo.webp" alt="" width={900} height={641} placeholder="transparent" style={{ width: '100%', height: 'auto', aspectRatio: '900 / 641' }} />;
}
