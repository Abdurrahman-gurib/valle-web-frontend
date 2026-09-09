import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useCatalog } from '../store/CatalogContext';
import { useApp } from '../store/AppStore';
import { useGoto } from '../lib/nav';
import { useHover } from '../hooks/useHover';
import { useReveal } from '../hooks/useReveal';
import { money, todayIso } from '../lib/format';
import { createQuote } from '../lib/api';
import { PackageModal, type PackModalData } from '../components/PackageModal';
import { Img } from '../components/Img';
import type { PackTier, PhotoTier, RateKey, TeamPack } from '../types';

const MONO = "'Chivo Mono',monospace";
const BARLOW: CSSProperties = { fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900 };

const cardBase: CSSProperties = {
  background: '#FFFFFF', borderRadius: 18, overflow: 'hidden', boxShadow: '0 0 0 1.5px #EBE2FF',
  display: 'flex', flexDirection: 'column', transition: 'transform .25s ease, box-shadow .25s ease',
};
const cardHov: CSSProperties = { transform: 'translateY(-5px)', boxShadow: '0 24px 46px -18px rgba(52,0,87,.4)' };

function SectionHead({ id, title, tag, marginTop }: { id?: string; title: ReactNode; tag: string; marginTop: string }) {
  return (
    <div id={id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 28, marginTop }}>
      <h2 style={{ ...BARLOW, fontSize: 'clamp(30px,4.6vw,54px)', lineHeight: 0.85, margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{title}</h2>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>{tag}</span>
    </div>
  );
}

function PriceCol({ label, value, valSize }: { label: string; value: string; valSize: number }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', color: 'rgba(52,0,87,.55)' }}>{label}</div>
      <div style={{ ...BARLOW, fontSize: valSize, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function LSCard({ pk, onOpen }: { pk: PackTier; onOpen: () => void }) {
  const [hc, bindC] = useHover();
  const [hi, bindI] = useHover();
  const [hb, bindB] = useHover();
  return (
    <div {...bindC} style={{ ...cardBase, ...(hc ? cardHov : undefined) }}>
      <div {...bindI} onClick={onOpen} style={{ position: 'relative', height: 215, background: '#EBE2FF', cursor: 'zoom-in', overflow: 'hidden' }}>
        <Img src={pk.img} alt={pk.name + ' package'} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transition: 'transform .5s ease', ...(hi ? { transform: 'scale(1.06)' } : undefined) }} />
        <span style={{ position: 'absolute', top: 12, left: 12, background: pk.color, color: pk.fg, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '6px 11px', transform: 'rotate(-4deg)' }}>{pk.badge}</span>
        <span style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(255,255,255,.92)', color: '#340057', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 12px' }}>VIEW DETAILS ↗</span>
      </div>
      <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ ...BARLOW, fontSize: 26, textTransform: 'uppercase' }}>{pk.name}</div>
        <div style={{ marginTop: 10, flex: 1 }}>
          {pk.items.map((pi) => (
            <div key={pi.t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '5px 0', fontSize: 14, color: 'rgba(52,0,87,.82)' }}>
              <span style={{ color: pk.color, fontWeight: 800, flexShrink: 0 }}>●</span><span>{pi.t}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(52,0,87,.55)', marginTop: 8 }}>{pk.note}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 14, borderTop: '1px dashed #D9C9F0', paddingTop: 14 }}>
          <PriceCol label="SINGLE" value={pk.single} valSize={23} />
          <PriceCol label="DOUBLE" value={pk.dbl} valSize={23} />
        </div>
        <button {...bindB} onClick={onOpen} style={{ marginTop: 12, border: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', background: hb ? '#7333FF' : '#340057', color: '#FFFFFF', fontSize: 14, fontWeight: 700, padding: '13px 0', borderRadius: 999, width: '100%' }}>See what is included →</button>
      </div>
    </div>
  );
}

function ExCard({ pk, onOpen }: { pk: PackTier; onOpen: () => void }) {
  const [hc, bindC] = useHover();
  const [hi, bindI] = useHover();
  const [hb, bindB] = useHover();
  return (
    <div {...bindC} style={{ ...cardBase, ...(hc ? cardHov : undefined) }}>
      <div {...bindI} onClick={onOpen} style={{ position: 'relative', height: 135, background: '#EBE2FF', cursor: 'zoom-in', overflow: 'hidden' }}>
        <Img src={pk.img} alt={pk.name + ' package'} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .5s ease', ...(hi ? { transform: 'scale(1.06)' } : undefined) }} />
        <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(255,255,255,.92)', color: '#340057', fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '6px 11px' }}>VIEW DETAILS ↗</span>
      </div>
      <div style={{ height: 7, background: pk.color }} />
      <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ ...BARLOW, fontSize: 24, textTransform: 'uppercase' }}>{pk.name}</div>
          <span style={{ width: 14, height: 14, borderRadius: 999, background: pk.color, flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#7333FF', marginTop: 4 }}>{pk.hero}</div>
        <div style={{ marginTop: 8, flex: 1 }}>
          {pk.items.map((pi) => (
            <div key={pi.t} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0', fontSize: 13.5, color: 'rgba(52,0,87,.8)' }}>
              <span style={{ color: pk.color, fontWeight: 800, flexShrink: 0 }}>●</span><span>{pi.t}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, borderTop: '1px dashed #D9C9F0', paddingTop: 12 }}>
          <PriceCol label="SINGLE" value={pk.single} valSize={20} />
          <PriceCol label="DOUBLE" value={pk.dbl} valSize={20} />
        </div>
        <button {...bindB} onClick={onOpen} style={{ marginTop: 11, border: '1.5px solid #340057', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', background: hb ? '#340057' : 'transparent', color: hb ? '#FFFFFF' : '#340057', fontSize: 13.5, fontWeight: 700, padding: '11px 0', borderRadius: 999, width: '100%' }}>View details →</button>
      </div>
    </div>
  );
}

interface ComboView { name: string; color: string; items: { t: string }[]; single: string; dbl: string; }

function ComboCard({ cb, rateTag, onBook }: { cb: ComboView; rateTag: string; onBook: () => void }) {
  const [hc, bindC] = useHover();
  const [hb, bindB] = useHover();
  return (
    <div {...bindC} style={{ ...cardBase, ...(hc ? cardHov : undefined) }}>
      <div style={{ height: 7, background: cb.color }} />
      <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ ...BARLOW, fontSize: 26, textTransform: 'uppercase' }}>{cb.name}</div>
        <div style={{ marginTop: 10, flex: 1 }}>
          {cb.items.map((ci) => (
            <div key={ci.t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '6px 0', fontSize: 14.5, color: 'rgba(52,0,87,.82)' }}>
              <span style={{ color: cb.color, fontWeight: 800, flexShrink: 0 }}>●</span><span>{ci.t}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 14, borderTop: '1px dashed #D9C9F0', paddingTop: 14 }}>
          <PriceCol label={'SINGLE · ' + rateTag} value={cb.single} valSize={23} />
          <PriceCol label={'DOUBLE · ' + rateTag} value={cb.dbl} valSize={23} />
        </div>
        <button {...bindB} onClick={onBook} style={{ marginTop: 12, border: 0, cursor: 'pointer', fontFamily: 'inherit', background: hb ? '#7333FF' : '#340057', color: '#FFFFFF', fontSize: 14, fontWeight: 700, padding: '13px 0', borderRadius: 999, width: '100%' }}>Book this combo →</button>
      </div>
    </div>
  );
}

function PhotoCard({ ph }: { ph: PhotoTier }) {
  const [hc, bindC] = useHover();
  return (
    <div {...bindC} style={{ ...cardBase, ...(hc ? cardHov : undefined) }}>
      <div style={{ background: '#340057', padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ ...BARLOW, fontSize: 20, textTransform: 'uppercase', color: '#FFFC33' }}>{ph.name}</span>
        <span style={{ width: 12, height: 12, borderRadius: 999, background: ph.color, flexShrink: 0 }} />
      </div>
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ background: '#FF3358', color: '#FFFFFF', borderRadius: 10, padding: '11px 14px', textAlign: 'center' }}>
          <div style={{ ...BARLOW, fontWeight: 800, fontSize: 15, textTransform: 'uppercase' }}>{ph.act}</div>
          <div style={{ fontSize: 12.5, opacity: 0.9 }}>All captured photos</div>
        </div>
        <div style={{ background: '#FFE2E7', color: '#340057', borderRadius: 10, padding: '9px 14px', textAlign: 'center', marginTop: 8, ...BARLOW, fontWeight: 800, fontSize: 14, textTransform: 'uppercase' }}>1 print included</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 12, marginTop: 14, borderTop: '1px dashed #D9C9F0', paddingTop: 12 }}>
          <PriceCol label="SINGLE" value={ph.single} valSize={21} />
          <PriceCol label="DOUBLE" value={ph.dbl} valSize={21} />
        </div>
      </div>
    </div>
  );
}

function TeamCard({ tp, onQuote }: { tp: TeamPack; onQuote: () => void }) {
  const [hc, bindC] = useHover();
  const [hb, bindB] = useHover();
  return (
    <div {...bindC} style={{ ...cardBase, ...(hc ? cardHov : undefined) }}>
      <div style={{ height: 190, background: '#EBE2FF' }}>
        <Img src={tp.img} alt="Team building day at Vallé Advenature™ Park" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>YOU WILL GET</div>
        <div style={{ marginTop: 8, flex: 1 }}>
          {tp.items.map((pi) => (
            <div key={pi.t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '4px 0', fontSize: 14, color: 'rgba(52,0,87,.82)' }}>
              <span style={{ color: '#33FF74', fontWeight: 800, flexShrink: 0 }}>●</span><span>{pi.t}</span>
            </div>
          ))}
        </div>
        <button {...bindB} onClick={onQuote} style={{ marginTop: 12, border: 0, background: hb ? '#7333FF' : '#340057', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#FFFFFF', padding: '13px 0', borderRadius: 999, width: '100%' }}>Request a quote</button>
      </div>
    </div>
  );
}

function VipButton({ onOpen }: { onOpen: () => void }) {
  const [h, bind] = useHover();
  return (
    <button {...bind} onClick={onOpen} style={{ marginLeft: 'auto', alignSelf: 'center', border: 0, cursor: 'pointer', fontFamily: 'inherit', background: h ? '#D91E44' : '#FF3358', color: '#FFFFFF', fontSize: 15, fontWeight: 700, padding: '15px 28px', borderRadius: 999, boxShadow: '0 8px 20px rgba(255,51,88,.4)' }}>See the full VIP day →</button>
  );
}

function VipImage({ onOpen }: { onOpen: () => void }) {
  const [h, bind] = useHover();
  return (
    <div {...bind} onClick={onOpen} style={{ flex: 1, minWidth: 'min(100%,280px)', minHeight: 300, position: 'relative', cursor: 'zoom-in', overflow: 'hidden' }}>
      <Img src="/images/frame-1872-1.avif" alt="VIP Ultimate package" surface="dark" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .6s ease', ...(h ? { transform: 'scale(1.05)' } : undefined) }} />
      <span style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(255,255,255,.92)', color: '#340057', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 12px' }}>VIEW DETAILS ↗</span>
    </div>
  );
}

function CineBookLink() {
  const [h, bind] = useHover();
  return (
    <a {...bind} href="https://api.whatsapp.comisendi?phone=23052928841" target="_blank" rel="noopener" style={{ marginTop: 16, textAlign: 'center', background: h ? '#D91E44' : '#FF3358', color: '#FFFFFF', fontSize: 15, fontWeight: 700, padding: '15px 0', borderRadius: 999, display: 'block' }}>Book a shooter for my day →</a>
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

function QuoteSubmitBtn({ onClick }: { onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button {...bind} onClick={onClick} style={{ border: 0, background: h ? '#D91E44' : '#FF3358', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#FFFFFF', padding: '15px 30px', borderRadius: 999, boxShadow: '0 8px 20px rgba(255,51,88,.35)', transform: h ? 'translateY(-1px)' : undefined }}>Request a quote →</button>
  );
}

function QuoteAgainBtn({ onClick }: { onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button {...bind} onClick={onClick} style={{ marginTop: 18, border: '1.5px solid #340057', background: h ? '#340057' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: h ? '#FFFFFF' : '#340057', padding: '12px 24px', borderRadius: 999 }}>Send another request</button>
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
  const catalog = useCatalog();
  const { rate, rateTag, setRate } = useApp();
  const goto = useGoto();
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

  const quoteEl = useRef<HTMLDivElement | null>(null);
  const quoteGo = () => {
    if (quoteEl.current) window.scrollTo({ top: quoteEl.current.offsetTop - 84, behavior: 'smooth' });
  };

  const vipPack: PackModalData = {
    name: 'VIP Ultimate', badge: 'ALL INCLUSIVE', color: '#33FF74', fg: '#340057',
    img: '/images/frame-1872-1.avif',
    hero: 'Advenature Flight, private guide, butler service',
    items: catalog.PACKS.vip, note: 'Add on: full-day cinematic video, Rs 20,000.',
    single: 'Rs 49,225', dbl: 'Rs 75,175',
  };
  const openVip = () => setPk(vipPack);

  const comboPacks: ComboView[] = catalog.COMBO.map((c) => ({
    name: c.name, color: c.color, items: c.items, single: money(c[rk][0]), dbl: money(c[rk][1]),
  }));
  const cinePacks = catalog.CINE.map((c) => ({ n: c.n, p: money(c.p) }));
  const photoTiers = catalog.PHOTO[rk].tiers;
  const photoAddons = catalog.PHOTO[rk].addons;
  const photoRateLabel = rk === 'rr' ? 'RESIDENT RATE (RR)' : 'NON-RESIDENT RATE (NR)';

  const quoteSubmit = () => {
    if (!qName.trim() || !qEmail.trim()) { setQErr(true); return; }
    setQErr(false);
    createQuote({
      name: qName.trim(),
      company: qCompany.trim() || undefined,
      email: qEmail.trim(),
      phone: qPhone.trim() || undefined,
      groupSize: qSize.trim() || undefined,
      preferredDate: qDate || undefined,
      message: qMsg.trim() || undefined,
    })
      .catch(() => undefined)
      .finally(() => setQSent(true));
  };
  const quoteAgain = () => setQSent(false);
  const qReplyTo = qEmail.trim() || qPhone.trim() || 'your inbox';

  return (
    <>
      <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ ...BARLOW, fontSize: 'clamp(42px,6.4vw,90px)', lineHeight: 0.82, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>Packages</h1>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>ALL PRICES VAT INCLUSIVE</span>
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', maxWidth: '62ch', margin: '18px 0 0' }}>Curated adventure days, from a relaxed first taste of the valley to the full VIP escape. Enquire to book a package; the team confirms availability within one working day.</p>

        {/* LIGHT & STANDARD */}
        <SectionHead id="ls" title={<>Light &amp; Standard</>} tag="01 · START HERE" marginTop="clamp(40px,6vw,64px)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 26 }}>
          {catalog.PACKS.ls.map((p) => (
            <LSCard key={p.name} pk={p} onOpen={() => setPk(p)} />
          ))}
        </div>

        {/* EXCLUSIVE */}
        <SectionHead id="ex" title="Exclusive" tag="02 · BRONZE TO PLATINUM" marginTop="clamp(44px,6vw,72px)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(245px,1fr))', gap: 14, marginTop: 26 }}>
          {catalog.PACKS.ex.map((p) => (
            <ExCard key={p.name} pk={p} onOpen={() => setPk(p)} />
          ))}
        </div>
        <div style={{ marginTop: 14, background: '#F7F3FF', borderRadius: 16, padding: '16px 22px' }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>ADD-ONS</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {catalog.PACKS.addons.map((ad) => (
              <span key={ad.t} style={addonPill}>{ad.t} <span style={{ fontFamily: MONO, fontWeight: 700, color: '#7333FF' }}>{ad.p}</span></span>
            ))}
          </div>
        </div>

        {/* VIP */}
        <div id="vip" style={{ marginTop: 'clamp(44px,6vw,72px)', background: '#340057', borderRadius: 22, overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
          <div style={{ flex: 1.5, minWidth: 'min(100%,340px)', padding: 'clamp(26px,4vw,44px)', color: '#FFFFFF' }}>
            <span style={{ background: '#33FF74', color: '#340057', fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 13px', display: 'inline-block', transform: 'rotate(-4deg)' }}>SOUVENIR GIFT OFFERED</span>
            <div style={{ transform: 'rotate(-4deg)', transformOrigin: 'left bottom', marginTop: 18 }}>
              <h2 style={{ ...BARLOW, fontSize: 'clamp(30px,4.4vw,52px)', lineHeight: 0.85, margin: 0, textTransform: 'uppercase' }}>VIP Ultimate<br /><span style={{ color: '#FFFC33' }}>All Inclusive</span></h2>
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
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', opacity: 0.65 }}>SINGLE</div>
                <div style={{ ...BARLOW, fontSize: 30, marginTop: 2 }}>Rs 49,225</div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', opacity: 0.65 }}>DOUBLE</div>
                <div style={{ ...BARLOW, fontSize: 30, marginTop: 2 }}>Rs 75,175</div>
              </div>
              <VipButton onOpen={openVip} />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, opacity: 0.6, marginTop: 12 }}>ADD ON: FULL-DAY CINEMATIC VIDEO · RS 20,000</div>
          </div>
          <VipImage onOpen={openVip} />
        </div>

        {/* COMBO PACKAGES */}
        <SectionHead id="combo" title="Combo packages" tag="04 · QUAD + ZIPLINE, ONE PRICE" marginTop="clamp(48px,7vw,80px)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 26 }}>
          {comboPacks.map((cb) => (
            <ComboCard key={cb.name} cb={cb} rateTag={rateTag} onBook={goto.booking} />
          ))}
        </div>

        {/* CINEMATIC EXPERIENCE */}
        <SectionHead id="cine" title="Cinematic experience" tag="05 · SAME PRICE FOR EVERYONE" marginTop="clamp(48px,7vw,80px)" />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 26, alignItems: 'stretch' }}>
          <div style={{ flex: '1 1 320px', background: '#FFFC33', borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 1.5px #EBE2FF' }}>
            <div style={{ padding: '18px 22px 20px' }}>
              <span style={{ background: '#340057', color: '#FFFC33', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', borderRadius: 8, padding: '7px 11px', display: 'inline-block', transform: 'rotate(-3deg)' }}>CINEMATIC EXPERIENCE</span>
              <div style={{ marginTop: 16 }}>
                {cinePacks.map((cn) => (
                  <div key={cn.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '9px 0', borderBottom: '1px dashed rgba(52,0,87,.25)' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: '#340057' }}>{cn.n}</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13.5, color: '#D91E44', whiteSpace: 'nowrap' }}>{cn.p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ flex: '1 1 300px', background: '#340057', borderRadius: 20, padding: '22px 24px', color: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...BARLOW, fontSize: 'clamp(24px,3vw,34px)', lineHeight: 0.9, textTransform: 'uppercase' }}>Leave with<br /><span style={{ color: '#33FF74' }}>the film</span></div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: '14px 0 0' }}>A dedicated shooter follows your day: the koi pond, the swing over the valley, the ziplines. You get an edited cinematic reel and the stills, ready to post before you leave the park.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              <span style={{ border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 999, padding: '7px 13px', fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>EDITED REEL</span>
              <span style={{ border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 999, padding: '7px 13px', fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>ALL STILLS</span>
              <span style={{ border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 999, padding: '7px 13px', fontFamily: MONO, fontSize: 10.5, fontWeight: 600 }}>DRESS AVAILABLE</span>
            </div>
            <div style={{ flex: 1, minHeight: 14 }} />
            <CineBookLink />
          </div>
        </div>

        {/* PHOTO PRICELIST */}
        <SectionHead id="photo" title="Photo pricelist" tag="06 · 1 JULY 2026 TO 30 JUNE 2027" marginTop="clamp(48px,7vw,80px)" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 4, background: '#FFFFFF', border: '1.5px solid #EBE2FF', borderRadius: 999, padding: 4 }}>
            <button onClick={() => setRate('rr')} style={rateBtn(rk === 'rr')}>Resident</button>
            <button onClick={() => setRate('nr')} style={rateBtn(rk === 'nr')}>Non-resident</button>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.14em', color: '#7333FF' }}>{photoRateLabel}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(215px,1fr))', gap: 14, marginTop: 20 }}>
          {photoTiers.map((ph) => (
            <PhotoCard key={ph.name} ph={ph} />
          ))}
        </div>
        <div style={{ marginTop: 14, background: '#F7F3FF', borderRadius: 16, padding: '16px 22px' }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>PHOTO ADD-ONS</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {photoAddons.map((ad) => (
              <span key={ad.t} style={addonPill}>{ad.t} <span style={{ fontFamily: MONO, fontWeight: 700, color: '#7333FF' }}>{ad.p}</span></span>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.55)', marginTop: 12 }}>ALL PRICES VAT INCLUSIVE · PHOTOS ARE NON REFUNDABLE · T&amp;C APPLY</div>
        </div>

        {/* TEAM BUILDING */}
        <SectionHead id="team" title="Team building" tag="07 · FROM RS 2,850 PER PERSON" marginTop="clamp(48px,7vw,80px)" />
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(52,0,87,.75)', maxWidth: '62ch', margin: '18px 0 0' }}>Trust, laughter and a bit of adrenaline, facilitated by certified trainers. Programs scale from 10 to 300+ people, and HRDC refunds can apply.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 26 }}>
          {catalog.TEAM.map((tp, i) => (
            <TeamCard key={i} tp={tp} onQuote={quoteGo} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <span style={teamPill}>HRDC REFUNDABLE*</span>
          <span style={teamPill}>10 TO 300+ PEOPLE</span>
          <span style={teamPill}>CERTIFIED FACILITATORS</span>
          <span style={teamPill}>INDOOR BACKUP IF IT RAINS</span>
          <span style={teamPill}>TAILORED MENUS &amp; LOGISTICS</span>
        </div>

        {/* QUOTE FORM */}
        <div id="quote" ref={quoteEl} style={{ marginTop: 'clamp(36px,5vw,56px)', background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 0 1.5px #EBE2FF' }}>
          <div style={{ height: 8, background: 'repeating-linear-gradient(-45deg,#33FF74 0 12px,#340057 12px 24px)' }} />
          {!qSent && (
            <div style={{ padding: '26px clamp(20px,3vw,34px) 30px' }}>
              <div style={{ ...BARLOW, fontSize: 'clamp(24px,3vw,34px)', textTransform: 'uppercase', transform: 'rotate(-2deg)', transformOrigin: 'left bottom' }}>Ready to strengthen your team?</div>
              <div style={{ fontSize: 14.5, color: 'rgba(52,0,87,.7)', marginTop: 8 }}>Tell us about your group and we will send a tailored quote.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 18 }}>
                <QInput value={qName} onChange={(v) => { setQName(v); setQErr(false); }} placeholder="Name *" />
                <QInput value={qCompany} onChange={setQCompany} placeholder="Company" />
                <QInput value={qEmail} onChange={(v) => { setQEmail(v); setQErr(false); }} placeholder="Email *" />
                <QInput value={qPhone} onChange={setQPhone} placeholder="Phone" />
                <QInput value={qSize} onChange={setQSize} placeholder="Group size (e.g. 40)" />
                <QInput type="date" min={todayIso()} value={qDate} onChange={setQDate} title="Preferred date" style={{ padding: '12px 16px' }} />
              </div>
              <QInput value={qMsg} onChange={setQMsg} placeholder="Anything else? Objectives, timing, dietary needs…" style={{ width: '100%', marginTop: 10 }} />
              {qErr && (
                <div style={{ marginTop: 10, background: '#FFE2E7', borderRadius: 10, padding: '11px 14px', fontSize: 13.5, fontWeight: 600, color: '#D91E44' }}>Please add your name and an email so we can reply.</div>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <QuoteSubmitBtn onClick={quoteSubmit} />
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(52,0,87,.55)' }}>*HRDC REFUND CONDITIONS APPLY · REPLY WITHIN 1 WORKING DAY</span>
              </div>
            </div>
          )}
          {qSent && (
            <div style={{ padding: '34px clamp(20px,3vw,34px) 38px', textAlign: 'center' }}>
              <div style={{ width: 62, height: 62, borderRadius: 999, background: '#33FF74', color: '#340057', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, margin: '0 auto' }}>✓</div>
              <div style={{ ...BARLOW, fontSize: 28, textTransform: 'uppercase', marginTop: 14 }}>Request sent</div>
              <div style={{ fontSize: 15, color: 'rgba(52,0,87,.72)', marginTop: 8, lineHeight: 1.6 }}>Thanks {qName}, the events team will reply to {qReplyTo} within one working day with a tailored quote.</div>
              <QuoteAgainBtn onClick={quoteAgain} />
            </div>
          )}
        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(52,0,87,.55)' }}>TALK TO A PARK HOST:</span>
          <a href="https://api.whatsapp.comisendi?phone=23052928841" target="_blank" rel="noopener" style={contactPill}>Chat · +230 5292 8841</a>
          <a href="mailto:sales@vallepark.com" style={contactPill}>Email · sales@vallepark.com</a>
          <a href="tel:+2306604477" style={contactPill}>Call · +230 660 4477</a>
        </div>
      </main>

      <PackageModal pack={pk} onClose={() => setPk(null)} />
    </>
  );
}
