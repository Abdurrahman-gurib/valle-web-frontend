import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { useGoto } from '../../lib/nav';
import { money } from '../../lib/format';
import { PULSE_NAMES } from '../../lib/card';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';
import { Stripes } from '../../components/Stripes';
import { PinButton } from './ParkMap';
import type { MapLine, MapPin, MapRoute } from '../../data/maps';
import type { TrailEdge } from '../../data/quadTrails';
import type { MapGallery, MapShot } from '../../data/mapGalleries';

const MONO = "'Chivo Mono',monospace";
const HEAD = "'Barlow',sans-serif";

/** Frosted panel over the map (Vallé purple glass). */
const GLASS: CSSProperties = {
  background: 'linear-gradient(155deg, rgba(52,0,87,.58), rgba(31,0,51,.74))',
  backdropFilter: 'blur(18px) saturate(1.45)',
  WebkitBackdropFilter: 'blur(18px) saturate(1.45)',
  border: '1px solid rgba(255,255,255,.22)',
  boxShadow: '0 30px 60px -24px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.28)',
  color: '#FFFFFF',
};

export interface ActivityMapProps {
  eyebrow: string;             // e.g. "03 · QUAD & BUGGY · 2 LOOPS"
  title: string;
  intro: string;
  /** `dimImg`: the map with every trail dimmed, used as the base when trails are traced on top. */
  map: { img: string; width: number; height: number; dimImg?: string };
  /** Quad: trail centrelines per route id, traced outward from the base when that route is picked. */
  trails?: Record<string, TrailEdge[]>;
  /** Route selected on first render (defaults to the first). */
  defaultRoute?: string;
  alt: string;
  routes: MapRoute[];
  pins: MapPin[];              // route pins (with `routes`) and landmarks (without)
  /** Zipline only: draw the selected route through its station pins. */
  drawRoutes?: boolean;
  /** Zipline only: the real cables (station pairs). Consecutive route stations not in this list are walks. */
  lines?: [string, string][];
  signature?: [string, string];
  /** Always-visible extra lines in their own colour (bicycle zipline, Nepalese bridge). */
  extraLines?: MapLine[];
  gallery?: MapGallery;
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

/** One bookable option of a route: the experience id plus the exact price-list row. */
interface Bookable { id: string; variant: string; price: string; label: string }

/** Resolves a route's price-list rows (by label prefix) into bookable options at the visitor's rate. */
function useBookables() {
  const catalog = useCatalog();
  const app = useApp();
  const rk = app.rate === 'nr' ? 'nr' : 'rr';
  const find = (cat: string, prefix: string, label: string): Bookable | null => {
    const row = (catalog.PL[cat] || []).find((r) => r.n.toLowerCase().startsWith(prefix.toLowerCase()));
    if (!row) return null;
    return { id: cat, variant: row.n, price: money(row[rk]) + (app.rate ? '' : ' (RR)'), label };
  };
  return (r: MapRoute): Bookable[] => {
    const out: Bookable[] = [];
    const a = find(r.priceCat, r.priceRow, r.priceCat === 'zipline' ? 'ZIPLINE' : r.priceCat.toUpperCase());
    if (a) out.push(a);
    if (r.priceCat2 && r.priceRow2) {
      const b = find(r.priceCat2, r.priceRow2, r.priceLabel2 || r.priceCat2.toUpperCase());
      if (b) out.push(b);
    }
    return out;
  };
}

function Pulse({ n, color = '#FFFC33', size = 13 }: { n: number; color?: string; size?: number }) {
  return (
    <span style={{ fontSize: size, letterSpacing: '.18em', color, fontWeight: 700 }} title={PULSE_NAMES[n] + ' pulse'}>
      {'●'.repeat(n)}<span style={{ opacity: 0.35 }}>{'○'.repeat(5 - n)}</span>
    </span>
  );
}

function RouteTab({ r, on, onClick }: { r: MapRoute; on: boolean; onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        flexShrink: 0, cursor: 'pointer', borderRadius: 999, padding: '9px 16px 9px 11px', display: 'flex', alignItems: 'center', gap: 9,
        fontFamily: 'inherit', textAlign: 'left', transition: 'all .2s ease',
        border: '1px solid ' + (on ? r.color : (h ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.22)')),
        background: on ? r.color : (h ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.07)'),
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        color: on ? r.fg : '#FFFFFF',
        boxShadow: on ? `0 10px 26px -10px ${r.color}` : 'inset 0 1px 0 rgba(255,255,255,.12)',
        transform: h && !on ? 'translateY(-1px)' : 'none',
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 999, background: r.color, border: '2px solid ' + (on ? r.fg : '#FFFFFF'), flexShrink: 0, boxShadow: on ? 'none' : `0 0 10px ${r.color}` }} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 13.5, textTransform: 'uppercase' }}>{r.name}</span>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.08em', opacity: 0.8, marginTop: 3 }}>{r.tag}</span>
      </span>
    </button>
  );
}

