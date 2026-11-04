import { Link, useParams } from 'react-router-dom';
import { paths } from '../lib/nav';
import NotFoundPage from './NotFound';
import { PACKAGE_GROUPS, classFrom, packageGroupOf } from '../lib/packageGroups';
import { useApp } from '../store/AppStore';
import { money } from '../lib/format';
import { breadcrumbs, useSeo } from '../lib/seo';
import { useEffect, useRef, useState } from 'react';
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
  // The full quote form stays on the index, Corporate and Student pages; the other class pages
  // carry one line ("Group of 10+? Book as a group · Request a quote") and open the form on demand.
  const fullQuote = !group || group.slug === 'corporate' || group.slug === 'student';
  const [quoteOpen, setQuoteOpen] = useState(false);
  useEffect(() => { setQuoteOpen(false); }, [groupSlug]);
  const quoteGo = () => {
    setQuoteOpen(true);
    requestAnimationFrame(() => {
      if (quoteEl.current) window.scrollTo({ top: quoteEl.current.getBoundingClientRect().top + window.scrollY - 96, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  };

  /** A section shows on its own class page only; the index shows the classes. */
  const show = (key: string) => !!group && group.keys.includes(key);
  /** The expo deals on sale today; outside their window the class is hidden and its page says so. */
  const deals = liveDeals(catalog);
  const app = useApp();
  const rate = app.rate === 'nr' ? 'nr' : 'rr';
  const fromOf = (slug: string) => classFrom(slug, catalog, rate);
  const live = PACKAGE_GROUPS.filter((g) => g.slug !== 'deals' || deals.length > 0 || group?.slug === 'deals');
  // visitors see the classes sold at their rate first; residents keep the special deals first
  const classes = group || rate === 'rr' ? live : [...live].sort((a, b) => Number(fromOf(a.slug)?.rate !== 'nr') - Number(fromOf(b.slug)?.rate !== 'nr'));
  const meta = (g: { slug: string }) => {
    const f = fromOf(g.slug);
    return f ? t('From {price} · {rate}', { price: money(f.price), rate: f.rate === 'nr' ? t('Visitor rate') : t('Resident rate') }) : null;
  };
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
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', maxWidth: '62ch', margin: '18px 0 0' }}>{group ? t(group.intro) : t('Ready-made adventure days at one price. Book online, pay on arrival. Groups and companies can ask for a quote.')}</p>
        </>)}

        {/* the six classes, each on its own page; on a class page the strip doubles as the way to the others */}
        <ClassNav classes={classes} current={group} marginTop={ownHero ? 0 : group ? 22 : 30} meta={group ? undefined : meta} />

        {/* SPECIAL DEALS (the expo flyer) */}
        {show('deals') && <DealsSection deals={deals} />}
        {/* the class pages, each in the structure of the senior page */}
        {group?.slug === 'exclusive' && <ExclusivePage onDetails={setPk} />}
        {group?.slug === 'resident' && <ResidentPage onQuote={quoteGo} onDetails={setPk} />}
        {group?.slug === 'senior' && <SeniorPage onQuote={quoteGo} onDetails={(p) => setPk({ ...p, productKey: p.key })} />}
        {group?.slug === 'student' && <StudentPage onQuote={quoteGo} />}
        {group?.slug === 'corporate' && <CorporatePage onQuote={quoteGo} />}
        {group?.slug === 'photo-video' && <PhotoVideoPage />}

        {!fullQuote && (
          <div data-testid="group-line" style={{ marginTop: 'clamp(48px,6vw,72px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', borderRadius: 20, background: '#F7F3FF', padding: '18px 24px', fontSize: 16, fontWeight: 600, color: '#340057' }}>
            <span>{t('Group of 10+?')}</span>
            <Link to={paths.groups()} style={{ color: '#5B21B6', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 4 }}>{t('Book as a group')}</Link>
            <span aria-hidden style={{ color: 'rgba(52,0,87,.5)' }}>·</span>
            <button type="button" onClick={quoteGo} aria-expanded={quoteOpen} aria-controls="quote-wrap" className="vbtn-link" style={{ fontSize: 16, textDecoration: 'underline', textUnderlineOffset: 4 }}>{t('Request a quote')}</button>
          </div>
        )}
        {/* stays mounted (hidden) so a card's "Request a quote" can still prefill it */}
        <div id="quote-wrap" hidden={!fullQuote && !quoteOpen}>
          <QuoteForm anchorRef={quoteEl} corporate={group?.slug === 'corporate'} />
        </div>

        <HostContacts />
      </main>

      <PackageModal pack={pk} onClose={() => setPk(null)} />
    </>
  );
}
