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
import { money, todayIso } from '../lib/format';
import { createQuote } from '../lib/api';
import { PackageModal, type PackModalData } from '../components/PackageModal';
import { Img } from '../components/Img';
import { BulletList, CardImage, CardTitle, PhotoPill, PriceCol, PriceRow, ValleButton, ValleCard, valleButton } from '../components/ui/valle';
import { CurrencyPicker } from '../components/CurrencyPicker';
import type { PackTier, PhotoTier, RateKey, TeamPack } from '../types';
import { useT } from '../i18n';

const MONO = "'Chivo Mono',monospace";
const BARLOW: CSSProperties = { fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900 };


function SectionHead({ id, title, tag, marginTop }: { id?: string; title: ReactNode; tag: string; marginTop: string }) {
  return (
    <div id={id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 28, marginTop }}>
      <h2 style={{ ...BARLOW, fontSize: 'clamp(30px,4.6vw,54px)', lineHeight: 0.85, margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{title}</h2>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>{tag}</span>
    </div>
  );
}

function LSCard({ pk, onOpen }: { pk: PackTier; onOpen: () => void }) {
  const t = useT();
  return (
    <ValleCard data-testid="pack-card">
      <CardImage src={pk.img} alt={t('{name} package', { name: pk.name })} onClick={onOpen}>
        <span className="absolute top-3 left-3 -rotate-4 rounded-full px-[11px] py-1.5 font-mono text-[10px] font-bold tracking-[.1em]" style={{ background: pk.color, color: pk.fg }}>{pk.badge}</span>
        <PhotoPill>{t('VIEW DETAILS ↗')}</PhotoPill>
      </CardImage>
      <div className="flex flex-1 flex-col px-[22px] pt-[18px] pb-[22px]">
        <CardTitle>{pk.name}</CardTitle>
        <BulletList items={pk.items} color={pk.color} className="mt-2.5 flex-1" />
        <div className="mt-2 text-xs text-valle-purple/55">{pk.note}</div>
        <PriceRow>
          <PriceCol label={t('SINGLE')} value={pk.single} />
          <PriceCol label={t('DOUBLE')} value={pk.dbl} />
        </PriceRow>
        <ValleButton onClick={onOpen} className="mt-3">{t('See what is included →')}</ValleButton>
      </div>
    </ValleCard>
  );
}

function ExCard({ pk, onOpen }: { pk: PackTier; onOpen: () => void }) {
  const t = useT();
  return (
    <ValleCard data-testid="pack-card">
      <CardImage src={pk.img} alt={t('{name} package', { name: pk.name })} onClick={onOpen}>
        <PhotoPill className="right-2.5 bottom-2.5 text-[9.5px]">{t('VIEW DETAILS ↗')}</PhotoPill>
      </CardImage>
      <div className="h-[7px]" style={{ background: pk.color }} />
      <div className="flex flex-1 flex-col px-5 pt-[18px] pb-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle size={24}>{pk.name}</CardTitle>
          <span className="size-3.5 shrink-0 rounded-full" style={{ background: pk.color }} />
        </div>
        <div className="mt-1 text-[13px] font-bold text-valle-violet">{pk.hero}</div>
        <BulletList items={pk.items} color={pk.color} className="mt-2 flex-1 [&_li]:py-1 [&_li]:text-[13.5px]" />
        <PriceRow className="gap-3 pt-3">
          {pk.dbl ? <PriceCol label={t('SINGLE')} value={pk.single} size={20} /> : <PriceCol label={t('PER PERSON')} value={pk.single} size={22} />}
          {pk.dbl && <PriceCol label={t('DOUBLE')} value={pk.dbl} size={20} />}
        </PriceRow>
        {pk.note && <div className="mt-2 text-xs text-valle-purple/55">{pk.note}</div>}
        <ValleButton variant="outline" size="sm" onClick={onOpen} className="mt-[11px]">{t('View details →')}</ValleButton>
      </div>
    </ValleCard>
  );
}

interface ComboView { key?: string; name: string; color: string; items: { t: string }[]; single: string; dbl: string; }

function PriceTable({ title, badge, rows, foot, accent, image }: { title: ReactNode; badge: string; rows: { n: string; p: string }[]; foot: string; accent: string; image: string }) {
  const t = useT();
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 26, alignItems: 'stretch' }}>
      <div style={{ flex: '1 1 340px', background: '#7333FF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 18px 40px -18px rgba(52,0,87,.5)' }}>
        <div style={{ height: 10, background: `repeating-linear-gradient(-45deg,${accent} 0 12px,#340057 12px 24px)` }} />
        <div style={{ padding: '18px 22px 20px' }}>
          <span style={{ background: accent, color: '#340057', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', borderRadius: 8, padding: '7px 11px', display: 'inline-block', transform: 'rotate(-3deg)' }}>{badge}</span>
          <div style={{ marginTop: 14 }}>
            {rows.map((r) => (
              <div key={r.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,.28)' }}>
                <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>{t(r.n)}</span>
                <span style={{ background: '#FFFC33', color: '#340057', fontFamily: MONO, fontWeight: 700, fontSize: 12.5, borderRadius: 6, padding: '5px 9px', whiteSpace: 'nowrap' }}>{r.p}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', color: 'rgba(255,255,255,.65)', marginTop: 11 }}>{foot}</div>
        </div>
      </div>
      <div style={{ flex: '1 1 280px', minHeight: 260, maxHeight: 460, borderRadius: 20, overflow: 'hidden', position: 'relative', background: '#EBE2FF' }}>
        <Img src={image} alt="" surface="dark" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.85), rgba(31,0,51,0) 60%)' }} />
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, color: '#FFFFFF', ...BARLOW, fontSize: 'clamp(24px,3vw,34px)', lineHeight: 0.9, textTransform: 'uppercase' }}>{title}</div>
      </div>
    </div>
  );
}

