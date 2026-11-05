import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { ValleIcon, iconForInclusion, type ValleIconName } from '@/components/ui/ValleIcon';
import { Img } from '../../components/Img';
import { Fwd } from '@/components/ui/arrows';
import { useApp } from '../../store/AppStore';
import { useCatalog } from '../../store/CatalogContext';
import { PACKAGE_GROUPS, groupOfSection } from '../../lib/packageGroups';
import { liveDeals } from '../../lib/deals';
import { money } from '../../lib/format';
import { paths } from '../../lib/nav';
import { _t, toEnglish, useT } from '../../i18n';
import type { PackTier, Packs } from '../../types';
import { CLASS_PHOTO } from '../packages/ClassNav';

/** A full-bleed photo; the transform transition carries the hover zoom (Img owns the inline transition). */
const cover = (position = 'center') => ({ position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const, objectPosition: position, transition: 'transform 500ms var(--ease)' });

/** Home section head, in the style of "Choose your day". */
function Head({ title, tag }: { title: string; tag: string }) {
  return (
    <div className="mb-[30px] flex flex-wrap items-baseline justify-between gap-5 pb-7" style={{ borderBottom: '2px solid #340057' }}>
      <h2 className="v-h2">{title}</h2>
      <span className="font-mono text-xs font-semibold tracking-[.16em] text-valle-purple/75">{tag}</span>
    </div>
  );
}

interface Audience {
  key: string; title: string; sub: string; chip: string; to: () => string; icon?: ValleIconName;
  photo: { src: string; position: string };
  /** Brand colour of the tile and whether its text is white (dark gradient) or purple (light gradient). */
  rgb: string; light: boolean;
}

const AUDIENCES: Audience[] = [
  { key: 'families', icon: 'kids-playground', title: _t('Families'), chip: _t('KIDS PARK'), sub: _t('The Kids Park, gentle first thrills and the nature trails.'), to: () => paths.explore('kids'), photo: { src: '/images/bridge-family.webp', position: '30% 30%' }, rgb: '38,224,103', light: false },
  { key: 'schools', title: _t('Schools'), chip: _t('STUDENT RATE'), sub: _t('School outings at the student rate, from pre-primary to secondary.'), to: () => paths.packageGroup('student'), photo: { src: '/images/packages/student/student-zipline-kid.webp', position: '22% 30%' }, rgb: '250,246,44', light: false },
  { key: 'companies', icon: 'team-stars', title: _t('Companies'), chip: _t('TEAM BUILDING'), sub: _t('Team building days with facilitators, quoted for your group.'), to: () => paths.packageGroup('corporate'), photo: { src: '/images/team-building-goggles.webp', position: 'center 20%' }, rgb: '101,38,240', light: true },
  { key: 'seniors', icon: 'tea', title: _t('Seniors 55+'), chip: _t('55+'), sub: _t('Two gentle day packages with lunch and a tea break.'), to: () => paths.packageGroup('senior'), photo: { src: '/images/senior/senior-guests-trail.webp', position: '30% 30%' }, rgb: '214,23,63', light: true },
  { key: 'residents', title: _t('Residents'), chip: _t('WITH ID'), sub: _t('Per-person days at the resident rate, with a Mauritian ID or permit.'), to: () => paths.packageGroup('resident'), photo: { src: '/images/bridge-laugh.webp', position: '62% 25%' }, rgb: '52,0,87', light: true },
];

