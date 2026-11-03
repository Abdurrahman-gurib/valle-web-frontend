import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, CalendarDays, Car, Check, Clock, Coffee, CupSoda, Footprints, IceCreamCone, Leaf, Phone, Salad, Ticket, UserCheck, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { Fwd } from '@/components/ui/arrows';
import { Img } from '../../components/Img';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { paths, useGoto } from '../../lib/nav';
import { _t, useT } from '../../i18n';
import type { PackTier } from '../../types';

/**
 * The senior citizen class page (/packages/senior), after the official
 * 2026–2027 sheet: a purple field with the yellow logo block, the two
 * packages in detail, the lunch menu and the practical notes. Names, prices
 * and inclusions come from the catalog (PACKS.senior); booking reuses the
 * product path of the other package cards (product:<key> in My Day).
 */

const MONO = "'Chivo Mono',monospace";
const DISPLAY: CSSProperties = { fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', textWrap: 'balance' } as CSSProperties;
const PHONE = '+230 660 4477';
const TEL = 'tel:+2306604477';

/** Photos that show what each package is; the catalog image stays the fallback. */
const PHOTOS: Record<string, { src: string; alt: string; position: string }> = {
  'pkg:senior:0': { src: '/images/valle-giant-tortoise-park-mauritius.avif', alt: _t('A senior couple walking past a giant tortoise in the park'), position: '30% 45%' },
  'pkg:senior:1': { src: '/images/expedition-convoy-meadow.webp', alt: _t('Guests seated in a VALLÉ jeep on a meadow track'), position: '55% 55%' },
};
/** Per-package accent, as on the sheet's price tags. */
const ACCENTS = ['#33FF74', '#FFFC33'];

/** Prices keep their "Rs" casing. */
const PRICE: CSSProperties = { ...DISPLAY, textTransform: 'none' };
const rupees = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;

function Eyebrow({ children, color = '#7333FF', className }: { children: ReactNode; color?: string; className?: string }) {
  return <div className={className} style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, letterSpacing: '.16em', color }}>{children}</div>;
}

/** Splits "Visit by jeep (45 min)" into the inclusion and its duration hint. */
function splitDuration(s: string): [string, string | null] {
  const m = /^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/.exec(s);
  return m ? [m[1], m[2]] : [s, null];
}

