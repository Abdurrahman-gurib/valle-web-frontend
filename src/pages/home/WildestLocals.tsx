import { useGoto } from '../../lib/nav';
import { useHover } from '../../hooks/useHover';
import { Img } from '../../components/Img';

/** Full-bleed tortoise banner (markup.html 685-697). */
export function WildestLocals() {
  const goto = useGoto();
  const [h, bind] = useHover();
  return (
    <section style={{
      position: 'relative', marginTop: 'clamp(48px,7vw,88px)', minHeight: 'min(72vh,560px)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', background: '#260040',
    }}>
      <Img
        src="/images/valle-giant-tortoise-park-mauritius.avif"
        alt="Giant tortoise roaming the valley floor at Vallé"
        surface="dark"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(31,0,51,.86) 0%, rgba(31,0,51,.42) 55%, rgba(31,0,51,.12) 100%)' }} />
      <div data-reveal="1" style={{ position: 'relative', maxWidth: 1320, margin: '0 auto', width: '100%', padding: 'clamp(48px,8vw,96px) clamp(16px,3.5vw,40px)' }}>
        <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.26em', color: '#33FF74' }}>
          IT'S IN OUR NATURE
        </div>
        <div style={{ transform: 'rotate(-4deg)', transformOrigin: 'left bottom', marginTop: 16 }}>
          <h2 style={{
            fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
            fontSize: 'clamp(38px,6vw,88px)', lineHeight: 0.82, letterSpacing: '-0.01em',
            color: '#FFFFFF', margin: 0, textTransform: 'uppercase',
          }}>
            Meet the<br /><span style={{ color: '#33FF74' }}>wildest</span> locals
          </h2>
        </div>
        <p style={{ color: 'rgba(255,255,255,.9)', fontSize: 'clamp(14.5px,1.6vw,17px)', lineHeight: 1.55, maxWidth: '44ch', margin: '20px 0 0' }}>
          Century-old giant tortoises, curious deer and tropical birdlife roam the valley floor.
          Say bonzour on your way to the ziplines.
        </p>
        <button
          {...bind}
          onClick={() => goto.detail('animals')}
          style={{
            marginTop: 24, border: 0, background: '#33FF74', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 700, color: '#340057', padding: '15px 30px', borderRadius: 999,
            transform: h ? 'translateY(-2px)' : 'none',
            boxShadow: h ? '0 14px 30px rgba(0,0,0,.35)' : 'none',
            transition: 'transform .2s ease, box-shadow .2s ease',
          }}
        >
          Meet the animals →
        </button>
      </div>
    </section>
  );
}
