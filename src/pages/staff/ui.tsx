import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useHover } from '../../hooks/useHover';
import type { BookingStatus, RateKey } from '../../types';
import { color, radius } from '../../styles/theme';

/**
 * Small shared pieces for the back office. Same visual language as the public
 * site (Barlow italic display, Chivo Mono labels, lilac borders on tint).
 */

export const mono: CSSProperties = { fontFamily: "'Chivo Mono',monospace" };
export const display: CSSProperties = {
  fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase',
};

export const label: CSSProperties = {
  ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#7333FF',
};

export const inputStyle: CSSProperties = {
  width: '100%', border: '1.5px solid #EBE2FF', background: '#F7F3FF', borderRadius: 12,
  padding: '11px 14px', fontFamily: 'inherit', fontSize: 14.5, outline: 'none', color: '#340057',
};

export const card: CSSProperties = {
  background: '#FFFFFF', border: '1.5px solid #EBE2FF', borderRadius: 18,
};

export const textareaStyle: CSSProperties = {
  ...inputStyle, minHeight: 84, resize: 'vertical', lineHeight: 1.5, fontSize: 14,
};

/**
 * Live `prefers-reduced-motion` reading. Every animated surface asks for this and
 * drops to a plain fade (or to nothing at all) when it is true, so motion is a
 * decoration and never the thing that makes an element readable.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Pulsing three-dot loader that reuses the global `vbeat` keyframes. */
export function Spinner({ color = '#FFFFFF', size = 7 }: { color?: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.6 }} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: size, height: size, borderRadius: 999, background: color, display: 'block',
            animation: 'vbeat .7s ease-in-out infinite', animationDelay: i * 0.12 + 's',
          }}
        />
      ))}
    </span>
  );
}

/** The VALLÉ lockup, tilted like the header's. */
export function Lockup({ color = '#FFFFFF', size = 27, sub = 'ADVENATURE™ PARK' }: {
  color?: string; size?: number; sub?: string;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', lineHeight: 1, userSelect: 'none',
      transform: 'rotate(-4deg)', flexShrink: 0,
    }}>
      <span style={{ ...display, fontSize: size, letterSpacing: '-0.01em', color }}>VALLÉ</span>
      <span style={{ ...mono, fontSize: size * 0.3, fontWeight: 600, letterSpacing: '.22em', color, opacity: 0.75, marginTop: 2 }}>
        {sub}
      </span>
    </div>
  );
}

