import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BtnLabel } from '@/components/ui/valle';
import { CarouselArrows, CarouselTrack, carouselKeys, useCarousel } from '@/components/ui/carousel';
import { useHover } from '../../hooks/useHover';
import { Stripes } from '../../components/Stripes';
import { Img } from '../../components/Img';
import type { Activity, Gallery, GalleryShot } from '../../types';
import { isRtl, useLang, useT } from '../../i18n';
import { BARLOW, MONO, coverImg } from './shared';

/** Dark gradient at the foot of a photo, under its tag and caption. */
const captionShade = (padding: string, alpha: string): CSSProperties => ({ position: 'absolute', left: 0, right: 0, bottom: 0, padding, background: `linear-gradient(to top,rgba(31,0,51,${alpha}),transparent)` });

function GalRestShot({ g }: { g: GalleryShot }) {
  const [h, hb] = useHover();
  return (
    <div style={{ position: 'relative', minWidth: 0, aspectRatio: '4 / 3', borderRadius: 18, overflow: 'hidden' }}>
      <Img eager
        src={g.src}
        alt={`${g.tag}: ${g.cap}`}
        sizes="(max-width: 768px) 50vw, 25vw"
        surface="dark"
        {...hb}
        style={{ ...coverImg, objectPosition: 'center 32%', transition: 'transform .5s cubic-bezier(.2,.8,.2,1)', ...(h ? { transform: 'scale(1.04)' } : undefined) }}
      />
      <div style={captionShade('14px 16px', '.82')}>
        <span style={{ background: '#33FF74', color: '#340057', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', borderRadius: 999, padding: '5px 10px' }}>{g.tag}</span>
        <div style={{ fontSize: 13.5, color: '#FFFFFF', marginTop: 8, lineHeight: 1.35 }}>{g.cap}</div>
      </div>
    </div>
  );
}

/** The gallery's lead photo, zooming slightly on hover. */
function GalLeadShot({ g }: { g: GalleryShot }) {
  const [h, hb] = useHover();
  return (
    <div style={{ position: 'relative', minWidth: 0, minHeight: 'clamp(260px,38vw,520px)', borderRadius: 18, overflow: 'hidden' }}>
      <Img
        src={g.src}
        alt={`${g.tag}: ${g.cap}`}
        surface="dark"
        {...hb}
        style={{ ...coverImg, objectPosition: g.pos || '50% 18%', transition: 'transform .7s ease', ...(h ? { transform: 'scale(1.04)' } : undefined) }}
      />
      <div style={captionShade('18px 20px', '.85')}>
        <span style={{ background: '#D6173F', color: '#FFFFFF', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', borderRadius: 999, padding: '6px 11px' }}>{g.tag}</span>
        <div style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(17px,2vw,23px)', color: '#FFFFFF', marginTop: 9, textTransform: 'uppercase', lineHeight: 1.05 }}>{g.cap}</div>
      </div>
    </div>
  );
}

/**
 * The activity's clip, in place of the gallery's lead photo: muted, looping and
 * inline, playing only while on screen. It never starts by itself for
 * prefers-reduced-motion users (the poster still shows; the button plays it),
 * and the pause button always stays visible.
 */
function GalleryVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const t = useT();
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  // the clip is not fetched until it is about to scroll into view (the poster shows until then)
  const [near, setNear] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v || near) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: '300px 0px' });
    io.observe(v);
    return () => io.disconnect();
  }, [near]);
  useEffect(() => {
    const v = ref.current;
    if (!v || !near) return;
    v.muted = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      if (userPaused.current) return;
      if (e.isIntersecting) v.play().catch(() => undefined);
      else v.pause();
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [near]);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (!v.getAttribute('src')) { v.src = src; setNear(true); }
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => undefined);
    } else {
      userPaused.current = true;
      v.pause();
    }
  };
  return (
    <div style={{ position: 'relative', width: '100%', minWidth: 0, aspectRatio: '848 / 406', minHeight: 'clamp(200px,30vw,520px)', borderRadius: 18, overflow: 'hidden', background: '#1F0033' }}>
      <video
        ref={ref}
        data-testid="activity-video"
        src={near ? src : undefined}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        style={{ ...coverImg, display: 'block' }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t('Pause the video') : t('Play the video')}
        title={playing ? t('Pause the video') : t('Play the video')}
        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ position: 'absolute', top: 12, insetInlineEnd: 12, width: 44, height: 44, borderRadius: 999, border: '1.5px solid rgba(255,255,255,.7)', background: 'rgba(31,0,51,.62)', backdropFilter: 'blur(6px)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
      >{playing ? <Pause size={18} strokeWidth={2.5} aria-hidden /> : <Play size={18} strokeWidth={2.5} aria-hidden />}</button>
    </div>
  );
}

/**
 * The activity's photo story: a lead photo (or the activity's clip), then
 * every other shot in a carousel. Never repeats the page's cover photo.
 */
export function DetailGallery({ act, gal, onBook }: { act: Activity; gal: Gallery; onBook: () => void }) {
  const t = useT();
  const lang = useLang();
  const galCar = useCarousel();
  const shots = gal.shots.filter((s) => s.src !== act.img);
  const video = gal.video;
  const lead = shots[0];
  if (!video && !lead) return null;
  const rest = video ? shots : shots.slice(1);
  return (
    <div style={{ marginTop: 'clamp(40px,5.5vw,64px)', background: '#340057', borderRadius: 26, overflow: 'hidden' }}>
      <Stripes height={12} />
      <div style={{ padding: 'clamp(22px,3.4vw,38px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', color: '#33FF74' }}>{gal.eyebrow}</span>
            <div style={{ transform: 'rotate(-3deg)', transformOrigin: 'left bottom', marginTop: 12 }}>
              <h2 style={{ fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.4vw,58px)', lineHeight: 0.84, margin: 0, textTransform: 'uppercase', color: '#FFFFFF' }}>
                {gal.t1}<br /><span style={{ color: '#FFFC33' }}>{gal.t2}</span>
              </h2>
            </div>
          </div>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: 0, maxWidth: '44ch' }}>{gal.copy}</p>
        </div>
        <div style={{ marginTop: 22 }}>
          {video ? <GalleryVideo src={video.src} poster={video.poster} label={t('Video: {name}', { name: act.name })} /> : <GalLeadShot g={lead} />}
          {/* the rest of the shoot: 4 across on desktop, 2 on a phone, swipe or arrows for more */}
          <div style={{ marginTop: 12 }} data-testid="gallery-carousel">
            <CarouselTrack viewportRef={galCar.viewportRef} label={act.name} gap="gap-3" onKeyDown={carouselKeys(galCar.prev, galCar.next, isRtl(lang))}>
              {rest.map((g) => <div key={g.src} className="min-w-0 shrink-0 grow-0 basis-[calc(50%-6px)] md:basis-[calc(25%-9px)]"><GalRestShot g={g} /></div>)}
            </CarouselTrack>
            {rest.length > 2 && <CarouselArrows tone="dark" className="mt-3 justify-end" prev={galCar.prev} next={galCar.next} canPrev={galCar.canPrev} canNext={galCar.canNext} labels={{ prev: t('Previous'), next: t('Next') }} />}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 20 }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: '.12em', color: 'rgba(255,255,255,.6)' }}>{gal.foot}</span>
          <button type="button" onClick={onBook} className="vbtn vbtn-on-dark" style={{ marginInlineStart: 'auto' }}><BtnLabel>{gal.cta}</BtnLabel></button>
        </div>
      </div>
    </div>
  );
}
