import { useEffect, useState } from 'react';
import { useCatalog } from '../../store/CatalogContext';
import { Img } from '../../components/Img';
import { useT } from '../../i18n';

/** Full-bleed home hero with crossfading slideshow, Ken Burns zoom and slide dots. */
export function Hero() {
  const t = useT();
  const { HERO } = useCatalog();
  const [heroIdx, setHeroIdx] = useState(0);

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
      <div style={{ position: 'relative', maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,3.5vw,40px)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 'clamp(130px,19vh,220px)' }}>
        <div style={{ transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>
          <h1 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(48px,8.4vw,132px)', lineHeight: 0.82, letterSpacing: '-0.01em', color: '#FFFFFF', margin: 0, textTransform: 'uppercase' }}>
            {t('Feel the')}<br /><span style={{ color: '#FFFC33' }}>{t('colours.')}</span>
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,.88)', fontSize: 'clamp(15px,1.6vw,18px)', lineHeight: 1.55, maxWidth: '52ch', margin: '22px 0 0' }}>
          {t("Where nature & adventure collide: ziplines or waterfalls, quad bikes or giant tortoises. Live the pulse of every breath at Mauritius' only advenature park.")}
        </p>
      </div>
      <div style={{ position: 'absolute', right: 'clamp(16px,3.5vw,40px)', bottom: 120, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {HERO.map((src, i) => (
          <button
            key={src}
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
