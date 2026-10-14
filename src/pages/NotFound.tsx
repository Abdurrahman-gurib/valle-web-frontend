import { useCatalog } from '../store/CatalogContext';
import { Fwd } from '@/components/ui/arrows';
import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { paths } from '../lib/nav';
import { useT, fwd } from '../i18n';

/**
 * The 404 page. nginx serves this markup with a real 404 status for unknown
 * paths (prerendered to /404/index.html); inside the app it renders for unknown
 * routes and unknown activity or restaurant ids, and is marked noindex.
 */
export default function NotFoundPage({ what }: { what?: string }) {
  const t = useT();
  const catalog = useCatalog();
  useSeo({ title: t('Page not found · VALLÉ Advenature™ Park'), description: t('That page is not in the valley. Find the ziplines, quad trails, packages and restaurants from here.'), noindex: true });
  const links: [string, string][] = [
    [t('All {n} experiences', { n: catalog.ACTS.length }), paths.explore()],
    [t('Ziplines'), paths.detail('zipline')],
    [t('Quad & buggy'), paths.detail('quad')],
    [t('Packages & prices'), paths.packages()],
    [t('Book your day'), paths.booking()],
    [t('Le Chamouzé restaurant'), paths.resto('chamouze')],
  ];
  return (
    <main className="mx-auto min-h-[70vh] max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[140px] pb-[60px]">
      <div className="font-mono text-[12px] font-bold tracking-[.16em] text-valle-red">{t('404 · NOT FOUND')}</div>
      <h1 className="mx-0 mt-3.5 mb-0 origin-bottom-left -rotate-4 font-display text-[clamp(40px,7vw,96px)] leading-[0.82] font-black uppercase italic">
        {t('Off the')}<br /><span className="text-valle-violet">{t('trail')}</span>
      </h1>
      <p className="mx-0 mt-[26px] mb-0 max-w-[52ch] text-[17px] leading-[1.6] text-valle-purple/75">
        {what ? t('We could not find {what}.', { what }) : t('That page does not exist, or it moved when the new site launched.')} {t('Pick a path below, or use the search on the Explore page.')}
      </p>
      <div className="mt-7 flex flex-wrap gap-2.5">
        {links.map(([label, href]) => (
          <Link key={href} to={href} className="rounded-full border-[1.5px] border-solid border-valle-purple px-[18px] py-[11px] text-[14px] font-bold" style={{ color: '#340057', textDecoration: 'none' }}>{label} <Fwd /></Link>
        ))}
      </div>
      <p className="mt-10 font-mono text-[11px] tracking-[.1em] text-valle-purple/50">
        {t('NEED A HAND?')} <a href="mailto:sales@vallepark.com" style={{ color: '#7333FF' }}>SALES@VALLEPARK.COM</a> · <a href="tel:+2306604477" style={{ color: '#7333FF' }}>+230 660 44 77</a>
      </p>
    </main>
  );
}
