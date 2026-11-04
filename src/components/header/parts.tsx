import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import { Img } from '../Img';

/** Header building blocks shared by the desktop row, the mega menus and the mobile overlay. */

/** Inline styles that also set CSS custom properties (--fg, --hc). */
export type CSSVars = CSSProperties & Record<`--${string}`, string>;

export const mobileNavRow = 'w-full text-start [font-family:inherit] cursor-pointer text-[16.5px] font-semibold text-white py-[12px] border-b border-solid border-[rgba(255,255,255,.16)] flex justify-between items-center animate-[vfadeup_.3s_ease_both]';
export const monoLink = 'block no-underline cursor-pointer font-mono text-[12px] font-semibold tracking-[.12em]';
export const megaPanel = 'absolute top-[70px] left-0 right-0 bg-white border-b border-solid border-valle-lilac shadow-[0_32px_60px_-20px_rgba(52,0,87,.35)]';
export const hamburgerBar = 'block w-[16px] h-[2px] bg-current rounded-[2px]';

/**
 * A crawlable link that navigates in the app. The global a / a:hover colours
 * are unlayered and beat Tailwind, so a link's colour is passed inline.
 */
export function SpaLink({ href, onClick, className, color, style, children }: { href: string; onClick: (e: MouseEvent) => void; className?: string; color?: string; style?: CSSVars; children: ReactNode }) {
  return (
    <a href={href} onClick={(e) => { e.preventDefault(); onClick(e); }} className={className} style={{ ...(color ? { color } : null), textDecoration: 'none', ...style }}>
      {children}
    </a>
  );
}

export function NavBtn({ label, onClick, color, chev, href, snug, btnRef, controls, onKeyDown, onPointerEnter, onPointerLeave }: {
  label: string; onClick: (e: MouseEvent) => void; color: string; chev?: string; href?: string; snug?: boolean;
  /** Menu toggles: the button, the id of the panel it opens, and its keyboard / hover handlers. */
  btnRef?: Ref<HTMLButtonElement>; controls?: string; onKeyDown?: (e: KeyboardEvent) => void;
  onPointerEnter?: (e: PointerEvent) => void; onPointerLeave?: (e: PointerEvent) => void;
}) {
  const cls = cn(
    'flex items-center gap-[6px] whitespace-nowrap rounded-[999px] border-0 bg-transparent cursor-pointer no-underline [font-family:inherit] font-semibold py-[10px] [transition:background-color_var(--t-fast)] hover:bg-[var(--nav-hover,#F4EEFF)] aria-expanded:bg-[var(--nav-hover,#F4EEFF)]',
    // longer (non-English) labels stop growing at the size that fits the 1320px row
    snug ? 'text-[length:clamp(13px,1.05vw,14.3px)] px-[clamp(7px,0.95vw,13px)]' : 'text-[length:clamp(13px,1.05vw,15px)] px-[clamp(7px,0.95vw,14px)]',
  );
  // Real links get a real href (crawlable); menu toggles stay buttons.
  if (href) return <SpaLink href={href} onClick={onClick} className={cls} color={color}>{label}</SpaLink>;
  const open = chev === '▲';
  return (
    <button
      ref={btnRef} onClick={onClick} onKeyDown={onKeyDown} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}
      aria-expanded={open} aria-controls={open ? controls : undefined} className={cls} style={{ color }}
    >
      {label}
      {chev && <motion.span aria-hidden animate={{ rotate: chev === '▲' ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} className="inline-flex opacity-75"><ChevronDown size={14} strokeWidth={2.5} /></motion.span>}
    </button>
  );
}

export function MegaLink({ name, onClick, hoverColor = '#5B21B6', href }: { name: string; onClick: () => void; hoverColor?: string; href: string }) {
  return (
    <SpaLink
      href={href}
      onClick={onClick}
      className="block cursor-pointer text-[15px] font-medium py-[5.5px] [--c:#340057] hover:[--c:var(--hc)] [transition:transform_var(--t-fast),color_var(--t-fast)] hover:[transform:translateX(3px)] hover:underline underline-offset-4"
      // the colour reads a class-driven variable, so the hover colour still works inline
      color="var(--c)"
      style={{ '--hc': hoverColor }}
    >
      {name}
    </SpaLink>
  );
}

/** The Kids Park logo next to its menu group. */
export function KidsParkLogo({ width }: { width: number }) {
  return <Img src="/images/kids-park/kids-park-logo.webp" alt="" width={900} height={641} placeholder="transparent" style={{ width, height: 'auto', aspectRatio: '900 / 641' }} />;
}
