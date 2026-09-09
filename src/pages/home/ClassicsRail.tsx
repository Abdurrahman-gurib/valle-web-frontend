import { useEffect, useRef } from 'react';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { useCardModel, type CardModel } from '../../lib/card';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';

const RAIL_IDS = ['zipline', 'quad', 'coloured', 'nepalese', 'waterfalls', 'luge', 'animals', 'bicycle'];

function RailCard({ a, rateTag }: { a: CardModel; rateTag: string }) {
  const [h, bind] = useHover();
  const [hTick, bindTick] = useHover();
  return (
    <div
      {...bind}
      onClick={() => a.open()}
      style={{
        cursor: 'pointer', flex: '0 0 auto', width: 'min(330px,80vw)', scrollSnapAlign: 'start', background: '#FFFFFF',
        borderRadius: 16, overflow: 'hidden', boxShadow: '0 0 0 1.5px #EBE2FF', transition: 'transform .25s ease, box-shadow .25s ease',
        ...(h ? { transform: 'translateY(-6px)', boxShadow: '0 26px 50px -20px rgba(52,0,87,.4)' } : undefined),
      }}
    >
      <div style={{ position: 'relative', height: 225, background: '#EBE2FF' }}>
        <Img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{ position: 'absolute', top: 12, left: 12, background: a.catColor, color: a.catFg, fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '6px 11px', transform: 'rotate(-4deg)' }}>{a.catBadge}</span>
        <span style={{ position: 'absolute', bottom: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFC33', color: '#340057', fontFamily: "'Chivo Mono',monospace", fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: '7px 10px', boxShadow: '0 6px 16px -6px rgba(0,0,0,.5)' }}>
          {a.priceLabel}
          <span style={{ background: '#340057', color: '#FFFC33', borderRadius: 4, padding: '2px 5px', fontSize: 9, letterSpacing: '.06em' }}>{rateTag}</span>
        </span>
        {a.hasAdd && (
          <button
            {...bindTick}
            onClick={(e) => a.add(e)}
            title={a.addLabel}
            style={{
              position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 999, border: '2px solid #FFFFFF',
              background: a.selOn ? '#33FF74' : 'rgba(52,0,87,.5)', color: a.selOn ? '#340057' : '#FFFFFF',
              fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,.3)', padding: 0, lineHeight: 1,
              ...(hTick ? { transform: 'scale(1.15)' } : undefined),
            }}
          >
            {a.selOn ? '✓' : '+'}
          </button>
        )}
      </div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 21, textTransform: 'uppercase' }}>{a.name}</div>
          <div title="Pulse level" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: a.pulseColor, whiteSpace: 'nowrap' }}>{a.pulseStr}</div>
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(52,0,87,.68)', lineHeight: 1.5, marginTop: 6, minHeight: 40 }}>{a.blurb}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: '1px dashed #D9C9F0', paddingTop: 12 }}>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, color: 'rgba(52,0,87,.6)' }}>{a.dur} · {a.age}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7333FF' }}>Details →</span>
        </div>
      </div>
    </div>
  );
}

function ArrowBtn({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      aria-label={label}
      style={{
        border: '2px solid #340057', background: h ? '#340057' : 'transparent', cursor: 'pointer',
        color: h ? '#FFFFFF' : '#340057', width: 46, height: 46, borderRadius: 999, fontSize: 17,
      }}
    >
      {children}
    </button>
  );
}

/** "Go big. Go wild.": auto-advancing horizontal rail of the park classics. */
export function ClassicsRail() {
  const { ACTS } = useCatalog();
  const { rateTag } = useApp();
  const card = useCardModel();
  const railRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  const items = RAIL_IDS
    .map((id) => ACTS.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => card(a));

  useEffect(() => {
    const r = railRef.current;
    if (!r) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };
    r.addEventListener('pointerenter', pause);
    r.addEventListener('pointerleave', resume);
    r.addEventListener('touchstart', pause, { passive: true });
    r.addEventListener('touchend', resume, { passive: true });
    const t = setInterval(() => {
      if (pausedRef.current) return;
      if (r.scrollLeft + r.clientWidth >= r.scrollWidth - 24) r.scrollTo({ left: 0, behavior: 'smooth' });
      else r.scrollBy({ left: 348, behavior: 'smooth' });
    }, 3500);
    return () => {
      clearInterval(t);
      r.removeEventListener('pointerenter', pause);
      r.removeEventListener('pointerleave', resume);
      r.removeEventListener('touchstart', pause);
      r.removeEventListener('touchend', resume);
    };
  }, []);

  return (
    <section style={{ padding: 'clamp(56px,8vw,104px) 0 0' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,3.5vw,40px)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 28, marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.6vw,64px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>
          Go big. <span style={{ color: '#FF3358' }}>Go wild.</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)', marginRight: 10 }}>03 · FAVOURITES</span>
          <ArrowBtn label="Scroll back" onClick={() => railRef.current?.scrollBy({ left: -370, behavior: 'smooth' })}>←</ArrowBtn>
          <ArrowBtn label="Scroll forward" onClick={() => railRef.current?.scrollBy({ left: 370, behavior: 'smooth' })}>→</ArrowBtn>
        </div>
      </div>
      <div
        id="vrail"
        data-reveal="1"
        ref={railRef}
        className="no-scrollbar"
        style={{
          display: 'flex', gap: 18, overflowX: 'auto', scrollSnapType: 'x mandatory',
          padding: '8px clamp(16px,calc((100vw - 1320px)/2 + 40px),calc((100vw - 1320px)/2 + 40px)) 24px',
          scrollbarWidth: 'none',
        }}
      >
        {items.map((a) => <RailCard key={a.id} a={a} rateTag={rateTag} />)}
      </div>
    </section>
  );
}
