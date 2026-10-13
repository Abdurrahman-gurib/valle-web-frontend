import { showsDuration } from '../../types';
import { motion } from 'motion/react';
import { CarouselArrows, CarouselTrack, carouselKeys, useCarousel } from '@/components/ui/carousel';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { useCardModel, type CardModel } from '../../lib/card';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';
import { paths } from '../../lib/nav';
import { useT, fwd, isRtl, useLang } from '../../i18n';

const RAIL_IDS = ['zipline', 'quad', 'coloured', 'nepalese', 'waterfalls', 'luge', 'animals', 'bicycle'];

function RailCard({ a, rateTag }: { a: CardModel; rateTag: string }) {
  const t = useT();
  const [h, bind] = useHover();
  const [hTick, bindTick] = useHover();
  return (
    <motion.div
      {...bind}
      onClick={() => a.open()}
      whileHover={{ y: -6, boxShadow: '0 26px 50px -20px rgba(52,0,87,.4)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{
        cursor: 'pointer', flex: '0 0 auto', width: 'min(330px,80vw)', background: '#FFFFFF',
        borderRadius: 16, overflow: 'hidden', boxShadow: '0 0 0 1.5px #EBE2FF', margin: '8px 0 24px',
      }}
    >
      <div style={{ position: 'relative', height: 225, background: '#EBE2FF' }}>
        <Img src={a.img} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{ position: 'absolute', top: 12, left: 12, background: a.catColor, color: a.catFg, fontFamily: "'Chivo Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.1em', borderRadius: 999, padding: '6px 11px', transform: 'rotate(-4deg)' }}>{a.catBadge}</span>
        <span style={{ position: 'absolute', bottom: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFC33', color: '#340057', fontFamily: "'Chivo Mono',monospace", fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: '7px 10px', boxShadow: '0 6px 16px -6px rgba(0,0,0,.5)' }}>
          {a.priceLabel}
          <span style={{ background: '#340057', color: '#FFFC33', borderRadius: 4, padding: '2px 5px', fontSize: 9, letterSpacing: '.06em' }}>{rateTag}</span>
        </span>
        {a.hasAdd && (
          <button
            {...bindTick}
            onClick={(e) => a.add(e)}
            title={a.addLabel}
            style={{
              position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 999, border: '2px solid #FFFFFF',
              background: a.selOn ? '#33FF74' : 'rgba(52,0,87,.5)', color: a.selOn ? '#340057' : '#FFFFFF',
              fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,.3)', padding: 0, lineHeight: 1,
              ...(hTick ? { transform: 'scale(1.15)' } : undefined),
            }}
          >
            {a.selOn ? '✓' : '+'}
          </button>
        )}
      </div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 21, textTransform: 'uppercase' }}><a href={paths.detail(a.id)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); a.open(); }} style={{ color: 'inherit', textDecoration: 'none' }}>{a.name}</a></div>
          <div title={t('Pulse level')} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: a.pulseColor, whiteSpace: 'nowrap' }}>{a.pulseStr}</div>
        </div>
        <div style={{ fontSize: 13.5, color: 'rgba(52,0,87,.68)', lineHeight: 1.5, marginTop: 6, minHeight: 40 }}>{a.blurb}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: '1px dashed #D9C9F0', paddingTop: 12 }}>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, color: 'rgba(52,0,87,.6)' }}>{showsDuration(a.id) ? `${a.dur} · ${a.age}` : a.age}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7333FF' }}>{t('Details →')}</span>
        </div>
      </div>
    </motion.div>
  );
}

/** "Go big. Go wild.": auto-advancing horizontal rail of the park classics. */
export function ClassicsRail() {
  const t = useT();
  const lang = useLang();
  const { ACTS } = useCatalog();
  const { rateTag } = useApp();
  const card = useCardModel();
  const c = useCarousel({ autoplayMs: 3500, loop: true });

  const items = RAIL_IDS
    .map((id) => ACTS.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => card(a));

  return (
    <section style={{ padding: 'clamp(56px,8vw,104px) 0 0' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,3.5vw,40px)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 28, marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.6vw,64px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>
          {t('Go big.')} <span style={{ color: '#FF3358' }}>{t('Go wild.')}</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)', marginRight: 10 }}>{t('03 · FAVOURITES')}</span>
          <CarouselArrows prev={c.prev} next={c.next} canPrev={c.canPrev} canNext={c.canNext} labels={{ prev: t('Scroll back'), next: t('Scroll forward') }} />
        </div>
      </div>
      <div id="vrail" data-reveal="1" style={{ padding: '0 clamp(16px,calc((100vw - 1320px)/2 + 40px),calc((100vw - 1320px)/2 + 40px))' }}>
        <CarouselTrack viewportRef={c.viewportRef} label={t('Go big.') + ' ' + t('Go wild.')} gap="gap-[18px]" onKeyDown={carouselKeys(c.prev, c.next, isRtl(lang))}>
          {items.map((a) => <RailCard key={a.id} a={a} rateTag={rateTag} />)}
        </CarouselTrack>
      </div>
    </section>
  );
}
