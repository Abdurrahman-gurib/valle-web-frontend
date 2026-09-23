import { useMemo, useState } from 'react';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { useGoto } from '../../lib/nav';
import { money } from '../../lib/format';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';
import { PinButton } from './ParkMap';
import type { MapPin, MapRoute } from '../../data/maps';

const MONO = "'Chivo Mono',monospace";
const HEAD = "'Barlow',sans-serif";

export interface ActivityMapProps {
  eyebrow: string;             // e.g. "03 · QUAD & BUGGY · 2 LOOPS"
  title: string;
  intro: string;
  map: { img: string; width: number; height: number };
  alt: string;
  routes: MapRoute[];
  pins: MapPin[];              // route pins (with `routes`) and landmarks (without)
  /** Zipline only: draw the selected route as a polyline through its station pins. */
  drawRoutes?: boolean;
  signature?: [string, string];
  gallery?: { src: string; cap: string }[];
  footNote: string;
  footTag: string;
  hint: string;
}

interface Fact { k: string; v: string }

interface Popup {
  name: string;
  sub: string;
  img: string;
  badge: string;
  badgeColor: string;
  badgeFg: string;
  facts: Fact[];
  btnLabel: string;
  btnClick: () => void;
}

/** "from" price for a route, following the visitor's resident / non-resident choice. */
function usePriceFrom() {
  const catalog = useCatalog();
  const app = useApp();
  const rk = app.rate === 'nr' ? 'nr' : 'rr';
  return (cat: string, prefix: string): string | null => {
    const row = (catalog.PL[cat] || []).find((r) => r.n.toLowerCase().startsWith(prefix.toLowerCase()));
    if (!row) return null;
    return money(row[rk]) + (app.rate ? '' : ' (RR)');
  };
}

function RouteTab({ r, on, onClick }: { r: MapRoute; on: boolean; onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        flexShrink: 0, border: '1.5px solid ' + (on ? r.color : 'rgba(255,255,255,.28)'), cursor: 'pointer',
        background: on ? r.color : (h ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)'),
        color: on ? r.fg : '#FFFFFF', borderRadius: 999, padding: '9px 14px 9px 10px', display: 'flex', alignItems: 'center', gap: 9,
        fontFamily: 'inherit', textAlign: 'left', transition: 'all .18s ease',
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 999, background: r.color, border: '2px solid ' + (on ? r.fg : '#FFFFFF'), flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 13.5, textTransform: 'uppercase' }}>{r.name}</span>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.08em', opacity: 0.8, marginTop: 3 }}>{r.tag}</span>
      </span>
    </button>
  );
}

function MapPopup({ p, left, top, transform, onClose }: { p: Popup; left: string; top: string; transform: string; onClose: () => void }) {
  const [hBtn, bindBtn] = useHover();
  const [hX, bindX] = useHover();
  return (
    <div style={{ position: 'absolute', left, top, transform, pointerEvents: 'none', zIndex: 6, width: 'min(360px,94%)' }}>
      <div style={{ pointerEvents: 'auto', position: 'relative', display: 'flex', width: '100%', background: '#FFFFFF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 18px 44px -10px rgba(31,0,51,.65)', animation: 'vfadeup .22s ease both' }}>
        <div style={{ width: 104, flexShrink: 0, background: '#EBE2FF' }}>
          <Img src={p.img} alt={p.name} priority style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '11px 13px 12px' }}>
          <span style={{ background: p.badgeColor, color: p.badgeFg, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '.08em', borderRadius: 999, padding: '4px 8px', display: 'inline-block', transform: 'rotate(-3deg)', border: p.badgeColor === '#FFFFFF' ? '1px solid #EBE2FF' : 0 }}>{p.badge}</span>
          <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 14.5, textTransform: 'uppercase', marginTop: 6, lineHeight: 1, color: '#340057' }}>{p.name}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(52,0,87,.7)', lineHeight: 1.45, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.sub}</div>
          {p.facts.length > 0 && (
            <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: '3px 10px', fontFamily: MONO, fontSize: 9.5, color: '#340057' }}>
              {p.facts.map((f) => (
                <span key={f.k}><span style={{ opacity: 0.55 }}>{f.k} </span><b>{f.v}</b></span>
              ))}
            </div>
          )}
          <button
            {...bindBtn}
            onClick={p.btnClick}
            style={{ marginTop: 8, border: 0, background: hBtn ? '#7333FF' : '#340057', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, color: '#FFFFFF', padding: '8px 15px', borderRadius: 999 }}
          >
            {p.btnLabel}
          </button>
        </div>
        <button
          {...bindX}
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 8, right: 8, border: '1px solid ' + (hX ? '#FF3358' : '#EBE2FF'), background: '#FFFFFF',
            color: hX ? '#FF3358' : 'rgba(52,0,87,.6)', width: 24, height: 24, borderRadius: 999, cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function GalleryShot({ src, cap, onClick }: { src: string; cap: string; onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button {...bind} onClick={onClick} style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer', position: 'relative', flexShrink: 0, width: 168, height: 118, borderRadius: 12, overflow: 'hidden', scrollSnapAlign: 'start' }}>
      <Img src={src} alt={cap} surface="dark" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: h ? 'scale(1.06)' : 'scale(1)', transition: 'transform .35s ease' }} />
      <span style={{ position: 'absolute', left: 8, right: 8, bottom: 7, fontFamily: MONO, fontSize: 8.5, letterSpacing: '.08em', color: '#FFFFFF', textShadow: '0 1px 4px rgba(0,0,0,.7)', textAlign: 'left', textTransform: 'uppercase' }}>{cap}</span>
    </button>
  );
}

