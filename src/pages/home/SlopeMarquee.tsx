import { Stripes } from '../../components/Stripes';

function MarqueeLine() {
  return (
    <span style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(15px,1.7vw,20px)', letterSpacing: '.1em', color: '#FFFFFF' }}>
      ZIPLINES <span style={{ color: '#FF3358' }}>●</span> QUAD &amp; BUGGY <span style={{ color: '#33FF74' }}>●</span> WATERFALLS{' '}
      <span style={{ color: '#FFFC33' }}>●</span> 23 COLOURED EARTH <span style={{ color: '#FF3358' }}>●</span> NEPALESE BRIDGE{' '}
      <span style={{ color: '#33FF74' }}>●</span> KIDS PARK <span style={{ color: '#FFFC33' }}>●</span> GIANT TORTOISES{' '}
      <span style={{ color: '#FF3358' }}>●</span> MOUNTAIN LUGE <span style={{ color: '#33FF74' }}>●</span> THE PEAK{' '}
      <span style={{ color: '#FFFC33' }}>●</span>&nbsp;
    </span>
  );
}

/** The 4° tilted caution-stripe slope + dark scrolling marquee band under the hero. */
export function SlopeMarquee() {
  return (
    <div style={{ position: 'relative', zIndex: 4, marginTop: -96, overflow: 'hidden' }}>
      <div style={{ margin: '3.6vw -3vw', transform: 'rotate(-4deg)' }}>
        <Stripes height={12} />
        <div style={{ background: '#340057', padding: '14px 0', overflow: 'hidden', whiteSpace: 'nowrap', boxShadow: '0 16px 36px -14px rgba(38,0,64,.5)' }}>
          <div style={{ display: 'inline-flex', animation: 'vmarq 42s linear infinite', willChange: 'transform' }}>
            <MarqueeLine />
            <MarqueeLine />
          </div>
        </div>
      </div>
    </div>
  );
}
