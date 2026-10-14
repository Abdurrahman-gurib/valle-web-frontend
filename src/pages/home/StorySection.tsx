import { useCatalog } from '../../store/CatalogContext';
import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import { Fwd } from '@/components/ui/arrows';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';
import { paths, useGoto } from '../../lib/nav';

/** A figure that counts up from zero the first time it scrolls into view (instant for reduced motion). */
function CountUp({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();
  const [v, setV] = useState(to); // the prerendered page shows the real figure
  // in the browser, park the figure at zero while it is still below the fold
  useEffect(() => { if (!reduce && !seen) setV(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!seen || reduce) return;
    const c = animate(0, to, { duration: 1.4, ease: [0.2, 0.7, 0.2, 1], onUpdate: setV });
    return () => c.stop();
  }, [seen, reduce, to]);
  return <span ref={ref}>{v.toFixed(decimals)}{suffix}</span>;
}

function Stat({ value, label, color, rule }: { value: React.ReactNode; label: string; color: string; rule: string }) {
  return (
    <div>
      <div className="font-display text-[40px] font-black italic" style={{ color }}>{value}</div>
      <div className="mt-0.5 pt-1.5 font-mono text-[11px] text-valle-purple/65" style={{ borderTop: `3px solid ${rule}` }}>{label}</div>
    </div>
  );
}

/** "Our story": formerly La Vallée des Couleurs narrative + stats. */
export function StorySection() {
  const t = useT();
  const catalog = useCatalog();
  const goto = useGoto();
  return (
    <section id="story" data-screen-label="Our story" className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <div data-reveal-kids="1" className="grid items-center gap-[clamp(24px,4vw,60px)] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <div className="h-[min(520px,68vw)] -rotate-2 overflow-hidden rounded-[20px] bg-valle-lilac">
          <Img src="/images/home-overview.avif" alt={t('Aerial overview of the Vallé valley')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <span className="font-mono text-xs font-semibold tracking-[.16em] text-valle-purple/55">{t('05 · BORN OF NATURE, PURE ADVENTURE')}</span>
          <h2 className="mt-4 mb-0 origin-bottom-left -rotate-4 font-display text-[clamp(34px,4.4vw,58px)] leading-[0.88] font-black tracking-[-0.01em] uppercase italic">
            {t('Formerly La Vallée des Couleurs.')} <span className="text-valle-violet">{t('Forever Vallé.')}</span>
          </h2>
          <p className="mt-5 mb-0 text-base leading-[1.65] text-valle-purple/75">{t("We unearth the true colours of Maurice, so you live the pulse of every breath. Twenty-three hues of volcanic earth, centuries-old ebony trees, free-roaming giant tortoises, and strung above it all, some of the island's wildest ziplines.")}</p>
          <a
            href={paths.story()}
            onClick={(e) => { e.preventDefault(); goto.story(); }}
            className="mt-[18px] inline-flex items-center gap-2 pb-[3px] font-mono text-xs font-bold tracking-[.14em] text-valle-red"
            style={{ textDecoration: 'none', borderBottom: '2px solid #FF3358' }}
          >
            {t('READ THE FULL STORY, FROM THE TEA FIELD OF 1998')} <span aria-hidden><Fwd /></span>
          </a>
          <div className="mt-7 flex flex-wrap gap-[30px]">
            <Stat value={<CountUp to={23} />} label={t('COLOURS OF EARTH')} color="#FF3358" rule="#FF3358" />
            <Stat value={<CountUp to={5.5} decimals={1} suffix=" KM" />} label={t('LONGEST ZIPLINE')} color="#7333FF" rule="#33FF74" />
            <Stat value={<CountUp to={catalog.ACTS.length} />} label={t('EXPERIENCES')} color="#340057" rule="#FFFC33" />
          </div>
        </div>
      </div>
    </section>
  );
}
