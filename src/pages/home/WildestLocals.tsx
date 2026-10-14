import { motion } from 'motion/react';
import { paths, useGoto } from '../../lib/nav';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';

/** Full-bleed tortoise banner. */
export function WildestLocals() {
  const t = useT();
  const goto = useGoto();
  return (
    <section className="relative mt-[clamp(48px,7vw,88px)] flex min-h-[min(72vh,560px)] items-center overflow-hidden bg-valle-deep">
      <Img
        src="/images/valle-giant-tortoise-park-mauritius.avif"
        alt={t('Giant tortoise roaming the valley floor at Vallé')}
        surface="dark"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(31,0,51,.86)_0%,rgba(31,0,51,.42)_55%,rgba(31,0,51,.12)_100%)]" />
      <div data-reveal="1" className="relative mx-auto w-full max-w-[1320px] px-[clamp(16px,3.5vw,40px)] py-[clamp(48px,8vw,96px)]">
        <div className="font-mono text-xs font-semibold tracking-[.26em] text-valle-green">{t("IT'S IN OUR NATURE")}</div>
        <div className="mt-4 -rotate-4 origin-bottom-left">
          <h2 className="m-0 font-display text-[clamp(38px,6vw,88px)] leading-[0.82] font-black tracking-[-0.01em] text-white uppercase italic">
            {t('Meet the')}<br /><span className="text-valle-green">{t('wildest')}</span> {t('locals')}
          </h2>
        </div>
        <p className="mt-5 mb-0 max-w-[44ch] text-[clamp(14.5px,1.6vw,17px)] leading-[1.55] text-white/90">
          {t('Century-old giant tortoises, curious deer and tropical birdlife roam the valley floor. Say bonzour on your way to the ziplines.')}
        </p>
        <motion.a
          href={paths.detail('animals')}
          onClick={(e) => { e.preventDefault(); goto.detail('animals'); }}
          whileHover={{ y: -2}}
          whileTap={{ scale: 0.97 }}
          className="mt-6 inline-block cursor-pointer rounded-full bg-valle-green px-[30px] py-[15px] text-[15px] font-bold text-valle-purple no-underline"
          style={{ textDecoration: 'none' }}
        >
          {t('Meet the animals →')}
        </motion.a>
      </div>
    </section>
  );
}