function GlassBtn({ label, onClick, primary, on, small, style }: { label: string; onClick: () => void; primary?: boolean; on?: boolean; small?: boolean; style?: CSSProperties }) {
  const [h, bind] = useHover();
  const bg = primary
    ? (h ? '#D91E44' : '#FF3358')
    : on ? '#33FF74' : (h ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.12)');
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        border: primary || on ? 0 : '1px solid rgba(255,255,255,.3)', background: bg, cursor: 'pointer', fontFamily: 'inherit',
        color: on ? '#340057' : '#FFFFFF', fontSize: small ? 11 : 12.5, fontWeight: 700, padding: small ? '8px 12px' : '11px 16px', borderRadius: 999,
        transition: 'all .18s ease', boxShadow: primary ? '0 10px 24px -8px rgba(255,51,88,.6)' : 'none', whiteSpace: 'nowrap',
        ...style,
      }}
    >{label}</button>
  );
}

function MapPopup({ p, left, top, transform, onClose }: { p: Popup; left: string; top: string; transform: string; onClose: () => void }) {
  const [hX, bindX] = useHover();
  return (
    <div style={{ position: 'absolute', left, top, transform, pointerEvents: 'none', zIndex: 7, width: 'min(360px,94%)' }}>
      <div style={{ ...GLASS, pointerEvents: 'auto', position: 'relative', display: 'flex', width: '100%', borderRadius: 16, overflow: 'hidden', animation: 'vfadeup .22s ease both' }}>
        <div style={{ width: 108, flexShrink: 0, background: 'rgba(255,255,255,.08)' }}>
          <Img src={p.img} alt={p.name} priority surface="dark" placeholder="transparent" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '12px 14px 13px' }}>
          <span style={{ background: p.badgeColor, color: p.badgeFg, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '.08em', borderRadius: 999, padding: '4px 8px', display: 'inline-block', transform: 'rotate(-3deg)' }}>{p.badge}</span>
          <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 15, textTransform: 'uppercase', marginTop: 7, lineHeight: 1 }}>{p.name}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.78)', lineHeight: 1.45, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.sub}</div>
          {p.facts.length > 0 && (
            <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: '3px 10px', fontFamily: MONO, fontSize: 9.5 }}>
              {p.facts.map((f) => (
                <span key={f.k}><span style={{ opacity: 0.6 }}>{f.k} </span><b style={{ color: '#FFFC33' }}>{f.v}</b></span>
              ))}
            </div>
          )}
          <GlassBtn small label={p.btnLabel} onClick={p.btnClick} style={{ marginTop: 9 }} />
        </div>
        <button
          {...bindX}
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 8, right: 8, border: '1px solid rgba(255,255,255,.3)', background: hX ? '#FF3358' : 'rgba(255,255,255,.12)',
            color: '#FFFFFF', width: 24, height: 24, borderRadius: 999, cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** The chosen route: photo, copy, price, limits and the booking controls. Floats over the map on desktop. */
