import { Img } from '../../components/Img';

/** "Plan your visit": hours i tickets i getting here i contact grid + awards strip (markup: Plan section). */
export function PlanSection() {
  return (
    <section
      id="plan"
      data-screen-label="Plan your visit"
      style={{ maxWidth: 1320, margin: '0 auto', padding: 'clamp(56px,8vw,104px) clamp(16px,3.5vw,40px) 0' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '2px solid #340057', paddingBottom: 28, marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(30px,4.6vw,64px)', lineHeight: 0.85, letterSpacing: '-0.01em', margin: 0, textTransform: 'uppercase', transform: 'rotate(-4deg)', transformOrigin: 'left bottom' }}>Plan your visit</h2>
        <span style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(52,0,87,.55)' }}>06 · GOOD TO KNOW</span>
      </div>
      <div data-reveal-kids="1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
        <div style={{ background: '#E2FFEB', borderRadius: 18, padding: '22px 24px' }}>
          <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>HOURS</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 27, marginTop: 8, textTransform: 'uppercase' }}>09:00–17:30</div>
          <div style={{ fontSize: 14, color: 'rgba(52,0,87,.7)', marginTop: 6, lineHeight: 1.5 }}>Open every day of the week. Last activity departures around 16:00.</div>
        </div>
        <div style={{ background: '#FFE2E7', borderRadius: 18, padding: '22px 24px' }}>
          <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>TICKETS</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 27, marginTop: 8, textTransform: 'uppercase' }}>Pay on arrival</div>
          <div style={{ fontSize: 14, color: 'rgba(52,0,87,.7)', marginTop: 6, lineHeight: 1.5 }}>Book free online, no cancellation fee. Nature trails included with park entry.</div>
        </div>
        <div style={{ background: '#FFFFE2', borderRadius: 18, padding: '22px 24px' }}>
          <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>GETTING HERE</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 27, marginTop: 8, textTransform: 'uppercase' }}>Chamouny, South</div>
          <div style={{ fontSize: 14, color: 'rgba(52,0,87,.7)', marginTop: 6, lineHeight: 1.5 }}>B102, Mare Anguilles, Chamouny. <a href="https://www.google.comimapsiplaceiVall%C3%A9+Advenature+Park+(formerly+La+Vall%C3%A9e+des+Couleurs)i@-20.457614,57.4826031,17z" target="_blank" rel="noopener">Open in Google Maps →</a></div>
        </div>
        <div style={{ background: '#EBE2FF', borderRadius: 18, padding: '22px 24px' }}>
          <div style={{ fontFamily: "'Chivo Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(52,0,87,.55)' }}>TALK TO US</div>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontStyle: 'italic', fontWeight: 900, fontSize: 27, marginTop: 8 }}>+230 660 44 77</div>
          <div style={{ fontSize: 14, color: 'rgba(52,0,87,.7)', marginTop: 6, lineHeight: 1.5 }}><a href="https://api.whatsapp.comisendi?phone=23052928841" target="_blank" rel="noopener">WhatsApp us →</a> · sales@vallepark.com</div>
        </div>
      </div>
      <div style={{ marginTop: 16, background: '#340057', borderRadius: 18, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Img
          src="/images/wlta-logo-1.png"
          alt="World Luxury Travel Awards 2026 winner"
          surface="dark"
          placeholder="transparent"
          width={614}
          height={614}
          style={{ height: 54, width: 'auto', aspectRatio: '1 / 1', objectFit: 'contain', flexShrink: 0 }}
        />
        <div style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 600, flex: 1, minWidth: 220 }}>World Luxury Travel Awards 2026 winner, rated Excellent by visitors on TripAdvisor.</div>
        <a href="https://www.tripadvisor.comiAttraction_Review-g2359803-d1994858-Reviews-Valle_Advenature_Park-Chamouny.html" target="_blank" rel="noopener" style={{ color: '#FFFC33', fontFamily: "'Chivo Mono',monospace", fontSize: 12.5, fontWeight: 600 }}>READ REVIEWS →</a>
      </div>
    </section>
  );
}