function PackageCard({ pk, index, onDetails }: { pk: PackTier; index: number; onDetails: (pk: PackTier) => void }) {
  const t = useT();
  const app = useApp();
  const goto = useGoto();
  const catalog = useCatalog();
  const key = pk.key ?? '';
  const product = (catalog.PRODUCTS ?? []).find((p) => p.key === key);
  const id = 'product:' + key;
  const inDay = !!app.sel[id];
  const visitorBlocked = product?.rateOnly === 'rr' && app.rate === 'nr';
  const photo = PHOTOS[key];
  const accent = ACCENTS[index % ACCENTS.length];
  const icons: [string, LucideIcon][] = [[t('Entrance visit'), Ticket], [t('Visit by jeep (45 min)'), Car], [t('Lunch'), UtensilsCrossed], [t('Tea break'), Coffee]];
  const iconFor = (s: string) => icons.find(([label]) => label === s)?.[1] ?? Check;
  const book = () => { if (!inDay) app.toggleSel(id); goto.booking(); };
  const titleId = `senior-pkg-${index}`;

  return (
    <article data-testid="senior-package" data-key={key} aria-labelledby={titleId} className="sr-card">
      <div className="sr-card-photo">
        <Img src={photo?.src ?? pk.img} alt={photo ? t(photo.alt) : t('{name} package', { name: pk.name })} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: photo?.position ?? 'center' }} />
        <span className="sr-card-tag" style={{ background: accent }}>{pk.name}</span>
      </div>
      <div className="sr-card-body">
        <h3 id={titleId} style={{ ...DISPLAY, margin: 0, fontSize: 'clamp(28px,2.8vw,36px)', lineHeight: 0.95, color: '#340057' }}>{pk.hero}</h3>
        <Eyebrow className="sr-card-label">{t('WHAT IS INCLUDED')}</Eyebrow>
        <ol className="sr-incl">
          {pk.items.map((it, i) => {
            const Icon = iconFor(it.t);
            const [label, duration] = splitDuration(it.t);
            return (
              <li key={it.t}>
                <span aria-hidden className="sr-incl-n">{i + 1}</span>
                <Icon aria-hidden className="sr-incl-icon" strokeWidth={1.9} />
                <span className="sr-incl-text">{label}</span>
                {duration && <span className="sr-chip"><Clock aria-hidden strokeWidth={2.2} />{duration}</span>}
              </li>
            );
          })}
        </ol>
        <div className="sr-card-foot">
          <div className="sr-price-row">
            <div>
              <Eyebrow color="rgba(52,0,87,.7)">{t('PER PERSON')}</Eyebrow>
              <div data-testid="senior-price" dir="ltr" style={{ ...PRICE, fontSize: 'clamp(40px,4vw,50px)', lineHeight: 1, color: '#D91E44', marginTop: 4, unicodeBidi: 'isolate' }}>{pk.single}</div>
            </div>
            <div className="sr-price-note">
              {t('VAT inclusive')}
              {product?.rateOnly === 'rr' && <span className="sr-rate">{t('RESIDENT RATE · ID REQUIRED')}</span>}
            </div>
          </div>
          {visitorBlocked ? (
            <div className="sr-visitor">
              <p style={{ margin: 0 }}>{t('The senior packages are sold at the resident rate. You are browsing at the visitor rate.')}</p>
              <button type="button" className="sr-btn sr-btn-outline" onClick={() => app.setRate('rr')}>{t('I am a resident: switch to the resident rate')}</button>
            </div>
          ) : (
            <div className="sr-actions">
              <button type="button" data-testid="senior-book" className="sr-btn sr-btn-primary" onClick={book}>
                {inDay ? t('In my day · book now') : t('Book {name}', { name: pk.name })} <Fwd />
              </button>
              <button type="button" className="sr-btn sr-btn-outline" onClick={() => onDetails(photo ? { ...pk, img: photo.src } : pk)} aria-label={t('View details of {name}', { name: pk.name })}>{t('View details')}</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

const MENU: { course: string; icon: LucideIcon; dishes: string[] }[] = [
  { course: 'MAINS', icon: UtensilsCrossed, dishes: ['Rice', 'Fish curry', 'Chicken blanquette with vegetables'] },
  { course: 'ON THE SIDE', icon: Salad, dishes: ['Salad'] },
  { course: 'DESSERT', icon: IceCreamCone, dishes: ['Ice cream'] },
  { course: 'DRINKS', icon: CupSoda, dishes: ['Water', 'Soft drinks'] },
];

export default function SeniorPage({ onQuote, onDetails }: { onQuote: () => void; onDetails: (pk: PackTier) => void }) {
  const t = useT();
  const catalog = useCatalog();
  const packs = catalog.PACKS.senior ?? [];
  const from = packs.length ? packs.reduce((a, b) => (rupees(b.single) < rupees(a.single) ? b : a)) : undefined;
  const toPackages = () => {
    const el = document.getElementById('senior-packages');
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: reduce ? 'auto' : 'smooth' });
  };
  // the sheet's own labels for the menu, translated
  const menuT: Record<string, string> = {
    MAINS: t('MAINS'), 'ON THE SIDE': t('ON THE SIDE'), DESSERT: t('DESSERT'), DRINKS: t('DRINKS'),
    Rice: t('Rice'), 'Fish curry': t('Fish curry'), 'Chicken blanquette with vegetables': t('Chicken blanquette with vegetables'),
    Salad: t('Salad'), 'Ice cream': t('Ice cream'), Water: t('Water'), 'Soft drinks': t('Soft drinks'),
  };

  return (
    <div data-testid="senior-page">
      {/* HERO: the sheet's purple field, yellow logo block and the campaign photo */}
      <section className="sr-hero" aria-labelledby="senior-title">
        <div className="sr-hero-photo">
          <Img src="/images/senior/senior-guests-trail.webp" alt={t('A smiling senior guest on a forest trail at VALLÉ, her group walking behind her')} priority surface="dark" width={1620} height={1096} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '28% 30%' }} />
        </div>
        <div className="sr-hero-text">
          <div className="sr-logo">
            <img src="/images/brand/valle-logo-purple.webp" alt="VALLÉ Advenature™ Park" width={826} height={425} />
          </div>
          <h1 id="senior-title" style={{ ...DISPLAY, color: '#FFFFFF', fontSize: 'clamp(46px,6vw,86px)', lineHeight: 0.86, margin: 0 }}>{t('Senior citizen')}</h1>
          <span className="sr-age">{t('AGES 55 AND ABOVE')}</span>
          <p className="sr-promise">{t('An unhurried day in the valley: see the park on foot or by jeep, sit down to lunch and end with a tea break.')}</p>
          {from && (
            <div className="sr-from">
              <Eyebrow color="#33FF74">{t('FROM')}</Eyebrow>
              <span dir="ltr" style={{ ...PRICE, color: '#FFFC33', fontSize: 'clamp(38px,4vw,52px)', lineHeight: 1, unicodeBidi: 'isolate' }}>{from.single}</span>
              <span className="sr-from-note">{t('per person · VAT inclusive')}</span>
            </div>
          )}
          <div className="sr-hero-actions">
            <button type="button" data-testid="senior-hero-book" className="sr-btn sr-btn-primary sr-btn-lg" onClick={toPackages}>{t('Book a package')} <ArrowDown aria-hidden strokeWidth={2.5} style={{ width: '1.05em', height: '1.05em' }} /></button>
            <a href={TEL} className="sr-btn sr-btn-ghost sr-btn-lg" aria-label={t('Call VALLÉ on {phone}', { phone: PHONE })} style={{ color: '#FFFFFF', textDecoration: 'none' }}>
              <Phone aria-hidden strokeWidth={2.2} style={{ width: '1em', height: '1em' }} />{t('Call')} <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{PHONE}</span>
            </a>
          </div>
        </div>
      </section>

      {/* THE TWO PACKAGES */}
      <section id="senior-packages" aria-labelledby="senior-packages-title" className="sr-section">
        <div className="sr-head">
          <Eyebrow>{t('TWO PACKAGES · ONE PRICE PER PERSON')}</Eyebrow>
          <h2 id="senior-packages-title" style={{ ...DISPLAY, margin: '10px 0 0', fontSize: 'clamp(32px,4vw,52px)', lineHeight: 0.92, color: '#340057' }}>{t('Choose your package')}</h2>
        </div>
        <div className="sr-cards">
          {packs.map((p, i) => <PackageCard key={p.key ?? p.name} pk={p} index={i} onDetails={onDetails} />)}
        </div>
      </section>

      {/* LUNCH MENU */}
      <section aria-labelledby="senior-lunch-title" className="sr-section sr-lunch">
        <div className="sr-lunch-photo">
          <Img src="/images/le-chamouze-restaurant-entrance.avif" alt={t('The entrance of Le Chamouzé restaurant at VALLÉ')} width={2000} height={1333} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%' }} />
        </div>
        <div className="sr-lunch-text">
          <Eyebrow>{t('INCLUDED IN BOTH PACKAGES')}</Eyebrow>
          <h2 id="senior-lunch-title" style={{ ...DISPLAY, margin: '10px 0 0', fontSize: 'clamp(32px,4vw,52px)', lineHeight: 0.92, color: '#340057' }}>{t('Lunch menu')}</h2>
          <p className="sr-lunch-intro">{t('Both packages include a full lunch and a tea break.')}</p>
          <dl className="sr-menu">
            {MENU.map(({ course, icon: Icon, dishes }) => (
              <div key={course} className="sr-menu-row">
                <dt><Icon aria-hidden strokeWidth={1.9} />{menuT[course]}</dt>
                <dd>{dishes.map((d) => menuT[d]).join(' · ')}</dd>
              </div>
            ))}
          </dl>
          <div className="sr-veg"><Leaf aria-hidden strokeWidth={2.2} />{t('Vegetarian options available')}</div>
          <Link to={paths.resto('chamouze')} className="sr-link" style={{ color: '#340057' }}>{t('Discover Le Chamouzé')} <Fwd /></Link>
        </div>
      </section>

      {/* GOOD TO KNOW */}
      <section aria-labelledby="senior-know-title" className="sr-section">
        <div className="sr-head">
          <Eyebrow>{t('BEFORE YOU COME')}</Eyebrow>
          <h2 id="senior-know-title" style={{ ...DISPLAY, margin: '10px 0 0', fontSize: 'clamp(32px,4vw,52px)', lineHeight: 0.92, color: '#340057' }}>{t('Good to know')}</h2>
        </div>
        <ul className="sr-know">
          <li>
            <UserCheck aria-hidden strokeWidth={1.9} />
            <h3>{t('Who it is for')}</h3>
            <p>{t('Guests aged 55 and above. Companions aged 12 and over pay the same package price.')}</p>
          </li>
          <li>
            <Footprints aria-hidden strokeWidth={1.9} />
            <h3>{t('What to bring')}</h3>
            <p>{t('Comfortable walking shoes and sun protection. The jeep visit is seated.')}</p>
          </li>
          <li>
            <Users aria-hidden strokeWidth={1.9} />
            <h3>{t('Coming as a group?')}</h3>
            <p>{t('Clubs and associations get a tailored quote within one working day.')}</p>
            <button type="button" className="sr-link sr-link-btn" onClick={onQuote}>{t('Request a group quote')} <Fwd /></button>
          </li>
          <li>
            <CalendarDays aria-hidden strokeWidth={1.9} />
            <h3>{t('Validity')}</h3>
            <p>{t('1 July 2026 to 30 June 2027')}</p>
          </li>
        </ul>
        <div className="sr-fine">
          <span>{t('ALL PRICES ARE VAT INCLUSIVE · ALL ACTIVITIES SOLD ARE NON REFUNDABLE · TERMS AND CONDITIONS APPLY')}</span>
          <Link to={paths.terms()} style={{ color: '#340057', textDecoration: 'underline', textUnderlineOffset: 3 }}>{t('Read the terms')}</Link>
        </div>
      </section>
    </div>
  );
}
