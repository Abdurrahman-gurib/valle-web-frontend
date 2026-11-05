import { motion } from 'motion/react';
import { CarouselArrows, CarouselTrack, carouselKeys, useCarousel } from '@/components/ui/carousel';
import { useCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { useCardModel, type CardModel } from '../../lib/card';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';
import { paths } from '../../lib/nav';
import { useT, isRtl, useLang } from '../../i18n';
import { ValleIcon, iconForActivity } from '@/components/ui/ValleIcon';

const RAIL_IDS = ['zipline', 'quad', 'coloured', 'nepalese', 'waterfalls', 'luge', 'animals', 'bicycle'];

function RailCard({ a, rateTag }: { a: CardModel; rateTag: string }) {
  const t = useT();
  const [, bind] = useHover();
  const [hTick, bindTick] = useHover();
  return (
    <motion.div
      {...bind}
      onClick={() => a.open()}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        cursor: 'pointer', flex: '0 0 auto', width: 'min(330px,80vw)', background: '#FFFFFF',
        borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--s2)', margin: '8px 0 32px',
        // stretches with its slide (flex parents) so every card in the rail is the same height
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* minHeight 0: an aspect-ratio box otherwise grows to the photo's own height, so every photo is the same size */}
      <div style={{ position: 'relative', aspectRatio: '16 / 10', minHeight: 0, flexShrink: 0, overflow: 'hidden', background: '#EBE2FF' }}>
        <Img eager src={a.img} alt={a.name} sizes="(max-width: 640px) 85vw, 360px" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{ position: 'absolute', bottom: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFC33', color: '#340057', fontFamily: "'Chivo Mono',monospace", fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: '7px 10px', boxShadow: 'var(--s1)' }}>
          {a.priceLabel}
          <span style={{ background: '#340057', color: '#FFFC33', borderRadius: 4, padding: '2px 5px', fontSize: 10, letterSpacing: '.06em' }}>{rateTag}</span>
        </span>
        {a.hasAdd && (
          <button
            {...bindTick}
            onClick={(e) => a.add(e)}
            title={a.addLabel}
            aria-label={a.addLabel.replace(/^[+✓]\s*/, '') + ' · ' + a.name}
            aria-pressed={a.selOn}
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
      <div className="p-6 max-sm:p-5" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Chivo Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: '#5B21B6' }}>
            {(() => { const icon = iconForActivity(a.id, a.cat); return icon ? <ValleIcon name={icon} size={22} style={{ color: '#340057' }} /> : null; })()}
            {a.catBadge}
          </span>
          <span title={t('Pulse level')} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: '#340057', whiteSpace: 'nowrap' }}>{a.pulseStr}</span>
        </div>
        <h3 className="v-h3" style={{ marginTop: 8 }}><a href={paths.detail(a.id)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); a.open(); }} style={{ color: 'inherit', textDecoration: 'none' }}>{a.name}</a></h3>
        <div style={{ fontSize: 14, color: 'rgba(52,0,87,.75)', lineHeight: 1.5, marginTop: 8, marginBottom: 16 }}>{a.blurb}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1.5px dashed #D9C9F0', paddingTop: 12 }}>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, color: 'rgba(52,0,87,.75)' }}>{a.meta}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#5B21B6' }}>{t('Details →')}</span>
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
  const { rateBadge: rateTag } = useApp();
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
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.7)', marginRight: 10 }}>{t('03 · FAVOURITES')}</span>
          <CarouselArrows prev={c.prev} next={c.next} canPrev={c.canPrev} canNext={c.canNext} labels={{ prev: t('Scroll back'), next: t('Scroll forward') }} />
        </div>
      </div>
      <div id="vrail" data-reveal="1" style={{ padding: '0 clamp(16px,calc((100vw - 1320px)/2 + 40px),calc((100vw - 1320px)/2 + 40px))' }}>
        <CarouselTrack viewportRef={c.viewportRef} label={t('Go big.') + ' ' + t('Go wild.')} gap="gap-0" className="rail-fade" onKeyDown={carouselKeys(c.prev, c.next, isRtl(lang))}>
          {/* Embla moves each slide with its own transform when it loops, so the slide is a
              plain wrapper: the card's Motion hover transform would otherwise overwrite it. */}
          {/* spacing as slide padding, not gap: a looping carousel ignores gap at the seam, so cards touched there */}
          {items.map((a) => <div key={a.id} className="flex shrink-0 pe-[20px]"><RailCard a={a} rateTag={rateTag} /></div>)}
        </CarouselTrack>
      </div>
    </section>
  );
}
