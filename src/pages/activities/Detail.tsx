import { Link, useNavigate, useParams } from 'react-router-dom';
import NotFoundPage from '../NotFound';
import { abs, breadcrumbs, useSeo } from '../../lib/seo';
import { paths, useGoto } from '../../lib/nav';
import { useCatalog, useRawCatalog } from '../../store/CatalogContext';
import { Ruler } from 'lucide-react';
import { useApp } from '../../store/AppStore';
import { useCardModel } from '../../lib/card';
import { useReveal } from '../../hooks/useReveal';
import { Img } from '../../components/Img';
import { localizePath, useT } from '../../i18n';
import { useParkStatus } from '../../components/WeatherCard';
import { QuadMap, ZiplineMap } from '../home/ActivityMaps';
import { KP, KP_PATTERN, KidsParkLogo, KidsProfile } from '../../components/KidsPark';
import { DetailGallery } from './DetailGallery';
import { DetailAside, DetailPricelist, RelatedCard, SeeAlso, ZiplineReviews } from './DetailParts';
import { BARLOW, MONO, sectionLabel } from './shared';
import { chipInk } from '@/styles/theme';

export default function DetailPage() {
  const t = useT();
  const { id } = useParams();
  const catalog = useCatalog();
  const raw = useRawCatalog();
  const app = useApp();
  const goto = useGoto();
  const navigate = useNavigate();
  const card = useCardModel();
  const ref = useReveal<HTMLElement>();

  const act = catalog.ACTS.find((a) => a.id === id);
  const catName = act ? catalog.CAT[act.cat].name : '';
  const rp = act ? catalog.RATEP[act.id] : undefined;
  const parkStatus = useParkStatus();
  const paused = !!act && (parkStatus?.state === 'closed' || !!parkStatus?.pausedActivities.includes(act.id));
  useSeo(act ? {
    title: t('{name} · {category} at VALLÉ Advenature™ Park, Mauritius', { name: act.name, category: catName }),
    description: act.blurb,
    canonicalPath: paths.detail(act.id),
    image: act.img,
    jsonLd: [
      breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Explore', path: '/explore' }, { name: catName, path: paths.explore(act.cat) }, { name: act.name, path: paths.detail(act.id) }]),
      {
        '@context': 'https://schema.org', '@type': 'TouristAttraction', name: act.name, description: act.blurb,
        image: abs(act.img), url: abs(paths.detail(act.id)), isAccessibleForFree: act.mode === 'entry',
        containedInPlace: { '@type': 'TouristAttraction', name: 'VALLÉ Advenature™ Park', address: { '@type': 'PostalAddress', addressLocality: 'Chamouny', addressCountry: 'MU' } },
        ...(act.mode === 'pp' || act.mode === 'flat' ? { offers: { '@type': 'AggregateOffer', priceCurrency: 'MUR', lowPrice: rp ? rp[0] : act.price, highPrice: rp ? rp[1] : act.price, url: abs(paths.booking()), availability: 'https://schema.org/InStock' } } : {}),
      },
    ],
  } : { title: t('Experience not found · VALLÉ Advenature™ Park'), description: t('That experience is not in the valley.'), noindex: true });
  if (!act) return <NotFoundPage what={t('that experience')} />;

  const d = card(act);
  const related = catalog.ACTS.filter((a) => a.cat === act.cat && a.id !== act.id).slice(0, 4).map(card);
  const gal = catalog.GAL[act.id];
  const showReviews = act.id === 'zipline';
  /** Kids Park activities wear the Kids Park identity (logo, lime squiggles, purple cards, sunflower prices). */
  const kids = act.cat === 'kids';
  /** "Minimum height 1.2 m" and the like, read from the English facts and shown in the page's language. */
  const rawGtk = raw.ACTS.find((a) => a.id === act.id)?.gtk ?? [];
  const heightRules = rawGtk.map((g, i) => (/^minimum height/i.test(g.t) ? act.gtk[i]?.t : undefined)).filter((x): x is string => !!x);

  /** Always goes to the explore page (never history.back), but restores its last filters. */
  const backExplore = () => {
    let qs = '';
    try {
      qs = sessionStorage.getItem('exploreQS') || '';
    } catch {
      /* private mode can throw, so fall back to the unfiltered list */
    }
    navigate(localizePath('/explore' + (qs ? '?' + qs : '')));
  };

  const bookThisNow = () => {
    if (!app.isSelected(act.id) && (act.mode === 'pp' || act.mode === 'flat')) app.toggleSel(act.id);
    goto.booking();
  };

  return (
    <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      <button
        type="button"
        onClick={backExplore}
        className="vbtn-link"
        style={{ padding: '8px 0' }}
      >{t('← All experiences')}</button>

      <div style={{ position: 'relative', borderRadius: kids ? 30 : 24, overflow: 'hidden', height: 'min(68vh,620px)', minHeight: 340, background: '#EBE2FF', marginTop: 12, ...(kids ? { boxShadow: `0 0 0 5px ${KP.lime}, 0 0 0 9px ${KP.purple}`, margin: '17px 9px 0' } : null) }}>
        {/* most cover photos are square: keep the upper-middle (faces, the waterfall top) rather than the dead centre */}
        <Img src={act.img} alt={act.name} priority style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 38%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.8), rgba(31,0,51,0) 55%)' }} />
        <div style={{ position: 'absolute', left: 'clamp(18px,3vw,36px)', right: 'clamp(18px,3vw,36px)', bottom: 'clamp(18px,3vw,30px)', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            {kids
              ? <Link to={paths.explore('kids')} style={{ display: 'inline-block', transform: 'rotate(-4deg)' }}><KidsParkLogo width="clamp(110px,14vw,170px)" priority /></Link>
              : <span style={{ background: chipInk(d.catColor), color: d.catFg, fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 13px', display: 'inline-block', transform: 'rotate(-4deg)' }}>{d.catBadge}</span>}
            <div style={{ transform: 'rotate(-4deg)', transformOrigin: 'left bottom', marginTop: 16 }}>
              <h1 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(38px,5.8vw,80px)', lineHeight: 0.82, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase' }}>{d.name}</h1>
            </div>
          </div>
          <div title="Pulse level" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.2em', color: '#FFFFFF', background: 'rgba(31,0,51,.55)', backdropFilter: 'blur(6px)', borderRadius: 999, padding: '10px 18px' }}>{d.pulseStr}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'clamp(24px,4vw,48px)', marginTop: 'clamp(24px,4vw,40px)', alignItems: 'start' }}>
        <div>
          <p style={{ fontSize: 'clamp(16px,1.8vw,19px)', lineHeight: 1.6, color: 'rgba(52,0,87,.82)', margin: 0 }}>{d.blurb}</p>

          {heightRules.length > 0 && (
            <div data-testid="ride-height-rule" role="note" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14, background: '#FFFC33', color: '#340057', borderRadius: 18, padding: '14px 18px', boxShadow: `0 0 0 3px ${kids ? KP.purple : '#340057'}` }}>
              <Ruler aria-hidden strokeWidth={2.2} style={{ width: 30, height: 30, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '.12em' }}>{t('BEFORE YOU RIDE · AGE {age}', { age: act.age })}</div>
                {heightRules.map((h) => <div key={h} style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(20px,2.2vw,26px)', textTransform: 'uppercase', lineHeight: 1.05, marginTop: 4 }}>{h}</div>)}
                <div style={{ fontSize: 13.5, marginTop: 4 }}>{t('Riders must meet both the age and the height rule.')}</div>
              </div>
            </div>
          )}

          <DetailPricelist act={act} d={d} kids={kids} catalog={catalog} />

          {kids && <KidsProfile only={act.id} headingAs="h2" />}
          {kids && act.mode === 'pp' && (
            <div data-testid="kids-topup" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, ...KP_PATTERN, color: '#3A0A46', borderRadius: 18, padding: '12px 16px', fontFamily: BARLOW, fontWeight: 900, textTransform: 'uppercase', fontSize: 17, lineHeight: 1.1, boxShadow: `0 4px 0 ${KP.purple}` }}>
              <span style={{ background: '#FFFFFF', borderRadius: 12, padding: '6px 10px' }}>{t('Grab the top-up card for just Rs 50')}</span>
            </div>
          )}
          <div style={{ ...sectionLabel, marginTop: 28 }}>{t('GOOD TO KNOW')}</div>
          <div style={{ marginTop: 10 }}>
            {act.gtk.map((g) => (
              <div key={g.t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px dashed #D9C9F0', fontSize: 15, lineHeight: 1.5, color: 'rgba(52,0,87,.8)' }}>
                <span style={{ color: kids ? KP.purple : d.pulseColor, fontWeight: 800, flexShrink: 0 }}>●</span>
                <span>{g.t}</span>
              </div>
            ))}
          </div>

          {showReviews && <ZiplineReviews />}
        </div>

        <DetailAside act={act} d={d} kids={kids} paused={paused} onBook={bookThisNow} />
      </div>

      {gal && <DetailGallery act={act} gal={gal} onBook={bookThisNow} />}

      {/* the route map of this activity: the two quad & buggy loops, the zipline stations */}
      {(act.id === 'quad' || act.id === 'buggy') && <div data-testid="activity-route-map" style={{ marginTop: 'clamp(36px,5vw,56px)' }}><QuadMap /></div>}
      {act.id === 'zipline' && <div data-testid="activity-route-map" style={{ marginTop: 'clamp(36px,5vw,56px)' }}><ZiplineMap /></div>}

      <SeeAlso act={act} catName={catName} />

      <div style={{ marginTop: 'clamp(44px,6vw,72px)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 14, marginBottom: 18 }}>
          <h2 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.4vw,58px)', letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{t('Pairs well with')}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
          {related.map((a) => <RelatedCard key={a.id} a={a} />)}
        </div>
      </div>
    </main>
  );
}
