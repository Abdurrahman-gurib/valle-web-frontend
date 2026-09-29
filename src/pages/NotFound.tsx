import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { paths } from '../lib/nav';
import { useT, fwd } from '../i18n';

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

/**
 * The 404 page. nginx serves this markup with a real 404 status for unknown
 * paths (prerendered to /404/index.html); inside the app it renders for unknown
 * routes and unknown activity or restaurant ids, and is marked noindex.
 */
export default function NotFoundPage({ what }: { what?: string }) {
  const t = useT();
  useSeo({ title: t('Page not found · VALLÉ Advenature™ Park'), description: t('That page is not in the valley. Find the ziplines, quad trails, packages and restaurants from here.'), noindex: true });
  const links: [string, string][] = [
    [t('All 21 experiences'), paths.explore()],
    [t('Ziplines'), paths.detail('zipline')],
    [t('Quad & buggy'), paths.detail('quad')],
    [t('Packages & prices'), paths.packages()],
    [t('Book your day'), paths.booking()],
    [t('Le Chamouzé restaurant'), paths.resto('chamouze')],
  ];
  return (
    <main style={{ maxWidth: 1320, margin: '0 auto', padding: '140px clamp(16px,3.5vw,40px) 60px', minHeight: '70vh' }}>
      <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.16em', color: '#FF3358' }}>{t('404 · NOT FOUND')}</div>
      <h1 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(40px,7vw,96px)', lineHeight: 0.82, margin: '14px 0 0', textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>
        {t('Off the')}<br /><span style={{ color: '#7333FF' }}>{t('trail')}</span>
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', maxWidth: '52ch', margin: '26px 0 0' }}>
        {what ? t('We could not find {what}.', { what }) : t('That page does not exist, or it moved when the new site launched.')} {t('Pick a path below, or use the search on the Explore page.')}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 28 }}>
        {links.map(([label, href]) => (
          <Link key={href} to={href} style={{ border: '1.5px solid #340057', borderRadius: 999, padding: '11px 18px', fontWeight: 700, fontSize: 14, color: '#340057', textDecoration: 'none' }}>{label} {fwd()}</Link>
        ))}
      </div>
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', color: 'rgba(52,0,87,.5)', marginTop: 40 }}>
        {t('NEED A HAND?')} <a href="mailto:sales@vallepark.com" style={{ color: '#7333FF' }}>SALES@VALLEPARK.COM</a> · <a href="tel:+2306604477" style={{ color: '#7333FF' }}>+230 660 44 77</a>
      </p>
    </main>
  );
}
