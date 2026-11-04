import { useApp } from '../../../store/AppStore';
import { useGoto } from '../../../lib/nav';
import { useHover } from '../../../hooks/useHover';
import { Img } from '../../../components/Img';
import type { MapRoute } from '../../../data/maps';
import { useT } from '../../../i18n';
import { GLASS, GlassBtn, HEAD, MONO } from './glass';
import type { Bookable } from './hooks';

export interface Fact { k: string; v: string }

/** What the pin popup shows: photo, badge, copy, facts and one action. */
export interface Popup {
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

export function MapPopup({ p, left, top, transform, onClose }: { p: Popup; left: string; top: string; transform: string; onClose: () => void }) {
  const [hX, bindX] = useHover();
  const t = useT();
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
          aria-label={t('Close')}
          style={{
            position: 'absolute', top: 8, right: 8, border: '1px solid rgba(255,255,255,.3)', background: hX ? 'rgba(255,255,255,.26)' : 'rgba(255,255,255,.12)',
            color: '#FFFFFF', width: 28, height: 28, borderRadius: 999, cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** The chosen route: photo, copy, price, limits and the booking controls. */
export function RouteCard({ route, options, overlay }: { route: MapRoute; options: Bookable[]; overlay: boolean }) {
  const app = useApp();
  const goto = useGoto();
  const [hImg, bindImg] = useHover();
  const t = useT();
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
        <Img src={route.img} alt={t(route.name)} priority surface="dark" placeholder="transparent" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hImg ? 'scale(1.05)' : 'scale(1)', transition: 'transform .6s ease' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.85), rgba(31,0,51,0) 60%)' }} />
        <span style={{ position: 'absolute', left: 12, top: 12, background: route.color === '#FF3358' ? '#D6173F' : route.color, color: route.fg, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '5px 10px', transform: 'rotate(-3deg)' }}>{t(route.tag)}</span>
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 10, fontFamily: HEAD, fontStyle: 'italic', fontWeight: 900, fontSize: 23, textTransform: 'uppercase', lineHeight: 0.95, textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>{t(route.name)}</div>
      </div>
      <div style={{ padding: '12px 15px 15px' }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,.8)', margin: 0, display: '-webkit-box', WebkitLineClamp: overlay ? 3 : 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t(route.blurb)}</p>
        <div style={{ marginTop: 10, borderTop: '1px dashed rgba(255,255,255,.25)', paddingTop: 9, display: 'grid', gap: 4, fontFamily: MONO, fontSize: 10.5 }}>
          {options.map((o) => (
            <div key={o.variant} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ opacity: 0.65 }}>{options.length > 1 ? t(o.label) : t('FROM')}</span><b style={{ color: '#FFFC33' }}>{o.price}</b></div>
          ))}
          {route.facts.filter((f) => f.k !== 'NOTE').map((f) => (
            <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, textAlign: 'right' }}><span style={{ opacity: 0.65, textAlign: 'left', flexShrink: 0 }}>{t(f.k)}</span><b>{t(f.v)}</b></div>
          ))}
          {route.facts.filter((f) => f.k === 'NOTE').map((f) => (
            <div key={f.k} style={{ fontSize: 9.5, opacity: 0.7, lineHeight: 1.4 }}>{t(f.v)}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {options.map((o, i) => (
            <GlassBtn
              key={o.variant}
              small
              on={added[i]}
              label={added[i] ? '✓ ' + (options.length > 1 ? t(o.label) : t('Added')) : '+ ' + (options.length > 1 ? t(o.label) : t('Add to My Day'))}
              onClick={() => app.toggleSel(o.id, o.variant)}
              style={{ flex: 1, minWidth: 0 }}
            />
          ))}
          <GlassBtn primary small label={anyAdded ? t('Book →') : t('Book now →')} onClick={bookNow} style={{ flex: 1 }} />
        </div>
      </div>
    </aside>
  );
}

/** A route's glass tab above the map; filled with the route colour when chosen. */
export function RouteTab({ r, on, onClick }: { r: MapRoute; on: boolean; onClick: () => void }) {
  const [h, bind] = useHover();
  const t = useT();
  return (
    <button
      {...bind}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        flexShrink: 0, cursor: 'pointer', borderRadius: 999, padding: '9px 16px 9px 11px', display: 'flex', alignItems: 'center', gap: 9,
        fontFamily: 'inherit', textAlign: 'left', transition: 'all .2s ease',
        border: '1px solid ' + (on ? r.color : (h ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.22)')),
        // small white text on the brand red uses its darker ink shade (contrast)
        background: on ? (r.color === '#FF3358' ? '#D6173F' : r.color) : (h ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.07)'),
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        color: on ? r.fg : '#FFFFFF',
        boxShadow: on ? `0 10px 26px -10px ${r.color}` : 'inset 0 1px 0 rgba(255,255,255,.12)',
        transform: h && !on ? 'translateY(-1px)' : 'none',
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 999, background: r.color, border: '2px solid ' + (on ? r.fg : '#FFFFFF'), flexShrink: 0, boxShadow: on ? 'none' : `0 0 10px ${r.color}` }} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 13.5, textTransform: 'uppercase' }}>{t(r.name)}</span>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.08em', opacity: 0.8, marginTop: 3 }}>{t(r.tag)}</span>
      </span>
    </button>
  );
}
