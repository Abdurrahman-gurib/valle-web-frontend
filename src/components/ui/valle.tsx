import type { ComponentProps, ReactNode } from 'react';
import { motion } from 'motion/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Img } from '../Img';
import { cn } from '@/lib/utils';

/**
 * VALLÉ building blocks on Tailwind + Motion, shared by the card-based pages.
 * They reproduce the established look (white cards with a lilac ring,
 * Barlow italic headings, Chivo Mono labels, pill buttons) so pages can move
 * to them one at a time without a visual change.
 */

/** White card with the lilac ring that lifts on hover. */
export function ValleCard({ className, children, ...rest }: ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 24px 46px -18px rgba(52,0,87,.4)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn('group flex flex-col overflow-hidden rounded-[18px] bg-white text-valle-purple shadow-[0_0_0_1.5px_#EBE2FF]', className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const valleButton = cva(
  'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full font-sans font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        dark: 'bg-valle-purple text-white hover:bg-valle-violet',
        outline: 'border-[1.5px] border-valle-purple bg-transparent text-valle-purple hover:bg-valle-purple hover:text-white',
        primary: 'bg-valle-red text-white shadow-[0_8px_20px_rgba(255,51,88,.4)] hover:bg-[#D91E44]',
      },
      size: { md: 'py-[13px] text-sm', sm: 'py-[11px] text-[13.5px]', lg: 'w-auto px-7 py-[15px] text-[15px]' },
    },
    defaultVariants: { variant: 'dark', size: 'md' },
  },
);

/** Pill button in the VALLÉ styles: dark (default), outline or primary red. */
export function ValleButton({ className, variant, size, ...rest }: ComponentProps<typeof motion.button> & VariantProps<typeof valleButton>) {
  return <motion.button type="button" whileTap={{ scale: 0.97 }} className={cn(valleButton({ variant, size }), className)} {...rest} />;
}

/** Photo area that zooms gently when its card is hovered. */
export function CardImage({ src, alt, className, onClick, children, position }: { src: string; alt: string; className?: string; onClick?: () => void; children?: ReactNode; position?: string }) {
  return (
    <div onClick={onClick} className={cn('relative aspect-[16/10] overflow-hidden bg-valle-lilac', onClick && 'cursor-zoom-in', className)}>
      <div className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.06]">
        <Img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: position ?? 'center' }} />
      </div>
      {children}
    </div>
  );
}

/** Bulleted line in a card, the bullet in the card's accent colour. */
export function BulletList({ items, color, className }: { items: { t: string }[]; color: string; className?: string }) {
  return (
    <ul className={cn('m-0 list-none p-0', className)}>
      {items.map((it) => (
        <li key={it.t} className="flex items-start gap-[9px] py-[5px] text-sm text-valle-purple/80">
          <span aria-hidden className="shrink-0 font-extrabold" style={{ color }}>●</span>
          <span>{it.t}</span>
        </li>
      ))}
    </ul>
  );
}

/** One price column: mono label above a Barlow figure. */
export function PriceCol({ label, value, size = 23 }: { label: string; value: string; size?: number }) {
  return (
    <div className="flex-1">
      <div className="font-mono text-[9.5px] tracking-[.12em] text-valle-purple/55">{label}</div>
      <div className="mt-0.5 font-display font-black italic" style={{ fontSize: size }}>{value}</div>
    </div>
  );
}

/** Dashed rule above the prices. */
export function PriceRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-3.5 flex gap-3.5 pt-3.5', className)} style={{ borderTop: '1px dashed #D9C9F0' }}>{children}</div>;
}

/** Small pill on a photo ("VIEW DETAILS ↗"). */
export function PhotoPill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('absolute right-3 bottom-3 rounded-full bg-white/90 px-3 py-[7px] font-mono text-[10px] font-bold tracking-[.1em] text-valle-purple', className)}>{children}</span>;
}

/** Card heading in Barlow italic caps. */
export function CardTitle({ children, size = 26, className }: { children: ReactNode; size?: number; className?: string }) {
  return <div className={cn('font-display font-black uppercase italic', className)} style={{ fontSize: size }}>{children}</div>;
}
