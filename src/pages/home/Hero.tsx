import { useEffect, useRef, useState } from 'react';
import { useCatalog } from '../../store/CatalogContext';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';

/** Full-bleed home hero with crossfading slideshow, Ken Burns zoom and slide dots. */
export function Hero() {
  const t = useT();
  const { HERO } = useCatalog();
  const [heroIdx, setHeroIdx] = useState(0);
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
          .from('[data-hero-line]', { yPercent: 60, opacity: 0, rotate: 2, duration: 0.9, stagger: 0.14 })
          .from('[data-hero-copy]', { y: 18, opacity: 0, duration: 0.7 }, '-=0.45')
          .from('[data-hero-dot]', { x: 16, opacity: 0, duration: 0.4, stagger: 0.06 }, '-=0.5');
      }, root.parentElement ?? root);
      revert = () => ctx.revert();
    });
    return () => { cancelled = true; revert?.(); };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO.length);
    }, 5200);
    return () => clearInterval(t);
  }, [HERO.length]);

  return (
    <section className="relative h-[min(96vh,880px)] min-h-[580px] overflow-hidden bg-valle-deep">
      <Img
        src="/images/valle-zipline-adventure-mauritius.avif"
        alt={t('Zipline flight over the Vallé Advenature™ Park valley')}
        priority
        surface="dark"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', animation: 'vken 16s ease-out infinite alternate' }}
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
            opacity: i === heroIdx ? 1 : 0, transition: 'opacity 1.6s ease', animation: 'vken 16s ease-out infinite alternate',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(31,0,51,.88)_0%,rgba(52,0,87,.2)_48%,rgba(31,0,51,.4)_100%)]" />
      <div ref={copyRef} className="relative mx-auto flex h-full flex-col justify-start px-[clamp(16px,2.5vw,40px)] pt-[clamp(96px,12vh,130px)] pb-0">
        <div className="origin-bottom-left -rotate-4">
          <h1 className="m-0 font-display text-[clamp(48px,8.4vw,132px)] leading-[0.82] font-black tracking-[-0.01em] text-white uppercase italic">
            <span data-hero-line className="inline-block">{t('Feel the')}</span><br /><span data-hero-line className="inline-block text-valle-yellow">{t('colours.')}</span>
          </h1>
        </div>
        <p data-hero-copy className="mx-0 mt-[22px] mb-0 max-w-[52ch] text-[clamp(15px,1.6vw,18px)] leading-[1.55] text-white/88">
          {t("Where nature & adventure collide: ziplines or waterfalls, quad bikes or giant tortoises. Live the pulse of every breath at Mauritius' only advenature park.")}
        </p>
      </div>
      <div className="absolute right-[clamp(16px,3.5vw,40px)] bottom-[120px] flex flex-col gap-2">
        {HERO.map((src, i) => (
          <button
            key={src}
            data-hero-dot
            onClick={() => setHeroIdx(i)}
            aria-label={t('Show slide {n}', { n: i + 1 })}
            aria-current={i === heroIdx ? 'true' : undefined}
            className={'size-[9px] cursor-pointer rounded-full border-0 p-0 transition-[background] duration-300 ease-[ease] ' + (i === heroIdx ? 'bg-valle-yellow' : 'bg-white/40')}
          />
        ))}
      </div>
    </section>
  );
}
