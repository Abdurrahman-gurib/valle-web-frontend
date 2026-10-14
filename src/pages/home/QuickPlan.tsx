import { motion } from 'motion/react';
import { paths, useGoto } from '../../lib/nav';
import { Img } from '../../components/Img';
import { useCatalog } from '../../store/CatalogContext';
import type { CatKey } from '../../types';
import { _t, useT } from '../../i18n';

interface WayCard { cat: CatKey; num: string; img: string; alt: string; title: string; sub: string; bg: string; gradient: string; light: boolean }

const WAYS: WayCard[] = [
  { cat: 'adventure', num: '01', img: '/images/valle-zipline-adventure-mauritius.avif', alt: _t('Adventure'), title: _t('Adventure'), sub: _t('Go big. Go wild: ziplines, quad and luge.'), bg: '#FF3358', gradient: 'linear-gradient(to top, rgba(233,28,69,.96) 12%, rgba(233,28,69,.6) 34%, rgba(31,0,51,0) 62%)', light: true },
  { cat: 'nature', num: '02', img: '/images/valle-waterfall-nature-trail-mauritius.avif', alt: _t('Nature'), title: _t('Nature'), sub: _t('Waterfalls, coloured earth, the serene side.'), bg: '#33FF74', gradient: 'linear-gradient(to top, rgba(38,224,103,.97) 12%, rgba(38,224,103,.6) 34%, rgba(31,0,51,0) 62%)', light: false },
  { cat: 'kids', num: '03', img: '/images/valle-giant-tortoise-park-mauritius.avif', alt: _t('Kids Park'), title: _t('Kids Park'), sub: _t('Mini quads, pirate ships, gentle first thrills.'), bg: '#FFFC33', gradient: 'linear-gradient(to top, rgba(250,246,44,.97) 12%, rgba(250,246,44,.6) 34%, rgba(31,0,51,0) 62%)', light: false },
  { cat: 'tours', num: '04', img: '/images/valle-quad-bike-adventure-mauritius.avif', alt: _t('Tours and Groups'), title: _t('Tours & Groups'), sub: _t('Expeditions, team building, private days out.'), bg: '#7333FF', gradient: 'linear-gradient(to top, rgba(101,38,240,.96) 12%, rgba(101,38,240,.6) 34%, rgba(31,0,51,0) 62%)', light: true },
];

function WayCardEl({ w, count }: { w: WayCard; count: number }) {
  const t = useT();
  const goto = useGoto();
  return (
    <motion.a
      href={paths.explore(w.cat)}
      onClick={(e) => { e.preventDefault(); goto.explore(w.cat); }}
      whileHover={{ y: -6, rotate: -1, boxShadow: '0 26px 50px -18px rgba(52,0,87,.5)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative block h-[400px] cursor-pointer overflow-hidden rounded-[18px] text-inherit"
      style={{ background: w.bg, textDecoration: 'none' }}
    >
      <Img src={w.img} alt={t('{name} at Vallé Advenature™ Park', { name: t(w.alt) })} placeholder={w.bg} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div className="absolute inset-0" style={{ background: w.gradient }} />
      <span className="absolute top-3.5 left-3.5 -rotate-4 rounded-full bg-white/95 px-[11px] py-1.5 font-mono text-[11px] font-bold text-valle-purple">{w.num}</span>
      <div className={'absolute right-5 bottom-[18px] left-5 ' + (w.light ? 'text-white' : 'text-valle-purple')}>
        <div className="origin-bottom-left -rotate-4 font-display text-[30px] font-black uppercase italic">{t(w.title)}</div>
        <div className={'mt-[7px] text-[13.5px] leading-[1.45] ' + (w.light ? 'opacity-95' : 'opacity-90')}>{t(w.sub)}</div>
        <div className="mt-3 inline-block pt-2.5 font-mono text-[11.5px] font-bold tracking-[.08em]" style={{ borderTop: '1px dashed ' + (w.light ? 'rgba(255,255,255,.5)' : 'rgba(52,0,87,.45)') }}>{t('{n} EXPERIENCES →', { n: count })}</div>
      </div>
    </motion.a>
  );
}

/** "Choose your day": the four ways into the park (adventure / nature / kids / tours). */
export function QuickPlan() {
  const t = useT();
  const { ACTS } = useCatalog();
  return (
    <section className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <div className="mb-[30px] flex flex-wrap items-baseline justify-between gap-5 pb-7" style={{ borderBottom: '2px solid #340057' }}>
        <h2 className="m-0 origin-bottom-left -rotate-4 font-display text-[clamp(30px,4.6vw,64px)] leading-[0.85] font-black tracking-[-0.01em] uppercase italic">{t('Choose your day')}</h2>
        <span className="font-mono text-xs font-semibold tracking-[.16em] text-valle-purple/55">{t('01 · FOUR WAYS IN')}</span>
      </div>
      <div data-reveal-kids="1" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(235px,1fr))]">
        {WAYS.map((w) => <WayCardEl key={w.cat} w={w} count={ACTS.filter((a) => a.cat === w.cat).length} />)}
      </div>
    </section>
  );
}