function RouteCard({ route, options, overlay }: { route: MapRoute; options: Bookable[]; overlay: boolean }) {
  const app = useApp();
  const goto = useGoto();
  const [hImg, bindImg] = useHover();
  const added = options.map((o) => app.isSelected(o.id, o.variant));
  const anyAdded = added.some(Boolean);
  const bookNow = () => {
    if (!anyAdded && options[0]) app.toggleSel(options[0].id, options[0].variant);
    goto.booking();
  };
  return (
    <aside
      key={route.id}
      style={{
        ...GLASS, borderRadius: 20, overflow: 'hidden', animation: 'vfadeup .3s ease both',
        ...(overlay ? { position: 'absolute', right: 18, bottom: 18, width: 312, zIndex: 6 } : { marginTop: 14 }),
      }}
    >
      <div {...bindImg} style={{ position: 'relative', height: overlay ? 132 : 170, overflow: 'hidden' }}>
        <Img src={route.img} alt={route.name} priority surface="dark" placeholder="transparent" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hImg ? 'scale(1.05)' : 'scale(1)', transition: 'transform .6s ease' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.85), rgba(31,0,51,0) 60%)' }} />
        <span style={{ position: 'absolute', left: 12, top: 12, background: route.color, color: route.fg, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '5px 10px', transform: 'rotate(-3deg)' }}>{route.tag}</span>
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 10, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 900, fontSize: 23, textTransform: 'uppercase', lineHeight: 0.95, textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>{route.name}</div>
      </div>
      <div style={{ padding: '12px 15px 15px' }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,.8)', margin: 0, display: '-webkit-box', WebkitLineClamp: overlay ? 3 : 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{route.blurb}</p>
        <div style={{ marginTop: 10, borderTop: '1px dashed rgba(255,255,255,.25)', paddingTop: 9, display: 'grid', gap: 4, fontFamily: MONO, fontSize: 10.5 }}>
          {options.map((o) => (
            <div key={o.variant} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ opacity: 0.65 }}>{options.length > 1 ? o.label : 'FROM'}</span><b style={{ color: '#FFFC33' }}>{o.price}</b></div>
          ))}
          {route.facts.filter((f) => f.k !== 'NOTE').map((f) => (
            <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, textAlign: 'right' }}><span style={{ opacity: 0.65, textAlign: 'left', flexShrink: 0 }}>{f.k}</span><b>{f.v}</b></div>
          ))}
          {route.facts.filter((f) => f.k === 'NOTE').map((f) => (
            <div key={f.k} style={{ fontSize: 9.5, opacity: 0.7, lineHeight: 1.4 }}>{f.v}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {options.map((o, i) => (
            <GlassBtn
              key={o.variant}
              small
              on={added[i]}
              label={added[i] ? '✓ ' + (options.length > 1 ? o.label : 'Added') : '+ ' + (options.length > 1 ? o.label : 'Add to My Day')}
              onClick={() => app.toggleSel(o.id, o.variant)}
              style={{ flex: 1, minWidth: 0 }}
            />
          ))}
          <GlassBtn primary small label={anyAdded ? 'Book →' : 'Book now →'} onClick={bookNow} style={{ flex: 1 }} />
        </div>
      </div>
    </aside>
  );
}

function GalleryTile({ s, onClick, big }: { s: MapShot; onClick: () => void; big?: boolean }) {
  const [h, bind] = useHover();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        border: '1px solid rgba(255,255,255,.14)', padding: 0, background: 'rgba(255,255,255,.04)', cursor: 'pointer', position: 'relative',
        borderRadius: 14, overflow: 'hidden', scrollSnapAlign: 'start', gridRow: big ? '1 / span 2' : undefined, gridColumn: big ? 'span 2' : undefined,
        boxShadow: h ? '0 18px 40px -18px rgba(0,0,0,.8)' : 'none', transition: 'box-shadow .3s ease',
      }}
    >
      <Img src={s.src} alt={`${s.tag}: ${s.cap}`} surface="dark" placeholder="#2E0A4E" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: h ? 'scale(1.06)' : 'scale(1)', transition: 'transform .5s ease' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.85), rgba(31,0,51,0) 55%)', opacity: h ? 1 : 0.85, transition: 'opacity .3s' }} />
      <span style={{ position: 'absolute', top: 8, right: 8, ...GLASS, borderRadius: 999, padding: '3px 8px', fontSize: 9 }}><Pulse n={s.thrill} size={9} /></span>
      <span style={{ position: 'absolute', left: 10, right: 10, bottom: 9, textAlign: 'left' }}>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.1em', color: '#FFFC33', fontWeight: 700, display: 'block' }}>{s.tag}</span>
        {big && <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 16, color: '#FFFFFF', textTransform: 'uppercase', lineHeight: 1.05, display: 'block', marginTop: 4 }}>{s.cap}</span>}
      </span>
    </button>
  );
}

