import { motion } from 'motion/react';
import { paths, useGoto } from '../../lib/nav';
import { useT } from '../../i18n';
import { BtnLabel } from '@/components/ui/valle';

/** Final CTA banner: "Hold on tight. Are you ready?" */
export function CtaBanner() {
  const t = useT();
  const goto = useGoto();
  return (
    <section data-screen-label="CTA banner" className="mx-auto mt-[clamp(56px,8vw,104px)] max-w-[1320px] px-[clamp(16px,3.5vw,40px)]">
      <div data-reveal="1" className="relative overflow-hidden rounded-3xl bg-valle-purple px-[clamp(24px,5vw,64px)] py-[clamp(48px,7vw,88px)] text-center">
        <svg viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full opacity-25" style={{ transform: 'rotate(-4deg) scale(1.15)' }}>
          <path d="M0,150 L300,150 L340,60 L380,240 L420,150 L700,150 L740,50 L780,250 L820,150 L1200,150" fill="none" stroke="#FFFFFF" style={{ strokeWidth: '5px', strokeLinejoin: 'round' }} />
        </svg>
        <div className="relative">
          <div className="-rotate-4">
            <h2 className="m-0 font-display text-[clamp(40px,6.6vw,92px)] leading-[0.82] font-black tracking-[-0.01em] text-white uppercase italic">
              {t('Hold on tight.')}<br /><span className="text-valle-yellow">{t('Are you ready?')}</span>
            </h2>
          </div>
          <p className="mx-auto mt-5 mb-0 max-w-[44ch] text-base leading-[1.55] text-white/95">{t('Pick a date, build your day, pay when you arrive. No cancellation fee, just show up wild.')}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <motion.a
              href={paths.booking()}
              onClick={(e) => { e.preventDefault(); goto.booking(); }}
              whileTap={{ scale: 0.98 }}
              className="vbtn vbtn-on-dark px-8 text-base"
            >
              <BtnLabel>{t('Book your adventure →')}</BtnLabel>
            </motion.a>
            <motion.a
              href={paths.packages()}
              onClick={(e) => { e.preventDefault(); goto.packages(); }}
              whileTap={{ scale: 0.98 }}
              className="vbtn vbtn-ghost px-8 text-base"
            >
              {t('View packages')}
            </motion.a>
          </div>
        </div>
      </div>
    </section>
  );
}