/** "Who's coming?": a photo tile per audience in the "Choose your day" family, each into its own page. */
export function WhosComing() {
  const t = useT();
  return (
    <section data-testid="home-audiences" className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <Head title={t('Who’s coming?')} tag={t('FOR EVERY GROUP')} />
      <div className="aud-row">
        {AUDIENCES.map((a) => (
          <Link key={a.key} to={a.to()} className="aud-tile" style={{ background: `rgb(${a.rgb})`, color: a.light ? '#FFFFFF' : '#340057' }}>
            <Img src={a.photo.src} alt="" sizes="(max-width: 900px) 140vw, 25vw" placeholder={`rgb(${a.rgb})`} className="aud-photo" style={cover(a.photo.position)} />
            <span aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(${a.rgb},.97) 20%, rgba(${a.rgb},.66) 38%, rgba(${a.rgb},0) 60%)` }} />
            <span className="aud-chip">{a.icon && <ValleIcon name={a.icon} size={16} />}{t(a.chip)}</span>
            <span className="relative mt-auto flex flex-col p-[18px] pt-0">
              <span className="aud-title">{t(a.title)}</span>
              <span className="aud-sub mt-2 text-[13.5px] leading-[1.45]" style={{ opacity: a.light ? 0.95 : 0.9 }}>{t(a.sub)}</span>
              <span className="mt-3.5 pt-2.5 font-mono text-[11.5px] font-bold tracking-[.08em]" style={{ borderTop: '1px dashed ' + (a.light ? 'rgba(255,255,255,.55)' : 'rgba(52,0,87,.45)') }}>{t('SEE WHAT FITS →')}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}


/** The catalog tier behind a product (hero line and inclusions), if the class has one. */
function tierOf(packs: Packs, family: string, key: string): PackTier | undefined {
  const list = (packs as unknown as Record<string, PackTier[] | undefined>)[family];
  return Array.isArray(list) ? list.find((x) => x?.key === key) : undefined;
}

/**
 * The three headline cards: the premium day (VIP, else Diamond), an Exclusive
 * tier with a long zipline (Gold, else the cheapest tier sold), and the quad +
 * zipline combo (Ace); a slot falls back to a deal or resident package when
 * nothing in it is sold at the guest's rate. Prices always come from the catalog.
 */
const SLOTS: { families: string[]; prefer: string }[] = [
  { families: ['vip', 'diamond'], prefer: 'vip' },
  { families: ['ex', 'ls'], prefer: 'pkg:ex:2' },
  { families: ['combo', 'expo', 'resident'], prefer: 'combo:0' },
];

/** Sharp action photos (1500 px and wider) that show what each family of package is about. */
const FAMILY_PHOTO: Record<string, { src: string; position: string }> = {
  vip: { src: '/images/map/zip-coloured-earth-flight.webp', position: '55% 35%' },
  diamond: { src: '/images/packages/exclusive/diamond-zipline-flight.webp', position: 'center 30%' },
  ex: { src: '/images/zipline-superman.webp', position: 'center 30%' },
  ls: { src: '/images/packages/exclusive/exclusive-quad-couple.webp', position: 'center 30%' },
  combo: { src: '/images/quad-duo.webp', position: 'center 35%' },
  expo: { src: '/images/map/zip-red-flight.webp', position: 'center 40%' },
  resident: { src: '/images/zipline-tandem.webp', position: 'center 30%' },
};

interface Pick { key: string; name: string; family: string; mode: string; price: number; image: string; note: string; contents?: string[] }

/** Three headline packages from the catalog, the first one featured, then "See all packages". */
export function PackageStrip() {
  const t = useT();
  const catalog = useCatalog();
  const app = useApp();
  const rate = app.rate === 'nr' ? 'nr' : 'rr';
  const deals = new Set(liveDeals(catalog).map((p) => p.key));
  const sold: Pick[] = [];
  for (const p of catalog.PRODUCTS ?? []) {
    if (p.rateOnly && p.rateOnly !== rate) continue;
    if (p.family === 'expo' && !deals.has(p.key)) continue;
    const price = p[rate];
    if (!(price > 0)) continue;
    sold.push({ key: p.key, name: p.name, family: p.family, mode: p.mode, price, image: p.image, note: p.note, contents: p.contents });
  }
  const picks: Pick[] = [];
  for (const slot of SLOTS) {
    const hit = sold.find((p) => p.key === slot.prefer)
      ?? slot.families.map((f) => sold.filter((p) => p.family === f).sort((a, b) => a.price - b.price)[0]).find(Boolean);
    if (hit && !picks.includes(hit)) picks.push(hit);
  }
  if (picks.length === 0) return null;
  const classOf = (family: string) => {
    const slug = groupOfSection(family === 'expo' ? 'deals' : family);
    return PACKAGE_GROUPS.find((g) => g.slug === slug);
  };
  const rateLabel = rate === 'nr' ? t('Visitor rate') : t('Resident rate');
  const admission = t('Admission fee');
  const featured = picks.length === 3;
  return (
    <section data-testid="home-packages" className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <Head title={t('One price, whole day')} tag={t('PACKAGES')} />
      <div className={'pkg-grid' + (featured ? ' has-feature' : '')}>
        {picks.map((p, i) => {
          const feature = featured && i === 0;
          const g = classOf(p.family);
          const tier = tierOf(catalog.PACKS, p.family, p.key);
          const ph = FAMILY_PHOTO[p.family] ?? { src: p.image || (g ? CLASS_PHOTO[g.slug]?.src : '') || '/images/zipline-superman.webp', position: 'center 30%' };
          let kicker = g ? t(g.title) : '';
          let title = p.name;
          let lead = '';
          let all: string[];
          if (p.family === 'vip') {
            kicker = [kicker, t('ALL INCLUSIVE')].filter(Boolean).join(' · ');
            lead = p.note;
            all = (catalog.PACKS.vip ?? []).map((x) => x.t);
          } else if (p.family === 'combo') {
            kicker = t('COMBO');
            title = t('{name} combo', { name: p.name });
            all = (catalog.COMBO.find((c) => c.key === p.key)?.items ?? []).map((x) => x.t);
          } else if (p.family === 'ex' || p.family === 'ls' || p.family === 'diamond') {
            title = t('{name} package', { name: p.name });
            lead = tier?.hero ?? '';
            all = (tier?.items ?? []).map((x) => x.t).filter((x) => x !== admission);
          } else {
            // resident, senior and deal packages: the descriptive hero line over "Package 1"
            if (tier?.hero) { kicker = [kicker, p.name].filter(Boolean).join(' · '); title = tier.hero; }
            all = tier?.items.map((x) => x.t) ?? p.contents ?? [];
          }
          all = all.filter((x) => x && x !== lead);
          const shown = all.slice(0, feature ? 4 : 3);
          return (
            <Link key={p.key} to={g ? paths.packageGroup(g.slug) : paths.packages()} className={'pkg-card' + (feature ? ' is-feature' : featured ? ' is-side' : '')}>
              <span className="pkg-media">
                <Img src={ph.src} alt="" sizes="(max-width: 640px) 100vw, 50vw" className="pkg-photo" style={cover(ph.position)} />
              </span>
              <span aria-hidden className="pkg-stripe" />
              <span className="pkg-body">
                {kicker && <span className="font-mono text-[11px] font-bold tracking-[.12em] text-valle-green">{kicker.toUpperCase()}</span>}
                <span className="pkg-title">{title}</span>
                {lead && <span className="pkg-lead">{lead}</span>}
                {shown.length > 0 && (
                  <ul className="pkg-list">
                    {shown.map((s) => (
                      <li key={s}>{(() => {
                        const icon = iconForInclusion(toEnglish(s));
                        return icon ? <ValleIcon name={icon} size={18} className="shrink-0 text-valle-green" /> : <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-valle-green" strokeWidth={3} />;
                      })()}{s}</li>
                    ))}
                    {all.length > shown.length && <li className="pkg-more">{t('+{n} more', { n: all.length - shown.length })}</li>}
                  </ul>
                )}
                <span className="pkg-foot">
                  <span className="flex flex-col">
                    <span className="font-mono text-[11px] font-bold tracking-[.14em] text-white/70">{t('FROM')}</span>
                    <span className="pkg-price">{money(p.price)}</span>
                    <span className="mt-1 text-[12.5px] text-white/75">{p.mode === 'pp' ? t('per person · {rate}', { rate: rateLabel }) : t('one guest · {rate}', { rate: rateLabel })}</span>
                  </span>
                  <span className="vbtn vbtn-on-dark vbtn-sm">{t('See the prices')} <Fwd /></span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-8 flex justify-center">
        <Link to={paths.packages()} className="vbtn vbtn-secondary" style={{ color: '#340057' }}>{t('See all packages')} <Fwd /></Link>
      </div>
    </section>
  );
}