function Lightbox({ shots, idx, onClose, onStep }: { shots: { src: string; cap: string }[]; idx: number; onClose: () => void; onStep: (d: number) => void }) {
  const s = shots[idx];
  const nav = (label: string, d: number, side: 'left' | 'right') => (
    <button onClick={(e) => { e.stopPropagation(); onStep(d); }} aria-label={label} style={{ position: 'absolute', top: '50%', [side]: 14, transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: 999, border: '1px solid rgba(255,255,255,.35)', background: 'rgba(31,0,51,.6)', color: '#FFFFFF', fontSize: 20, cursor: 'pointer' }}>{d < 0 ? '‹' : '›'}</button>
  );
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(31,0,51,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(12px,4vw,48px)', animation: 'vfadeup .2s ease both' }}>
      <div style={{ position: 'relative', maxWidth: 1100, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <Img src={s.src} alt={s.cap} priority surface="dark" style={{ width: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: 14, display: 'block' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 10, fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', color: 'rgba(255,255,255,.8)', textTransform: 'uppercase' }}>
          <span>{s.cap}</span><span>{idx + 1} / {shots.length}</span>
        </div>
        {nav('Previous photo', -1, 'left')}
        {nav('Next photo', 1, 'right')}
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: -8, right: -8, width: 34, height: 34, borderRadius: 999, border: 0, background: '#FFFC33', color: '#340057', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>×</button>
      </div>
    </div>
  );
}

/**
 * Interactive activity map (Quad & Buggy, Ziplines): the official route map with
 * a route selector, tappable numbered pins (photo + restrictions + price) and a
 * photo strip. Same look and feel as the walking-trail sitemap above it.
 */
export function ActivityMap({ eyebrow, title, intro, map, alt, routes, pins, drawRoutes, signature, gallery, footNote, footTag, hint }: ActivityMapProps) {
  const goto = useGoto();
  const isMobile = useIsMobile();
  const priceFrom = usePriceFrom();
  const [routeId, setRouteId] = useState(routes[0].id);
  const [sel, setSel] = useState<string>('');     // selected pin code
  const [shot, setShot] = useState(-1);

  const route = routes.find((r) => r.id === routeId) || routes[0];

  // Pins visible for this route: landmarks always, route pins only when they belong to it.
  const visible = useMemo(() => {
    const onRoute = (p: MapPin) => {
      if (!p.routes) return true;
      if (route.stations) return route.stations.includes(p.n);
      return p.routes.includes(route.id);
    };
    return pins.filter(onRoute);
  }, [pins, route]);

  const byCode = useMemo(() => Object.fromEntries(pins.map((p) => [p.n, p])), [pins]);
  const stationIndex = (code: string) => (route.stations ? route.stations.indexOf(code) : -1);

  const selectRoute = (id: string) => { setRouteId(id); setSel(''); };

  const pp = sel ? byCode[sel] : null;
  let popup: Popup | null = null;
  if (pp && visible.includes(pp)) {
    const si = stationIndex(pp.n);
    const isRoutePin = !!pp.routes;
    const nav = () => {
      if (pp.go === 'chamouze') goto.resto('chamouze');
      else if (pp.go === 'plan') goto.plan();
      else goto.detail(pp.goArg || 'zipline');
    };
    let badge = 'LANDMARK';
    if (isRoutePin) {
      if (si >= 0) {
        const total = (route.stations as string[]).length - 1;
        badge = si === 0 ? `${route.name.toUpperCase()} · START` : si === total ? `${route.name.toUpperCase()} · FINISH` : `${route.name.toUpperCase()} · LINE ${si} OF ${total}`;
      } else badge = route.name.toUpperCase();
    }
    const facts: Fact[] = [];
    if (isRoutePin) {
      const pr = priceFrom(route.priceCat, route.priceRow);
      if (pr) facts.push({ k: 'FROM', v: pr });
      if (route.priceCat2 && route.priceRow2) {
        const pr2 = priceFrom(route.priceCat2, route.priceRow2);
        if (pr2) facts.push({ k: route.priceLabel2 || 'ALSO', v: pr2 });
      }
      facts.push(...route.facts.filter((f) => f.k !== 'NOTE'));
    }
    popup = {
      name: pp.name, sub: pp.sub, img: pp.img,
      badge, badgeColor: isRoutePin ? route.color : '#EBE2FF', badgeFg: isRoutePin ? route.fg : '#340057',
      facts,
      btnLabel: (pp.btnLabel || 'View details') + ' →',
      btnClick: nav,
    };
  }
  const popLeft = pp ? (isMobile ? 50 : Math.min(72, Math.max(28, pp.px))) + '%' : '0%';
  const popTop = pp ? (isMobile ? '8px' : pp.py + '%') : '0%';
  const popTransform = pp ? (isMobile ? 'translateX(-50%)' : (pp.py < 36 ? 'translate(-50%, 22px)' : 'translate(-50%, calc(-100% - 22px))')) : 'none';

  // Route polyline (zipline) in image-percentage space.
  const pts = drawRoutes && route.stations ? route.stations.map((c) => byCode[c]).filter(Boolean) : [];
  const sigPts = drawRoutes && signature && route.signature ? [byCode[signature[0]], byCode[signature[1]]] : null;
  const priceMain = priceFrom(route.priceCat, route.priceRow);
  const price2 = route.priceCat2 && route.priceRow2 ? priceFrom(route.priceCat2, route.priceRow2) : null;

  return (
    <section style={{ background: '#260040', padding: 'clamp(40px,6vw,80px) 0 clamp(48px,7vw,88px)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '-2%', right: '-2%', height: 10, background: 'repeating-linear-gradient(-45deg,#FFFC33 0 14px,#340057 14px 28px)', transform: 'rotate(.6deg)' }} />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,3.5vw,40px)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid rgba(255,255,255,.25)', paddingBottom: 28 }}>
          <h2 style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.6vw,64px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, color: '#FFFFFF', textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{title}</h2>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(255,255,255,.6)' }}>{eyebrow}</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 15.5, lineHeight: 1.55, maxWidth: '60ch', margin: '18px 0 0' }}>{intro}</p>

        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '22px 0 6px', scrollbarWidth: 'none' }}>
          {routes.map((r) => <RouteTab key={r.id} r={r} on={r.id === route.id} onClick={() => selectRoute(r.id)} />)}
        </div>

        <div data-reveal="1" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 300px', gap: 18, alignItems: 'start' }}>
          <div style={{ position: 'relative', background: '#2E0A4E', border: '1px solid rgba(255,255,255,.16)', borderRadius: 22, padding: 'clamp(10px,1.5vw,20px)', boxShadow: '0 40px 90px -40px rgba(0,0,0,.55)' }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
              <div style={{ position: 'relative' }}>
                <Img
                  src={map.img}
                  alt={alt}
                  surface="dark"
                  placeholder="#2E0A4E"
                  width={map.width}
                  height={map.height}
                  style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: `${map.width} / ${map.height}`, objectFit: 'contain' }}
                />
                {drawRoutes && (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <defs>
                      <filter id="amglow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="0.6" />
                      </filter>
                    </defs>
                    {pts.length > 1 && (
                      <>
                        <polyline points={pts.map((p) => `${p.px},${p.py}`).join(' ')} fill="none" stroke={route.color} strokeWidth={isMobile ? 1.4 : 0.9} strokeOpacity={0.55} filter="url(#amglow)" vectorEffect="non-scaling-stroke" style={{ strokeWidth: isMobile ? 9 : 11 }} />
                        <polyline points={pts.map((p) => `${p.px},${p.py}`).join(' ')} fill="none" stroke={route.color} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: isMobile ? 2.5 : 3.5 }} />
                      </>
                    )}
                    {sigPts && sigPts[0] && sigPts[1] && (
                      <>
                        <line x1={sigPts[0].px} y1={sigPts[0].py} x2={sigPts[1].px} y2={sigPts[1].py} stroke="#FFFFFF" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />
                        <text x={(sigPts[0].px + sigPts[1].px) / 2} y={(sigPts[0].py + sigPts[1].py) / 2 - 2.2} textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: MONO, fontSize: isMobile ? 3.2 : 2.3, fontWeight: 700, letterSpacing: '.08em', paintOrder: 'stroke', stroke: '#260040', strokeWidth: 0.8 }} transform={`rotate(${Math.atan2(sigPts[1].py - sigPts[0].py, sigPts[1].px - sigPts[0].px) * 180 / Math.PI} ${(sigPts[0].px + sigPts[1].px) / 2} ${(sigPts[0].py + sigPts[1].py) / 2})`}>THE SIGNATURE · 1.5 KM</text>
                      </>
                    )}
                  </svg>
                )}
                {visible.map((p) => {
                  const si = stationIndex(p.n);
                  const label = si >= 0 ? String(si + 1) : p.n;
                  const pin = { ...p, n: label, sub: p.sub as string | null, act: null } as unknown as Parameters<typeof PinButton>[0]['p'];
                  return (
                    <PinButton
                      key={route.id + ':' + p.n}
                      p={pin}
                      i={0}
                      on={sel === p.n}
                      isMobile={isMobile}
                      onClick={() => setSel((cur) => (cur === p.n ? '' : p.n))}
                    />
                  );
                })}
              </div>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(115deg, rgba(255,255,255,.1), rgba(255,255,255,0) 46%)', mixBlendMode: 'screen' }} />
              {popup && <MapPopup p={popup} left={popLeft} top={popTop} transform={popTransform} onClose={() => setSel('')} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '14px 8px 2px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.08em', color: 'rgba(255,255,255,.7)' }}>
              <span>{hint}</span>
              <span style={{ display: 'flex', gap: 14 }}>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 999, background: '#FF3358', border: '1.5px solid #FFF', marginRight: 5, verticalAlign: -1 }} />ROUTE STOP</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 999, background: '#33FF74', border: '1.5px solid #FFF', marginRight: 5, verticalAlign: -1 }} />LANDMARK</span>
              </span>
            </div>
          </div>

          {/* Route card */}
          <aside style={{ background: '#FFFFFF', borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 60px -30px rgba(0,0,0,.6)', animation: 'vfadeup .25s ease both' }} key={route.id}>
            <div style={{ position: 'relative', height: 150, background: '#EBE2FF' }}>
              <Img src={route.img} alt={route.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', left: 12, top: 12, background: route.color, color: route.fg, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '5px 10px', transform: 'rotate(-3deg)', border: route.color === '#FFFFFF' ? '1px solid #EBE2FF' : 0 }}>{route.tag}</span>
            </div>
            <div style={{ padding: '14px 16px 16px', color: '#340057' }}>
              <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', lineHeight: 0.95 }}>{route.name}</div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(52,0,87,.75)', margin: '8px 0 0' }}>{route.blurb}</p>
              <div style={{ marginTop: 12, borderTop: '1px dashed #EBE2FF', paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr', gap: 5, fontFamily: MONO, fontSize: 10.5 }}>
                {priceMain && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ opacity: 0.6 }}>FROM</span><b>{priceMain}</b></div>}
                {price2 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ opacity: 0.6 }}>{route.priceLabel2 || 'ALSO'}</span><b>{price2}</b></div>}
                {route.facts.map((f) => (
                  <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, textAlign: 'right' }}><span style={{ opacity: 0.6, textAlign: 'left', flexShrink: 0 }}>{f.k}</span><span style={{ fontWeight: f.k === 'NOTE' ? 400 : 700, fontSize: f.k === 'NOTE' ? 9.5 : 10.5 }}>{f.v}</span></div>
                ))}
              </div>
              <RouteCta label={(route.priceCat === 'zipline' ? 'Book this zipline' : 'Book this ride') + ' →'} onClick={() => goto.detail(route.priceCat)} />
            </div>
          </aside>
        </div>

        {gallery && gallery.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 0 10px', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
              {gallery.map((g, i) => <GalleryShot key={g.src} src={g.src} cap={g.cap} onClick={() => setShot(i)} />)}
            </div>
          </div>
        )}

        <div style={{ border: '1.5px dashed rgba(255,255,255,.35)', borderRadius: 16, padding: '16px 22px', color: 'rgba(255,255,255,.8)', marginTop: 10, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, flex: 1, minWidth: 260 }}>{footNote}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, opacity: 0.8 }}>{footTag}</div>
        </div>
      </div>
      {gallery && shot >= 0 && (
        <Lightbox shots={gallery} idx={shot} onClose={() => setShot(-1)} onStep={(d) => setShot((s) => (s + d + gallery.length) % gallery.length)} />
      )}
    </section>
  );
}

function RouteCta({ label, onClick }: { label: string; onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button {...bind} onClick={onClick} style={{ marginTop: 12, width: '100%', border: 0, background: h ? '#7333FF' : '#340057', color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, padding: '11px 16px', borderRadius: 999 }}>{label}</button>
  );
}
