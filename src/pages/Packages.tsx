import { Link, useParams } from 'react-router-dom';
import NotFoundPage from './NotFound';
import { PACKAGE_GROUPS, packageGroupOf, type PackageGroup } from '../lib/packageGroups';
import { breadcrumbs, useSeo } from '../lib/seo';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useCatalog } from '../store/CatalogContext';
import { useApp } from '../store/AppStore';
import { paths, useGoto } from '../lib/nav';
import { useHover } from '../hooks/useHover';
import { useReveal } from '../hooks/useReveal';
import { money, shortDateFromIso, todayIso } from '../lib/format';
import { dealSaving, liveDeals } from '../lib/deals';
import { createQuote } from '../lib/api';
import { PackageModal, type PackModalData } from '../components/PackageModal';
import { CardImage, ValleButton, ValleCard, valleButton } from '../components/ui/valle';
import { CurrencyPicker } from '../components/CurrencyPicker';
import type { Product, RateKey } from '../types';
import { useT } from '../i18n';
import SeniorPage from './packages/SeniorPage';
import ExclusivePage from './packages/ExclusivePage';
import ResidentPage from './packages/ResidentPage';
import StudentPage from './packages/StudentPage';
import CorporatePage from './packages/CorporatePage';
import PhotoVideoPage from './packages/PhotoVideoPage';

/** The share image of each class page: its campaign hero. */
const CLASS_IMAGE: Record<string, string> = {
  exclusive: '/images/packages/exclusive/exclusive-quad-couple.webp',
  resident: '/images/bridge-laugh.webp',
  senior: '/images/senior/senior-guests-trail.webp',
  student: '/images/packages/student/student-zipline-kid.webp',
  corporate: '/images/team-building-goggles.webp',
  'photo-video': '/images/shoot/cine-01.webp',
};

const MONO = "'Chivo Mono',monospace";
const BARLOW: CSSProperties = { fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900 };


function SectionHead({ id, title, tag, marginTop }: { id?: string; title: ReactNode; tag: string; marginTop: string }) {
  return (
    <div id={id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 28, marginTop }}>
      <h2 style={{ ...BARLOW, fontSize: 'clamp(30px,4.6vw,54px)', lineHeight: 0.85, margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{title}</h2>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.7)' }}>{tag}</span>
    </div>
  );
}

/** Photos that show each deal's headline activity (the catalog image is the fallback). */
const DEAL_PHOTOS: Record<string, { src: string; position: string }> = {
  'expo:go': { src: '/images/giant-swing/giant-swing-06.webp', position: 'center 30%' },
  'expo:plus': { src: '/images/zipline-waterfall.webp', position: '45% 40%' },
  'expo:pro': { src: '/images/zipline-new-4.webp', position: 'center 35%' },
  'expo:elite': { src: '/images/map/quad-duo-speed.webp', position: 'center 40%' },
};

