import { Link } from 'react-router-dom';
import { Img } from '../../components/Img';
import { KP, KP_CONFETTI, KP_FONT, KidsParkEntrance, KidsProfile, kpButton } from '../../components/KidsPark';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { paths } from '../../lib/nav';
import { money } from '../../lib/format';
import { useT } from '../../i18n';
import { MONO } from './shared';

/** The Kids Park pricelist, in the park's own look (entrance arch, confetti, points); shown on the resident page. */
export function KidsParkSection() {
  const t = useT();
  const catalog = useCatalog();
  const { rate, rateTag } = useApp();
  const rk = rate ?? 'rr';
  return (
    <div id="kids" className="sr-section">
      <KidsParkEntrance as="h2" />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 18, alignItems: 'stretch' }}>
        <div data-testid="kids-pricelist" style={{ flex: '1 1 340px', background: KP.purple, borderRadius: 26, overflow: 'hidden', color: '#FFFFFF', boxShadow: '0 18px 40px -18px rgba(58,10,70,.55)' }}>
          <div aria-hidden style={{ height: 22, ...KP_CONFETTI }} />
          <div style={{ padding: '18px 22px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ ...KP_FONT, background: KP.yellow, color: '#3A0A46', fontSize: 13, borderRadius: 12, padding: '8px 13px', display: 'inline-block', transform: 'rotate(-3deg)' }}>{t('KIDS PARK PRICELIST · {rate}', { rate: rateTag })}</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: KP.lime }}>{t('PAY WITH POINTS · 10 POINTS = RS 100')}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              {(catalog.PL.kids || []).map((r) => (
                <div key={r.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: '2px dotted rgba(166,206,57,.55)' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{t(r.n)}</span>
                  <span style={{ ...KP_FONT, background: KP.yellow, color: '#3A0A46', fontSize: 15, borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}>{t('{price} · 20 pts', { price: money(r[rk]) })}</span>
                </div>
              ))}
            </div>
            <div data-testid="kids-topup" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, background: KP.lime, color: '#3A0A46', borderRadius: 18, padding: '12px 16px', boxShadow: '0 4px 0 #6E8F1A' }}>
              <span aria-hidden style={{ ...KP_FONT, flexShrink: 0, width: 42, height: 42, borderRadius: 999, background: KP.purple, color: KP.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>+</span>
              <span style={{ ...KP_FONT, fontSize: 'clamp(16px,1.8vw,19px)', lineHeight: 1.1 }}>{t('Grab the top-up card for just Rs 50')}</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', color: 'rgba(255,255,255,.75)', marginTop: 12 }}>{t('OUTDOOR PLAYGROUND INCLUDED WITH THE PARK VISIT · STUDENT GROUPS RS 100 PER RIDE')}</div>
          </div>
        </div>
        <div style={{ flex: '1 1 280px', minHeight: 300, maxHeight: 480, borderRadius: 26, overflow: 'hidden', position: 'relative', background: KP.lime, boxShadow: `0 0 0 4px ${KP.lime}` }}>
          <Img src="/images/miniquad.avif" alt={t('Mini Quad at Vallé Kids Park')} surface="dark" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(58,10,70,.9), rgba(58,10,70,0) 58%)' }} />
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            <div style={{ ...KP_FONT, color: '#FFFFFF', fontSize: 'clamp(24px,3vw,34px)', lineHeight: 0.95 }}>{t('Little feet')}<br /><span style={{ color: KP.yellow }}>{t('lead the way')}</span></div>
            <Link to={paths.explore('kids')} data-testid="kids-rides" style={{ ...kpButton('yellow'), marginTop: 14 }}>{t('Meet the Kids Park rides →')}</Link>
          </div>
        </div>
      </div>
      <KidsProfile />
    </div>
  );
}
