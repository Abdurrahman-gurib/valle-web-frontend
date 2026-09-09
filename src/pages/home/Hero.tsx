import { useEffect, useState } from 'react';
import { useCatalog } from '../../store/CatalogContext';
import { useGoto } from '../../lib/nav';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';

/** Full-bleed home hero with crossfading slideshow, Ken Burns zoom and slide dots. */
export function Hero() {
  const { HERO } = useCatalog();
  const goto = useGoto();
  const [heroIdx, setHeroIdx] = useState(0);
  const [h1, bind1] = useHover();
  const [h2, bind2] = useHover();

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
        alt="Zipline flight over the Vallé Advenature™ Park valley"
        priority
        surface="dark"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', animation: 'vken 16s ease-out infinite alternate' }}
      />
      {HERO.map((src, i) => (
        <Img
          key={src}
          src={src}
          alt={`VALLÉ Advenature™ Park, slide ${i + 1}`}
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
            Feel the<br /><span style={{ color: '#FFFC33' }}>colours.</span>
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,.88)', fontSize: 'clamp(15px,1.6vw,18px)', lineHeight: 1.55, maxWidth: '52ch', margin: '22px 0 0' }}>
          Where nature &amp; adventure collide: ziplines or waterfalls, quad bikes or giant tortoises. Live the pulse of every breath at Mauritius' only advenature park.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            {...bind1}
            onClick={() => goto.booking()}
            style={{
              border: 0, background: '#FF3358', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800,
              fontSize: 17.5, letterSpacing: '.04em', textTransform: 'uppercase', color: '#FFFFFF', padding: '17px 30px', borderRadius: 14,
              display: 'flex', alignItems: 'center', gap: 12, transform: 'rotate(-2deg)', boxShadow: '0 10px 28px rgba(255,51,88,.45)',
              ...(h1 ? { transform: 'rotate(0deg) translateY(-2px)', background: '#D91E44' } : undefined),
            }}
          >
            Start your adventure
            <span style={{ background: '#FFFC33', color: '#340057', width: 28, height: 28, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontStyle: 'normal' }}>→</span>
          </button>
          <button
            {...bind2}
            onClick={() => goto.explore('all')}
            style={{
              border: '2px solid #FFFC33', background: 'rgba(52,0,87,.35)', backdropFilter: 'blur(6px)', cursor: 'pointer',
              fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 17.5, letterSpacing: '.04em',
              textTransform: 'uppercase', color: '#FFFC33', padding: '16px 28px', borderRadius: 14, transform: 'rotate(-2deg)',
              ...(h2 ? { background: '#FFFC33', color: '#340057', transform: 'rotate(0deg) translateY(-2px)' } : undefined),
            }}
          >
            21 experiences
          </button>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 'clamp(16px,3.5vw,40px)', bottom: 120, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {HERO.map((src, i) => (
          <button
            key={src}
            onClick={() => setHeroIdx(i)}
            aria-label={`Show slide ${i + 1}`}
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
