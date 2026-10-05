import { useHover } from '../../hooks/useHover';
import { useIsMobile } from '../../hooks/useIsMobile';
import { isRtl, useLang, useT } from '../../i18n';
import { promptInstall, useInstall } from '../../lib/pwa';

/**
 * "The park in your pocket": the home page's invitation to install the site to
 * the home screen. What it offers depends on the browser:
 *   - install dialog available (Android, desktop Chrome/Edge): one button
 *   - Safari on iPhone/iPad: the Share > Add to Home Screen steps
 *   - anything else: both sets of steps, so the guest can do it on their phone
 * Hidden once the site already runs from the home screen.
 */
const MONO = "'Chivo Mono',monospace";
const BARLOW = "'Barlow',sans-serif";

function Benefit({ dot, children }: { dot: string; children: string }) {
  return (
    <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 15, lineHeight: 1.5, color: 'rgba(255,255,255,.9)' }}>
      <span aria-hidden style={{ flex: 'none', width: 10, height: 10, borderRadius: 3, background: dot, marginTop: 7, transform: 'rotate(45deg)' }} />
      <span>{children}</span>
    </li>
  );
}

/** A phone home screen drawn in CSS, with the VALLÉ icon where the guest's would be. */
function PhoneMock({ label }: { label: string }) {
  const tile = (bg: string, key: number) => <span key={key} style={{ aspectRatio: '1 / 1', borderRadius: 13, background: bg }} />;
  const muted = 'rgba(255,255,255,.14)';
  return (
    <div role="img" aria-label={label} style={{
      width: 'min(250px, 62vw)', aspectRatio: '9 / 17.5', borderRadius: 34, background: '#1B0030', padding: 12,
      boxShadow: '0 40px 80px -30px rgba(0,0,0,.7), inset 0 0 0 2px rgba(255,255,255,.14)', transform: 'rotate(4deg)',
    }}>
      <div style={{ height: '100%', borderRadius: 24, background: 'linear-gradient(160deg,#7333FF 0%,#340057 55%,#260040 100%)', padding: '26px 16px 14px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[0, 1, 2, 3, 4].map((k) => tile(muted, k))}
          <span style={{ position: 'relative' }}>
            <img src="/icon-maskable-192.png" alt="" width={96} height={96} loading="lazy" style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '1 / 1', borderRadius: 13, boxShadow: '0 0 0 2px #33FF74, 0 10px 22px -6px rgba(51,255,116,.6)' }} />
            <span style={{ position: 'absolute', left: '50%', top: '100%', transform: 'translateX(-50%)', marginTop: 4, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '.08em', color: '#FFFFFF' }}>VALLÉ</span>
          </span>
          {[6, 7].map((k) => tile(muted, k))}
        </div>
        <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, padding: 10, borderRadius: 18, background: 'rgba(255,255,255,.1)' }}>
          {[0, 1, 2, 3].map((k) => tile('rgba(255,255,255,.22)', k))}
        </div>
      </div>
    </div>
  );
}

export function InstallSection() {
  const t = useT();
  const state = useInstall();
  const lang = useLang();
  const isMobile = useIsMobile();
  const [h, bind] = useHover();
  if (state === 'installed') return null;

  const steps = { fontSize: 14, lineHeight: 1.55, color: '#FFFC33', fontWeight: 600, margin: 0 } as const;
  return (
    <section
      id="app"
      data-screen-label="Install the app"
      data-testid="install-section"
      style={{ maxWidth: 1320, margin: 'clamp(56px,8vw,104px) auto 0', padding: '0 clamp(16px,3.5vw,40px)' }}
    >
      <div data-reveal="1" style={{
        background: '#340057', borderRadius: 24, overflow: 'hidden', position: 'relative',
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.25fr .75fr', gap: 'clamp(24px,4vw,56px)', alignItems: 'center',
        padding: 'clamp(28px,4.5vw,60px)',
      }}>
        <div>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: '.16em', color: '#33FF74' }}>{t('TAKE THE VALLEY WITH YOU')}</span>
          <h2 style={{
            fontFamily: BARLOW, fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(34px,4.6vw,62px)', lineHeight: lang === 'hi' ? 1.2 : 0.88, letterSpacing: '-0.01em',
            margin: '16px 0 0', textTransform: 'uppercase', color: '#FFFFFF', transform: 'rotate(-3deg)', transformOrigin: isRtl() ? 'right bottom' : 'left bottom',
          }}>
            {t('The park in')}<br /><span style={{ color: '#FFFC33' }}>{t('your pocket.')}</span>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,.82)', margin: '22px 0 0', maxWidth: '46ch' }}>
            {t('Add VALLÉ to your home screen and it opens like an app, with or without signal.')}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'grid', gap: 10 }}>
            <Benefit dot="#33FF74">{t('Activities, packages and prices, saved for offline')}</Benefit>
            <Benefit dot="#FFFC33">{t('Your ticket and QR code at the gate, even with no network')}</Benefit>
            <Benefit dot="#FF3358">{t('One tap from your home screen, nothing to download from a store')}</Benefit>
          </ul>

          <div style={{ marginTop: 26, display: 'grid', gap: 8, maxWidth: '52ch' }}>
            {state === 'prompt' && (
              <div>
                <button
                  {...bind}
                  data-testid="install-button"
                  className="press"
                  onClick={() => { void promptInstall(); }}
                  style={{
                    border: 0, background: h ? '#D91E44' : '#FF3358', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
                    padding: '16px 34px', borderRadius: 999, cursor: 'pointer', boxShadow: '0 10px 28px -6px rgba(255,51,88,.6)',
                    transform: h ? 'translateY(-2px)' : 'none', transition: 'transform .18s, background .18s',
                  }}
                >
                  {t('Install the app')}
                </button>
              </div>
            )}
            {state !== 'prompt' && state !== 'ios' && (
              <p data-testid="install-steps-android" style={steps}>{t('On Android: open the browser menu and choose “Install app” or “Add to Home screen”.')}</p>
            )}
            {state !== 'prompt' && (
              <p data-testid="install-steps-ios" style={steps}>{t('On iPhone or iPad: tap Share, then “Add to Home Screen”.')}</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: isMobile ? '6px 0 10px' : 0 }}>
          <PhoneMock label={t('The VALLÉ icon on a phone home screen')} />
        </div>
      </div>
    </section>
  );
}
