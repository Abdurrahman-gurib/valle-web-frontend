import { Stripes } from './Stripes';
import { useGoto } from '../lib/nav';
import { useHover } from '../hooks/useHover';
import { Img } from './Img';

function FootLink({ label, onClick, hoverColor }: { label: string; onClick: () => void; hoverColor: string }) {
  const [h, bind] = useHover();
  return (
    <div
      {...bind}
      onClick={onClick}
      style={{
        cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '7px 0', opacity: h ? 1 : 0.92,
        color: h ? hoverColor : '#FFFFFF',
      }}
    >
      {label}
    </div>
  );
}

export function Footer() {
  const goto = useGoto();
  return (
    <footer style={{ marginTop: 'clamp(64px,9vw,120px)' }}>
      <Stripes />
      <div style={{ background: '#260040', color: '#FFFFFF', padding: 'clamp(44px,6vw,72px) 0 34px' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,3.5vw,40px)' }}>
          <div style={{
            fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900,
            fontSize: 'clamp(52px,9vw,140px)', lineHeight: 0.82, letterSpacing: '-0.01em',
            color: 'rgba(255,255,255,.08)', textTransform: 'uppercase', whiteSpace: 'nowrap',
            overflow: 'hidden', transform: 'rotate(-4deg)', transformOrigin: 'left center',
          }}>
            LIVE THE PULSE
          </div>
        </div>
        <div style={{
          maxWidth: 1320, margin: 'clamp(24px,4vw,44px) auto 0', padding: '0 clamp(16px,3.5vw,40px)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'clamp(24px,4vw,48px)',
        }}>
          <div>
            <div style={{ transform: 'rotate(-4deg)', transformOrigin: 'left bottom', display: 'inline-block' }}>
              <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 32, letterSpacing: '-0.01em' }}>VALLÉ</div>
              <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.22em', opacity: 0.7, marginTop: 3 }}>ADVENATURE™ PARK</div>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.75, margin: '16px 0 0', maxWidth: '32ch' }}>
              Where nature &amp; adventure collide. Formerly La Vallée des Couleurs, Chamouny, Mauritius.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              {[
                ['Instagram', 'https://www.instagram.com/valleadvenaturepark/'],
                ['Facebook', 'https://www.facebook.com/share/1ADvErZgRi/'],
                ['YouTube', 'https://www.youtube.com/channel/UCfHmy2KfmQk32tiT0zcxbTQ'],
              ].map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                  border: '1px solid rgba(255,255,255,.35)', color: '#FFFFFF', borderRadius: 999,
                  padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
                }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.16em', opacity: 0.6 }}>EXPLORE</div>
            <div style={{ marginTop: 10 }}>
              <FootLink label="Adventure" onClick={() => goto.explore('adventure')} hoverColor="#FF3358" />
              <FootLink label="Nature" onClick={() => goto.explore('nature')} hoverColor="#33FF74" />
              <FootLink label="Kids Park" onClick={() => goto.explore('kids')} hoverColor="#FFFC33" />
              <FootLink label="Tours & Groups" onClick={() => goto.explore('tours')} hoverColor="#FFFC33" />
              <FootLink label="Packages" onClick={() => goto.packages()} hoverColor="#FFFC33" />
              <FootLink label="Team building" onClick={() => goto.team()} hoverColor="#FFFC33" />
              <FootLink label="Restaurants" onClick={() => goto.dine()} hoverColor="#FFFC33" />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.16em', opacity: 0.6 }}>VISIT</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.7, opacity: 0.88, marginTop: 12 }}>
              Open daily 09:00 – 17:30<br />B102, Mare Anguilles<br />Chamouny, Mauritius
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.7, marginTop: 12 }}>
              <a href="tel:+2306604477" style={{ color: '#FFFC33' }}>+230 660 44 77</a><br />
              <a href="mailto:sales@vallepark.com" style={{ color: '#FFFC33' }}>sales@vallepark.com</a>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.16em', opacity: 0.6 }}>RECOGNISED BY</div>
            <Img
              src="/images/wlta-logo-1.png"
              alt="World Luxury Travel Awards 2026 winner"
              surface="dark"
              placeholder="transparent"
              width={614}
              height={614}
              style={{ height: 60, width: 'auto', marginTop: 14, aspectRatio: '1 / 1', objectFit: 'contain' }}
            />
            <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 8 }}>World Luxury Travel Awards 2026</div>
            <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 13, fontWeight: 600, letterSpacing: '.1em', marginTop: 18, color: '#FFFC33' }}>VALLEPARK.COM</div>
          </div>
        </div>
        <div style={{
          maxWidth: 1320, margin: '38px auto 0', padding: '22px clamp(16px,3.5vw,40px) 0',
          borderTop: '1px solid rgba(255,255,255,.16)', display: 'flex', justifyContent: 'space-between',
          gap: 14, flexWrap: 'wrap', fontFamily: "'Chivo Mono',monospace", fontSize: 11, opacity: 0.6,
        }}>
          <span>©2026 VALLÉ ADVENATURE™ PARK · UX RESTRUCTURE CONCEPT</span>
          <span>PRIVACY POLICY · TERMS OF USE · EN / FR</span>
        </div>
      </div>
    </footer>
  );
}
