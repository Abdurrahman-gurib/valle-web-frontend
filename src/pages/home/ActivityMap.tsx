import { useMemo, useState } from 'react';
import { useApp } from '../../store/AppStore';
import { useGoto } from '../../lib/nav';
import { useIsMobile } from '../../hooks/useIsMobile';
import { PinButton } from './ParkMap';
import type { MapKeyItem, MapLine, MapPin, MapRoute } from '../../data/maps';
import type { TrailArrow, TrailEdge } from '../../data/quadTrails';
import type { MapGallery } from '../../data/mapGalleries';
import { _t, useT, fwd } from '../../i18n';
import { GLASS, HEAD, MONO, ZoomBtn } from './activityMap/glass';
import { Compass, MapKey } from './activityMap/sheet';
import { useBookables, useMapZoom } from './activityMap/hooks';
import { MapPopup, RouteCard, RouteTab, type Fact, type Popup } from './activityMap/RouteCard';
import { PhotoWall, ValleLightbox } from './activityMap/Gallery';
import { MapLayers, type Segment } from './activityMap/MapLayers';

/** Price-option labels built from data at runtime (priceCat.toUpperCase()); registered so the dictionaries cover them. */
const DYNAMIC_OPTION_LABELS = [_t('QUAD'), _t('ZIPLINE'), _t('BUGGY')];
void DYNAMIC_OPTION_LABELS;

export interface ActivityMapProps {
  eyebrow: string;             // e.g. "03 · QUAD & BUGGY · 2 LOOPS"
  title: string;
  intro: string;
  /** `dimImg`: the map with every trail dimmed, used as the base when trails are traced on top. */
  map: { img: string; width: number; height: number; dimImg?: string; routeImgs?: Record<string, string> };
  /** Quad: trail centrelines per route id, traced outward from the base when that route is picked. */
  trails?: Record<string, TrailEdge[]>;
  /** Quad: direction chevrons per route id, shown once that loop has traced in. */
  arrows?: Record<string, TrailArrow[]>;
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
  /** Printed-sheet framing, like the walking-trail sitemap: title plate + key column + compass. */
  sheet: { title: string; subtitle: string; keyItems: MapKeyItem[]; foot: string };
}

/**
 * Interactive activity map (Quad & Buggy, Ziplines): the official route map at full width with
 * glass route tabs, tappable numbered pins (photo + limits + price), a floating route card that
 * books the chosen tour straight into My Day, and a photo wall in the Vallé template.
 */