/** Photo view in the Vallé template: eyebrow, tilted headline, copy, pulse level, tagged photo and thumbnails. */
function ValleLightbox({ g, idx, onClose, onStep, onPick, cta, onCta }: { g: MapGallery; idx: number; onClose: () => void; onStep: (d: number) => void; onPick: (i: number) => void; cta: string; onCta: () => void }) {
  const s = g.shots[idx];
  const isMobile = useIsMobile();
  const [hLead, bindLead] = useHover();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, onStep]);
  const navBtn = (d: number, side: 'left' | 'right') => (
    <button onClick={(e) => { e.stopPropagation(); onStep(d); }} aria-label={d < 0 ? 'Previous photo' : 'Next photo'} style={{ ...GLASS, position: 'absolute', top: '50%', [side]: 14, transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: 999, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{d < 0 ? '‹' : '›'}</button>
  );
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,0,40,.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', overflowY: 'auto', padding: 'clamp(10px,3vw,40px)', animation: 'vfade .2s ease both' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', background: '#340057', borderRadius: 26, overflow: 'hidden', boxShadow: '0 50px 120px -40px rgba(0,0,0,.9)', animation: 'vfadeup .3s ease both' }}>
        <Stripes height={12} />
        <div style={{ padding: 'clamp(18px,3vw,34px)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px' }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', color: '#33FF74' }}>{g.eyebrow}</span>
              <div style={{ transform: 'rotate(-3deg)', transformOrigin: 'left bottom', marginTop: 12 }}>
                <h2 style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.4vw,58px)', lineHeight: 0.84, margin: 0, textTransform: 'uppercase', color: '#FFFFFF' }}>
                  {g.t1}<br /><span style={{ color: '#FFFC33' }}>{g.t2}</span>
                </h2>
              </div>
            </div>
            <div style={{ flex: '1 1 300px', maxWidth: 460 }}>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: 0 }}>{g.copy}</p>
              <div style={{ ...GLASS, display: 'inline-flex', alignItems: 'center', gap: 12, borderRadius: 999, padding: '8px 16px 8px 14px', marginTop: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', opacity: 0.8 }}>THRILL WITH VALLÉ</span>
                <Pulse n={s.thrill} />
                <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 13, color: '#FFFC33', textTransform: 'uppercase' }}>{PULSE_NAMES[s.thrill]}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, position: 'relative', height: isMobile ? 'min(62vh,420px)' : 'min(58vh,560px)', borderRadius: 18, overflow: 'hidden', background: '#260040' }}>
            <Img key={s.src} src={s.src} alt={`${s.tag}: ${s.cap}`} priority surface="dark" {...bindLead} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .7s ease', transform: hLead ? 'scale(1.03)' : 'scale(1)', animation: 'vfade .35s ease both' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 20px', background: 'linear-gradient(to top,rgba(31,0,51,.88),transparent)' }}>
              <span style={{ background: '#FF3358', color: '#FFFFFF', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', borderRadius: 999, padding: '6px 11px' }}>{s.tag}</span>
              <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(17px,2vw,23px)', color: '#FFFFFF', marginTop: 9, textTransform: 'uppercase', lineHeight: 1.05 }}>{s.cap}</div>
            </div>
            <span style={{ ...GLASS, position: 'absolute', top: 12, right: 12, borderRadius: 999, padding: '6px 12px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em' }}>{idx + 1} / {g.shots.length}</span>
            {navBtn(-1, 'left')}
            {navBtn(1, 'right')}
          </div>

          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, padding: '2px 0 6px', scrollbarWidth: 'none' }}>
            {g.shots.map((t, i) => (
              <button key={t.src} onClick={() => onPick(i)} aria-label={t.tag} style={{ flexShrink: 0, width: 92, height: 62, borderRadius: 10, overflow: 'hidden', padding: 0, cursor: 'pointer', border: '2px solid ' + (i === idx ? '#FFFC33' : 'rgba(255,255,255,.12)'), opacity: i === idx ? 1 : 0.65, transition: 'all .2s', background: '#260040' }}>
                <Img src={t.src} alt="" surface="dark" placeholder="#2E0A4E" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(255,255,255,.6)' }}>{g.foot}</span>
            <GlassBtn primary label={cta} onClick={onCta} style={{ marginLeft: 'auto', padding: '14px 26px', fontSize: 14.5 }} />
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 22, right: 18, width: 38, height: 38, borderRadius: 999, border: 0, background: '#FFFC33', color: '#340057', fontWeight: 800, cursor: 'pointer', fontSize: 18, boxShadow: '0 8px 20px rgba(0,0,0,.4)' }}>×</button>
      </div>
    </div>
  );
}

