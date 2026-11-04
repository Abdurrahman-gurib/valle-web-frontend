import { useEffect, useRef, useState } from 'react';
import { PULSE_NAMES } from '../../../lib/card';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useHover } from '../../../hooks/useHover';
import { Img } from '../../../components/Img';
import { Stripes } from '../../../components/Stripes';
import type { MapGallery, MapShot } from '../../../data/mapGalleries';
import { useT } from '../../../i18n';
import { GLASS, GlassBtn, HEAD, MONO, Pulse, WallArrow } from './glass';

function GalleryTile({ s, onClick, big }: { s: MapShot; onClick: () => void; big?: boolean }) {
  const [h, bind] = useHover();
  const t = useT();
  return (
    <button
      {...bind}
      onClick={onClick}
      style={{
        border: '1px solid rgba(255,255,255,.14)', padding: 0, background: 'rgba(255,255,255,.04)', cursor: 'pointer', position: 'relative',
        borderRadius: 14, overflow: 'hidden', scrollSnapAlign: 'start', gridRow: big ? '1 / span 2' : undefined, gridColumn: big ? 'span 2' : undefined,
        boxShadow: h ? '0 18px 40px -18px rgba(0,0,0,.8)' : 'none', transition: 'box-shadow .3s ease',
      }}
    >
      <Img src={s.src} alt={`${t(s.tag)}: ${t(s.cap)}`} surface="dark" placeholder="#2E0A4E" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%', display: 'block', transform: h ? 'scale(1.06)' : 'scale(1)', transition: 'transform .5s ease' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.85), rgba(31,0,51,0) 55%)', opacity: h ? 1 : 0.85, transition: 'opacity .3s' }} />
      <span style={{ position: 'absolute', top: 8, right: 8, ...GLASS, borderRadius: 999, padding: '3px 8px', fontSize: 9 }}><Pulse n={s.thrill} size={9} /></span>
      <span style={{ position: 'absolute', left: 10, right: 10, bottom: 9, textAlign: 'left' }}>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.1em', color: '#FFFC33', fontWeight: 700, display: 'block' }}>{t(s.tag)}</span>
        {big && <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 16, color: '#FFFFFF', textTransform: 'uppercase', lineHeight: 1.05, display: 'block', marginTop: 4 }}>{t(s.cap)}</span>}
      </span>
    </button>
  );
}

/** The scrolling two-row photo wall under the map; a tile opens the lightbox at that photo. */
export function PhotoWall({ gallery, onOpen }: { gallery: MapGallery; onOpen: (i: number) => void }) {
  const isMobile = useIsMobile();
  const t = useT();
  const wall = useRef<HTMLDivElement | null>(null);
  const [wallPos, setWallPos] = useState<'start' | 'mid' | 'end'>('start');
  const scrollWall = (d: number) => { const el = wall.current; if (el) el.scrollBy({ left: d * el.clientWidth * 0.8, behavior: 'smooth' }); };
  const onWallScroll = () => { const el = wall.current; if (!el) return; setWallPos(el.scrollLeft < 8 ? 'start' : el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 ? 'end' : 'mid'); };
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', color: '#33FF74' }}>{t(gallery.eyebrow)}</span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.12em', color: 'rgba(255,255,255,.55)' }}>{t('{n} PHOTOS · TAP TO OPEN', { n: gallery.shots.length })}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div ref={wall} dir="ltr" onScroll={onWallScroll} style={{ display: 'grid', gridTemplateRows: `repeat(2, ${isMobile ? 124 : 156}px)`, gridAutoFlow: 'column', gridAutoColumns: isMobile ? '186px' : '234px', gap: 10, overflowX: 'auto', padding: '2px 2px 12px', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', scrollBehavior: 'smooth' }}>
          {gallery.shots.map((s, i) => <GalleryTile key={s.src} s={s} big={i === 0} onClick={() => onOpen(i)} />)}
        </div>
        {wallPos !== 'start' && <WallArrow side="left" onClick={() => scrollWall(-1)} />}
        {wallPos !== 'end' && <WallArrow side="right" onClick={() => scrollWall(1)} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 2 }}>
        <GlassBtn small label={t('‹  Previous')} onClick={() => scrollWall(-1)} />
        <GlassBtn small label={t('Next photos  ›')} onClick={() => scrollWall(1)} />
      </div>
    </div>
  );
}

