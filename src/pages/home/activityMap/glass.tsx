import type { CSSProperties } from 'react';
import { PULSE_NAMES } from '../../../lib/card';
import { useHover } from '../../../hooks/useHover';
import { useT } from '../../../i18n';

export const MONO = "'Chivo Mono',monospace";
export const HEAD = "'Barlow',sans-serif";

/** Frosted panel over the map (Vallé purple glass). */
export const GLASS: CSSProperties = {
  background: 'linear-gradient(155deg, rgba(52,0,87,.58), rgba(31,0,51,.74))',
  backdropFilter: 'blur(18px) saturate(1.45)',
  WebkitBackdropFilter: 'blur(18px) saturate(1.45)',
  border: '1px solid rgba(255,255,255,.22)',
  boxShadow: '0 30px 60px -24px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.28)',
  color: '#FFFFFF',
};

/** Thrill level as five dots, the filled ones in `color`. */
export function Pulse({ n, color = '#FFFC33', size = 13 }: { n: number; color?: string; size?: number }) {
  const t = useT();
  return (
    <span style={{ fontSize: size, letterSpacing: '.18em', color, fontWeight: 700 }} title={t('{name} pulse', { name: t(PULSE_NAMES[n]) })}>
      {'●'.repeat(n)}<span style={{ opacity: 0.35 }}>{'○'.repeat(5 - n)}</span>
    </span>
  );
}

export function WallArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const [h, bind] = useHover();
  const t = useT();
  return (
    <button {...bind} onClick={onClick} aria-label={side === 'left' ? t('Previous photos') : t('Next photos')} style={{ ...GLASS, position: 'absolute', top: '50%', [side]: 6, transform: 'translateY(-60%)', width: 44, height: 44, borderRadius: 999, cursor: 'pointer', fontSize: 24, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: h ? '#FFFC33' : GLASS.background, color: h ? '#340057' : '#FFFFFF', zIndex: 3 }}>{side === 'left' ? '‹' : '›'}</button>
  );
}

export function ZoomBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  const [h, bind] = useHover();
  return (
    <button {...bind} onClick={onClick} title={title} aria-label={title} style={{ ...GLASS, width: 34, height: 34, borderRadius: 999, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: h ? 'rgba(255,255,255,.22)' : GLASS.background }}>{label}</button>
  );
}

/** Pill button on the glass: yellow `primary`, green when `on`, translucent otherwise. */
export function GlassBtn({ label, onClick, primary, on, small, style }: { label: string; onClick: () => void; primary?: boolean; on?: boolean; small?: boolean; style?: CSSProperties }) {
  const [h, bind] = useHover();
  const bg = primary
    ? (h ? '#F2EE1F' : '#FFFC33')
    : on ? '#33FF74' : (h ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.12)');
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        border: primary || on ? 0 : '1px solid rgba(255,255,255,.3)', background: bg, cursor: 'pointer', fontFamily: 'inherit',
        color: on || primary ? '#340057' : '#FFFFFF', fontSize: small ? 11 : 12.5, fontWeight: 700, padding: small ? '8px 12px' : '11px 16px', borderRadius: 999,
        transition: 'background-color .15s ease', boxShadow: 'none', whiteSpace: 'nowrap',
        ...style,
      }}
    >{label}</button>
  );
}
