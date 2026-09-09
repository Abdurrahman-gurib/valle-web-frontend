import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useCatalog } from '../store/CatalogContext';
import { useApp } from '../store/AppStore';
import { useGoto } from '../lib/nav';
import { useCardModel, type CardModel } from '../lib/card';
import { money } from '../lib/format';
import { useHover } from '../hooks/useHover';
import { useReveal } from '../hooks/useReveal';
import { Stripes, StripesSm } from '../components/Stripes';
import { Img } from '../components/Img';
import type { GalleryShot } from '../types';

const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

function GalRestShot({ g }: { g: GalleryShot }) {
  const [h, hb] = useHover();
  return (
    <div style={{ position: 'relative', flex: '1 1 210px', minWidth: 0, aspectRatio: '4 / 3', borderRadius: 18, overflow: 'hidden' }}>
      <Img
        src={g.src}
        alt={`${g.tag}: ${g.cap}`}
        surface="dark"
        {...hb}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 26%', transition: 'transform .7s ease', ...(h ? { transform: 'scale(1.05)' } : undefined) }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 16px', background: 'linear-gradient(to top,rgba(31,0,51,.82),transparent)' }}>
        <span style={{ background: '#33FF74', color: '#340057', fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', borderRadius: 999, padding: '5px 10px' }}>{g.tag}</span>
        <div style={{ fontSize: 13.5, color: '#FFFFFF', marginTop: 8, lineHeight: 1.35 }}>{g.cap}</div>
      </div>
    </div>
  );
}

function RelatedCard({ a }: { a: CardModel }) {
  const [h, hb] = useHover();
  const [th, tb] = useHover();
  return (
    <div
      onClick={a.open}
      {...hb}
      style={{
        cursor: 'pointer', background: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 0 0 1.5px #EBE2FF', transition: 'transform .25s ease, box-shadow .25s ease',
        ...(h ? { transform: 'translateY(-4px)', boxShadow: '0 18px 36px -16px rgba(52,0,87,.4)' } : undefined),
      }}
    >
      <div style={{ position: 'relative', height: 150, background: '#EBE2FF' }}>
        <Img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {a.hasAdd && (
          <button
            onClick={a.add}
            title={a.addLabel}
            {...tb}
            style={{
              position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 999,
              border: '2px solid #FFFFFF', background: a.selOn ? '#33FF74' : 'rgba(52,0,87,.5)',
              color: a.selOn ? '#340057' : '#FFFFFF', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,.3)', padding: 0, lineHeight: 1,
              ...(th ? { transform: 'scale(1.15)' } : undefined),
            }}
          >{a.selOn ? '✓' : '+'}</button>
        )}
      </div>
      <div style={{ padding: '13px 15px 15px' }}>
        <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 800, fontSize: 17, textTransform: 'uppercase' }}>{a.name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: MONO, fontSize: 11, color: 'rgba(52,0,87,.6)' }}>
          <span>{a.dur}</span>
          <span style={{ fontWeight: 700, color: '#340057' }}>{a.priceLabel}</span>
        </div>
      </div>
    </div>
  );
}