export function ActivityMap({ eyebrow, title, intro, map, alt, routes, pins, drawRoutes, lines, signature, extraLines, trails, arrows, gallery, footNote, footTag, hint, defaultRoute, sheet }: ActivityMapProps) {
  const goto = useGoto();
  const app = useApp();
  const isMobile = useIsMobile();
  const bookables = useBookables();
  const t = useT();
  const [routeId, setRouteId] = useState(defaultRoute || routes[0].id);
  const [sel, setSel] = useState<string>('');     // selected pin code
  const [shot, setShot] = useState(-1);
  const mz = useMapZoom();

  const route = routes.find((r) => r.id === routeId) || routes[0];
  const options = bookables(route);

  // Pins visible for this route: landmarks always, route pins only when they belong to it.
  const visible = useMemo(() => {
    const onRoute = (p: MapPin) => {
      if (!p.routes) return true;
      if (route.extra) return false;
      if (route.stations) return route.stations.includes(p.n);
      return p.routes.includes(route.id);
    };
    return pins.filter(onRoute);
  }, [pins, route]);

  const byCode = useMemo(() => Object.fromEntries(pins.map((p) => [p.n, p])), [pins]);
  const stationIndex = (code: string) => (route.stations ? route.stations.indexOf(code) : -1);

  // Split the selected route into cable segments (flown) and walks (between platforms).
  const segments = useMemo(() => {
    const isCable = (a: string, b: string) => !lines || lines.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    const st = route.stations || [];
    const out: Segment[] = [];
    for (let i = 0; i + 1 < st.length; i++) {
      const a = byCode[st[i]], b = byCode[st[i + 1]];
      if (a && b) out.push({ a, b, cable: isCable(st[i], st[i + 1]) });
    }
    return out;
  }, [route, byCode, lines]);
  const cables = segments.filter((s) => s.cable);
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
    let badge = t('LANDMARK');
    if (isRoutePin) {
      const name = t(route.name).toUpperCase();
      if (si >= 0) {
        const last = (route.stations ?? []).length - 1;
        badge = si === 0 ? t('{name} · START', { name }) : si === last ? t('{name} · FINISH', { name }) : t('{name} · AFTER LINE {n} OF {total}', { name, n: linesBefore(si), total: cables.length });
      } else badge = name;
    } else if (pp.facts) badge = t('SUSPENDED THRILL');
    const facts: Fact[] = [];
    if (isRoutePin) {
      if (options[0]) facts.push({ k: t('FROM'), v: options[0].price });
      if (options[1]) facts.push({ k: t(options[1].label), v: options[1].price });
      facts.push(...route.facts.filter((f) => f.k !== 'NOTE').map((f) => ({ k: t(f.k), v: t(f.v) })));
    } else {
      if (pp.priceCat && pp.priceRow) {
        const o = bookables({ priceCat: pp.priceCat, priceRow: pp.priceRow })[0];
        if (o) facts.push({ k: t('FROM'), v: o.price });
      }
      if (pp.facts) facts.push(...pp.facts.map((f) => ({ k: t(f.k), v: t(f.v) })));
    }
    popup = {
      name: t(pp.name), sub: t(pp.sub), img: pp.img,
      badge, badgeColor: isRoutePin ? route.color : '#EBE2FF', badgeFg: isRoutePin ? route.fg : '#340057',
      facts,
      btnLabel: (pp.btnLabel ? t(pp.btnLabel) : t('View details')) + ' ' + fwd(),
      btnClick: nav,
    };
  }
  const popLeft = pp ? (isMobile ? 50 : Math.min(72, Math.max(28, pp.px))) + '%' : '0%';
  const popTop = pp ? (isMobile ? '8px' : pp.py + '%') : '0%';
  const popTransform = pp ? (isMobile ? 'translateX(-50%)' : (pp.py < 36 ? 'translate(-50%, 22px)' : 'translate(-50%, calc(-100% - 22px))')) : 'none';

  // The Signature line (zipline) between its two stations, in image-percentage space.
  const sigPts: [MapPin | undefined, MapPin | undefined] | null = drawRoutes && signature && route.signature ? [byCode[signature[0]], byCode[signature[1]]] : null;

  const first = options[0];
  const firstAdded = !!first && app.isSelected(first.id, first.variant);
  const ctaLabel = firstAdded ? t('✓ {name} is in My Day →', { name: t(route.name) }) : t('Add {name} to my day →', { name: t(route.name) });
  const onCta = () => { if (first && !firstAdded) app.toggleSel(first.id, first.variant); setShot(-1); app.openDay(); };

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
            {/* The printed sheet: same framing as the walking-trail sitemap (purple sheet, yellow title plate, key, compass, Vallé band). */}
            <div style={{ position: 'relative', background: '#7159A6', borderRadius: 14, overflow: 'hidden', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '290px minmax(0,1fr)', gap: 0 }}>
              <div style={{ padding: isMobile ? '14px 16px 4px' : '22px 0 22px 22px', display: 'flex', flexDirection: 'column', gap: 16, zIndex: 2 }}>
                <div>
                  <div style={{ display: 'inline-block', background: '#FFFC33', color: '#340057', padding: isMobile ? '10px 14px' : '16px 18px', transform: 'rotate(-2deg)', transformOrigin: 'left bottom', boxShadow: '0 8px 18px rgba(0,0,0,.25)' }}>
                    <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 900, fontSize: isMobile ? 20 : 26, lineHeight: 0.9, textTransform: 'uppercase' }}>{sheet.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', marginTop: 6 }}>{sheet.subtitle}</div>
                  </div>
                  <div style={{ display: 'inline-block', background: '#340057', color: '#FFFC33', fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 13, padding: '6px 12px', marginTop: 10, textTransform: 'uppercase' }}>{t('Key / Légende')}</div>
                </div>
                <MapKey items={sheet.keyItems} compact={isMobile} />
                {!isMobile && <RouteCard route={route} options={options} overlay={false} />}
                {!isMobile && (
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Compass size={74} />
                    <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.06em', color: 'rgba(255,255,255,.7)', lineHeight: 1.5, maxWidth: 190 }}>{t('THE COMPASS ROSE INDICATES NORTH. LA ROSE DES VENTS INDIQUE LE NORD.')}</div>
                  </div>
                )}
              </div>
              <div style={{ padding: isMobile ? '8px 10px 14px' : '22px 22px 22px 12px', minWidth: 0 }}>
                <div ref={mz.frame} {...mz.bind} style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, touchAction: mz.zoom > 1 ? 'none' : 'pan-y', cursor: mz.zoom > 1 ? (mz.dragging ? 'grabbing' : 'grab') : 'default', background: '#2E0A4E' }}>
                  <div style={{ position: 'relative', aspectRatio: `${map.width} / ${map.height}`, transform: `translate(${mz.pan.x}px, ${mz.pan.y}px) scale(${mz.zoom})`, transformOrigin: '0 0', transition: mz.dragging ? 'none' : 'transform .35s ease', willChange: 'transform' }}>
                    <MapLayers
                      key={route.id}
                      img={map.img} alt={alt} route={route} routes={routes} extraLines={extraLines}
                      trails={trails} arrows={arrows} cables={drawRoutes ? cables : []} signature={sigPts} isMobile={isMobile}
                    />
                    {visible.map((p) => {
                      const si = stationIndex(p.n);
                      return (
                        <PinButton
                          key={route.id + ':' + p.n}
                          p={{ ...p, n: si >= 0 ? String(si + 1) : p.n, name: t(p.name) }}
                          i={0}
                          on={sel === p.n}
                          isMobile={isMobile}
                          scale={0.72 / mz.zoom}
                          onClick={() => setSel((cur) => (cur === p.n ? '' : p.n))}
                        />
                      );
                    })}
                    {popup && <MapPopup p={popup} left={popLeft} top={popTop} transform={popTransform + ` scale(${1 / mz.zoom})`} onClose={() => setSel('')} />}
                  </div>
                  <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 6, display: 'flex', gap: 6 }}>
                    <ZoomBtn label="+" title={t('Zoom in')} onClick={() => mz.setZoom(mz.zoom + 0.5)} />
                    <ZoomBtn label="−" title={t('Zoom out')} onClick={() => mz.setZoom(mz.zoom - 0.5)} />
                    {mz.zoom > 1 && <ZoomBtn label="⟲" title={t('Reset view')} onClick={mz.reset} />}
                    {mz.zoom > 1 && <span style={{ ...GLASS, borderRadius: 999, padding: '0 10px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', display: 'flex', alignItems: 'center' }}>{t('{z}× · DRAG TO PAN', { z: mz.zoom.toFixed(2).replace(/\.?0+$/, '') })}</span>}
                  </div>
                </div>
              </div>
              {/* Vallé band along the bottom of the sheet */}
              <div style={{ gridColumn: '1 / -1', background: '#FFFC33', color: '#340057', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 22px', clipPath: 'polygon(0 22%, 100% 0, 100% 100%, 0 100%)', marginTop: -6 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', marginTop: 6 }}>{sheet.foot}</span>
                <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em', marginTop: 6 }}>VALLÉ<span style={{ fontSize: 9, fontFamily: MONO, fontStyle: 'normal', fontWeight: 700, letterSpacing: '.08em', marginLeft: 6, verticalAlign: 'middle' }}>ADVENATURE™ PARK</span></span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '14px 8px 2px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.08em', color: 'rgba(255,255,255,.7)' }}>
              <span>{hint}</span>
              <a href="https://www.google.com/maps/place/Vall%C3%A9+Advenature+Park/@-20.457614,57.4826031,17z" target="_blank" rel="noopener" style={{ color: '#FFFC33', fontWeight: 600 }}>{t('GET DIRECTIONS · GOOGLE MAPS ↗')}</a>
              <span>{footTag}</span>
            </div>
          </div>
          {isMobile && <RouteCard route={route} options={options} overlay={false} />}
        </div>

        {gallery && gallery.shots.length > 0 && <PhotoWall gallery={gallery} onOpen={setShot} />}

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
