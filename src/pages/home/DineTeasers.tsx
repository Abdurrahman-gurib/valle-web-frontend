import { motion } from 'motion/react';
import { useCatalog } from '../../store/CatalogContext';
import { paths, useGoto } from '../../lib/nav';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';

function RestoTeaser({ href, onGo, img, alt, badge, name, blurb }: { href: string; onGo: () => void; img: string; alt: string; badge: string; name: string; blurb: string }) {
  const t = useT();
  return (
    <motion.a
      href={href}
      onClick={(e) => { e.preventDefault(); onGo(); }}
      whileHover={{ y: -5}}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group relative block min-h-[400px] cursor-pointer overflow-hidden rounded-[20px] bg-valle-deep text-inherit"
      style={{ textDecoration: 'none' }}
    >
      <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
        <Img src={img} alt={alt} surface="dark" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,0,51,.92)] to-[rgba(31,0,51,.05)] to-55%" />
      <span className="absolute top-4 left-4 -rotate-4 rounded-full bg-valle-yellow px-[13px] py-[7px] font-mono text-[10px] font-bold tracking-[.1em] text-valle-purple">{badge}</span>
      <div className="absolute right-6 bottom-[22px] left-6 text-white">
        <div className="origin-bottom-left -rotate-4 font-display text-4xl font-black uppercase italic">{name}</div>
        <div className="mt-2 max-w-[44ch] text-sm leading-normal opacity-90">{blurb}</div>
        <div className="mt-2.5 font-mono text-[11px] font-bold tracking-[.08em] text-valle-yellow">{t('SEE THE RESTAURANT →')}</div>
      </div>
    </motion.a>
  );
}

/** "Taste the soul": the two restaurant teaser cards. */
export function DineTeasers() {
  const t = useT();
  const catalog = useCatalog();
  const goto = useGoto();
  const cham = catalog.RESTOS['chamouze'];
  const cit = catalog.RESTOS['citronelle'];
  if (!cham || !cit) return null;
  return (
    <section id="dine" data-screen-label="Restaurants" className="mx-auto max-w-[1320px] px-[clamp(16px,3.5vw,40px)] pt-[clamp(56px,8vw,104px)]">
      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-5 pb-7" style={{ borderBottom: '2px solid #340057' }}>
        <h2 className="m-0 origin-bottom-left -rotate-4 font-display text-[clamp(30px,4.6vw,64px)] leading-[0.85] font-black tracking-[-0.01em] uppercase italic">{t('Taste the soul')}</h2>
        <span className="font-mono text-xs font-semibold tracking-[.16em] text-valle-purple/70">{t('04 · DINE IN THE VALLEY')}</span>
      </div>
      <div data-reveal-kids="1" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <RestoTeaser href={paths.resto('chamouze')} onGo={() => goto.resto('chamouze')} img={cham.img} alt={t('Le Chamouzé restaurant overlooking the waterfall')} badge={t('WATERFALL DINING')} name="Le Chamouzé" blurb={t('Mauritian–European fusion beside a cascading waterfall. Open daily 11:30 – 16:30 · menus Rs 700 – 4,250.')} />
        <RestoTeaser href={paths.resto('citronelle')} onGo={() => goto.resto('citronelle')} img={cit.img} alt={t('La Citronelle riverside restaurant')} badge={t('RIVERSIDE · EVENTS TO 400')} name="La Citronelle" blurb={t('Refined Indian cuisine in a rustic lakeside setting. 11:30 – 16:30 · à la carte from Rs 600.')} />
      </div>
    </section>
  );
}