/** One expo deal, after the flyer: numbered contents, the struck "was" price, the deal price and what it saves. */
const DEAL_ACCENTS = ['#33FF74', '#FFFC33', '#FF3358', '#7333FF'];
function DealCard({ deal, accent, rate, inDay, onBook, onSwitchRate }: { deal: Product; accent: string; rate: RateKey | null; inDay: boolean; onBook: () => void; onSwitchRate: () => void }) {
  const t = useT();
  const saving = dealSaving(deal);
  const visitor = rate === 'nr';
  const accentFg = accent === '#7333FF' ? '#FFFFFF' : '#340057';
  return (
    <ValleCard data-testid="deal-card" data-deal={deal.key}>
      <CardImage src={DEAL_PHOTOS[deal.key]?.src ?? (deal.image || '/images/vip-ultimate-buggy-coloured-earth.avif')} position={DEAL_PHOTOS[deal.key]?.position} alt={t('{name} package', { name: deal.name })} className="aspect-[16/9]">
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,0,51,.88)] via-[rgba(31,0,51,.25)] to-transparent" />
        {saving > 0 && (
          <span data-testid="deal-save" className="absolute top-3 left-3 -rotate-4 rounded-lg bg-valle-yellow px-3 py-[7px] font-mono text-[11px] font-bold tracking-[.08em] text-valle-purple shadow-[0_6px_16px_rgba(31,0,51,.35)]">
            {t('SAVE {amount}', { amount: money(saving) })}
          </span>
        )}
        <div className="absolute right-4 bottom-3 left-4 origin-bottom-left -rotate-3 font-display text-[clamp(28px,3.2vw,36px)] leading-[.9] font-black text-white uppercase italic">{deal.name}</div>
      </CardImage>
      <div className="h-[7px]" style={{ background: accent }} />
      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <div className="font-mono text-[10.5px] font-semibold tracking-[.14em] text-valle-purple/70">{t('WHAT IS INCLUDED')}</div>
        <ol className="m-0 mt-2 flex-1 list-none p-0">
          {(deal.contents ?? []).map((c, i) => (
            <li key={c} className="flex items-center gap-2.5 py-[5px] text-[14px] text-valle-purple/85" style={{ borderBottom: '1px dashed #EBE2FF' }}>
              <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[10.5px] font-bold" style={{ background: accent, color: accentFg }}>{i + 1}</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3.5 flex items-end justify-between gap-3">
          {deal.was != null && (
            <div>
              <div className="font-mono text-[9.5px] tracking-[.12em] text-valle-purple/70">{t('WAS')}</div>
              <div data-testid="deal-was" className="mt-0.5 font-display text-[19px] font-black text-valle-purple/60 italic line-through decoration-valle-red decoration-2">
                <span className="sr-only">{t('Was')} </span>{money(deal.was)}
              </div>
            </div>
          )}
          <div className="text-end">
            <div className="font-mono text-[9.5px] tracking-[.12em] text-valle-purple/70">{t('DEAL · PER PERSON')}</div>
            <div data-testid="deal-price" className="mt-0.5 font-display text-[clamp(34px,3.6vw,42px)] leading-none font-black text-[#D91E44] italic">{money(deal.rr)}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-valle-purple px-2.5 py-[5px] font-mono text-[9.5px] font-bold tracking-[.08em] text-valle-yellow">{t('RESIDENT RATE · ID REQUIRED')}</span>
          {deal.validFrom && deal.validTo && (
            <span className="rounded-full bg-[#F7F3FF] px-2.5 py-[5px] font-mono text-[9.5px] font-bold tracking-[.08em] text-valle-purple">{t('VALID {from} – {to}', { from: shortDateFromIso(deal.validFrom).toUpperCase(), to: shortDateFromIso(deal.validTo).toUpperCase() })}</span>
          )}
        </div>
        {visitor ? (
          <div data-testid="deal-visitor" className="mt-3.5 rounded-xl bg-[#FFE2E7] px-3.5 py-3">
            <div className="text-[13px] leading-[1.45] font-semibold text-valle-purple">{t('This deal is for residents of Mauritius. You are browsing at the visitor rate.')}</div>
            <ValleButton variant="outline" size="sm" onClick={onSwitchRate} className="mt-2.5">{t('I am a resident: switch to the resident rate')}</ValleButton>
          </div>
        ) : (
          <ValleButton data-testid="deal-book" variant="primary" onClick={onBook} className="mt-3.5">{inDay ? t('In my day · continue to booking →') : t('Book this deal →')}</ValleButton>
        )}
      </div>
    </ValleCard>
  );
}

function QInput({ value, onChange, placeholder, type, min, title, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: string; title?: string; style?: CSSProperties;
}) {
  const [f, setF] = useState(false);
  return (
    <input
      type={type}
      min={min}
      title={title}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{
        border: f ? '1.5px solid #7333FF' : '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: 12,
        padding: '13px 16px', fontFamily: 'inherit', fontSize: 15, outline: 'none', color: '#340057',
        ...style,
      }}
    />
  );
}