function ComboCard({ cb, rateTag, onBook }: { cb: ComboView; rateTag: string; onBook: () => void }) {
  const t = useT();
  return (
    <ValleCard data-testid="combo-card">
      <div className="h-[7px]" style={{ background: cb.color }} />
      <div className="flex flex-1 flex-col px-[22px] pt-[18px] pb-[22px]">
        <CardTitle>{cb.name}</CardTitle>
        <BulletList items={cb.items} color={cb.color} className="mt-2.5 flex-1 [&_li]:py-1.5 [&_li]:text-[14.5px]" />
        <PriceRow>
          <PriceCol label={t('SINGLE · {rate}', { rate: rateTag })} value={cb.single} />
          <PriceCol label={t('DOUBLE · {rate}', { rate: rateTag })} value={cb.dbl} />
        </PriceRow>
        <ValleButton onClick={onBook} className="mt-3">{t('Book this combo →')}</ValleButton>
      </div>
    </ValleCard>
  );
}

function PhotoCard({ ph, onBook }: { ph: PhotoTier; onBook?: () => void }) {
  const t = useT();
  return (
    <ValleCard>
      <div className="flex items-center justify-between gap-2 bg-valle-purple px-[18px] py-[13px]">
        <CardTitle size={20} className="text-valle-yellow">{ph.name}</CardTitle>
        <span className="size-3 shrink-0 rounded-full" style={{ background: ph.color }} />
      </div>
      <div className="flex flex-1 flex-col px-[18px] pt-4 pb-[18px]">
        <div className="rounded-[10px] bg-valle-red px-3.5 py-[11px] text-center text-white">
          <div className="font-display text-[15px] font-extrabold uppercase italic">{ph.act}</div>
          <div className="text-[12.5px] opacity-90">{t('All captured photos')}</div>
        </div>
        <div className="mt-2 rounded-[10px] bg-[#FFE2E7] px-3.5 py-[9px] text-center font-display text-sm font-extrabold uppercase italic">{t('1 print included')}</div>
        <div className="flex-1" />
        <PriceRow className="gap-3 pt-3">
          <PriceCol label={t('SINGLE')} value={ph.single} size={21} />
          <PriceCol label={t('DOUBLE')} value={ph.dbl} size={21} />
        </PriceRow>
        {onBook && <ValleButton data-testid="photo-book" onClick={onBook} className="mt-3 py-3">{t('Book this photo pack →')}</ValleButton>}
      </div>
    </ValleCard>
  );
}

function TeamCard({ tp, onQuote }: { tp: TeamPack; onQuote: () => void }) {
  const t = useT();
  return (
    <ValleCard>
      <CardImage src={tp.img} alt={t('Team building day at Vallé Advenature™ Park')} />
      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <div className="font-mono text-[10.5px] font-semibold tracking-[.14em] text-valle-purple/55">{t('YOU WILL GET')}</div>
        <BulletList items={tp.items} color="#33FF74" className="mt-2 flex-1 [&_li]:py-1" />
        <ValleButton onClick={onQuote} className="mt-3">{t('Request a quote')}</ValleButton>
      </div>
    </ValleCard>
  );
}

