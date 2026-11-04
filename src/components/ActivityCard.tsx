import { motion } from 'motion/react';
import { Img } from './Img';
import { paths } from '../lib/nav';
import type { CardModel } from '../lib/card';
import { useT } from '../i18n';
import { cn } from '@/lib/utils';
import { KP, KP_CONFETTI, KP_FONT } from './KidsPark';

/**
 * The activity card used across the site (Explore and its categories):
 * photo with category badge and price tag, name and pulse, blurb, age line
 * and the add-to-day button. Tailwind with the VALLÉ tokens; Motion lifts it
 * on hover (reduced motion follows the app-wide MotionConfig).
 */
/** The add button's accessible name: its visible words plus the activity ("Add to My Day · Buggy"). */
const addName = (a: CardModel) => a.addLabel.replace(/^[+✓]\s*/, '') + ' · ' + a.name;

export function ActivityCard({ a, rateTag, eager, kids }: { a: CardModel; rateTag: string; eager?: boolean; kids?: boolean }) {
  const t = useT();
  if (kids) return <KidsActivityCard a={a} rateTag={rateTag} eager={eager} />;
  return (
    <motion.div
      onClick={a.open}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[20px] bg-white shadow-s2 relative after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] hover:after:opacity-100 after:shadow-[0_0_0_1.5px_#D9C9F0,0_24px_46px_-26px_rgba(52,0,87,.45)]"
      data-testid="activity-card"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-valle-lilac">
        <div className="size-full transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          <Img eager={eager} src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <span className="absolute end-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-valle-yellow px-2.5 py-1.5 font-mono text-[11px] font-bold text-valle-purple shadow-s1">
          {a.priceLabel}
          <span className="rounded bg-valle-purple px-[5px] py-0.5 text-[10px] tracking-[.06em] text-valle-yellow">{rateTag}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6 max-sm:p-5 text-valle-purple">
        <div className="flex items-center justify-between gap-2.5">
          <span className="font-mono text-[11px] font-bold tracking-[.12em] text-valle-link">{a.catBadge}</span>
          <span title={t('Pulse level')} className="text-[11px] font-bold tracking-[.13em] whitespace-nowrap text-valle-purple">{a.pulseStr}</span>
        </div>
        <h3 className="v-h3 mt-2">
          <a href={paths.detail(a.id)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); a.open(); }} style={{ color: 'inherit', textDecoration: 'none' }}>{a.name}</a>
        </h3>
        <p className="mt-2 mb-0 text-[14px] leading-[1.5] text-valle-purple/75">{a.blurb}</p>
        <div className="mt-auto pt-4">
          <div className="pt-3 font-mono text-[11px] text-valle-purple/75" style={{ borderTop: '1.5px dashed #D9C9F0' }}>{a.meta}</div>
          {a.hasAdd ? (
            <motion.button
              type="button"
              onClick={a.add}
              aria-label={addName(a)}
              aria-pressed={a.selOn}
              whileTap={{ scale: 0.98 }}
              className={cn('vbtn vbtn-sm vbtn-block mt-3', a.selOn ? 'vbtn-primary' : 'vbtn-secondary')}
            >
              {a.addLabel}
            </motion.button>
          ) : (
            <div className="mt-3 flex min-h-[40px] items-center justify-center rounded-full bg-valle-tint px-4 text-[13.5px] font-semibold text-valle-purple/80">
              {a.mode === 'kiosk' ? t('Pay at the kiosk on the day') : t('Included with park entry')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** The Kids Park take on the card: purple with a lime frame, sunflower price, chunky rounded button. */
function KidsActivityCard({ a, rateTag, eager }: { a: CardModel; rateTag: string; eager?: boolean }) {
  const t = useT();
  return (
    <motion.div
      onClick={a.open}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[26px] text-white"
      style={{ background: KP.purple, boxShadow: `0 0 0 4px ${KP.lime}, 0 18px 36px -20px rgba(58,10,70,.6)` }}
      data-testid="activity-card"
    >
      <div className="relative h-[195px]" style={{ background: KP.lime }}>
        <Img eager={eager} src={a.img} alt={a.name} placeholder={KP.lime} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] shadow-[0_6px_16px_-6px_rgba(0,0,0,.5)]" style={{ ...KP_FONT, background: KP.yellow, color: '#3A0A46' }}>
          {a.priceLabel}
          <span className="rounded-full px-[6px] py-0.5 font-mono text-[10px] tracking-[.06em]" style={{ background: KP.purple, color: KP.yellow }}>{rateTag}</span>
        </span>
      </div>
      <div aria-hidden className="h-[14px]" style={KP_CONFETTI} />
      <div className="flex flex-1 flex-col px-[17px] pt-[13px] pb-[17px]">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="text-xl" style={KP_FONT}>
            <a href={paths.detail(a.id)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); a.open(); }} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{a.name}</a>
          </div>
          <div title={t('Pulse level')} className="text-[10.5px] font-bold tracking-[.13em] whitespace-nowrap" style={{ color: KP.yellow }}>{a.pulseStr}</div>
        </div>
        <div className="mt-1.5 flex-1 text-[13.5px] leading-normal text-white/85">{a.blurb}</div>
        <div className="mt-3 pt-[11px] font-mono text-[11px] text-white/80" style={{ borderTop: `2px dotted ${KP.lime}` }}>{a.meta}</div>
        {a.hasAdd && (
          <motion.button
            type="button"
            onClick={a.add}
              aria-label={addName(a)}
              aria-pressed={a.selOn}
            whileTap={{ scale: 0.97 }}
            className="mt-3 w-full cursor-pointer rounded-full border-0 py-[12px] text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ ...KP_FONT, background: a.selOn ? KP.lime : KP.yellow, color: '#3A0A46', boxShadow: `0 4px 0 ${a.selOn ? '#6E8F1A' : '#B07C00'}` }}
          >
            {a.addLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
