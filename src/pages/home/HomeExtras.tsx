import { Link } from 'react-router-dom';
import { Img } from '../../components/Img';
import { Fwd } from '@/components/ui/arrows';
import { useApp } from '../../store/AppStore';
import { useCatalog } from '../../store/CatalogContext';
import { PACKAGE_GROUPS, groupOfSection } from '../../lib/packageGroups';
import { liveDeals } from '../../lib/deals';
import { money } from '../../lib/format';
import { paths } from '../../lib/nav';
import { _t, useT } from '../../i18n';
import { CLASS_PHOTO } from '../packages/ClassNav';

const cover = (position = 'center') => ({ position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const, objectPosition: position });

/** Home section head, in the style of the other home sections. */
function Head({ title, tag }: { title: string; tag: string }) {
  return (
    <div className="mb-[30px] flex flex-wrap items-baseline justify-between gap-5 pb-7" style={{ borderBottom: '2px solid #340057' }}>
      <h2 className="v-h2">{title}</h2>
      <span className="font-mono text-xs font-semibold tracking-[.16em] text-valle-purple/75">{tag}</span>
    </div>
  );
}

const AUDIENCES: { key: string; title: string; sub: string; to: () => string; photo: { src: string; position: string } }[] = [
  { key: 'families', title: _t('Families'), sub: _t('The Kids Park, gentle first thrills and the nature trails.'), to: () => paths.explore('kids'), photo: { src: '/images/playground-new-2.webp', position: 'center' } },
  { key: 'schools', title: _t('Schools'), sub: _t('School outings at the student rate, from pre-primary to secondary.'), to: () => paths.packageGroup('student'), photo: CLASS_PHOTO.student },
  { key: 'companies', title: _t('Companies'), sub: _t('Team building days with facilitators, quoted for your group.'), to: () => paths.packageGroup('corporate'), photo: CLASS_PHOTO.corporate },
  { key: 'seniors', title: _t('Seniors 55+'), sub: _t('Two gentle day packages with lunch and a tea break.'), to: () => paths.packageGroup('senior'), photo: CLASS_PHOTO.senior },
  { key: 'residents', title: _t('Residents'), sub: _t('Per-person days at the resident rate, with a Mauritian ID or permit.'), to: () => paths.packageGroup('resident'), photo: CLASS_PHOTO.resident },
];

/** "Who's coming?": one equal card per audience, each into its own page. */
export function WhosComing() {
  const t = useT();
  return (
    <section data-testid="home-audiences" className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <Head title={t('Who’s coming?')} tag={t('FOR EVERY GROUP')} />
      <div className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))]">
        {AUDIENCES.map((a) => (
          <Link key={a.key} to={a.to()} className="v-card aud-card" style={{ color: '#340057' }}>
            <span className="v-card-media"><Img src={a.photo.src} alt="" style={cover(a.photo.position)} /></span>
            <span className="v-card-body">
              <span className="v-h3">{t(a.title)}</span>
              <span className="text-[14px] leading-[1.5] text-valle-purple/80">{t(a.sub)}</span>
              <span className="v-card-foot flex items-center gap-1.5 text-[14px] font-bold text-valle-link">{t('See what fits')} <Fwd /></span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Three packages from the catalog: the cheapest of each family sold at the guest's rate, then "See all packages". */
export function PackageStrip() {
  const t = useT();
  const catalog = useCatalog();
  const app = useApp();
  const rate = app.rate === 'nr' ? 'nr' : 'rr';
  const deals = new Set(liveDeals(catalog).map((p) => p.key));
  const best = new Map<string, { key: string; name: string; family: string; price: number; image: string }>();
  for (const p of catalog.PRODUCTS ?? []) {
    if (!['ls', 'ex', 'vip', 'combo', 'resident', 'senior', 'expo'].includes(p.family)) continue;
    if (p.rateOnly && p.rateOnly !== rate) continue;
    if (p.family === 'expo' && !deals.has(p.key)) continue;
    const price = p[rate];
    if (!(price > 0)) continue;
    const cur = best.get(p.family);
    if (!cur || price < cur.price) best.set(p.family, { key: p.key, name: p.name, family: p.family, price, image: p.image });
  }
  const picks = [...best.values()].sort((a, b) => a.price - b.price).slice(0, 3);
  if (picks.length === 0) return null;
  const classOf = (family: string) => {
    const slug = groupOfSection(family === 'expo' ? 'deals' : family);
    return PACKAGE_GROUPS.find((g) => g.slug === slug);
  };
  return (
    <section data-testid="home-packages" className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <Head title={t('One price, whole day')} tag={t('PACKAGES')} />
      <div className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
        {picks.map((p) => {
          const g = classOf(p.family);
          const photo = p.image || (g ? CLASS_PHOTO[g.slug]?.src : '') || '/images/vip-ultimate-buggy-coloured-earth.avif';
          return (
            <Link key={p.key} to={g ? paths.packageGroup(g.slug) : paths.packages()} className="v-card" style={{ color: '#340057' }}>
              <span className="v-card-media">
                <Img src={photo} alt="" style={cover()} />
                <span className="absolute end-3 bottom-3 rounded-lg bg-valle-yellow px-2.5 py-1.5 font-mono text-[11px] font-bold text-valle-purple shadow-s1" style={{ transform: 'none' }}>
                  {t('From {price} · {rate}', { price: money(p.price), rate: rate === 'nr' ? t('Visitor rate') : t('Resident rate') })}
                </span>
              </span>
              <span className="v-card-body">
                {g && <span className="font-mono text-[11px] font-bold tracking-[.12em] text-valle-link">{t(g.title).toUpperCase()}</span>}
                <span className="v-h3">{p.name}</span>
                <span className="v-card-foot flex items-center gap-1.5 text-[14px] font-bold text-valle-link">{t('See the prices')} <Fwd /></span>
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-6 flex justify-center">
        <Link to={paths.packages()} className="vbtn vbtn-secondary" style={{ color: '#340057' }}>{t('See all packages')} <Fwd /></Link>
      </div>
    </section>
  );
}