/** Photo view in the Vallé template: eyebrow, tilted headline, copy, pulse level, tagged photo and thumbnails. */
export function ValleLightbox({ g, idx, onClose, onStep, onPick, cta, onCta }: { g: MapGallery; idx: number; onClose: () => void; onStep: (d: number) => void; onPick: (i: number) => void; cta: string; onCta: () => void }) {
  const s = g.shots[idx];
  const isMobile = useIsMobile();
  const [hLead, bindLead] = useHover();
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, onStep]);
  const navBtn = (d: number, side: 'left' | 'right') => (
    <button onClick={(e) => { e.stopPropagation(); onStep(d); }} aria-label={d < 0 ? t('Previous photo') : t('Next photo')} style={{ ...GLASS, position: 'absolute', top: '50%', [side]: 14, transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: 999, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{d < 0 ? '‹' : '›'}</button>
  );
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,0,40,.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', overflowY: 'auto', padding: 'clamp(10px,3vw,40px)', animation: 'vfade .2s ease both' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', background: '#340057', borderRadius: 26, overflow: 'hidden', boxShadow: '0 50px 120px -40px rgba(0,0,0,.9)', animation: 'vfadeup .3s ease both' }}>
        <Stripes height={12} />
        <div style={{ padding: 'clamp(18px,3vw,34px)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px' }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', color: '#33FF74' }}>{t(g.eyebrow)}</span>
              <div style={{ transform: 'rotate(-3deg)', transformOrigin: 'left bottom', marginTop: 12 }}>
                <h2 style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.4vw,58px)', lineHeight: 0.84, margin: 0, textTransform: 'uppercase', color: '#FFFFFF' }}>
                  {t(g.t1)}<br /><span style={{ color: '#FFFC33' }}>{t(g.t2)}</span>
                </h2>
              </div>
            </div>
            <div style={{ flex: '1 1 300px', maxWidth: 460 }}>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: 0 }}>{t(g.copy)}</p>
              <div style={{ ...GLASS, display: 'inline-flex', alignItems: 'center', gap: 12, borderRadius: 999, padding: '8px 16px 8px 14px', marginTop: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', opacity: 0.8 }}>{t('THRILL WITH VALLÉ')}</span>
                <Pulse n={s.thrill} />
                <span style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 13, color: '#FFFC33', textTransform: 'uppercase' }}>{t(PULSE_NAMES[s.thrill])}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, position: 'relative', height: isMobile ? 'min(62vh,420px)' : 'min(58vh,560px)', borderRadius: 18, overflow: 'hidden', background: '#260040' }}>
            <Img key={s.src} src={s.src} alt={`${t(s.tag)}: ${t(s.cap)}`} priority surface="dark" {...bindLead} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .7s ease', transform: hLead ? 'scale(1.03)' : 'scale(1)', animation: 'vfade .35s ease both' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 20px', background: 'linear-gradient(to top,rgba(31,0,51,.88),transparent)' }}>
              <span style={{ background: '#D6173F', color: '#FFFFFF', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', borderRadius: 999, padding: '6px 11px' }}>{t(s.tag)}</span>
              <div style={{ fontFamily: HEAD, fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(17px,2vw,23px)', color: '#FFFFFF', marginTop: 9, textTransform: 'uppercase', lineHeight: 1.05 }}>{t(s.cap)}</div>
            </div>
            <span style={{ ...GLASS, position: 'absolute', top: 12, right: 12, borderRadius: 999, padding: '6px 12px', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.1em' }}>{idx + 1} / {g.shots.length}</span>
            {navBtn(-1, 'left')}
            {navBtn(1, 'right')}
          </div>

          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, padding: '2px 0 6px', scrollbarWidth: 'none' }}>
            {g.shots.map((sh, i) => (
              <button key={sh.src} onClick={() => onPick(i)} aria-label={t(sh.tag)} style={{ flexShrink: 0, width: 92, height: 62, borderRadius: 10, overflow: 'hidden', padding: 0, cursor: 'pointer', border: '2px solid ' + (i === idx ? '#FFFC33' : 'rgba(255,255,255,.12)'), opacity: i === idx ? 1 : 0.65, transition: 'all .2s', background: '#260040' }}>
                <Img src={sh.src} alt="" surface="dark" placeholder="#2E0A4E" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(255,255,255,.6)' }}>{t(g.foot)}</span>
            <GlassBtn primary label={cta} onClick={onCta} style={{ marginLeft: 'auto', padding: '14px 26px', fontSize: 14.5 }} />
          </div>
        </div>
        <button onClick={onClose} aria-label={t('Close')} style={{ position: 'absolute', top: 22, right: 18, width: 38, height: 38, borderRadius: 999, border: 0, background: '#FFFC33', color: '#340057', fontWeight: 800, cursor: 'pointer', fontSize: 18, boxShadow: '0 8px 20px rgba(0,0,0,.4)' }}>×</button>
      </div>
    </div>
  );
}
