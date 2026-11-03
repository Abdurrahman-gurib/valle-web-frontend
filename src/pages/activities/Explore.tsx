import { breadcrumbs, useSeo } from '../../lib/seo';
import { useEffect, useMemo } from 'react';
import { ActivityCard } from '../../components/ActivityCard';
import { CarouselArrows, CarouselTrack, carouselKeys, useCarousel } from '@/components/ui/carousel';
import { Link, useSearchParams } from 'react-router-dom';
import { KidsParkEntrance, kpButton } from '../../components/KidsPark';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { useCardModel } from '../../lib/card';
import { paths } from '../../lib/nav';
import { useReveal } from '../../hooks/useReveal';
import { _t, isRtl, useLang, useT } from '../../i18n';
import type { CatKey } from '../../types';
import { AdmissionBar, BuildYourDayCta, NoResults, PulseFilter } from './ExploreParts';
import { BARLOW, MONO } from './shared';

const PULSE_RANGES: Record<string, [number, number]> = {
  any: [1, 5], serene: [1, 2], moderate: [3, 3], extreme: [4, 5],
};

// The label of the former "all" category chip; kept so the dictionaries keep it.
void _t('Everything');

export default function ExplorePage() {
  const t = useT();
  const catalog = useCatalog();
  const app = useApp();
  const card = useCardModel();
  const ref = useReveal<HTMLElement>();

  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') || 'all';
  const q = params.get('q') || '';
  const pulseLvl = params.get('pulse') || 'any';
  const isCat = (k: string): k is CatKey => Object.hasOwn(catalog.CAT, k);
  const catName = cat !== 'all' && isCat(cat) ? catalog.CAT[cat].name : '';
  useSeo({
    title: catName ? t('{name} experiences · VALLÉ Advenature™ Park', { name: catName }) : t('All {count} experiences · VALLÉ Advenature™ Park', { count: catalog.ACTS.length }),
    description: catName
      ? t('{name} at Vallé Advenature Park, Chamouny: every {lower} experience with prices, age limits and thrill level.', { name: catName, lower: catName.toLowerCase() })
      : t('Every experience in the valley: ziplines, quad and buggy trails, the Nepalese bridge, luge kart, waterfalls, the 23 Coloured Earth, giant tortoises and the Kids Park.'),
    canonicalPath: catName ? `/explore?cat=${cat}` : '/explore',
    noindex: Boolean(q) || pulseLvl !== 'any',
    jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Explore', path: '/explore' }, ...(catName ? [{ name: catName, path: `/explore?cat=${cat}` }] : [])])],
  });

  /** Detail's "← All experiences" reads this to come back to the same filtered list. */
  useEffect(() => {
    try {
      sessionStorage.setItem('exploreQS', params.toString());
    } catch {
      /* private mode can throw, so filters simply won't be restored */
    }
  }, [params]);

  const nature = useCarousel();
  const lang = useLang();

  const setPulseLvl = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'any') next.delete('pulse');
    else next.set('pulse', v);
    setParams(next);
  };

  const results = useMemo(() => {
    const rg = PULSE_RANGES[pulseLvl] || PULSE_RANGES.any;
    const query = q.trim().toLowerCase();
    return catalog.ACTS.filter((a) =>
      (cat === 'all' || a.cat === cat) &&
      a.thrill >= rg[0] && a.thrill <= rg[1] &&
      (!query || (a.name + ' ' + a.blurb + ' ' + catalog.CAT[a.cat].name).toLowerCase().includes(query)),
    );
  }, [catalog, cat, pulseLvl, q]);

  const cards = results.map((a) => card(a));
  const noResults = results.length === 0;
  const resultCount = t('{shown} OF {total}', { shown: results.length, total: catalog.ACTS.length });

  const clearFilters = () => {
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      {/* the Kids Park category opens on its own entrance arch, the logo as the page heading */}
      {cat === 'kids' ? (
        <KidsParkEntrance as="h1" priority>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <Link to={paths.packageGroup('resident') + '#kids'} style={kpButton('purple')}>{t('Kids Park prices →')}</Link>
            <span style={{ alignSelf: 'center', fontFamily: MONO, fontSize: 11.5, fontWeight: 700, letterSpacing: '.1em', color: '#3A0A46' }}>{t('{count} EXPERIENCES · ONE PARK', { count: catalog.ACTS.length })}</span>
          </div>
        </KidsParkEntrance>
      ) : (
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{
          fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900,
          // the nature title is a sentence, so it runs smaller, level and with room under the header
          fontSize: cat === 'nature' ? 'clamp(26px,3.4vw,48px)' : 'clamp(42px,6.4vw,90px)', lineHeight: cat === 'nature' ? 0.95 : 0.82, letterSpacing: '-0.01em',
          margin: cat === 'nature' ? '14px 0 0' : 0, maxWidth: '18ch', textTransform: 'uppercase', transform: cat === 'nature' ? 'none' : 'rotate(-4deg)', transformOrigin: 'left bottom',
        }}>{cat === 'nature' ? t('Already included in entrance admission fees') : t('Explore Vallé')}</h1>
        <span style={{
          fontFamily: MONO, fontSize: 12, fontWeight: 600,
          letterSpacing: '.16em', color: 'rgba(52,0,87,.7)',
        }}>{t('{count} EXPERIENCES · ONE PARK', { count: catalog.ACTS.length })}</span>
      </div>
      )}

      <AdmissionBar />

      {/* the search box and category chips went: categories come from the Explore menu, the search from the header */}
      <PulseFilter value={pulseLvl} onChange={setPulseLvl} resultCount={resultCount} />

      {cat === 'nature' ? (
        <div style={{ marginTop: 24 }} data-testid="nature-carousel">
          <CarouselTrack viewportRef={nature.viewportRef} label={t('Already included in entrance admission fees')} onKeyDown={carouselKeys(nature.prev, nature.next, isRtl(lang))}>
            {cards.map((a) => (
              <div key={a.id} className="min-w-0 shrink-0 grow-0 basis-[min(300px,82vw)] py-2">
                <ActivityCard a={a} rateTag={app.rateTag} eager />
              </div>
            ))}
          </CarouselTrack>
          {cards.length > 1 && <CarouselArrows className="mt-3 justify-end" prev={nature.prev} next={nature.next} canPrev={nature.canPrev} canNext={nature.canNext} labels={{ prev: t('Previous'), next: t('Next') }} />}
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(265px,1fr))', gap: 16, marginTop: 24,
        }}>
          {cards.map((a) => (
            <ActivityCard key={a.id} a={a} rateTag={app.rateTag} kids={cat === 'kids'} />
          ))}
        </div>
      )}

      {noResults && <NoResults onClear={clearFilters} />}

      <BuildYourDayCta />
    </main>
  );
}
