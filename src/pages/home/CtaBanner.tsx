import { useGoto } from '../../lib/nav';
import { useHover } from '../../hooks/useHover';

/** Final CTA banner: "Hold on tight. Are you ready?" (markup: CTA banner section). */
export function CtaBanner() {
  const goto = useGoto();
  const [bookH, bookBind] = useHover();
  const [pkgH, pkgBind] = useHover();

  return (
    <section
      data-screen-label="CTA banner"
      style={{ maxWidth: 1320, margin: 'clamp(56px,8vw,104px) auto 0', padding: '0 clamp(16px,3.5vw,40px)' }}
    >
      <div data-reveal="1" style={{ position: 'relative', background: '#FF3358', borderRadius: 24, overflow: 'hidden', padding: 'clamp(48px,7vw,88px) clamp(24px,5vw,64px)', textAlign: 'center' }}>
        <svg viewBox="0 0 1200 300" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25, transform: 'rotate(-4deg) scale(1.15)' }}>
          <path d="M0,150 L300,150 L340,60 L380,240 L420,150 L700,150 L740,50 L780,250 L820,150 L1200,150" fill="none" stroke="#FFFFFF" style={{ strokeWidth: '5px', strokeLinejoin: 'round' }} />
        </svg>
        <div style={{ position: 'relative' }}>
          <div style={{ transform: 'rotate(-4deg)' }}>
            <h2 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(40px,6.6vw,92px)', lineHeight: 0.82, letterSpacing: '-0.01em', color: '#FFFFFF', margin: 0, textTransform: 'uppercase' }}>
              Hold on tight.<br /><span style={{ color: '#FFFC33' }}>Are you ready?</span>
            </h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,.94)', fontSize: 16, margin: '20px auto 0', maxWidth: '44ch', lineHeight: 1.55 }}>Pick a date, build your day, pay when you arrive. No cancellation fee, just show up wild.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
            <button
              {...bookBind}
              className="press"
              onClick={() => goto.booking()}
              style={{
                border: 0, background: '#340057', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 16, fontWeight: 700, color: '#FFFFFF', padding: '18px 38px', borderRadius: 999,
                ...(bookH ? { transform: 'translateY(-2px)', boxShadow: '0 14px 30px rgba(0,0,0,.3)' } : {}),
              }}
            >
              Book your adventure →
            </button>
            <button
              {...pkgBind}
              className="press"
              onClick={() => goto.packages()}
              style={{
                border: '2px solid #FFFFFF', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 16, fontWeight: 700, color: '#FFFFFF', padding: '16px 32px', borderRadius: 999,
                ...(pkgH ? { background: '#FFFFFF', color: '#FF3358' } : {}),
              }}
            >
              View packages
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
