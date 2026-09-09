import { Img } from '../../components/Img';

/** "Our story": formerly La Vallée des Couleurs narrative + stats (markup: Story section). */
export function StorySection() {
  return (
    <section
      id="story"
      data-screen-label="Our story"
      style={{ maxWidth: 1320, margin: '0 auto', padding: 'clamp(56px,8vw,104px) clamp(16px,3.5vw,40px) 0' }}
    >
      <div data-reveal-kids="1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'clamp(24px,4vw,60px)', alignItems: 'center' }}>
        <div style={{ borderRadius: 20, overflow: 'hidden', height: 'min(520px,68vw)', background: '#EBE2FF', transform: 'rotate(-2deg)' }}>
          <Img src="/images/home-overview.avif" alt="Aerial overview of the Vallé valley" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>05 · BORN OF NATURE, PURE ADVENTURE</span>
          <h2 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(34px,4.4vw,58px)', lineHeight: 0.88, letterSpacing: '-0.01em', margin: '16px 0 0', textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>
            Formerly La Vallée des Couleurs. <span style={{ color: '#7333FF' }}>Forever Vallé.</span>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(52,0,87,.75)', margin: '20px 0 0' }}>We unearth the true colours of Maurice, so you live the pulse of every breath. Twenty-three hues of volcanic earth, centuries-old ebony trees, free-roaming giant tortoises, and strung above it all, some of the island's wildest ziplines.</p>
          <div style={{ display: 'flex', gap: 30, marginTop: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 40, color: '#FF3358' }}>23</div>
              <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, color: 'rgba(52,0,87,.65)', marginTop: 2, borderTop: '3px solid #FF3358', paddingTop: 6 }}>COLOURS OF EARTH</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 40, color: '#7333FF' }}>5.5 KM</div>
              <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, color: 'rgba(52,0,87,.65)', marginTop: 2, borderTop: '3px solid #33FF74', paddingTop: 6 }}>LONGEST ZIPLINE</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 40, color: '#340057' }}>21</div>
              <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 11, color: 'rgba(52,0,87,.65)', marginTop: 2, borderTop: '3px solid #FFFC33', paddingTop: 6 }}>EXPERIENCES</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