function VipButton({ onOpen }: { onOpen: () => void }) {
  const t = useT();
  return <ValleButton variant="primary" size="lg" onClick={onOpen} className="ms-auto self-center">{t('See the full VIP day →')}</ValleButton>;
}

function VipImage({ onOpen }: { onOpen: () => void }) {
  const t = useT();
  const [h, bind] = useHover();
  return (
    <div {...bind} onClick={onOpen} style={{ flex: 1, minWidth: 'min(100%,280px)', minHeight: 300, position: 'relative', cursor: 'zoom-in', overflow: 'hidden' }}>
      <Img src="/images/vip-ultimate-buggy-coloured-earth.avif" alt={t('VIP Ultimate package')} surface="dark" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .6s ease', ...(h ? { transform: 'scale(1.05)' } : undefined) }} />
      <span style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(255,255,255,.92)', color: '#340057', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 12px' }}>{t('VIEW DETAILS ↗')}</span>
    </div>
  );
}

function CineBookLink() {
  const t = useT();
  const [h, bind] = useHover();
  return (
    <a {...bind} href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener" style={{ marginTop: 16, textAlign: 'center', background: h ? '#D91E44' : '#FF3358', color: '#FFFFFF', fontSize: 15, fontWeight: 700, padding: '15px 0', borderRadius: 999, display: 'block' }}>{t('Book a shooter for my day →')}</a>
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

const teamPill: CSSProperties = { border: '1.5px solid #EBE2FF', background: '#FFFFFF', borderRadius: 999, padding: '8px 14px', fontFamily: MONO, fontSize: 11, fontWeight: 600, color: '#340057' };
const contactPill: CSSProperties = { border: '1.5px solid #EBE2FF', borderRadius: 999, padding: '9px 16px', fontSize: 13.5, fontWeight: 700 };
const addonPill: CSSProperties = { border: '1.5px solid #EBE2FF', background: '#FFFFFF', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#340057' };
const rateBtn = (on: boolean): CSSProperties => ({
  border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '11px 22px',
  borderRadius: 999, transition: 'background .2s ease',
  background: on ? '#340057' : 'transparent', color: on ? '#FFFFFF' : 'rgba(52,0,87,.7)',
});

export default function PackagesPage() {
  const t = useT();
  const seoGroup = packageGroupOf(useParams<{ group?: string }>().group);
  useSeo(seoGroup
    ? { title: t('{group} · packages & 2026 pricelist · VALLÉ Advenature™ Park', { group: t(seoGroup.title) }), description: t(seoGroup.intro), canonicalPath: '/packages/' + seoGroup.slug, image: '/images/vip-ultimate-buggy-coloured-earth.avif', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Packages', path: '/packages' }, { name: seoGroup.title, path: '/packages/' + seoGroup.slug }])] }
    : { title: t('Packages & 2026 pricelist · VALLÉ Advenature™ Park'), description: t('Light, Standard, Exclusive, VIP and Diamond days, resident and senior packages, student and Kids Park pricelists, combos, cinematic shoots and team building. All 2026 prices, VAT inclusive.'), canonicalPath: '/packages', image: '/images/vip-ultimate-buggy-coloured-earth.avif', jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Packages', path: '/packages' }])] });
  const catalog = useCatalog();
  const { rate, rateTag, setRate } = useApp();
  const goto = useGoto();
  const app = useApp();
  const ref = useReveal<HTMLElement>();
  const [pk, setPk] = useState<PackModalData | null>(null);

  const rk: RateKey = rate ?? 'rr';

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

  const vipPack: PackModalData = {
    name: 'VIP Ultimate', badge: t('ALL INCLUSIVE'), color: '#33FF74', fg: '#340057',
    img: '/images/vip-ultimate-buggy-coloured-earth.avif',
    hero: t('Advenature Flight, private guide, butler service'),
    productKey: (catalog.PRODUCTS ?? []).some((p) => p.key === 'vip') ? 'vip' : undefined,
    items: catalog.PACKS.vip, note: t('Add on: full-day cinematic video, Rs 20,000.'),
    single: 'Rs 49,225', dbl: 'Rs 75,175',
  };
  const openVip = () => setPk(vipPack);

  const comboPacks: ComboView[] = catalog.COMBO.map((c) => ({
    key: c.key, name: c.name, color: c.color, items: c.items, single: money(c[rk][0]), dbl: money(c[rk][1]),
  }));
  const cinePacks = catalog.CINE.map((c) => ({ key: c.key, n: c.n, p: money(c.p) }));
  const photoTiers = catalog.PHOTO[rk].tiers;
  const photoAddons = catalog.PHOTO[rk].addons;
  const photoRateLabel = rk === 'rr' ? t('RESIDENT RATE (RR)') : t('NON-RESIDENT RATE (NR)');

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
  const qReplyTo = qEmail.trim() || qPhone.trim() || t('your inbox');

  if (groupSlug && !group) return <NotFoundPage />;

  return (
    <>
      <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ ...BARLOW, fontSize: group ? 'clamp(34px,5vw,72px)' : 'clamp(42px,6.4vw,90px)', lineHeight: 0.82, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{group ? t(group.title) : t('Packages')}</h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>{t('ALL PRICES VAT INCLUSIVE')}<CurrencyPicker fg="#340057" /></span>
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', maxWidth: '62ch', margin: '18px 0 0' }}>{group ? t(group.intro) : t('Curated adventure days, from a relaxed first taste of the valley to the full VIP escape. Enquire to book a package; the team confirms availability within one working day.')}</p>

        {/* the six classes, each on its own page; on a class page the strip doubles as the way to the others */}
        <nav aria-label={t('Package classes')} data-testid="package-classes" style={{ display: 'grid', gridTemplateColumns: group ? 'repeat(auto-fit,minmax(150px,1fr))' : 'repeat(auto-fit,minmax(240px,1fr))', gap: group ? 8 : 14, marginTop: group ? 22 : 30 }}>
          {PACKAGE_GROUPS.map((g) => {
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

        {/* LIGHT & STANDARD */}
        {show('ls') && (<>
        <SectionHead id="ls" title={t('Light & Standard')} tag={t('01 · START HERE')} marginTop="clamp(40px,6vw,64px)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 26 }}>
          {catalog.PACKS.ls.map((p) => (
            <LSCard key={p.name} pk={p} onOpen={() => setPk({ ...p, productKey: p.key })} />
          ))}
        </div>

        </>)}
        {/* EXCLUSIVE */}
        {show('ex') && (<>
        <SectionHead id="ex" title={t('Exclusive')} tag={t('02 · BRONZE TO PLATINUM')} marginTop="clamp(44px,6vw,72px)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(245px,1fr))', gap: 14, marginTop: 26 }}>
          {catalog.PACKS.ex.map((p) => (
            <ExCard key={p.name} pk={p} onOpen={() => setPk({ ...p, productKey: p.key })} />
          ))}
        </div>
        <div style={{ marginTop: 14, background: '#F7F3FF', borderRadius: 16, padding: '16px 22px' }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>{t('ADD-ONS')}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {catalog.PACKS.addons.map((ad) => (
              <span key={ad.t} style={addonPill}>{ad.t} <span style={{ fontFamily: MONO, fontWeight: 700, color: '#7333FF' }}>{ad.p}</span></span>
            ))}
          </div>
        </div>

        </>)}
        {/* VIP */}
        {show('vip') && (<>
        <div id="vip" style={{ marginTop: 'clamp(44px,6vw,72px)', background: '#340057', borderRadius: 22, overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
          <div style={{ flex: 1.5, minWidth: 'min(100%,340px)', padding: 'clamp(26px,4vw,44px)', color: '#FFFFFF' }}>
            <span style={{ background: '#33FF74', color: '#340057', fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 13px', display: 'inline-block', transform: 'rotate(-4deg)' }}>{t('SOUVENIR GIFT OFFERED')}</span>
            <div style={{ transform: 'rotate(-4deg)', transformOrigin: 'left bottom', marginTop: 18 }}>
              <h2 style={{ ...BARLOW, fontSize: 'clamp(30px,4.4vw,52px)', lineHeight: 0.85, margin: 0, textTransform: 'uppercase' }}>{t('VIP Ultimate')}<br /><span style={{ color: '#FFFC33' }}>{t('All Inclusive')}</span></h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '4px 24px', marginTop: 20 }}>
              {catalog.PACKS.vip.map((pi) => (
                <div key={pi.t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '4px 0', fontSize: 14, color: 'rgba(255,255,255,.9)' }}>
                  <span style={{ color: '#33FF74', fontWeight: 800, flexShrink: 0 }}>●</span><span>{pi.t}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 26, marginTop: 20, borderTop: '1px solid rgba(255,255,255,.2)', paddingTop: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', opacity: 0.65 }}>{t('SINGLE')}</div>
                <div style={{ ...BARLOW, fontSize: 30, marginTop: 2 }}>Rs 49,225</div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', opacity: 0.65 }}>{t('DOUBLE')}</div>
                <div style={{ ...BARLOW, fontSize: 30, marginTop: 2 }}>Rs 75,175</div>
              </div>
              <VipButton onOpen={openVip} />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, opacity: 0.6, marginTop: 12 }}>{t('ADD ON: FULL-DAY CINEMATIC VIDEO · RS 20,000')}</div>
          </div>
          <VipImage onOpen={openVip} />
        </div>

        </>)}
        {/* DIAMOND */}
        {show('diamond') && (<>
        <SectionHead id="diamond" title={t('Diamond')} tag={t('04 · THE ULTIMATE DAY · NR')} marginTop="clamp(48px,7vw,80px)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 26 }}>
          {(catalog.PACKS.diamond || []).map((p) => (
            <LSCard key={p.name} pk={p} onOpen={() => setPk({ ...p, productKey: p.key })} />
          ))}
          {/* the day in one picture: drone over the expedition country, the story on top */}
          <div className="relative flex min-h-[380px] flex-col justify-end overflow-hidden rounded-[18px] bg-valle-purple p-6 text-white">
            <Img src="/images/shoot/group-02.webp" alt="" surface="dark" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,0,51,.94)] via-[rgba(31,0,51,.55)] to-[rgba(31,0,51,.1)]" />
            <div className="relative">
              <div style={{ ...BARLOW, fontSize: 'clamp(24px,3vw,34px)', lineHeight: 0.9, textTransform: 'uppercase' }}>{t('Everything,')}<br /><span style={{ color: '#FFFC33' }}>{t('and then some')}</span></div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.88)', margin: '14px 0 0' }}>{t('The full VIP day plus a stone-cooking lunch at Le Chamouzé, a three-hour hunting expedition and a cinematic film of your whole visit. Butler, transfers and a souvenir gift included.')}</p>
              <div style={{ fontFamily: MONO, fontSize: 10.5, opacity: 0.7, marginTop: 16 }}>{t('NON-RESIDENT RATE · ENQUIRE TO RESERVE')}</div>
            </div>
          </div>
        </div>

        </>)}
        {/* RESIDENT PACKAGES */}
        {show('resident') && (<>
        <SectionHead id="resident" title={t('Resident packages')} tag={t('05 · PER PERSON · MAURITIAN ID OR PERMIT')} marginTop="clamp(48px,7vw,80px)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(245px,1fr))', gap: 14, marginTop: 26 }}>
          {(catalog.PACKS.resident || []).map((p) => (
            <ExCard key={p.name} pk={p} onOpen={() => setPk({ ...p, productKey: p.key })} />
          ))}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.55)', marginTop: 12 }}>{t('RESIDENT RATES APPLY ON PRESENTATION OF A VALID MAURITIAN NATIONAL ID, RESIDENCE, OCCUPATION, PERMANENT RESIDENCE OR WORK/DEPENDENT PERMIT.')}</div>

        </>)}
        {/* SENIOR CITIZENS */}
        {show('senior') && (<>
        <SectionHead id="senior" title={t('Senior citizens')} tag={t('06 · AGES 55 AND ABOVE')} marginTop="clamp(48px,7vw,80px)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginTop: 26 }}>
          {(catalog.PACKS.senior || []).map((p) => (
            <ExCard key={p.name} pk={p} onOpen={() => setPk({ ...p, productKey: p.key })} />
          ))}
        </div>

        </>)}
        {/* STUDENT OFFER */}
        {show('student') && (<>
        <SectionHead id="student" title={t('Student special offer')} tag={t('07 · PRE-PRIMARY, PRIMARY & SECONDARY')} marginTop="clamp(48px,7vw,80px)" />
        <PriceTable
          title={<>{t('Every great explorer')}<br /><span style={{ color: '#FFFC33' }}>{t('starts small')}</span></>}
          badge={t('STUDENT PRICELIST · SCHOOL GROUPS')}
          rows={(catalog.PL.student || []).map((r) => ({ n: r.n, p: money(r.rr) }))}
          foot={t('LUNCH: FRIED RICE + SOFT DRINK, OR CRISPY CHICKEN, FRIES, CHEESE PIZZA + SOFT DRINK · VEG OPTION · VAT INCLUSIVE')}
          accent="#33FF74"
          image="/images/map/zip-selfie-cheer.webp"
        />
        <div className="mt-4"><Link to={paths.groups()} data-testid="book-school" className={valleButton({ variant: 'dark', size: 'lg' })} style={{ textDecoration: 'none' }}>{t('Book a school visit online →')}</Link></div>

        </>)}
        {/* KIDS PARK PRICELIST */}
        {show('kids') && (<>
        <SectionHead id="kids" title={t('Vallé Kids Park')} tag={t('08 · PAY WITH POINTS · 10 POINTS = RS 100')} marginTop="clamp(48px,7vw,80px)" />
        <PriceTable
          title={<>{t('Little feet')}<br /><span style={{ color: '#FFFC33' }}>{t('lead the way')}</span></>}
          badge={t('KIDS PARK PRICELIST · {rate}', { rate: rateTag })}
          rows={(catalog.PL.kids || []).map((r) => ({ n: r.n, p: t('{price} · 20 pts', { price: money(r[rk]) }) }))}
          foot={t('TOP-UP CARD RS 50 · OUTDOOR PLAYGROUND INCLUDED WITH THE PARK VISIT · STUDENT GROUPS RS 100 PER RIDE')}
          accent="#FFFC33"
          image="/images/miniquad.avif"
        />

        </>)}
        {/* COMBO PACKAGES */}
        {show('combo') && (<>

        <SectionHead id="combo" title={t('Combo packages')} tag={t('09 · QUAD + ZIPLINE, ONE PRICE')} marginTop="clamp(48px,7vw,80px)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 26 }}>
          {comboPacks.map((cb) => (
            <ComboCard key={cb.name} cb={cb} rateTag={rateTag} onBook={() => { if (cb.key && !app.sel['product:' + cb.key]) app.toggleSel('product:' + cb.key); goto.booking(); }} />
          ))}
        </div>

        </>)}
        {/* CINEMATIC EXPERIENCE */}
        {show('cine') && (<>
        <SectionHead id="cine" title={t('Cinematic experience')} tag={t('10 · SAME PRICE FOR EVERYONE')} marginTop="clamp(48px,7vw,80px)" />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 26, alignItems: 'stretch' }}>
          <div style={{ flex: '1 1 320px', background: '#FFFC33', borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 1.5px #EBE2FF' }}>
            <div style={{ padding: '18px 22px 20px' }}>
              <span style={{ background: '#340057', color: '#FFFC33', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', borderRadius: 8, padding: '7px 11px', display: 'inline-block', transform: 'rotate(-3deg)' }}>{t('CINEMATIC EXPERIENCE')}</span>
              <div style={{ marginTop: 16 }}>
                {cinePacks.map((cn) => (
                  <div key={cn.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '9px 0', borderBottom: '1px dashed rgba(52,0,87,.25)' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: '#340057' }}>{t(cn.n)}</span>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13.5, color: '#D91E44', whiteSpace: 'nowrap' }}>{cn.p}</span>{cn.key && <button type="button" onClick={() => { if (!app.sel['product:' + cn.key]) app.toggleSel('product:' + cn.key); goto.booking(); }} style={{ border: '1.5px solid #340057', background: app.sel['product:' + cn.key] ? '#340057' : 'transparent', color: app.sel['product:' + cn.key] ? '#FFFC33' : '#340057', borderRadius: 999, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{app.sel['product:' + cn.key] ? t('In my day') : t('Book')}</button>}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ flex: '1 1 300px', background: '#340057', borderRadius: 20, padding: '22px 24px', color: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...BARLOW, fontSize: 'clamp(24px,3vw,34px)', lineHeight: 0.9, textTransform: 'uppercase' }}>{t('Leave with')}<br /><span style={{ color: '#33FF74' }}>{t('the film')}</span></div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: '14px 0 0' }}>{t('A dedicated shooter follows your day: the koi pond, the swing over the valley, the ziplines. You get an edited cinematic reel and the stills, ready to post before you leave the park.')}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              <span style={{ border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 999, padding: '7px 13px', fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>{t('EDITED REEL')}</span>
              <span style={{ border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 999, padding: '7px 13px', fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>{t('ALL STILLS')}</span>
              <span style={{ border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 999, padding: '7px 13px', fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>{t('DRESS AVAILABLE')}</span>
            </div>
            <div style={{ flex: 1, minHeight: 14 }} />
            <CineBookLink />
          </div>
        </div>
        {/* stills from a real cinematic shoot in the park: the swing at the falls, portraits by the water */}
        <div data-testid="cine-gallery" className="grid-4" style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} style={{ aspectRatio: '4 / 3', borderRadius: 16, overflow: 'hidden', background: '#EBE2FF' }}>
              <Img src={`/images/shoot/cine-${String(n).padStart(2, '0')}.webp`} alt={t('Cinematic shoot at Vallé: the swing by the waterfall')} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
            </div>
          ))}
        </div>

        </>)}
        {/* PHOTO PRICELIST */}
        {show('photo') && (<>
        <SectionHead id="photo" title={t('Photo pricelist')} tag={t('11 · 1 JULY 2026 TO 30 JUNE 2027')} marginTop="clamp(48px,7vw,80px)" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 4, background: '#FFFFFF', border: '1.5px solid #EBE2FF', borderRadius: 999, padding: 4 }}>
            <button onClick={() => setRate('rr')} style={rateBtn(rk === 'rr')}>{t('Resident')}</button>
            <button onClick={() => setRate('nr')} style={rateBtn(rk === 'nr')}>{t('Non-resident')}</button>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.14em', color: '#7333FF' }}>{photoRateLabel}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(215px,1fr))', gap: 14, marginTop: 20 }}>
          {photoTiers.map((ph) => (
            <PhotoCard key={ph.name} ph={ph} onBook={ph.key ? () => { if (!app.sel['product:' + ph.key]) app.toggleSel('product:' + ph.key!); goto.booking(); } : undefined} />
          ))}
        </div>
        <div style={{ marginTop: 14, background: '#F7F3FF', borderRadius: 16, padding: '16px 22px' }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>{t('PHOTO ADD-ONS')}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {photoAddons.map((ad) => (
              <span key={ad.t} style={addonPill}>{ad.t} <span style={{ fontFamily: MONO, fontWeight: 700, color: '#7333FF' }}>{ad.p}</span></span>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.55)', marginTop: 12 }}>{t('ALL PRICES VAT INCLUSIVE · PHOTOS ARE NON REFUNDABLE · T&C APPLY')}</div>
        </div>

        </>)}
        {/* TEAM BUILDING */}
        {show('team') && (<>
        <SectionHead id="team" title={t('Team building')} tag={t('12 · FROM RS 2,850 PER PERSON')} marginTop="clamp(48px,7vw,80px)" />
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', maxWidth: '62ch', margin: '18px 0 0' }}>{t('Trust, laughter and a bit of adrenaline, facilitated by certified trainers. Programs scale from 10 to 300+ people, and HRDC refunds can apply.')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 26 }}>
          {catalog.TEAM.map((tp, i) => (
            <TeamCard key={i} tp={tp} onQuote={quoteGo} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <span style={teamPill}>{t('HRDC REFUNDABLE*')}</span>
          <span style={teamPill}>{t('10 TO 300+ PEOPLE')}</span>
          <span style={teamPill}>{t('CERTIFIED FACILITATORS')}</span>
          <span style={teamPill}>{t('INDOOR BACKUP IF IT RAINS')}</span>
          <span style={teamPill}>{t('TAILORED MENUS & LOGISTICS')}</span>
        </div>

        </>)}
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
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.55)' }}>{t('*HRDC REFUND CONDITIONS APPLY · REPLY WITHIN 1 WORKING DAY')}</span>
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
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(52,0,87,.55)' }}>{t('TALK TO A PARK HOST:')}</span>
          <a href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener" style={contactPill}>{t('Chat')} · +230 5292 8841</a>
          <a href="mailto:sales@vallepark.com" style={contactPill}>{t('Email')} · sales@vallepark.com</a>
          <a href="tel:+2306604477" style={contactPill}>{t('Call')} · +230 660 4477</a>
        </div>
      </main>

      <PackageModal pack={pk} onClose={() => setPk(null)} />
    </>
  );
}