function QuoteSubmitBtn({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  const t = useT();
  const [h, bind] = useHover();
  return (
    <button {...bind} onClick={onClick} disabled={busy} aria-busy={busy || undefined} style={{ border: 0, background: busy ? '#B98AA7' : h ? '#D91E44' : '#FF3358', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#FFFFFF', padding: '15px 30px', borderRadius: 999, boxShadow: '0 8px 20px rgba(255,51,88,.35)', transform: h ? 'translateY(-1px)' : undefined }}>{busy ? t('Sending…') : t('Request a quote →')}</button>
  );
}

function QuoteAgainBtn({ onClick }: { onClick: () => void }) {
  const t = useT();
  const [h, bind] = useHover();
  return (
    <button {...bind} onClick={onClick} style={{ marginTop: 18, border: '1.5px solid #340057', background: h ? '#340057' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: h ? '#FFFFFF' : '#340057', padding: '12px 24px', borderRadius: 999 }}>{t('Send another request')}</button>
  );
}

const contactPill: CSSProperties = { border: '1.5px solid #EBE2FF', borderRadius: 999, padding: '9px 16px', fontSize: 13.5, fontWeight: 700 };
export default function PackagesPage() {
  const t = useT();
  const seoGroup = packageGroupOf(useParams<{ group?: string }>().group);
  useSeo(seoGroup
    ? { title: t('{group} · packages & 2026 pricelist · VALLÉ Advenature™ Park', { group: t(seoGroup.title) }), description: t(seoGroup.intro), canonicalPath: '/packages/' + seoGroup.slug, image: CLASS_IMAGE[seoGroup.slug] ?? '/images/vip-ultimate-buggy-coloured-earth.avif', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Packages', path: '/packages' }, { name: seoGroup.title, path: '/packages/' + seoGroup.slug }])] }
    : { title: t('Packages & 2026 pricelist · VALLÉ Advenature™ Park'), description: t('Light, Standard, Exclusive, VIP and Diamond days, resident and senior packages, student and Kids Park pricelists, combos, cinematic shoots and team building. All 2026 prices, VAT inclusive.'), canonicalPath: '/packages', image: '/images/vip-ultimate-buggy-coloured-earth.avif', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Packages', path: '/packages' }])] });
  const catalog = useCatalog();
  const { rate, setRate } = useApp();
  const goto = useGoto();
  const app = useApp();
  const ref = useReveal<HTMLElement>();
  const [pk, setPk] = useState<PackModalData | null>(null);


  // quote form
  const [qName, setQName] = useState('');
  const [qCompany, setQCompany] = useState('');
  const [qEmail, setQEmail] = useState('');
  const [qPhone, setQPhone] = useState('');
  const [qSize, setQSize] = useState('');
  const [qDate, setQDate] = useState('');
  const [qMsg, setQMsg] = useState('');
  const [qErr, setQErr] = useState(false);
  const [qSent, setQSent] = useState(false);
  const [qBusy, setQBusy] = useState(false);
  const [qFail, setQFail] = useState('');

  const quoteEl = useRef<HTMLDivElement | null>(null);
  const quoteGo = () => {
    if (quoteEl.current) window.scrollTo({ top: quoteEl.current.offsetTop - 84, behavior: 'smooth' });
  };

  const quoteSubmit = async () => {
    if (qBusy) return;
    if (!qName.trim() || !qEmail.trim()) { setQErr(true); return; }
    setQErr(false);
    setQFail('');
    setQBusy(true);
    try {
      await createQuote({
      name: qName.trim(),
      company: qCompany.trim() || undefined,
      email: qEmail.trim(),
      phone: qPhone.trim() || undefined,
      groupSize: qSize.trim() || undefined,
      preferredDate: qDate || undefined,
        message: qMsg.trim() || undefined,
      });
      setQSent(true);
    } catch (e) {
      // "Request sent" only when the desk really has it: a failed send shows why and keeps the form.
      const status = (e as { status?: number }).status;
      setQFail(status === 429
        ? t('Too many requests from this connection. Please try again in a few minutes, or write to sales@vallepark.com.')
        : t('We could not send your request. Please try again, or write to sales@vallepark.com.'));
    } finally {
      setQBusy(false);
    }
  };
  const quoteAgain = () => setQSent(false);
  const { group: groupSlug } = useParams<{ group?: string }>();
  const group: PackageGroup | undefined = groupSlug ? PACKAGE_GROUPS.find((g) => g.slug === groupSlug) : undefined;
  /** A section shows on its own class page only; the index shows the classes. */
  const show = (key: string) => !!group && group.keys.includes(key);
  /** The expo deals on sale today; outside their window the class is hidden and its page says so. */
  const deals = liveDeals(catalog);
  const classes = PACKAGE_GROUPS.filter((g) => g.slug !== 'deals' || deals.length > 0 || group?.slug === 'deals');
  const ownHero = !!group && group.slug !== 'deals';
  const qReplyTo = qEmail.trim() || qPhone.trim() || t('your inbox');

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
        <nav aria-label={t('Package classes')} data-testid="package-classes" style={{ display: 'grid', gridTemplateColumns: group ? 'repeat(auto-fit,minmax(150px,1fr))' : 'repeat(auto-fit,minmax(240px,1fr))', gap: group ? 8 : 14, marginTop: ownHero ? 0 : group ? 22 : 30 }}>
          {classes.map((g) => {
            const on = group?.slug === g.slug;
            return (
              <Link key={g.slug} to={paths.packageGroup(g.slug)} data-testid={`class-${g.slug}`} style={{ textDecoration: 'none', color: on ? '#FFFFFF' : '#340057', background: on ? '#340057' : '#FFFFFF', boxShadow: on ? 'none' : '0 0 0 1.5px #EBE2FF', borderRadius: group ? 999 : 18, padding: group ? '10px 14px' : '18px 20px', display: 'flex', flexDirection: 'column', gap: 6, textAlign: group ? 'center' : 'start' }}>
                <span style={{ ...BARLOW, fontSize: group ? 14 : 22, textTransform: 'uppercase', lineHeight: 1 }}>{t(g.title)}</span>
                {!group && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(52,0,87,.72)' }}>{t(g.intro)}</span>}
                {!group && <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', color: '#FF3358', marginTop: 'auto' }}>{t('SEE THE PRICES →')}</span>}
              </Link>
            );
          })}
        </nav>

        {/* SPECIAL DEALS (the expo flyer) */}
        {show('deals') && (<>
        <SectionHead id="deals" title={t('Expo deals')} tag={t('RESIDENTS ONLY · PER PERSON')} marginTop="clamp(40px,6vw,64px)" />
        {deals.length > 0 ? (<>
        <div data-testid="deals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,265px),1fr))', gap: 14, marginTop: 26 }}>
          {deals.map((d, i) => (
            <DealCard
              key={d.key}
              deal={d}
              accent={DEAL_ACCENTS[i % DEAL_ACCENTS.length]}
              rate={rate}
              inDay={!!app.sel['product:' + d.key]}
              onBook={() => { if (!app.sel['product:' + d.key]) app.toggleSel('product:' + d.key); goto.booking(); }}
              onSwitchRate={() => setRate('rr')}
            />
          ))}
        </div>
        <div data-testid="deals-notes" style={{ marginTop: 14, background: '#F7F3FF', borderRadius: 16, padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#340057' }}>{t('Resident rates apply upon presentation of a valid Mauritian National ID card, Residence Permit, Occupation Permit, Permanent Residence Permit, or valid work/dependent permit confirming residency in Mauritius.')}</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em', color: 'rgba(52,0,87,.75)' }}>{t('ALL PRICES ARE VAT INCLUSIVE · ALL ACTIVITIES SOLD ARE NON REFUNDABLE · TERMS AND CONDITIONS APPLY')}</div>
        </div>
        </>) : (
          <div data-testid="deals-ended" style={{ marginTop: 26, background: '#F7F3FF', borderRadius: 16, padding: '22px 24px' }}>
            <div style={{ ...BARLOW, fontSize: 24, textTransform: 'uppercase' }}>{t('No deal on sale today')}</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', margin: '8px 0 14px' }}>{t('The expo deals are only bookable for visits inside their validity dates. The resident packages are available all year.')}</p>
            <Link to={paths.packageGroup('resident')} className={valleButton({ variant: 'dark', size: 'lg' })} style={{ textDecoration: 'none', color: '#FFFFFF' }}>{t('See the resident packages →')}</Link>
          </div>
        )}
        </>)}
        {/* the class pages, each in the structure of the senior page */}
        {group?.slug === 'exclusive' && <ExclusivePage onDetails={setPk} />}
        {group?.slug === 'resident' && <ResidentPage onQuote={quoteGo} onDetails={setPk} />}
        {group?.slug === 'senior' && <SeniorPage onQuote={quoteGo} onDetails={(p) => setPk({ ...p, productKey: p.key })} />}
        {group?.slug === 'student' && <StudentPage onQuote={quoteGo} />}
        {group?.slug === 'corporate' && <CorporatePage onQuote={quoteGo} />}
        {group?.slug === 'photo-video' && <PhotoVideoPage />}

        {/* QUOTE FORM */}
        <div id="quote" ref={quoteEl} style={{ marginTop: 'clamp(36px,5vw,56px)', background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 1.5px #EBE2FF' }}>
          <div style={{ height: 8, background: 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)' }} />
          {!qSent && (
            <div style={{ padding: '26px clamp(20px,3vw,34px) 30px' }}>
              <div style={{ ...BARLOW, fontSize: 'clamp(24px,3vw,34px)', textTransform: 'uppercase', transform: 'rotate(-2deg)', transformOrigin: 'left bottom' }}>{group?.slug === 'corporate' ? t('Ready to strengthen your team?') : t('Plan it with us')}</div>
              <div style={{ fontSize: 14.5, color: 'rgba(52,0,87,.7)', marginTop: 8 }}>{group?.slug === 'corporate' ? t('Tell us about your group and we will send a tailored quote.') : t('Tell us your date and party; the team sends a tailored quote within one working day.')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 18 }}>
                <QInput value={qName} onChange={(v) => { setQName(v); setQErr(false); }} placeholder={t('Name *')} />
                <QInput value={qCompany} onChange={setQCompany} placeholder={t('Company')} />
                <QInput value={qEmail} onChange={(v) => { setQEmail(v); setQErr(false); }} placeholder={t('Email *')} />
                <QInput value={qPhone} onChange={setQPhone} placeholder={t('Phone')} />
                <QInput value={qSize} onChange={setQSize} placeholder={t('Group size (e.g. 40)')} />
                <QInput type="date" min={todayIso()} value={qDate} onChange={setQDate} title={t('Preferred date')} style={{ padding: '12px 16px' }} />
              </div>
              <QInput value={qMsg} onChange={setQMsg} placeholder={t('Anything else? Objectives, timing, dietary needs…')} style={{ width: '100%', marginTop: 10 }} />
              {qErr && (
                <div role="alert" style={{ marginTop: 10, background: '#FFE2E7', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, fontWeight: 600, color: '#D91E44' }}>{t('Please add your name and an email so we can reply.')}</div>
              )}
              {qFail && (
                <div role="alert" data-testid="quote-error" style={{ marginTop: 10, background: '#FFE2E7', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, fontWeight: 600, color: '#D91E44' }}>{qFail}</div>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <QuoteSubmitBtn onClick={() => { void quoteSubmit(); }} busy={qBusy} />
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.7)' }}>{t('*HRDC REFUND CONDITIONS APPLY · REPLY WITHIN 1 WORKING DAY')}</span>
              </div>
            </div>
          )}
          {qSent && (
            <div style={{ padding: '34px clamp(20px,3vw,34px) 38px', textAlign: 'center' }}>
              <div style={{ width: 62, height: 62, borderRadius: 999, background: '#33FF74', color: '#340057', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, margin: '0 auto' }}>✓</div>
              <div style={{ ...BARLOW, fontSize: 28, textTransform: 'uppercase', marginTop: 14 }}>{t('Request sent')}</div>
              <div style={{ fontSize: 15, color: 'rgba(52,0,87,.72)', marginTop: 8, lineHeight: 1.6 }}>{t('Thanks {name}, the events team will reply to {to} within one working day with a tailored quote.', { name: qName, to: qReplyTo })}</div>
              <QuoteAgainBtn onClick={quoteAgain} />
            </div>
          )}
        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(52,0,87,.7)' }}>{t('TALK TO A PARK HOST:')}</span>
          <a href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener" style={contactPill}>{t('Chat')} · +230 5292 8841</a>
          <a href="mailto:sales@vallepark.com" style={contactPill}>{t('Email')} · sales@vallepark.com</a>
          <a href="tel:+2306604477" style={contactPill}>{t('Call')} · +230 660 4477</a>
        </div>
      </main>

      <PackageModal pack={pk} onClose={() => setPk(null)} />
    </>
  );
}