/**
 * Interactive activity map (Quad & Buggy, Ziplines): the official route map at full width with
 * glass route tabs, tappable numbered pins (photo + limits + price), a floating route card that
 * books the chosen tour straight into My Day, and a photo wall in the Vallé template.
 */
export function ActivityMap({ eyebrow, title, intro, map, alt, routes, pins, drawRoutes, lines, signature, extraLines, trails, gallery, footNote, footTag, hint, defaultRoute }: ActivityMapProps) {
  const goto = useGoto();
  const app = useApp();
  const isMobile = useIsMobile();
  const bookables = useBookables();
  const [routeId, setRouteId] = useState(defaultRoute || routes[0].id);
  const [sel, setSel] = useState<string>('');     // selected pin code
  const [shot, setShot] = useState(-1);

  const route = routes.find((r) => r.id === routeId) || routes[0];
  const options = bookables(route);

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

  // Split the selected route into cable segments (flown) and walks (between platforms).
  const isCable = (a: string, b: string) => !lines || lines.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const segments = useMemo(() => {
    const st = route.stations || [];
    const out: { a: MapPin; b: MapPin; cable: boolean }[] = [];
    for (let i = 0; i + 1 < st.length; i++) {
      const a = byCode[st[i]], b = byCode[st[i + 1]];
      if (a && b) out.push({ a, b, cable: isCable(st[i], st[i + 1]) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, byCode, lines]);
  const totalLines = segments.filter((s) => s.cable).length;
  /** Number of cables flown to reach stop `i` of the route. */
  const linesBefore = (i: number) => segments.slice(0, i).filter((s) => s.cable).length;

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
        const last = (route.stations as string[]).length - 1;
        const n = linesBefore(si);
        badge = si === 0 ? `${route.name.toUpperCase()} · START` : si === last ? `${route.name.toUpperCase()} · FINISH` : `${route.name.toUpperCase()} · AFTER LINE ${n} OF ${totalLines}`;
      } else badge = route.name.toUpperCase();
    } else if (pp.facts) badge = 'SUSPENDED THRILL';
    const facts: Fact[] = [];
    if (isRoutePin) {
      if (options[0]) facts.push({ k: 'FROM', v: options[0].price });
      if (options[1]) facts.push({ k: options[1].label, v: options[1].price });
      facts.push(...route.facts.filter((f) => f.k !== 'NOTE'));
    } else {
      if (pp.priceCat && pp.priceRow) {
        const o = bookables({ ...route, priceCat: pp.priceCat, priceRow: pp.priceRow, priceCat2: undefined, priceRow2: undefined })[0];
        if (o) facts.push({ k: 'FROM', v: o.price });
      }
      if (pp.facts) facts.push(...pp.facts);
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

  // Route geometry (zipline) in image-percentage space.
  const sigPts = drawRoutes && signature && route.signature ? [byCode[signature[0]], byCode[signature[1]]] : null;
  const seg = (s: { a: MapPin; b: MapPin }) => ({ x1: s.a.px, y1: s.a.py, x2: s.b.px, y2: s.b.py });
  // Cables only, in flying order, each traced after the previous one (dash animation, see global.css).
  const cables = segments.filter((s) => s.cable);
  const TRACE = 0.55; // seconds per cable
  const traceStyle = (i: number, extra: CSSProperties = {}): CSSProperties => ({
    strokeDasharray: 1, strokeDashoffset: 1, animation: `vtrace ${TRACE}s ease-out ${i * TRACE}s forwards`, ...extra,
  });
  // Quad: trail centrelines for the chosen loop(s), traced outward from the base. A route without its
  // own trail (the 2 h Advenature Tour) traces every loop.
  const trailSets = trails ? (trails[route.id] ? [route.id] : Object.keys(trails)) : [];
  const trailReach = Math.max(1, ...trailSets.flatMap((id) => (trails as Record<string, TrailEdge[]>)[id].map((e) => e.d0 + e.len)));
  const trailSpeed = trailReach / 3.4;   // px per second: any loop finishes tracing in ~3.4 s
  const trailColor = (id: string) => routes.find((r) => r.id === id)?.color || '#FFFFFF';

  const ctaLabel = options[0] && app.isSelected(options[0].id, options[0].variant) ? `✓ ${route.name} is in My Day →` : `Add ${route.name} to my day →`;
  const onCta = () => { if (options[0] && !app.isSelected(options[0].id, options[0].variant)) app.toggleSel(options[0].id, options[0].variant); setShot(-1); app.openDay(); };

  return (
    <section style={{ background: '#260040', padding: 'clamp(40px,6vw,80px) 0 clamp(48px,7vw,88px)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '-2%', right: '-2%', height: 10, background: 'repeating-linear-gradient(-45deg,#FFFC33 0 14px,#340057 14px 28px)', transform: 'rotate(.6deg)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '40%', width: 1400, height: 1400, marginLeft: -700, borderRadius: 999, background: `radial-gradient(circle, ${route.color}22, rgba(31,0,51,0) 55%)`, pointerEvents: 'none', transition: 'background .6s ease' }} />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,3.5vw,40px)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid rgba(255,255,255,.25)', paddingBottom: 28 }}>
          <h2 style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.6vw,64px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, color: '#FFFFFF', textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>{title}</h2>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(255,255,255,.6)' }}>{eyebrow}</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 15.5, lineHeight: 1.55, maxWidth: '60ch', margin: '18px 0 0' }}>{intro}</p>

        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '22px 0 6px', scrollbarWidth: 'none', flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
          {routes.map((r) => <RouteTab key={r.id} r={r} on={r.id === route.id} onClick={() => selectRoute(r.id)} />)}
        </div>

        <div data-reveal="1" style={{ marginTop: 16 }}>
          <div style={{ position: 'relative', background: '#2E0A4E', border: '1px solid rgba(255,255,255,.16)', borderRadius: 22, padding: 'clamp(10px,1.5vw,20px)', boxShadow: '0 40px 90px -40px rgba(0,0,0,.55)' }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
              <div style={{ position: 'relative' }}>
                <Img
                  src={map.dimImg || map.img}
                  alt={alt}
                  surface="dark"
                  placeholder="#2E0A4E"
                  width={map.width}
                  height={map.height}
                  style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: `${map.width} / ${map.height}`, objectFit: 'contain' }}
                />
                {(drawRoutes || extraLines || trails) && (
                  <svg key={route.id} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <defs>
                      <filter id="amglow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="0.6" />
                      </filter>
                    </defs>
                    {extraLines?.map((l) => (
                      <g key={l.label}>
                        <line x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} stroke={l.color} strokeOpacity={0.35} filter="url(#amglow)" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 7 }} />
                        <line x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} stroke={l.color} strokeDasharray={l.dashed ? '3 2.5' : undefined} strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: isMobile ? 2 : 2.5 }} />
                        <text x={(l.from[0] + l.to[0]) / 2} y={(l.from[1] + l.to[1]) / 2 - 1.6} textAnchor="middle" fill={l.color} style={{ fontFamily: MONO, fontSize: isMobile ? 2.4 : 1.7, fontWeight: 700, letterSpacing: '.08em', paintOrder: 'stroke', stroke: '#260040', strokeWidth: 0.6 }} transform={`rotate(${Math.atan2(l.to[1] - l.from[1], l.to[0] - l.from[0]) * 180 / Math.PI} ${(l.from[0] + l.to[0]) / 2} ${(l.from[1] + l.to[1]) / 2})`}>{l.label}</text>
                      </g>
                    ))}
                    {trailSets.map((id) => (trails as Record<string, TrailEdge[]>)[id].map((e, i) => {
                      const pts = e.pts.map((p) => p.join(',')).join(' ');
                      const anim = (w: number, extra: CSSProperties = {}): CSSProperties => ({
                        strokeDasharray: 1, strokeDashoffset: 1, strokeWidth: w,
                        animation: `vtrace ${Math.max(0.05, e.len / trailSpeed)}s linear ${e.d0 / trailSpeed}s forwards`, ...extra,
                      });
                      return (
                        <g key={id + i}>
                          <polyline points={pts} pathLength={1} fill="none" stroke={trailColor(id)} strokeOpacity={0.45} filter="url(#amglow)" strokeLinecap="round" strokeLinejoin="round" style={anim(isMobile ? 3.2 : 2.6)} />
                          <polyline points={pts} pathLength={1} fill="none" stroke={trailColor(id)} strokeLinecap="round" strokeLinejoin="round" style={anim(isMobile ? 1.5 : 1.25)} />
                        </g>
                      );
                    }))}
                    {/* Cables use viewBox units (no non-scaling-stroke): Chrome ignores pathLength for dashes otherwise, which breaks the trace. */}
                    {drawRoutes && cables.map((s, i) => (
                      <line key={'g' + i} {...seg(s)} pathLength={1} stroke={route.color} strokeOpacity={0.5} filter="url(#amglow)" strokeLinecap="round" style={traceStyle(i, { strokeWidth: isMobile ? 2.4 : 1.3 })} />
                    ))}
                    {drawRoutes && cables.map((s, i) => (
                      <line key={'c' + i} {...seg(s)} pathLength={1} stroke={route.color} strokeLinecap="round" style={traceStyle(i, { strokeWidth: isMobile ? 0.6 : 0.34 })} />
                    ))}
                    {drawRoutes && cables.map((s, i) => (
                      <circle key={'s' + i} cx={s.b.px} cy={s.b.py} r={0.9} fill="#FFFFFF" style={{ opacity: 0, animation: `vspark .6s ease-out ${(i + 1) * TRACE - 0.1}s forwards` }} />
                    ))}
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
                      scale={0.72}
                      onClick={() => setSel((cur) => (cur === p.n ? '' : p.n))}
                    />
                  );
                })}
              </div>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(115deg, rgba(255,255,255,.1), rgba(255,255,255,0) 46%)', mixBlendMode: 'screen' }} />
              {popup && <MapPopup p={popup} left={popLeft} top={popTop} transform={popTransform} onClose={() => setSel('')} />}
              {!isMobile && <RouteCard route={route} options={options} overlay />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '14px 8px 2px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.08em', color: 'rgba(255,255,255,.7)' }}>
              <span>{hint}</span>
              <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 999, background: '#FF3358', border: '1.5px solid #FFF', marginRight: 5, verticalAlign: -1 }} />ROUTE STOP</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 999, background: '#33FF74', border: '1.5px solid #FFF', marginRight: 5, verticalAlign: -1 }} />LANDMARK</span>
                {extraLines?.map((l) => <span key={l.label}><span style={{ display: 'inline-block', width: 14, borderTop: `2px ${l.dashed ? 'dashed' : 'solid'} ${l.color}`, marginRight: 5, verticalAlign: 3 }} />{l.label}</span>)}
              </span>
            </div>
          </div>
          {isMobile && <RouteCard route={route} options={options} overlay={false} />}
        </div>

        {gallery && gallery.shots.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', color: '#33FF74' }}>{gallery.eyebrow}</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.12em', color: 'rgba(255,255,255,.55)' }}>{gallery.shots.length} PHOTOS · TAP TO OPEN</span>
            </div>
            <div style={{ display: 'grid', gridTemplateRows: `repeat(2, ${isMobile ? 120 : 150}px)`, gridAutoFlow: 'column', gridAutoColumns: isMobile ? 170 : 214, gap: 10, overflowX: 'auto', padding: '2px 2px 12px', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
              {gallery.shots.map((s, i) => <GalleryTile key={s.src} s={s} big={i === 0} onClick={() => setShot(i)} />)}
            </div>
          </div>
        )}

        <div style={{ ...GLASS, borderRadius: 16, padding: '16px 22px', marginTop: 10, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, flex: 1, minWidth: 260, color: 'rgba(255,255,255,.85)' }}>{footNote}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, opacity: 0.8 }}>{footTag}</div>
        </div>
      </div>
      {gallery && shot >= 0 && (
        <ValleLightbox
          g={gallery}
          idx={shot}
          onClose={() => setShot(-1)}
          onStep={(d) => setShot((s) => (s + d + gallery.shots.length) % gallery.shots.length)}
          onPick={(i) => setShot(i)}
          cta={ctaLabel}
          onCta={onCta}
        />
      )}
    </section>
  );
}