export default function DetailPage() {
  const { id } = useParams();
  const catalog = useCatalog();
  const app = useApp();
  const goto = useGoto();
  const navigate = useNavigate();
  const card = useCardModel();
  const ref = useReveal<HTMLElement>();
  const [hBack, bBack] = useHover();
  const [hAdd, bAdd] = useHover();
  const [hBook, bBook] = useHover();
  const [hLead, bLead] = useHover();
  const [hCta, bCta] = useHover();

  const act = catalog.ACTS.find((a) => a.id === id);
  if (!act) return <Navigate to="/explore" replace />;

  const d = card(act);
  const related = catalog.ACTS.filter((a) => a.cat === act.cat && a.id !== act.id).slice(0, 4).map(card);
  const gal = catalog.GAL[act.id];
  const galLead = gal?.shots[0];
  const galLeadPos = (galLead && galLead.pos) || '50% 18%';
  const galRest = gal ? gal.shots.slice(1) : [];
  const rk = app.rate === 'nr' ? 'nr' : 'rr';
  const pl = catalog.PL[act.id] || [];
  const prices = pl.map((r) => ({ n: r.n, p: r[rk] ? money(r[rk]) : 'FREE' }));
  const hasPrices = pl.length > 0;
  const showReviews = act.id === 'zipline';

  /** Always goes to the explore page (never history.back), but restores its last filters. */
  const backExplore = () => {
    let qs = '';
    try {
      qs = sessionStorage.getItem('exploreQS') || '';
    } catch {
      /* private mode can throw, so fall back to the unfiltered list */
    }
    navigate('/explore' + (qs ? '?' + qs : ''));
  };

  const bookThisNow = () => {
    if (!app.isSelected(act.id) && (act.mode === 'pp' || act.mode === 'flat')) app.toggleSel(act.id);
    goto.booking();
  };

  return (
    <main ref={ref} style={{ maxWidth: 1320, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      <button
        onClick={backExplore}
        {...bBack}
        style={{ border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: hBack ? '#FF3358' : '#7333FF', padding: '8px 0' }}
      >← All experiences</button>

      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', height: 'min(58vh,540px)', minHeight: 320, background: '#EBE2FF', marginTop: 12 }}>
        <Img src={act.img} alt={act.name} priority style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.8), rgba(31,0,51,0) 55%)' }} />
        <div style={{ position: 'absolute', left: 'clamp(18px,3vw,36px)', right: 'clamp(18px,3vw,36px)', bottom: 'clamp(18px,3vw,30px)', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ background: d.catColor, color: d.catFg, fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 13px', display: 'inline-block', transform: 'rotate(-4deg)' }}>{d.catBadge}</span>
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

          {hasPrices && (
            <div style={{ marginTop: 26, background: '#7333FF', borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 40px -18px rgba(52,0,87,.5)' }}>
              <StripesSm height={10} />
              <div style={{ padding: '16px 20px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: '#FFFC33' }}>Pricelist</span>
                  <button onClick={app.openRateGate} title="Change rate" style={{ border: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', background: '#FFFC33', color: '#340057', borderRadius: 999, padding: '6px 11px' }}>{app.rateTag} ⇄</button>
                </div>
                <div style={{ marginTop: 10 }}>
                  {prices.map((pr) => (
                    <div key={pr.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,.28)' }}>
                      <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>{pr.n}</span>
                      <span style={{ background: '#FFFC33', color: '#340057', fontFamily: MONO, fontWeight: 700, fontSize: 12.5, borderRadius: 6, padding: '5px 9px', whiteSpace: 'nowrap' }}>{pr.p}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', color: 'rgba(255,255,255,.65)', marginTop: 11 }}>VAT INCLUSIVE · 1 JULY 2026 TO 30 JUNE 2027 · NON REFUNDABLE</div>
              </div>
            </div>
          )}

          <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)', marginTop: 28 }}>GOOD TO KNOW</div>
          <div style={{ marginTop: 10 }}>
            {act.gtk.map((g) => (
              <div key={g.t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px dashed #D9C9F0', fontSize: 15, lineHeight: 1.5, color: 'rgba(52,0,87,.8)' }}>
                <span style={{ color: d.pulseColor, fontWeight: 800, flexShrink: 0 }}>●</span>
                <span>{g.t}</span>
              </div>
            ))}
          </div>

          {showReviews && (
            <>
              <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)', marginTop: 30 }}>WHAT VISITORS SAY</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginTop: 12 }}>
                <div style={{ background: '#FFFFE2', borderRadius: 16, padding: '18px 20px' }}>
                  <div style={{ color: '#FF3358', letterSpacing: 2, fontSize: 13 }}>★★★★★</div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.55, marginTop: 8, color: 'rgba(52,0,87,.82)' }}>"Did I just zipline in and out of a waterfall? YES I DID! The instructors were fantastic, great way to spend my birthday."</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, marginTop: 10, color: 'rgba(52,0,87,.6)' }}>KATE O · TRIPADVISOR, MAY 2025</div>
                </div>
                <div style={{ background: '#E2FFEB', borderRadius: 16, padding: '18px 20px' }}>
                  <div style={{ color: '#FF3358', letterSpacing: 2, fontSize: 13 }}>★★★★★</div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.55, marginTop: 8, color: 'rgba(52,0,87,.82)' }}>"Magnificent views and ziplines that make the adrenaline rise! Staff professional and welcoming. To do and do again."</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, marginTop: 10, color: 'rgba(52,0,87,.6)' }}>ANNABELLE A · TRIPADVISOR, MAY 2025</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ background: '#340057', color: '#FFFFFF', borderRadius: 20, padding: '0 0 26px', position: 'sticky', top: 90, overflow: 'hidden' }}>
          <StripesSm height={8} />
          <div style={{ padding: '22px 26px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontFamily: MONO }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.14em', opacity: 0.6 }}>DURATION</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{act.dur}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.14em', opacity: 0.6 }}>MIN AGE</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{act.age}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.14em', opacity: 0.6 }}>PULSE</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4, color: '#FFFC33' }}>{d.pulseName}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.14em', opacity: 0.6 }}>PRICE</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{d.priceLabel}</div>
              </div>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,.2)', margin: '20px 0' }} />
            {d.hasAdd && (
              <button
                onClick={() => app.toggleSel(act.id)}
                {...bAdd}
                style={{
                  width: '100%', border: '1.5px solid rgba(255,255,255,.5)',
                  background: d.selOn ? 'rgba(51,255,116,.25)' : 'transparent',
                  color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                  padding: '14px 0', borderRadius: 999, transition: 'all .15s',
                  ...(hAdd ? { transform: 'translateY(-1px)', background: 'rgba(255,255,255,.16)' } : undefined),
                }}
              >{d.addLabel}</button>
            )}
            <button
              onClick={bookThisNow}
              {...bBook}
              style={{
                width: '100%', marginTop: 10, border: 0, background: hBook ? '#D91E44' : '#FF3358',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#FFFFFF',
                padding: '15px 0', borderRadius: 999, boxShadow: '0 8px 20px rgba(255,51,88,.35)',
                ...(hBook ? { transform: 'translateY(-1px)' } : undefined),
              }}
            >Book this now →</button>
            <div style={{ fontFamily: MONO, fontSize: 10.5, opacity: 0.65, textAlign: 'center', marginTop: 12 }}>PAY ON ARRIVAL · NO CANCELLATION FEE</div>
          </div>
        </div>
      </div>

      {gal && galLead && (
        <div style={{ marginTop: 'clamp(40px,5.5vw,64px)', background: '#340057', borderRadius: 26, overflow: 'hidden' }}>
          <Stripes height={12} />
          <div style={{ padding: 'clamp(22px,3.4vw,38px)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', color: '#33FF74' }}>{gal.eyebrow}</span>
                <div style={{ transform: 'rotate(-3deg)', transformOrigin: 'left bottom', marginTop: 12 }}>
                  <h2 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.4vw,58px)', lineHeight: 0.84, margin: 0, textTransform: 'uppercase', color: '#FFFFFF' }}>
                    {gal.t1}<br /><span style={{ color: '#FFFC33' }}>{gal.t2}</span>
                  </h2>
                </div>
              </div>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: 0, maxWidth: '44ch' }}>{gal.copy}</p>
            </div>
            <div style={{ marginTop: 22 }}>
              <div style={{ position: 'relative', minWidth: 0, minHeight: 'clamp(260px,38vw,520px)', borderRadius: 18, overflow: 'hidden' }}>
                <Img
                  src={galLead.src}
                  alt={`${galLead.tag}: ${galLead.cap}`}
                  surface="dark"
                  {...bLead}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: galLeadPos, transition: 'transform .7s ease', ...(hLead ? { transform: 'scale(1.04)' } : undefined) }}
                />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 20px', background: 'linear-gradient(to top,rgba(31,0,51,.85),transparent)' }}>
                  <span style={{ background: '#FF3358', color: '#FFFFFF', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', borderRadius: 999, padding: '6px 11px' }}>{galLead.tag}</span>
                  <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(17px,2vw,23px)', color: '#FFFFFF', marginTop: 9, textTransform: 'uppercase', lineHeight: 1.05 }}>{galLead.cap}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                {galRest.map((g) => <GalRestShot key={g.src} g={g} />)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 20 }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(255,255,255,.6)' }}>{gal.foot}</span>
              <button
                onClick={bookThisNow}
                {...bCta}
                style={{
                  marginLeft: 'auto', border: 0, background: hCta ? '#D91E44' : '#FF3358', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#FFFFFF', padding: '15px 28px',
                  borderRadius: 999, boxShadow: '0 10px 24px -8px rgba(255,51,88,.6)',
                  ...(hCta ? { transform: 'translateY(-1px)' } : undefined),
                }}
              >{gal.cta}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 'clamp(44px,6vw,72px)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 14, marginBottom: 18 }}>
          <h2 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(28px,3.6vw,46px)', letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>Pairs well with</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
          {related.map((a) => <RelatedCard key={a.id} a={a} />)}
        </div>
      </div>
    </main>
  );
}
