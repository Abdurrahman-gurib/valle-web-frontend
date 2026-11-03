import type { CSSProperties } from 'react';
import type { MapLine, MapPin, MapRoute } from '../../../data/maps';
import type { TrailArrow, TrailEdge } from '../../../data/quadTrails';
import { useT } from '../../../i18n';
import { MONO } from './glass';

/** A stretch of a zipline route between two stations: a cable flown, or a walk between platforms. */
export interface Segment { a: MapPin; b: MapPin; cable: boolean }

const TRACE = 0.55; // seconds per cable

/** Label set along a line, centred `lift` units above its midpoint and turned to its angle. */
function LineLabel({ from, to, lift, fill, size, halo, children }: { from: [number, number]; to: [number, number]; lift: number; fill: string; size: number; halo: number; children: string }) {
  const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
  return (
    <text x={mx} y={my - lift} textAnchor="middle" fill={fill} style={{ fontFamily: MONO, fontSize: size, fontWeight: 700, letterSpacing: '.08em', paintOrder: 'stroke', stroke: '#260040', strokeWidth: halo }} transform={`rotate(${Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI} ${mx} ${my})`}>{children}</text>
  );
}

/** Quad: the chosen loop(s) traced over the artwork, one continuous ride from the base (see quadTrails.ts). */
function TrailLoops({ trails, arrows, route, routes, isMobile }: { trails: Record<string, TrailEdge[]>; arrows?: Record<string, TrailArrow[]>; route: MapRoute; routes: MapRoute[]; isMobile: boolean }) {
  // A route without its own trail (the 2 h Advenature Tour) traces every loop.
  const trailSets = trails[route.id] ? [route.id] : Object.keys(trails);
  // Each loop is one continuous ride; several loops ride one after the other.
  const loopReach = (id: string) => Math.max(1, ...trails[id].map((e) => e.d0 + e.len));
  const loopOffset: Record<string, number> = {};
  let trailReach = 0;
  for (const id of trailSets) { loopOffset[id] = trailReach; trailReach += loopReach(id); }
  const trailSpeed = Math.max(1, trailReach) / (trailSets.length > 1 ? 7 : 4.5);   // px per second
  const trailColor = (id: string) => routes.find((r) => r.id === id)?.color || '#FFFFFF';
  const pts = (e: TrailEdge) => e.pts.map((p) => p.join(',')).join(' ');
  return (
    <>
      {trailSets.map((id) => {
        const anim = (e: TrailEdge, w: number): CSSProperties => ({
          strokeDasharray: 1, strokeDashoffset: 1, strokeWidth: w,
          animation: `vtrace ${Math.max(0.05, e.len / trailSpeed)}s linear ${(e.d0 + loopOffset[id]) / trailSpeed}s forwards`,
        });
        return (
          <g key={'loop' + id}>
            <g opacity={0.38} filter="url(#amglow)">
              {trails[id].map((e, i) => <polyline key={i} points={pts(e)} pathLength={1} fill="none" stroke={trailColor(id)} strokeLinecap="round" strokeLinejoin="round" style={anim(e, isMobile ? 2.8 : 2.3)} />)}
            </g>
            {trails[id].map((e, i) => <polyline key={i} points={pts(e)} pathLength={1} fill="none" stroke={trailColor(id)} strokeLinecap="round" strokeLinejoin="round" style={anim(e, isMobile ? 1.3 : 1.1)} />)}
            {/* Direction of travel, as printed on the official map. Each chevron pops in the moment the
                trace reaches it (time = when the pen passes the nearest trail point), in the loop's colour. */}
            {arrows?.[id]?.map((a, i) => {
              let best = Infinity, at = 0;
              for (const e of trails[id]) {
                const n = e.pts.length;
                for (let k = 0; k < n; k++) {
                  const d = (e.pts[k][0] - a.x) ** 2 + (e.pts[k][1] - a.y) ** 2;
                  if (d < best) { best = d; at = e.d0 + e.len * (n > 1 ? k / (n - 1) : 0); }
                }
              }
              const delay = (loopOffset[id] + at) / trailSpeed;
              const d = isMobile ? 'M -1.7 -1.6 L 0.3 0 L -1.7 1.6' : 'M -1.35 -1.25 L 0.25 0 L -1.35 1.25';
              return (
                <g key={'a' + i} transform={`translate(${a.x} ${a.y}) rotate(${a.a})`}>
                  {/* the CSS scale lives on an inner group so it never overrides the placement transform above */}
                  <g style={{ opacity: 0, animation: `vpop .35s cubic-bezier(.2,1.4,.5,1) ${delay}s forwards` }}>
                    <path d={d} fill="none" stroke="#260040" strokeWidth={isMobile ? 1.3 : 1.0} strokeLinecap="round" strokeLinejoin="round" />
                    <path d={d} fill="none" stroke={trailColor(id)} strokeWidth={isMobile ? 0.7 : 0.5} strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}
    </>
  );
}

/**
 * The map and every overlay in ONE svg, so all layers are sampled identically (no double image):
 * the always-on extra lines, the quad loops, the traced extra line of the chosen route, the zipline
 * cables in flying order and The Signature.
 */
export function MapLayers({ img, alt, route, routes, extraLines, trails, arrows, cables, signature, isMobile }: {
  img: string; alt: string; route: MapRoute; routes: MapRoute[]; extraLines?: MapLine[];
  trails?: Record<string, TrailEdge[]>; arrows?: Record<string, TrailArrow[]>;
  /** Zipline cables to draw, in flying order; empty when the map draws no routes. */
  cables: Segment[];
  signature: [MapPin | undefined, MapPin | undefined] | null;
  isMobile: boolean;
}) {
  const t = useT();
  const seg = (s: Segment) => ({ x1: s.a.px, y1: s.a.py, x2: s.b.px, y2: s.b.py });
  // Cables only, each traced after the previous one (dash animation, see global.css).
  const traceStyle = (i: number, extra: CSSProperties = {}): CSSProperties => ({
    strokeDasharray: 1, strokeDashoffset: 1, animation: `vtrace ${TRACE}s ease-out ${i * TRACE}s forwards`, ...extra,
  });
  const [sigA, sigB] = signature ?? [];
  return (
    <svg key={route.id} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'block' }}>
      <image href={img} x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
      <defs>
        <filter id="amglow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      {extraLines?.filter((l) => l.label !== route.extra).map((l) => (
        <g key={l.label}>
          <line x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} stroke={l.color} strokeOpacity={0.35} filter="url(#amglow)" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 7 }} />
          <line x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} stroke={l.color} strokeDasharray={l.dashed ? '3 2.5' : undefined} strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: isMobile ? 2 : 2.5 }} />
          <LineLabel from={l.from} to={l.to} lift={1.6} fill={l.color} size={isMobile ? 2.4 : 1.7} halo={0.6}>{t(l.label)}</LineLabel>
        </g>
      ))}
      {trails && <TrailLoops trails={trails} arrows={arrows} route={route} routes={routes} isMobile={isMobile} />}
      {extraLines?.filter((l) => l.label === route.extra).map((l) => (
        <g key={'trace' + l.label}>
          <line x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} pathLength={1} stroke={l.color} strokeOpacity={0.5} filter="url(#amglow)" strokeLinecap="round" style={{ strokeWidth: isMobile ? 2.4 : 1.4, strokeDasharray: 1, strokeDashoffset: 1, animation: 'vtrace 1.2s ease-out forwards' }} />
          <line x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} pathLength={1} stroke={l.color} strokeLinecap="round" style={{ strokeWidth: isMobile ? 0.7 : 0.4, strokeDasharray: 1, strokeDashoffset: 1, animation: 'vtrace 1.2s ease-out forwards' }} />
          <LineLabel from={l.from} to={l.to} lift={1.8} fill="#FFFFFF" size={isMobile ? 2.6 : 1.9} halo={0.7}>{t(l.label)}</LineLabel>
        </g>
      ))}
      {/* Cables use viewBox units (no non-scaling-stroke): Chrome ignores pathLength for dashes otherwise, which breaks the trace. */}
      {cables.map((s, i) => (
        <line key={'g' + i} {...seg(s)} pathLength={1} stroke={route.color} strokeOpacity={0.5} filter="url(#amglow)" strokeLinecap="round" style={traceStyle(i, { strokeWidth: isMobile ? 2.4 : 1.3 })} />
      ))}
      {cables.map((s, i) => (
        <line key={'c' + i} {...seg(s)} pathLength={1} stroke={route.color} strokeLinecap="round" style={traceStyle(i, { strokeWidth: isMobile ? 0.6 : 0.34 })} />
      ))}
      {cables.map((s, i) => (
        <circle key={'s' + i} cx={s.b.px} cy={s.b.py} r={0.9} fill="#FFFFFF" style={{ opacity: 0, animation: `vspark .6s ease-out ${(i + 1) * TRACE - 0.1}s forwards` }} />
      ))}
      {sigA && sigB && (
        <>
          <line x1={sigA.px} y1={sigA.py} x2={sigB.px} y2={sigB.py} stroke="#FFFFFF" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />
          <LineLabel from={[sigA.px, sigA.py]} to={[sigB.px, sigB.py]} lift={2.2} fill="#FFFFFF" size={isMobile ? 3.2 : 2.3} halo={0.8}>{t('THE SIGNATURE · 1.5 KM')}</LineLabel>
        </>
      )}
    </svg>
  );
}
