import { motion } from 'motion/react';
import { Img } from './Img';
import { paths } from '../lib/nav';
import type { CardModel } from '../lib/card';
import { showsDuration } from '../types';
import { useT } from '../i18n';
import { cn } from '@/lib/utils';

/**
 * The activity card used across the site (Explore and its categories):
 * photo with category badge and price tag, name and pulse, blurb, age line
 * and the add-to-day button. Tailwind with the VALLÉ tokens; Motion lifts it
 * on hover (reduced motion follows the app-wide MotionConfig).
 */
export function ActivityCard({ a, rateTag }: { a: CardModel; rateTag: string }) {
  const t = useT();
  return (
    <motion.div
      onClick={a.open}
      whileHover={{ y: -6, boxShadow: '0 26px 50px -20px rgba(52,0,87,.4)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1.5px_#EBE2FF]"
      data-testid="activity-card"
    >
      <div className="relative h-[195px] bg-valle-lilac">
        <Img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span className="absolute top-3 left-3 -rotate-4 rounded-full px-[11px] py-1.5 font-mono text-[10px] font-bold tracking-[.1em]" style={{ background: a.catColor, color: a.catFg }}>{a.catBadge}</span>
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-valle-yellow px-2.5 py-1.5 font-mono text-[11px] font-bold text-valle-purple shadow-[0_6px_16px_-6px_rgba(0,0,0,.5)]">
          {a.priceLabel}
          <span className="rounded bg-valle-purple px-[5px] py-0.5 text-[9px] tracking-[.06em] text-valle-yellow">{rateTag}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col px-[17px] pt-[15px] pb-[17px] text-valle-purple">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="font-display text-xl font-extrabold uppercase italic">
            <a href={paths.detail(a.id)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); a.open(); }} style={{ color: 'inherit', textDecoration: 'none' }}>{a.name}</a>
          </div>
          <div title={t('Pulse level')} className="text-[10.5px] font-bold tracking-[.13em] whitespace-nowrap" style={{ color: a.pulseColor }}>{a.pulseStr}</div>
        </div>
        <div className="mt-1.5 flex-1 text-[13.5px] leading-normal text-valle-purple/70">{a.blurb}</div>
        <div className="mt-3 pt-[11px] font-mono text-[11px] text-valle-purple/60" style={{ borderTop: '1px dashed #D9C9F0' }}>{showsDuration(a.id) ? `${a.dur} · ${a.age}` : a.age}</div>
        {a.hasAdd && (
          <motion.button
            type="button"
            onClick={a.add}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'mt-[11px] w-full cursor-pointer rounded-full border-[1.5px] py-[11px] font-sans text-[13.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet',
              a.selOn ? 'border-valle-purple bg-valle-purple text-white' : 'border-[#C9B3E8] bg-transparent text-valle-purple hover:border-valle-purple',
            )}
          >
            {a.addLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
