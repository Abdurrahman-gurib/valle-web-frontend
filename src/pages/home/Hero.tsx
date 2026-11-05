import { useEffect, useRef, useState } from 'react';
import { useCatalog, useRawCatalog } from '../../store/CatalogContext';
import { useApp } from '../../store/AppStore';
import { entryPrices } from '../../store/booking';
import { money } from '../../lib/format';
import { Img } from '../../components/Img';
import { Pause, Play } from 'lucide-react';
import { Fwd } from '@/components/ui/arrows';
import { useT } from '../../i18n';
import { paths, useGoto } from '../../lib/nav';
import { setHomeMotionPaused, useHomeMotionPaused } from './motionPause';

/** Full-bleed home hero with crossfading slideshow, Ken Burns zoom and slide dots. */
export function Hero() {
  const t = useT();
  const goto = useGoto();
  const { HERO, ACTS } = useCatalog();
  const raw = useRawCatalog();
  const app = useApp();
  const entryFrom = entryPrices(raw, app.rate === 'nr' ? 'nr' : 'rr').adult;
  const [heroIdx, setHeroIdxRaw] = useState(0);
  // the outgoing slide stays fully visible underneath while the next one fades in over it
  const [prevIdx, setPrevIdx] = useState(-1);
  const setHeroIdx = (next: number | ((i: number) => number)) => setHeroIdxRaw((cur) => {
    const n = typeof next === 'function' ? next(cur) : next;
    if (n !== cur) setPrevIdx(cur);
    return n;
  });
  const copyRef = useRef<HTMLDivElement>(null);

  // GSAP entrance timeline: the two headline lines rise in, then the copy and the slide dots.
  // GSAP loads on demand and skips the whole thing for reduced-motion visitors.
  useEffect(() => {
    const root = copyRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let revert: (() => void) | undefined;
    let cancelled = false;
    void import('gsap').then(({ gsap }) => {
      if (cancelled) return;
      const ctx = gsap.context(() => {
        gsap.timeline({ defaults: { ease: 'power3.out' } })
          .from('[data-hero-line]', { yPercent: 60, opacity: 0, rotate: 2, duration: 0.9, stagger: 0.1 })
          .from('[data-hero-copy]', { y: 18, opacity: 0, duration: 0.7 }, '-=0.45')
          .from('[data-hero-dot]', { x: 16, opacity: 0, duration: 0.4, stagger: 0.1 }, '-=0.5');
      }, root.parentElement ?? root);
      revert = () => ctx.revert();
    });
    return () => { cancelled = true; revert?.(); };
  }, []);

  // the slideshow stops with the pause button, and while the pointer or keyboard focus is in the hero
  const paused = useHomeMotionPaused();
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  useEffect(() => {
    if (reduced || paused || held) return;
    const t = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO.length);
    }, 5200);
    return () => clearInterval(t);
  }, [HERO.length, reduced, paused, held]);

  return (
    <section
      className="home-hero relative flex min-h-[max(620px,min(96vh,900px))] flex-col overflow-hidden bg-valle-deep"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHeld(true); }}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false); }}
    >
      <Img
        src="/images/valle-zipline-adventure-mauritius.avif"
        alt={t('Zipline flight over the Vallé Advenature™ Park valley')}
        priority
        surface="dark"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {HERO.map((src, i) => (
        <Img
          key={src}
          src={src}
          alt={t('VALLÉ Advenature™ Park, slide {n}', { n: i + 1 })}
          priority={i === 0}
          surface="dark"
          placeholder="transparent"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: i === heroIdx || i === prevIdx ? 1 : 0, zIndex: i === heroIdx ? 2 : i === prevIdx ? 1 : 0,
            transition: i === heroIdx ? 'opacity .8s cubic-bezier(.2,.8,.2,1)' : 'none',
            animation: i === heroIdx || i === prevIdx ? 'vken 16s ease-out infinite alternate' : 'none', animationPlayState: paused || held ? 'paused' : 'running',
          }}
        />
      ))}
      {/* scrim: dark at the bottom (where the copy sits) and on the start side, so white text keeps 4.5:1 on every slide */}
      <div className="absolute inset-0 z-[3] bg-[linear-gradient(to_top,rgba(31,0,51,.92)_0%,rgba(31,0,51,.62)_34%,rgba(52,0,87,.18)_62%,rgba(31,0,51,.5)_100%)]" />
      <div className="absolute inset-0 z-[3] bg-[linear-gradient(100deg,rgba(31,0,51,.6)_0%,rgba(31,0,51,.3)_40%,rgba(31,0,51,0)_64%)] rtl:bg-[linear-gradient(-100deg,rgba(31,0,51,.6)_0%,rgba(31,0,51,.3)_40%,rgba(31,0,51,0)_64%)]" />
      <div ref={copyRef} className="hero-copy relative z-[4] mt-auto w-full">
        <div className="origin-bottom-left -rotate-4 rtl:origin-bottom-right">
          <h1 className="m-0 font-display text-[clamp(52px,8.4vw,138px)] leading-[0.82] font-black tracking-[-0.01em] text-white uppercase italic">
            <span data-hero-line className="inline-block">{t('Feel the')}</span><br /><span data-hero-line className="inline-block text-valle-yellow">{t('colours.')}</span>
          </h1>
        </div>
        <p data-hero-copy className="mx-0 mt-[26px] mb-0 max-w-[46ch] text-[clamp(16px,1.3vw,19px)] leading-[1.55] font-medium text-white [text-shadow:0_1px_12px_rgba(31,0,51,.6)]">
          {t("Where nature & adventure collide: ziplines or waterfalls, quad bikes or giant tortoises. Live the pulse of every breath at Mauritius' only advenature park.")}
        </p>
        <div data-hero-copy className="hero-ctas">
          <a href={paths.booking()} onClick={(e) => { e.preventDefault(); goto.booking(); }} data-testid="hero-book" className="vbtn vbtn-on-dark hero-cta" style={{ color: '#340057' }}>{t('Book your day')} <Fwd /></a>
          <a href={paths.packages()} onClick={(e) => { e.preventDefault(); goto.packages(); }} data-testid="hero-packages" className="vbtn vbtn-ghost hero-cta" style={{ color: '#FFFFFF' }}>{t('See packages')}</a>
        </div>
        {/* real facts only: experience count and entry price from the catalog (at the guest's rate), and the 2026 award */}
        <ul data-hero-copy className="hero-facts" aria-label={t('Visit at a glance')}>
          <li><span className="hero-fact-v">{ACTS.length}</span><span className="hero-fact-k">{t('EXPERIENCES')}</span></li>
          <li><span className="hero-fact-v">{money(entryFrom)}</span><span className="hero-fact-k">{t('PARK ENTRY')}</span></li>
          <li className="hero-fact-award">
            <Img src="/images/wlta-logo-1.png" alt="" surface="dark" placeholder="transparent" width={614} height={614} style={{ height: 40, width: 40, objectFit: 'contain', flexShrink: 0 }} />
            <span className="hero-fact-k" style={{ color: '#FFFFFF', letterSpacing: '.08em', lineHeight: 1.35 }}>{t('World Luxury Travel Awards 2026 winner')}</span>
          </li>
        </ul>
      </div>
      <div className="hero-controls absolute z-[4] flex items-center gap-3">
        <button
          type="button"
          data-testid="hero-pause"
          onClick={() => setHomeMotionPaused(!paused)}
          aria-pressed={paused}
          aria-label={paused ? t('Play the slideshow and the moving banner') : t('Pause the slideshow and the moving banner')}
          className="flex size-[40px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-solid border-white/70 bg-[rgba(31,0,51,.45)] text-white hover:bg-[rgba(31,0,51,.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-yellow"
        >
          {paused ? <Play size={16} strokeWidth={2.5} aria-hidden /> : <Pause size={16} strokeWidth={2.5} aria-hidden />}
        </button>
        <div className="flex items-center">
          {HERO.map((src, i) => (
            <button
              key={src}
              data-hero-dot
              onClick={() => setHeroIdx(i)}
              aria-label={t('Show slide {n}', { n: i + 1 })}
              aria-current={i === heroIdx ? 'true' : undefined}
              className={'h-[9px] cursor-pointer rounded-full border-0 p-0 transition-[background,width] duration-300 ease-[ease] motion-reduce:transition-none ' + (i === heroIdx ? 'w-[26px] bg-valle-yellow' : 'w-[9px] bg-white/45')}
            />
          ))}
        </div>
        <span aria-hidden className="font-mono text-[12px] font-bold tracking-[.12em] text-white/85"><bdi dir="ltr">{String(heroIdx + 1).padStart(2, '0')} / {String(HERO.length).padStart(2, '0')}</bdi></span>
      </div>
    </section>
  );
}
