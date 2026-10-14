import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { BookingStatus, RateKey } from '../../types';
import { cn } from '../../lib/utils';

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

/* Class-name twins of the style objects above, for Tailwind markup. */
export const monoCls = 'font-mono';
export const displayCls = 'font-display italic font-black uppercase';
export const labelCls = 'font-mono text-[10px] font-bold tracking-[.14em] text-valle-violet';
export const fieldLabelCls = 'font-mono text-[10px] font-bold tracking-[.12em] text-[rgba(52,0,87,.6)]';
export const inputCls = 'w-full rounded-[12px] border-[1.5px] border-valle-lilac bg-[#F7F3FF] px-[14px] py-[11px] [font-family:inherit] text-[14.5px] text-valle-purple outline-none';
export const cardCls = 'rounded-[18px] border-[1.5px] border-valle-lilac bg-white';

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
    <span className="inline-flex items-center" style={{ gap: size * 0.6 }} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block rounded-[999px] [animation:vbeat_.7s_ease-in-out_infinite]"
          style={{ width: size, height: size, background: color, animationDelay: i * 0.12 + 's' }}
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
    <div className="flex shrink-0 select-none flex-col leading-none [transform:rotate(-4deg)]">
      <span className={cn(displayCls, 'tracking-[-0.01em]')} style={{ fontSize: size, color }}>VALLÉ</span>
      <span className={cn(monoCls, 'mt-[2px] font-semibold tracking-[.22em] opacity-75')} style={{ fontSize: size * 0.3, color }}>
        {sub}
      </span>
    </div>
  );
}

const BTN_SKIN: Record<string, string> = {
  solid: 'border-0 bg-valle-red text-white enabled:hover:bg-[#D91E44]',
  danger: 'border-[1.5px] border-[#D91E44] bg-transparent text-[#D91E44] enabled:hover:bg-[#D91E44] enabled:hover:text-white',
  dark: 'border-0 bg-valle-purple text-white enabled:hover:bg-valle-deep',
  ghost: 'border-[1.5px] border-valle-lilac bg-transparent text-valle-purple enabled:hover:bg-[#F7F3FF]',
};

/** Filled / outlined pill button with the site's hover lift. */
export function Btn({ children, onClick, variant = 'solid', disabled, type = 'button', style, className }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'ghost' | 'dark' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'press inline-flex cursor-pointer items-center justify-center gap-[8px] whitespace-nowrap rounded-[999px] px-[18px] py-[10px] [font-family:inherit] text-[13.5px] font-bold',
        '[transition:transform_.15s_ease,background_.15s_ease] disabled:cursor-default disabled:opacity-55 enabled:hover:[transform:translateY(-1px)]',
        BTN_SKIN[variant],
        className,
      )}
      style={style}
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
    postponed: ['#FFF4D6', '#8A6A00'],
  };
  const [bg, fg] = skin[status] || ['#F7F3FF', '#340057'];
  return (
    <span
      className={cn(monoCls, 'whitespace-nowrap rounded-[999px] px-[9px] py-[4px] text-[10px] font-bold uppercase tracking-[.1em]')}
      style={{ background: bg, color: fg }}
    >
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
      className={cn(
        monoCls,
        'inline-block whitespace-nowrap rounded-[999px] border-[1.5px] font-bold leading-[1.4] tracking-[.12em]',
        size === 'sm' ? 'px-[7px] py-[2px] text-[9.5px]' : 'px-[9px] py-[3px] text-[10.5px]',
        rr
          ? 'border-[rgba(18,181,74,.28)] bg-[#E2FFEB] text-[#12B54A]'
          : 'border-[rgba(115,51,255,.28)] bg-valle-lilac text-valle-violet',
      )}
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
    <span className="inline-flex items-end" style={{ gap: size * 0.7, height: size + 6 }} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('block rounded-[999px]', reduced ? 'opacity-55' : '[animation:vdot_1.05s_ease-in-out_infinite]')}
          style={{
            width: size, height: size, background: dotColor,
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
    <div className="min-w-0">
      <label htmlFor={id} className={cn(labelCls, 'mb-[5px] block')}>{tag}</label>
      {children}
      {hint && (
        <div className={cn(monoCls, 'mt-[4px] text-[9.5px] tracking-[.08em] text-[#D91E44]')}>
          {hint}
        </div>
      )}
    </div>
  );
}

/** Mono section heading used between blocks in the drawers. */
export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={cn(labelCls, 'mx-0 mt-[20px] mb-[8px] text-[9.5px] tracking-[.14em]')} style={style}>
      {children}
    </div>
  );
}

/**
 * The headline money figure. Used in the drawer and the table so an operator
 * reads the same number in the same shape in both places.
 */
export function TotalTag({ amount, size = 26 }: { amount: string; size?: number }) {
  return <span className={cn(displayCls, 'leading-none tracking-[-0.01em]')} style={{ fontSize: size }}>{amount}</span>;
}

/** Green when the socket is live, amber while it retries / polls. */
export function StatusDot({ connected, labelText }: { connected: boolean; labelText?: string }) {
  return (
    <span className="inline-flex items-center gap-[7px]">
      <span className={cn(
        'block h-[8px] w-[8px] shrink-0 rounded-[999px]',
        connected ? 'bg-valle-green shadow-[0_0_0_3px_rgba(51,255,116,.22)]' : 'bg-[#FFB020] shadow-[0_0_0_3px_rgba(255,176,32,.22)]',
      )} />
      <span className={cn(monoCls, 'text-[10px] font-semibold tracking-[.12em] text-[rgba(52,0,87,.6)]')}>
        {labelText || (connected ? 'CONNECTED' : 'RECONNECTING…')}
      </span>
    </span>
  );
}

export function EmptyState({ title, note }: { title: string; note: string }) {
  return (
    <div className="px-[20px] py-[clamp(30px,6vw,60px)] text-center">
      <div className={cn(displayCls, 'text-[26px] text-valle-purple opacity-85')}>{title}</div>
      <div className="mt-[8px] text-[14px] leading-[1.5] text-[rgba(52,0,87,.6)]">{note}</div>
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

/** "14:03:21", park time. Bookings are stamped to the second so the desk can order them. */
export function clockTimeSec(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { timeZone: 'Indian/Mauritius', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** "28 Sep 2026 · 14:03:21", park time. */
export function dateTimeSec(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString('en-GB', { timeZone: 'Indian/Mauritius', day: 'numeric', month: 'short', year: 'numeric' });
  return day + ' · ' + clockTimeSec(iso);
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
