import { useParams } from 'react-router-dom';
import NotFoundPage from './NotFound';
import { PACKAGE_GROUPS, packageGroupOf } from '../lib/packageGroups';
import { breadcrumbs, useSeo } from '../lib/seo';
import { useRef, useState } from 'react';
import { useCatalog } from '../store/CatalogContext';
import { useReveal } from '../hooks/useReveal';
import { liveDeals } from '../lib/deals';
import { PackageModal, type PackModalData } from '../components/PackageModal';
import { CurrencyPicker } from '../components/CurrencyPicker';
import { useT } from '../i18n';
import SeniorPage from './packages/SeniorPage';
import ExclusivePage from './packages/ExclusivePage';
import ResidentPage from './packages/ResidentPage';
import StudentPage from './packages/StudentPage';
import CorporatePage from './packages/CorporatePage';
import PhotoVideoPage from './packages/PhotoVideoPage';
import { DealsSection } from './packages/DealsSection';
import { ClassNav } from './packages/ClassNav';
import { HostContacts, QuoteForm } from './packages/QuoteForm';
import { BLACK_ITALIC as BARLOW, MONO } from './packages/shared';

/** The share image of each class page: its campaign hero. */
const CLASS_IMAGE: Record<string, string> = {
  exclusive: '/images/packages/exclusive/exclusive-quad-couple.webp',
  resident: '/images/bridge-laugh.webp',
  senior: '/images/senior/senior-guests-trail.webp',
  student: '/images/packages/student/student-zipline-kid.webp',
  corporate: '/images/team-building-goggles.webp',
  'photo-video': '/images/shoot/cine-01.webp',
};

export default function PackagesPage() {
  const t = useT();
  const { group: groupSlug } = useParams<{ group?: string }>();
  const group = packageGroupOf(groupSlug);
  useSeo(group
    ? { title: t('{group} · packages & 2026 pricelist · VALLÉ Advenature™ Park', { group: t(group.title) }), description: t(group.intro), canonicalPath: '/packages/' + group.slug, image: CLASS_IMAGE[group.slug] ?? '/images/vip-ultimate-buggy-coloured-earth.avif', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Packages', path: '/packages' }, { name: group.title, path: '/packages/' + group.slug }])] }
    : { title: t('Packages & 2026 pricelist · VALLÉ Advenature™ Park'), description: t('Light, Standard, Exclusive, VIP and Diamond days, resident and senior packages, student and Kids Park pricelists, combos, cinematic shoots and team building. All 2026 prices, VAT inclusive.'), canonicalPath: '/packages', image: '/images/vip-ultimate-buggy-coloured-earth.avif', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Packages', path: '/packages' }])] });
  const catalog = useCatalog();
  const ref = useReveal<HTMLElement>();
  const [pk, setPk] = useState<PackModalData | null>(null);

  const quoteEl = useRef<HTMLDivElement>(null);
  const quoteGo = () => {
    if (quoteEl.current) window.scrollTo({ top: quoteEl.current.offsetTop - 84, behavior: 'smooth' });
  };

  /** A section shows on its own class page only; the index shows the classes. */
  const show = (key: string) => !!group && group.keys.includes(key);
  /** The expo deals on sale today; outside their window the class is hidden and its page says so. */
  const deals = liveDeals(catalog);
  const classes = PACKAGE_GROUPS.filter((g) => g.slug !== 'deals' || deals.length > 0 || group?.slug === 'deals');
  const ownHero = !!group && group.slug !== 'deals';

  if (groupSlug && !group) return <NotFoundPage />;

  return (
    <>
      <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: `${groupSlug ? 128 : 104}px clamp(16px,3.5vw,40px) 0` }}>
        {/* the class pages carry their own title in their hero, after the official sheets */}
        {!ownHero && (<>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ ...BARLOW, fontSize: group ? 'clamp(34px,5vw,72px)' : 'clamp(42px,6.4vw,90px)', lineHeight: 0.82, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{group ? t(group.title) : t('Packages')}</h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.7)' }}>{t('ALL PRICES VAT INCLUSIVE')}<CurrencyPicker fg="#340057" /></span>
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', maxWidth: '62ch', margin: '18px 0 0' }}>{group ? t(group.intro) : t('Curated adventure days, from a relaxed first taste of the valley to the full VIP escape. Enquire to book a package; the team confirms availability within one working day.')}</p>
        </>)}

        {/* the six classes, each on its own page; on a class page the strip doubles as the way to the others */}
        <ClassNav classes={classes} current={group} marginTop={ownHero ? 0 : group ? 22 : 30} />

        {/* SPECIAL DEALS (the expo flyer) */}
        {show('deals') && <DealsSection deals={deals} />}
        {/* the class pages, each in the structure of the senior page */}
        {group?.slug === 'exclusive' && <ExclusivePage onDetails={setPk} />}
        {group?.slug === 'resident' && <ResidentPage onQuote={quoteGo} onDetails={setPk} />}
        {group?.slug === 'senior' && <SeniorPage onQuote={quoteGo} onDetails={(p) => setPk({ ...p, productKey: p.key })} />}
        {group?.slug === 'student' && <StudentPage onQuote={quoteGo} />}
        {group?.slug === 'corporate' && <CorporatePage onQuote={quoteGo} />}
        {group?.slug === 'photo-video' && <PhotoVideoPage />}

        <QuoteForm anchorRef={quoteEl} corporate={group?.slug === 'corporate'} />

        <HostContacts />
      </main>

      <PackageModal pack={pk} onClose={() => setPk(null)} />
    </>
  );
}