/** Filled / outlined pill button with the site's hover lift. */
export function Btn({ children, onClick, variant = 'solid', disabled, type = 'button', style }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'ghost' | 'dark' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: CSSProperties;
}) {
  const [h, bind] = useHover();
  const on = h && !disabled;
  const skin: Record<string, CSSProperties> = {
    solid: { border: 0, background: on ? '#D91E44' : '#FF3358', color: '#FFFFFF' },
    danger: { border: '1.5px solid #D91E44', background: on ? '#D91E44' : 'transparent', color: on ? '#FFFFFF' : '#D91E44' },
    dark: { border: 0, background: on ? '#260040' : '#340057', color: '#FFFFFF' },
    ghost: { border: '1.5px solid #EBE2FF', background: on ? '#F7F3FF' : 'transparent', color: '#340057' },
  };
  return (
    <button
      {...bind}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="press"
      style={{
        cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
        padding: '10px 18px', borderRadius: 999, opacity: disabled ? 0.55 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
        transform: on ? 'translateY(-1px)' : 'none', transition: 'transform .15s ease, background .15s ease',
        ...skin[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Booking status chip, colour-coded the way the park floor reads them. */
export function StatusChip({ status }: { status: BookingStatus | string }) {
  const skin: Record<string, [string, string]> = {
    confirmed: ['#EBE2FF', '#7333FF'],
    arrived: ['#33FF74', '#340057'],
    cancelled: ['rgba(217,30,68,.12)', '#D91E44'],
  };
  const [bg, fg] = skin[status] || ['#F7F3FF', '#340057'];
  return (
    <span style={{
      ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
      background: bg, color: fg, borderRadius: 999, padding: '4px 9px', whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

/**
 * Rate pill: `RR` for the resident rate, `NR` for the visitor rate. The two-letter
 * code is what the floor actually says, so it is the pill; the full word rides
 * along as the accessible name and as the tooltip.
 */
export function RatePill({ rate, size = 'md' }: { rate: RateKey | string; size?: 'sm' | 'md' }) {
  const rr = rate === 'rr';
  const word = rr ? 'Resident' : 'Visitor';
  return (
    <span
      title={word + ' rate'}
      aria-label={word + ' rate'}
      style={{
        ...mono, fontSize: size === 'sm' ? 9.5 : 10.5, fontWeight: 700, letterSpacing: '.12em',
        background: rr ? '#E2FFEB' : '#EBE2FF',
        color: rr ? '#12B54A' : color.violet,
        border: '1.5px solid ' + (rr ? 'rgba(18,181,74,.28)' : 'rgba(115,51,255,.28)'),
        borderRadius: radius.pill, padding: size === 'sm' ? '2px 7px' : '3px 9px',
        whiteSpace: 'nowrap', display: 'inline-block', lineHeight: 1.4,
      }}
    >
      {rr ? 'RR' : 'NR'}
    </span>
  );
}

/**
 * Three dots with a staggered bounce: the chat "peer is typing" signal. Distinct
 * from `Spinner`, which pulses in place for loading states.
 */
export function TypingDots({ color: dotColor = '#7333FF', size = 6 }: { color?: string; size?: number }) {
  const reduced = usePrefersReducedMotion();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: size * 0.7, height: size + 6 }} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: size, height: size, borderRadius: 999, background: dotColor, display: 'block',
            opacity: reduced ? 0.55 : undefined,
            animation: reduced ? undefined : 'vdot 1.05s ease-in-out infinite',
            animationDelay: reduced ? undefined : i * 0.15 + 's',
          }}
        />
      ))}
    </span>
  );
}

/** Mono caption above a form control, tied to it by id. */
export function Field({ id, tag, children, hint }: {
  id: string; tag: string; children: ReactNode; hint?: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <label htmlFor={id} style={{ ...label, display: 'block', marginBottom: 5 }}>{tag}</label>
      {children}
      {hint && (
        <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.08em', color: '#D91E44', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/** Mono section heading used between blocks in the drawers. */
export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ ...label, fontSize: 9.5, letterSpacing: '.14em', margin: '20px 0 8px', ...style }}>
      {children}
    </div>
  );
}

/**
 * The headline money figure. Used in the drawer and the table so an operator
 * reads the same number in the same shape in both places.
 */
export function TotalTag({ amount, size = 26 }: { amount: string; size?: number }) {
  return <span style={{ ...display, fontSize: size, lineHeight: 1, letterSpacing: '-0.01em' }}>{amount}</span>;
}

/** Green when the socket is live, amber while it retries / polls. */
export function StatusDot({ connected, labelText }: { connected: boolean; labelText?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{
        width: 8, height: 8, borderRadius: 999, display: 'block', flexShrink: 0,
        background: connected ? '#33FF74' : '#FFB020',
        boxShadow: connected ? '0 0 0 3px rgba(51,255,116,.22)' : '0 0 0 3px rgba(255,176,32,.22)',
      }} />
      <span style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' }}>
        {labelText || (connected ? 'CONNECTED' : 'RECONNECTING…')}
      </span>
    </span>
  );
}

export function EmptyState({ title, note }: { title: string; note: string }) {
  return (
    <div style={{ padding: 'clamp(30px,6vw,60px) 20px', textAlign: 'center' }}>
      <div style={{ ...display, fontSize: 26, color: '#340057', opacity: 0.85 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'rgba(52,0,87,.6)', marginTop: 8, lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "6 Aug 2026", compact enough for a dense table. */
export function shortDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  if (isNaN(d.getTime())) return iso;
  return d.getDate() + ' ' + MONS[d.getMonth()] + ' ' + d.getFullYear();
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** "just now" · "8 min" · "3 h" · "yesterday" · "6 Aug" */
export function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min';
  if (s < 86400) return Math.round(s / 3600) + ' h';
  if (s < 172800) return 'yesterday';
  const d = new Date(t);
  return d.getDate() + ' ' + MONS[d.getMonth()];
}
