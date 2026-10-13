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
    <section style={{ position: 'relative', height: 'min(96vh,880px)', minHeight: 580, overflow: 'hidden', background: '#260040' }}>
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
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,0,51,.88) 0%, rgba(52,0,87,.2) 48%, rgba(31,0,51,.4) 100%)' }} />
      <div ref={copyRef} style={{ position: 'relative', margin: '0 auto', padding: '0 clamp(16px,2.5vw,40px)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: 'clamp(96px,12vh,130px)' }}>
        <div style={{ transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>
          <h1 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(48px,8.4vw,132px)', lineHeight: 0.82, letterSpacing: '-0.01em', color: '#FFFFFF', margin: 0, textTransform: 'uppercase' }}>
            <span data-hero-line style={{ display: 'inline-block' }}>{t('Feel the')}</span><br /><span data-hero-line style={{ color: '#FFFC33', display: 'inline-block' }}>{t('colours.')}</span>
          </h1>
        </div>
        <p data-hero-copy style={{ color: 'rgba(255,255,255,.88)', fontSize: 'clamp(15px,1.6vw,18px)', lineHeight: 1.55, maxWidth: '52ch', margin: '22px 0 0' }}>
          {t("Where nature & adventure collide: ziplines or waterfalls, quad bikes or giant tortoises. Live the pulse of every breath at Mauritius' only advenature park.")}
        </p>
      </div>
      <div style={{ position: 'absolute', right: 'clamp(16px,3.5vw,40px)', bottom: 120, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {HERO.map((src, i) => (
          <button
            key={src}
            data-hero-dot
            onClick={() => setHeroIdx(i)}
            aria-label={t('Show slide {n}', { n: i + 1 })}
            aria-current={i === heroIdx ? 'true' : undefined}
            style={{
              width: 9, height: 9, borderRadius: 999, border: 0, cursor: 'pointer', padding: 0,
              background: i === heroIdx ? '#FFFC33' : 'rgba(255,255,255,.4)', transition: 'background .3s',
            }}
          />
        ))}
      </div>
    </section>
  );
}
