import { Navigate, useParams } from 'react-router-dom';
import { useCatalog } from '../store/CatalogContext';
import { useGoto } from '../lib/nav';
import { useHover } from '../hooks/useHover';
import { useReveal } from '../hooks/useReveal';
import { StripesSm } from '../components/Stripes';
import { Img } from '../components/Img';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '.14em', opacity: 0.6 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4, fontFamily: "'Work Sans',sans-serif" }}>{value}</div>
    </div>
  );
}

export default function RestaurantPage() {
  const ref = useReveal<HTMLElement>();
  const goto = useGoto();
  const { RESTOS } = useCatalog();
  const { id } = useParams<{ id: string }>();
  const [backH, backBind] = useHover();
  const [otherH, otherBind] = useHover();

  if (id !== 'chamouze' && id !== 'citronelle') return <Navigate to="/dine/chamouze" replace />;

  const r = RESTOS[id] || RESTOS.chamouze;
  const otherId = id === 'chamouze' ? 'citronelle' : 'chamouze';
  const other = RESTOS[otherId];
  const rGallery = (r.gallery || []).map((src) => ({ src, alt: r.name }));
  const rMenuGroups = r.menuGroups || [];
  const rMenuPdf = r.menuPdf || '';

  return (
    <main ref={ref} style={{ maxWidth: 1180, margin: '0 auto', padding: '104px clamp(16px,3.5vw,40px) 0' }}>
      <button
        onClick={() => goto.dine()}
        {...backBind}
        style={{
          border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 14, fontWeight: 700, color: backH ? '#FF3358' : '#7333FF', padding: '8px 0',
        }}
      >← All dining</button>

      {/* Hero header */}
      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', height: 'min(52vh,480px)', minHeight: 300, background: '#EBE2FF', marginTop: 12 }}>
        <Img src={r.img} alt={r.name} priority style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.82), rgba(31,0,51,0) 55%)' }} />
        <div style={{ position: 'absolute', left: 'clamp(18px,3vw,36px)', right: 'clamp(18px,3vw,36px)', bottom: 'clamp(18px,3vw,30px)', color: '#FFFFFF' }}>
          <span style={{
            background: '#FFFC33', color: '#340057', fontFamily: "'Chivo Mono',monospace", fontSize: 10.5,
            fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '7px 13px',
            display: 'inline-block', transform: 'rotate(-4deg)',
          }}>{r.badge}</span>
          <div style={{ transform: 'rotate(-4deg)', transformOrigin: 'left bottom', marginTop: 16 }}>
            <h1 style={{
              fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
              fontSize: 'clamp(36px,5.6vw,76px)', lineHeight: 0.82, letterSpacing: '-0.01em',
              margin: 0, textTransform: 'uppercase',
            }}>{r.name}</h1>
          </div>
          <div style={{ fontSize: 'clamp(14px,1.6vw,17px)', opacity: 0.92, marginTop: 14 }}>{r.tag}</div>
        </div>
      </div>

      {/* About + facts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'clamp(24px,4vw,48px)', marginTop: 'clamp(24px,4vw,40px)', alignItems: 'start' }}>
        <div>
          <p style={{ fontSize: 'clamp(16px,1.8vw,18.5px)', lineHeight: 1.65, color: 'rgba(52,0,87,.82)', margin: 0 }}>{r.about}</p>
          <div style={{ marginTop: 18, background: '#FFFFE2', borderRadius: 14, padding: '14px 18px', fontSize: 14, color: '#340057', fontWeight: 600 }}>{r.detail}</div>
        </div>
        <div style={{ background: '#340057', color: '#FFFFFF', borderRadius: 20, padding: '0 0 26px', overflow: 'hidden' }}>
          <StripesSm />
          <div style={{ padding: '22px 26px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontFamily: "'Chivo Mono',monospace" }}>
              <Fact label="CUISINE" value={r.cuisine} />
              <Fact label="HOURS" value={r.hours} />
              <Fact label="PRICES" value={r.price} />
              <Fact label="SETTING" value={r.setting} />
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,.2)', margin: '20px 0' }} />
            <a
              href="https://api.whatsapp.com/send/?phone=23052928841" target="_blank" rel="noopener"
              style={{
                display: 'block', textAlign: 'center', background: '#FF3358', color: '#FFFFFF',
                fontSize: 15, fontWeight: 700, padding: '15px 0', borderRadius: 999,
                boxShadow: '0 8px 20px rgba(255,51,88,.35)',
              }}
            >Reserve on WhatsApp →</a>
            <a
              href="tel:+2306604477"
              style={{
                display: 'block', textAlign: 'center', border: '1.5px solid rgba(255,255,255,.5)',
                color: '#FFFFFF', fontSize: 14, fontWeight: 700, padding: '13px 0', borderRadius: 999, marginTop: 10,
              }}
            >Call +230 660 44 77</a>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10, opacity: 0.6, textAlign: 'center', marginTop: 12 }}>WALK-INS WELCOME · GROUPS SHOULD RESERVE</div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div style={{ marginTop: 'clamp(40px,6vw,64px)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 14 }}>
          <h2 style={{
            fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
            fontSize: 'clamp(26px,3.4vw,42px)', letterSpacing: '-0.01em', margin: 0,
            textTransform: 'uppercase', transform: 'rotate(-2deg)', transformOrigin: 'left bottom',
          }}>Inside the restaurant</h2>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>PHOTOS</span>
        </div>
        <div id="vgal" className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '18px 2px 14px', scrollbarWidth: 'none' }}>
          {rGallery.map((g) => (
            <Img key={g.src} src={g.src} alt={g.alt} style={{ height: 'clamp(170px,24vw,250px)', borderRadius: 14, flex: '0 0 auto', objectFit: 'cover', aspectRatio: '3 / 2', width: 'auto' }} />
          ))}
        </div>
      </div>

      {/* Menu & prices */}
      <div style={{ marginTop: 'clamp(32px,5vw,52px)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 14, marginBottom: 18 }}>
          <h2 style={{
            fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
            fontSize: 'clamp(26px,3.4vw,42px)', letterSpacing: '-0.01em', margin: 0,
            textTransform: 'uppercase', transform: 'rotate(-2deg)', transformOrigin: 'left bottom',
          }}>Menu &amp; prices</h2>
          {rMenuPdf !== '' && (
            <a href={rMenuPdf} target="_blank" style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.12em' }}>FULL MENU (PDF) ↗</a>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(295px,1fr))', gap: 14, alignItems: 'start' }}>
          {rMenuGroups.map((mg) => (
            <div key={mg.title} style={{ background: '#FFFFFF', borderRadius: 18, padding: '18px 22px 20px', boxShadow: '0 0 0 1.5px #EBE2FF' }}>
              <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF' }}>{mg.title}</div>
              {mg.items.map((mi) => (
                <div key={mi.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '9px 0', borderBottom: '1px dashed #EBE2FF' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{mi.n}</div>
                    <div style={{ fontSize: 12, color: 'rgba(52,0,87,.6)', lineHeight: 1.45 }}>{mi.note}</div>
                  </div>
                  <div style={{ fontFamily: "'Chivo Mono',monospace", fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', color: '#340057' }}>{mi.p}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, color: 'rgba(52,0,87,.55)', marginTop: 14 }}>PRICES IN MAURITIAN RUPEES, VAT INCLUSIVE · MENUS EVOLVE WITH THE SEASON</div>
      </div>

      {/* Also in the valley */}
      <div style={{ marginTop: 'clamp(40px,6vw,64px)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 14, marginBottom: 18 }}>
          <h2 style={{
            fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
            fontSize: 'clamp(26px,3.4vw,42px)', letterSpacing: '-0.01em', margin: 0,
            textTransform: 'uppercase', transform: 'rotate(-2deg)', transformOrigin: 'left bottom',
          }}>Also in the valley</h2>
        </div>
        <div
          onClick={() => goto.resto(otherId)}
          {...otherBind}
          style={{
            cursor: 'pointer', display: 'flex', flexWrap: 'wrap', background: '#FFFFFF',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: otherH ? '0 18px 36px -16px rgba(52,0,87,.4)' : '0 0 0 1.5px #EBE2FF',
            transition: 'transform .25s ease, box-shadow .25s ease',
            transform: otherH ? 'translateY(-4px)' : undefined,
          }}
        >
          <div style={{ flex: 1, minWidth: 260, minHeight: 200, background: '#EBE2FF' }}>
            <Img src={other.img} alt={other.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1.6, minWidth: 260, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 26, textTransform: 'uppercase' }}>{other.name}</div>
            <div style={{ fontSize: 14.5, color: 'rgba(52,0,87,.7)', marginTop: 6, lineHeight: 1.5 }}>{other.tag}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#7333FF', marginTop: 12 }}>Visit →</div>
          </div>
        </div>
      </div>
    </main>
  );
}
